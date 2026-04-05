# Envault MCP Server

This MCP server exposes direct Envault operations so blank chats can call tools immediately instead of exploring repo files.

## Tools

- `envault_status`
- `envault_context`
- `envault_pull`
- `envault_push`
- `envault_deploy`
- `envault_approve`
- `envault_diff`
- `envault_run`
- `envault_login`
- `envault_init`
- `envault_generate_hooks`
- `envault_audit`
- `envault_env_map`
- `envault_env_unmap`
- `envault_env_default`
- `envault_mcp_install`
- `envault_mcp_update`
- `envault_sdk_install`
- `envault_sdk_update`
- `envault_doctor`
- `envault_version`
- `envault_set_local_key`
- `envault_remove_local_key`

## Local setup

1. Install dependencies:

```bash
cd mcp-server
npm install
```

2. Configure standalone MCP auth (recommended):

```bash
export ENVAULT_TOKEN=envault_at_xxx
# Optional override for self-hosted/staging
# export ENVAULT_BASE_URL=https://envault.tech
```

3. Optional: install/authenticate Envault CLI if you want CLI-dependent tools (`envault_run`, `envault_login`, `envault_init`, `envault_generate_hooks`, `envault_audit`, `envault_env_*`, `envault_mcp_*`, `envault_sdk_*`, `envault_doctor`, `envault_version`):

```bash
envault login
envault status
```

4. Start server:

```bash
npm start
```

Core tools work without CLI when `ENVAULT_TOKEN` is set: `envault_status`, `envault_context`, `envault_pull`, `envault_push`, `envault_deploy`, `envault_approve`, `envault_diff`, plus `autoPush` for local key set/remove helpers.

## Version and update commands

Check installed MCP server version:

```bash
envault-mcp-server --version
# or inside this folder
npm run version
```

Check whether an npm update is available:

```bash
envault-mcp-server --check-update
# or inside this folder
npm run check:update
```

Update to latest package version:

```bash
# Preferred (updates generated MCP configs to latest runtime setup)
envault mcp update

# npm fallback for standalone global package installs
npm install -g @dinanathdash/envault-mcp-server@latest
```

## Installation options for end users

You have 3 practical distribution models:

1. Local path (no publish required)
- Ship this repo (or this folder) and point MCP client to local file path.

2. npm package (recommended for broad adoption)
- Publish this package and let users configure MCP with `npx`.
- This is the simplest install UX for most LLM clients.

3. Source install from GitHub
- Users clone repo and run from local checkout.

### Recommended MCP config after npm publish

If you configure globally (`envault mcp install`):

```json
{
  "mcpServers": {
    "envault": {
      "command": "npx",
      "args": ["-y", "@dinanathdash/envault-mcp-server@latest"],
      "env": {
        "ENVAULT_TOKEN": "<YOUR_ENVAULT_TOKEN>",
        "ENVAULT_BASE_URL": "https://www.envault.tech"
      }
    }
  }
}
```

For VS Code MCP (`.vscode/mcp.json`), use `servers` schema:

```json
{
  "servers": {
    "envault": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@dinanathdash/envault-mcp-server@latest"],
      "env": {
        "ENVAULT_TOKEN": "<YOUR_ENVAULT_TOKEN>",
        "ENVAULT_BASE_URL": "https://www.envault.tech"
      }
    }
  },
  "inputs": []
}
```

*Note: If you encounter an `ENOENT` error (e.g. `spawn npx ENOENT` or `spawn envault-mcp-server ENOENT`) in GUI applications like VS Code or Claude Desktop, this means your system PATH isn't fully loaded. To fix this, use the absolute path to the executable (e.g. `/path/to/global/node_modules/bin/envault-mcp-server` or `npx.cmd` on Windows).*

*If you see `401 Unauthorized` in standalone mode, verify `ENVAULT_TOKEN` is a fresh full token and set `ENVAULT_BASE_URL` to the canonical cloud host `https://www.envault.tech`. After editing MCP config env values, fully restart the MCP server (or reload the IDE window) so the new env is picked up.*

If you install locally in a workspace (`npm install @dinanathdash/envault-mcp-server`):

```json
{
  "mcpServers": {
    "envault": {
      "command": "node",
      "args": [
        "node_modules/@dinanathdash/envault-mcp-server/server.mjs"
      ]
    }
  }
}
```

### Using `npx` (Requires Shell PATH)

```json
{
  "mcpServers": {
    "envault": {
      "command": "npx",
      "args": ["-y", "@dinanathdash/envault-mcp-server"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```
*Note: Using `npx` directly in MCP configuration often fails on Windows (requires `npx.cmd`) and macOS GUI apps due to missing shell environment variables.*

### MCP config for local repo path

```json
{
  "mcpServers": {
    "envault": {
      "command": "node",
      "args": ["/absolute/path/to/Envault/mcp-server/server.mjs"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

## Publishing workflow

If you decide to publish on npm:

1. Create npm org/package name you want to keep long-term.
2. Verify package metadata in [mcp-server/package.json](mcp-server/package.json).
3. Run:

```bash
cd mcp-server
npm install
npm run check
npm publish --access public
```

4. Update docs/examples to your final package name if it changes.

## Release alignment (SDK + MCP)

- SDK package: `@dinanathdash/envault-sdk`
- MCP package: `@dinanathdash/envault-mcp-server`

Suggested publish sequence:

1. Publish SDK from [src/lib/sdk/package.json](src/lib/sdk/package.json).
2. Publish MCP from [mcp-server/package.json](mcp-server/package.json).
3. Verify both install paths using `npm view` and a fresh `npx` call.

Notes:
- npm is not the only option, but it is the lowest-friction default for MCP users.
- You can also keep this private/internal and distribute via local path configs.

Release note:
- Package versioning and npm publication are managed by semantic-release workflows.

## Behavior

- For "set key" workflows, use `envault_set_local_key` then `envault_push` (or set `autoPush=true`).
- Approval workflows are fully inline using `envault_approve`.
- Local env file resolution reads `envault.json` mappings and default environment.
