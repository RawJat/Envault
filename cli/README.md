# Envault CLI

<p align="center">
  <b>Secure Environment Variable Management for Modern Teams</b>
</p>

<p align="center">
  Securely push, pull, and manage your secrets directly from your terminal with the same ease as `git push`.
</p>

---

## Features

- 🔒 **End-to-End Encryption**: Secrets are encrypted before they leave your machine.
- 🔑 **Device Flow Authentication**: Secure, browser-based login mechanism.
- 🛡️ **Role-Based Access**: Enforces project permissions (Editor/Viewer) on deploy and pull operations.
- 🚀 **Zero-Config**: Works with your existing `.env` files.
- ⚡ **Framework Agnostic**: Works with Next.js, Node.js, Python, Go, etc.

## Installation

You can run Envault directly using `npx` (recommended) or install it globally.

### Using Number (Zero Install)
```bash
npx @dinanathdash/envault login
```

### Global Install
```bash
npm install -g @dinanathdash/envault
```

## Quick Start

### 1. Login
Authenticate your machine securely.
```bash
envault login
```

### 2. Initialize Project
Link your current folder to an Envault project.
```bash
envault init
```

### 3. Deploy Secrets
Push your local `.env` variables to the secure cloud vault.
```bash
envault deploy
```

### 4. Pull Secrets
Fetch the latest secrets from the cloud and update your `.env` file.
```bash
envault pull
```

## License

MIT © [Envault](https://envault.tech)
