# Envault MCP Server

This MCP server exposes Envault read + mutation tooling for MCP clients (Claude Desktop, VS Code, etc).

## 0) Generate an `ENVAULT_TOKEN` (do this first)

The MCP registry is a static phonebook. There is no onboarding UX and no safety net. If you skip this step, the server will start but every tool call will fail with `401 Unauthorized`.

1. Sign in to Envault.
2. Open **Account Settings** → **Security**.
3. Create a new **MCP Token**.
4. Copy the **full unmasked token value** (you won’t be able to see it again).
5. Use it as `ENVAULT_TOKEN` in your MCP client config (examples below).

Notes:
- Cloud `ENVAULT_BASE_URL` is `https://www.envault.tech` (recommended default).
- If you rotate/revoke the token, you must update the MCP config and fully restart your MCP client.

## 1) Configure your MCP client (copy/paste)

### Claude Desktop (`claude_desktop_config.json`)

Use `npx -y @dinanathdash/envault-mcp-server@latest`:

```json
{
  "mcpServers": {
    "envault": {
      "command": "npx",
      "args": ["-y", "@dinanathdash/envault-mcp-server@latest"],
      "env": {
        "ENVAULT_TOKEN": "envault_at_REPLACE_ME",
        "ENVAULT_BASE_URL": "https://www.envault.tech"
      }
    }
  }
}
```

### VS Code (`.vscode/mcp.json`)

```json
{
  "servers": {
    "envault": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@dinanathdash/envault-mcp-server@latest"],
      "env": {
        "ENVAULT_TOKEN": "envault_at_REPLACE_ME",
        "ENVAULT_BASE_URL": "https://www.envault.tech"
      }
    }
  },
  "inputs": []
}
```

Troubleshooting:
- `spawn npx ENOENT` in GUI apps usually means your GUI PATH is incomplete. Use an absolute `npx` path (or `npx.cmd` on Windows).
- `401 Unauthorized` almost always means `ENVAULT_TOKEN` is missing/expired/revoked/masked or `ENVAULT_BASE_URL` doesn’t match where the token was issued.

## Security model (HITL is non-bypassable)

- `ENVAULT_TOKEN` is only used to mint a short-lived delegated `envault_agt_...` agent token.
- All mutation tools (`envault_push`, `envault_deploy`, and `autoPush` flows) go through the HITL pipeline (`/api/sdk/secrets`) and return a pending approval (`202` with `approval_id`/`approval_url`).
- No secrets are written until a human approves via `envault_approve` (or the dashboard approval UI).

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

2. Configure standalone MCP auth:

```bash
export ENVAULT_TOKEN=envault_at_xxx
export ENVAULT_BASE_URL=https://www.envault.tech
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

See the copy/paste configs at the top of this README.

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
