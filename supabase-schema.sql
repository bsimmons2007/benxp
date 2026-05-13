-- Supabase schema dump for project vgizwizpqfjcptyyfmvi (XP logger / benxp)
-- Generated 2026-05-13T04:29:22.855Z

-- =========
-- TABLES
-- =========

CREATE TABLE IF NOT EXISTS public."basketball_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "fg_made" integer NOT NULL DEFAULT 0,
  "fg_attempted" integer NOT NULL DEFAULT 0,
  "three_made" integer NOT NULL DEFAULT 0,
  "three_attempted" integer NOT NULL DEFAULT 0,
  "ft_made" integer NOT NULL DEFAULT 0,
  "ft_attempted" integer NOT NULL DEFAULT 0,
  "points" integer NOT NULL DEFAULT 0,
  "assists" integer NOT NULL DEFAULT 0,
  "rebounds" integer NOT NULL DEFAULT 0,
  "steals" integer NOT NULL DEFAULT 0,
  "blocks" integer NOT NULL DEFAULT 0,
  "turnovers" integer NOT NULL DEFAULT 0,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."body_measurements" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "weight_lbs" double precision,
  "chest_in" double precision,
  "waist_in" double precision,
  "hips_in" double precision,
  "neck_in" double precision,
  "shoulders_in" double precision,
  "bicep_l_in" double precision,
  "bicep_r_in" double precision,
  "forearm_in" double precision,
  "thigh_l_in" double precision,
  "thigh_r_in" double precision,
  "calf_in" double precision,
  "body_fat_pct" double precision,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."bodyweight_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "weight_lbs" numeric NOT NULL,
  "user_id" uuid
);

CREATE TABLE IF NOT EXISTS public."books" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "date_finished" date,
  "title" text NOT NULL,
  "author" text,
  "genre" text,
  "pages" integer,
  "rating" numeric,
  "user_id" uuid
);

CREATE TABLE IF NOT EXISTS public."cardio_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "activity" text NOT NULL DEFAULT 'run'::text,
  "distance_miles" numeric NOT NULL,
  "duration_mins" integer,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."challenges" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "tier" text NOT NULL,
  "challenge_name" text NOT NULL,
  "category" text,
  "target" text,
  "xp_reward" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'active'::text,
  "auto_verified" boolean DEFAULT false,
  "notes" text,
  "completed_at" timestamp with time zone,
  "user_id" uuid
);

CREATE TABLE IF NOT EXISTS public."chess_games" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "result" text NOT NULL,
  "rating_after" integer,
  "time_control" text DEFAULT 'Blitz'::text,
  "color" text,
  "opponent" text,
  "opening" text,
  "notes" text
);

CREATE TABLE IF NOT EXISTS public."disc_golf_rounds" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "course" text NOT NULL,
  "holes" smallint NOT NULL DEFAULT 18,
  "score" integer NOT NULL,
  "par" integer NOT NULL DEFAULT 54,
  "notes" text
);

CREATE TABLE IF NOT EXISTS public."energy_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "rating" integer NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."exercise_muscle_activations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "exercise_id" uuid NOT NULL,
  "muscle_key" text NOT NULL,
  "activation" numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS public."exercises" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "muscle_group" text,
  "equipment" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "type" text DEFAULT 'isolation'::text,
  "weight_multiplier" numeric DEFAULT 0.45
);

CREATE TABLE IF NOT EXISTS public."fortnite_games" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "mode" text,
  "season" text,
  "placement" integer,
  "kills" integer NOT NULL DEFAULT 0,
  "accuracy" numeric,
  "win" boolean DEFAULT false,
  "user_id" uuid,
  "is_ranked" boolean DEFAULT false,
  "rank_name" text
);

CREATE TABLE IF NOT EXISTS public."goals" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "metric_key" text NOT NULL DEFAULT 'manual'::text,
  "target_value" numeric NOT NULL,
  "target_unit" text DEFAULT ''::text,
  "xp_reward" integer DEFAULT 500,
  "status" text DEFAULT 'active'::text,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."golf_rounds" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "course" text NOT NULL,
  "holes" smallint NOT NULL DEFAULT 18,
  "score" integer NOT NULL,
  "par" integer NOT NULL DEFAULT 72,
  "putts" integer,
  "fairways_hit" integer,
  "fairways_possible" integer,
  "gir" integer,
  "notes" text
);

