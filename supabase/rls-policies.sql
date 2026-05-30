-- ============================================================
-- YouXP — Row Level Security (RLS) Migration
-- Run this in Supabase SQL Editor (youxp project)
-- Safe to re-run: DROP IF EXISTS before CREATE
-- ============================================================
-- All user-owned tables follow the same pattern:
--   SELECT/INSERT/UPDATE/DELETE → user_id = auth.uid()
-- Reference tables (exercises, exercise_muscle_activations)
--   are public read, no writes via client.
-- ============================================================


-- ──────────────────────────────────────────────
-- HELPER: enable RLS on every table first
-- ──────────────────────────────────────────────

ALTER TABLE lifting_log                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_history                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE skate_sessions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE fortnite_games                ENABLE ROW LEVEL SECURITY;
ALTER TABLE books                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_log                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cardio_sessions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_log                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_log                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE basketball_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickleball_games              ENABLE ROW LEVEL SECURITY;
ALTER TABLE golf_rounds                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE disc_golf_rounds              ENABLE ROW LEVEL SECURITY;
ALTER TABLE hiking_sessions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_tennis_games            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chess_games                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE volleyball_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE spikeball_games               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_games                    ENABLE ROW LEVEL SECURITY;

-- Additional user-owned tables found in codebase
ALTER TABLE bodyweight_log                ENABLE ROW LEVEL SECURITY;
ALTER TABLE to_read                       ENABLE ROW LEVEL SECURITY;

-- Reference / shared tables (public read, no client writes)
ALTER TABLE exercises                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_muscle_activations   ENABLE ROW LEVEL SECURITY;

-- Profile table (exists — queried by Leaderboard page)
ALTER TABLE public_profiles               ENABLE ROW LEVEL SECURITY;

-- Social/audit tables — guarded below with IF EXISTS because they may not
-- be created yet (not yet wired to app code). See section at bottom.


-- ══════════════════════════════════════════════
-- MACRO: user-owned activity tables
-- Pattern: owner = auth.uid() for all operations
-- ══════════════════════════════════════════════

-- ── lifting_log ────────────────────────────────
DROP POLICY IF EXISTS "lifting_log_select" ON lifting_log;
DROP POLICY IF EXISTS "lifting_log_insert" ON lifting_log;
DROP POLICY IF EXISTS "lifting_log_update" ON lifting_log;
DROP POLICY IF EXISTS "lifting_log_delete" ON lifting_log;

CREATE POLICY "lifting_log_select" ON lifting_log FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "lifting_log_insert" ON lifting_log FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "lifting_log_update" ON lifting_log FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "lifting_log_delete" ON lifting_log FOR DELETE USING (user_id = auth.uid());

-- ── pr_history ─────────────────────────────────
DROP POLICY IF EXISTS "pr_history_select" ON pr_history;
DROP POLICY IF EXISTS "pr_history_insert" ON pr_history;
DROP POLICY IF EXISTS "pr_history_update" ON pr_history;
DROP POLICY IF EXISTS "pr_history_delete" ON pr_history;

CREATE POLICY "pr_history_select" ON pr_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pr_history_insert" ON pr_history FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "pr_history_update" ON pr_history FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pr_history_delete" ON pr_history FOR DELETE USING (user_id = auth.uid());

-- ── skate_sessions ─────────────────────────────
DROP POLICY IF EXISTS "skate_sessions_select" ON skate_sessions;
DROP POLICY IF EXISTS "skate_sessions_insert" ON skate_sessions;
DROP POLICY IF EXISTS "skate_sessions_update" ON skate_sessions;
DROP POLICY IF EXISTS "skate_sessions_delete" ON skate_sessions;

CREATE POLICY "skate_sessions_select" ON skate_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "skate_sessions_insert" ON skate_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "skate_sessions_update" ON skate_sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "skate_sessions_delete" ON skate_sessions FOR DELETE USING (user_id = auth.uid());

-- ── fortnite_games ─────────────────────────────
DROP POLICY IF EXISTS "fortnite_games_select" ON fortnite_games;
DROP POLICY IF EXISTS "fortnite_games_insert" ON fortnite_games;
DROP POLICY IF EXISTS "fortnite_games_update" ON fortnite_games;
DROP POLICY IF EXISTS "fortnite_games_delete" ON fortnite_games;

