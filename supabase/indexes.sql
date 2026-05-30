-- ============================================================
-- YouXP — Performance Indexes
-- Run in Supabase SQL Editor after rls-policies.sql
-- Safe to re-run: CREATE INDEX IF NOT EXISTS
-- ============================================================
-- Pattern: (user_id, date) composite on every activity table
-- so queries that filter by user AND date/period don't scan
-- the full table. Supabase only auto-creates PK indexes.
-- ============================================================

-- ── Core activity tables ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_lifting_log_user_date
  ON lifting_log (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_lifting_log_user_lift
  ON lifting_log (user_id, lift);

CREATE INDEX IF NOT EXISTS idx_pr_history_user_lift_1rm
  ON pr_history (user_id, lift, est_1rm DESC);

CREATE INDEX IF NOT EXISTS idx_pr_history_user_date
  ON pr_history (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_skate_sessions_user_date
  ON skate_sessions (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_fortnite_games_user_date
  ON fortnite_games (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_books_user_date_finished
  ON books (user_id, date_finished DESC);

CREATE INDEX IF NOT EXISTS idx_sleep_log_user_date
  ON sleep_log (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_sleep_log_user_is_nap
  ON sleep_log (user_id, is_nap, date DESC);

CREATE INDEX IF NOT EXISTS idx_cardio_sessions_user_date
  ON cardio_sessions (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_cardio_sessions_user_activity
  ON cardio_sessions (user_id, activity, date DESC);

CREATE INDEX IF NOT EXISTS idx_goals_user_status
  ON goals (user_id, status);

CREATE INDEX IF NOT EXISTS idx_challenges_user_status
  ON challenges (user_id, status, tier);

CREATE INDEX IF NOT EXISTS idx_mood_log_user_date
  ON mood_log (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date
  ON body_measurements (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_water_log_user_date
  ON water_log (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_bodyweight_log_user_date
  ON bodyweight_log (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_to_read_user_created
  ON to_read (user_id, created_at DESC);

-- ── Sports / games ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_basketball_sessions_user_date
  ON basketball_sessions (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_pickleball_games_user_date
  ON pickleball_games (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_golf_rounds_user_date
  ON golf_rounds (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_disc_golf_rounds_user_date
  ON disc_golf_rounds (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_hiking_sessions_user_date
  ON hiking_sessions (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_table_tennis_games_user_date
  ON table_tennis_games (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_chess_games_user_date
  ON chess_games (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_volleyball_sessions_user_date
  ON volleyball_sessions (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_spikeball_games_user_date
  ON spikeball_games (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_pool_games_user_date
  ON pool_games (user_id, date DESC);

-- ── Leaderboard ───────────────────────────────────────────────
-- Sorted descending by XP, filtered to public rows only

CREATE INDEX IF NOT EXISTS idx_public_profiles_leaderboard
  ON public_profiles (is_public, total_xp DESC)
  WHERE is_public = true;

-- ── Verification ──────────────────────────────────────────────
-- Uncomment to confirm indexes were created:
/*
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
*/