CREATE TABLE IF NOT EXISTS public."hiking_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "trail" text NOT NULL,
  "distance_miles" numeric(5,2) NOT NULL,
  "elevation_gain_ft" integer,
  "duration_mins" integer,
  "difficulty" text,
  "notes" text
);

CREATE TABLE IF NOT EXISTS public."lifting_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "bodyweight" numeric,
  "lift" text NOT NULL,
  "weight" numeric,
  "sets" integer,
  "reps" integer,
  "volume" numeric,
  "est_1rm" numeric,
  "is_pr" boolean DEFAULT false,
  "user_id" uuid,
  "rpe" numeric,
  "rest_secs" integer,
  "duration_secs" integer
);

CREATE TABLE IF NOT EXISTS public."mood_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "mood" integer,
  "energy" integer,
  "stress" integer,
  "activities" text,
  "notes" text,
  "user_id" uuid
);

CREATE TABLE IF NOT EXISTS public."muscles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "key" text NOT NULL,
  "name" text NOT NULL,
  "group_name" text NOT NULL,
  "body_side" text NOT NULL DEFAULT 'front'::text,
  "size_weight" numeric NOT NULL DEFAULT 0.5,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."pickleball_games" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "date" date NOT NULL,
  "win" boolean NOT NULL DEFAULT false,
  "my_score" integer,
  "opp_score" integer,
  "game_type" text NOT NULL DEFAULT 'Singles'::text,
  "opponent" text,
  "notes" text
);

CREATE TABLE IF NOT EXISTS public."pool_games" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "win" boolean NOT NULL,
  "game_type" text NOT NULL DEFAULT '8-Ball'::text,
  "opponent" text,
  "run_count" integer,
  "break_and_run" boolean DEFAULT false,
  "notes" text
);

CREATE TABLE IF NOT EXISTS public."pr_history" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "lift" text NOT NULL,
  "est_1rm" numeric NOT NULL,
  "notes" text,
  "user_id" uuid
);

CREATE TABLE IF NOT EXISTS public."skate_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "miles" numeric NOT NULL,
  "duration" text,
  "avg_pace" numeric,
  "fastest_mile" numeric,
  "calories" integer,
  "user_id" uuid
);

CREATE TABLE IF NOT EXISTS public."sleep_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "bedtime" text,
  "hours_slept" numeric,
  "wake_time" text,
  "sleep_score" integer,
  "user_id" uuid,
  "is_nap" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public."spikeball_games" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "win" boolean NOT NULL,
  "my_score" integer,
  "opp_score" integer,
  "partner" text,
  "opponents" text,
  "notes" text
);

CREATE TABLE IF NOT EXISTS public."table_tennis_games" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "win" boolean NOT NULL,
  "my_score" integer,
  "opp_score" integer,
  "game_type" text DEFAULT 'Singles'::text,
  "opponent" text,
  "notes" text
);

CREATE TABLE IF NOT EXISTS public."to_read" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamp with time zone DEFAULT now(),
  "title" text NOT NULL,
  "author" text,
  "genre" text,
  "priority" text,
  "notes" text,
  "user_id" uuid
);

CREATE TABLE IF NOT EXISTS public."volleyball_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "date" date NOT NULL,
  "format" text NOT NULL DEFAULT 'Indoor'::text,
  "win" boolean NOT NULL,
  "sets_won" integer,
  "sets_lost" integer,
  "aces" integer,
  "kills" integer,
  "blocks" integer,
  "digs" integer,
  "assists" integer,
  "my_score" integer,
  "opp_score" integer,
  "partner" text,
  "opponent" text,
  "notes" text
);

CREATE TABLE IF NOT EXISTS public."water_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "date" date NOT NULL,
  "oz" numeric NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now()
);

-- =========
-- PRIMARY/UNIQUE
-- =========

