import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? "portless.cmd" : "portless";
const args = ["run", "--name", "envault", "next", "dev", "--turbo"];

const child = spawn(command, args, {
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    PORTLESS_HTTPS: "1",
  },
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
  process.exit(code ?? 0);
});
