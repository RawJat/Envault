import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Use NEXT_PUBLIC_APP_URL so redirects point to the correct domain (ngrok in dev, production domain in prod)
// rather than the internal localhost:3000 that Next.js sees behind the tunnel.
function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const installationId = searchParams.get("installation_id");

  if (!installationId) {
    return NextResponse.json(
      { error: "Missing installation_id" },
      { status: 400 },
    );
  }

  // GitHub Setup URL does NOT forward the `state` param -
  // we read the projectId from the cookie we set before redirecting to GitHub.
  const cookieStore = await cookies();
  const projectId = cookieStore.get("github_oauth_project_id")?.value;

  if (!projectId) {
    return NextResponse.redirect(
      new URL("/dashboard?error=missing_project_state", baseUrl()),
    );
  }
  const supabase = await createClient();

  // 1. Verify the user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?next=/api/github/callback?installation_id=${installationId}`, baseUrl()),
    );
  }

  // 2. Verify permission: User must be Owner or Editor of the project
  const { data: projectMember } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  const { data: projectOwner } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();

  const isOwner = projectOwner && projectOwner.user_id === user.id;
  const isEditor =
    projectMember && ["owner", "editor"].includes(projectMember.role);

  if (!isOwner && !isEditor) {
    return NextResponse.json(
      {
        error: "Unauthorized: You do not have permission to edit this project.",
      },
      { status: 403 },
    );
  }

  // 3. Update the project with the installation_id
  // Use admin client to bypass RLS - we've already verified ownership above.
  const adminSupabase = createAdminClient();

  // Fetch the slug first so we can redirect back to the correct project URL
  const { data: projectData } = await adminSupabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .single();

  const { error } = await adminSupabase
    .from("projects")
    .update({
      github_installation_id: parseInt(installationId),
      // Clear the repo name: UI will prompt user to select a repo next
      github_repo_full_name: null,
    })
    .eq("id", projectId);

  if (error) {
    const fallbackSlug = projectData?.slug || projectId;
    return NextResponse.redirect(
      new URL(`/project/${fallbackSlug}?error=github_link_failed`, baseUrl()),
    );
  }

  // Redirect back to the project page - the UI detects ?success=github_linked
  // and opens the GitHub integration dialog in repo-selection state.
  const projectSlug = projectData?.slug || projectId;
  const redirectResponse = NextResponse.redirect(
    new URL(`/project/${projectSlug}?success=github_linked`, baseUrl()),
  );
  redirectResponse.cookies.set("github_oauth_project_id", "", { maxAge: 0, path: "/" });
  return redirectResponse;
}
