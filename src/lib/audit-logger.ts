import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";

// Initialize a Supabase client just for logging to bypass RLS via Service Role
// OR use authenticated anon key. Given the prompt wants us to query
// Supabase directly, but no INSERT or UPDATE/DELETE policies. Wait,
// we created an "Allow authenticated users to insert logs" policy.
// We need to use a client with the correct user context *or*
// background service role.

// The prompt specifies: "The function must execute asynchronously (waitUntil() or standard non-blocking Promise)"
// We will use standard non-blocking Promise using Next.js waitUntil.

export type AuditLogAction =
  | "secret.create"
  | "secret.update"
  | "secret.delete"
  | "secret.read"
  | "project.member_add"
  | "project.member_remove"
  | "project.member_update"
  | "project.settings_update"
  | string;

export interface AuditLogPayload {
  projectId: string;
  actorId: string;
  actorType: "user" | "machine";
  action: AuditLogAction;
  targetResourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Appends an audit log to the database asynchronously.
 * Uses waitUntil in supported environments (Vercel) to not block the main response.
 */
export function logAuditEvent(payload: AuditLogPayload) {
  // We need the supabase client. To not block the main thread and avoid context/auth token issues
  // in background execution, it's safer to use the service role key for reliable inserts if auth expires,
  // BUT the prompt says "Allow authenticated users to insert logs" policy exists.
  // Actually, wait - let's inject supabase client or instantiate it inside.

  // To keep it simple and reusable without passing a client instance, we can use the Service Role key
  // to insert logging events silently. This works well for a background process where the user's
  // access token might not be guaranteed available.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role if we don't have user JWT

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const writeOperation = async () => {
    try {
      const { error } = await supabase.from("audit_logs").insert({
        project_id: payload.projectId,
        actor_id: payload.actorId,
        actor_type: payload.actorType,
        action: payload.action,
        target_resource_id: payload.targetResourceId || null,
        ip_address: payload.ipAddress || null,
        user_agent: payload.userAgent || null,
        metadata: payload.metadata || {},
      });

      if (error) {
        console.error("[Audit Logger] Failed to insert log:", error);
      }
    } catch (e) {
      console.error("[Audit Logger] Unhandled exception:", e);
    }
  };

  // WaitUntil ensures the promise finishes on Vercel Edge/Serverless before the instance shuts down
  if (process.env.VERCEL) {
    waitUntil(writeOperation());
  } else {
    // In local development or standard Node.js server, we can just await it
    // without blocking the main event loop if we call it without awaiting.
    // We execute it but don't strictly await it in the caller.
    writeOperation().catch(console.error);
  }
}
