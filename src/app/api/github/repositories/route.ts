import { NextResponse } from "next/server";
import { generateGitHubAppJWT } from "@/lib/github";

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
    // 1. Generate the App JWT
    const appJwt = generateGitHubAppJWT();

    // 2. Get an Installation Access Token for this specific installation
    const tokenResponse = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appJwt}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!tokenResponse.ok) {
      await tokenResponse.text();
      return NextResponse.json(
        { error: "Failed to authenticate with GitHub" },
        { status: 500 },
      );
    }

    const { token } = await tokenResponse.json();

    // 3. Fetch the repositories accessible to this installation
    const reposResponse = await fetch(
      "https://api.github.com/installation/repositories",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!reposResponse.ok) {
      await reposResponse.text();
      return NextResponse.json(
        { error: "Failed to fetch repositories" },
        { status: 500 },
      );
    }

    const reposData = await reposResponse.json();

    // Sort by last push date descending (most recently active first)
    const sorted = (reposData.repositories ?? []).sort(
      (a: { pushed_at: string }, b: { pushed_at: string }) =>
        new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime(),
    );

    return NextResponse.json({
      repositories: sorted.map((r: { id: number; full_name: string; pushed_at: string }) => ({
        id: r.id,
        full_name: r.full_name,
        pushed_at: r.pushed_at,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
