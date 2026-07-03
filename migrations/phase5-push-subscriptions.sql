-- ============================================================
-- Phase 5b — Push subscriptions
-- Run this in the Supabase SQL Editor (youxp project).
-- Safe to re-run.
-- ============================================================
--
-- Stores Web Push subscriptions (one row per browser/device endpoint).
-- Per-type toggles + quiet hours live inside user_preferences.prefs JSON under
-- the "notificationSettings" key (no separate table).
--
-- The scheduled Edge Function (send-notifications) reads these rows with the
-- service_role key to deliver pushes; users manage only their own rows via RLS.
-- ============================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  -- IANA timezone for local-time scheduling (default America/Chicago).
  timezone    text not null default 'America/Chicago',
  -- last_sent per notification type, to dedupe within a day, e.g.
  -- {"evening":"2026-07-03","streak":"2026-07-03"}.
  last_sent   jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- service_role bypasses RLS automatically, so the Edge Function can read every
-- subscription; no extra policy needed for it.
