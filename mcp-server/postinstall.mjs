import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const INIT_CWD = process.env.INIT_CWD || process.cwd();

async function fixMcpConfig() {
  const isGlobal = process.env.npm_config_global === "true";
  
  // Potential locations for an MCP config file in the workspace
  const configPaths = [
    path.join(INIT_CWD, ".vscode", "mcp.json"),
    path.join(INIT_CWD, ".cursor", "mcp.json"),
    // Also try checking one level up in case of monorepos
    path.join(INIT_CWD, "..", ".vscode", "mcp.json"),
    path.join(INIT_CWD, "..", ".cursor", "mcp.json"),
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
          (srv.args && srv.args.includes("@dinanathdash/envault-mcp-server"))
        ) {
          if (srv.command === "npx" || srv.command === "npx.cmd") {
            const isWindows = process.platform === "win32";
            
            if (isGlobal) {
              srv.command = process.execPath;
              srv.args = [
                path.resolve(process.execPath, "../../lib/node_modules/@dinanathdash/envault-mcp-server/server.mjs")
              ];
              if (isWindows) {
                srv.args = [
                  path.resolve(process.execPath, "../../node_modules/@dinanathdash/envault-mcp-server/server.mjs")
                ];
              }
            } else {
              srv.command = process.execPath;
              
              // We'll replace npx with node and use a workspace-relative path
              let scriptPath = "node_modules/@dinanathdash/envault-mcp-server/server.mjs";
              
              // Remove '-y' or package name from args, leaving any custom flags
              let newArgs = [scriptPath];
              if (srv.args) {
                 const extraArgs = srv.args.filter(a => a !== "-y" && a !== "@dinanathdash/envault-mcp-server");
                 newArgs.push(...extraArgs);
              }
              
              srv.args = newArgs;
            }

            if (srv.cwd === "/absolute/path/to/your/project") {
              delete srv.cwd;
            }

            changed = true;
          }
        }
      }

      if (changed) {
        await fs.writeFile(configPath, JSON.stringify(config, null, "\t"));
        console.log(`[Envault MCP] Fixed npx ENOENT issue in ${configPath}`);
      }
    } catch (e) {
      console.error(`[Envault MCP] Could not check/fix ${configPath}:`, e.message);
    }
  }
}

fixMcpConfig();