import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter } from "node:path";
import { fileURLToPath } from "node:url";

const isWindows = process.platform === "win32";
const command = process.execPath;
const portlessCli = fileURLToPath(new URL("../node_modules/portless/dist/cli.js", import.meta.url));
const args = [portlessCli, "run", "--name", "envault", "next", "start"];

function buildNodeOptions() {
  const existing = process.env.NODE_OPTIONS?.trim() ?? "";
  return existing.includes("--disable-warning=DEP0190")
    ? existing
    : `${existing}${existing ? " " : ""}--disable-warning=DEP0190`;
}

function buildEnv() {
  const env = {
    ...process.env,
    PORTLESS_HTTPS: "1",
    NODE_OPTIONS: buildNodeOptions(),
  };

  if (!isWindows) {
    return env;
  }

  const pathValue = env.Path ?? env.PATH ?? "";
  const candidates = [
    "C:\\Program Files\\Git\\usr\\bin",
    "C:\\Program Files\\OpenSSL-Win64\\bin",
    "C:\\Program Files\\OpenSSL-Win32\\bin",
    "C:\\OpenSSL-Win64\\bin",
    "C:\\OpenSSL-Win32\\bin",
  ];

  const extraPaths = candidates.filter((p) => existsSync(p));
  const mergedPath = extraPaths.length
    ? `${pathValue}${pathValue ? delimiter : ""}${extraPaths.join(delimiter)}`
    : pathValue;

  return {
    ...env,
    PATH: mergedPath,
    Path: mergedPath,
  };
}

const child = spawn(command, args, {
  stdio: "inherit",
  env: buildEnv(),
});

child.on("error", (error) => {
  if ((error && error.code) === "ENOENT") {
    console.error("Failed to start server: 'portless' was not found.");
    console.error("Install dependencies and retry:");
    console.error("  npm install");
    process.exit(1);
  }

  console.error("Failed to start server:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
