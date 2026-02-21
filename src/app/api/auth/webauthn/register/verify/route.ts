import { NextResponse, NextRequest, userAgent } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getRpId, getExpectedOrigin } from "@/lib/webauthn";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRedisClient } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { browser, os } = userAgent(req);
    const passkeyName = `${browser.name || "Authenticator"} on ${
      os.name || "Unknown Device"
    }`;

    const body = await req.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get challenge from Redis
    const redis = getRedisClient();
    const expectedChallenge = await redis.get<string>(
      `webauthn:register:${user.id}`,
    );

    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Challenge expired or not found" },
        { status: 400 },
      );
    }

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: getExpectedOrigin(req),
      expectedRPID: getRpId(req),
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;

      // Use direct base64url string for the id
      const credentialIDBase64URL = credential.id;

      // Convert Uint8Array to Postgres Hex format for bytea type
      const publicKeyPgHex = `\\x${Buffer.from(credential.publicKey).toString(
        "hex",
      )}`;

      // Insert securely using Supabase Admin Client
      const supabaseAdmin = createAdminClient();

      const { error } = await supabaseAdmin.from("passkeys").insert({
        user_id: user.id,
        name: passkeyName,
        credential_id: credentialIDBase64URL,
        public_key: publicKeyPgHex,
        counter: credential.counter,
        transports: credential.transports || [],
      });

      if (error) {
        console.error("Database insertion error:", error);
        // Clear challenge to prevent replay
        await redis.del(`webauthn:register:${user.id}`);
        return NextResponse.json(
          { error: "Failed to save passkey" },
          { status: 500 },
        );
      }

      // Clear challenge on success
      await redis.del(`webauthn:register:${user.id}`);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  } catch (error: Error | unknown) {
    console.error("Error verifying registration:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