CREATE POLICY "fortnite_games_select" ON fortnite_games FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "fortnite_games_insert" ON fortnite_games FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "fortnite_games_update" ON fortnite_games FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "fortnite_games_delete" ON fortnite_games FOR DELETE USING (user_id = auth.uid());

-- ── books ──────────────────────────────────────
DROP POLICY IF EXISTS "books_select" ON books;
DROP POLICY IF EXISTS "books_insert" ON books;
DROP POLICY IF EXISTS "books_update" ON books;
DROP POLICY IF EXISTS "books_delete" ON books;

CREATE POLICY "books_select" ON books FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "books_insert" ON books FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "books_update" ON books FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "books_delete" ON books FOR DELETE USING (user_id = auth.uid());

-- ── sleep_log ──────────────────────────────────
DROP POLICY IF EXISTS "sleep_log_select" ON sleep_log;
DROP POLICY IF EXISTS "sleep_log_insert" ON sleep_log;
DROP POLICY IF EXISTS "sleep_log_update" ON sleep_log;
DROP POLICY IF EXISTS "sleep_log_delete" ON sleep_log;

CREATE POLICY "sleep_log_select" ON sleep_log FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "sleep_log_insert" ON sleep_log FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "sleep_log_update" ON sleep_log FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sleep_log_delete" ON sleep_log FOR DELETE USING (user_id = auth.uid());

-- ── cardio_sessions ────────────────────────────
DROP POLICY IF EXISTS "cardio_sessions_select" ON cardio_sessions;
DROP POLICY IF EXISTS "cardio_sessions_insert" ON cardio_sessions;
DROP POLICY IF EXISTS "cardio_sessions_update" ON cardio_sessions;
DROP POLICY IF EXISTS "cardio_sessions_delete" ON cardio_sessions;

CREATE POLICY "cardio_sessions_select" ON cardio_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cardio_sessions_insert" ON cardio_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "cardio_sessions_update" ON cardio_sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "cardio_sessions_delete" ON cardio_sessions FOR DELETE USING (user_id = auth.uid());

-- ── goals ──────────────────────────────────────
DROP POLICY IF EXISTS "goals_select" ON goals;
DROP POLICY IF EXISTS "goals_insert" ON goals;
DROP POLICY IF EXISTS "goals_update" ON goals;
DROP POLICY IF EXISTS "goals_delete" ON goals;

CREATE POLICY "goals_select" ON goals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "goals_insert" ON goals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals_update" ON goals FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals_delete" ON goals FOR DELETE USING (user_id = auth.uid());

-- ── challenges ─────────────────────────────────
DROP POLICY IF EXISTS "challenges_select" ON challenges;
DROP POLICY IF EXISTS "challenges_insert" ON challenges;
DROP POLICY IF EXISTS "challenges_update" ON challenges;
DROP POLICY IF EXISTS "challenges_delete" ON challenges;

CREATE POLICY "challenges_select" ON challenges FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "challenges_insert" ON challenges FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "challenges_update" ON challenges FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "challenges_delete" ON challenges FOR DELETE USING (user_id = auth.uid());

-- ── mood_log ───────────────────────────────────
DROP POLICY IF EXISTS "mood_log_select" ON mood_log;
DROP POLICY IF EXISTS "mood_log_insert" ON mood_log;
DROP POLICY IF EXISTS "mood_log_update" ON mood_log;
DROP POLICY IF EXISTS "mood_log_delete" ON mood_log;

CREATE POLICY "mood_log_select" ON mood_log FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "mood_log_insert" ON mood_log FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "mood_log_update" ON mood_log FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "mood_log_delete" ON mood_log FOR DELETE USING (user_id = auth.uid());

-- ── body_measurements ──────────────────────────
DROP POLICY IF EXISTS "body_measurements_select" ON body_measurements;
DROP POLICY IF EXISTS "body_measurements_insert" ON body_measurements;
DROP POLICY IF EXISTS "body_measurements_update" ON body_measurements;
DROP POLICY IF EXISTS "body_measurements_delete" ON body_measurements;

CREATE POLICY "body_measurements_select" ON body_measurements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "body_measurements_insert" ON body_measurements FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "body_measurements_update" ON body_measurements FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "body_measurements_delete" ON body_measurements FOR DELETE USING (user_id = auth.uid());

