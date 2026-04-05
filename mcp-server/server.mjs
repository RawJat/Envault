#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const execFileAsync = promisify(execFile);
const PACKAGE_NAME = "@dinanathdash/envault-mcp-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseSemver(input) {
  return String(input || "")
    .trim()
    .replace(/^v/i, "")
    .split(".")
    .map((segment) => Number.parseInt(segment.replace(/[^0-9].*$/, ""), 10) || 0);
}

function compareSemver(a, b) {
  const left = parseSemver(a);
  const right = parseSemver(b);
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    const l = left[index] ?? 0;
    const r = right[index] ?? 0;
    if (l > r) return 1;
    if (l < r) return -1;
  }

  return 0;
}

async function getCurrentPackageVersion() {
  const packageJsonPath = path.join(__dirname, "package.json");
  try {
    const raw = await fs.readFile(packageJsonPath, "utf-8");
    const parsed = safeJsonParse(raw, {});
    if (typeof parsed.version === "string" && parsed.version.trim()) {
      return parsed.version.trim();
    }
  } catch {
    // Fall through to unknown version.
  }

  return "0.0.0";
}

async function getLatestPublishedVersion() {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(PACKAGE_NAME)}/latest`,
    );
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    if (typeof payload?.version === "string" && payload.version.trim()) {
      return payload.version.trim();
    }
  } catch {
    // Network failures should not break MCP server startup.
  }

  return null;
}

function printCliUsage() {
  process.stdout.write(
    [
      "Envault MCP Server",
      "",
      "Usage:",
      "  envault-mcp-server                Start stdio MCP server",
      "  envault-mcp-server --version      Print installed MCP server version",
      "  envault-mcp-server --check-update Compare installed version vs npm latest",
      "",
    ].join("\n"),
  );
}

async function handleMetadataCommand() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printCliUsage();
    return true;
  }

  if (args.includes("--version") || args.includes("-v")) {
    const currentVersion = await getCurrentPackageVersion();
    process.stdout.write(`${PACKAGE_NAME} v${currentVersion}\n`);
    return true;
  }

  if (args.includes("--check-update")) {
    const currentVersion = await getCurrentPackageVersion();
    const latestVersion = await getLatestPublishedVersion();

    if (!latestVersion) {
      process.stdout.write(
        `${PACKAGE_NAME} v${currentVersion} (latest npm version unavailable)\n`,
      );
      return true;
    }

    const cmp = compareSemver(currentVersion, latestVersion);
    if (cmp < 0) {
      process.stdout.write(
        `${PACKAGE_NAME} v${currentVersion} -> update available: v${latestVersion}\n`,
      );
    } else if (cmp === 0) {
      process.stdout.write(
        `${PACKAGE_NAME} v${currentVersion} is up to date.\n`,
      );
    } else {
      process.stdout.write(
        `${PACKAGE_NAME} v${currentVersion} is newer than npm latest v${latestVersion}.\n`,
      );
    }

    return true;
  }

  return false;
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function readEnvaultConfig(cwd) {
  const configPath = path.join(cwd, "envault.json");
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return safeJsonParse(raw, {});
  } catch {
    return {};
  }
}

function resolveLocalEnvFile(config, environment, explicitFile) {
  if (typeof explicitFile === "string" && explicitFile.trim()) {
    return explicitFile.trim();
  }

  const env =
    (typeof environment === "string" && environment.trim()) ||
    config.defaultEnvironment ||
    "development";

  if (config.environmentFiles && typeof config.environmentFiles === "object") {
    const mapped = config.environmentFiles[env];
    if (typeof mapped === "string" && mapped.trim()) {
      return mapped.trim();
    }
  }

  if (env === "development") {
    return ".env";
  }

  return `.env.${env}`;
}

function upsertEnvLine(content, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escapedKey}=.*$`, "m");
  const nextLine = `${key}=${value}`;

  if (regex.test(content)) {
    return content.replace(regex, nextLine);
  }

  const suffix = content.endsWith("\n") || content.length === 0 ? "" : "\n";
  return `${content}${suffix}${nextLine}\n`;
}

