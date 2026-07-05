# YouXP — Full Project Reference

## What it is
A personal life-tracking PWA for one user (Ben). Everything real-life earns XP — gym sets, miles run, books finished, games won, hours slept. XP accumulates into a lifetime level + title, plus a seasonal level that resets Jan 1. Built mobile-first, deployed on Vercel, works offline as a PWA, sends web-push notifications.

---

## Stack
| Layer | Tech |
|---|---|
| UI | React 19 + TypeScript + Vite (code-split lazy routes) |
| Styling | Tailwind CSS v4 + inline styles for dynamic/themed values |
| Data | Supabase (auth + PostgreSQL + Edge Functions) |
| State | Zustand (`useStore.ts`, `useNavStore.ts`) |
| Charts | Recharts |
| Forms | react-hook-form |
| Routing | react-router-dom v7 |
| Icons | lucide-react 1.16.0 (via `ui/Icon.tsx` wrappers only) |
| Animation | animejs (`lib/animations.ts`) |
| PWA | vite-plugin-pwa (generateSW) + `public/push-sw.js` for push |
| Errors | Sentry (behind `VITE_SENTRY_DSN`) |
| Hosting | Vercel (auto-deploys `main`) |

**Fonts**: Space Grotesk (display/headings) + JetBrains Mono (stats, numbers, labels) — loaded via Google Fonts in `index.html`

