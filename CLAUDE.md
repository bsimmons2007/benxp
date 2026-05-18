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
| PWA | vite-plugin-pwa |
| Hosting | Vercel (auto-deploys `main`) |

**Env vars** (`.env.local`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**GitHub**: https://github.com/bsimmons2007/benxp  
- `main` → production  
- `dev` → staging / in-progress

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
│   │   ├── TopBar.tsx       # Header: hamburger/back, logo → /monthly, + log menu, settings gear
│   │   ├── BottomNav.tsx    # Mobile tab bar (Home + ordered sections + More)
│   │   ├── SideNav.tsx      # Desktop sidebar drawer
│   │   └── PageWrapper.tsx  # Wraps every page with safe-area padding + pageEnter animation
│   ├── ui/
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── EditModal.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Icon.tsx         # Full custom SVG icon library
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
│   ├── useAchievements.ts   # 100+ badge evaluations across all activity types
│   ├── useAuth.ts
│   ├── useCountUp.ts        # Animated number counter
│   ├── usePageTitle.ts
│   ├── usePullToRefresh.ts
│   ├── useSkills.ts         # 6 skill trees with per-skill XP + level
│   ├── useStats.ts          # Aggregated stats for Home dashboard chips
│   ├── useStreak.ts         # Workout streak (17 queries, 5-min TTL)
│   ├── useStrengthSnapshot.ts # Body strength scores (5-min TTL)
│   ├── useTrends.ts         # Trend direction arrows for stat chips
│   └── useUserName.ts
├── lib/
│   ├── challenges.ts        # Time-boxed weekly/monthly/boss challenges
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
│   ├── Home.tsx             # Dashboard: XP ring, level, stat chips, week dots, activity feed
│   ├── Records.tsx          # Lifting log — log sets, view PRs, body map, strength tab
│   ├── Cardio.tsx           # Distance sessions — runs, bikes, swims; miles + trend chart
│   ├── Sleep.tsx            # Sleep log — bedtime/wake, debt, quality score, streak
│   ├── Books.tsx            # Reading log — title, author, date; year count
│   ├── Water.tsx            # Water intake log — oz per day
│   ├── Mood.tsx             # Mood rating log — 1–10 scale; 30-day avg
│   ├── Measurements.tsx     # Body measurements — weight, body fat, etc.
│   ├── Goals.tsx            # User-defined goals with progress bars
│   ├── Challenges.tsx       # Weekly/monthly/boss challenges with auto-progress
│   ├── Basketball.tsx       # Game log — wins/losses, points
│   ├── Pickleball.tsx       # Game log — wins/losses
│   ├── Golf.tsx             # Round log — score, course, par
│   ├── DiscGolf.tsx         # Round log — score, course
│   ├── Hiking.tsx           # Hike log — miles, elevation, trail
│   ├── Skate.tsx            # Skate session log — miles, tricks
│   ├── TableTennis.tsx      # Game log
│   ├── Chess.tsx            # Game log — result, opponent type
│   ├── Volleyball.tsx       # Game log
│   ├── Spikeball.tsx        # Game log
│   ├── Pool.tsx             # Game log
│   ├── Fortnite.tsx         # Game log — kills, placement, win; charts
│   ├── Hobbies.tsx          # Misc hobbies hub
│   ├── Profile.tsx          # Level, title, skills, badges/achievements
│   ├── Settings.tsx         # Theme picker, section order/hide, nav reorder, about
│   ├── Weekly.tsx           # Weekly XP recap with highlights
│   ├── Monthly.tsx          # Monthly reel — best moments, PRs, stats
│   ├── XPHistory.tsx        # Full XP event log with category breakdown
│   ├── PRFeed.tsx           # All-time personal records feed
│   ├── ShareCard.tsx        # Export a progress card image
│   ├── More.tsx             # Hub for Profile, Goals, Measurements, Weekly, Monthly, etc.
│   ├── Log.tsx              # Quick-log landing
│   ├── Strength.tsx         # Strength overview (wraps StrengthTab)
│   ├── DevSettings.tsx      # XP engine debugger — PIN gated (1337), dev-only in More
│   ├── Login.tsx
│   └── ResetPassword.tsx
├── store/
│   ├── useStore.ts          # Zustand: XP, level, stats, levelUpPending; stale-while-revalidate cache
│   └── useNavStore.ts       # Sidebar open/close state
└── types/
    └── index.ts             # All Supabase row types — check here before adding interfaces
```

---

## XP & Leveling (`src/lib/xp.ts`)

### XP Rates (`XP_RATES`)
| Activity | XP |
|---|---|
| Gym set | 15 |
| Workout day bonus | 60 |
| New PR | 250 |
| Skate mile | 40 |
| Book finished | 250 |
| Fortnite win | 100 |
| Sleep log | 20 |
| Sleep quality bonus (7h+) | 30 |
| Cardio per mile | 50 |
| Mood log | 10 |
| Water log | 5 |
| Challenge completed | varies (stored in DB) |

### Level formula
```ts
level = Math.floor(1 + Math.sqrt(totalXP / 200))
```

### Level titles (100 tiers)
1–5 Newcomer → 6–10 Initiate → 11–15 Apprentice → … → 96–100 Godlike  
Full list in `getLevelTitle()` in `xp.ts`.

### `fetchXPAndStats()`
Single parallel fetch across all 22 Supabase tables. Returns `{ totalXP, level, stats }`. Called by `useStore.init()` and `DevSettings`.

### Strength milestones (`STRENGTH_MILESTONES`)
Triggered when a lift hits a threshold (e.g., 135, 225, 315 bench). Shows `MilestoneOverlay`.

---

## Skills system (`src/lib/skills.ts`, `src/hooks/useSkills.ts`)
6 independent skill trees, each with their own XP and level curve (softer than global):
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
100+ badges evaluated client-side from raw activity data. Categories: Lifting, Cardio, Sleep, Sports, Gaming, Reading, Lifestyle. Each badge has an icon, name, description, and earned boolean. Displayed on Profile page. Has a 5-min TTL cache keyed on `totalXP + revision`.

---

## Challenges (`src/lib/challenges.ts`)
- **Weekly** (6 slots) — resets each Monday, seeded shuffle for consistency
- **Monthly** (6 slots) — resets 1st of month  
- **Boss** (4 slots) — elite long-term challenges (e.g., "500lb bench 1RM")
- Progress tracked via `getAutoProgress()` which reads current stats
- Completion syncs to `challenges` Supabase table with `xp_reward`

---

## Theme system (`src/lib/theme.ts`)
- 40+ named themes (Crimson, Ocean, Forest, Neon, Sakura, etc.)
- Auto-switch mode: changes theme based on hour of day
- Light mode: flat matte `#f2f2f4` background, white cards, no orbs/glow animations
- All colors injected as CSS variables on `<html>`: `--accent`, `--base-bg`, `--card-bg`, `--nav-bg`, `--bg-mid`
- Light mode overrides also set in `index.css` under `html[data-mode="light"]`
- User preference stored in `localStorage` (`youxp-theme`, `youxp-mode`)

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
challenges         — title, type, status, xp_reward, notes, expires_at
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

---

## State architecture

### `useStore` (Zustand)
- Holds `totalXP`, `level`, `stats`, `activity[]`, `levelUpPending`
- `init()`: loads from localStorage cache immediately (stale-while-revalidate), then fetches fresh via `fetchXPAndStats()`
- `levelUpPending`: set when XP crosses a level threshold → triggers `LevelUpOverlay`

### Key hooks & caches
| Hook | Queries | Cache TTL |
|---|---|---|
| `useStrengthSnapshot` | 4 | 5 min |
| `useStreak` | 17 | 5 min |
| `useAchievements` | 18 | 5 min (keyed on XP+revision) |
| `useTrends` | independent fetch | none |
| `useSkills` | 6 | none |

**Known redundancy**: `useAchievements`, `useStreak`, and `useTrends` all overlap with `fetchXPAndStats`. Merging into the store fetch would eliminate ~35 duplicate queries per session.

---

## Conventions
- All pages in `src/pages/`, lazy-loaded in `App.tsx`
- Shared UI in `src/components/ui/`
- All data hooks in `src/hooks/` — never call Supabase directly in components
- **Inline styles** for dynamic/themed values (CSS variables, computed values)
- **Tailwind** for layout, spacing, flex/grid, responsive
- No comments unless the WHY is non-obvious (hidden constraint, workaround, subtle invariant)
- All `localStorage` keys prefixed `youxp-` (renamed from `benxp-` May 2026)
- All colors must use CSS variables — no hardcoded `rgba(255,255,255,x)` or `#fff` in components (breaks light mode)
- Check `src/types/index.ts` before adding any new TypeScript interfaces
- Tutorial `data-tutorial="..."` attributes on target elements for onboarding spotlight

---

## Tutorial system (`src/lib/tutorial.ts`, `src/components/ui/TutorialOverlay.tsx`)
9-step onboarding tour. Each step: `id`, `title`, `body`, `tip`, optional `target` (CSS selector), `tooltipPosition`, `navigateTo`. Spotlight effect cuts out 4 divs around the target element. Features: pulse rings on highlight, caret arrows, per-step entrance animation, keyboard nav (Escape/arrows), scroll lock, clickable progress dots. Done state in `localStorage` (`youxp-tutorial-done`). Reset via `resetTutorial()` or Settings → About.

---

## Response format
Always end every response with a status footer:
- While changes are unmerged: `(Merged n)`
- After merging: open the PR via GitHub MCP, merge it, then poll `pull_request_read` → `get_check_runs` every ~15s until Vercel's check run reaches a terminal state (`success`, `failure`, `cancelled`, `timed_out`, `action_required`). Then report: `(Merged y · Vercel: [status])`

## Merge workflow (PR-based — required for Vercel status checks)
Never push directly to `main`. Always:
1. Commit changes to a feature branch (use existing `claude/…` branch or create one)
2. `git push -u origin <branch>`
3. `mcp__github__create_pull_request` — head: feature branch, base: `main`
4. `mcp__github__merge_pull_request` — merge_method: `squash`
5. Poll `mcp__github__pull_request_read` → `get_check_runs` on the PR number until Vercel check is done
6. Report footer with Vercel status

---

## Mojibake — history & detection
Files were corrupted by UTF-8 bytes being re-encoded through Windows-1252, then sometimes further collapsed by editors. All instances fixed as of May 2026 session. If new files appear garbled, run this scanner:

```python
# Quick scan — run from repo root
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
        # also flag any \xc3\xa2 or \xc3\x82 not in known patterns
        if hits: print(f, hits)
```
Fix with binary replacement (`content.replace(bad_bytes, good_bytes)`) — text editors cannot reliably match these sequences.

---

## Recent work (May 2026)
- **Site-wide light mode fix** — all hardcoded `rgba(255,255,255,x)` and `color:#fff` replaced with CSS variables across 38 files
- **Tutorial overhaul** — richer step content, tip callouts, pulse rings, caret arrows, card animations, keyboard nav, scroll lock
- **Bug fixes** — `More.tsx` `<a href>` → `<Link>`, `EmptyState` colors, `PageWrapper` key moved to inner div, `Toast`/`MilestoneOverlay` drain bar reset fix, `LevelUpOverlay` exit animation
- **UI polish** — `card-hover:active` tap feedback, `navDotEnter` animation, `prefers-reduced-motion` support, stat picker Cancel button, Dev Tools hidden in prod
- **Dev PIN** hardcoded to `1337`
- **Mojibake sweep** — 3,776+ corrupted characters binary-patched across 17 pages (Sleep, Books, Cardio, Chess, DiscGolf, Fortnite, Goals, Golf, Hiking, Login, Mood, Pickleball, Pool, Skate, Spikeball, TableTennis, Volleyball). Scanner confirmed fully clean.
- **Epley formula cap** — `LogWorkoutForm.tsx`: capped at 12 reps (`Math.min(reps, 12)`) to prevent false PRs on high-rep sets
- **UTC date fix** — `muscleScore.ts`: `new Date(row.date + 'T12:00:00')` prevents off-by-one daysAgo in US timezones
- **parseInt NaN guard** — `useStore.ts`: two `parseInt(…) || 1` fallbacks for localStorage level key
- **Dead code removal** — `Goals.tsx`: removed `addError` useState that was set but never read (fixed TS6133 build error)
- **Stray emoji** — `Water.tsx`: removed accidental `✏️` from goal tile label
- **`useMemo` for activityDates** — `Home.tsx:526`: Set now only rebuilt when `activity` changes
- **Books genre donut chart** — replaced horizontal bar chart with Recharts `PieChart` (donut style); book count centered in hole; legend shows genre + %; tooltip on tap; all colors via CSS variables
