export type SectionKey = 'lifting' | 'books' | 'skate' | 'sleep' | 'fortnite' | 'challenges' | 'mood' | 'cardio' | 'water'

export interface SectionDef {
  label: string
  icon: string
  path: string
  categories: string[]
}

export const SECTION_DEFS: Record<SectionKey, SectionDef> = {
  lifting:    { label: 'Lifting',  icon: '🏋️', path: '/lifting',    categories: ['Workout', 'Lifting'] },
  books:      { label: 'Books',    icon: '📚', path: '/books',      categories: ['Reading'] },
  skate:      { label: 'Skate',    icon: '🛼', path: '/skate',      categories: ['Skate'] },
  sleep:      { label: 'Sleep',    icon: '😴', path: '/sleep',      categories: ['Sleep'] },
  fortnite:   { label: 'Fortnite', icon: '🎮', path: '/fortnite',   categories: ['Gaming'] },
  challenges: { label: 'Quests',   icon: '⚔️', path: '/challenges', categories: [] },
  mood:       { label: 'Mood',     icon: '🧠', path: '/mood',       categories: ['Mood'] },
  cardio:     { label: 'Cardio',   icon: '🏃', path: '/cardio',     categories: ['Cardio'] },
  water:      { label: 'Water',    icon: '💧', path: '/water',      categories: ['Health'] },
}

// Skate is a subsection of Cardio — removed from nav
export const DEFAULT_ORDER: SectionKey[] = ['lifting', 'books', 'cardio', 'sleep', 'fortnite', 'challenges', 'mood', 'water']

export function loadSectionOrder(): SectionKey[] {
  try {
    const saved = JSON.parse(localStorage.getItem('benxp-order') ?? 'null') as SectionKey[]
    if (Array.isArray(saved)) {
      // Drop skate + energy (merged/removed), keep valid keys, append any new ones
      const validSaved = saved.filter((k): k is SectionKey => k in SECTION_DEFS && (k as string) !== 'skate' && (k as string) !== 'energy' && (k as string) !== 'strength')
      const missing = DEFAULT_ORDER.filter(k => !validSaved.includes(k))
      return [...validSaved, ...missing]
    }
  } catch { /* ignore */ }
  return DEFAULT_ORDER
}

export function saveSectionOrder(order: SectionKey[]): void {
  localStorage.setItem('benxp-order', JSON.stringify(order))
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
}
