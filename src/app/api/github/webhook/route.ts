import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function verifySignature(secret: string, body: string, signature: string): boolean {
  const expectedSig = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.ENVAULT_GITHUB_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const body = await req.text();

  if (!verifySignature(webhookSecret, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body);

  // GitHub App uninstalled — clear both fields for every project linked to this installation
  if (event === "installation" && payload.action === "deleted") {
    const installationId: number = payload.installation?.id;
    if (installationId) {
      const admin = createAdminClient();
      await admin
        .from("projects")
        .update({ github_installation_id: null, github_repo_full_name: null })
        .eq("github_installation_id", installationId);
    }
  }

  // GitHub App suspended (e.g. billing issue) — keep installation ID so reconnect is easy,
  // but the secrets route will fail the collaborator check anyway since the token will be invalid.
  // Nothing to do here unless you want to surface a warning in the UI.

  return NextResponse.json({ ok: true });
}
