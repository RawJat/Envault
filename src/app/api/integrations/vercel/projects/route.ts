import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const configurationId = searchParams.get("configurationId");

    if (!projectId || !configurationId) {
      return NextResponse.json(
        { error: "Missing projectId or configurationId parameter" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasProjectAccess = await canManageProject(
      supabase,
      projectId,
      user.id,
    );
    if (!hasProjectAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: installation, error: installationError } = await supabaseAdmin
      .from("vercel_installations")
      .select("access_token")
      .eq("configuration_id", configurationId)
      .eq("created_by", user.id)
      .eq("status", "active")
      .single();

    if (installationError || !installation?.access_token) {
      return NextResponse.json(
        { error: "Installation not found" },
        { status: 404 },
      );
    }

    const vercelAccessToken = installation.access_token.startsWith("v1:")
      ? await decrypt(installation.access_token)
      : installation.access_token;

    const response = await fetch("https://api.vercel.com/v9/projects", {
      headers: {
        Authorization: `Bearer ${vercelAccessToken}`,
      },
    });

    const payload = (await response.json()) as {
      projects?: Array<{ id: string; name: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        await supabaseAdmin
          .from("vercel_installations")
          .update({ status: "revoked", updated_at: new Date().toISOString() })
          .eq("configuration_id", configurationId);
      }

      console.error("[Vercel Sync] Vercel projects fetch failed:", payload);
      return NextResponse.json(
        {
          error:
            response.status === 401 || response.status === 403
              ? "Vercel connection expired or revoked. Please reconnect the integration."
              : "Failed to fetch Vercel projects",
        },
        { status: response.status >= 400 && response.status < 500 ? 400 : 500 },
      );
    }

    return NextResponse.json({
      projects: (payload.projects ?? []).map((project) => ({
        id: project.id,
        name: project.name,
      })),
    });
  } catch (error) {
    console.error("[Vercel Sync] Projects endpoint error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
