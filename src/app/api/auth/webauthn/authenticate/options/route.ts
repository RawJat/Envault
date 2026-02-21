import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { getRpId } from "@/lib/webauthn";
import { getRedisClient } from "@/lib/redis";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const options = await generateAuthenticationOptions({
      rpID: getRpId(req),
      userVerification: "preferred",
    });

    const sessionId = crypto.randomUUID();

    // Store challenge tied to a temporary session ID (since we don't know the user yet)
    const redis = getRedisClient();
    await redis.set(`webauthn:auth:${sessionId}`, options.challenge, {
      ex: 300,
    });

    // We must return the sessionId to the client so they can send it back during verify
    return NextResponse.json({ options, sessionId });
  } catch (error: unknown) {
    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
