# YouXP — Project Context

## What it is
A personal life-tracking PWA for one user (Ben). Tracks fitness, sports, lifestyle habits, and gaming with an XP/leveling system. Built mobile-first; deployed on Vercel.

## Stack
- **React 19 + TypeScript + Vite** (code-split lazy routes)
- **Tailwind CSS v4** (inline styles also used for dynamic/themed values)
- **Supabase** — auth + all data storage (env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `.env.local`)
- **Zustand** — client state (`src/store/useStore.ts`, `src/store/useNavStore.ts`)
- **Recharts** — charts
- **react-hook-form** — all forms
- **react-router-dom v7** — routing
- **vite-plugin-pwa** — PWA support
- **Vercel** — hosting + analytics

## GitHub
https://github.com/bsimmons2007/benxp
- `main` → production (Vercel auto-deploys)
- `dev` → staging / in-progress work

## Key systems

### XP & Leveling (`src/lib/xp.ts`)
- All XP rates in `XP_RATES` object — edit here to rebalance
- Level formula: `Math.floor(1 + Math.sqrt(totalXP / 200))`
- `fetchXPAndStats()` does one parallel fetch across all 22 Supabase tables
- `LevelUpOverlay` fires when XP crosses a level threshold

### Theme (`src/lib/theme.ts`)
- Auto-switches based on time of day; user can override in Settings
- CSS variables drive all colors — `var(--accent)`, `var(--base-bg)`, etc.

### Supabase tables
lifting_log, pr_history, skate_sessions, fortnite_games, books, sleep_log,
cardio_sessions, goals, challenges, mood_log, body_measurements, water_log,
basketball_sessions, pickleball_games, golf_rounds, disc_golf_rounds,
hiking_sessions, table_tennis_games, chess_games, volleyball_sessions,
spikeball_games, pool_games

### Types (`src/types/index.ts`)
All DB row types live here. Always check before adding new interfaces.

## Conventions
- Pages in `src/pages/`, all lazy-loaded in `App.tsx`
- Shared UI primitives in `src/components/ui/`
- Hooks in `src/hooks/` — prefer hooks over inline Supabase calls in components
- No comments unless the WHY is non-obvious
- Inline styles for dynamic/themed values, Tailwind for layout/spacing
- All localStorage keys are prefixed `youxp-` (previously `benxp-`, renamed May 2026)

## Recent work & handoff (as of 2026-05-13)

### Completed this session
- **Light mode matte redesign** — replaced glassy/glowy dark-mode-flip with clean neutral bg (`#f2f2f4`), opaque white cards, real drop shadows, orbs/grid/glow animations all suppressed in light mode. Committed `e3c0e15`.
- **Performance optimizations** — `useStrengthSnapshot` now has a 5-min TTL cache (was uncached, 4 queries per visit). `useStreak` TTL 2→5 min. `useAchievements` got a TTL alongside the existing XP+revision key. Committed `86b5df2`.
- **localStorage prefix rename** — all `benxp-*` keys renamed to `youxp-*` (this session). Users will lose cached preferences on first load after deploy (they re-apply automatically).
- **Stat chips expansion** — Home dashboard grew from 7 to 25 stat chips across 7 categories.
- **TopBar + Log dropdown** — the `+` button in top-right drops a menu: Lifting / Sleep / Mind / Water.
- **Stale-while-revalidate XP cache** — `init()` in `useStore.ts` shows localStorage cache instantly then fetches fresh in background.
- **Measurements validation** — form now requires all numeric fields before saving.

### Known areas to explore next
- `useAchievements` (18 queries) and `useStreak` (17 queries) still have significant overlap with `fetchXPAndStats` — merging into the store fetch would eliminate the redundancy entirely.
- The `useTrends` hook (`src/hooks/useTrends.ts`) fetches independently — could be folded into the store.
- Light mode: test across all theme colors and verify accent readability on `#f2f2f4` background for all 40+ themes.