-- ── water_log ──────────────────────────────────
DROP POLICY IF EXISTS "water_log_select" ON water_log;
DROP POLICY IF EXISTS "water_log_insert" ON water_log;
DROP POLICY IF EXISTS "water_log_update" ON water_log;
DROP POLICY IF EXISTS "water_log_delete" ON water_log;

CREATE POLICY "water_log_select" ON water_log FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "water_log_insert" ON water_log FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "water_log_update" ON water_log FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "water_log_delete" ON water_log FOR DELETE USING (user_id = auth.uid());

-- ── basketball_sessions ────────────────────────
DROP POLICY IF EXISTS "basketball_sessions_select" ON basketball_sessions;
DROP POLICY IF EXISTS "basketball_sessions_insert" ON basketball_sessions;
DROP POLICY IF EXISTS "basketball_sessions_update" ON basketball_sessions;
DROP POLICY IF EXISTS "basketball_sessions_delete" ON basketball_sessions;

CREATE POLICY "basketball_sessions_select" ON basketball_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "basketball_sessions_insert" ON basketball_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "basketball_sessions_update" ON basketball_sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "basketball_sessions_delete" ON basketball_sessions FOR DELETE USING (user_id = auth.uid());

-- ── pickleball_games ───────────────────────────
DROP POLICY IF EXISTS "pickleball_games_select" ON pickleball_games;
DROP POLICY IF EXISTS "pickleball_games_insert" ON pickleball_games;
DROP POLICY IF EXISTS "pickleball_games_update" ON pickleball_games;
DROP POLICY IF EXISTS "pickleball_games_delete" ON pickleball_games;

CREATE POLICY "pickleball_games_select" ON pickleball_games FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pickleball_games_insert" ON pickleball_games FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "pickleball_games_update" ON pickleball_games FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pickleball_games_delete" ON pickleball_games FOR DELETE USING (user_id = auth.uid());

-- ── golf_rounds ────────────────────────────────
DROP POLICY IF EXISTS "golf_rounds_select" ON golf_rounds;
DROP POLICY IF EXISTS "golf_rounds_insert" ON golf_rounds;
DROP POLICY IF EXISTS "golf_rounds_update" ON golf_rounds;
DROP POLICY IF EXISTS "golf_rounds_delete" ON golf_rounds;

CREATE POLICY "golf_rounds_select" ON golf_rounds FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "golf_rounds_insert" ON golf_rounds FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "golf_rounds_update" ON golf_rounds FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "golf_rounds_delete" ON golf_rounds FOR DELETE USING (user_id = auth.uid());

-- ── disc_golf_rounds ───────────────────────────
DROP POLICY IF EXISTS "disc_golf_rounds_select" ON disc_golf_rounds;
DROP POLICY IF EXISTS "disc_golf_rounds_insert" ON disc_golf_rounds;
DROP POLICY IF EXISTS "disc_golf_rounds_update" ON disc_golf_rounds;
DROP POLICY IF EXISTS "disc_golf_rounds_delete" ON disc_golf_rounds;

CREATE POLICY "disc_golf_rounds_select" ON disc_golf_rounds FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "disc_golf_rounds_insert" ON disc_golf_rounds FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "disc_golf_rounds_update" ON disc_golf_rounds FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "disc_golf_rounds_delete" ON disc_golf_rounds FOR DELETE USING (user_id = auth.uid());

-- ── hiking_sessions ────────────────────────────
DROP POLICY IF EXISTS "hiking_sessions_select" ON hiking_sessions;
DROP POLICY IF EXISTS "hiking_sessions_insert" ON hiking_sessions;
DROP POLICY IF EXISTS "hiking_sessions_update" ON hiking_sessions;
DROP POLICY IF EXISTS "hiking_sessions_delete" ON hiking_sessions;

CREATE POLICY "hiking_sessions_select" ON hiking_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "hiking_sessions_insert" ON hiking_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "hiking_sessions_update" ON hiking_sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "hiking_sessions_delete" ON hiking_sessions FOR DELETE USING (user_id = auth.uid());

-- ── table_tennis_games ─────────────────────────
DROP POLICY IF EXISTS "table_tennis_games_select" ON table_tennis_games;
DROP POLICY IF EXISTS "table_tennis_games_insert" ON table_tennis_games;
DROP POLICY IF EXISTS "table_tennis_games_update" ON table_tennis_games;
DROP POLICY IF EXISTS "table_tennis_games_delete" ON table_tennis_games;

