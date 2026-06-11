# YouXP — Full Project Reference

## What it is
A personal life-tracking PWA for one user (Ben). Everything real-life earns XP — gym sets, miles run, books finished, games won, hours slept. XP accumulates into a level and title (1–100+). Built mobile-first, deployed on Vercel, works offline as a PWA.

---

## Stack
| Layer | Tech |
|---|---|
| UI | React 19 + TypeScript + Vite (code-split lazy routes) |
| Styling | Tailwind CSS v4 + inline styles for dynamic/themed values |
| Data | Supabase (auth + PostgreSQL) |
| State | Zustand (`useStore.ts`, `useNavStore.ts`) |
| Charts | Recharts |
| Forms | react-hook-form |
| Routing | react-router-dom v7 |
| Icons | lucide-react 1.16.0 |
| PWA | vite-plugin-pwa |
| Hosting | Vercel (auto-deploys `main`) |

**Fonts**: Space Grotesk (display/headings) + JetBrains Mono (stats, numbers, labels) — loaded via Google Fonts in `index.html`

**Env vars** (`.env.local`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**GitHub**: https://github.com/bsimmons2007/benxp

---

## Deploy workflow
Push directly to `main` — no branches, no PRs. Vercel auto-deploys on every push. Solo personal app.

```bash
git add <files>
git commit -m "..."
git pull --rebase origin main   # only if remote has commits you don't have locally
git push origin main
```

---

## Repository layout
```
src/
├── App.tsx                  # Router, auth guard, TutorialOverlay, LevelUpOverlay
├── index.css                # All CSS variables, keyframes, utility classes
├── main.tsx
├── components/
│   ├── BodyMap.tsx          # SVG muscle diagram — colored by rank/recency
│   ├── StrengthTab.tsx      # Lifting log UI (sets table, PRs, trends)
│   ├── layout/
│   │   ├── TopBar.tsx       # Header: hamburger/back, LogoMark → /monthly, + log menu (Lucide icons), settings gear; md:left-16 sidebar offset
│   │   ├── BottomNav.tsx    # Mobile tab bar; 60px + safe-area; pill bg on active tab; md:hidden
│   │   ├── SideNav.tsx      # Desktop: persistent 64px icon strip (md:flex) + CSS fly-out labels; exports LogoMark; Mobile: slide-in drawer (md:hidden)
│   │   └── PageWrapper.tsx  # Wraps every page; paddingBottom: calc(80px + safe-area); pageEnter animation on inner div
│   ├── ui/
│   │   ├── Badge.tsx        # Pill label — whiteSpace:nowrap + flexShrink:0 to prevent flex squeeze
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── EditModal.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Icon.tsx         # lucide-react wrappers — 54 named exports via adapt() shim; IconProps API (size, color, style, className); strokeWidth 1.6
│   │   ├── Input.tsx
│   │   ├── LevelUpOverlay.tsx   # Full-screen level-up celebration (auto-dismiss 4s)
│   │   ├── MilestoneOverlay.tsx # Strength milestone card (auto-dismiss 5s)
│   │   ├── ProgressBar.tsx
│   │   ├── Skeleton.tsx
│   │   ├── SkillCard.tsx
│   │   ├── StatCard.tsx
│   │   ├── Toast.tsx        # Bottom toast with drain bar; plays XP/PR sound
│   │   └── TutorialOverlay.tsx  # 9-step onboarding tour with spotlight, caret, pulse rings
│   ├── forms/
│   │   ├── LogBookForm.tsx
│   │   ├── LogFortniteForm.tsx
│   │   ├── LogSkateForm.tsx
│   │   ├── LogSleepForm.tsx
│   │   └── LogWorkoutForm.tsx
│   └── charts/
│       ├── BodyweightChart.tsx
│       ├── LiftTrendChart.tsx
│       └── VolumeTrendChart.tsx
├── hooks/
│   ├── useAchievements.ts   # 100+ badge evaluations — pure useMemo over store rawRows
│   ├── useAuth.ts
│   ├── useCountUp.ts        # Animated number counter
│   ├── usePageTitle.ts
│   ├── usePullToRefresh.ts
│   ├── useSkills.ts         # 6 skill trees with per-skill XP + level; module cache keyed userId+XP
│   ├── useStats.ts          # Reads stats from the store — no fetching
│   ├── useStreak.ts         # Streaks (overall + sleep/gym/cardio) — pure useMemo over store rawRows
│   ├── useUserName.ts
│   ├── useWellnessScore.ts  # 0–100 wellness composite (sleep/activity/mood/water)
│   └── useXP.ts             # Triggers store init(); returns totalXP/level/progress
├── lib/
│   ├── challengeTemplates.ts # All quest template definitions — scaleTarget(), xpForTarget(), PROGRESS_FNS
│   ├── challenges.ts        # Quest sync logic — syncUserChallenges, syncBossChallenges, getProgress, getBossProgress, reroll helpers, date helpers
│   ├── muscleScore.ts       # Per-muscle rank scoring
│   ├── notifications.ts
│   ├── sections.ts          # Section definitions + order/hide persistence
│   ├── skills.ts            # Skill tree definitions + XP calculation
│   ├── sounds.ts            # XP gain / PR / level-up audio
│   ├── supabase.ts          # Supabase client
│   ├── theme.ts             # 40+ themes, auto-switch by time of day, CSS var injection
│   ├── tutorial.ts          # 9-step TUTORIAL_STEPS array + done/reset helpers
│   ├── utils.ts
│   └── xp.ts               # XP_RATES, fetchXPAndStats(), level/title calc
├── pages/                   # All lazy-loaded in App.tsx
│   ├── Home.tsx             # Dashboard: XP hero card (level ring, rank, progress bar, category breakdown), editable widget grid (2-col, max 8, localStorage), week dots, wellness score, activity feed
│   ├── Records.tsx          # Lifting log — log sets, view PRs, body map, strength tab
│   ├── Cardio.tsx           # Distance sessions — runs, bikes, swims; miles + trend chart
│   ├── Sleep.tsx            # Sleep log — bedtime/wake, debt, quality score, streak
│   ├── Books.tsx            # Reading log — title, author, date; year count; donut genre chart
│   ├── Water.tsx            # Water intake log — oz per day
│   ├── Mood.tsx             # Mood rating log — 1–10 scale; 30-day avg
│   ├── Measurements.tsx     # Body measurements — weight, body fat, etc.
│   ├── Goals.tsx            # User-defined goals with progress bars
│   ├── Challenges.tsx       # Quests page — Weekly/Monthly/Boss quests, adaptive targets, reroll system, auto-progress tracking, tutorial onboarding mode
│   ├── Basketball.tsx       # Game log — wins/losses, points
│   ├── Pickleball.tsx       # Game log — wins/losses
│   ├── Golf.tsx             # Round log — score, course, par
│   ├── DiscGolf.tsx         # Round log — score, course
│   ├── Hiking.tsx           # Hike log — miles, elevation, trail
│   ├── Skate.tsx            # Skate session log — miles
│   ├── TableTennis.tsx      # Game log
│   ├── Chess.tsx            # Game log — result, opponent type
│   ├── Volleyball.tsx       # Game log
│   ├── Spikeball.tsx        # Game log
│   ├── Pool.tsx             # Game log
│   ├── Fortnite.tsx         # Game log — kills, placement, win; charts
│   ├── Hobbies.tsx          # Misc hobbies hub
│   ├── Profile.tsx          # Level, title, skills, badges/achievements
│   ├── Settings.tsx         # ThemeSwatch grid (64×56px); section order/hide, nav reorder, about
│   ├── Weekly.tsx           # Weekly XP recap with highlights
│   ├── Monthly.tsx          # Monthly reel — best moments, PRs, stats
│   ├── XPHistory.tsx        # Full XP event log with category breakdown
│   ├── PRFeed.tsx           # All-time personal records feed
│   ├── ShareCard.tsx        # Export a progress card image
│   ├── More.tsx             # Hub for Profile, Goals, Measurements, Weekly, Monthly, etc.
│   ├── Log.tsx              # Quick-log landing
│   ├── Strength.tsx         # Strength overview (wraps StrengthTab)
│   ├── DevSettings.tsx      # XP engine debugger — PIN gated (1337), dev-only in More
│   ├── Login.tsx            # Email/password auth; coral brand hero; generic error messages (no enumeration)
│   └── ResetPassword.tsx
├── store/
│   ├── useStore.ts          # Zustand: XP, level, stats, levelUpPending; stale-while-revalidate cache
│   └── useNavStore.ts       # Sidebar open/close state
└── types/
    └── index.ts             # All Supabase row types — check here before adding interfaces
```

---

## XP & Leveling (`src/lib/xp.ts`)

### XP Rates (`XP_RATES`) — key values (full list in `xp.ts`)
| Activity | XP |
|---|---|
| Gym set | 15 |
| Workout day bonus | 60 |
| New PR | 200 |
| Skate mile | 12 |
| Book finished | 250 |
| Fortnite win / blitz win / kill | 100 / 30 / 3 |
| Sleep log | 20 |
| Sleep quality bonus | 35 |
| Cardio per mile (run/bike/swim/walk) | 15 / 6 / 25 / 4 |
| Mood log | 15 |
| Water goal reached (64oz) | 50 |
| Quest completed | varies (stored in DB) |

Plus per-sport rates (basketball, pickleball, golf, disc golf, hiking, table tennis, chess, volleyball, spikeball, pool) — see `XP_RATES` in `xp.ts`.

### Level formula
```ts
level = Math.floor(1 + Math.sqrt(totalXP / 150))
```

### Level titles (every 5 levels)
1 Newcomer → 5 Rookie → 10 Contender → 15 Grinder → 20 Athlete → … → 100 Godlike
Full list in `LEVEL_TITLES` in `xp.ts`.

### `fetchXPAndStats()`
Single parallel fetch across all 22 Supabase tables. Returns `{ totalXP, level, stats }`. Called by `useStore.init()` and `DevSettings`.

### Strength milestones (`STRENGTH_MILESTONES`)
Triggered when a lift hits a threshold (e.g., 135, 225, 315 bench). Shows `MilestoneOverlay`.

---

## Skills system (`src/lib/skills.ts`, `src/hooks/useSkills.ts`)
6 independent skill trees, each with their own XP and level curve:
- `level = Math.floor(Math.sqrt(xp / 50))`

| Skill | Source data |
|---|---|
| Lifting | lifting_log sets |
| Skating | skate_sessions miles |
| Reading | books finished |
| Fortnite | fortnite wins + kills |
| Sleep | sleep_log nights |
| Cardio | cardio_sessions miles |

Each skill has a title progression (e.g., Lifting: Untrained → Novice → Intermediate → … → Elite).
Displayed on Profile page via `SkillCard`.

---

## Achievements (`src/hooks/useAchievements.ts`)
100+ badges evaluated client-side from raw activity data. Categories: Lifting, Cardio, Sleep, Sports, Gaming, Reading, Lifestyle. Each badge has an icon, name, description, and earned boolean. Displayed on Profile page. 5-min TTL cache keyed on `totalXP + revision`.

---

## Quests system (`src/lib/challenges.ts` + `src/lib/challengeTemplates.ts`)

### Three tiers
| Tier | Reset | Slots | Color |
|---|---|---|---|
| Weekly | Every Monday | 5–10 (scales with active sections) | `var(--accent)` coral |
| Monthly | 1st of month | 3–6 (scales with active sections) | `#7c3aed` violet |
| Boss | Every Jan 1 | 4 fixed | `#f5a623` gold |

### Adaptive system (Weekly + Monthly)
- `syncUserChallenges` — detects which activity sections have data, fetches per-section stats, round-robins template picks across sections so no category dominates
- Templates live in `challengeTemplates.ts` — each has `key`, `section`, `period`, `name(target)`, `scaleTarget(stats)`, `xpForTarget(target)`, `progressKey`
- `PROGRESS_FNS` — maps progress keys to live Supabase queries (since/week or since/month)
- Seen-template tracking in localStorage prevents repeating quests for up to 30 past picks
- **Reroll**: 3 per cycle per tier, tracked in localStorage keyed by week/month. `rerollChallenge()` expires old, inserts new from same section

### Boss quests
- 4 fixed keys: `boss_bench`, `boss_squat`, `boss_deadlift`, `boss_skate`
- Targets scale from current PR × 1.1 (lifts) or current total miles rounded to next 100 (skate)
- On completion: next harder target spawns immediately (chains within the year)
- On Jan 1: all active boss quests expire, fresh targets spawn from current PRs
- `syncBossChallenges` runs deduplication on every load — if multiple active quests share a key, oldest are expired
- `getBossProgress` — returns `{ current, target }` live from `pr_history` or `skate_sessions`

### Tutorial mode
If user has zero data in all tracked tables, `Challenges.tsx` shows an onboarding checklist instead of quests. Once all steps done, "Unlock My Quests" triggers a fresh sync.

### Key exports from `challenges.ts`
```ts
syncUserChallenges(supabase, userId)   // adaptive weekly + monthly sync
syncBossChallenges(supabase, userId)   // boss sync + yearly reset + dedup
getProgress(supabase, key, tier)       // live progress for weekly/monthly quest
getBossProgress(supabase, key, target) // live progress for boss quest
rerollChallenge(supabase, userId, id, period, key)
getRerollsRemaining(period)            // reads localStorage
startOfWeekDate() / startOfMonthDate() / startOfYearDate()
nextMondayLabel() / daysUntilMonthEnd() / daysUntilYearEnd()
```

---

## Theme system & brand (`src/lib/theme.ts`)
- **Default theme: Coral** — accent `#e5443f`, Paper background `#f3efe6`
- 40+ named themes (Crimson, Ocean, Forest, Neon, Sakura, etc.)
- Auto-switch mode: changes theme by hour of day
- **Light mode is the default**; dark mode opt-in via Settings
- All colors injected as CSS variables on `<html>`: `--accent`, `--base-bg`, `--card-bg`, `--nav-bg`, etc.
- Dark mode: `html[data-mode="dark"]` in `index.css`; no attribute = light
- User preference in localStorage (`youxp-theme`, `youxp-mode`)

---

## Design token system (`src/index.css`)
- Surface scale: `--surface-0` (page bg) → `--surface-1` (card) → `--surface-2` (input/raised) → `--surface-3` (overlay)
- Text scale: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-disabled`
- Borders: `--border-subtle`, `--border-default`, `--border-strong`
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Radius: `--radius-sm/md/lg/xl`
- Legacy aliases preserved: `--card-bg → var(--surface-1)`, `--base-bg → var(--surface-0)`, `--input-bg → var(--surface-2)`, `--nav-bg → var(--surface-1)`, `--border → var(--border-default)`, `--border-faint → var(--border-subtle)`
- **Rule**: never hardcode `rgba(255,255,255,x)`, `#fff`, or `#000` in components — always use CSS vars

---

## Supabase tables (22)
```
lifting_log        — lift, sets, reps, weight, date
pr_history         — lift, est_1rm, date
skate_sessions     — miles, date
fortnite_games     — kills, placement, win, date
books              — title, author, date_finished
sleep_log          — bedtime, wake_time, hours_slept, quality, date
cardio_sessions    — type, distance, duration, date
goals              — title, target, current, unit, icon, status
challenges         — user_id, tier, challenge_name, category, xp_reward, status, notes (template key), target, auto_verified
mood_log           — score (1–10), note, date
body_measurements  — weight, body_fat, waist, chest, arms, date
water_log          — oz, date
basketball_sessions
pickleball_games
golf_rounds        — score, par, course, date
disc_golf_rounds   — score, course, date
hiking_sessions    — miles, elevation, trail, date
table_tennis_games
chess_games        — result, opponent_type, date
volleyball_sessions
spikeball_games
pool_games
```

The `challenges` table `notes` column stores the template key (e.g. `lift_sets_week`, `boss_bench`) — this is how progress queries are routed.

---

## State architecture

### `useStore` (Zustand)
- Holds `totalXP`, `level`, `stats`, `activity[]`, `levelUpPending`
- `init()`: loads from localStorage cache immediately (stale-while-revalidate), then fetches fresh via `fetchXPAndStats()`
- `levelUpPending`: set when XP crosses a level threshold → triggers `LevelUpOverlay`

### Key hooks
The old per-hook query redundancy was eliminated: the store's `fetchXPAndStats()` fetch keeps the raw table rows (`rawRows`), and `useStreak` / `useAchievements` are now pure `useMemo` derivations over them — zero extra queries. `useStats`/`useXP` just read the store. `useSkills` fetches once per userId+totalXP (module cache). `useWellnessScore` still does its own small fetch.

---

## Conventions
- All pages in `src/pages/`, lazy-loaded in `App.tsx`
- Shared UI in `src/components/ui/`
- All data hooks in `src/hooks/` — never call Supabase directly in components
- **Inline styles** for dynamic/themed values (CSS variables, computed values)
- **Tailwind** for layout, spacing, flex/grid, responsive
- No comments unless the WHY is non-obvious
- All `localStorage` keys prefixed `youxp-`
- All colors must use CSS variables — no hardcoded `rgba(255,255,255,x)` or `#fff` in components (breaks light mode)
- Check `src/types/index.ts` before adding any new TypeScript interfaces
- Tutorial `data-tutorial="..."` attributes on target elements for onboarding spotlight
- `font-mono` class (JetBrains Mono) on all numerical stats, XP values, progress counts

---

## Tutorial system (`src/lib/tutorial.ts`, `src/components/ui/TutorialOverlay.tsx`)
9-step onboarding tour. Each step: `id`, `title`, `body`, `tip`, optional `target` (CSS selector), `tooltipPosition`, `navigateTo`. Spotlight effect cuts out 4 divs around the target element. Pulse rings, caret arrows, keyboard nav (Escape/arrows), scroll lock, progress dots. Done state in localStorage (`youxp-tutorial-done`). Reset via `resetTutorial()` or Settings → About.

---

## Security (implemented)
- **Login** — generic error messages (no email enumeration); 5-attempt lockout with exponential backoff; 13+ age gate
- **CSP + security headers** — in `vercel.json`: HSTS 2yr+preload, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy
- **OAuth** — Google + Apple via Supabase PKCE flow; `/auth/callback` route; `AuthCallback.tsx`
- **Sentry** — behind `VITE_SENTRY_DSN` env var; PII stripped before sending
- **Account deletion** — 3-step confirmation (type email to confirm)
- **Edge Functions** — upload-avatar (magic-byte validation), rate-limit-login (15-min IP window), log-audit-event (JWT-verified)
- **Supabase Storage** — avatars bucket: public read, auth write, 5MB cap, JPEG/PNG/WebP only
- **SQL** — user_audit_log, user_privacy_settings, user_follows, user_blocks, public_profiles tables

### Pending env var
`VITE_SENTRY_DSN` — add to Vercel + `.env.local` after creating a project at sentry.io

---

## Mojibake — detection
Files were corrupted by UTF-8 → Windows-1252 re-encoding (fixed May 2026). If new files look garbled:

```python
import os
PATTERNS = {
    b'\xc3\xa2"\xe2\x82\xac':             '─ U+2500',
    b'\xc3\xa2\xe2\x80\xa0\xe2\x80\x99':  '→ U+2192',
    b'\xc3\xa2\xe2\x80\xa0\xe2\x80\x94':  '↗ U+2197',
    b'\xc3\xa2\xe2\x80\xa0\xe2\x80\x98':  '↑ U+2191',
    b'\xc3\xa2\xe2\x80\x94\xe2\x80\xb9':  '○ U+25CB',
    b'\xc3\x82\xc2\xb7':                  '· U+00B7',
    b'\xc3\xa2\xc5\x93\xe2\x80\xa2':      '✕ U+2715',
    b'\xc3\xa2\xc2\xad\xc2\x90':          '⭐ U+2B50',
}
for dirpath, _, files in os.walk('src'):
    for f in files:
        if not f.endswith(('.tsx','.ts','.css')): continue
        c = open(os.path.join(dirpath,f),'rb').read()
        hits = [(lbl,c.count(p)) for p,lbl in PATTERNS.items() if c.count(p)]
        if hits: print(f, hits)
```
Fix with binary replacement — text editors cannot reliably match these sequences.

---

## Known issues / future work
- Many pages still call Supabase directly instead of going through hooks (~29 pages) — works fine, but contradicts the hooks convention below
- Charts share `CHART_TOOLTIP_STYLE` from `lib/utils.ts` — use it for any new Recharts `<Tooltip contentStyle>`
- Pages not yet fully redesigned to session-2 component treatment: Records, Books, Measurements, Goals, Pickleball, Golf, DiscGolf, Hiking, Skate, TableTennis, Chess, Volleyball, Spikeball, Pool, Profile, XPHistory, PRFeed, More
- TypeScript check: `npx` not in PowerShell PATH — run `node node_modules/typescript/bin/tsc --noEmit` or use Bash
