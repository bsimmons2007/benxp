export const TUTORIAL_KEY = 'youxp-tutorial-done'

export function isTutorialDone(): boolean {
  return localStorage.getItem(TUTORIAL_KEY) === '1'
}

export function markTutorialDone(): void {
  localStorage.setItem(TUTORIAL_KEY, '1')
}

export function resetTutorial(): void {
  localStorage.removeItem(TUTORIAL_KEY)
}

export interface TutorialStep {
  id:               string
  title:            string
  body:             string
  tip?:             string
  target?:          string
  tooltipPosition?: 'above' | 'below' | 'center'
  navigateTo?:      string
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id:    'welcome',
    title: 'Welcome to YouXP',
    body:  'YouXP turns your real life into an RPG. Every workout, run, night of sleep, game, and book you log earns XP and advances your level. The more consistent you are, the faster you grow.',
    tip:   'You can restart this tour at any time from Settings.',
    tooltipPosition: 'center',
    navigateTo: '/',
  },
  {
    id:              'nav',
    title:           'Your Sections',
    body:            'Each icon jumps to a section of your life — Fitness covers Lifting, Cardio & Sleep; Sports has Basketball, Pickleball, Golf and more. The glowing accent dot marks where you are now.',
    tip:             'You can reorder and hide sections in Settings to match your lifestyle.',
    target:          '[data-tutorial="bottom-nav"]',
    tooltipPosition: 'above',
    navigateTo:      '/',
  },
  {
    id:              'xp-level',
    title:           'Your XP & Level',
    body:            'Every logged activity earns XP — gym sets, miles run, hours slept, games played. XP fills your level bar and advances your rank. Tap the logo to see a full monthly breakdown by category.',
    tip:             'XP rates vary: a PR lift earns more than a regular set, and longer runs earn more per mile.',
    target:          '[data-tutorial="topbar-logo"]',
    tooltipPosition: 'below',
    navigateTo:      '/',
  },
  {
    id:         'lifting',
    title:      'Lifting',
    body:       'Tap to log a set — pick an exercise, enter weight and reps. Hit a lifetime max and you earn a PR badge plus bonus XP. Your trained muscles fill in on a body diagram as you build strength over time.',
    tip:        'The body map updates as muscles reach rank thresholds. Consistent training = deeper color.',
    target:     '[data-tutorial="log-workout-btn"]',
    tooltipPosition: 'below',
    navigateTo: '/lifting',
  },
  {
    id:         'cardio',
    title:      'Cardio',
    body:       'Log any distance activity — runs, bikes, hikes, swims. You earn XP per mile with a streak multiplier for consistency. Your best times and longest efforts are saved as personal records.',
    tip:        'Cardio streaks give a bonus XP multiplier — the longer the streak, the more you earn per session.',
    target:     '[data-tutorial="log-cardio-btn"]',
    tooltipPosition: 'below',
    navigateTo: '/cardio',
  },
  {
    id:         'sleep',
    title:      'Sleep',
    body:       'Log your bedtime and wake time to track sleep debt, quality scores, and streaks. The app scores each night and rewards consistency. Good sleep earns real XP.',
    tip:        'You earn bonus XP for 8+ hour nights. Staying within your ideal sleep window also boosts your score.',
    target:     '[data-tutorial="log-sleep-btn"]',
    tooltipPosition: 'below',
    navigateTo: '/sleep',
  },
  {
    id:    'goals',
    title: 'Goals & Challenges',
    body:  'Goals track ongoing progress toward targets you set — a weight to hit, a book to finish, a game milestone. Challenges are time-limited events with bigger one-time XP rewards for completing them.',
    tip:   'Challenges expire — check the Challenges page regularly so you never miss a reward window.',
    tooltipPosition: 'center',
    navigateTo: '/',
  },
  {
    id:              'settings',
    title:           'Make It Yours',
    body:            'Tap the gear to customize your experience: choose from 40+ color themes, show or hide sections you don\'t use, and reorder your nav tabs. Everything is saved automatically.',
    tip:             'Try Auto Theme — it switches colors based on time of day automatically.',
    target:          '[data-tutorial="settings-btn"]',
    tooltipPosition: 'below',
    navigateTo:      '/',
  },
  {
    id:    'done',
    title: "You're All Set",
    body:  'Start logging to earn XP, build streaks, and climb the level chart. Every single log counts — your level is calculated from total lifetime XP, so nothing is wasted.',
    tip:   'The Home screen shows all your key stats at a glance. Check back daily to see your progress.',
    tooltipPosition: 'center',
    navigateTo: '/',
  },
]
