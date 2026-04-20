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
  id: string
  title: string
  body: string
  target?: string
  tooltipPosition?: 'above' | 'below' | 'left' | 'right' | 'center'
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to BenXP 🎮',
    body: 'Your personal life tracker. Log workouts, sleep, games, books & more — everything earns XP.',
    tooltipPosition: 'center',
  },
  {
    id: 'nav',
    title: 'Your Sections',
    body: 'Each tab is a different part of your life. Tap to switch between Lifting, Sleep, Books, Hobbies, and more.',
    target: '[data-tutorial="bottom-nav"]',
    tooltipPosition: 'above',
  },
  {
    id: 'xp-level',
    title: 'Your XP Level',
    body: 'Tap the logo to see your monthly summary. Every logged activity earns XP and levels you up.',
    target: '[data-tutorial="topbar-logo"]',
    tooltipPosition: 'below',
  },
  {
    id: 'logging',
    title: 'Earning XP',
    body: "On every section page, tap '+ Log' to record an activity. Each log awards XP — stay consistent to level up faster.",
    tooltipPosition: 'center',
  },
  {
    id: 'goals',
    title: 'Goals & Challenges',
    body: 'Set personal goals and complete Challenges for bonus XP. Find them in the sidebar under Goals and Challenges.',
    tooltipPosition: 'center',
  },
  {
    id: 'settings',
    title: 'Make It Yours',
    body: 'Tap the gear to show/hide sections, reorder your nav, and personalize the app.',
    target: '[data-tutorial="settings-btn"]',
    tooltipPosition: 'below',
  },
  {
    id: 'done',
    title: "You're All Set! 🏆",
    body: 'Start logging to build streaks, earn XP, and climb the level chart. The more consistent you are, the faster you grow.',
    tooltipPosition: 'center',
  },
]
