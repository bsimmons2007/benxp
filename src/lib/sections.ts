import { getPref, setPref } from './prefs'

export type SectionKey = 'lifting' | 'books' | 'skate' | 'sleep' | 'fortnite' | 'challenges' | 'mood' | 'cardio' | 'water' | 'basketball' | 'hobbies' | 'nutrition'

export interface SectionDef {
  label: string
  icon: string
  path: string
  categories: string[]
}

export const SECTION_DEFS: Record<SectionKey, SectionDef> = {
  lifting:    { label: 'Lifting',  icon: 'lifting',    path: '/lifting',    categories: ['Workout', 'Lifting'] },
  books:      { label: 'Books',    icon: 'books',      path: '/books',      categories: ['Reading'] },
  skate:      { label: 'Skate',    icon: 'skate',      path: '/skate',      categories: ['Skate'] },
  sleep:      { label: 'Sleep',    icon: 'sleep',      path: '/sleep',      categories: ['Sleep'] },
  fortnite:   { label: 'Fortnite', icon: 'fortnite',   path: '/fortnite',   categories: ['Gaming'] },
  challenges: { label: 'Quests',   icon: 'challenges', path: '/challenges', categories: [] },
  mood:       { label: 'Mood',     icon: 'mood',       path: '/mood',       categories: ['Mood'] },
  cardio:     { label: 'Cardio',   icon: 'cardio',     path: '/cardio',     categories: ['Cardio'] },
  water:      { label: 'Water',    icon: 'water',      path: '/water',      categories: ['Health'] },
  basketball: { label: 'Hoops',    icon: 'basketball', path: '/basketball', categories: ['Basketball'] },
  hobbies:    { label: 'Hobbies',  icon: 'hobbies',    path: '/hobbies',    categories: ['Basketball', 'Gaming'] },
  nutrition:  { label: 'Nutrition', icon: 'nutrition',  path: '/nutrition',  categories: ['Health'] },
}

// Skate is a subsection of Cardio — removed from nav
// Basketball + Fortnite live under /hobbies — excluded from standalone nav
// First 4 are the bottom-nav core tabs (see BottomNav CORE_TABS)
export const DEFAULT_ORDER: SectionKey[] = ['lifting', 'cardio', 'sleep', 'nutrition', 'challenges', 'mood', 'water', 'books', 'hobbies']

// Order + hidden are synced via prefs; legacy youxp-order/youxp-hidden
// localStorage keys are read as a fallback so existing devices keep their nav.
function legacyArray(key: string): SectionKey[] | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
    return Array.isArray(saved) ? saved as SectionKey[] : null
  } catch { return null }
}

export function loadSectionOrder(): SectionKey[] {
  const saved = getPref<SectionKey[] | null>('sectionOrder', null) ?? legacyArray('youxp-order')
  if (Array.isArray(saved)) {
    // Drop removed/merged keys; basketball + fortnite are now inside /hobbies
    const dropped = new Set(['skate', 'energy', 'strength', 'basketball', 'fortnite'])
    const validSaved = saved.filter((k): k is SectionKey => k in SECTION_DEFS && !dropped.has(k as string))
    const missing = DEFAULT_ORDER.filter(k => !validSaved.includes(k))
    return [...validSaved, ...missing]
  }
  return DEFAULT_ORDER
}

export function saveSectionOrder(order: SectionKey[]): void {
  setPref('sectionOrder', order)
  window.dispatchEvent(new Event('sections-updated'))
}

export function loadHiddenSections(): SectionKey[] {
  const saved = getPref<SectionKey[] | null>('hiddenSections', null) ?? legacyArray('youxp-hidden')
  if (Array.isArray(saved)) return saved
  return ['mood']
}

export function saveHiddenSections(hidden: SectionKey[]): void {
  setPref('hiddenSections', hidden)
  window.dispatchEvent(new Event('sections-updated'))
}
