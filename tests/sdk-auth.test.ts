import assert from "node:assert/strict";
import { test } from "node:test";
import type { NextRequest } from "next/server";

test("verifySdkAuth rejects non-agent tokens (401) before touching DB", async () => {
  const { verifySdkAuth } = await import("../src/lib/sdk/auth");

  // If the implementation incorrectly touches DB/config for invalid tokens,
  // it would return 500 due to missing backend env vars (rather than 401).
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const req = {
    headers: new Headers({ authorization: "Bearer not-an-agent-token" }),
  } as unknown as NextRequest;

  const res = await verifySdkAuth(req, "project-123");
  assert.ok("status" in res);
  assert.equal(res.status, 401);
});

test("verifySdkAuth rejects malformed agent tokens (401) before touching DB", async () => {
  const { verifySdkAuth } = await import("../src/lib/sdk/auth");

  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const req = {
    headers: new Headers({ authorization: "Bearer envault_agt_invalid.jwt" }),
  } as unknown as NextRequest;

  const res = await verifySdkAuth(req, "project-123");
  assert.ok("status" in res);
  assert.equal(res.status, 401);
});
