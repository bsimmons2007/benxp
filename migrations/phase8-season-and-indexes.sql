-- ============================================================
-- Phase 8 — Season aggregate parity + activity-table indexes
-- Run this in the Supabase SQL Editor (youxp project).
-- Safe to re-run: CREATE INDEX IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================
--
-- 1. (user_id, date) indexes on every activity table that has a date
--    column (user_id-only where it doesn't) — speeds up get_xp_aggregates
--    and fetchXPAndStats's per-table row fetches. meals and
--    push_subscriptions already have indexes from prior phases — skipped.
-- 2. get_xp_aggregates() replaced with _season variants added for every
--    dimension that seasonAggregatesFromRpc (src/lib/xp.ts) previously
--    hardcoded to 0: challenge_xp, goal_xp, measurement_count, and all
--    sport aggregates. Rates stay in src/lib/xp.ts.
-- ============================================================

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS lifting_log_user_date_idx        ON lifting_log        (user_id, date);
CREATE INDEX IF NOT EXISTS pr_history_user_date_idx         ON pr_history         (user_id, date);
CREATE INDEX IF NOT EXISTS skate_sessions_user_date_idx     ON skate_sessions     (user_id, date);
CREATE INDEX IF NOT EXISTS books_user_date_idx              ON books              (user_id, date_finished);
CREATE INDEX IF NOT EXISTS fortnite_games_user_date_idx     ON fortnite_games     (user_id, date);
CREATE INDEX IF NOT EXISTS sleep_log_user_date_idx          ON sleep_log          (user_id, date);
CREATE INDEX IF NOT EXISTS cardio_sessions_user_date_idx    ON cardio_sessions    (user_id, date);
CREATE INDEX IF NOT EXISTS mood_log_user_date_idx           ON mood_log           (user_id, date);
CREATE INDEX IF NOT EXISTS body_measurements_user_date_idx  ON body_measurements  (user_id, date);
CREATE INDEX IF NOT EXISTS water_log_user_date_idx          ON water_log          (user_id, date);
CREATE INDEX IF NOT EXISTS basketball_sessions_user_date_idx ON basketball_sessions (user_id, date);
CREATE INDEX IF NOT EXISTS pickleball_games_user_date_idx   ON pickleball_games   (user_id, date);
CREATE INDEX IF NOT EXISTS golf_rounds_user_date_idx        ON golf_rounds        (user_id, date);
CREATE INDEX IF NOT EXISTS disc_golf_rounds_user_date_idx   ON disc_golf_rounds   (user_id, date);
CREATE INDEX IF NOT EXISTS hiking_sessions_user_date_idx    ON hiking_sessions    (user_id, date);
CREATE INDEX IF NOT EXISTS table_tennis_games_user_date_idx ON table_tennis_games (user_id, date);
CREATE INDEX IF NOT EXISTS chess_games_user_date_idx        ON chess_games        (user_id, date);
CREATE INDEX IF NOT EXISTS volleyball_sessions_user_date_idx ON volleyball_sessions (user_id, date);
CREATE INDEX IF NOT EXISTS spikeball_games_user_date_idx    ON spikeball_games    (user_id, date);
CREATE INDEX IF NOT EXISTS pool_games_user_date_idx         ON pool_games         (user_id, date);

-- No date column — user_id-only lookup indexes
CREATE INDEX IF NOT EXISTS goals_user_idx      ON goals      (user_id);
CREATE INDEX IF NOT EXISTS challenges_user_idx ON challenges (user_id);

-- ============================================================
-- get_xp_aggregates — full replacement (phase7 body + _season keys)
-- ============================================================

create or replace function public.get_xp_aggregates(uid uuid)
returns jsonb
language sql
security invoker
stable
as $$
  -- jsonb_build_object caps at 100 arguments, so the doc is built in
  -- chunks concatenated with ||. challenges/goals have no `date` column —
  -- season cutoff uses coalesce(completed_at, created_at) >= jan1.
  with y as (select date_trunc('year', now())::date as jan1)
  select jsonb_build_object(
    -- lifting
    'set_count',            (select count(*) from lifting_log where user_id = uid),
    'set_count_season',     (select count(*) from lifting_log, y where user_id = uid and date >= y.jan1),
    'workout_days',         (select count(distinct date) from lifting_log where user_id = uid),
    'workout_days_season',  (select count(distinct date) from lifting_log, y where user_id = uid and date >= y.jan1),
    -- PRs
    'pr_count',             (select count(*) from pr_history where user_id = uid),
    'pr_count_season',      (select count(*) from pr_history, y where user_id = uid and date >= y.jan1),
    -- books
    'book_count',           (select count(*) from books where user_id = uid and date_finished is not null),
    'book_count_season',    (select count(*) from books, y where user_id = uid and date_finished is not null and date_finished >= y.jan1),
    -- skate
    'skate_miles',          (select coalesce(sum(miles), 0) from skate_sessions where user_id = uid),
    'skate_miles_season',   (select coalesce(sum(miles), 0) from skate_sessions, y where user_id = uid and date >= y.jan1),
    -- fortnite: win/blitz/kill split so XP rates can differ per mode
    'fn_wins',              (select count(*) from fortnite_games where user_id = uid and win and not (mode = 'Blitz' or mode like 'Blitz %')),
    'fn_wins_season',       (select count(*) from fortnite_games, y where user_id = uid and win and not (mode = 'Blitz' or mode like 'Blitz %') and date >= y.jan1),
    'fn_blitz_wins',        (select count(*) from fortnite_games where user_id = uid and win and (mode = 'Blitz' or mode like 'Blitz %')),
    'fn_blitz_wins_season', (select count(*) from fortnite_games, y where user_id = uid and win and (mode = 'Blitz' or mode like 'Blitz %') and date >= y.jan1),
    'fn_kills',             (select coalesce(sum(kills), 0) from fortnite_games where user_id = uid),
    'fn_kills_season',      (select coalesce(sum(kills), 0) from fortnite_games, y where user_id = uid and date >= y.jan1),
    -- sleep (non-nap): log count + quality-bonus (>=7h) count
    'sleep_nights',         (select count(*) from sleep_log where user_id = uid and not is_nap),
    'sleep_nights_season',  (select count(*) from sleep_log, y where user_id = uid and not is_nap and date >= y.jan1),
    'sleep_quality',        (select count(*) from sleep_log where user_id = uid and not is_nap and coalesce(hours_slept, 0) >= 7),
    'sleep_quality_season', (select count(*) from sleep_log, y where user_id = uid and not is_nap and coalesce(hours_slept, 0) >= 7 and date >= y.jan1)
  ) || jsonb_build_object(
    -- cardio miles by activity type
    'cardio_run_mi',        (select coalesce(sum(distance_miles), 0) from cardio_sessions where user_id = uid and activity = 'run'),
    'cardio_bike_mi',       (select coalesce(sum(distance_miles), 0) from cardio_sessions where user_id = uid and activity = 'bike'),
    'cardio_swim_mi',       (select coalesce(sum(distance_miles), 0) from cardio_sessions where user_id = uid and activity = 'swim'),
    'cardio_walk_mi',       (select coalesce(sum(distance_miles), 0) from cardio_sessions where user_id = uid and activity = 'walk'),
    'cardio_other_mi',      (select coalesce(sum(distance_miles), 0) from cardio_sessions where user_id = uid and activity not in ('run','bike','swim','walk')),
    'cardio_run_mi_season',   (select coalesce(sum(distance_miles), 0) from cardio_sessions, y where user_id = uid and activity = 'run'  and date >= y.jan1),
    'cardio_bike_mi_season',  (select coalesce(sum(distance_miles), 0) from cardio_sessions, y where user_id = uid and activity = 'bike' and date >= y.jan1),
    'cardio_swim_mi_season',  (select coalesce(sum(distance_miles), 0) from cardio_sessions, y where user_id = uid and activity = 'swim' and date >= y.jan1),
    'cardio_walk_mi_season',  (select coalesce(sum(distance_miles), 0) from cardio_sessions, y where user_id = uid and activity = 'walk' and date >= y.jan1),
    'cardio_other_mi_season', (select coalesce(sum(distance_miles), 0) from cardio_sessions, y where user_id = uid and activity not in ('run','bike','swim','walk') and date >= y.jan1),
    -- completed/claimed challenge XP (no date column — use coalesce(completed_at, created_at))
    'challenge_xp',         (select coalesce(sum(xp_reward), 0) from challenges where user_id = uid and status in ('completed','claimed')),
    'challenge_xp_season',  (select coalesce(sum(xp_reward), 0) from challenges, y where user_id = uid and status in ('completed','claimed') and coalesce(completed_at, created_at) >= y.jan1),
    -- completed goal XP (no date column — use coalesce(completed_at, created_at))
    'goal_xp',              (select coalesce(sum(xp_reward), 0) from goals where user_id = uid and status = 'completed'),
    'goal_xp_season',       (select coalesce(sum(xp_reward), 0) from goals, y where user_id = uid and status = 'completed' and coalesce(completed_at, created_at) >= y.jan1),
    -- mood + measurement logs
    'mood_count',           (select count(*) from mood_log where user_id = uid),
    'mood_count_season',    (select count(*) from mood_log, y where user_id = uid and date >= y.jan1),
    'measurement_count',        (select count(*) from body_measurements where user_id = uid),
    'measurement_count_season', (select count(*) from body_measurements, y where user_id = uid and date >= y.jan1),
    -- water goal days (>=64oz aggregated per date)
    'water_goal_days',      (select count(*) from (select date from water_log where user_id = uid group by date having sum(oz) >= 64) w),
    'water_goal_days_season', (select count(*) from (select date from water_log, y where user_id = uid and date >= y.jan1 group by date having sum(oz) >= 64) w)
  ) || jsonb_build_object(
    -- basketball: session count + total points
    'bb_sessions',          (select count(*) from basketball_sessions where user_id = uid),
    'bb_sessions_season',   (select count(*) from basketball_sessions, y where user_id = uid and date >= y.jan1),
    'bb_points',            (select coalesce(sum(points), 0) from basketball_sessions where user_id = uid),
    'bb_points_season',     (select coalesce(sum(points), 0) from basketball_sessions, y where user_id = uid and date >= y.jan1),
    -- pickleball
    'pb_games',             (select count(*) from pickleball_games where user_id = uid),
    'pb_games_season',      (select count(*) from pickleball_games, y where user_id = uid and date >= y.jan1),
    'pb_wins',              (select count(*) from pickleball_games where user_id = uid and win),
    'pb_wins_season',       (select count(*) from pickleball_games, y where user_id = uid and win and date >= y.jan1),
    -- golf: round count + total strokes under par
    'golf_rounds',          (select count(*) from golf_rounds where user_id = uid),
    'golf_rounds_season',   (select count(*) from golf_rounds, y where user_id = uid and date >= y.jan1),
    'golf_under_par',       (select coalesce(sum(greatest(par - score, 0)), 0) from golf_rounds where user_id = uid),
    'golf_under_par_season',(select coalesce(sum(greatest(par - score, 0)), 0) from golf_rounds, y where user_id = uid and date >= y.jan1),
    -- disc golf
    'dg_rounds',            (select count(*) from disc_golf_rounds where user_id = uid),
    'dg_rounds_season',     (select count(*) from disc_golf_rounds, y where user_id = uid and date >= y.jan1),
    'dg_under_par',         (select coalesce(sum(greatest(par - score, 0)), 0) from disc_golf_rounds where user_id = uid),
    'dg_under_par_season',  (select coalesce(sum(greatest(par - score, 0)), 0) from disc_golf_rounds, y where user_id = uid and date >= y.jan1),
    -- hiking: miles + 500ft elevation buckets
    'hike_miles',           (select coalesce(sum(distance_miles), 0) from hiking_sessions where user_id = uid),
    'hike_miles_season',    (select coalesce(sum(distance_miles), 0) from hiking_sessions, y where user_id = uid and date >= y.jan1),
    'hike_elev_buckets',        (select coalesce(sum(floor(coalesce(elevation_gain_ft, 0) / 500.0)), 0) from hiking_sessions where user_id = uid),
    'hike_elev_buckets_season', (select coalesce(sum(floor(coalesce(elevation_gain_ft, 0) / 500.0)), 0) from hiking_sessions, y where user_id = uid and date >= y.jan1)
  ) || jsonb_build_object(
    -- table tennis
    'tt_games',             (select count(*) from table_tennis_games where user_id = uid),
    'tt_games_season',      (select count(*) from table_tennis_games, y where user_id = uid and date >= y.jan1),
    'tt_wins',              (select count(*) from table_tennis_games where user_id = uid and win),
    'tt_wins_season',       (select count(*) from table_tennis_games, y where user_id = uid and win and date >= y.jan1),
    -- chess
    'chess_games',          (select count(*) from chess_games where user_id = uid),
    'chess_games_season',   (select count(*) from chess_games, y where user_id = uid and date >= y.jan1),
    'chess_wins',           (select count(*) from chess_games where user_id = uid and result = 'win'),
    'chess_wins_season',    (select count(*) from chess_games, y where user_id = uid and result = 'win' and date >= y.jan1),
    'chess_draws',          (select count(*) from chess_games where user_id = uid and result = 'draw'),
    'chess_draws_season',   (select count(*) from chess_games, y where user_id = uid and result = 'draw' and date >= y.jan1),
    -- volleyball
    'vb_games',             (select count(*) from volleyball_sessions where user_id = uid),
    'vb_games_season',      (select count(*) from volleyball_sessions, y where user_id = uid and date >= y.jan1),
    'vb_wins',              (select count(*) from volleyball_sessions where user_id = uid and win),
    'vb_wins_season',       (select count(*) from volleyball_sessions, y where user_id = uid and win and date >= y.jan1),
    -- spikeball
    'sb_games',             (select count(*) from spikeball_games where user_id = uid),
    'sb_games_season',      (select count(*) from spikeball_games, y where user_id = uid and date >= y.jan1),
    'sb_wins',              (select count(*) from spikeball_games where user_id = uid and win),
    'sb_wins_season',       (select count(*) from spikeball_games, y where user_id = uid and win and date >= y.jan1),
    -- pool
    'pool_games',           (select count(*) from pool_games where user_id = uid),
    'pool_games_season',    (select count(*) from pool_games, y where user_id = uid and date >= y.jan1),
    'pool_wins',            (select count(*) from pool_games where user_id = uid and win),
    'pool_wins_season',     (select count(*) from pool_games, y where user_id = uid and win and date >= y.jan1),
    'pool_bnr',             (select count(*) from pool_games where user_id = uid and break_and_run),
    'pool_bnr_season',      (select count(*) from pool_games, y where user_id = uid and break_and_run and date >= y.jan1)
  ) || jsonb_build_object(
    -- nutrition: meals per day capped at 4, full days (>= 3 meals)
    'meals_logged',              (select coalesce(sum(least(cnt, 4)), 0) from (select count(*) as cnt from meals where user_id = uid group by date) m),
    'meals_logged_season',       (select coalesce(sum(least(cnt, 4)), 0) from (select count(*) as cnt from meals, y where user_id = uid and date >= y.jan1 group by date) m),
    'nutrition_full_days',       (select count(*) from (select date from meals where user_id = uid group by date having count(*) >= 3) m),
    'nutrition_full_days_season',(select count(*) from (select date from meals, y where user_id = uid and date >= y.jan1 group by date having count(*) >= 3) m)
  );
$$;

-- Allow logged-in users to call it (RLS still restricts rows to their own).
grant execute on function public.get_xp_aggregates(uuid) to authenticated;
