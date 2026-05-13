# benxp — Project Context

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
