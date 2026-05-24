export interface ChangelogEntry {
  version: string
  label:   string
  items:   string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v3.4',
    label: 'Animations + Polish',
    items: [
      'anime.js animations: page enter stagger, streak dot spring, level-up timeline',
      'Edit modals & forms redesigned with full CSS variable support',
      'Version history added to Settings',
    ],
  },
  {
    version: 'v3.3',
    label: 'Desktop Nav Fix',
    items: [
      'Back arrow now visible on all hobby/sub-pages on desktop',
      'Back button contrast improved with pill background',
      'CircleDot unused import removed (build fix)',
    ],
  },
  {
    version: 'v3.2',
    label: 'UI Consistency Pass',
    items: [
      'ProgressBar gradient fixed for all themes',
      'Chart area fill opacity unified across all charts',
      'Body map fully migrated to CSS variables',
      'Settings theme swatches redesigned as compact pill chips',
      'Range slider track & thumb updated for iOS Safari',
      'Mood, Sleep, Water, Cardio, Fortnite charts updated',
    ],
  },
  {
    version: 'v3.1',
    label: 'Skills & Badges',
    items: [
      'Sports skill tree added (Basketball, Golf, Pickleball, etc.)',
      'XP curve steepened — higher levels feel earned',
      '20+ new badges across all activity categories',
      'Profile page badge grid expanded',
    ],
  },
  {
    version: 'v3.0',
    label: 'Icon System Rewrite',
    items: [
      'All 54 icons migrated to lucide-react via adapt() shim',
      'Emoji removed from TopBar, Profile, Settings, toasts',
      'New icons: SunIcon, SproutIcon, BirdIcon, SwordIcon',
      'Icon.tsx reduced from 570 to 198 lines',
    ],
  },
  {
    version: 'v2.9',
    label: 'Security Hardening',
    items: [
      'CSP headers, HSTS, X-Frame-Options added via vercel.json',
      'Login lockout: 5 attempts + exponential backoff',
      'Account deletion flow: 3-step email confirmation',
      'Google & Apple OAuth (PKCE) integration',
      'Sentry error reporting with PII scrubbing',
    ],
  },
  {
    version: 'v2.8',
    label: 'Privacy & Data',
    items: [
      'Leaderboard opt-in / opt-out in Settings',
      'Supabase Storage: avatar upload with magic-byte validation',
      'Input sanitization and profanity filter',
      'Data export (CSV) from Settings',
      'SQL: audit_log, public_profiles, user_follows, user_blocks',
    ],
  },
  {
    version: 'v2.5',
    label: 'Apple-Modern Redesign',
    items: [
      'Design token system: --surface-0/1/2/3, text/border/shadow scale',
      'Inter Variable font bundled (no CDN)',
      'Persistent 64px desktop sidebar with fly-out labels',
      'TopBar offset for desktop (md:left-16)',
      'LogoMark accent Y-bolt SVG',
      'BottomNav: pill active state, 60px + safe-area',
    ],
  },
  {
    version: 'v2.3',
    label: 'Dashboard Widgets',
    items: [
      'Home XP hero card: level ring, rank name, animated XP bar',
      'Editable 2-col widget grid (max 8, localStorage)',
      'Activity feed with color-coded category badges',
      'Week dots strip with workout streak',
      'Category breakdown chart (Lifting/Cardio/Reading/Gaming)',
    ],
  },
  {
    version: 'v2.0',
    label: 'Light Mode & Tutorial',
    items: [
      'Light mode is now the default for all new users',
      'All hardcoded #fff / rgba(255,255,255,x) replaced with CSS vars',
      '9-step onboarding tutorial with spotlight and pulse rings',
      'Keyboard nav (Escape/arrows) in tutorial',
    ],
  },
  {
    version: 'v1.8',
    label: 'Games & Sports',
    items: [
      'Basketball, Pickleball, Golf, Disc Golf logging',
      'Table Tennis, Chess, Volleyball, Spikeball, Pool',
      'Per-game win/loss tracking + XP rewards',
      'Fortnite: kills, placement, win/loss chart',
    ],
  },
  {
    version: 'v1.5',
    label: 'Challenges & Goals',
    items: [
      'Weekly, monthly, boss challenge system',
      'Auto-progress tracking from activity data',
      'User-defined goals with progress bars',
      'DevSettings PIN-gated XP debugger (1337)',
    ],
  },
  {
    version: 'v1.2',
    label: 'Body & Wellness',
    items: [
      'Bodyweight chart and daily logging',
      'Body measurements page',
      'Mood log (1-10 scale, 30-day avg)',
      'Water intake tracker',
      'Sleep debt & quality score',
    ],
  },
  {
    version: 'v0.8',
    label: 'Skills & Achievements',
    items: [
      '6 skill trees: Lifting, Skating, Reading, Fortnite, Sleep, Cardio',
      '100+ achievement badges evaluated client-side',
      'Profile page: skills, badges, level ring',
      'Body muscle map (SVG) colored by rank',
    ],
  },
  {
    version: 'v0.5',
    label: 'XP & Leveling',
    items: [
      'XP system: sets, PRs, books, cardio miles, sleep, mood, water',
      '100-tier level titles (Newcomer → Godlike)',
      'Level-up overlay with celebration animation',
      'PR detection with est. 1RM (Epley formula)',
      'Strength milestone overlay (135, 225, 315 bench)',
    ],
  },
  {
    version: 'v0.1',
    label: 'Initial Launch',
    items: [
      'Workout logging: Bench, Squat, Deadlift, Pull-ups, Push-ups',
      'Book, cardio, skate, and sleep tracking',
      'Supabase auth + PostgreSQL',
      'PWA — installable, works offline',
      'Vercel auto-deploy from main branch',
    ],
  },
]

export const CURRENT_VERSION = CHANGELOG[0].version
