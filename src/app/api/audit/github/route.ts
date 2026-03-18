import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/system/audit-logger";

const ALLOWED_GITHUB_ACTIONS = [
  "github.repo_linked",
  "github.repo_unlinked",
] as const;

type AllowedAction = (typeof ALLOWED_GITHUB_ACTIONS)[number];

export async function POST(request: Request) {
  // Authenticate the caller
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: string; projectId?: string; metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, projectId, metadata } = body;

  if (!action || !ALLOWED_GITHUB_ACTIONS.includes(action as AllowedAction)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  // Verify the user has access to this project before logging
  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await logAuditEvent({
    projectId,
    actorId: user.id,
    actorType: "user",
    action: action as AllowedAction,
    metadata: metadata ?? {},
  });

  return NextResponse.json({ ok: true });
}
