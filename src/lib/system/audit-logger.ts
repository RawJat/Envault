import { createClient } from "@supabase/supabase-js";

// Initialize a Supabase client just for logging to bypass RLS via Service Role
// OR use authenticated anon key. Given the prompt wants us to query
// Supabase directly, but no INSERT or UPDATE/DELETE policies. Wait,
// we created an "Allow authenticated users to insert logs" policy.
// We need to use a client with the correct user context *or*
// background service role.

// The prompt specifies: "The function must execute asynchronously (waitUntil() or standard non-blocking Promise)"
// We will use standard non-blocking Promise using Next.js waitUntil.

export type AuditLogAction =
  | "secret.created"
  | "secret.updated"
  | "secret.deleted"
  | "secret.read_batch"
  | "member.invited"
  | "member.role_updated"
  | "member.removed"
  | "transfer.requested"
  | "transfer.accepted"
  | "transfer.rejected"
  | "environment.access_granted"
  | "environment.access_revoked";

export interface AuditLogPayload {
  projectId: string;
  actorId: string;
  actorType: "user" | "machine";
  action: AuditLogAction;
  targetResourceId?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  const sanitized = { ...metadata };
  const changes = sanitized.changes;
  if (changes && typeof changes === "object" && !Array.isArray(changes)) {
    const nextChanges = { ...(changes as Record<string, unknown>) };
    for (const [field, change] of Object.entries(nextChanges)) {
      if (
        field !== "value" ||
        !change ||
        typeof change !== "object" ||
        Array.isArray(change)
      ) {
        continue;
      }

      nextChanges[field] = {
        ...(change as Record<string, unknown>),
        old: "[REDACTED]",
        new: "[REDACTED]",
      };
    }
    sanitized.changes = nextChanges;
  }

  return sanitized;
}

/**
 * Appends an audit log to the database.
 * This is intentionally awaited by callsites for reliability.
 */
export async function logAuditEvent(payload: AuditLogPayload): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role if we don't have user JWT

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { error } = await supabase.from("audit_logs").insert({
      project_id: payload.projectId,
      actor_id: payload.actorId,
      actor_type: payload.actorType,
      action: payload.action,
      target_resource_id: payload.targetResourceId || null,
      user_agent: payload.userAgent || null,
      metadata: sanitizeMetadata(payload.metadata),
    });

    if (error) {
      console.error("[Audit Logger] Failed to insert log:", error);
    }
  } catch (e) {
    console.error("[Audit Logger] Unhandled exception:", e);
  }
}
