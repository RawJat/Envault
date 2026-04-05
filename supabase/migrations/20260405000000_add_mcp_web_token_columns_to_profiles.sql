-- Add MCP web token lifecycle fields to user profiles.
-- One active MCP token per user is enforced by storing a single token hash + expiry per profile.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mcp_web_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS mcp_web_token_ttl_days INTEGER,
  ADD COLUMN IF NOT EXISTS mcp_web_token_expires_at TIMESTAMPTZ;

-- Only allow TTL values supported by UI policy.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_mcp_web_token_ttl_days_allowed'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_mcp_web_token_ttl_days_allowed
      CHECK (mcp_web_token_ttl_days IS NULL OR mcp_web_token_ttl_days IN (7, 15, 30));
  END IF;
END $$;

-- Optional helper index for cleanup jobs that remove expired tokens.
CREATE INDEX IF NOT EXISTS idx_profiles_mcp_web_token_expires_at
  ON public.profiles (mcp_web_token_expires_at)
  WHERE mcp_web_token_expires_at IS NOT NULL;
