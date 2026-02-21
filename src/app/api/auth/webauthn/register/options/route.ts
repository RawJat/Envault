import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { getRpId, rpName } from "@/lib/webauthn";
import { createClient } from "@/lib/supabase/server";
import { getRedisClient } from "@/lib/redis";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = user.email || user.id;

    // Get existing passkeys to exclude them from registration
    const { data: existingPasskeys } = await supabase
      .from("passkeys")
      .select("credential_id")
      .eq("user_id", user.id);

    const excludeCredentials = (existingPasskeys || []).map((key) => ({
      id: key.credential_id, // SimpleWebAuthn v10/11 expects Base64URL string here
      type: "public-key" as const,
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID: getRpId(req),
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: userEmail,
      // Don't prompt users for authenticator attachment if we want to be flexible
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
      },
      excludeCredentials,
    });

    // Store the challenge in Redis securely tied to the user's ID
    // Expiry of 5 minutes (300 seconds)
    const redis = getRedisClient();
    await redis.set(`webauthn:register:${user.id}`, options.challenge, {
      ex: 300,
    });

    return NextResponse.json(options);
  } catch (error: unknown) {
    console.error("Error generating registration options:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
