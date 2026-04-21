import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/utils/encryption";

function hasRequiredRole(role: string | null | undefined) {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === "owner" || normalized === "admin";
}

async function canManageProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  userId: string,
) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return false;
  }

  if (project.user_id === userId) {
    return true;
  }

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  return hasRequiredRole(membership?.role);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId parameter" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // 1. Verify Authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify Authorization (Owner or Admin, including project owner fallback)
    const hasProjectAccess = await canManageProject(
      supabase,
      projectId,
      user.id,
    );
    if (!hasProjectAccess) {
      return NextResponse.json(
        { error: "Forbidden: Requires Owner or Admin privileges" },
        { status: 403 },
      );
    }

    // 3. Fetch Vercel Project Link
    const { data: link, error: linkError } = await supabase
      .from("vercel_project_links")
      .select("vercel_project_id, configuration_id")
      .eq("envault_project_id", projectId)
      .single();

    if (linkError || !link) {
      console.error("[Vercel Sync] Project link query failed =>", linkError);
      return NextResponse.json(
        { error: "Vercel integration not found for this project" },
        { status: 404 },
      );
    }

    // 4. Fetch the Vercel Access Token (Encrypted)
    // Assumes `configuration_id` maps the link to the core installation payload.
    const { data: installation, error: installationError } = await supabase
      .from("vercel_installations")
      .select("access_token")
      .eq("configuration_id", link.configuration_id)
      .single();

    if (installationError || !installation?.access_token) {
      console.error(
        "[Vercel Sync] Installation query failed =>",
        installationError,
      );
      return NextResponse.json(
        { error: "Vercel installation data missing or corrupted" },
        { status: 404 },
      );
    }

    // 5. Decrypt the Access Token using server-side crypto utility.
    const decryptedToken = installation.access_token.startsWith("v1:")
      ? await decrypt(installation.access_token)
      : installation.access_token;

    // 6. Return response safely
    return NextResponse.json({
      vercelAccessToken: decryptedToken,
      vercelProjectId: link.vercel_project_id,
    });
  } catch (error) {
    console.error("[Vercel Sync] Token endpoint error:", error);
    // Strict error hiding from the frontend to prevent leakages
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
