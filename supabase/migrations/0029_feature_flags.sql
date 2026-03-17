set search_path to public, extensions;

-- ── feature_flags ──────────────────────────────────────────────────────────────
-- Admin-controlled on/off switches for expensive or optional features.
-- Readable by everyone (no auth needed to check a flag).
-- Only writable via service_role (Next.js admin API route).
CREATE TABLE IF NOT EXISTS feature_flags (
  key         text    PRIMARY KEY,
  enabled     boolean NOT NULL DEFAULT true,
  label       text    NOT NULL,
  description text    NOT NULL DEFAULT ''
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read flags (needed by the client dashboard + Edge Functions)
CREATE POLICY "Public read feature flags"
  ON feature_flags FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE for authenticated users — writes go through the
-- Next.js admin API route using SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.

-- ── Seed: initial flags ────────────────────────────────────────────────────────
INSERT INTO feature_flags (key, label, description, enabled) VALUES
  (
    'push_notifications',
    'Browser Push Notifications',
    'Daily Web Push alerts at 8am EST via VAPID + Supabase Deno Cron. Disable to stop the Edge Function from sending and hide the opt-in banner on user dashboards.',
    true
  )
ON CONFLICT (key) DO NOTHING;
