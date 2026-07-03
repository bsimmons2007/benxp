-- ============================================================
-- Phase 4b — user_preferences table (JSONB doc, owner-only RLS)
-- Run this in the Supabase SQL Editor (youxp project).
-- Safe to re-run.
-- ============================================================
--
-- Single-row-per-user key/value document. The client (src/lib/prefs.ts) keeps a
-- localStorage cache (youxp-prefs-cache) for instant load and write-through
-- syncs the merged doc here (debounced, last-write-wins). Used for: quest
-- rerolls + seen-template history, Home stat picks + widget layout, theme/mode,
-- notification settings (Phase 5), and streak-freeze spent-token records.
-- ============================================================

create table if not exists public.user_preferences (
  user_id    uuid primary key references auth.users on delete cascade,
  prefs      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

-- Owner-only: a user can read/write only their own row.
drop policy if exists "Users manage own preferences" on public.user_preferences;
create policy "Users manage own preferences"
  on public.user_preferences for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
