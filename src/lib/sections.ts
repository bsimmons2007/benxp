export type SectionKey = 'lifting' | 'books' | 'skate' | 'sleep' | 'fortnite' | 'challenges' | 'mood' | 'cardio' | 'water' | 'basketball' | 'hobbies'

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
}

// Skate is a subsection of Cardio — removed from nav
// Basketball + Fortnite live under /hobbies — excluded from standalone nav
export const DEFAULT_ORDER: SectionKey[] = ['lifting', 'books', 'cardio', 'sleep', 'challenges', 'mood', 'water', 'hobbies']

export function loadSectionOrder(): SectionKey[] {
  try {
    const saved = JSON.parse(localStorage.getItem('benxp-order') ?? 'null') as SectionKey[]
    if (Array.isArray(saved)) {
      // Drop removed/merged keys; basketball + fortnite are now inside /hobbies
      const dropped = new Set(['skate', 'energy', 'strength', 'basketball', 'fortnite'])
      const validSaved = saved.filter((k): k is SectionKey => k in SECTION_DEFS && !dropped.has(k as string))
      const missing = DEFAULT_ORDER.filter(k => !validSaved.includes(k))
      return [...validSaved, ...missing]
    }
  } catch { /* ignore */ }
  return DEFAULT_ORDER
}

export function saveSectionOrder(order: SectionKey[]): void {
  localStorage.setItem('benxp-order', JSON.stringify(order))
  window.dispatchEvent(new Event('sections-updated'))
}

export function loadHiddenSections(): SectionKey[] {
  try {
    const saved = JSON.parse(localStorage.getItem('benxp-hidden') ?? 'null') as SectionKey[]
    if (Array.isArray(saved)) return saved
  } catch { /* ignore */ }
  return ['mood']
}

export function saveHiddenSections(hidden: SectionKey[]): void {
  localStorage.setItem('benxp-hidden', JSON.stringify(hidden))
  window.dispatchEvent(new Event('sections-updated'))
}
