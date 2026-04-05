export const MCP_WEB_TOKEN_NAME = "MCP Access Token";
export const MCP_TTL_OPTIONS_DAYS = [7, 15, 30] as const;

export function isAllowedMcpTtlDays(
  ttlDays: number,
): ttlDays is (typeof MCP_TTL_OPTIONS_DAYS)[number] {
  return MCP_TTL_OPTIONS_DAYS.includes(
    ttlDays as (typeof MCP_TTL_OPTIONS_DAYS)[number],
  );
}

export function buildMcpTokenMaskedValue(rawToken: string): string {
  const prefix = rawToken.slice(0, 10);
  const suffix = rawToken.slice(-6);
  return `${prefix}...${suffix}`;
}

/**
 * Compute expiry at end-of-day UTC after ttlDays so cleanup can run daily.
 */
export function computeMcpTokenExpiryIso(
  ttlDays: number,
  now: Date = new Date(),
): string {
  const expiryUtc = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + ttlDays,
      23,
      59,
      59,
      999,
    ),
  );
  return expiryUtc.toISOString();
}
