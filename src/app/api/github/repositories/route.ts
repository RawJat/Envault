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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");

  if (!installationId) {
    return NextResponse.json(
      { error: "Missing installation_id" },
      { status: 400 },
    );
  }

  try {
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
      return NextResponse.json(
        { error: "Failed to authenticate with GitHub" },
        { status: 500 },
      );
    }

    const { token } = (await tokenResponse.json()) as { token: string };

    // Paginate through all repos for this installation
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
        return NextResponse.json(
          { error: "Failed to fetch repositories" },
          { status: 500 },
        );
      }

      const data = (await reposResponse.json()) as {
        repositories?: GitHubRepo[];
      };

      const repos = data.repositories ?? [];
      allRepos.push(...repos);

      if (repos.length < 100) break;
      page++;
    }

    // Sort by last push date descending (most recently active first)
    const sorted = [...allRepos].sort(
      (a, b) =>
        new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime(),
    );

    return NextResponse.json({
      repositories: sorted.map((r) => ({
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
