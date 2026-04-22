# Envault MCP Server Contributing Guidelines

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
- Official MCP Registry publication is automated via `.github/workflows/publish-registry.yml` using GitHub OIDC.
- Registry metadata is sourced from repository root `server.json`; workflow syncs published npm version into that file payload before publish.
