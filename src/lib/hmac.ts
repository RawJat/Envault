// src/lib/hmac.ts
export async function generateHmacSignature(
  payload: string,
  timestamp: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataToSign = encoder.encode(`${timestamp}.${payload}`);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, dataToSign);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return signatureHex;
}

export async function verifyHmacSignature(
  payload: string,
  timestamp: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const expectedSignature = await generateHmacSignature(payload, timestamp, secret);
    return signature === expectedSignature;
  } catch (error) {
    console.error("Error verifying HMAC signature:", error);
    return false;
  }
}
