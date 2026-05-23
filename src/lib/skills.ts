import type { SupabaseClient } from '@supabase/supabase-js'

export type SkillKey = 'lifting' | 'sports' | 'reading' | 'fortnite' | 'sleep' | 'cardio'

export interface SkillDef {
  key:         SkillKey
  label:       string
  icon:        string
  description: string
}

export const SKILL_DEFS: Record<SkillKey, SkillDef> = {
  lifting:  { key: 'lifting',  label: 'Lifting',  icon: 'lifting',  description: 'Consistency and strength in the gym' },
  sports:   { key: 'sports',   label: 'Sports',   icon: 'trophy',   description: 'Wins and sessions across all sports' },
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
  const [lifting, books, games, sleep, cardio, basketball, pickleball, golf, discGolf, hiking, tableTennis, chess, volleyball, spikeball, pool] = await Promise.all([
    supabase.from('lifting_log').select('date'),
    supabase.from('books').select('id').not('date_finished', 'is', null),
    supabase.from('fortnite_games').select('kills, win'),
    supabase.from('sleep_log').select('hours_slept'),
    supabase.from('cardio_sessions').select('distance_miles'),
    supabase.from('basketball_sessions').select('points'),
    supabase.from('pickleball_games').select('win'),
    supabase.from('golf_rounds').select('score, par'),
    supabase.from('disc_golf_rounds').select('score, par'),
    supabase.from('hiking_sessions').select('distance_miles, elevation_gain_ft'),
    supabase.from('table_tennis_games').select('win'),
    supabase.from('chess_games').select('result'),
    supabase.from('volleyball_sessions').select('win'),
    supabase.from('spikeball_games').select('win'),
    supabase.from('pool_games').select('win, break_and_run'),
  ])

  // Lifting XP: 15/set + 60/workout day
  const liftRows  = lifting.data ?? []
  const sets      = liftRows.length
  const days      = new Set(liftRows.map((r: { date: string }) => r.date)).size
  const liftingXP = sets * 15 + days * 60

  // Reading XP: 250/book
  const readingXP = (books.data?.length ?? 0) * 250

  // Fortnite XP: 100/win + 5/kill
  const gameRows = games.data ?? []
  const fnXP = gameRows.reduce((s: number, r: { kills: number; win: boolean }) =>
    s + (r.win ? 100 : 0) + (r.kills ?? 0) * 5, 0)

  // Sleep XP: 20/night + 35 bonus for 7+ hrs
  const sleepXP = (sleep.data ?? []).reduce((s: number, r: { hours_slept: number | null }) =>
    s + 20 + ((r.hours_slept ?? 0) >= 7 ? 35 : 0), 0)

  // Cardio XP: 12/mile
  const cardioXP = (cardio.data ?? []).reduce((s: number, r: { distance_miles: number }) =>
    s + (r.distance_miles ?? 0) * 12, 0)

  // Sports XP: aggregate across all sport tables, mirroring global XP rates
  const bbXP = (basketball.data ?? []).reduce(
    (s: number, r: { points: number }) => s + 25 + (r.points ?? 0), 0)
  const pbXP = (pickleball.data ?? []).reduce(
    (s: number, r: { win: boolean }) => s + 15 + (r.win ? 20 : 0), 0)
  const golfXP = (golf.data ?? []).reduce(
    (s: number, r: { score: number; par: number }) => {
      const vsP = r.score - r.par
      return s + 50 + (vsP < 0 ? Math.abs(vsP) * 25 : 0)
    }, 0)
  const dgXP = (discGolf.data ?? []).reduce(
    (s: number, r: { score: number; par: number }) => {
      const vsP = r.score - r.par
      return s + 30 + (vsP < 0 ? Math.abs(vsP) * 15 : 0)
    }, 0)
  const hikeXP = (hiking.data ?? []).reduce(
    (s: number, r: { distance_miles: number; elevation_gain_ft: number | null }) =>
      s + (r.distance_miles ?? 0) * 20 + Math.floor((r.elevation_gain_ft ?? 0) / 500) * 15, 0)
  const ttXP = (tableTennis.data ?? []).reduce(
    (s: number, r: { win: boolean }) => s + 10 + (r.win ? 15 : 0), 0)
  const chessXP = (chess.data ?? []).reduce(
    (s: number, r: { result: string }) =>
      s + 15 + (r.result === 'win' ? 25 : 0) + (r.result === 'draw' ? 8 : 0), 0)
  const vbXP = (volleyball.data ?? []).reduce(
    (s: number, r: { win: boolean }) => s + 15 + (r.win ? 20 : 0), 0)
  const sbXP = (spikeball.data ?? []).reduce(
    (s: number, r: { win: boolean }) => s + 15 + (r.win ? 20 : 0), 0)
  const poolXP = (pool.data ?? []).reduce(
    (s: number, r: { win: boolean; break_and_run: boolean }) =>
      s + 10 + (r.win ? 15 : 0) + (r.break_and_run ? 25 : 0), 0)
  const sportsXP = bbXP + pbXP + golfXP + dgXP + hikeXP + ttXP + chessXP + vbXP + sbXP + poolXP

  return {
    lifting:  Math.round(liftingXP),
    sports:   Math.round(sportsXP),
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