**Env vars** (`.env.local` + Vercel): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` (push; UI hides without it), `VITE_SENTRY_DSN` (optional)

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

Always run `npm run typecheck` before pushing (bare `tsc --noEmit` from root checks nothing — solution tsconfig).

**Database changes** ship as SQL files in `migrations/` that Ben pastes into the Supabase SQL Editor (no CLI/MCP access). One-time infra setup steps live in `DEPLOY.md`. All client code must degrade gracefully when a migration hasn't run yet (feature-detect missing table/function → silent fallback).

---

## Repository layout
```
migrations/                  # SQL files for Supabase SQL Editor (numbered by phase)
DEPLOY.md                    # One-time setup: migrations, VAPID keys, edge function, cron
supabase/functions/
└── send-notifications/      # Scheduled push sender (Deno, deployed via dashboard)
public/
├── manifest.webmanifest     # PWA manifest incl. shortcuts (Quick Log, Water, Workout, Today)
└── push-sw.js               # push + notificationclick handlers (importScripts'd into Workbox SW)
src/
├── App.tsx                  # Router, auth guard, TutorialOverlay, LevelUpOverlay, QuickLogHost
│                            #   (?quicklog=<id|open> deep-link), auto-subscribe push on load
├── index.css                # All CSS variables, keyframes, utility classes, :focus-visible
├── main.tsx                 # seedPrefsFromLegacy() before first paint, then hydratePrefs()
├── components/
│   ├── GameLogPage.tsx      # Config-driven W/L sport page (see "GameLogPage" section)
│   ├── QuickLogSheet.tsx    # Universal quick-log bottom sheet (TopBar + button)
│   ├── TodayCard.tsx        # Home: today checklist (sleep/water/mood/activity) + top quest
│   ├── OnThisDayCard.tsx    # Home: events exactly 1/2/3 years ago (renders nothing if none)
│   ├── BodyMap.tsx          # SVG muscle diagram — colored by rank/recency
│   ├── StrengthTab.tsx      # Lifting log UI (sets table, PRs, trends)
│   ├── ErrorBoundary.tsx
│   ├── brand/Wordmark.tsx
│   ├── settings/PushNotificationsSection.tsx  # hidden unless pushSupported+pushConfigured
│   ├── layout/              # TopBar (opens QuickLogSheet), BottomNav, SideNav, PageWrapper
│   ├── ui/
│   │   ├── Icon.tsx         # lucide-react wrappers via adapt() shim — ALL icons come from here
│   │   ├── EditModal.tsx    # Two-tap delete confirm (armed 3s), --overlay scrim
│   │   ├── Toast.tsx        # Drain bar + optional Undo action (deletes inserted row)
│   │   ├── HistoryControls.tsx  # Shared search + 30d/90d/Year/All range hook+UI
│   │   ├── ErrorState.tsx   # EmptyState-shaped error card with Retry
│   │   ├── FreezeTokens.tsx # Snowflake + token count next to Home streak
│   │   ├── EmptyState.tsx / Badge / Button / Card / Input (auto inputMode) / ProgressBar
│   │   ├── Skeleton / SkillCard / StatCard / StreakFire / XPCoins / MoodFace / Confetti
│   │   └── LevelUpOverlay / MilestoneOverlay / BossConqueredOverlay / TutorialOverlay
│   ├── forms/               # LogBookForm, LogFortniteForm, LogSkateForm, LogSleepForm, LogWorkoutForm
│   └── charts/              # BodyweightChart, LiftTrendChart, VolumeTrendChart
├── hooks/
│   ├── useXP.ts             # store init(); totalXP/seasonXP/level/progress
│   ├── useStats.ts          # Reads stats from the store — no fetching
│   ├── useStreak.ts         # Pure useMemo over rawRows; freeze-token-aware streak walk,
│   │                        #   returns freezeTokens + tokenSaving
│   ├── useAchievements.ts   # 100+ badges — pure useMemo over rawRows
│   ├── useSkills.ts         # 6 skill trees; module cache keyed userId+XP
│   ├── useWellnessScore.ts  # 0–100 composite (still does its own small fetch)
│   └── useAuth / useCountUp / usePageTitle / usePullToRefresh / useUserName
├── lib/
│   ├── xp.ts                # XP_RATES, level math (capped curve), season level, aggregates,
│   │                        #   fetchXPAndStats(), milestones, PR detection — see XP section
│   ├── prefs.ts             # Cross-device prefs: getPref/setPref over JSONB doc — see Prefs
│   ├── push.ts              # Web-push client plumbing — see Push section
│   ├── streakTokens.ts      # Freeze token earn/spend math — see Streak tokens
│   ├── lastUsed.ts          # getLastUsed/setLastUsed form defaults (youxp-lastused-*)
│   ├── challenges.ts        # Quest sync; rerolls + seen templates via prefs (synced)
│   ├── challengeTemplates.ts# Quest template defs — scaleTarget(), xpForTarget(), PROGRESS_FNS
│   ├── sections.ts          # SectionKey defs + order/hide persistence (drives QuickLogSheet)
│   ├── theme.ts             # 40+ themes; auto-switch by hour; persisted via prefs (synced)
│   ├── notifications.ts     # In-app daily reminder + streak-break warning (token-aware)
│   ├── offlineQueue.ts      # Queues writes made offline
│   ├── animations.ts / sounds.ts / muscleScore.ts / skills.ts / tutorial.ts / utils.ts
│   ├── audit.ts / sentry.ts / validation.ts / changelog.ts / strengthData.ts
│   └── supabase.ts          # Supabase client
├── pages/                   # All lazy-loaded in App.tsx
│   ├── Home.tsx             # XP hero (level ring, season line, progress), TodayCard,
│   │                        #   OnThisDayCard, week dots + FreezeTokens, widgets, feed
│   ├── Records.tsx          # Lifting log — route /lifting (/records redirects)
│   ├── Yearly.tsx           # /yearly — 53×7 activity heatmap, year totals, month bars,
│   │                        #   year switcher (linked from More)
│   ├── Weekly.tsx / Monthly.tsx / XPHistory.tsx / PRFeed.tsx
│   ├── Pickleball / Pool / Spikeball / TableTennis  # thin configs over GameLogPage
│   ├── Basketball / Chess / Golf / DiscGolf / Volleyball  # bespoke (box scores, ELO,
│   │                        #   scorecards, dual formats) but share all conventions
│   ├── Cardio / Sleep / Books / Water / Mood / Skate / Hiking / Fortnite / Measurements
│   ├── Challenges.tsx       # /challenges (/quests redirects) — quests + tutorial mode
│   ├── Goals / Hobbies / Profile / Leaderboard (public_profiles) / More / Log / Strength
│   ├── Settings.tsx         # Theme grid, sections, PushNotificationsSection, XP rates,
│   │                        #   privacy, CSV export (all tables), account deletion
│   ├── DevSettings.tsx      # /dev — XP engine debugger, PIN 1337
│   ├── Login / ResetPassword / AuthCallback / Terms / Privacy / NotFound
├── store/
│   ├── useStore.ts          # XP/seasonXP/level/stats/rawRows/activity, levelUpPending,
│   │                        #   stale-while-revalidate cache (youxp-xp-cache-v3)
│   └── useNavStore.ts       # Sidebar + quickLogOpen/quickLogTarget state
└── types/index.ts           # All Supabase row types — check here before adding interfaces
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
| Sleep quality bonus (≥7h) | 35 |
| Cardio per mile (run/bike/swim/walk) | 15 / 6 / 25 / 4 |
| Mood log | 15 |
| Water goal reached (64oz) | 50 |
| Quest completed | varies (stored in DB) |

