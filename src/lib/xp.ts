import type { SupabaseClient } from '@supabase/supabase-js'

// ── Level Titles ── every 5 levels, themed progression arc
const LEVEL_TITLES: [number, string][] = [
  [1,   'Newcomer'],
  [5,   'Rookie'],
  [10,  'Contender'],
  [15,  'Grinder'],
  [20,  'Athlete'],
  [25,  'Competitor'],
  [30,  'Dedicated'],
  [35,  'Disciplined'],
  [40,  'Focused'],
  [45,  'Seasoned'],
  [50,  'Veteran'],
  [55,  'Hardened'],
  [60,  'Champion'],
  [65,  'Titan'],
  [70,  'Warlord'],
  [75,  'Ascendant'],
  [80,  'Immortal'],
  [85,  'Mythic'],
  [90,  'Legendary'],
  [95,  'Transcendent'],
  [100, 'Godlike'],
]

export function getLevelTitle(level: number): string {
  let title = LEVEL_TITLES[0][1]
  for (const [threshold, name] of LEVEL_TITLES) {
    if (level >= threshold) title = name
    else break
  }
  return title
}

export const XP_RATES = {
  per_set:              15,   // was 10 — each set requires real physical effort
  workout_day:          60,   // was 50 — consistency bonus
  new_pr:              200,   // was 150 — PRs are rare, meaningful milestones
  book_finished:       250,   // was 150 — finishing a book = hours of dedication
  skate_per_mile:       12,   // was 10 — slight bump for outdoor effort
  fortnite_win:        100,   // was 150 — wins happen frequently; less than PRs/books
  fortnite_kill:         3,   // NEW — kills now contribute to global XP
  sleep_log:            20,   // was 15 — consistency tracking matters
  sleep_quality_bonus:  35,   // was 25 — reward disciplined sleep more
  challenge:             0,   // fallback — each challenge carries its own xp_reward
  cardio_per_mile:      12,   // was 8 — matched to skate; running is comparable effort
  mood_log:             15,   // was 10 — daily mental health tracking is valuable
  measurement_log:      25,   // was 20 — body tracking deserves more
  water_goal_reached:   50,   // unchanged — daily 64oz goal hit
}

export function calculateLevel(totalXP: number): number {
  return Math.floor(1 + Math.sqrt(totalXP / 200))
}

export function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 200
}

export function levelProgress(totalXP: number): number {
  const level = calculateLevel(totalXP)
  const floor = xpForLevel(level)
  const ceiling = xpForLevel(level + 1)
  return (totalXP - floor) / (ceiling - floor)
}

export interface AppStats {
  benchPR: number | null
  squatPR: number | null
  deadliftPR: number | null
  totalMiles: number
  books2026: number
  winCount: number
}

/**
 * Single 7-query fetch that computes both totalXP and stats.
 * Previously these were two separate fetch calls (7 + 4 queries) with 4 overlapping tables.
 */
