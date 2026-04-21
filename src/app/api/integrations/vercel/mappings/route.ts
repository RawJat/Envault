import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type EnvironmentSlug = "development" | "preview" | "production";
type VercelTarget = "development" | "preview" | "production";
const DEFAULT_MAPPINGS: Array<{
  envault_environment_slug: EnvironmentSlug;
  vercel_target: VercelTarget;
}> = [
  { envault_environment_slug: "development", vercel_target: "development" },
  { envault_environment_slug: "preview", vercel_target: "preview" },
  { envault_environment_slug: "production", vercel_target: "production" },
];

function isRelationMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: string }).code;
  return code === "42P01";
}

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

async function userOwnsInstallation(
  admin: ReturnType<typeof createAdminClient>,
  configurationId: string,
  userId: string,
) {
  const { data: installation, error } = await admin
    .from("vercel_installations")
    .select("configuration_id")
    .eq("configuration_id", configurationId)
    .eq("status", "active")
    .eq("created_by", userId)
    .maybeSingle();

  return !error && !!installation;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const configurationId = searchParams.get("configurationId");
    const vercelProjectId = searchParams.get("vercelProjectId");

    if (!projectId || !configurationId || !vercelProjectId) {
      return NextResponse.json(
        { error: "Missing projectId, configurationId or vercelProjectId" },
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

    const hasProjectAccess = await canManageProject(supabase, projectId, user.id);
    if (!hasProjectAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const ownsInstallation = await userOwnsInstallation(
      admin,
      configurationId,
      user.id,
    );
    if (!ownsInstallation) {
      return NextResponse.json(
        { error: "Installation does not belong to current user" },
        { status: 403 },
      );
    }

    const { data, error } = await admin
      .from("vercel_environment_mappings")
      .select("envault_environment_slug, vercel_target")
      .eq("envault_project_id", projectId)
      .eq("configuration_id", configurationId)
      .eq("vercel_project_id", vercelProjectId)
      .order("envault_environment_slug", { ascending: true });

    if (error) {
      if (isRelationMissing(error)) {
        // Backward-compatible fallback if migration was not applied yet.
        return NextResponse.json({ mappings: DEFAULT_MAPPINGS });
      }
      return NextResponse.json(
        { error: "Failed to load mappings" },
        { status: 500 },
      );
    }

    return NextResponse.json({ mappings: data ?? [] });
  } catch (error) {
    console.error("[Vercel Sync] Mappings GET error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

type MappingBody = {
  projectId?: string;
  configurationId?: string;
  vercelProjectId?: string;
  mappings?: Array<{
    envault_environment_slug: EnvironmentSlug;
    vercel_target: VercelTarget;
  }>;
};

const FIXED_TARGET_BY_ENV: Record<EnvironmentSlug, VercelTarget> = {
  development: "development",
  preview: "preview",
  production: "production",
};

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: MappingBody;
    try {
      body = (await request.json()) as MappingBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const projectId = body.projectId;
    const configurationId = body.configurationId;
    const vercelProjectId = body.vercelProjectId;
    const mappings = body.mappings || [];

    if (!projectId || !configurationId || !vercelProjectId) {
      return NextResponse.json(
        {
          error:
            "Missing projectId, configurationId, vercelProjectId or mappings",
        },
        { status: 400 },
      );
    }

    const hasProjectAccess = await canManageProject(supabase, projectId, user.id);
    if (!hasProjectAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();
    const ownsInstallation = await userOwnsInstallation(
      admin,
      configurationId,
      user.id,
    );
    if (!ownsInstallation) {
      return NextResponse.json(
        { error: "Installation does not belong to current user" },
        { status: 403 },
      );
    }

    await admin
      .from("vercel_environment_mappings")
      .delete()
      .eq("envault_project_id", projectId)
      .eq("configuration_id", configurationId)
      .eq("vercel_project_id", vercelProjectId);

    if (mappings.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const rows = mappings.map((mapping) => ({
      envault_project_id: projectId,
      configuration_id: configurationId,
      vercel_project_id: vercelProjectId,
      envault_environment_slug: mapping.envault_environment_slug,
      // Force fixed 1:1 mapping regardless of client payload.
      vercel_target: FIXED_TARGET_BY_ENV[mapping.envault_environment_slug],
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await admin
      .from("vercel_environment_mappings")
      .upsert(rows, {
        onConflict:
          "envault_project_id,configuration_id,vercel_project_id,envault_environment_slug,vercel_target",
      });

    if (upsertError) {
      if (isRelationMissing(upsertError)) {
        return NextResponse.json(
          {
            error:
              "Mappings table missing. Please run migration 20260421010000_vercel_environment_mappings.sql.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { error: "Failed to save mappings" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Vercel Sync] Mappings PUT error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
