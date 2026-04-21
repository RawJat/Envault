import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

type FetchCall = { url: string; init?: RequestInit };

function tempDir(prefix: string): string {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

test("standalone envault_push routes mutations through HITL SDK (delegate -> /api/sdk/secrets), never /api/cli POST", async () => {
  const { __test__ } = await import("../mcp-server/server.mjs");

  const dir = tempDir("envault-mcp-hitl-");
  writeFileSync(
    path.join(dir, "envault.json"),
    JSON.stringify({
      projectId: "9bdc9567-0fd7-472b-af5f-29fd9771227e",
      defaultEnvironment: "development",
      envFiles: { development: ".env" },
    }),
  );
  writeFileSync(path.join(dir, ".env"), "A=1\n");

  process.env.ENVAULT_BASE_URL = "https://www.envault.tech";
  process.env.ENVAULT_TOKEN = "envault_at_test_token";

  const calls: FetchCall[] = [];
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input);
    calls.push({ url, init });

    if (
      url.includes(
        "/api/cli/projects/9bdc9567-0fd7-472b-af5f-29fd9771227e/secrets",
      )
    ) {
      assert.equal(init?.method || "GET", "GET");
      return new Response(
        JSON.stringify({
          secrets: [
            { key: "A", value: "old" },
            { key: "B", value: "2" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url.endsWith("/api/sdk/auth/delegate")) {
      assert.equal(init?.method, "POST");
      assert.equal(
        init?.headers && (init.headers as Record<string, string>).Authorization,
        "Bearer envault_at_test_token",
      );
      return new Response(JSON.stringify({ token: "envault_agt_mock_token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.endsWith("/api/sdk/secrets")) {
      assert.equal(init?.method, "POST");
      assert.equal(
        init?.headers && (init.headers as Record<string, string>).Authorization,
        "Bearer envault_agt_mock_token",
      );
      return new Response(
        JSON.stringify({
          status: "pending",
          approval_id: "approval-001",
          approval_url: "https://www.envault.tech/approve/approval-001",
        }),
        { status: 202, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "unexpected url", url }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const config = JSON.parse(
    await import("node:fs/promises").then((m) =>
      m.readFile(path.join(dir, "envault.json"), "utf-8"),
    ),
  );

  const toolResponse = await __test__.handleStandalonePushOrDeploy({
    args: { environment: "development" },
    cwd: dir,
    config,
  });

  assert.equal(toolResponse.isError, false);

  const payload = JSON.parse(toolResponse.content[0].text) as {
    mode: string;
    result: { approval_id: string };
  };
  assert.equal(payload.mode, "sdk");
  assert.equal(payload.result.approval_id, "approval-001");

  const cliPost = calls.find(
    (c) =>
      c.url.includes("/api/cli/projects/") &&
      (c.init?.method || "GET") === "POST",
  );
  assert.equal(cliPost, undefined);

  assert.ok(calls.some((c) => c.url.endsWith("/api/sdk/auth/delegate")));
  assert.ok(calls.some((c) => c.url.endsWith("/api/sdk/secrets")));
});
