import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const PACKAGE_NAME = "@dinanathdash/envault-mcp-server";
const PACKAGE_SPEC = `${PACKAGE_NAME}@latest`;

export async function fixMcpConfig(options = {}) {
  const initCwd = options.initCwd || process.env.INIT_CWD || process.cwd();
  const platform = options.platform || process.env.ENVAULT_TEST_PLATFORM || process.platform;
  const log = options.log || console.log;
  const warn = options.warn || console.error;

  // Potential locations for an MCP config file in the workspace
  const configPaths = [
    path.join(initCwd, ".vscode", "mcp.json"),
    path.join(initCwd, ".cursor", "mcp.json"),
    // Also try checking one level up in case of monorepos
    path.join(initCwd, "..", ".vscode", "mcp.json"),
    path.join(initCwd, "..", ".cursor", "mcp.json"),
  ];

  for (const configPath of configPaths) {
    try {
      const stat = await fs.stat(configPath).catch(() => null);
      if (!stat) continue;

      const raw = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(raw);
      let changed = false;

      // Copilot / VS Code typically uses "servers", Claude uses "mcpServers"
      const serversObj = config.servers || config.mcpServers;
      if (!serversObj) continue;

      for (const [key, srv] of Object.entries(serversObj)) {
        if (
          key.includes("envault") || 
          (Array.isArray(srv.args) && srv.args.some((a) => String(a).includes(PACKAGE_NAME)))
        ) {
          // Keep npx launch to let npm resolve/download the package reliably.
          const isWindows = platform === "win32";
          const desiredCommand = isWindows ? "npx.cmd" : "npx";
          const currentArgs = Array.isArray(srv.args) ? srv.args.map((a) => String(a)) : [];
          const extraArgs = currentArgs.filter(
            (a) =>
              a !== "-y" &&
              a !== PACKAGE_NAME &&
              a !== PACKAGE_SPEC &&
              !a.includes(`${PACKAGE_NAME}/server.mjs`) &&
              !a.includes("node_modules/@dinanathdash/envault-mcp-server/server.mjs"),
          );

          const newArgs = ["-y", PACKAGE_SPEC, ...extraArgs];
          if (srv.command !== desiredCommand) {
            srv.command = desiredCommand;
            changed = true;
          }
          if (JSON.stringify(currentArgs) !== JSON.stringify(newArgs)) {
            srv.args = newArgs;
            changed = true;
          }
          if (srv.type !== "stdio" && config.servers) {
            srv.type = "stdio";
            changed = true;
          }

          if (srv.cwd === "/absolute/path/to/your/project") {
            delete srv.cwd;
            changed = true;
          }
        }
      }

      if (changed) {
        await fs.writeFile(configPath, JSON.stringify(config, null, "\t"));
        log(`[Envault MCP] Fixed npx ENOENT issue in ${configPath}`);
      }
    } catch (e) {
      warn(`[Envault MCP] Could not check/fix ${configPath}:`, e.message);
    }
  }
}

const isEntrypoint = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
  : false;

if (isEntrypoint) {
  fixMcpConfig();
}
