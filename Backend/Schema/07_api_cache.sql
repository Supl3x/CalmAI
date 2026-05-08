-- API Cache Table for Rate Limiting Prevention
-- Stores cached responses from external APIs (Gmail, Calendar, Drive)

CREATE TABLE IF NOT EXISTS api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_user_id ON api_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_api_cache_cached_at ON api_cache(cached_at);

-- RLS Policies
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own cache"
  ON api_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all cache"
  ON api_cache FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-cleanup old cache entries (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM api_cache
  WHERE cached_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-api-cache', '0 * * * *', 'SELECT cleanup_old_cache()');

COMMENT ON TABLE api_cache IS 'Caches external API responses to prevent rate limiting';