export async function fetchXPAndStats(supabase: SupabaseClient): Promise<{ totalXP: number; stats: AppStats }> {
  const [lifting, skate, prs, books, games, challenges, sleepLogs, cardio, goals, moodLogs, measurements, waterLog] = await Promise.all([
    supabase.from('lifting_log').select('date'),
    supabase.from('skate_sessions').select('miles'),
    supabase.from('pr_history').select('lift, est_1rm'),
    supabase.from('books').select('date_finished').not('date_finished', 'is', null),
    supabase.from('fortnite_games').select('win, kills'),
    supabase.from('challenges').select('xp_reward').eq('status', 'completed'),
    supabase.from('sleep_log').select('hours_slept'),
    supabase.from('cardio_sessions').select('distance_miles'),
    supabase.from('goals').select('xp_reward').eq('status', 'completed'),
    supabase.from('mood_log').select('id'),
    supabase.from('body_measurements').select('id'),
    supabase.from('water_log').select('date, oz'),
  ])

  // ── XP ──────────────────────────────────────────────────────
  const liftRows  = lifting.data  ?? []
  const skateRows = skate.data    ?? []
  const prRows    = prs.data      ?? []
  const bookRows  = books.data    ?? []
  const gameRows  = games.data    ?? []

  const setXP       = liftRows.length * XP_RATES.per_set
  const uniqueDays  = new Set(liftRows.map((r: { date: string }) => r.date)).size
  const dayXP       = uniqueDays * XP_RATES.workout_day
  const prXP        = prRows.length * XP_RATES.new_pr
  const bookXP      = bookRows.length * XP_RATES.book_finished
  const skateXP     = skateRows.reduce((s: number, r: { miles: number }) => s + (r.miles ?? 0), 0) * XP_RATES.skate_per_mile
  const fnXP        = gameRows.reduce((s: number, r: { win: boolean; kills: number }) =>
    s + (r.win ? XP_RATES.fortnite_win : 0) + ((r.kills ?? 0) * XP_RATES.fortnite_kill), 0)
  const challengeXP = (challenges.data ?? []).reduce((s: number, r: { xp_reward: number }) => s + (r.xp_reward ?? 0), 0)
  const sleepXP     = (sleepLogs.data ?? []).reduce(
    (s: number, r: { hours_slept: number | null }) =>
      s + XP_RATES.sleep_log + ((r.hours_slept ?? 0) >= 7 ? XP_RATES.sleep_quality_bonus : 0),
    0
  )
  const cardioXP      = (cardio.data ?? []).reduce((s: number, r: { distance_miles: number }) => s + (r.distance_miles ?? 0), 0) * XP_RATES.cardio_per_mile
  const goalXP        = (goals.data ?? []).reduce((s: number, r: { xp_reward: number }) => s + (r.xp_reward ?? 0), 0)
  const moodXP        = (moodLogs.data ?? []).length * XP_RATES.mood_log
  const measurementXP = (measurements.data ?? []).length * XP_RATES.measurement_log
  const waterGoalXP   = (() => {
    const byDate: Record<string, number> = {}
    for (const r of (waterLog.data ?? []) as { date: string; oz: number }[]) {
      byDate[r.date] = (byDate[r.date] ?? 0) + Number(r.oz)
    }
    return Object.values(byDate).filter(oz => oz >= 64).length * XP_RATES.water_goal_reached
  })()
  const totalXP = Math.round(setXP + dayXP + prXP + bookXP + skateXP + fnXP + challengeXP + sleepXP + cardioXP + goalXP + moodXP + measurementXP + waterGoalXP)

  // ── Stats ────────────────────────────────────────────────────
  const prMap: Record<string, number> = {}
  prRows.forEach((r: { lift: string; est_1rm: number }) => {
    if (!prMap[r.lift] || r.est_1rm > prMap[r.lift]) prMap[r.lift] = r.est_1rm
  })

  const stats: AppStats = {
    benchPR:    prMap['Bench']    ?? null,
    squatPR:    prMap['Squat']    ?? null,
    deadliftPR: prMap['Deadlift'] ?? null,
    totalMiles: skateRows.reduce((s: number, r: { miles: number }) => s + (r.miles ?? 0), 0),
    books2026:  bookRows.filter((r: { date_finished: string }) => r.date_finished >= '2026-01-01').length,
    winCount:   gameRows.filter((r: { win: boolean }) => r.win).length,
  }

  return { totalXP, stats }
}

// Still used for lightweight XP-only refresh after logging
export async function calculateTotalXP(supabase: SupabaseClient): Promise<number> {
  const { totalXP } = await fetchXPAndStats(supabase)
  return totalXP
}

// ── Strength milestones ────────────────────────────────────────
export interface StrengthMilestone {
  threshold: number
  name:      string
  icon:      string
  desc:      string
}

