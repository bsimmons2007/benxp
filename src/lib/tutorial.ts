export const TUTORIAL_KEY = 'benxp-tutorial-done'

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
  id:              string
  title:           string
  body:            string
  target?:         string
  tooltipPosition?: 'above' | 'below' | 'center'
  navigateTo?:     string   // navigate to this route before showing step
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id:    'welcome',
    title: 'Welcome to BenXP',
    body:  'Your personal life tracker. Log workouts, sleep, games, books & more — everything earns XP and levels you up.',
    tooltipPosition: 'center',
    navigateTo: '/',
  },
  {
    id:              'nav',
    title:           'Your Sections',
    body:            'Each tab is a different part of your life. Tap to switch between Lifting, Cardio, Sleep, Books, Hobbies and more.',
    target:          '[data-tutorial="bottom-nav"]',
    tooltipPosition: 'above',
    navigateTo:      '/',
  },
  {
    id:              'xp-level',
    title:           'Your XP & Level',
    body:            'Tap the logo anytime to see your monthly summary. Every logged activity earns XP and advances your level.',
    target:          '[data-tutorial="topbar-logo"]',
    tooltipPosition: 'below',
    navigateTo:      '/',
  },
  {
    id:         'lifting',
    title:      'Lifting',
    body:       'Log every set you do — weight, reps, and exercise. Hit a new max and you earn a PR + bonus XP. Your strength is tracked on the body map.',
    target:     '[data-tutorial="log-workout-btn"]',
    tooltipPosition: 'below',
    navigateTo: '/lifting',
  },
  {
    id:         'cardio',
    title:      'Cardio',
    body:       'Log runs, bikes, swims — any distance activity. You earn XP per mile. Consistency builds your streak.',
    target:     '[data-tutorial="log-cardio-btn"]',
    tooltipPosition: 'below',
    navigateTo: '/cardio',
  },
  {
    id:         'sleep',
    title:      'Sleep',
    body:       'Log your bedtime and wake time. The app tracks sleep debt, quality scores, and your streak. Good sleep = bonus XP.',
    target:     '[data-tutorial="log-sleep-btn"]',
    tooltipPosition: 'below',
    navigateTo: '/sleep',
  },
  {
    id:    'goals',
    title: 'Goals & Challenges',
    body:  'Set personal goals and take on Challenges for bonus XP. Find them in the sidebar — Goals tracks progress, Challenges give one-time rewards.',
    tooltipPosition: 'center',
    navigateTo: '/',
  },
  {
    id:              'settings',
    title:           'Make It Yours',
    body:            'Tap the gear to show/hide sections, reorder your nav tabs, and personalize your experience.',
    target:          '[data-tutorial="settings-btn"]',
    tooltipPosition: 'below',
    navigateTo:      '/',
  },
  {
    id:    'done',
    title: "You're All Set!",
    body:  'Start logging to build streaks, earn XP, and climb the level chart. The more consistent you are, the faster you grow.',
    tooltipPosition: 'center',
    navigateTo: '/',
  },
]
