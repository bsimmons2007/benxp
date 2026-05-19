-- ============================================================
-- Security Hardening Migration
-- Run this in the Supabase SQL Editor (youxp project)
-- Date: 2026-05-19
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Enforce unique display names on the leaderboard
-- ────────────────────────────────────────────────────────────
ALTER TABLE public_profiles
  ADD CONSTRAINT public_profiles_display_name_unique UNIQUE (display_name);

-- ────────────────────────────────────────────────────────────
-- 2. Audit log — sensitive account events, 90-day TTL
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users NOT NULL,
  action      text NOT NULL,           -- e.g. 'password_change', 'account_delete', 'new_device_login'
  ip_address  inet,
  user_agent  text,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own audit log, not write
CREATE POLICY "Users read own audit log"
  ON user_audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Only service_role can insert (done via Edge Functions)
CREATE POLICY "Service role inserts audit log"
  ON user_audit_log FOR INSERT TO service_role
  WITH CHECK (true);

-- Auto-purge rows older than 90 days via pg_cron (if available)
-- SELECT cron.schedule('purge-audit-log', '0 3 * * *',
--   $$DELETE FROM user_audit_log WHERE created_at < now() - interval '90 days'$$);

-- ────────────────────────────────────────────────────────────
-- 3. Privacy controls — per-user stat visibility preferences
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id              uuid PRIMARY KEY REFERENCES auth.users,
  show_on_leaderboard  boolean DEFAULT false,
  profile_public       boolean DEFAULT false,
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own privacy settings"
  ON user_privacy_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. Following schema (for future social features)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_follows (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  uuid REFERENCES auth.users NOT NULL,
  following_id uuid REFERENCES auth.users NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own follows"
  ON user_follows FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users manage own follows"
  ON user_follows FOR ALL TO authenticated
  USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);

-- Block list
CREATE TABLE IF NOT EXISTS user_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid REFERENCES auth.users NOT NULL,
  blocked_id  uuid REFERENCES auth.users NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocks"
  ON user_blocks FOR ALL TO authenticated
  USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- Exclude blocked users from leaderboard visibility
-- (handled in application query: .not('user_id', 'in', blocked_ids))

-- ────────────────────────────────────────────────────────────
-- 5. Confirm all existing tables have RLS enabled
--    (safe to run — no-ops if already enabled)
-- ────────────────────────────────────────────────────────────
ALTER TABLE lifting_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE skate_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fortnite_games     ENABLE ROW LEVEL SECURITY;
ALTER TABLE books              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardio_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE basketball_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickleball_games   ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_rounds        ENABLE ROW LEVEL SECURITY;
ALTER TABLE disc_golf_rounds   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hiking_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_tennis_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE chess_games        ENABLE ROW LEVEL SECURITY;
ALTER TABLE volleyball_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spikeball_games    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_games         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bodyweight_log     ENABLE ROW LEVEL SECURITY;
