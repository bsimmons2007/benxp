import type { RawActivityData } from './xp'

export type SkillKey = 'lifting' | 'sports' | 'reading' | 'fortnite' | 'sleep' | 'cardio' | 'nutrition'

export interface SkillDef {
  key:         SkillKey
  label:       string
  icon:        string
  description: string
}

export const SKILL_DEFS: Record<SkillKey, SkillDef> = {
  lifting:   { key: 'lifting',   label: 'Lifting',   icon: 'lifting',   description: 'Consistency and strength in the gym' },
  sports:    { key: 'sports',    label: 'Sports',    icon: 'trophy',    description: 'Wins and sessions across all sports' },
  reading:   { key: 'reading',   label: 'Reading',   icon: 'books',     description: 'Books consumed and knowledge gained' },
  fortnite:  { key: 'fortnite',  label: 'Fortnite',  icon: 'fortnite',  description: 'Victory Royales and eliminations' },
  sleep:     { key: 'sleep',     label: 'Sleep',     icon: 'sleep',     description: 'Consistency and quality of rest' },
  cardio:    { key: 'cardio',    label: 'Cardio',    icon: 'cardio',    description: 'Miles of running, cycling, and swimming' },
  nutrition: { key: 'nutrition', label: 'Nutrition', icon: 'nutrition', description: 'Meals logged and full days tracked' },
}

// Food/discipline-themed titles for the Nutrition skill
const NUTRITION_TITLES: [number, string][] = [
  [1,   'Snacker'],
  [5,   'Meal Prepper'],
  [10,  'Macro Tracker'],
  [15,  'Disciplined Eater'],
  [20,  'Nutrition Nerd'],
  [25,  'Clean Eater'],
  [30,  'Dialed In'],
  [40,  'Diet Machine'],
  [50,  'Iron Stomach'],
  [65,  'Metabolic Master'],
  [80,  'Nutrition Sage'],
  [100, 'Godlike'],
]

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

export function getSkillTitle(level: number, key?: SkillKey): string {
  const table = key === 'nutrition' ? NUTRITION_TITLES : SKILL_TITLES
  let title = table[0][1]
  for (const [threshold, name] of table) {
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

/** Derive every skill's XP from the store's already-fetched rawRows — zero extra
 *  queries. Mirrors the app-wide XP_RATES so skill levels feel consistent with
 *  the global level. Replaces the old ~15-query fetchSkillXP. */
export function skillXPFromRawRows(r: RawActivityData): Record<SkillKey, number> {
  // Lifting XP: 15/set + 60/workout day
  const sets      = r.liftingRows.length
  const days      = new Set(r.liftingRows.map(x => x.date)).size
  const liftingXP = sets * 15 + days * 60

  // Reading XP: 250/book
  const readingXP = r.bookRows.filter(x => x.date_finished).length * 250

  // Fortnite XP: 100/win + 5/kill
  const fnXP = r.gameRows.reduce((s, x) => s + (x.win ? 100 : 0) + (x.kills ?? 0) * 5, 0)

  // Sleep XP: 20/night + 35 bonus for 7+ hrs
  const sleepXP = r.sleepRows.reduce((s, x) => s + 20 + ((x.hours_slept ?? 0) >= 7 ? 35 : 0), 0)

  // Cardio XP: 12/mile (flat rate across all cardio activities for the skill tree)
  const cardioXP = r.cardioRows.reduce((s, x) => s + (x.distance_miles ?? 0) * 12, 0)

  // Sports XP: aggregate across all sport tables, mirroring global XP rates
  const bbXP = r.bbRows.reduce((s, x) => s + 25 + (x.points ?? 0), 0)
  const pbXP = r.pbRows.reduce((s, x) => s + 15 + (x.win ? 20 : 0), 0)
  const golfXP = r.golfRows.reduce((s, x) => {
    const vsP = x.score - x.par
    return s + 50 + (vsP < 0 ? Math.abs(vsP) * 25 : 0)
  }, 0)
  const dgXP = r.dgRows.reduce((s, x) => {
    const vsP = x.score - x.par
    return s + 30 + (vsP < 0 ? Math.abs(vsP) * 15 : 0)
  }, 0)
  const hikeXP = r.hikeRows.reduce((s, x) =>
    s + (x.distance_miles ?? 0) * 20 + Math.floor((x.elevation_gain_ft ?? 0) / 500) * 15, 0)
  const ttXP = r.ttRows.reduce((s, x) => s + 10 + (x.win ? 15 : 0), 0)
  const chessXP = r.chessRows.reduce((s, x) =>
    s + 15 + (x.result === 'win' ? 25 : 0) + (x.result === 'draw' ? 8 : 0), 0)
  const vbXP = r.vbRows.reduce((s, x) => s + 15 + (x.win ? 20 : 0), 0)
  const sbXP = r.sbRows.reduce((s, x) => s + 15 + (x.win ? 20 : 0), 0)
  const poolXP = r.poolRows.reduce((s, x) => s + 10 + (x.win ? 15 : 0) + (x.break_and_run ? 25 : 0), 0)
  const sportsXP = bbXP + pbXP + golfXP + dgXP + hikeXP + ttXP + chessXP + vbXP + sbXP + poolXP

  // Nutrition XP: 10/meal capped 4/day + 25/full day (3+ meals) — mirrors XP_RATES
  const mealsByDate: Record<string, number> = {}
  for (const m of r.mealRows) mealsByDate[m.date] = (mealsByDate[m.date] ?? 0) + 1
  const mealCounts = Object.values(mealsByDate)
  const nutritionXP = mealCounts.reduce((s, c) => s + Math.min(c, 4) * 10, 0)
    + mealCounts.filter(c => c >= 3).length * 25

  return {
    lifting:   Math.round(liftingXP),
    sports:    Math.round(sportsXP),
    reading:   Math.round(readingXP),
    fortnite:  Math.round(fnXP),
    sleep:     Math.round(sleepXP),
    cardio:    Math.round(cardioXP),
    nutrition: Math.round(nutritionXP),
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
      title:    getSkillTitle(level, key),
      nextXP:   skillXPForLevel(level + 1) - xp,
    }
  })
}
