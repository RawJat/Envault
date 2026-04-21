import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  syncFullEnvironmentToVercel,
  syncVercelChangesForEnvironment,
} from "@/lib/integrations/vercel-sync";

function hasRequiredRole(role: string | null | undefined) {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === "owner" || normalized === "admin" || normalized === "editor";
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

type SyncBody = {
  projectId?: string;
  environmentSlug?: string;
  mode?: "changes" | "full";
  changes?: Array<{
    operation: "upsert" | "delete";
    key: string;
    value?: string;
  }>;
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

    let body: SyncBody;
    try {
      body = (await request.json()) as SyncBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const projectId = body.projectId;
    const environmentSlug = body.environmentSlug;
    const mode = body.mode || "changes";

    if (!projectId || !environmentSlug) {
      return NextResponse.json(
        { error: "Missing projectId or environmentSlug" },
        { status: 400 },
      );
    }

    const hasProjectAccess = await canManageProject(supabase, projectId, user.id);
    if (!hasProjectAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (mode === "full") {
      const summary = await syncFullEnvironmentToVercel({
        envaultProjectId: projectId,
        environmentSlug,
      });
      return NextResponse.json({ ok: true, mode, ...summary });
    }

    const changes = body.changes || [];
    if (!Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json(
        { error: "Missing changes for changes mode" },
        { status: 400 },
      );
    }

    for (const change of changes) {
      if (!change || !change.key || !change.operation) {
        return NextResponse.json(
          { error: "Invalid change payload" },
          { status: 400 },
        );
      }

      if (change.operation === "upsert" && typeof change.value !== "string") {
        return NextResponse.json(
          { error: `Missing plaintext value for key ${change.key}` },
          { status: 400 },
        );
      }
    }

    const summary = await syncVercelChangesForEnvironment({
      envaultProjectId: projectId,
      environmentSlug,
      changes,
    });

    return NextResponse.json({ ok: true, mode, ...summary });
  } catch (error) {
    console.error("[Vercel Sync] Sync endpoint error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
