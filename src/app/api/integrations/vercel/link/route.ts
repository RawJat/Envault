import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

type LinkPayload = {
  envaultProjectId?: string;
  vercelProjectId?: string;
  vercelProjectName?: string;
  configurationId?: string;
};

type UnlinkPayload = {
  envaultProjectId?: string;
  linkId?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: LinkPayload;
    try {
      body = (await request.json()) as LinkPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      envaultProjectId,
      vercelProjectId,
      vercelProjectName,
      configurationId,
    } = body;

    if (!envaultProjectId || !vercelProjectId || !configurationId) {
      return NextResponse.json(
        {
          error: "Missing envaultProjectId, vercelProjectId or configurationId",
        },
        { status: 400 },
      );
    }

    const hasProjectAccess = await canManageProject(
      supabase,
      envaultProjectId,
      user.id,
    );
    if (!hasProjectAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: installation, error: installationError } = await supabaseAdmin
      .from("vercel_installations")
      .select("configuration_id")
      .eq("configuration_id", configurationId)
      .eq("created_by", user.id)
      .eq("status", "active")
      .single();

    if (installationError || !installation) {
      return NextResponse.json(
        { error: "Invalid installation" },
        { status: 404 },
      );
    }

    const { error: upsertError } = await supabaseAdmin
      .from("vercel_project_links")
      .upsert(
        {
          envault_project_id: envaultProjectId,
          vercel_project_id: vercelProjectId,
          vercel_project_name: vercelProjectName || null,
          configuration_id: configurationId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "envault_project_id,vercel_project_id" },
      );

    if (upsertError) {
      console.error(
        "[Vercel Sync] Failed to link Vercel project:",
        upsertError,
      );
      return NextResponse.json(
        { error: "Failed to link project" },
        { status: 500 },
      );
    }

    const defaultMappings = [
      {
        envault_project_id: envaultProjectId,
        configuration_id: configurationId,
        vercel_project_id: vercelProjectId,
        envault_environment_slug: "development",
        vercel_target: "development",
        updated_at: new Date().toISOString(),
      },
      {
        envault_project_id: envaultProjectId,
        configuration_id: configurationId,
        vercel_project_id: vercelProjectId,
        envault_environment_slug: "preview",
        vercel_target: "preview",
        updated_at: new Date().toISOString(),
      },
      {
        envault_project_id: envaultProjectId,
        configuration_id: configurationId,
        vercel_project_id: vercelProjectId,
        envault_environment_slug: "production",
        vercel_target: "production",
        updated_at: new Date().toISOString(),
      },
    ];

    await supabaseAdmin.from("vercel_environment_mappings").upsert(defaultMappings, {
      onConflict:
        "envault_project_id,configuration_id,vercel_project_id,envault_environment_slug,vercel_target",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Vercel Sync] Link endpoint error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: UnlinkPayload;
    try {
      body = (await request.json()) as UnlinkPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { envaultProjectId, linkId } = body;

    if (!envaultProjectId || !linkId) {
      return NextResponse.json(
        { error: "Missing envaultProjectId or linkId" },
        { status: 400 },
      );
    }

    const hasProjectAccess = await canManageProject(
      supabase,
      envaultProjectId,
      user.id,
    );
    if (!hasProjectAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: existingLink } = await supabaseAdmin
      .from("vercel_project_links")
      .select("configuration_id, vercel_project_id")
      .eq("id", linkId)
      .eq("envault_project_id", envaultProjectId)
      .maybeSingle();

    if (existingLink) {
      await supabaseAdmin
        .from("vercel_environment_mappings")
        .delete()
        .eq("envault_project_id", envaultProjectId)
        .eq("configuration_id", existingLink.configuration_id)
        .eq("vercel_project_id", existingLink.vercel_project_id);
    }

    const { error: deleteError } = await supabaseAdmin
      .from("vercel_project_links")
      .delete()
      .eq("id", linkId)
      .eq("envault_project_id", envaultProjectId);

    if (deleteError) {
      console.error("[Vercel Sync] Failed to unlink Vercel project:", deleteError);
      return NextResponse.json(
        { error: "Failed to unlink project" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Vercel Sync] Unlink endpoint error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
