export interface ChangelogEntry {
  version: string
  label:   string
  items:   string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v0.9',
    label: 'Animations & Polish',
    items: [
      'Smoother transitions when navigating between pages',
      'Level-up celebration got a full animation overhaul',
      'Streak dots and widgets animate in on load',
      'Forms and modals look consistent across all themes',
      'Version history added to Settings',
    ],
  },
  {
    version: 'v0.8',
    label: 'Visual Refresh',
    items: [
      'Light mode and dark mode look great across every screen',
      'Charts, sliders, and the muscle map all follow your chosen theme',
      'Theme picker redesigned — easier to browse and switch',
      'Icons updated throughout the app for a cleaner look',
      'Navigation back arrow works correctly on all pages',
    ],
  },
  {
    version: 'v0.7',
    label: 'More Skills & Badges',
    items: [
      'Sports skill tree added — Basketball, Golf, Pickleball, and more all count',
      'Leveling up takes more effort — higher levels feel earned',
      'Over 20 new achievement badges across every activity',
    ],
  },
  {
    version: 'v0.6',
    label: 'Security & Privacy',
    items: [
      'Login is more secure — lockout after repeated bad attempts',
      'Leaderboard opt-in added to Settings',
      'Account deletion requires email confirmation to prevent accidents',
      'Data export added — download everything as a spreadsheet',
    ],
  },
  {
    version: 'v0.5',
    label: 'New Look',
    items: [
      'App redesigned — cleaner layout, better typography, real sidebar on desktop',
      'Light mode is now the default',
      'Dashboard widgets are customizable — pick what you want to see',
      'Activity feed shows everything you\'ve logged at a glance',
      'Onboarding tour added for new users',
    ],
  },
  {
    version: 'v0.4',
    label: 'Games & Sports',
    items: [
      'Basketball, Pickleball, Golf, Disc Golf, Table Tennis, Chess, and more',
      'Wins and losses tracked with XP rewards',
      'Fortnite stats: kills, placement, win tracking with charts',
    ],
  },
  {
    version: 'v0.3',
    label: 'Challenges & Goals',
    items: [
      'Weekly and monthly challenges with auto-tracked progress',
      'Boss challenges for long-term goals',
      'Personal goals with progress bars',
      'Mood, water intake, and body measurements added',
    ],
  },
  {
    version: 'v0.2',
    label: 'Skills & Achievements',
    items: [
      'Six skill trees — Lifting, Skating, Reading, Gaming, Sleep, Cardio',
      'Over 100 achievement badges to unlock',
      'Profile page with level ring, skills, and badge collection',
      'Body muscle map showing your training focus',
    ],
  },
  {
    version: 'v0.1',
    label: 'First Release',
    items: [
      'Workout logging for the big lifts',
      'Books, cardio, skating, and sleep tracking',
      'XP system with 100 level titles',
      'Personal records detected automatically',
      'Installable as an app on your phone',
    ],
  },
]

export const CURRENT_VERSION = CHANGELOG[0].version