Plus per-sport rates (basketball, pickleball, golf, disc golf, hiking, table tennis, chess, volleyball, spikeball, pool) — see `XP_RATES`.

### Level formula — capped curve
```ts
// sqrt curve through level 30, flat cost per level after (continuous):
// LEVEL_CAP = 30, CAP_XP = 126,150, FLAT_STEP = 8,550
xpForLevel(L)  = L <= 30 ? (L-1)² * 150 : CAP_XP + (L-30) * 8550
calculateLevel = inverse of the above
```
Always go through `calculateLevel` / `xpForLevel` / `levelProgress` — never inline sqrt math.

### Seasonal level
`seasonLevel(seasonXP) = floor(sqrt(seasonXP / 100))` — XP since Jan 1, resets naturally by date. Shown on Home hero + Profile. Exposed as `seasonXP` via the store/`useXP`.

### Level titles (every 5 levels)
1 Newcomer → 5 Rookie → 10 Contender → 15 Grinder → 20 Athlete → … → 100 Godlike. Full list in `LEVEL_TITLES`.

### How XP is computed — recompute-from-source (retroactive by design)
XP is always re-derived from raw activity data × `XP_RATES`, so changing a rate retroactively rewrites history/level everywhere (XPHistory included). `fetchXPAndStats()`:
1. Calls the `get_xp_aggregates(uid)` Postgres RPC (server-side counts/sums, incl. `_season` variants) and computes XP client-side via `xpFromAggregates()` — rates stay in TS.
2. **Fallback**: if the RPC is missing (migration not run), computes identical numbers from full rows via `aggregatesFromRawRows()`.
3. Also returns `rawRows` (slim column sets) for streaks/achievements/trends/activity feed.

Returns `{ totalXP, seasonXP, stats, rawRows }`. Cache key `youxp-xp-cache-v3`.

### Strength milestones
`LIFT_MILESTONES` — lift thresholds (135/225/315 bench etc.) → `MilestoneOverlay`. `checkForPR()` handles PR detection.

---

## GameLogPage (`src/components/GameLogPage.tsx`)
Config-driven page for win/loss sports. A sport page is just a `GameLogConfig<Row>`: table name, title, backTo, select/text/toggle fields (essential vs optional), stat cards (`StatDef`), monthly W/L chart, XP rate keys, toast copy. Provides for free: required Win/Loss segmented pick (no default, submit disabled until chosen), two-tier form ("Add details…"), last-used select defaults, undo toast, search + date-range filters (HistoryControls), load-more (10 + 20/tap), monthly chart placeholder (<2 months), edit modal, ErrorState, EmptyState.

