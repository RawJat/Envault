import { NextResponse } from "next/server";
import { generateGitHubAppJWT } from "@/lib/auth/github";

interface GitHubRepo {
  id: number;
  full_name: string;
  private: boolean;
  fork: boolean;
  pushed_at: string;
  owner: {
    login: string;
  };
}

async function fetchAllRepos(installationId: string): Promise<GitHubRepo[]> {
  const appJwt = generateGitHubAppJWT();

  const tokenResponse = await fetch(
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

  if (!tokenResponse.ok) {
    throw new Error("Failed to authenticate with GitHub installation");
  }

  const { token } = (await tokenResponse.json()) as { token: string };

  const allRepos: GitHubRepo[] = [];
  let page = 1;

  while (true) {
    const reposResponse = await fetch(
      `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!reposResponse.ok) {
      throw new Error("Failed to fetch repositories from GitHub");
    }

    const data = (await reposResponse.json()) as {
      repositories?: GitHubRepo[];
      total_count?: number;
    };

    const repos = data.repositories ?? [];
    allRepos.push(...repos);

    if (repos.length < 100) break;
    page++;
  }

  return allRepos;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!installationId) {
    return NextResponse.json(
      { error: "Missing installation_id" },
      { status: 400 },
    );
  }

  if (!query) {
    return NextResponse.json({ repositories: [] });
  }

  try {
    const allRepos = await fetchAllRepos(installationId);

    const matched = allRepos
      .filter((r) => r.full_name.toLowerCase().includes(query))
      .sort(
        (a, b) =>
          new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime(),
      );

    return NextResponse.json({
      repositories: matched.map((r) => ({
        id: r.id,
        full_name: r.full_name,
        private: r.private,
        fork: r.fork,
        pushed_at: r.pushed_at,
        owner_login: r.owner.login,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
