import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMcpTokenExpiredNotification } from "@/lib/system/notifications";
import { sendSecurityAlertEmail } from "@/lib/infra/email";
import {
  runMcpTokenCleanup,
  type ExpiredTokenRow,
} from "@/lib/security/mcp-token-cleanup";

export const dynamic = "force-dynamic";

const MCP_WEB_TOKEN_NAME = "MCP Access Token";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  try {
    const result = await runMcpTokenCleanup({
      fetchExpiredTokens: async (nowIso) => {
        const { data, error } = await admin
          .from("personal_access_tokens")
          .select("id, user_id, expires_at, metadata")
          .eq("name", MCP_WEB_TOKEN_NAME)
          .not("expires_at", "is", null)
          .lt("expires_at", nowIso);

        if (error) throw error;
        return (data || []) as ExpiredTokenRow[];
      },
      deleteExpiredTokens: async (userIds, nowIso) => {
        const { error } = await admin
          .from("personal_access_tokens")
          .delete()
          .eq("name", MCP_WEB_TOKEN_NAME)
          .in("user_id", userIds)
          .lt("expires_at", nowIso);

        if (error) throw error;
      },
      clearExpiredProfileFields: async (userIds, nowIso) => {
        const { error } = await admin
          .from("profiles")
          .update({
            mcp_web_token_hash: null,
            mcp_web_token_ttl_days: null,
            mcp_web_token_expires_at: null,
          })
          .in("id", userIds)
          .lt("mcp_web_token_expires_at", nowIso);

        if (error) throw error;
      },
      getUserEmailById: async (userId) => {
        const { data, error } = await admin.auth.admin.getUserById(userId);
        if (error) return null;
        return data.user?.email || null;
      },
      notifyExpired: async (userId, tokenName, ttlDays, expiresAt) => {
        const notif = await createMcpTokenExpiredNotification(
          userId,
          tokenName,
          ttlDays,
          expiresAt,
        );
        return !notif.error;
      },
      emailExpired: async (email, userId, tokenName) => {
        const title = "MCP Token Expired and Removed";
        const message = `Your MCP token${tokenName ? ` (${tokenName})` : ""} reached its validity window and was removed automatically.`;

        await sendSecurityAlertEmail(
          email,
          title,
          message,
          userId,
          "/settings?tab=security",
        );
        return true;
      },
    });

    return NextResponse.json({
      success: true,
      cleaned: result.cleaned,
      notified: result.notified,
      emailed: result.emailed,
      details: result.details,
    });
  } catch (error: unknown) {
    console.error("[MCP Token Cleanup Cron] Failed:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return new NextResponse(`Internal Server Error: ${message}`, { status: 500 });
  }
}