**Current consumers**: Pickleball, Pool, Spikeball, TableTennis. Basketball/Chess/Golf/DiscGolf/Volleyball stayed bespoke (box scores, ELO trend, scorecards, Indoor/Sand dual forms) but implement the same conventions manually. **New W/L sport → write a config, not a page.**

---

## Quick-log system
- **QuickLogSheet** (bottom sheet off TopBar +): activity tiles from user's active sections (`sections.ts` + rawRows), recency-sorted; inline minimal forms (water +8/+16/+24oz, mood 1–10 row, sleep, cardio, skate/hiking miles, W/L sports); complex pages (Lifting, Books, etc.) link out. Saves insert → XP toast with **Undo** → refreshXP/refreshActivity.
- **Deep links**: `?quicklog=<sectionId|open>` opens the sheet (used by PWA manifest shortcuts). Handled by `QuickLogHost` in App.tsx; param stripped after opening.
- **Undo**: Toast's optional undo callback deletes the inserted row (id from `.insert().select()`) and refreshes. Available until the drain bar empties.

---

## Prefs — cross-device sync (`src/lib/prefs.ts`)
Single JSONB doc per user in `user_preferences`, mirrored in localStorage (`youxp-prefs-cache`) for instant load. `getPref`/`setPref` are synchronous; writes debounce (1.5s) then upsert (last-write-wins). Missing table (migration not run) → localStorage-only, silently. `seedPrefsFromLegacy()` runs once (flag `youxp-prefs-seeded`) migrating old `youxp-*` keys; `hydratePrefs()` merges the server doc on boot (both called in `main.tsx`).

**Synced through prefs**: theme/mode/time-theme, Home stat picks + level style, quest rerolls + seen templates, streak-freeze spent dates, notification settings. **Device-local by design**: `youxp-lastused-*` form defaults, tutorial-done, nav hints, XP cache.

---

## Streak freeze tokens (`src/lib/streakTokens.ts`, `useStreak.ts`)
- **Earn**: max **1 token per calendar month** — granted if ANY category has logs in ≥3 distinct ISO weeks that month (consistency in five categories still = 1; no stacking). Deterministically recomputed from rawRows history.
- **Spend**: only spent dates are persisted (prefs key `streakFreezeSpent`); balance = earned − spent. `useStreak`'s walk auto-bridges an exactly-one-day gap when balance > 0 and records the spend idempotently.
- **UI**: `FreezeTokens` (snowflake + count) next to the Home streak; `checkStreakBreakWarning` copy is token-aware.

---

## Push notifications
- **Client** (`lib/push.ts`): `subscribeToPush()` (permission → SW subscription → upsert row), `autoSubscribeIfGranted()` (silent re-arm on every app load once permission granted — called from App.tsx), `unsubscribeFromPush()`, settings (4 type toggles all default **on**, quiet hours 22:00–08:00, IANA timezone) in prefs under `notificationSettings`. Whole feature hidden unless `pushSupported() && pushConfigured()` (needs `VITE_VAPID_PUBLIC_KEY` baked into the build — Vercel env + redeploy).
- **SW**: `public/push-sw.js` (push + notificationclick) imported into the Workbox SW via `workbox.importScripts` in `vite.config.ts`.
- **Sender**: `supabase/functions/send-notifications` (Deno + web-push), deployed via dashboard with JWT verification OFF; secrets `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`. Triggered hourly by pg_cron + pg_net (`migrations/phase5-cron.sql`); decides per-user local time. Sends: evening nothing-logged reminder + streak-at-risk (19–22 local), quest expiring ≤48h at ≥70% progress, Monday recap (07–10). Dedup via `last_sent` JSONB per type/day; deletes 404/410 subscriptions.
- **iOS**: push requires the PWA installed to the Home Screen.

---