ALTER TABLE basketball_sessions ADD CONSTRAINT "basketball_sessions_pkey" PRIMARY KEY (id);
ALTER TABLE body_measurements ADD CONSTRAINT "body_measurements_pkey" PRIMARY KEY (id);
ALTER TABLE bodyweight_log ADD CONSTRAINT "bodyweight_log_pkey" PRIMARY KEY (id);
ALTER TABLE books ADD CONSTRAINT "books_pkey" PRIMARY KEY (id);
ALTER TABLE cardio_sessions ADD CONSTRAINT "cardio_sessions_pkey" PRIMARY KEY (id);
ALTER TABLE challenges ADD CONSTRAINT "challenges_pkey" PRIMARY KEY (id);
ALTER TABLE chess_games ADD CONSTRAINT "chess_games_pkey" PRIMARY KEY (id);
ALTER TABLE disc_golf_rounds ADD CONSTRAINT "disc_golf_rounds_pkey" PRIMARY KEY (id);
ALTER TABLE energy_log ADD CONSTRAINT "energy_log_pkey" PRIMARY KEY (id);
ALTER TABLE exercise_muscle_activations ADD CONSTRAINT "exercise_muscle_activations_exercise_id_muscle_key_key" UNIQUE (exercise_id, muscle_key);
ALTER TABLE exercise_muscle_activations ADD CONSTRAINT "exercise_muscle_activations_pkey" PRIMARY KEY (id);
ALTER TABLE exercises ADD CONSTRAINT "exercises_name_key" UNIQUE (name);
ALTER TABLE exercises ADD CONSTRAINT "exercises_pkey" PRIMARY KEY (id);
ALTER TABLE fortnite_games ADD CONSTRAINT "fortnite_games_pkey" PRIMARY KEY (id);
ALTER TABLE goals ADD CONSTRAINT "goals_pkey" PRIMARY KEY (id);
ALTER TABLE golf_rounds ADD CONSTRAINT "golf_rounds_pkey" PRIMARY KEY (id);
ALTER TABLE hiking_sessions ADD CONSTRAINT "hiking_sessions_pkey" PRIMARY KEY (id);
ALTER TABLE lifting_log ADD CONSTRAINT "lifting_log_pkey" PRIMARY KEY (id);
ALTER TABLE mood_log ADD CONSTRAINT "mood_log_pkey" PRIMARY KEY (id);
ALTER TABLE muscles ADD CONSTRAINT "muscles_key_key" UNIQUE (key);
ALTER TABLE muscles ADD CONSTRAINT "muscles_pkey" PRIMARY KEY (id);
ALTER TABLE pickleball_games ADD CONSTRAINT "pickleball_games_pkey" PRIMARY KEY (id);
ALTER TABLE pool_games ADD CONSTRAINT "pool_games_pkey" PRIMARY KEY (id);
ALTER TABLE pr_history ADD CONSTRAINT "pr_history_pkey" PRIMARY KEY (id);
ALTER TABLE skate_sessions ADD CONSTRAINT "skate_sessions_pkey" PRIMARY KEY (id);
ALTER TABLE sleep_log ADD CONSTRAINT "sleep_log_pkey" PRIMARY KEY (id);
ALTER TABLE spikeball_games ADD CONSTRAINT "spikeball_games_pkey" PRIMARY KEY (id);
ALTER TABLE table_tennis_games ADD CONSTRAINT "table_tennis_games_pkey" PRIMARY KEY (id);
ALTER TABLE to_read ADD CONSTRAINT "to_read_pkey" PRIMARY KEY (id);
ALTER TABLE volleyball_sessions ADD CONSTRAINT "volleyball_sessions_pkey" PRIMARY KEY (id);
ALTER TABLE water_log ADD CONSTRAINT "water_log_pkey" PRIMARY KEY (id);

-- =========
-- FOREIGN KEYS
-- =========

