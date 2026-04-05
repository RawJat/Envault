import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildMcpTokenMaskedValue,
  computeMcpTokenExpiryIso,
  isAllowedMcpTtlDays,
} from "../src/lib/security/mcp-token";
import { runMcpTokenCleanup } from "../src/lib/security/mcp-token-cleanup";

test("accepts only MCP TTL values 7, 15, 30", () => {
  assert.equal(isAllowedMcpTtlDays(7), true);
  assert.equal(isAllowedMcpTtlDays(15), true);
  assert.equal(isAllowedMcpTtlDays(30), true);
  assert.equal(isAllowedMcpTtlDays(1), false);
  assert.equal(isAllowedMcpTtlDays(14), false);
  assert.equal(isAllowedMcpTtlDays(31), false);
});

test("computes expiry at end-of-day UTC for date-based daily cleanup", () => {
  const now = new Date("2026-04-05T10:00:00.000Z");
  const expiry = computeMcpTokenExpiryIso(7, now);

  assert.equal(expiry, "2026-04-12T23:59:59.999Z");
});

test("masks MCP token with prefix and suffix", () => {
  const token = "envault_at_12345678-1234-1234-1234-123456789abc";
  const masked = buildMcpTokenMaskedValue(token);

  assert.ok(masked.startsWith("envault_at"));
  assert.ok(masked.includes("..."));
  assert.ok(masked.endsWith("789abc"));
});

test("runMcpTokenCleanup deletes expired rows and emits notifications/emails", async () => {
  const calls: Record<string, unknown[]> = {
    deleteExpiredTokens: [],
    clearExpiredProfileFields: [],
    notifyExpired: [],
    emailExpired: [],
  };

  const result = await runMcpTokenCleanup(
    {
      fetchExpiredTokens: async () => [
        {
          id: "t1",
          user_id: "u1",
          expires_at: "2026-04-10T23:59:59.999Z",
          metadata: { token_name: "Primary", ttl_days: 7 },
        },
      ],
      deleteExpiredTokens: async (userIds, nowIso) => {
        calls.deleteExpiredTokens.push({ userIds, nowIso });
      },
      clearExpiredProfileFields: async (userIds, nowIso) => {
        calls.clearExpiredProfileFields.push({ userIds, nowIso });
      },
      getUserEmailById: async (userId) => `${userId}@example.com`,
      notifyExpired: async (userId, tokenName, ttlDays, expiresAt) => {
        calls.notifyExpired.push({ userId, tokenName, ttlDays, expiresAt });
        return true;
      },
      emailExpired: async (email, userId, tokenName) => {
        calls.emailExpired.push({ email, userId, tokenName });
        return true;
      },
    },
    "2026-04-11T00:20:00.000Z",
  );

  assert.equal(result.cleaned, 1);
  assert.equal(result.notified, 1);
  assert.equal(result.emailed, 1);
  assert.equal(result.details.length, 1);

  assert.equal(calls.deleteExpiredTokens.length, 1);
  assert.equal(calls.clearExpiredProfileFields.length, 1);
  assert.equal(calls.notifyExpired.length, 1);
  assert.equal(calls.emailExpired.length, 1);
});
