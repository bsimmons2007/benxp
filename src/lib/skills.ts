import type { SupabaseClient } from '@supabase/supabase-js'

export type SkillKey = 'lifting' | 'skating' | 'reading' | 'fortnite' | 'sleep' | 'cardio'

export interface SkillDef {
  key:         SkillKey
  label:       string
  icon:        string
  description: string
}

export const SKILL_DEFS: Record<SkillKey, SkillDef> = {
  lifting:  { key: 'lifting',  label: 'Lifting',  icon: 'lifting',  description: 'Consistency and strength in the gym' },
  skating:  { key: 'skating',  label: 'Skating',  icon: 'skate',    description: 'Total miles and sessions on wheels' },
  reading:  { key: 'reading',  label: 'Reading',  icon: 'books',    description: 'Books consumed and knowledge gained' },
  fortnite: { key: 'fortnite', label: 'Fortnite', icon: 'fortnite', description: 'Victory Royales and eliminations' },
  sleep:    { key: 'sleep',    label: 'Sleep',    icon: 'sleep',    description: 'Consistency and quality of rest' },
  cardio:   { key: 'cardio',   label: 'Cardio',   icon: 'cardio',   description: 'Miles of running, cycling, and swimming' },
}

// Skill titles — tiered progression from Beginner to Godlike
const SKILL_TITLES: [number, string][] = [
  [1,   'Beginner'],
  [5,   'Apprentice'],
  [10,  'Practitioner'],
  [15,  'Skilled'],
  [20,  'Proficient'],
  [25,  'Expert'],
  [30,  'Master'],
  [40,  'Grandmaster'],
  [50,  'Legend'],
  [65,  'Elite'],
  [80,  'Mythic'],
  [100, 'Godlike'],
]

export function getSkillTitle(level: number): string {
  let title = SKILL_TITLES[0][1]
  for (const [threshold, name] of SKILL_TITLES) {
    if (level >= threshold) title = name
    else break
  }
  return title
}

// Skill XP uses a gentler curve than global XP: level = floor(1 + sqrt(xp / 50))
export function skillLevel(xp: number): number {
  return Math.floor(1 + Math.sqrt(xp / 50))
}

export function skillXPForLevel(level: number): number {
  return (level - 1) ** 2 * 50
}

export function skillProgress(xp: number): number {
  const level   = skillLevel(xp)
  const floor   = skillXPForLevel(level)
  const ceiling = skillXPForLevel(level + 1)
  return ceiling === floor ? 1 : (xp - floor) / (ceiling - floor)
}

export interface SkillState {
  key:      SkillKey
  xp:       number
  level:    number
  progress: number
  title:    string
  nextXP:   number
}

export async function fetchSkillXP(supabase: SupabaseClient): Promise<Record<SkillKey, number>> {
  const [lifting, skate, books, games, sleep, cardio] = await Promise.all([
    supabase.from('lifting_log').select('date'),
    supabase.from('skate_sessions').select('miles'),
    supabase.from('books').select('id').not('date_finished', 'is', null),
    supabase.from('fortnite_games').select('kills, win'),
    supabase.from('sleep_log').select('hours_slept'),
    supabase.from('cardio_sessions').select('distance_miles'),
  ])

  // Lifting XP: 15/set + 60/workout day (mirrors global rates)
  const liftRows   = lifting.data  ?? []
  const sets       = liftRows.length
  const days       = new Set(liftRows.map((r: { date: string }) => r.date)).size
  const liftingXP  = sets * 15 + days * 60

  // Skating XP: 12/mile
  const skateXP    = (skate.data ?? []).reduce((s: number, r: { miles: number }) => s + r.miles * 12, 0)

  // Reading XP: 250/book
  const readingXP  = (books.data?.length ?? 0) * 250

  // Fortnite XP: 100/win + 5/kill
  const gameRows   = games.data ?? []
  const fnXP       = gameRows.reduce((s: number, r: { kills: number; win: boolean }) =>
    s + (r.win ? 100 : 0) + (r.kills ?? 0) * 5, 0)

  // Sleep XP: 20/night + 35 bonus for 7+ hrs
  const sleepXP    = (sleep.data ?? []).reduce((s: number, r: { hours_slept: number | null }) =>
    s + 20 + ((r.hours_slept ?? 0) >= 7 ? 35 : 0), 0)

  // Cardio XP: 12/mile (run, bike, swim — same rate as skating)
  const cardioXP   = (cardio.data ?? []).reduce((s: number, r: { distance_miles: number }) =>
    s + (r.distance_miles ?? 0) * 12, 0)

  return {
    lifting:  Math.round(liftingXP),
    skating:  Math.round(skateXP),
    reading:  Math.round(readingXP),
    fortnite: Math.round(fnXP),
    sleep:    Math.round(sleepXP),
    cardio:   Math.round(cardioXP),
  }
}

export function buildSkillStates(xpMap: Record<SkillKey, number>): SkillState[] {
  return (Object.keys(SKILL_DEFS) as SkillKey[]).map(key => {
    const xp    = xpMap[key]
    const level = skillLevel(xp)
    return {
      key,
      xp,
      level,
      progress: skillProgress(xp),
      title:    getSkillTitle(level),
      nextXP:   skillXPForLevel(level + 1) - xp,
    }
  })
}
