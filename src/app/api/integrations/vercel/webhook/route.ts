import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac, timingSafeEqual } from "crypto";

type VercelWebhookPayload = {
  type?: string;
  configurationId?: string;
  data?: {
    configurationId?: string;
  };
};

function getConfigurationId(payload: VercelWebhookPayload): string | null {
  return payload.configurationId ?? payload.data?.configurationId ?? null;
}

function verifyVercelWebhookSignature(
  secret: string,
  body: string,
  signature: string,
): boolean {
  const sha1Hex = createHmac("sha1", secret).update(body).digest("hex");
  const sha256Hex = createHmac("sha256", secret).update(body).digest("hex");
  const candidates = [
    sha1Hex,
    sha256Hex,
    `sha1=${sha1Hex}`,
    `sha256=${sha256Hex}`,
  ];

  for (const expected of candidates) {
    try {
      if (timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return true;
      }
    } catch {
      // Length mismatch or malformed buffer, try next candidate.
    }
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.VERCEL_WEBHOOK_SECRET;
    const rawBody = await request.text();
    const signature = request.headers.get("x-vercel-signature") ?? "";

    if (webhookSecret) {
      if (!signature) {
        return NextResponse.json(
          { error: "Missing webhook signature" },
          { status: 401 },
        );
      }

      if (!verifyVercelWebhookSignature(webhookSecret, rawBody, signature)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody) as VercelWebhookPayload;
    const eventType = body.type;

    // We only care about uninstall/removal cleanup right now.
    if (eventType !== "integration-configuration.removed") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const configurationId = getConfigurationId(body);

    if (!configurationId) {
      return NextResponse.json(
        { error: "Missing configurationId in webhook payload" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Mark installation as revoked to stop showing it as active.
    const { error: installationUpdateError } = await admin
      .from("vercel_installations")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("configuration_id", configurationId);

    if (installationUpdateError) {
      console.error(
        "[Vercel Sync] Failed to revoke installation on webhook:",
        installationUpdateError,
      );
      return NextResponse.json(
        { error: "Failed to revoke installation" },
        { status: 500 },
      );
    }

    // Delete mapping rows to keep DB clean and avoid stale "connected" UI.
    const { error: linkDeleteError } = await admin
      .from("vercel_project_links")
      .delete()
      .eq("configuration_id", configurationId);

    if (linkDeleteError) {
      console.error(
        "[Vercel Sync] Failed to remove project links on webhook:",
        linkDeleteError,
      );
      return NextResponse.json(
        { error: "Failed to remove linked projects" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Vercel Sync] Webhook endpoint error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
