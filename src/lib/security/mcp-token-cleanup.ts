export type ExpiredTokenRow = {
  id: string;
  user_id: string;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
};

export type CleanupDetails = {
  userId: string;
  emailed: boolean;
  notified: boolean;
  expiresAt: string | null;
};

export type CleanupDependencies = {
  fetchExpiredTokens: (nowIso: string) => Promise<ExpiredTokenRow[]>;
  deleteExpiredTokens: (userIds: string[], nowIso: string) => Promise<void>;
  clearExpiredProfileFields: (userIds: string[], nowIso: string) => Promise<void>;
  getUserEmailById: (userId: string) => Promise<string | null>;
  notifyExpired: (
    userId: string,
    tokenName: string | null,
    ttlDays: number | null,
    expiresAt: string | null,
  ) => Promise<boolean>;
  emailExpired: (
    email: string,
    userId: string,
    tokenName: string | null,
  ) => Promise<boolean>;
};

export async function runMcpTokenCleanup(
  deps: CleanupDependencies,
  nowIso = new Date().toISOString(),
): Promise<{
  cleaned: number;
  notified: number;
  emailed: number;
  details: CleanupDetails[];
}> {
  const expiredTokens = await deps.fetchExpiredTokens(nowIso);

  if (expiredTokens.length === 0) {
    return {
      cleaned: 0,
      notified: 0,
      emailed: 0,
      details: [],
    };
  }

  const userIds = Array.from(new Set(expiredTokens.map((row) => row.user_id)));

  await deps.deleteExpiredTokens(userIds, nowIso);
  await deps.clearExpiredProfileFields(userIds, nowIso);

  const details: CleanupDetails[] = [];

  for (const token of expiredTokens) {
    const tokenMeta = (token.metadata || {}) as {
      token_name?: string;
      ttl_days?: number;
    };

    const tokenName = tokenMeta.token_name ?? null;
    const ttlDays = typeof tokenMeta.ttl_days === "number" ? tokenMeta.ttl_days : null;

    const notified = await deps.notifyExpired(
      token.user_id,
      tokenName,
      ttlDays,
      token.expires_at,
    );

    let emailed = false;
    const email = await deps.getUserEmailById(token.user_id);
    if (email) {
      emailed = await deps.emailExpired(email, token.user_id, tokenName);
    }

    details.push({
      userId: token.user_id,
      notified,
      emailed,
      expiresAt: token.expires_at,
    });
  }

  return {
    cleaned: expiredTokens.length,
    notified: details.filter((item) => item.notified).length,
    emailed: details.filter((item) => item.emailed).length,
    details,
  };
}
