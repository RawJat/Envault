import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import nodeCrypto from "node:crypto";
import { Buffer } from "node:buffer";
import { Redis } from "https://esm.sh/@upstash/redis";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MASTER_KEY_HEX = Deno.env.get("ENCRYPTION_KEY")!;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENCODING = "hex";
// [SCAVENGER] Scavenger processes smaller batches to be "Low-and-Slow"
const BATCH_SIZE = 50;

// --- Helper Functions ---
function getMasterKey(): Buffer {
  if (!MASTER_KEY_HEX || MASTER_KEY_HEX.length !== 64) {
    throw new Error("Invalid ENCRYPTION_KEY");
  }
  return Buffer.from(MASTER_KEY_HEX, ENCODING);
}

function encryptWithKey(text: string, key: Buffer): string {
  const iv = nodeCrypto.randomBytes(IV_LENGTH);
  const cipher = nodeCrypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", ENCODING);
  encrypted += cipher.final(ENCODING);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([
    iv,
    Buffer.from(encrypted, ENCODING),
    authTag,
  ]);
  return combined.toString("base64");
}

function decryptWithKey(encryptedText: string, key: Buffer): string {
  const combined = Buffer.from(encryptedText, "base64");
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(
    IV_LENGTH,
    combined.length - AUTH_TAG_LENGTH,
  );
  const decipher = nodeCrypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  try {
    let decrypted = decipher.update(
      encrypted.toString(ENCODING),
      ENCODING,
      "utf8",
    );
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    throw new Error("Decryption Failed");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    let serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      serviceRoleKey = authHeader.split(" ")[1];
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey,
    );

    // Parse Request
    const { action, job_id } = await req
      .json()
      .catch(() => ({ action: "scavenge", job_id: null }));

    // Actions:
    // 'roll_key': Explicitly creates a new key and sets it as active.
    // 'scavenge': Default. Finds secrets encrypted with OLD keys and rotates them to the ACTIVE key.

    if (action === "roll_key") {
      return await rollKey(supabaseClient);
    } else {
      return await runScavenger(supabaseClient);
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

/**
 * [ACTION] Roll Key
 * Creates a new Data Key and sets it as ACTIVE.
 * Does NOT rotate secrets immediately.
 */
async function rollKey(supabase: SupabaseClient) {
  console.log("Rolling Key...");

  // 1. Create NEW Data Key
  const newKeyBuffer = nodeCrypto.randomBytes(32);
  const masterKey = getMasterKey();
  const newKeyHex = newKeyBuffer.toString("hex");
  const encryptedNewKey = encryptWithKey(newKeyHex, masterKey);

  // 2. Retire current active key logic?
  // We should first insert the new key as 'active' and update old 'active' keys to 'retired'?
  // Transaction ideally.

  // Fetch currently active key to retire it
  const { data: currentActive } = await supabase
    .from("encryption_keys")
    .select("id")
    .eq("status", "active")
    .single();

  // Insert new key as active
  const { data: newKeyData, error: newKeyError } = await supabase
    .from("encryption_keys")
    .insert({
      encrypted_key: encryptedNewKey,
      status: "active", // Immediately active for NEW writes
    })
    .select()
    .single();

  if (newKeyError)
    throw new Error(`Failed to create new key: ${newKeyError.message}`);

  // Retire old key
  if (currentActive) {
    await supabase
      .from("encryption_keys")
      .update({ status: "retired" })
      .eq("id", currentActive.id);
  }

  // Invalidate Redis
  try {
    const redis = new Redis({
      url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
      token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
    });
    await redis.del("active_key");
  } catch (e) {
    console.error("Failed to invalidate Redis:", e);
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "Key Rolled. New key is now active.",
      new_key_id: newKeyData.id,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

/**
 * [ACTION] Scavenger
 * Finds secrets that do not match the current ACTIVE key ID and rotates them.
 */
async function runScavenger(supabase: SupabaseClient) {
  // 1. Get Active Key
  const { data: activeKeyData, error: activeKeyError } = await supabase
    .from("encryption_keys")
    .select("id, encrypted_key")
    .eq("status", "active")
    .single();

  if (activeKeyError || !activeKeyData) {
    // If no active key, we can't do anything (or maybe we should init one? but 'roll_key' does that)
    return new Response(
      JSON.stringify({
        message: "No Active Key found. Please run roll_key first.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const activeKeyId = activeKeyData.id;

  // Unwrap Active Key
  const masterKey = getMasterKey();
  const activeKeyUnwrapped = Buffer.from(
    decryptWithKey(activeKeyData.encrypted_key, masterKey),
    "hex",
  );

  // 2. Find Dormant Secrets (Limit 50)
  // Criteria: key_id IS NULL or key_id != activeKeyId
  const { data: dormantSecrets, error: fetchError } = await supabase
    .from("secrets")
    .select("id, key, value, key_id")
    .neq("key_id", activeKeyId) // This works if key_id is not null. For nulls we need "or is null"
    .or(`key_id.neq.${activeKeyId},key_id.is.null`) // Supabase syntax for OR
    .limit(BATCH_SIZE);

  if (fetchError) {
    return new Response(
      JSON.stringify({ error: `Fetch failed: ${fetchError.message}` }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }

  if (!dormantSecrets || dormantSecrets.length === 0) {
    return new Response(
      JSON.stringify({
        message: "No dormant secrets found. System is up to date.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  console.log(`[Scavenger] Found ${dormantSecrets.length} secrets to rotate.`);

  // 3. Process Batch
  let processedCount = 0;
  const failedIds: string[] = [];

  // Key Cache for decryption (Old Keys)
  const oldKeyCache = new Map<string, Buffer>();

  for (const secret of dormantSecrets) {
    try {
      let decryptedValue = "";

      // Decrypt Logic
      if (!secret.key_id) {
        // Legacy: Decrypt with Master Key
        // Careful: secret.value might be raw or v1?
        // If it's v1 but key_id column is null (migration pending?), check prefix
        if (secret.value.startsWith("v1:")) {
          // Should have key_id, but if missing, parse from string
          const parts = secret.value.split(":");
          const keyId = parts[1];
          // Fetch key...
          // Reuse logic below
          secret.key_id = keyId;
        } else {
          decryptedValue = decryptWithKey(secret.value, masterKey);
        }
      }

      if (secret.key_id && !decryptedValue) {
        let oldKeyBuffer = oldKeyCache.get(secret.key_id);
        if (!oldKeyBuffer) {
          const { data: oldKeyData } = await supabase
            .from("encryption_keys")
            .select("encrypted_key")
            .eq("id", secret.key_id)
            .single();
          if (oldKeyData) {
            const hex = decryptWithKey(oldKeyData.encrypted_key, masterKey);
            oldKeyBuffer = Buffer.from(hex, "hex");
            oldKeyCache.set(secret.key_id, oldKeyBuffer);
          }
        }

        if (oldKeyBuffer) {
          if (secret.value.startsWith("v1:")) {
            const parts = secret.value.split(":");
            decryptedValue = decryptWithKey(parts[2], oldKeyBuffer);
          } else {
            decryptedValue = decryptWithKey(secret.value, oldKeyBuffer);
          }
        }
      }

      // Encrypt with ACTIVE Key
      if (decryptedValue) {
        const ciphertext = encryptWithKey(decryptedValue, activeKeyUnwrapped);
        const storedValue = `v1:${activeKeyId}:${ciphertext}`;

        await supabase
          .from("secrets")
          .update({
            value: storedValue,
            key_id: activeKeyId,
            // Don't update last_updated_at usually for system rotation?
            // But for debugging it helps.
          })
          .eq("id", secret.id);

        processedCount++;
      } else {
        throw new Error("Could not decrypt");
      }
    } catch (e) {
      console.error(`[Scavenger] Failed secret ${secret.id}`, e);
      failedIds.push(secret.id);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      action: "scavenge",
      processed: processedCount,
      failed: failedIds.length,
      target_key: activeKeyId,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