## Skills system (`src/lib/skills.ts`, `useSkills.ts`)
6 independent trees — Lifting, Skating, Reading, Fortnite, Sleep, Cardio — each `level = floor(sqrt(xp / 50))` with its own title progression. Displayed on Profile via `SkillCard`.

## Achievements (`useAchievements.ts`)
100+ badges evaluated client-side from rawRows. Pure useMemo, 5-min TTL cache keyed on `totalXP + revision`. Profile page.

---

## Quests system (`lib/challenges.ts` + `lib/challengeTemplates.ts`)

### Three tiers
| Tier | Reset | Slots | Color |
|---|---|---|---|
| Weekly | Every Monday | 5–10 (scales with active sections) | `var(--accent)` |
| Monthly | 1st of month | 3–6 | violet |
| Boss | Every Jan 1 | 4 fixed | gold |

- `syncUserChallenges` — section detection → per-section stats → round-robin template picks. Templates in `challengeTemplates.ts` (`key`, `section`, `period`, `name(target)`, `scaleTarget`, `xpForTarget`, `progressKey`); `PROGRESS_FNS` maps keys to live queries.
- Seen-template history (30 picks) + **rerolls (3/cycle/tier)** — stored via **prefs** (synced), same key strings as the old localStorage.
- **Boss**: `boss_bench/squat/deadlift/skate`; targets from PR × 1.1 or miles rounded to next 100; completion chains next target; Jan 1 full reset; dedup on every load. `getBossProgress` live from `pr_history`/`skate_sessions`.
- **Tutorial mode**: zero data in all tables → onboarding checklist instead of quests.
- The `challenges` table `notes` column stores the template key — this routes progress queries.

---

## Theme system & design tokens
- **Default: Coral** — accent `#e5443f`, Paper bg `#f3efe6`. 40+ themes in `theme.ts`, auto-switch by hour optional, preference synced via prefs. Light default; dark via `html[data-mode="dark"]`.
- Surface scale `--surface-0..3`; text `--text-primary/secondary/tertiary/disabled` (+ `--text-muted`); borders `--border-subtle/default/strong`; shadows/radius tokens; `--green`, `--red`, `--accent`, `--overlay` (modal scrims), `--chart-alt` (second chart series). Legacy aliases: `--card-bg`, `--base-bg`, `--input-bg`, `--nav-bg`, `--border`, `--border-faint`.
- **Rule — no hardcoded colors in components** (`#hex`/`rgba(...)`): use CSS vars + `color-mix(in srgb, var(--x) N%, transparent)` for tints. The full sweep was completed July 2026. **Intentional exceptions** (do not "fix"): Login hero gradient, Books `GENRE_COLORS` + `hexContrast()`, Mood's 3 chart series, Hobbies hub per-tile accents, ShareCard (image export), Confetti/MoodFace/BossConquered/Tutorial overlay effects, `index.css`/`theme.ts` themselves.

---

## Supabase

### Activity tables (22)
```
lifting_log, pr_history, skate_sessions, fortnite_games, books, sleep_log,
cardio_sessions, goals, challenges, mood_log, body_measurements, water_log,
basketball_sessions, pickleball_games, golf_rounds, disc_golf_rounds,
hiking_sessions, table_tennis_games, chess_games, volleyball_sessions,
spikeball_games, pool_games
```

### Infra tables
```
user_preferences    — user_id PK, prefs jsonb, updated_at (owner-only RLS)
push_subscriptions  — endpoint unique, p256dh, auth, timezone, last_sent jsonb (owner-only RLS)
user_audit_log, user_privacy_settings, user_follows, user_blocks, public_profiles  — security/social
```

### Functions
- `get_xp_aggregates(uid)` RPC — SECURITY INVOKER, returns JSONB counts/sums (+`_season` variants). Client falls back to full-row math if absent.
- Edge Functions: `send-notifications` (scheduled), `upload-avatar`, `rate-limit-login`, `log-audit-event`.

---

