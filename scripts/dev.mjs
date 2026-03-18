import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter } from "node:path";

const isWindows = process.platform === "win32";
const command = "portless";
const args = ["run", "--name", "envault", "next", "dev", "--turbo"];

function buildEnv() {
  const env = {
    ...process.env,
    // HTTPS is required for local dev.
    PORTLESS_HTTPS: "1",
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
  // On Windows, portless is exposed as a .cmd shim which requires a shell.
  shell: isWindows,
  env: buildEnv(),
});

child.on("error", (error) => {
  if ((error && error.code) === "ENOENT") {
    console.error("Failed to start dev server: 'portless' was not found.");
    console.error("Install it globally and retry:");
    console.error("  npm install -g portless");
    process.exit(1);
  }

  console.error("Failed to start dev server:", error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  if (isWindows && code && code !== 0) {
    console.error("Hint: Envault dev requires HTTPS and OpenSSL.");
    console.error("If startup fails with 'openssl ... ENOENT', install OpenSSL and ensure 'openssl' is on PATH.");
    console.error("Common options:");
    console.error("  winget install --id ShiningLight.OpenSSL.Light -e");
    console.error("  choco install openssl");
  }

  process.exit(code ?? 0);
});