export const LIFT_MILESTONES: Record<string, StrengthMilestone[]> = {
  Bench: [
    { threshold: 95,  name: 'Bar Warrior',    icon: '🪵', desc: 'Bench pressed 95 lbs — bar + 25s.' },
    { threshold: 135, name: 'One Plate',       icon: '🥉', desc: 'Bench pressed 135 lbs — one plate per side.' },
    { threshold: 185, name: 'Smooth Presser',  icon: '💪', desc: 'Bench pressed 185 lbs.' },
    { threshold: 225, name: 'Two Plates',      icon: '🥈', desc: 'Bench pressed 225 lbs — two plates per side.' },
    { threshold: 275, name: 'Powerhouse',      icon: '🔱', desc: 'Bench pressed 275 lbs.' },
    { threshold: 315, name: 'Three Plates',    icon: '🥇', desc: 'Bench pressed 315 lbs — three plates per side.' },
    { threshold: 365, name: 'Press Lord',      icon: '⚡', desc: 'Bench pressed 365 lbs.' },
    { threshold: 405, name: 'Four Plates',     icon: '👑', desc: 'Bench pressed 405 lbs — four plates per side.' },
  ],
  Squat: [
    { threshold: 135, name: 'First Squat Plate', icon: '🦵', desc: 'Squatted 135 lbs.' },
    { threshold: 225, name: 'Squat Warm-Up',     icon: '🔥', desc: 'Squatted 225 lbs.' },
    { threshold: 315, name: 'Quad Dominant',     icon: '🏔️', desc: 'Squatted 315 lbs — three plates per side.' },
    { threshold: 405, name: 'Four Wheels',       icon: '🌋', desc: 'Squatted 405 lbs — four wheels.' },
    { threshold: 495, name: 'Squat God',         icon: '👑', desc: 'Squatted 495 lbs.' },
    { threshold: 585, name: 'Elite Squatter',    icon: '🌌', desc: 'Squatted 585 lbs.' },
  ],
  Deadlift: [
    { threshold: 225, name: 'Pulling Weight',    icon: '⛓️', desc: 'Deadlifted 225 lbs.' },
    { threshold: 315, name: 'Chain Puller',      icon: '🔩', desc: 'Deadlifted 315 lbs.' },
    { threshold: 405, name: 'Four Wheels Pull',  icon: '🏋️', desc: 'Deadlifted 405 lbs.' },
    { threshold: 500, name: 'Five Hundred',      icon: '🏆', desc: 'Deadlifted 500 lbs.' },
    { threshold: 600, name: 'Six Hundred Club',  icon: '👑', desc: 'Deadlifted 600 lbs.' },
    { threshold: 700, name: 'Absolute Unit',     icon: '🌌', desc: 'Deadlifted 700 lbs.' },
  ],
  PullUps: [
    { threshold: 1,  name: 'First Pull',         icon: '🌱', desc: 'Did your first pull-up.' },
    { threshold: 5,  name: 'Five Up',             icon: '🏅', desc: 'Did 5 pull-ups in one set.' },
    { threshold: 10, name: 'Double Digits',       icon: '💪', desc: 'Did 10 pull-ups in one set.' },
    { threshold: 15, name: 'Pull-Up Machine',     icon: '🔱', desc: 'Did 15 pull-ups in one set.' },
    { threshold: 20, name: 'Bar Athlete',         icon: '🥇', desc: 'Did 20 pull-ups in one set.' },
    { threshold: 25, name: 'Calisthenics God',    icon: '👑', desc: 'Did 25 pull-ups in one set.' },
  ],
  PushUps: [
    { threshold: 10, name: 'Push Starter',        icon: '🌱', desc: 'Did 10 push-ups in one set.' },
    { threshold: 20, name: 'Twenty Strong',        icon: '💪', desc: 'Did 20 push-ups in one set.' },
    { threshold: 50, name: 'Half Century Push',    icon: '🔥', desc: 'Did 50 push-ups in one set.' },
    { threshold: 100, name: 'Push-Up Legend',      icon: '👑', desc: 'Did 100 push-ups in one set.' },
  ],
}


/**
 * Returns the highest milestone just crossed for a given lift.
 * For weight-based lifts, compares est1rm. For rep-based lifts, compares reps directly.
 * Returns null if no new milestone was crossed.
 */
export function getMilestoneHit(
  lift:      string,
  oldValue:  number,   // previous best est1rm (or 0) / previous max reps (or 0)
  newValue:  number,   // new est1rm / new reps
): StrengthMilestone | null {
  const milestones = LIFT_MILESTONES[lift]
  if (!milestones) return null
  // Find the highest threshold that is <= newValue but > oldValue
  let hit: StrengthMilestone | null = null
  for (const m of milestones) {
    if (newValue >= m.threshold && oldValue < m.threshold) {
      if (!hit || m.threshold > hit.threshold) hit = m
    }
  }
  return hit
}

export async function checkForPR(
  supabase: SupabaseClient,
  lift: string,
  newEst1RM: number,
  date: string,
  currentRowId: string,
  userId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('lifting_log')
    .select('est_1rm')
    .eq('lift', lift)
    .neq('id', currentRowId)
    .order('est_1rm', { ascending: false })
    .limit(1)

  const previousBest = existing?.[0]?.est_1rm ?? 0

  if (newEst1RM > previousBest) {
    await supabase.from('pr_history').insert({ user_id: userId, date, lift, est_1rm: newEst1RM })
    return true
  }
  return false
}
