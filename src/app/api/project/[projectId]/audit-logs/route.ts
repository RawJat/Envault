import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { auditReadRateLimit } from "@/lib/ratelimit";
import { getProjectRole } from "@/lib/permissions";

export async function GET(
  req: Request,
  props: { params: Promise<{ projectId: string }> },
) {
  try {
    const params = await props.params;
    const { projectId } = params;

    // Apply Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const { success } = await auditReadRateLimit.limit(`audit_read_${ip}`);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Double check ownership
    const role = await getProjectRole(supabase, projectId, user.id);
    if (role !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: Only project owners can view audit logs" },
        { status: 403 },
      );
    }

    // Fetch logs (RLS policy will also enforce ownership explicitly)
    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50); // Get recent logs

    if (error) {
      console.error("[Audit API] Error fetching logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 },
      );
    }

    // Optional: Enrich 'actor_id' with 'profiles' or 'service_tokens' name/emails
    // We'll do a basic map for users, service tokens might have to be fetched
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        let actorName = "Unknown";
        let actorEmail = "";

        if (log.actor_type === "user") {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", log.actor_id)
            .maybeSingle();
          if (profileData) {
            actorName = profileData.username || "User";
          }

          const { data: authUserData } =
            await adminSupabase.auth.admin.getUserById(log.actor_id);
          if (authUserData?.user?.email) {
            actorEmail = authUserData.user.email;
          }
        } else {
          const { data: tokenData } = await supabase
            .from("service_tokens")
            .select("name")
            .eq("id", log.actor_id)
            .single();
          actorName = tokenData?.name || "Service Token";
        }

        return {
          ...log,
          actor_name: actorName,
          actor_email: actorEmail,
        };
      }),
    );

    return NextResponse.json({ logs: enrichedLogs });
  } catch (error) {
    console.error("[Audit API] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
