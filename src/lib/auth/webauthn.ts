export const rpName = "Envault";

function getForwardedHost(req: Request): string | null {
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (!forwardedHost) return null;
  // In proxy chains this may be a comma-separated list; first hop is client-facing.
  return forwardedHost.split(",")[0]?.trim() || null;
}

export function getRpId(req: Request) {
  const host = getForwardedHost(req) || req.headers.get("host") || "envault.tech";
  // Remove port if present for rpID
  return host.split(":")[0];
}

export function getExpectedOrigin(req: Request) {
  const host = getForwardedHost(req) || req.headers.get("host") || "envault.tech";
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const protocol = forwardedProto || "https";
  return `${protocol}://${host}`;
}
