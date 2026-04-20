import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { apiRateLimit } from "@/lib/infra/ratelimit";

export type AuthIdentity =
  | { type: "user"; userId: string; tokenId: string }
  | {
      type: "service";
      projectId: string;
      tokenId: string;
      environment?: string | null;
    };

export async function validateCliToken(
  request: Request,
): Promise<AuthIdentity | NextResponse> {
  const authHeader = request.headers.get("Authorization");

  // Rate Limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success: rateLimitSuccess } = await apiRateLimit.limit(`cli_${ip}`);
  if (!rateLimitSuccess) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid authorization header" },
      { status: 401 },
    );
  }

  const token = authHeader.split(" ")[1];
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const supabase = createAdminClient();

  // Prefix-based routing: if it starts with envault_svc_, check service_tokens
  if (token.startsWith("envault_svc_")) {
    const { data, error } = await supabase
      .from("service_tokens")
      .select("id, project_id, environment, last_used_at, expires_at")
      .eq("token_hash", tokenHash)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Invalid service token" },
        { status: 401 },
      );
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }

    supabase
      .from("service_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token_hash", tokenHash)
      .then();

    return {
      type: "service",
      projectId: data.project_id,
      tokenId: data.id,
      environment: data.environment,
    };
  }

  // Default to PAT check
  const { data, error } = await supabase
    .from("personal_access_tokens")
    .select("id, user_id, last_used_at, expires_at")
    .eq("token_hash", tokenHash)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "token_expired" }, { status: 401 });
  }

  supabase
    .from("personal_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .then();

  return { type: "user", userId: data.user_id, tokenId: data.id };
}