CREATE POLICY "table_tennis_games_select" ON table_tennis_games FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "table_tennis_games_insert" ON table_tennis_games FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "table_tennis_games_update" ON table_tennis_games FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "table_tennis_games_delete" ON table_tennis_games FOR DELETE USING (user_id = auth.uid());

-- ── chess_games ────────────────────────────────
DROP POLICY IF EXISTS "chess_games_select" ON chess_games;
DROP POLICY IF EXISTS "chess_games_insert" ON chess_games;
DROP POLICY IF EXISTS "chess_games_update" ON chess_games;
DROP POLICY IF EXISTS "chess_games_delete" ON chess_games;

CREATE POLICY "chess_games_select" ON chess_games FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "chess_games_insert" ON chess_games FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "chess_games_update" ON chess_games FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "chess_games_delete" ON chess_games FOR DELETE USING (user_id = auth.uid());

-- ── volleyball_sessions ────────────────────────
DROP POLICY IF EXISTS "volleyball_sessions_select" ON volleyball_sessions;
DROP POLICY IF EXISTS "volleyball_sessions_insert" ON volleyball_sessions;
DROP POLICY IF EXISTS "volleyball_sessions_update" ON volleyball_sessions;
DROP POLICY IF EXISTS "volleyball_sessions_delete" ON volleyball_sessions;

CREATE POLICY "volleyball_sessions_select" ON volleyball_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "volleyball_sessions_insert" ON volleyball_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "volleyball_sessions_update" ON volleyball_sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "volleyball_sessions_delete" ON volleyball_sessions FOR DELETE USING (user_id = auth.uid());

-- ── spikeball_games ────────────────────────────
DROP POLICY IF EXISTS "spikeball_games_select" ON spikeball_games;
DROP POLICY IF EXISTS "spikeball_games_insert" ON spikeball_games;
DROP POLICY IF EXISTS "spikeball_games_update" ON spikeball_games;
DROP POLICY IF EXISTS "spikeball_games_delete" ON spikeball_games;

CREATE POLICY "spikeball_games_select" ON spikeball_games FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "spikeball_games_insert" ON spikeball_games FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "spikeball_games_update" ON spikeball_games FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "spikeball_games_delete" ON spikeball_games FOR DELETE USING (user_id = auth.uid());

-- ── pool_games ─────────────────────────────────
DROP POLICY IF EXISTS "pool_games_select" ON pool_games;
DROP POLICY IF EXISTS "pool_games_insert" ON pool_games;
DROP POLICY IF EXISTS "pool_games_update" ON pool_games;
DROP POLICY IF EXISTS "pool_games_delete" ON pool_games;

CREATE POLICY "pool_games_select" ON pool_games FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pool_games_insert" ON pool_games FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "pool_games_update" ON pool_games FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pool_games_delete" ON pool_games FOR DELETE USING (user_id = auth.uid());


-- ── bodyweight_log ─────────────────────────────
DROP POLICY IF EXISTS "bodyweight_log_select" ON bodyweight_log;
DROP POLICY IF EXISTS "bodyweight_log_insert" ON bodyweight_log;
DROP POLICY IF EXISTS "bodyweight_log_update" ON bodyweight_log;
DROP POLICY IF EXISTS "bodyweight_log_delete" ON bodyweight_log;

CREATE POLICY "bodyweight_log_select" ON bodyweight_log FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bodyweight_log_insert" ON bodyweight_log FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bodyweight_log_update" ON bodyweight_log FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "bodyweight_log_delete" ON bodyweight_log FOR DELETE USING (user_id = auth.uid());

-- ── to_read ────────────────────────────────────
DROP POLICY IF EXISTS "to_read_select" ON to_read;
DROP POLICY IF EXISTS "to_read_insert" ON to_read;
DROP POLICY IF EXISTS "to_read_update" ON to_read;
DROP POLICY IF EXISTS "to_read_delete" ON to_read;

CREATE POLICY "to_read_select" ON to_read FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "to_read_insert" ON to_read FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "to_read_update" ON to_read FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "to_read_delete" ON to_read FOR DELETE USING (user_id = auth.uid());


-- ══════════════════════════════════════════════
-- REFERENCE TABLES — public read, no client writes
-- ══════════════════════════════════════════════

-- ── exercises ──────────────────────────────────
DROP POLICY IF EXISTS "exercises_select" ON exercises;
CREATE POLICY "exercises_select" ON exercises FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policies — reference data managed via Supabase dashboard only

