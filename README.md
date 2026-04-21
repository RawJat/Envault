# Envault

**Envault** is a secure, modern vault application built with Next.js, Supabase, and Tailwind CSS. It provides a robust authentication system and a sleek user interface for storing and managing sensitive information.

## Features

- **Bank-Grade Security**: AES-256-GCM encryption with master/data key hierarchy and automatic key rotation.
- **Project Workspaces**: Organize secrets into distinct projects for better management.
- **Semantic Routing**: Clean, GitHub-style URLs (`/[username]/[project-slug]`) for easy sharing and navigation.
- **Team Collaboration**: Secure project sharing with strict Role-Based Access Control:
  - _Owner_: Full administrative control (Rename, Delete, Manage Team).
  - _Editor_: Active contributor (Read/Write secrets, request to Share).
  - _Viewer_: Read-only access to variables.
- **Secure Authentication**: Powered by Supabase Auth for robust user management, including **Passkey** support for passwordless, biometric login.
- **Modern UI/UX**: Built with Tailwind CSS, Shadcn UI, and Framer Motion for a premium experience.
- **Interactive 3D Elements**: High-performance 3D visuals powered by React Three Fiber.
- **Keyboard First**: Navigate efficiently with fully customizable, conflict-free hotkeys.
- **Responsive Design**: Fully responsive layout that works seamlessly on desktop and mobile.
- **Dark Mode Support**: Built-in support for light and dark themes.
- **CLI Support**: Manage your secrets directly from your terminal, featuring automatic non-blocking background update checks.
- **Native Vercel Integration**: Link Vercel projects, map environments, and sync secrets directly into Vercel env storage for serverless runtime compatibility.
- **Real-time System Status**: Monitor system health, active incidents, and historical uptime with a dedicated status page.
- **Dedicated Support Page**: Integrated support features directly within the app to help users manage troubleshooting options efficiently.
- **Comprehensive Documentation**: Integrated docs site with guides, API reference, and CLI documentation.

## CLI

Envault natively supports the Model Context Protocol (MCP), so AI coding assistants like Claude Desktop, Cursor, and RooCode/Cline can pull and push your secure environments effortlessly. 

```bash
# Automatically configure your AI clients (Global & Local Workspaces)
envault mcp install

# Or install strictly for the current workspace
envault mcp install --local
```

### Installation

**macOS & Linux (Universal)**

```bash
curl -fsSL https://raw.githubusercontent.com/DinanathDash/Envault/main/install.sh | sh
```

**macOS (Homebrew)**

```bash
brew tap DinanathDash/envault
brew install --formula envault
```

Homebrew cask installs are deprecated. If you installed via cask, migrate with:

```bash
brew uninstall --cask dinanathdash/envault/envault
brew install --formula envault
```

For more details, check out the [CLI Documentation](./cli-go/README.md).

### Local Testing

Envault local development now uses `portless` with HTTPS hostnames.

```bash
npm install -g portless
```

To use the Envault CLI with the local development server, set the `ENVAULT_CLI_URL` environment variable:

```bash
export ENVAULT_CLI_URL="https://envault.localhost:1355/api/cli"
envault login
```

For one-command `envault run` local app startup, prefer hosted API fetch-first behavior by not setting `ENVAULT_CLI_URL`/`ENVAULT_BASE_URL`.

## Security Architecture

Envault uses a hybrid encryption model to ensure maximum security:

