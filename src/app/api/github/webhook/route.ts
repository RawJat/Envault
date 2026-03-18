import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function verifySignature(
  secret: string,
  body: string,
  signature: string,
): boolean {
  const expectedSig =
    "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.ENVAULT_GITHUB_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const body = await req.text();

  if (!verifySignature(webhookSecret, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body);

  // GitHub App uninstalled - clean up both the user-level installation record
  // and any project repo links that were using this installation.
  if (event === "installation" && payload.action === "deleted") {
    const installationId: number = payload.installation?.id;
    if (installationId) {
      const admin = createAdminClient();

      // Find who owns this installation before deleting
      const { data: instRow } = await admin
        .from("github_installations")
        .select("user_id, account_login")
        .eq("installation_id", installationId)
        .single();

      // Remove the user-level installation record
      await admin
        .from("github_installations")
        .delete()
        .eq("installation_id", installationId);

      // Clear the linked repo name from projects that referenced repos from this installation.
      const repos: Array<{ full_name: string }> =
        payload.installation?.repositories ?? [];

      let affectedProjects: Array<{
        id: string;
        github_repo_full_name: string;
      }> = [];
      if (repos.length > 0) {
        const repoNames = repos.map((r) => r.full_name);
        const { data: affected } = await admin
          .from("projects")
          .select("id, github_repo_full_name")
          .in("github_repo_full_name", repoNames);
        affectedProjects = (affected ?? []) as typeof affectedProjects;

        await admin
          .from("projects")
          .update({ github_repo_full_name: null })
          .in("github_repo_full_name", repoNames);
      }

      // Audit: log account disconnected + individual repo unlinks
      if (instRow?.user_id) {
        const { logAuditEvent } = await import("@/lib/system/audit-logger");
        const actorId = instRow.user_id;

        // One event per affected project for repo_unlinked
        for (const proj of affectedProjects) {
          logAuditEvent({
            projectId: proj.id,
            actorId,
            actorType: "user",
            action: "github.repo_unlinked",
            metadata: {
              repo_full_name: proj.github_repo_full_name,
              reason: "github_app_uninstalled",
              installation_id: installationId,
            },
          }).catch(() => {});
        }

        // Account disconnected - use first affected project or skip if none
        const anchorProjectId = affectedProjects[0]?.id;
        if (anchorProjectId) {
          logAuditEvent({
            projectId: anchorProjectId,
            actorId,
            actorType: "user",
            action: "github.account_disconnected",
            metadata: {
              installation_id: installationId,
              account_login: instRow.account_login ?? null,
            },
          }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