ALTER TABLE basketball_sessions ADD CONSTRAINT "basketball_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE body_measurements ADD CONSTRAINT "body_measurements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE bodyweight_log ADD CONSTRAINT "bodyweight_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE books ADD CONSTRAINT "books_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE cardio_sessions ADD CONSTRAINT "cardio_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE challenges ADD CONSTRAINT "challenges_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE chess_games ADD CONSTRAINT "chess_games_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE disc_golf_rounds ADD CONSTRAINT "disc_golf_rounds_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE energy_log ADD CONSTRAINT "energy_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE exercise_muscle_activations ADD CONSTRAINT "exercise_muscle_activations_exercise_id_fkey" FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE exercise_muscle_activations ADD CONSTRAINT "exercise_muscle_activations_muscle_key_fkey" FOREIGN KEY (muscle_key) REFERENCES muscles(key) ON DELETE CASCADE;
ALTER TABLE fortnite_games ADD CONSTRAINT "fortnite_games_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE goals ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE golf_rounds ADD CONSTRAINT "golf_rounds_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE hiking_sessions ADD CONSTRAINT "hiking_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE lifting_log ADD CONSTRAINT "lifting_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE mood_log ADD CONSTRAINT "mood_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE pickleball_games ADD CONSTRAINT "pickleball_games_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE pool_games ADD CONSTRAINT "pool_games_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE pr_history ADD CONSTRAINT "pr_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE skate_sessions ADD CONSTRAINT "skate_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE sleep_log ADD CONSTRAINT "sleep_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE spikeball_games ADD CONSTRAINT "spikeball_games_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE table_tennis_games ADD CONSTRAINT "table_tennis_games_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE to_read ADD CONSTRAINT "to_read_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE volleyball_sessions ADD CONSTRAINT "volleyball_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE water_log ADD CONSTRAINT "water_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- =========
-- CHECK CONSTRAINTS
-- =========

ALTER TABLE energy_log ADD CONSTRAINT "energy_log_rating_check" CHECK (((rating >= 1) AND (rating <= 10)));
ALTER TABLE exercise_muscle_activations ADD CONSTRAINT "exercise_muscle_activations_activation_check" CHECK (((activation > (0)::numeric) AND (activation <= (1)::numeric)));
ALTER TABLE lifting_log ADD CONSTRAINT "lifting_log_rest_secs_check" CHECK ((rest_secs >= 0));
ALTER TABLE lifting_log ADD CONSTRAINT "lifting_log_rpe_check" CHECK (((rpe >= (1)::numeric) AND (rpe <= (10)::numeric)));

-- =========
-- INDEXES
-- =========

CREATE UNIQUE INDEX basketball_sessions_pkey ON public.basketball_sessions USING btree (id);
CREATE INDEX basketball_sessions_user_date ON public.basketball_sessions USING btree (user_id, date DESC);
CREATE UNIQUE INDEX body_measurements_pkey ON public.body_measurements USING btree (id);
CREATE INDEX body_measurements_user_date ON public.body_measurements USING btree (user_id, date DESC);
CREATE UNIQUE INDEX bodyweight_log_pkey ON public.bodyweight_log USING btree (id);
CREATE UNIQUE INDEX books_pkey ON public.books USING btree (id);
CREATE UNIQUE INDEX cardio_sessions_pkey ON public.cardio_sessions USING btree (id);
CREATE UNIQUE INDEX challenges_pkey ON public.challenges USING btree (id);
CREATE UNIQUE INDEX chess_games_pkey ON public.chess_games USING btree (id);
CREATE UNIQUE INDEX disc_golf_rounds_pkey ON public.disc_golf_rounds USING btree (id);
CREATE UNIQUE INDEX energy_log_pkey ON public.energy_log USING btree (id);
CREATE UNIQUE INDEX exercise_muscle_activations_exercise_id_muscle_key_key ON public.exercise_muscle_activations USING btree (exercise_id, muscle_key);
CREATE UNIQUE INDEX exercise_muscle_activations_pkey ON public.exercise_muscle_activations USING btree (id);
CREATE UNIQUE INDEX exercises_name_key ON public.exercises USING btree (name);
CREATE UNIQUE INDEX exercises_pkey ON public.exercises USING btree (id);
CREATE UNIQUE INDEX fortnite_games_pkey ON public.fortnite_games USING btree (id);
CREATE UNIQUE INDEX goals_pkey ON public.goals USING btree (id);
CREATE UNIQUE INDEX golf_rounds_pkey ON public.golf_rounds USING btree (id);
CREATE UNIQUE INDEX hiking_sessions_pkey ON public.hiking_sessions USING btree (id);
CREATE UNIQUE INDEX lifting_log_pkey ON public.lifting_log USING btree (id);
CREATE UNIQUE INDEX mood_log_pkey ON public.mood_log USING btree (id);
CREATE UNIQUE INDEX muscles_key_key ON public.muscles USING btree (key);
CREATE UNIQUE INDEX muscles_pkey ON public.muscles USING btree (id);
CREATE UNIQUE INDEX pickleball_games_pkey ON public.pickleball_games USING btree (id);
CREATE UNIQUE INDEX pool_games_pkey ON public.pool_games USING btree (id);
CREATE UNIQUE INDEX pr_history_pkey ON public.pr_history USING btree (id);
CREATE UNIQUE INDEX skate_sessions_pkey ON public.skate_sessions USING btree (id);
CREATE UNIQUE INDEX sleep_log_pkey ON public.sleep_log USING btree (id);
CREATE UNIQUE INDEX spikeball_games_pkey ON public.spikeball_games USING btree (id);
CREATE UNIQUE INDEX table_tennis_games_pkey ON public.table_tennis_games USING btree (id);
CREATE UNIQUE INDEX to_read_pkey ON public.to_read USING btree (id);
CREATE UNIQUE INDEX volleyball_sessions_pkey ON public.volleyball_sessions USING btree (id);
CREATE UNIQUE INDEX water_log_pkey ON public.water_log USING btree (id);

