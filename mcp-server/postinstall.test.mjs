import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { fixMcpConfig } from "./postinstall.mjs";

const PKG = "@dinanathdash/envault-mcp-server@latest";

async function withTempDir(fn) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "envault-postinstall-test-"));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("rewrites broken local module path config to npx.cmd on Windows", async () => {
  await withTempDir(async (dir) => {
    const vscodeDir = path.join(dir, ".vscode");
    await fs.mkdir(vscodeDir, { recursive: true });

    const configPath = path.join(vscodeDir, "mcp.json");
    const broken = {
      servers: {
        envault: {
          type: "stdio",
          command: "C:\\Program Files\\nodejs\\node.exe",
          args: [
            "node_modules/@dinanathdash/envault-mcp-server/server.mjs",
            "@dinanathdash/envault-mcp-server@latest",
          ],
          env: {
            ENVAULT_TOKEN: "envault_at_redacted",
          },
        },
      },
      inputs: [],
    };

    await fs.writeFile(configPath, JSON.stringify(broken, null, 2), "utf-8");

    await fixMcpConfig({
      initCwd: dir,
      platform: "win32",
      log: () => {},
      warn: () => {},
    });

    const after = JSON.parse(await fs.readFile(configPath, "utf-8"));
    assert.equal(after.servers.envault.command, "npx.cmd");
    assert.deepEqual(after.servers.envault.args, ["-y", PKG]);
    assert.equal(after.servers.envault.type, "stdio");
  });
});

test("keeps extra custom args while normalizing package launcher", async () => {
  await withTempDir(async (dir) => {
    const vscodeDir = path.join(dir, ".vscode");
    await fs.mkdir(vscodeDir, { recursive: true });

    const configPath = path.join(vscodeDir, "mcp.json");
    const cfg = {
      servers: {
        envault: {
          command: "npx",
          args: ["-y", "@dinanathdash/envault-mcp-server", "--check-update"],
        },
      },
      inputs: [],
    };

    await fs.writeFile(configPath, JSON.stringify(cfg, null, 2), "utf-8");

    await fixMcpConfig({
      initCwd: dir,
      platform: "linux",
      log: () => {},
      warn: () => {},
    });

    const after = JSON.parse(await fs.readFile(configPath, "utf-8"));
    assert.equal(after.servers.envault.command, "npx");
    assert.deepEqual(after.servers.envault.args, ["-y", PKG, "--check-update"]);
  });
});