-- ── exercise_muscle_activations ────────────────
DROP POLICY IF EXISTS "exercise_muscle_activations_select" ON exercise_muscle_activations;
CREATE POLICY "exercise_muscle_activations_select" ON exercise_muscle_activations FOR SELECT USING (true);


-- ══════════════════════════════════════════════
-- PROFILE / SOCIAL TABLES
-- ══════════════════════════════════════════════

-- ── public_profiles ────────────────────────────
-- Own row: full control. Other users: read only (leaderboard).
DROP POLICY IF EXISTS "public_profiles_select_all"    ON public_profiles;
DROP POLICY IF EXISTS "public_profiles_insert_own"    ON public_profiles;
DROP POLICY IF EXISTS "public_profiles_update_own"    ON public_profiles;
DROP POLICY IF EXISTS "public_profiles_delete_own"    ON public_profiles;

-- Authenticated users can view all leaderboard profiles
CREATE POLICY "public_profiles_select_all" ON public_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only create/modify/delete their own profile
CREATE POLICY "public_profiles_insert_own" ON public_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "public_profiles_update_own" ON public_profiles
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "public_profiles_delete_own" ON public_profiles
  FOR DELETE USING (user_id = auth.uid());

-- ── user_privacy_settings (optional — skip if table doesn't exist yet) ──
DO $$ BEGIN
  ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "user_privacy_settings_select" ON user_privacy_settings;
  DROP POLICY IF EXISTS "user_privacy_settings_insert" ON user_privacy_settings;
  DROP POLICY IF EXISTS "user_privacy_settings_update" ON user_privacy_settings;
  DROP POLICY IF EXISTS "user_privacy_settings_delete" ON user_privacy_settings;
  CREATE POLICY "user_privacy_settings_select" ON user_privacy_settings FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY "user_privacy_settings_insert" ON user_privacy_settings FOR INSERT WITH CHECK (user_id = auth.uid());
  CREATE POLICY "user_privacy_settings_update" ON user_privacy_settings FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  CREATE POLICY "user_privacy_settings_delete" ON user_privacy_settings FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'user_privacy_settings does not exist — skipping';
END $$;

-- ── user_audit_log (optional — append-only, written via Edge Function service_role) ──
DO $$ BEGIN
  ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "user_audit_log_select" ON user_audit_log;
  -- SELECT only — no INSERT/UPDATE/DELETE; Edge Functions use service_role which bypasses RLS
  CREATE POLICY "user_audit_log_select" ON user_audit_log FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'user_audit_log does not exist — skipping';
END $$;

-- ── user_follows (optional — follower can read/write own follows) ──
DO $$ BEGIN
  ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "user_follows_select" ON user_follows;
  DROP POLICY IF EXISTS "user_follows_insert" ON user_follows;
  DROP POLICY IF EXISTS "user_follows_delete" ON user_follows;
  CREATE POLICY "user_follows_select" ON user_follows
    FOR SELECT USING (follower_id = auth.uid() OR following_id = auth.uid());
  CREATE POLICY "user_follows_insert" ON user_follows
    FOR INSERT WITH CHECK (follower_id = auth.uid());
  CREATE POLICY "user_follows_delete" ON user_follows
    FOR DELETE USING (follower_id = auth.uid());
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'user_follows does not exist — skipping';
END $$;

-- ── user_blocks (optional — blocker controls their own block list) ──
DO $$ BEGIN
  ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "user_blocks_select" ON user_blocks;
  DROP POLICY IF EXISTS "user_blocks_insert" ON user_blocks;
  DROP POLICY IF EXISTS "user_blocks_delete" ON user_blocks;
  CREATE POLICY "user_blocks_select" ON user_blocks
    FOR SELECT USING (blocker_id = auth.uid());
  CREATE POLICY "user_blocks_insert" ON user_blocks
    FOR INSERT WITH CHECK (blocker_id = auth.uid());
  CREATE POLICY "user_blocks_delete" ON user_blocks
    FOR DELETE USING (blocker_id = auth.uid());
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'user_blocks does not exist — skipping';
END $$;


-- ══════════════════════════════════════════════
-- VERIFICATION QUERY
-- After running, execute this to confirm all
-- tables have RLS enabled and at least 1 policy.
-- ══════════════════════════════════════════════
/*
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policies p WHERE p.tablename = t.tablename) AS policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
*/
