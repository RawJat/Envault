import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { getRpId, getExpectedOrigin } from "@/lib/webauthn";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRedisClient } from "@/lib/redis";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { response, sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session ID" },
        { status: 400 },
      );
    }

    const redis = getRedisClient();
    const expectedChallenge = await redis.get<string>(
      `webauthn:auth:${sessionId}`,
    );

    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Challenge expired or not found / Try again" },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    // Find the passkey
    const { data: passkeyData, error: passkeyError } = await supabaseAdmin
      .from("passkeys")
      .select("user_id, public_key, counter")
      .eq("credential_id", response.id)
      .single();

    if (passkeyError || !passkeyData) {
      return NextResponse.json({ error: "Passkey not found" }, { status: 404 });
    }

    // The bytea column is returned in hex format like \x... by Supabase/PostgREST
    const pubKeyString = passkeyData.public_key as string;
    const publicKeyBuffer = pubKeyString.startsWith("\\x")
      ? Buffer.from(pubKeyString.slice(2), "hex")
      : Buffer.from(pubKeyString, "base64"); // fallback just in case

    // Verify the response
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getExpectedOrigin(req),
      expectedRPID: getRpId(req),
      credential: {
        id: response.id,
        publicKey: publicKeyBuffer,
        counter: passkeyData.counter,
        transports: response.response.transports,
      },
    });

    if (verification.verified && verification.authenticationInfo) {
      const { newCounter } = verification.authenticationInfo;

      // Update counter
      await supabaseAdmin
        .from("passkeys")
        .update({
          counter: newCounter,
          last_used_at: new Date().toISOString(),
        })
        .eq("credential_id", response.id);

      // Clear challenge safely
      await redis.del(`webauthn:auth:${sessionId}`);

      // Now we must mint a session for this user.
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.admin.getUserById(passkeyData.user_id);
      if (userError || !userData.user || !userData.user.email) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Generate a magic link OTP
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: userData.user.email,
        });

      if (linkError || !linkData.properties?.action_link) {
        return NextResponse.json(
          { error: "Failed to mint session link" },
          { status: 500 },
        );
      }

      const parsedUrl = new URL(linkData.properties.action_link);
      const tokenHash = parsedUrl.searchParams.get("token");

      if (!tokenHash) {
        return NextResponse.json(
          { error: "Failed to extract session token from link" },
          { status: 500 },
        );
      }

      // Verify the OTP on the server to establish the session in cookies
      const supabaseServer = await createClient();
      const { error: verifyError } = await supabaseServer.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      });

      if (verifyError) {
        return NextResponse.json(
          { error: "Session establishment failed" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  } catch (error: Error | unknown) {
    console.error("Error verifying authentication:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
