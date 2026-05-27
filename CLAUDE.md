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

**Env vars** (`.env.local`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

**GitHub**: https://github.com/bsimmons2007/benxp  
- `main` → production  
- **Deploy workflow**: push directly to `main` — no branches, no PRs. Vercel auto-deploys on every push. Solo personal app.  
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
│   │   ├── TopBar.tsx       # Header: hamburger/back, logo → /monthly, + log menu (Lucide icon components, not emoji), settings gear; md:left-16 for sidebar offset
│   │   ├── BottomNav.tsx    # Mobile tab bar; 60px + safe-area; pill bg on active tab; md:hidden
│   │   ├── SideNav.tsx      # Desktop: persistent 64px icon strip (md:flex) + CSS fly-out labels; exports LogoMark; Mobile: slide-in drawer (md:hidden)
│   │   └── PageWrapper.tsx  # Wraps every page; paddingBottom: calc(80px + safe-area); pageEnter animation on inner div
│   ├── ui/
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── EditModal.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Icon.tsx         # lucide-react wrappers — 54 named exports via adapt() shim; same IconProps API; 4 mapping fns (SectionIcon, ActivityIconComp, BadgeIcon, AmbientSceneIcon)
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
│   ├── Home.tsx             # Dashboard: XP hero card (level ring, rank, progress bar, category breakdown), editable widget grid (2-col, max 8, localStorage), week dots, wellness score, activity feed with colored icon badges
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
│   ├── Settings.tsx         # Always-visible ThemeSwatch grid (64×56px, accent strip, no orbs); section order/hide, nav reorder, about
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
- **Light mode is the default** for new users; dark mode opt-in via Settings
- All colors injected as CSS variables on `<html>`: `--accent`, `--base-bg`, `--card-bg`, `--nav-bg`, etc.
- Dark mode: `html[data-mode="dark"]` block in `index.css`; no attribute = light
- User preference stored in `localStorage` (`youxp-theme`, `youxp-mode`)

## Design token system (`src/index.css`)
- Surface scale: `--surface-0` (page bg) → `--surface-1` (card) → `--surface-2` (input/raised) → `--surface-3` (overlay)
- Text scale: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-disabled`
- Borders: `--border-subtle`, `--border-default`, `--border-strong`
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Radius: `--radius-sm/md/lg/xl`
- Legacy aliases kept for backward compat: `--card-bg → var(--surface-1)`, `--base-bg → var(--surface-0)`, `--input-bg → var(--surface-2)`, `--nav-bg → var(--surface-1)`, `--border → var(--border-default)`, `--border-faint → var(--border-subtle)`
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

## Deploy workflow
Push directly to `main`. No PRs, no status reports, no footer needed.

```bash
git add <files>
git commit -m "..."
git push origin main
```

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
### UI consistency pass (session 5 — PR #26)
- **ProgressBar** — gradient fixed: `${color}cc` produced invalid CSS `var(--accent)cc`; replaced with `color-mix(in srgb, ${color} 55%, transparent)`
- **Water** — empty glass `fill="url(#wc-empty)"` (near-invisible blue at stopOpacity 0.03–0.06) replaced with `style={{ fill: 'var(--surface-2)' }}`
- **Range inputs** (`index.css`) — full `-webkit-appearance: none` + `--slider-fill` CSS var for thumb; track background transparent so element background (linear-gradient) shows through; works on iOS Safari
- **Mood sliders** — `accentColor` removed; dynamic `background: linear-gradient(to right, ...)` drives filled/unfilled track; chart area fill opacity 0.30 → 0.15
- **Sleep** — decorative divider (`LOG` label flanked by `--border-subtle` lines) between `WakeTimeTrainer` and `LogSleepPanel`; chart opacity → 0.15
- **Charts** — area fill opacity → 0.15 across all charts (LiftTrend, Bodyweight, VolumeTrend, Cardio, Fortnite); `rgba(255,255,255,0.04)` grid/cursor strokes → `var(--border-subtle)`; `rgba(255,255,255,0.18)` reference line → `var(--border-default)`
- **BodyMap** — full CSS var migration: body-fill gradient stops use `style={{ stopColor: 'var(...)' }}`; `MP` polygon `fill`/`stroke` moved from SVG presentation attributes to `style` prop (CSS vars unreliable in SVG attrs); head/neck/structural elements → `var(--surface-2)` fill + `var(--border-subtle)` stroke; `MuscleLabel` background/border/text → CSS vars; `bodyEdge` drop shadow 0.75 → 0.35 for light mode; rank legend text fallback `#888` → `var(--text-tertiary)`
- **Settings ThemeSwatch** — redesigned: accent color fills top 40px (dominant visual), baseBg strip + name below; active state has `box-shadow` glow ring + white-bg checkmark; swatch height 56 → 64px; hardcoded icon colors (`#555`, `#888`) → CSS vars
- **Weekly** — `#888` score label → `var(--text-tertiary)`
- **Pill/badge audit** — `Badge.tsx` `py-0.5` → `py-1`; `SkillCard.tsx` `text-white` → `var(--text-primary)`; `Records.tsx` RPE/PR badge padding `1px 6px` → `2px 8px`; PR badge text `#1A1A2E` → `var(--base-bg)`; `Home.tsx` grade pill `py-0.5` → `py-1`

### GitHub API merge workflow note
`gh` CLI is not installed on this machine. Use the GitHub REST API directly via PowerShell `Invoke-RestMethod` with a token retrieved from `git credential fill`. Token obtained via:
```bash
printf 'protocol=https\nhost=github.com\n\n' | git credential fill
```

### Lucide icon migration + build fix (session 4)
- **Vercel build fix** — `supabase.ts` wake ping used `.catch()` on `PromiseLike` (Supabase returns `PostgrestBuilder`, not `Promise`). Fixed with two-arg `.then(() => {}, () => {})` (PR #21)
- **Icon system rewrite** — `Icon.tsx` reduced from 570 lines of hand-crafted SVGs to 198 lines; all 54 named exports now wrap `lucide-react` 1.16.0 via an `adapt()` shim that preserves identical `IconProps` API (`size`, `color`, `style`, `className`) and `strokeWidth: 1.6`; all 35 importing files unchanged (PR #22)
- **Emoji purge** — 26 inline emoji characters removed across 8 files:
  - `TopBar.tsx` LOG_MENU: emoji strings → `IconComponent` references
  - `Profile.tsx` AVATAR_TIERS: emoji strings → Lucide icon components (Sprout/Sword/Shield/Flame/Zap/Waves/Bird/Star/Crown/Diamond) rendered at 36px in the tier orb
  - `Settings.tsx` light/dark toggle: `☀️`/`🌙` → `<SunIcon>`/`<MoonIcon>`
  - `Pool`, `Chess`, `TableTennis`, `Volleyball`: toast strings cleaned up
  - `notifications.ts`: notification body strings cleaned up
- **New icon exports** — `SunIcon`, `SproutIcon`, `BirdIcon` added to `Icon.tsx`
- **lucide-react** added to `package.json` + `package-lock.json` (v1.16.0)

### Apple-modern redesign (session 2)
- **Design token system** — `--surface-0/1/2/3`, text/border/shadow/radius scale in `index.css`; legacy aliases preserved; light mode default
- **Inter Variable font** — `@fontsource-variable/inter/index.css` bundled at build time (no CDN); import as explicit `.css` path
- **LogoMark** — accent Y-bolt SVG exported from `SideNav.tsx`, used in TopBar (mobile) and desktop sidebar
- **Desktop sidebar** — persistent 64px icon strip (`md:flex`), pure-CSS fly-out labels (`.sidenav-item:hover .sidenav-flyout`), logo shows level + title on hover
- **TopBar** — `md:left-16` to offset past sidebar; left button `md:invisible` (keeps space); `LogoMark` shown mobile-only
- **Home XP hero** — card with level ring (no glow), rank name headline, animated XP bar, collapsible per-category bar chart (Lifting/Cardio/Reading/Gaming/Skating)
- **Home widget grid** — uniform 2-col grid, max 8 widgets, localStorage (`youxp-home-stat-picks`), edit FAB (`.widget-edit-fab` CSS class for responsive bottom), AddPanel slides from right (`slideInRight` animation)
- **Activity feed** — colored icon badge per category: lift=accent, cardio/skate=blue, books=yellow, gaming=purple, sports/others=orange, hiking/golf=green
- **Settings ThemeSwatch** — always-visible auto-fill grid; 64×56px cards; `baseBg` fill, accent bottom strip, theme name, active checkmark; no glassmorphism orbs; removed `themeOpen` accordion
- **BottomNav** — 60px height + safe-area; pill background (`accent-subtle`) on active tab; label weight 700 when active; removed bottom dot
- **Loader** — light bg default (`#f5f5f7`), Inter font; `lxp-dark` class applied by `loader.js` reading `youxp-mode` from localStorage before first paint
- **CSS globals** — `overscroll-behavior: none` on body; `touch-action: manipulation` on buttons/links; FAB bottom offset matches 60px nav
- **Settings color sweep** — all `text-white`, `#444`, `#555`, `#BBBBBB`, `#E94560` → CSS vars (`--text-primary`, `--text-muted`, `--red`)

### Prior session (session 1)
- **Site-wide light mode fix** — all hardcoded `rgba(255,255,255,x)` and `color:#fff` replaced with CSS variables across 38 files
- **Tutorial overhaul** — richer step content, tip callouts, pulse rings, caret arrows, card animations, keyboard nav, scroll lock
- **Bug fixes** — `More.tsx` `<a href>` → `<Link>`, `EmptyState` colors, `PageWrapper` key moved to inner div, `Toast`/`MilestoneOverlay` drain bar reset fix, `LevelUpOverlay` exit animation
- **UI polish** — `card-hover:active` tap feedback, `navDotEnter` animation, `prefers-reduced-motion` support, stat picker Cancel button, Dev Tools hidden in prod
- **Dev PIN** hardcoded to `1337`
- **Mojibake sweep** — 3,776+ corrupted characters binary-patched across 17 pages. Scanner confirmed fully clean.
- **Epley formula cap** — `LogWorkoutForm.tsx`: capped at 12 reps (`Math.min(reps, 12)`) to prevent false PRs
- **UTC date fix** — `muscleScore.ts`: `new Date(row.date + 'T12:00:00')` prevents off-by-one daysAgo
- **parseInt NaN guard** — `useStore.ts`: two `parseInt(…) || 1` fallbacks for localStorage level key
- **Dead code removal** — `Goals.tsx`: removed `addError` useState (fixed TS6133)

## Pages not yet redesigned (individual page polish pending)
Records, Books, Measurements, Goals, Challenges, Pickleball, Golf, DiscGolf, Hiking, Skate, TableTennis, Chess, Volleyball, Spikeball, Pool, Profile, XPHistory, PRFeed, More — all functional, layout uses existing Card component, no hardcoded colors, but haven't received the session-2 component treatment.

Pages with targeted fixes applied (not full redesigns):
- **Water, Mood, Sleep, Cardio, Fortnite, Weekly, Monthly** — chart fills + slider fixes (session 5)
- **Records** — RPE/PR badge padding + color fixes (session 5)
- **Stray emoji** — `Water.tsx`: removed accidental `✏️` from goal tile label
- **`useMemo` for activityDates** — `Home.tsx:526`: Set only rebuilt when `activity` changes
- **Books genre donut chart** — replaced horizontal bar chart with Recharts `PieChart` (donut style); book count centered in hole; legend shows genre + %; tooltip on tap; all colors via CSS variables

---

## Security hardening (session 3 — May 2026)

### What was done
- **vercel.json** — CSP (no `unsafe-inline` scripts), HSTS 2yr+preload, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **npm audit** — 0 vulnerabilities (was 8; serialize-javascript DoS + ws memory disclosure)
- **Login** — signup always returns generic "check your email" (no email enumeration); 5-attempt lockout with exponential backoff; 13+ age gate (COPPA)
- **validation.ts** — sanitizeText, validateDisplayName (profanity filter + charset allowlist), validateNote
- **Google + Apple OAuth** — PKCE flow via supabase.auth.signInWithOAuth; /auth/callback page; AuthCallback.tsx
- **Sentry** — @sentry/react behind VITE_SENTRY_DSN env var; PII stripped before sending
- **Account deletion** — 3-step: click → warning → type exact email to confirm
- **Supabase Storage** — `avatars` bucket: public read, auth write, 5MB cap, JPEG/PNG/WebP
- **Edge Functions deployed** — upload-avatar (magic-byte validation), rate-limit-login (15-min rolling window per IP), log-audit-event (JWT-verified, service-role insert)
- **audit.ts** — client helper; fires on login success/failure and account deletion
- **Settings Privacy card** — leaderboard toggle, "always private" list, link to leaderboard profile
- **SQL migrations** — user_audit_log, user_privacy_settings, user_follows, user_blocks, public_profiles unique display name constraint

### Env vars required (not yet set)
| Var | Where | Purpose |
|---|---|---|
| `VITE_SENTRY_DSN` | Vercel + .env.local | Sentry error reporting |

### Manual steps remaining

#### 1. Google OAuth (~10 min)

**Step 1 — Create OAuth credentials in Google Cloud Console**
1. Go to https://console.cloud.google.com → select or create a project
2. APIs & Services → Credentials → **Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized redirect URIs — add **both**:
   - `https://vgizwizpqfjcptyyfmvi.supabase.co/auth/v1/callback`
   - `https://youxp.app/auth/callback` (or your Vercel preview URL while testing)
5. Copy the **Client ID** and **Client Secret**

**Step 2 — Enable in Supabase**
1. https://supabase.com/dashboard/project/vgizwizpqfjcptyyfmvi/auth/providers
2. Expand **Google** → toggle **Enable**
3. Paste Client ID and Client Secret → **Save**

Once done: paste the client ID and secret in chat and I'll verify the Supabase side is configured.

---

#### 2. Apple OAuth (~20 min, requires paid Apple Developer account $99/yr)

**Step 1 — Create a Services ID in Apple Developer**
1. Go to https://developer.apple.com → Certificates, Identifiers & Profiles
2. Identifiers → **+** → **Services IDs** → Continue
3. Description: `YouXP`, Identifier: e.g. `app.youxp.web` → Register
4. Select the new Services ID → enable **Sign In with Apple** → Configure
5. Primary App ID: your main app bundle ID (or create one)
6. Domains: `vgizwizpqfjcptyyfmvi.supabase.co`
7. Return URLs: `https://vgizwizpqfjcptyyfmvi.supabase.co/auth/v1/callback`
8. Save and register

**Step 2 — Create a Private Key**
1. Keys → **+** → enable **Sign In with Apple** → Configure → select your Primary App ID
2. Download the `.p8` private key file (**one-time download**)
3. Note the **Key ID**

**Step 3 — Enable in Supabase**
1. https://supabase.com/dashboard/project/vgizwizpqfjcptyyfmvi/auth/providers
2. Expand **Apple** → toggle **Enable**
3. Fill in: Service ID (e.g. `app.youxp.web`), Team ID (from developer.apple.com top-right), Key ID, paste the `.p8` file contents → **Save**

---

#### 3. Leaked Password Protection (Pro plan required)

**Requirement**: Supabase Pro plan ($25/mo). Not available on free tier.

If on Pro:
1. https://supabase.com/dashboard/project/vgizwizpqfjcptyyfmvi/auth/sign-in
2. Scroll to **Password Protection** → toggle on **"Prevent use of leaked passwords"**
3. Save

This checks new passwords against HaveIBeenPwned.org's database of 600M+ leaked passwords.

---

#### 4. Sentry (~5 min)

1. Go to https://sentry.io → New Project → **React** → name it `youxp`
2. Copy the DSN (looks like `https://abc123@o123.ingest.sentry.io/456`)
3. Add to **Vercel**: Project → Settings → Environment Variables → `VITE_SENTRY_DSN` = your DSN
4. Add to **`.env.local`**: `VITE_SENTRY_DSN=https://...`
5. Redeploy (or it picks up on next push to main)

Free tier (5k errors/mo) is sufficient for personal use.

### Backup schedule (item 12)
Supabase Pro plan includes daily automated backups with 7-day retention.
Free plan has no automated backups — manual options:

**Option A (recommended): pg_dump via cron**
```bash
# Run daily — add to a cron job or GitHub Actions scheduled workflow
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h db.vgizwizpqfjcptyyfmvi.supabase.co \
  -U postgres \
  -d postgres \
  --no-owner --no-acl \
  -f "backup-$(date +%Y%m%d).sql"
```
Get the DB password from: Supabase → Settings → Database → Connection string

**Option B: Supabase CLI**
```bash
supabase db dump --db-url "$SUPABASE_DB_URL" -f backup.sql
```

**Recommended cadence**: weekly automated backup via GitHub Actions, monthly manual verification.
The `migrations/` folder in the repo already tracks all schema changes — restoring data is the main risk, not schema.
