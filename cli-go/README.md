# Envault CLI (Go)

<p align="center">
  <b>High-Performance, Secure Environment Variable Management</b>
</p>

<p align="center">
  Securely push, pull, and manage your secrets directly from your terminal with a single binary.
</p>

---

## Why Go?

The Envault CLI has been rewritten in Go to provide:

- 🚀 **Zero Dependencies**: No more Node.js runtime required.
- ⚡ **Instant Execution**: Faster startup and command execution.
- 📦 **Single Binary**: Easy installation via Homebrew or direct download.

## Features

- 🔒 **End-to-End Encryption**: Secrets are encrypted locally before being pushed.
- 🔑 **Device Flow Authentication**: Secure, browser-based login mechanism.
- 🛡️ **Role-Based Access**: Verifies permissions (Editor/Viewer) for all operations.
- 🚥 **Graceful Interrupts**: Cleanly handles `Ctrl+C` in all interactive flows.
- 📁 **Auto-Linking**: Automatically triggers project initialization if no project is linked.
- 🚨 **Automatic Git Hygiene**: `init`/`pull` install a pre-commit hook (envault audit) and `pull`/`deploy` will refuse to run on git-tracked `.env` files, auto-updating `.gitignore` when appropriate.
- 🔄 **Automatic Updates**: Non-blocking background checks to notify you when a new version is available.

## Installation

### macOS & Linux (Universal)

```bash
curl -fsSL https://raw.githubusercontent.com/DinanathDash/Envault/main/install.sh | sh
```

### macOS & Linux (Homebrew)

```bash
brew tap DinanathDash/envault
brew install --formula envault
```

Homebrew cask installs are deprecated. If you previously installed with cask, migrate to formula:

```bash
brew uninstall --cask dinanathdash/envault/envault
brew install --formula envault
```

If Homebrew still resolves an older version, refresh metadata and upgrade explicitly:

```bash
brew update
brew untap dinanathdash/envault || true
brew tap dinanathdash/envault
brew upgrade --formula envault
```

### Via NPM (Backward Compatible Wrapper)

```bash
npm install -g @dinanathdash/envault
```

## Quick Start

1. **Login**
   ```bash
   envault login
   ```
2. **Initialize Project**
   ```bash
   envault init
   ```
3. **Deploy Secrets**
   ```bash
   envault deploy
   ```
4. **Pull Secrets**
   ```bash
   envault pull
   ```

## Runtime Injection Strategy

Envault supports two complementary patterns. Use them intentionally:

1. `envault run` (fetch-first, process env injection)
   - Best for CI/CD, builds, and deterministic startup.
   - Flow: resolve project/environment from `envault.json` -> fetch/decrypt secrets -> start command.
   - This is the default and recommended path for pipelines.

2. Runtime SDK reads (live reads while app is running)
   - Best only for secrets that must rotate without process restart.
   - App fetches selected secrets at request/runtime with cache + retry policy.
   - Do not use this for every variable unless you explicitly want network-dependent runtime behavior.

### Local Dev Patterns

- One-command dev (recommended):
  - Use hosted API (do not set `ENVAULT_BASE_URL` / `ENVAULT_CLI_URL`).
  - `envault run --env development -- npm run dev`

- Local API testing:
  - If `ENVAULT_BASE_URL` points to local portless URL, start local server first in one terminal.
  - Then run `envault run` in another terminal.
  - Reason: process env injection happens before command start; an already-running process cannot be retro-injected.

### Git Hooks Setup

A common point of friction in development is pulling down the latest code but forgetting to sync environment variables. You can seamlessly bind Envault to Git operations by running:

```bash
envault generate-hooks
```

This command automatically creates an executable `post-merge` hook in your `.git/hooks/` directory. Whenever you run a `git pull` that merges new commits, this script triggers and safely executes `envault pull` to ensure your local secrets are in sync. If you uninstall `envault`, the hook safely skips the operation without breaking your git workflows.

## Development

### Requirements

- Go 1.25+

### Build from Source

```bash
cd cli-go
go build -o envault
```

## License

Copyright (c) 2026 Dinanath Dash. All Rights Reserved.

Use is governed by the repository [LICENSE](../LICENSE).
