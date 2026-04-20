import { validateCliToken } from "@/lib/auth/cli-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redis } from "@/lib/infra/redis";
import { NextResponse } from "next/server";
import { getProjectRole } from "@/lib/auth/permissions";

const ENCODING = "hex";

function getMasterKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is not set");
  if (key.length !== 64)
    throw new Error(
      "ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)",
    );
  return Buffer.from(key, ENCODING);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const result = await validateCliToken(request);
  if ("status" in result) return result;

  const { projectId } = await params;
  const supabase = createAdminClient();

  if (result.type !== "service") {
    const role = await getProjectRole(supabase, projectId, result.userId);
    if (!role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  } else if (result.projectId !== projectId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const cachedActiveKeyArg = await redis.get<string>("active_key");
    if (cachedActiveKeyArg) {
      const [cachedId, cachedHex] = cachedActiveKeyArg.split(":");
      if (cachedId && cachedHex) {
        return NextResponse.json({ key_id: cachedId, dek: cachedHex });
      }
    }
  } catch (e) {
    console.warn("Redis Cache Miss/Error:", e);
  }

  const { data, error } = await supabase
    .from("encryption_keys")
    .select("id, encrypted_key")
    .eq("status", "active")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "No ACTIVE encryption key found." },
      { status: 404 },
    );
  }

  const crypto = await import("crypto");
  const ivLength = 16;
  const authTagLength = 16;
  const masterKey = getMasterKey();

  const combined = Buffer.from(data.encrypted_key, "base64");
  const iv = combined.subarray(0, ivLength);
  const authTag = combined.subarray(combined.length - authTagLength);
  const encrypted = combined.subarray(
    ivLength,
    combined.length - authTagLength,
  );

  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(authTag);

  let unwrappedKey = decipher.update(
    encrypted.toString(ENCODING),
    ENCODING,
    "utf8",
  );
  unwrappedKey += decipher.final("utf8");

  try {
    await redis.set("active_key", `${data.id}:${unwrappedKey}`, { ex: 3600 });
  } catch (e) {
    console.warn("Failed to set Redis cache:", e);
  }

  return NextResponse.json({ key_id: data.id, dek: unwrappedKey });
}