-- =========
-- RLS
-- =========

ALTER TABLE public."basketball_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."body_measurements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."bodyweight_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."books" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."cardio_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."chess_games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."disc_golf_rounds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."energy_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."exercise_muscle_activations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."fortnite_games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."golf_rounds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hiking_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."lifting_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."mood_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."muscles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pickleball_games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pool_games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pr_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."skate_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sleep_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."spikeball_games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."table_tennis_games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."to_read" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."volleyball_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."water_log" ENABLE ROW LEVEL SECURITY;

-- =========
-- POLICIES
-- =========

CREATE POLICY "Users manage own basketball_sessions" ON public."basketball_sessions" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users manage own measurements" ON public."body_measurements" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "own" ON public."bodyweight_log" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "own" ON public."books" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "users own cardio" ON public."cardio_sessions" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "own" ON public."challenges" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "users own chess_games" ON public."chess_games" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "users own disc_golf_rounds" ON public."disc_golf_rounds" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "users own energy_log" ON public."energy_log" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can read exercise_muscle_activations" ON public."exercise_muscle_activations" AS PERMISSIVE FOR SELECT TO {authenticated} USING (true);
CREATE POLICY "activations_read" ON public."exercise_muscle_activations" AS PERMISSIVE FOR SELECT TO {authenticated} USING (true);
CREATE POLICY "Authenticated users can read exercises" ON public."exercises" AS PERMISSIVE FOR SELECT TO {authenticated} USING (true);
CREATE POLICY "own" ON public."fortnite_games" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "users own goals" ON public."goals" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "users own golf_rounds" ON public."golf_rounds" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "users own hiking_sessions" ON public."hiking_sessions" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "own" ON public."lifting_log" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "own" ON public."mood_log" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can read muscles" ON public."muscles" AS PERMISSIVE FOR SELECT TO {authenticated} USING (true);
CREATE POLICY "muscles_read" ON public."muscles" AS PERMISSIVE FOR SELECT TO {authenticated} USING (true);
CREATE POLICY "users manage own pickleball" ON public."pickleball_games" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "users own pool_games" ON public."pool_games" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "own" ON public."pr_history" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "own" ON public."skate_sessions" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "own" ON public."sleep_log" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "users own spikeball_games" ON public."spikeball_games" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "users own table_tennis_games" ON public."table_tennis_games" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "own" ON public."to_read" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "users own volleyball_sessions" ON public."volleyball_sessions" AS PERMISSIVE FOR ALL TO {public} USING ((auth.uid() = user_id));
CREATE POLICY "Users manage own water logs" ON public."water_log" AS PERMISSIVE FOR ALL TO {authenticated} USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
