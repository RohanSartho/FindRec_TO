set search_path to public, extensions;

-- ── user_push_subscriptions ────────────────────────────────────────────────────
-- Stores Web Push subscriptions (one per browser/device per user).
-- Each row holds the endpoint URL + ECDH keys needed to send a push message.
CREATE TABLE IF NOT EXISTS user_push_subscriptions (
  id         bigserial PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint   text        NOT NULL UNIQUE,   -- browser-assigned push endpoint URL
  p256dh     text        NOT NULL,          -- ECDH public key (base64url)
  auth       text        NOT NULL,          -- auth secret (base64url)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-user lookups (used by the daily cron function)
CREATE INDEX IF NOT EXISTS user_push_subscriptions_user_id_idx
  ON user_push_subscriptions (user_id);

-- ── Row Level Security ─────────────────────────────────────────────────────────
ALTER TABLE user_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own push subscriptions"
  ON user_push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions"
  ON user_push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON user_push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);