## State architecture
- **`useStore`**: `totalXP`, `seasonXP`, `level`, `stats`, `rawRows`, `activity[]`, `levelUpPending`; `init()` loads cache instantly then revalidates via `fetchXPAndStats()`; `refreshXP`/`refreshActivity` after writes.
- **`useNavStore`**: sidebar + quick-log sheet open/target.
- `useStreak`/`useAchievements`/trends are pure derivations over `rawRows` — zero extra queries. `useSkills` fetches once per userId+XP. `useWellnessScore` still fetches its own.

---

## Conventions
- Pages in `src/pages/`, lazy-loaded in App.tsx. Shared UI in `src/components/ui/`.
- New W/L sport = `GameLogConfig`, not a new page implementation.
- Data hooks in `src/hooks/` — avoid new direct Supabase calls in components (legacy pages still do).
- **Inline styles** for themed/dynamic values; **Tailwind** for layout/spacing/responsive.
- All colors via CSS vars (see exceptions above). All icons via `ui/Icon.tsx` — no raw lucide imports, no unicode/emoji glyphs as UI.
- History lists: 10 rows + "Show more" (+20); search/range via `HistoryControls`; failed loads render `ErrorState` (with retry), never a fake empty state.
- Log forms: essentials visible, optionals under "Add details…"; select defaults via `lastUsed.ts`; `Input.tsx` auto-sets `inputMode`; every insert shows an undo toast.
- Synced user state → `prefs.ts` (`getPref`/`setPref`); truly device-local state → localStorage with `youxp-` prefix.
- Check `src/types/index.ts` before adding interfaces. `font-mono` on all numeric stats.
- Real `<button>`/`<input>` for interactive elements; `aria-label` on icon-only buttons (global `:focus-visible` styling exists).
- Charts: use `CHART_TOOLTIP_STYLE` from `lib/utils.ts` for `<Tooltip contentStyle>`; `var(--chart-alt)` for a second series.
- No comments unless the WHY is non-obvious. `data-tutorial="..."` attributes for onboarding spotlight targets.

---

## Tutorial system (`lib/tutorial.ts`, `ui/TutorialOverlay.tsx`)
9-step tour: `id`, `title`, `body`, `tip`, optional `target`/`tooltipPosition`/`navigateTo`. Spotlight cutout, pulse rings, keyboard nav, progress dots. Done flag `youxp-tutorial-done`; reset via Settings → About.

---

## Security (implemented)
- **Login** — generic errors (no enumeration); 5-attempt lockout w/ backoff; 13+ age gate
- **CSP + headers** — `vercel.json`: HSTS 2yr+preload, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy
- **OAuth** — Google + Apple (Supabase PKCE); `/auth/callback`
- **Sentry** — PII stripped; behind `VITE_SENTRY_DSN`
- **Account deletion** — 3-step confirm (type email)
- **Edge Functions** — upload-avatar (magic-byte validation), rate-limit-login, log-audit-event (JWT-verified)
- **Storage** — avatars bucket: public read, auth write, 5MB, JPEG/PNG/WebP
- VAPID private key lives ONLY in edge function secrets — never in `VITE_*` vars or the repo

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
Fix with binary replacement — text editors cannot reliably match these sequences. Prevention: write plain ASCII in code; icons come from `ui/Icon.tsx`.

---

## Known issues / future work
- Many legacy pages still call Supabase directly instead of via hooks — works, but contradicts the hooks convention
- Bespoke sport pages (Basketball, Chess, Golf, DiscGolf, Volleyball) could migrate to GameLogPage variants if their special features are ever generalized
- `useWellnessScore` still does its own fetch (could derive from rawRows)
- Main JS chunk is >500 kB minified (pre-existing Vite warning — cosmetic for a solo PWA)
- TypeScript check: `npx` not in PowerShell PATH — use `npm run typecheck` / `npm run build`, or Bash
- Agent worktrees branch from `origin/main`, not local HEAD — push prerequisite commits before spawning parallel agents
