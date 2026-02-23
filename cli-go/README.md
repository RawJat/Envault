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
- 🔄 **Automatic Updates**: Non-blocking background checks to notify you when a new version is available.

## Installation

### macOS & Linux (Universal)

```bash
curl -fsSL https://raw.githubusercontent.com/DinanathDash/Envault/main/install.sh | sh
```

### macOS & Linux (Homebrew)

```bash
brew tap DinanathDash/envault
brew install envault
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

## Development

### Requirements

- Go 1.25+

### Build from Source

```bash
cd cli-go
go build -o envault
```

## License

MIT © [Envault](https://envault.tech)
