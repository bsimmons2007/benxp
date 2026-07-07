-- ============================================================
-- Phase 7 — Nutrition / calorie tracking
-- Run this in the Supabase SQL Editor (youxp project).
-- Safe to re-run: CREATE IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================
--
-- 1. meals table — per-meal calorie/macro entries
-- 2. Owner-only RLS policies (same pattern as every activity table)
-- 3. get_xp_aggregates() replaced with meal aggregates added:
--      meals_logged        — meals per day capped at 4 (anti-farming)
--      nutrition_full_days — days with >= 3 meals logged
--    plus *_season variants. Rates stay in src/lib/xp.ts.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meals (
  "id" uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "created_at" timestamp with time zone DEFAULT now(),
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "meal_type" text NOT NULL,
  "name" text,
  "calories" integer NOT NULL,
  "protein_g" numeric,
  "carbs_g" numeric,
  "fat_g" numeric,
  "notes" text
);

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meals_select" ON meals;
DROP POLICY IF EXISTS "meals_insert" ON meals;
DROP POLICY IF EXISTS "meals_update" ON meals;
DROP POLICY IF EXISTS "meals_delete" ON meals;

CREATE POLICY "meals_select" ON meals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "meals_insert" ON meals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "meals_update" ON meals FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "meals_delete" ON meals FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS meals_user_date_idx ON meals (user_id, date);

-- ============================================================
-- get_xp_aggregates — full replacement (phase4 body + meal keys)
-- ============================================================

create or replace function public.get_xp_aggregates(uid uuid)
returns jsonb
language sql
security invoker
stable
as $$
  -- jsonb_build_object caps at 100 arguments, so the doc is built in four
  -- chunks concatenated with ||.
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
    -- completed/claimed challenge XP
    'challenge_xp',         (select coalesce(sum(xp_reward), 0) from challenges where user_id = uid and status in ('completed','claimed')),
    -- completed goal XP
    'goal_xp',              (select coalesce(sum(xp_reward), 0) from goals where user_id = uid and status = 'completed'),
    -- mood + measurement logs
    'mood_count',           (select count(*) from mood_log where user_id = uid),
    'mood_count_season',    (select count(*) from mood_log, y where user_id = uid and date >= y.jan1),
    'measurement_count',    (select count(*) from body_measurements where user_id = uid),
    -- water goal days (>=64oz aggregated per date)
    'water_goal_days',      (select count(*) from (select date from water_log where user_id = uid group by date having sum(oz) >= 64) w),
    'water_goal_days_season', (select count(*) from (select date from water_log, y where user_id = uid and date >= y.jan1 group by date having sum(oz) >= 64) w)
  ) || jsonb_build_object(
    -- basketball: session count + total points
    'bb_sessions',          (select count(*) from basketball_sessions where user_id = uid),
    'bb_points',            (select coalesce(sum(points), 0) from basketball_sessions where user_id = uid),
    -- pickleball
    'pb_games',             (select count(*) from pickleball_games where user_id = uid),
    'pb_wins',              (select count(*) from pickleball_games where user_id = uid and win),
    -- golf: round count + total strokes under par
    'golf_rounds',          (select count(*) from golf_rounds where user_id = uid),
    'golf_under_par',       (select coalesce(sum(greatest(par - score, 0)), 0) from golf_rounds where user_id = uid),
    -- disc golf
    'dg_rounds',            (select count(*) from disc_golf_rounds where user_id = uid),
    'dg_under_par',         (select coalesce(sum(greatest(par - score, 0)), 0) from disc_golf_rounds where user_id = uid),
    -- hiking: miles + 500ft elevation buckets
    'hike_miles',           (select coalesce(sum(distance_miles), 0) from hiking_sessions where user_id = uid),
    'hike_elev_buckets',    (select coalesce(sum(floor(coalesce(elevation_gain_ft, 0) / 500.0)), 0) from hiking_sessions where user_id = uid),
    -- table tennis
    'tt_games',             (select count(*) from table_tennis_games where user_id = uid),
    'tt_wins',              (select count(*) from table_tennis_games where user_id = uid and win),
    -- chess
    'chess_games',          (select count(*) from chess_games where user_id = uid),
    'chess_wins',           (select count(*) from chess_games where user_id = uid and result = 'win'),
    'chess_draws',          (select count(*) from chess_games where user_id = uid and result = 'draw'),
    -- volleyball
    'vb_games',             (select count(*) from volleyball_sessions where user_id = uid),
    'vb_wins',              (select count(*) from volleyball_sessions where user_id = uid and win),
    -- spikeball
    'sb_games',             (select count(*) from spikeball_games where user_id = uid),
    'sb_wins',              (select count(*) from spikeball_games where user_id = uid and win),
    -- pool
    'pool_games',           (select count(*) from pool_games where user_id = uid),
    'pool_wins',            (select count(*) from pool_games where user_id = uid and win),
    'pool_bnr',             (select count(*) from pool_games where user_id = uid and break_and_run)
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
