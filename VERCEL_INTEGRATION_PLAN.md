# Vercel Integration: Execution Plan

This document outlines the architecture, progress, and upcoming roadmap for building the native Envault ↔ Vercel integration.

---

## 1. The Core Issue (Why we are building this)
**The Build-Wrapper Paradox on Serverless**
Initially, we attempted to use the Envault CLI (`envault run`) as a build wrapper in Vercel. However, Serverless architectures (like Vercel and Cloudflare) spin up isolated worker functions at runtime. Variables injected into the build process do not reliably persist into the ephemeral runtime environment. 

This resulted in production crashes (e.g., `500 Internal Server Error` due to missing Redis credentials) because the Vercel serverless functions could not access the environment variables.

**The Solution:** 
Instead of a runtime wrapper, we must build a **Native Integration**. This integration will automatically push plaintext environment variables directly into Vercel's Project Settings via their REST API, ensuring Next.js serverless functions natively inherit the variables exactly as Vercel intended.

---

## 2. Current Progress (What we've done)
- [x] **CLI Stabilization:** Fixed decryption fallbacks in `v1.36.1` to ensure the core AES-GCM engine is bulletproof.
- [x] **Deployment Scripts:** Reverted `package.json` to standard Next.js build scripts to unblock Vercel deployments.
- [x] **Documentation Warning:** Updated CI/CD documentation to explicitly warn users against using `envault run` for Serverless runtimes.
- [x] **Legal Compliance:** Created and linked the End User License Agreement (EULA) required by Vercel.
- [x] **Vercel Registration:** Successfully registered the "Envault" private integration on the Vercel marketplace.

---

## 3. Next Steps (What we need to build)

### Phase 1: Database Architecture (Supabase Schema)
We need a place to securely store the Vercel OAuth tokens and project mappings.
- **`vercel_installations` table:** Stores `configuration_id`, `vercel_team_id`, `access_token` (encrypted), and `status`.
- **`vercel_project_links` table:** Maps an `envault_project_id` to a `vercel_project_id`.

### Phase 2: OAuth Auth Flow (`/api/integrations/vercel/callback`)
When a user clicks "Add Integration" in Vercel:
1. Vercel redirects them to our callback URL with an OAuth `code`.
2. Our API trades the `code` for an `access_token` using the Vercel API.
3. We store the `access_token` securely in our database.
4. We redirect the user to the Configuration UI.

### Phase 3: Configuration & Mapping UI
We need a UI component (e.g., `/dashboard/projects/[id]/settings/integrations`) where users can:
- View their linked Vercel accounts.
- Select a specific Vercel project from a dropdown (fetched via Vercel API).
- Map Envault Environments (e.g., `Development`, `Production`) to Vercel Targets (`development`, `preview`, `production`).

### Phase 4: The Sync Engine (Handling E2E Encryption)
**The Architectural Challenge:** Envault is zero-knowledge (End-to-End Encrypted). The server database only holds *ciphertexts*. Vercel requires *plaintexts*.
**The Implementation:**
1. When a user creates/updates a secret in the Envault Dashboard or CLI, they temporarily possess the decrypted plaintext in local memory.
2. We will create a new API endpoint: `POST /api/integrations/vercel/sync`.
3. The client (Dashboard/CLI) will send the *plaintext* payload securely over HTTPS directly to this sync endpoint.
4. The sync endpoint immediately iterates over the payload and pushes the variables to `https://api.vercel.com/v9/projects/{id}/env` using the stored Vercel Access Token. 
5. The plaintext is then dropped from server memory (never stored).

### Phase 5: Webhooks & Cleanup (`/api/integrations/vercel/webhook`)
- Listen for `integration-configuration.removed` from Vercel.
- When received, delete the associated OAuth tokens and project links from our database to maintain security and hygiene.