1.  **Master Key**: A 32-byte key stored in environment variables, used solely to encrypt/decrypt Data Keys.
2.  **Data Keys**: Unique keys for encrypting actual data. These are stored encrypted in the database.
3.  **Key Rotation**: Data keys can be rotated. The active key is cached in Redis for high performance without compromising security.
4.  **AES-256-GCM**: Industry-standard authenticated encryption for all secrets.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **KV Store**: [Upstash Redis](https://upstash.com/)
- **Documentation**: [Fumadocs](https://www.fumadocs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) / [Radix UI](https://www.radix-ui.com/)
- **3D & Graphics**: [React Three Fiber](https://r3f.docs.pmnd.rs/) / [Three.js](https://threejs.org/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)
- **Analytics**: [Vercel Analytics](https://vercel.com/analytics)

## Getting Started

Follow these steps to get the project running locally.

### Prerequisites

- Node.js 18+ installed
- A Supabase project set up

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/dinanathdash/envault.git
    cd envault
    ```

2.  **Install dependencies**

    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3.  **Environment Setup**

    Copy the example environment file:

    ```bash
    cp .env.example .env.local
    ```

    Open `.env.local` and add your Supabase credentials:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

    # Generate a secure key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ENCRYPTION_KEY=your-64-char-hex-key

    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

    UPSTASH_REDIS_REST_URL=your-upstash-url
    UPSTASH_REDIS_REST_TOKEN=your-upstash-token

    # Used for securely signing and verifying frontend API mutations (POST, PUT, DELETE, PATCH)
    NEXT_PUBLIC_API_SIGNATURE_SALT=your-secure-random-hmac-secret

    ```

4.  **Run the development server**

    ```bash
    npm run dev
    ```

    Open [https://envault.localhost:1355](https://envault.localhost:1355) with your browser to see the result.

### Optional: Native Vercel Integration Setup

If you plan to use native Vercel sync (recommended for Vercel serverless runtimes), add these variables:

```env
VERCEL_CLIENT_ID=your_vercel_oauth_client_id
VERCEL_CLIENT_SECRET=your_vercel_oauth_client_secret
VERCEL_REDIRECT_URI=https://your-domain.com/api/integrations/vercel/callback
VERCEL_WEBHOOK_SECRET=your_vercel_webhook_signing_secret
NEXT_PUBLIC_VERCEL_INTEGRATION_INSTALL_URL=https://vercel.com/<team-or-user>/~/integrations/envault
```

Use production URLs in production. Do not use ngrok or localhost callback URLs outside local development.

5.  **Test Email Configuration (Optional)**

    To verify that your Resend API configuration is working, you can send a test email to yourself:

    ```bash
    npm run test:email -- your-email@example.com
    ```

## Monorepo Setup Map

This repository contains multiple publishable/runtime components. Use this map when cloning and contributing.

| Folder | Purpose | Install | Common Commands |
|---|---|---|---|
| `./` | Main Next.js app | `npm install` | `npm run dev`, `npm run build`, `npm run lint`, `npm run test:all` |
| `cli-go/` | Go CLI (`envault`) | `go mod download` | `go test ./...`, `go build ./...` |
| `src/lib/sdk/` | npm SDK package (`@dinanathdash/envault-sdk`) | `npm install` | `npm run typecheck`, `npm run build` |
| `mcp-server/` | npm MCP package (`@dinanathdash/envault-mcp-server`) | `npm install` | `npm run check`, `npm start` |
| `cli-wrapper/` | npm wrapper for CLI install/bootstrap | `npm install` | `node install.js` |

### First-time contributor flow

1. Clone and install root dependencies:

```bash
git clone https://github.com/dinanathdash/envault.git
cd envault
npm install
```

2. Copy env file and configure required keys:

```bash
cp .env.example .env.local
```

3. Install package-local dependencies for publishable subpackages:

```bash
cd src/lib/sdk && npm install
cd ../../.. && cd mcp-server && npm install
cd ..
```

4. Validate everything in one pass:

```bash
npm run lint
npm run test:all
npm run build
```

## Package Publishing + Workflows

### npm packages

- SDK: `@dinanathdash/envault-sdk` (source: `src/lib/sdk/`)
- MCP: `@dinanathdash/envault-mcp-server` (source: `mcp-server/`)

### GitHub Actions workflows

- CLI release workflow: `.github/workflows/publish.yml`
- SDK publish workflow: `.github/workflows/publish-sdk.yml`
- MCP publish workflow: `.github/workflows/publish-mcp.yml`

Each package versions independently via semantic-release when changes occur in its own folder:

- CLI tags: `v<version>`
- SDK tags: `sdk-v<version>`
- MCP tags: `mcp-v<version>`

This keeps SDK and MCP release streams decoupled from CLI version bumps.

### Local prepublish checks

```bash
npm run sdk:check
npm run mcp:check
```

### Manual publish commands

```bash
npm run sdk:publish
npm run mcp:publish
```

## Version and Update Commands

Use these commands so users can quickly verify what version they are on and update safely.

### CLI (`envault`)

Check installed CLI version:

```bash
envault --version
```

Update via Homebrew formula:

```bash
brew update
brew untap dinanathdash/envault || true
brew tap dinanathdash/envault
brew upgrade --formula envault
```

### SDK (`@dinanathdash/envault-sdk`)

Check installed and latest SDK versions:

```bash
npm ls @dinanathdash/envault-sdk
npm view @dinanathdash/envault-sdk version
```

Update SDK (preferred via Envault CLI):

```bash
envault sdk update
```

Update SDK (npm fallback):

```bash
npm install @dinanathdash/envault-sdk@latest
```

Runtime behavior:
- SDK prints a warning when a newer SDK version exists.
- SDK blocks execution when below minimum supported version configured by server.

### MCP (`@dinanathdash/envault-mcp-server`)

Check installed MCP version (standalone MCP package installs):

```bash
envault-mcp-server --version
```

Check MCP update availability (standalone MCP package installs):

```bash
envault-mcp-server --check-update
```

Update MCP integration (preferred via Envault CLI):

```bash
envault mcp update
```

Update MCP globally (npm fallback for standalone installs):

```bash
npm install -g @dinanathdash/envault-mcp-server@latest
```

## License

Copyright (c) 2026 Dinanath Dash. All Rights Reserved.

The source code is provided strictly for transparency, security auditing, and education. This is not open-source software.

You may inspect and analyze the code for security purposes. You may not execute, compile, run, deploy, copy, modify, fork, redistribute, sublicense, or provide any service using this code without prior explicit written permission.

See the [LICENSE](LICENSE) file for the complete legal terms.
