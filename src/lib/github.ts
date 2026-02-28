import jwt from "jsonwebtoken";

/**
 * Generates a short-lived JWT to authenticate as the GitHub App itself.
 * Required for obtaining installation access tokens.
 */
export function generateGitHubAppJWT(): string {
  const appId = process.env.ENVAULT_GITHUB_APP_CLIENT_ID;
  const privateKey = process.env.ENVAULT_GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    throw new Error(
      "GitHub App credentials (ENVAULT_GITHUB_APP_CLIENT_ID / ENVAULT_GITHUB_APP_PRIVATE_KEY) are not configured.",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // 60s backdate to handle clock drift
    exp: now + 10 * 60, // 10-minute expiry (GitHub max)
    iss: appId,
  };

  // Handle both inline \n and real newlines in the env variable
  const formattedKey = privateKey.replace(/\\n/g, "\n");
  return jwt.sign(payload, formattedKey, { algorithm: "RS256" });
}

/**
 * Exchanges a GitHub App JWT for a short-lived installation access token.
 * This token allows us to make API calls scoped to a specific installation.
 */
export async function getInstallationToken(
  installationId: number,
): Promise<string> {
  const appJwt = generateGitHubAppJWT();

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to get installation token (${response.status}): ${body}`,
    );
  }

  const data = await response.json();
  return data.token;
}

/**
 * Returns true if the given GitHub username is a collaborator on the repo.
 * Uses a GitHub App installation token scoped to that specific repo.
 */
export async function isGitHubCollaborator(
  installationId: number,
  repoFullName: string, // e.g. "owner/repo"
  username: string,
): Promise<boolean> {
  try {
    const token = await getInstallationToken(installationId);
    const [owner, repo] = repoFullName.split("/");

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/collaborators/${username}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    // 204 = is a collaborator, 404 = not a collaborator
    return response.status === 204;
  } catch {
    // On any error (network, bad token, etc.), fail safe — deny auto-approval
    return false;
  }
}

/**
 * Gets the GitHub username for a given Supabase user ID by querying auth.identities.
 * Returns null if the user has not linked a GitHub account.
 */
export async function getGitHubUsername(
  supabase: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  userId: string,
): Promise<string | null> {
  try {
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    if (!userData?.user?.identities) return null;

    const githubIdentity = userData.user.identities.find(
      (id: {
        provider: string;
        identity_data?: { user_name?: string; login?: string };
      }) => id.provider === "github",
    );

    if (!githubIdentity?.identity_data) return null;

    // GitHub identity stores the username as `user_name` or `login`
    return (
      githubIdentity.identity_data.user_name ||
      githubIdentity.identity_data.login ||
      null
    );
  } catch {
    return null;
  }
}