function removeEnvLine(content, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escapedKey}=.*(?:\\r?\\n)?`, "gm");
  return content.replace(regex, "");
}

async function runEnvault(args, cwd) {
  try {
    const env = {
      ...process.env,
      ENVAULT_CLI_ACTOR_SOURCE: "mcp",
    };

    const { stdout, stderr } = await execFileAsync("envault", args, {
      cwd,
      env,
      timeout: 120000,
      maxBuffer: 1024 * 1024,
    });
    return {
      ok: true,
      stdout: stdout?.trim() || "",
      stderr: stderr?.trim() || "",
      command: `envault ${args.join(" ")}`,
    };
  } catch (error) {
    return {
      ok: false,
      command: `envault ${args.join(" ")}`,
      message:
        error?.code === "ENOENT"
          ? "Envault CLI binary not found in PATH. Configure ENVAULT_TOKEN for standalone MCP mode, or install Envault CLI."
          : error?.message || "Unknown error",
      stdout: error?.stdout?.trim?.() || "",
      stderr: error?.stderr?.trim?.() || "",
    };
  }
}

function resolveBaseUrl() {
  const candidate =
    (process.env.ENVAULT_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://envault.tech").trim();
  return candidate.replace(/\/+$/, "");
}

function getStandaloneToken() {
  const token = (process.env.ENVAULT_TOKEN || "").trim();
  return token || null;
}

async function callEnvaultApi({ pathName, method = "GET", query, body }) {
  const token = getStandaloneToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      error:
        "ENVAULT_TOKEN is not configured. Add ENVAULT_TOKEN in MCP env for standalone mode.",
    };
  }

  const baseUrl = resolveBaseUrl();
  const url = new URL(`${baseUrl}${pathName}`);
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && String(value).trim()) {
        url.searchParams.set(key, String(value).trim());
      }
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-envault-actor-source": "mcp",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const raw = await response.text();
    const parsed = safeJsonParse(raw, null);

    const defaultError = raw || `HTTP ${response.status}`;
    const parsedError =
      parsed && typeof parsed.error === "string" ? parsed.error : defaultError;

    const authHint =
      response.status === 401
        ? {
            authHint:
              "Unauthorized with ENVAULT_TOKEN. Use a fresh full MCP token (not masked), ensure it is not expired/revoked, and ensure ENVAULT_BASE_URL matches where the token was issued.",
          }
        : {};

    return {
      ok: response.ok,
      status: response.status,
      data: parsed ?? raw,
      error: response.ok ? null : parsedError,
      url: url.toString(),
      method,
      ...authHint,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseEnvFile(content) {
  const out = new Map();
  for (const line of String(content || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1);
    if (key) out.set(key, value);
  }
  return out;
}

function toSortedEnvFile(map) {
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")
    .concat(map.size > 0 ? "\n" : "");
}

function resolveProjectId(args, config) {
  if (isNonEmptyString(args?.projectId)) return args.projectId.trim();
  if (isNonEmptyString(config?.projectId)) return config.projectId.trim();
  return "";
}

function resolveEnvironment(args, config) {
  if (isNonEmptyString(args?.environment)) return args.environment.trim();
  if (isNonEmptyString(config?.defaultEnvironment)) return config.defaultEnvironment.trim();
  return "development";
}

function buildDiff(localMap, remoteSecrets) {
  const remoteMap = new Map((remoteSecrets || []).map((s) => [s.key, s.value]));

  const additions = [];
  const deletions = [];
  const modifications = [];
  let unchanged = 0;

  for (const [key, localValue] of localMap.entries()) {
    if (!remoteMap.has(key)) {
      additions.push(key);
      continue;
    }
    const remoteValue = remoteMap.get(key);
    if (remoteValue !== localValue) modifications.push(key);
    else unchanged += 1;
  }

  for (const key of remoteMap.keys()) {
    if (!localMap.has(key)) deletions.push(key);
  }

  additions.sort();
  deletions.sort();
  modifications.sort();

  return {
    additions,
    deletions,
    modifications,
    unchanged,
  };
}

function toToolResponse(payload, isError = false) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    isError,
  };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function pushOptionalFlag(cliArgs, flag, value) {
  if (isNonEmptyString(value)) {
    cliArgs.push(flag, value.trim());
  }
}

function pushProjectAndEnvironment(cliArgs, args) {
  pushOptionalFlag(cliArgs, "--project", args.projectId);
  pushOptionalFlag(cliArgs, "--env", args.environment);
}

const RUNTIME_VERSION = await getCurrentPackageVersion();

const server = new Server(
  {
    name: "envault-mcp-server",
    version: RUNTIME_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "envault_status",
      description:
        "Read-only context check for auth, project, role, permissions, active environment, and mapped local env file. Use this first when context is unclear.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "Optional project ID override for status call.",
          },
        },
      },
    },
    {
      name: "envault_context",
      description:
        "Alias of envault_status for explicit context retrieval. Returns auth, project, role, permissions, active environment, and local env mapping.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "Optional project ID override for context/status call.",
          },
        },
      },
    },
    {
      name: "envault_pull",
      description:
        "Fetch remote secrets into a local env file. Use before local development runs, diffs, or edits. This updates local files only and does not require HITL approval.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          environment: { type: "string" },
          file: { type: "string" },
          force: { type: "boolean", default: true },
        },
      },
    },
    {
      name: "envault_push",
      description:
        "Submit local secret changes for HITL approval. IMPORTANT: treat this as an approval-request step, not immediate execution. If the response indicates pending approval (for example HTTP 202 Accepted with approval_id/approval_url), you must explicitly show the approval_url to the user, instruct them to open it in a browser and approve/reject, then wait for user confirmation or poll status before assuming changes are applied.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          environment: { type: "string" },
          file: { type: "string" },
          force: { type: "boolean", default: true },
          dryRun: { type: "boolean", default: false },
        },
      },
    },
    {
      name: "envault_deploy",
      description:
        "Alias of envault_push. Same HITL behavior applies: if pending approval is returned, provide approval_url to the user and wait for approval completion before claiming success.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          environment: { type: "string" },
          file: { type: "string" },
          force: { type: "boolean", default: true },
          dryRun: { type: "boolean", default: false },
        },
      },
    },
    {
      name: "envault_approve",
      description:
        "Approve a pending HITL request by approval ID. Use after envault_push/envault_deploy returns a pending approval. This executes the human approval action.",
      inputSchema: {
        type: "object",
        properties: {
          approvalId: { type: "string" },
        },
        required: ["approvalId"],
      },
    },
    {
      name: "envault_diff",
      description:
        "Compare local env file against remote secrets and return additions, deletions, and modifications before proposing a push.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          environment: { type: "string" },
          file: { type: "string" },
        },
      },
    },
    {
      name: "envault_run",
      description:
        "Run a local command with Envault secrets injected into process environment. Use when the user asks to run an app/script with managed secrets.",
      inputSchema: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          environment: { type: "string" },
          command: { type: "string" },
          args: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["command"],
      },
    },
    {
      name: "envault_login",
      description:
        "Start CLI device-flow login in the browser and store local CLI access token. Use when auth is missing or expired.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "envault_init",
      description:
        "Initialize envault.json and project linkage in the current directory. Use for first-time project setup.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "envault_generate_hooks",
      description:
        "Create or update git post-merge hook that triggers envault pull after merges.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "envault_audit",
      description:
        "Audit local env safety and key parity. Can install pre-commit hook and emit text or JSON output.",
      inputSchema: {
        type: "object",
        properties: {
          strict: { type: "boolean", default: false },
          format: { type: "string", enum: ["text", "json"] },
          installHook: { type: "boolean", default: false },
          template: { type: "string" },
          file: { type: "string" },
        },
      },
    },
    {
      name: "envault_env_map",
      description:
        "Map an environment slug to a local env file path in envault.json.",
      inputSchema: {
        type: "object",
        properties: {
          environment: { type: "string" },
          file: { type: "string" },
        },
        required: ["environment", "file"],
      },
    },
    {
      name: "envault_env_unmap",
      description: "Remove an environment-to-file mapping from envault.json.",
      inputSchema: {
        type: "object",
        properties: {
          environment: { type: "string" },
        },
        required: ["environment"],
      },
    },
    {
      name: "envault_env_default",
      description: "Set the default environment in envault.json.",
      inputSchema: {
        type: "object",
        properties: {
          environment: { type: "string" },
        },
        required: ["environment"],
      },
    },
    {
      name: "envault_mcp_install",
      description:
        "Install MCP integration config for local workspace and/or global editor clients.",
      inputSchema: {
        type: "object",
        properties: {
          global: { type: "boolean", default: false },
          local: { type: "boolean", default: false },
        },
      },
    },
    {
      name: "envault_mcp_update",
      description:
        "Update MCP package/config for local workspace and/or global editor clients.",
      inputSchema: {
        type: "object",
        properties: {
          global: { type: "boolean", default: false },
          local: { type: "boolean", default: false },
          configOnly: { type: "boolean", default: false },
        },
      },
    },
    {
      name: "envault_sdk_install",
      description:
        "Install Envault TypeScript SDK either in current project, globally, or both.",
      inputSchema: {
        type: "object",
        properties: {
          global: { type: "boolean", default: false },
          local: { type: "boolean", default: false },
        },
      },
    },
    {
      name: "envault_sdk_update",
      description:
        "Update Envault TypeScript SDK either in current project, globally, or both.",
      inputSchema: {
        type: "object",
        properties: {
          global: { type: "boolean", default: false },
          local: { type: "boolean", default: false },
        },
      },
    },
    {
      name: "envault_doctor",
      description:
        "Run local diagnostics for CLI installation, Homebrew source, and version parity.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "envault_version",
      description: "Print installed Envault CLI version.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "envault_set_local_key",
      description:
        "Set/update a key=value in local env file. If autoPush=true, this triggers envault_push and may return pending HITL approval requiring browser approval.",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: { type: "string" },
          environment: { type: "string" },
          file: { type: "string" },
          autoPush: { type: "boolean", default: false },
        },
        required: ["key", "value"],
      },
    },
    {
      name: "envault_remove_local_key",
      description:
        "Remove a key from local env file. If autoPush=true, this triggers envault_push and may return pending HITL approval requiring browser approval.",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string" },
          environment: { type: "string" },
          file: { type: "string" },
          autoPush: { type: "boolean", default: false },
        },
        required: ["key"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const cwd = process.cwd();
  const config = await readEnvaultConfig(cwd);
  const standaloneToken = getStandaloneToken();

  if (name === "envault_status" || name === "envault_context") {
    if (standaloneToken) {
      const apiResult = await callEnvaultApi({
        pathName: "/api/cli/status",
        query: { projectId: args.projectId },
      });
      return toToolResponse(apiResult, !apiResult.ok);
    }

    const cliArgs = ["status"];
    pushOptionalFlag(cliArgs, "--project", args.projectId);
    const result = await runEnvault(cliArgs, cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_pull") {
    if (standaloneToken) {
      const projectId = resolveProjectId(args, config);
      if (!projectId) {
        return toToolResponse(
          { error: "projectId is required (or set projectId in envault.json) for standalone pull." },
          true,
        );
      }

      const environment = resolveEnvironment(args, config);
      const apiResult = await callEnvaultApi({
        pathName: `/api/cli/projects/${projectId}/secrets`,
        query: { environment },
      });

      if (!apiResult.ok) {
        return toToolResponse(apiResult, true);
      }

      const targetFile = resolveLocalEnvFile(config, environment, args.file);
      const absoluteTarget = path.join(cwd, targetFile);

      if (args.force === false) {
        try {
          const existing = await fs.readFile(absoluteTarget, "utf-8");
          if (existing.trim()) {
            return toToolResponse(
              {
                error: `Refusing to overwrite non-empty ${targetFile} without force=true.`,
                file: targetFile,
              },
              true,
            );
          }
        } catch {
          // file does not exist, safe to continue
        }
      }

      const secrets = Array.isArray(apiResult?.data?.secrets) ? apiResult.data.secrets : [];
      const envMap = new Map(secrets.map((s) => [s.key, s.value]));
      await fs.writeFile(absoluteTarget, toSortedEnvFile(envMap), "utf-8");

      return toToolResponse({
        ok: true,
        mode: "api",
        projectId,
        environment,
        file: targetFile,
        count: envMap.size,
      });
    }

    const cliArgs = ["pull"];
    pushProjectAndEnvironment(cliArgs, args);
    if (args.force !== false) cliArgs.push("--force");
    pushOptionalFlag(cliArgs, "--file", args.file);
    const result = await runEnvault(cliArgs, cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_push" || name === "envault_deploy") {
    if (standaloneToken) {
      const projectId = resolveProjectId(args, config);
      if (!projectId) {
        return toToolResponse(
          { error: "projectId is required (or set projectId in envault.json) for standalone push." },
          true,
        );
      }

      const environment = resolveEnvironment(args, config);
      const targetFile = resolveLocalEnvFile(config, environment, args.file);
      const absoluteTarget = path.join(cwd, targetFile);

      let content = "";
      try {
        content = await fs.readFile(absoluteTarget, "utf-8");
      } catch {
        return toToolResponse(
          { error: `Local env file not found: ${targetFile}` },
          true,
        );
      }

      const localMap = parseEnvFile(content);
      const secrets = [...localMap.entries()].map(([key, value]) => ({ key, value }));

      if (args.dryRun === true) {
        const remoteResult = await callEnvaultApi({
          pathName: `/api/cli/projects/${projectId}/secrets`,
          query: { environment },
        });

        if (!remoteResult.ok) {
          return toToolResponse(remoteResult, true);
        }

        const diff = buildDiff(localMap, remoteResult?.data?.secrets || []);
        return toToolResponse({
          ok: true,
          mode: "api",
          dryRun: true,
          projectId,
          environment,
          file: targetFile,
          localCount: localMap.size,
          diff,
        });
      }

      const apiResult = await callEnvaultApi({
        pathName: `/api/cli/projects/${projectId}/secrets`,
        method: "POST",
        query: { environment },
        body: { secrets },
      });

      return toToolResponse(apiResult, !apiResult.ok);
    }

    const cliArgs = ["push"];
    pushProjectAndEnvironment(cliArgs, args);
    if (args.force !== false) cliArgs.push("--force");
    if (args.dryRun === true) cliArgs.push("--dry-run");
    pushOptionalFlag(cliArgs, "--file", args.file);
    const result = await runEnvault(cliArgs, cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_approve") {
    const approvalId = typeof args.approvalId === "string" ? args.approvalId.trim() : "";
    if (!approvalId) {
      return toToolResponse({ error: "approvalId is required" }, true);
    }
    if (standaloneToken) {
      const apiResult = await callEnvaultApi({
        pathName: `/api/approve/${approvalId}`,
        method: "POST",
        body: { action: "approve" },
      });
      return toToolResponse(apiResult, !apiResult.ok);
    }

    const result = await runEnvault(["approve", approvalId], cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_diff") {
    if (standaloneToken) {
      const projectId = resolveProjectId(args, config);
      if (!projectId) {
        return toToolResponse(
          { error: "projectId is required (or set projectId in envault.json) for standalone diff." },
          true,
        );
      }

      const environment = resolveEnvironment(args, config);
      const targetFile = resolveLocalEnvFile(config, environment, args.file);
      const absoluteTarget = path.join(cwd, targetFile);

      let content = "";
      try {
        content = await fs.readFile(absoluteTarget, "utf-8");
      } catch {
        return toToolResponse({ error: `Local env file not found: ${targetFile}` }, true);
      }

      const localMap = parseEnvFile(content);
      const remoteResult = await callEnvaultApi({
        pathName: `/api/cli/projects/${projectId}/secrets`,
        query: { environment },
      });
      if (!remoteResult.ok) {
        return toToolResponse(remoteResult, true);
      }

      const diff = buildDiff(localMap, remoteResult?.data?.secrets || []);
      return toToolResponse({
        ok: true,
        mode: "api",
        projectId,
        environment,
        file: targetFile,
        localCount: localMap.size,
        remoteCount: Array.isArray(remoteResult?.data?.secrets)
          ? remoteResult.data.secrets.length
          : 0,
        diff,
      });
    }

    const cliArgs = ["diff"];
    pushProjectAndEnvironment(cliArgs, args);
    pushOptionalFlag(cliArgs, "--file", args.file);
    const result = await runEnvault(cliArgs, cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_run") {
    const command = isNonEmptyString(args.command) ? args.command.trim() : "";
    if (!command) {
      return toToolResponse({ error: "command is required" }, true);
    }

    const cliArgs = ["run"];
    pushProjectAndEnvironment(cliArgs, args);
    cliArgs.push("--", command);

    if (Array.isArray(args.args)) {
      for (const arg of args.args) {
        if (typeof arg === "string") {
          cliArgs.push(arg);
        }
      }
    }

    const result = await runEnvault(cliArgs, cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_login") {
    if (standaloneToken) {
      return toToolResponse({
        ok: true,
        mode: "api",
        message:
          "ENVAULT_TOKEN is configured; CLI login is not required for standalone MCP core tools.",
      });
    }

    const result = await runEnvault(["login"], cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_init") {
    const result = await runEnvault(["init"], cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_generate_hooks") {
    const result = await runEnvault(["generate-hooks"], cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_audit") {
    const cliArgs = ["audit"];
    if (args.strict === true) cliArgs.push("--strict");
    if (args.installHook === true) cliArgs.push("--install-hook");
    pushOptionalFlag(cliArgs, "--format", args.format);
    pushOptionalFlag(cliArgs, "--template", args.template);
    pushOptionalFlag(cliArgs, "--file", args.file);
    const result = await runEnvault(cliArgs, cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_env_map") {
    const environment = isNonEmptyString(args.environment) ? args.environment.trim() : "";
    const file = isNonEmptyString(args.file) ? args.file.trim() : "";
    if (!environment || !file) {
      return toToolResponse({ error: "environment and file are required" }, true);
    }
    const result = await runEnvault(["env", "map", "--env", environment, "--file", file], cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_env_unmap") {
    const environment = isNonEmptyString(args.environment) ? args.environment.trim() : "";
    if (!environment) {
      return toToolResponse({ error: "environment is required" }, true);
    }
    const result = await runEnvault(["env", "unmap", "--env", environment], cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_env_default") {
    const environment = isNonEmptyString(args.environment) ? args.environment.trim() : "";
    if (!environment) {
      return toToolResponse({ error: "environment is required" }, true);
    }
    const result = await runEnvault(["env", "default", "--env", environment], cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_mcp_install") {
    const cliArgs = ["mcp", "install"];
    if (args.global === true) cliArgs.push("--global");
    if (args.local === true) cliArgs.push("--local");
    const result = await runEnvault(cliArgs, cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_mcp_update") {
    const cliArgs = ["mcp", "update"];
    if (args.global === true) cliArgs.push("--global");
    if (args.local === true) cliArgs.push("--local");
    if (args.configOnly === true) cliArgs.push("--config-only");
    const result = await runEnvault(cliArgs, cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_sdk_install") {
    const cliArgs = ["sdk", "install"];
    if (args.global === true) cliArgs.push("--global");
    if (args.local === true) cliArgs.push("--local");
    const result = await runEnvault(cliArgs, cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_sdk_update") {
    const cliArgs = ["sdk", "update"];
    if (args.global === true) cliArgs.push("--global");
    if (args.local === true) cliArgs.push("--local");
    const result = await runEnvault(cliArgs, cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_doctor") {
    const result = await runEnvault(["doctor"], cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_version") {
    const result = await runEnvault(["version"], cwd);
    return toToolResponse(result, !result.ok);
  }

  if (name === "envault_set_local_key") {
    const key = typeof args.key === "string" ? args.key.trim() : "";
    const value = typeof args.value === "string" ? args.value : "";
    if (!key) {
      return toToolResponse({ error: "key is required" }, true);
    }

    const config = await readEnvaultConfig(cwd);
    const targetFile = resolveLocalEnvFile(config, args.environment, args.file);
    const absoluteTarget = path.join(cwd, targetFile);

    let before = "";
    try {
      before = await fs.readFile(absoluteTarget, "utf-8");
    } catch {
      before = "";
    }

    const after = upsertEnvLine(before, key, value);
    await fs.writeFile(absoluteTarget, after, "utf-8");

    const response = {
      updated: true,
      file: targetFile,
      key,
      value,
      autoPushed: false,
    };

    if (args.autoPush === true) {
      if (standaloneToken) {
        const projectId = resolveProjectId(args, config);
        if (!projectId) {
          return toToolResponse(
            {
              ...response,
              autoPushed: false,
              pushResult: {
                ok: false,
                error: "projectId is required (or set projectId in envault.json) for standalone autoPush.",
              },
            },
            true,
          );
        }

        const environment = resolveEnvironment(args, config);
        const localContent = await fs.readFile(absoluteTarget, "utf-8");
        const secrets = [...parseEnvFile(localContent).entries()].map(([k, v]) => ({ key: k, value: v }));
        const pushResult = await callEnvaultApi({
          pathName: `/api/cli/projects/${projectId}/secrets`,
          method: "POST",
          query: { environment },
          body: { secrets },
        });

        response.autoPushed = pushResult.ok;
        return toToolResponse({ ...response, pushResult }, !pushResult.ok);
      }

      const pushArgs = ["push", "--force"];
      if (typeof args.environment === "string" && args.environment.trim()) {
        pushArgs.push("--env", args.environment.trim());
      }
      pushArgs.push("--file", targetFile);
      const pushResult = await runEnvault(pushArgs, cwd);
      response.autoPushed = pushResult.ok;
      return toToolResponse({ ...response, pushResult }, !pushResult.ok);
    }

    return toToolResponse(response);
  }

  if (name === "envault_remove_local_key") {
    const key = typeof args.key === "string" ? args.key.trim() : "";
    if (!key) {
      return toToolResponse({ error: "key is required" }, true);
    }

    const config = await readEnvaultConfig(cwd);
    const targetFile = resolveLocalEnvFile(config, args.environment, args.file);
    const absoluteTarget = path.join(cwd, targetFile);

    let before = "";
    try {
      before = await fs.readFile(absoluteTarget, "utf-8");
    } catch {
      before = "";
    }

    const after = removeEnvLine(before, key);
    await fs.writeFile(absoluteTarget, after, "utf-8");

    const response = {
      removed: true,
      file: targetFile,
      key,
      autoPushed: false,
    };

    if (args.autoPush === true) {
      if (standaloneToken) {
        const projectId = resolveProjectId(args, config);
        if (!projectId) {
          return toToolResponse(
            {
              ...response,
              autoPushed: false,
              pushResult: {
                ok: false,
                error: "projectId is required (or set projectId in envault.json) for standalone autoPush.",
              },
            },
            true,
          );
        }

        const environment = resolveEnvironment(args, config);
        const localContent = await fs.readFile(absoluteTarget, "utf-8");
        const secrets = [...parseEnvFile(localContent).entries()].map(([k, v]) => ({ key: k, value: v }));
        const pushResult = await callEnvaultApi({
          pathName: `/api/cli/projects/${projectId}/secrets`,
          method: "POST",
          query: { environment },
          body: { secrets },
        });

        response.autoPushed = pushResult.ok;
        return toToolResponse({ ...response, pushResult }, !pushResult.ok);
      }

      const pushArgs = ["push", "--force"];
      if (typeof args.environment === "string" && args.environment.trim()) {
        pushArgs.push("--env", args.environment.trim());
      }
      pushArgs.push("--file", targetFile);
      const pushResult = await runEnvault(pushArgs, cwd);
      response.autoPushed = pushResult.ok;
      return toToolResponse({ ...response, pushResult }, !pushResult.ok);
    }

    return toToolResponse(response);
  }

  return toToolResponse({ error: `Unknown tool: ${name}` }, true);
});

async function main() {
  if (await handleMetadataCommand()) {
    return;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[envault-mcp-server] Fatal: ${message}\n`);
  process.exit(1);
});
