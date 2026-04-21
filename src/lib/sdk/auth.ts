import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

let cachedRedis: Redis | null | undefined;
let cachedRatelimit: Ratelimit | null | undefined;
let cachedSupabase: SupabaseClient | null | undefined;

function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cachedRedis = null;
    return cachedRedis;
  }

  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

function getRatelimit(): Ratelimit | null {
  if (cachedRatelimit !== undefined) return cachedRatelimit;
  const redis = getRedis();
  if (!redis) {
    cachedRatelimit = null;
    return cachedRatelimit;
  }

  cachedRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(5, "1 s", 5),
    analytics: true,
  });
  return cachedRatelimit;
}

function getSupabaseService(): SupabaseClient | null {
  if (cachedSupabase !== undefined) return cachedSupabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cachedSupabase = null;
    return cachedSupabase;
  }
  cachedSupabase = createClient(url, key) as SupabaseClient;
  return cachedSupabase;
}

export async function verifySdkAuth(req: NextRequest, projectId: string) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer envault_agt_")) {
    return NextResponse.json(
      { error: "Invalid or missing agent token type" },
      { status: 401 },
    );
  }

  const rawToken = authHeader.split(" ")[1];
  const token = rawToken.replace(/^envault_agt_/, "");

  let payload: jwt.JwtPayload;
  try {
    const secret =
      process.env.ENVAULT_AGENT_SECRET || "development-agent-secret";
    payload = jwt.verify(token, secret) as jwt.JwtPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid or malformed token signature" },
      { status: 401 },
    );
  }

  const userId = payload.sub;
  const agentId = payload.act;

  if (!userId || !agentId) {
    return NextResponse.json(
      { error: "Token missing required sub or act claims" },
      { status: 401 },
    );
  }

  // 1. Rate Limiting Check
  try {
    const ratelimit = getRatelimit();
    if (ratelimit) {
      const { success } = await ratelimit.limit(`rate_limit:agent:${agentId}`);
      if (!success) {
        return NextResponse.json(
          { error: "Too Many Requests from Agent Instance" },
          { status: 429 },
        );
      }
    } else {
      console.warn("[Agent SDK] Rate limiter unavailable, falling open.");
    }
  } catch {
    console.warn("[Agent SDK] Rate limiter unavailable, falling open.");
  }

  // 2. Kill-Switch Check (Redis first, Postgres fallback)
  const redis = getRedis();
  const supabase = getSupabaseService();
  if (!supabase) {
    return NextResponse.json(
      { error: "Internal Server Error (Auth backend not configured)" },
      { status: 500 },
    );
  }

  const globalCacheKey = `users.global_agent_access:${userId}`;
  const projectCacheKey = `projects.agent_access:${projectId}`;

  const asBoolean = (value: unknown): boolean | null => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      if (value === "true") return true;
      if (value === "false") return false;
    }
    return null;
  };

  let isGlobalEnabled: boolean | null = null;
  let isProjectEnabled: boolean | null = null;

  try {
    if (redis) {
      const p = redis.pipeline();
      p.get(globalCacheKey);
      p.get(projectCacheKey);
      const [globalCache, projectCache] = await p.exec();

      isGlobalEnabled = asBoolean(globalCache);
      isProjectEnabled = asBoolean(projectCache);
    }
  } catch {
    // Cache errors should not block auth; fallback to Postgres.
  }

  // Use Redis as fast-path only when both switches are explicitly true.
  // Any false/null value is revalidated against Postgres to avoid stale deny cache.
  if (isGlobalEnabled !== true || isProjectEnabled !== true) {
    const [userRes, projectRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("global_agent_access_enabled")
        .eq("id", userId)
        .single(),
      supabase
        .from("projects")
        .select("agent_access_enabled")
        .eq("id", projectId)
        .single(),
    ]);

    if (userRes.error || !userRes.data) {
      console.error("[Agent SDK] DB user check failed:", userRes.error);
      return NextResponse.json(
        { error: "Internal Server Error (User Profile)" },
        { status: 500 },
      );
    }

    if (projectRes.error || !projectRes.data) {
      console.error("[Agent SDK] DB project check failed:", projectRes.error);
      return NextResponse.json(
        { error: "Internal Server Error (Project)" },
        { status: 500 },
      );
    }

    isGlobalEnabled = !!userRes.data.global_agent_access_enabled;
    isProjectEnabled = !!projectRes.data.agent_access_enabled;

    if (redis) {
      await Promise.all([
        redis.set(globalCacheKey, String(isGlobalEnabled), { ex: 3600 }),
        redis.set(projectCacheKey, String(isProjectEnabled), { ex: 3600 }),
      ]).catch(() => undefined);
    }
  }

  if (!isGlobalEnabled) {
    return NextResponse.json(
      {
        error: "Agent access disabled globally by user (Kill Switch Activated)",
      },
      { status: 403 },
    );
  }

  if (!isProjectEnabled) {
    return NextResponse.json(
      {
        error: "Agent access disabled for this project (Kill Switch Activated)",
      },
      { status: 403 },
    );
  }

  // 3. Context-Boundary Fencing
  const scopes = payload.projects || [];
  if (!scopes.includes(projectId) && !scopes.includes("*")) {
    return NextResponse.json(
      { error: "Context-Boundary Fenced: Token lacks scope for this resource" },
      { status: 403 },
    );
  }

  return { userId, agentId, authorized: true };
}
