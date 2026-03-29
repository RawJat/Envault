import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

type DeleteResult = {
  success: boolean;
  reason?: string;
};

async function cleanupUserLinkedRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<DeleteResult> {
  const { error: reqError } = await supabase
    .from("access_requests")
    .delete()
    .eq("user_id", userId);
  if (reqError) return { success: false, reason: reqError.message };

  const { error: shareError } = await supabase
    .from("secret_shares")
    .delete()
    .eq("user_id", userId);
  if (shareError) return { success: false, reason: shareError.message };

  const { error: memberError } = await supabase
    .from("project_members")
    .delete()
    .eq("user_id", userId);
  if (memberError) return { success: false, reason: memberError.message };

  const { error: updatedByError } = await supabase
    .from("secrets")
    .update({ last_updated_by: null })
    .eq("last_updated_by", userId);
  if (updatedByError) return { success: false, reason: updatedByError.message };

  await supabase.from("personal_access_tokens").delete().eq("user_id", userId);
  await supabase.from("device_flow_sessions").delete().eq("user_id", userId);

  const { error: projectsError } = await supabase
    .from("projects")
    .delete()
    .eq("user_id", userId);
  if (projectsError) return { success: false, reason: projectsError.message };

  return { success: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const expectedCronSecret =
    Deno.env.get("ACCOUNT_DELETION_CRON_SECRET")?.trim() || "";
  const receivedCronSecret = req.headers.get("x-cron-secret")?.trim() || "";

  if (!expectedCronSecret || receivedCronSecret !== expectedCronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const cutoffIso = new Date(Date.now() - GRACE_PERIOD_MS).toISOString();

    const { data: candidates, error: candidatesError } = await supabase
      .from("profiles")
      .select("id, username, deletion_scheduled_at")
      .not("deletion_scheduled_at", "is", null)
      .lte("deletion_scheduled_at", cutoffIso)
      .order("deletion_scheduled_at", { ascending: true })
      .limit(500);

    if (candidatesError) {
      return new Response(
        JSON.stringify({ error: candidatesError.message, cutoffIso }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          deleted: 0,
          failed: 0,
          cutoffIso,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const failures: Array<{ userId: string; reason: string }> = [];
    let deleted = 0;

    for (const candidate of candidates) {
      const { data: userData, error: userError } =
        await supabase.auth.admin.getUserById(candidate.id);

      if (userError || !userData.user) {
        failures.push({
          userId: candidate.id,
          reason: userError?.message || "user_not_found",
        });
        continue;
      }

      const actorEmail = userData.user.email || null;
      const actorName = candidate.username || null;

      const { error: prepError } = await supabase.rpc(
        "prepare_user_account_deletion",
        {
          p_user_id: candidate.id,
          p_actor_name: actorName,
          p_actor_email: actorEmail,
        },
      );

      if (prepError) {
        failures.push({ userId: candidate.id, reason: prepError.message });
        continue;
      }

      const cleanupResult = await cleanupUserLinkedRows(supabase, candidate.id);
      if (!cleanupResult.success) {
        failures.push({
          userId: candidate.id,
          reason: cleanupResult.reason || "cleanup_failed",
        });
        continue;
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        candidate.id,
      );

      if (deleteError) {
        failures.push({ userId: candidate.id, reason: deleteError.message });
        continue;
      }

      deleted += 1;
    }

    return new Response(
      JSON.stringify({
        success: failures.length === 0,
        processed: candidates.length,
        deleted,
        failed: failures.length,
        failures,
        cutoffIso,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unexpected edge function error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
