-- ============================================================
-- Phase 5c — Schedule the send-notifications Edge Function
-- Run this in the Supabase SQL Editor (youxp project) AFTER deploying the
-- function (see DEPLOY.md). Safe to re-run: unschedules first.
-- ============================================================
--
-- Uses pg_cron + pg_net to POST to the deployed Edge Function hourly. The
-- function itself decides per-user whether it's the right local hour to send,
-- so an hourly trigger covers every timezone without per-user cron rows.
--
-- Replace the two placeholders below before running:
--   <PROJECT_REF>        e.g. abcdefghijklmno   (Supabase project ref)
--   <SERVICE_ROLE_KEY>   the project's service_role JWT (Settings > API)
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any previous schedule with the same name (idempotent).
select cron.unschedule('youxp-send-notifications')
where exists (select 1 from cron.job where jobname = 'youxp-send-notifications');

-- Fire at the top of every hour.
select cron.schedule(
  'youxp-send-notifications',
  '0 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.functions.supabase.co/send-notifications',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- To verify:   select * from cron.job;
-- To run now:  select net.http_post(...);   (same call as above)
