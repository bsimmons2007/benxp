import type { SupabaseClient } from '@supabase/supabase-js'
import { localDateStr } from './utils'

export interface ActivityEntry {
  type: string
  label: string
  date: string
  icon: string
}

type TrendDir = 'up' | 'down' | 'flat'
export interface TrendResult {
  dirs:      Record<string, TrendDir>
  prDeltas:  { bench: number | null; squat: number | null; deadlift: number | null }
}

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

/** Epley 1RM formula — capped at 12 reps; beyond that the formula overestimates badly */
export function epleyEst1RM(weight: number, reps: number): number {
  return Math.round((1 + Math.min(reps, 12) / 30) * weight * 10) / 10
}

export function getLevelTitle(level: number): string {
  let title = LEVEL_TITLES[0][1]
  for (const [threshold, name] of LEVEL_TITLES) {
    if (level >= threshold) title = name
    else break
  }
  return title
}

export const XP_RATES = {
  per_set:              15,   // each set requires real physical effort
  workout_day:          60,   // consistency bonus
  new_pr:              200,   // PRs are rare, meaningful milestones
  book_finished:       250,   // finishing a book = hours of dedication
  skate_per_mile:       12,   // outdoor effort
  fortnite_win:        100,   // wins happen frequently (~30 min game)
  fortnite_blitz_win:   30,   // blitz wins (~5 min game, ~3x less XP)
  fortnite_kill:         3,   // kills contribute to global XP
  sleep_log:            20,   // consistency tracking matters
  sleep_quality_bonus:  35,   // reward disciplined sleep
  challenge:             0,   // fallback — each challenge carries its own xp_reward
  cardio_per_mile:      12,   // fallback
  cardio_run_per_mile:  15,   // ~8-10 min/mile effort
  cardio_bike_per_mile:  6,   // ~4-5 min/mile, lower effort per distance
  cardio_swim_per_mile: 25,   // ~30-40 min/mile, highest effort per distance
  cardio_walk_per_mile:  4,   // ~15-20 min/mile, low intensity
  mood_log:             15,   // daily mental health tracking
  measurement_log:       5,   // body tracking — minimal, one per day enforced
  water_goal_reached:   50,   // daily 64oz goal hit
  basketball_session:   25,   // per hoops session
  basketball_per_point:  1,   // each point scored
  pickleball_game:      15,   // per pickleball game logged
  pickleball_win:       20,   // win bonus
  golf_round:           50,   // per round logged
  golf_under_par:       25,   // bonus per stroke under par (shooting -3 = +75 XP)
  disc_golf_round:      30,   // per round logged
  disc_golf_under_par:  15,   // bonus per stroke under par
  hiking_per_mile:      20,   // per mile hiked
  hiking_per_500ft:     15,   // per 500 ft elevation gain
  table_tennis_game:    10,   // per game logged
  table_tennis_win:     15,   // win bonus
  chess_game:           15,   // per game logged
  chess_win:            25,   // win bonus
  chess_draw:            8,   // draw bonus
  volleyball_game:      15,   // per session logged
  volleyball_win:       20,   // win bonus
  spikeball_game:       15,   // per game logged
  spikeball_win:        20,   // win bonus
  pool_game:            10,   // per game logged
  pool_win:             15,   // win bonus
  pool_break_and_run:   25,   // bonus for break and run
}

export function calculateLevel(totalXP: number): number {
  return Math.floor(1 + Math.sqrt(totalXP / 150))
}

export function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 150
}

export function levelProgress(totalXP: number): number {
  const level = calculateLevel(totalXP)
  const floor = xpForLevel(level)
  const ceiling = xpForLevel(level + 1)
  return (totalXP - floor) / (ceiling - floor)
}

export interface AppStats {
  // Lifting
  benchPR:       number | null
  squatPR:       number | null
  deadliftPR:    number | null
  ohpPR:         number | null
  totalSets:     number
  // Cardio / outdoor
  cardioMiles:   number
  runMiles:      number
  hikeMiles:     number
  // Skating
  totalMiles:    number
  // Books / gaming
  booksThisYear: number
  winCount:      number
  fnGamesTotal:  number
  fnKillsAvg:    number | null
  // Sports counts
  basketballGames:  number
  pickleballGames:  number
  golfRounds:       number
  discGolfRounds:   number
  chessGames:       number
  poolGames:        number
  // Wellness
  sleepAvg7:     number | null
  moodAvg30:     number | null
  waterOzToday:  number
  latestWeight:  number | null
  latestBodyFat: number | null
}

/** Raw rows from the 22-table fetch — shared with useStreak, useAchievements, activity feed, and trend computation to eliminate duplicate queries. */
export interface RawActivityData {
  liftingRows:   { date: string; lift: string; est_1rm: number | null; weight: number | null; sets: number | null; reps: number | null }[]
  prRows:        { lift: string; est_1rm: number; date: string }[]
  skateRows:     { miles: number; date: string }[]
  bookRows:      { date_finished: string | null; title: string }[]
  gameRows:      { date: string; kills: number; win: boolean; mode?: string | null; accuracy?: number | null }[]
  challengeRows: { status: string; xp_reward: number }[]
  sleepRows:     { date: string; hours_slept: number | null }[]
  cardioRows:    { date: string; distance_miles: number; activity: string }[]
  bbRows:        { date: string; points: number; fg_made: number; fg_attempted: number }[]
  pbRows:        { date: string; win: boolean; my_score: number | null; opp_score: number | null }[]
  golfRows:      { date: string; score: number; par: number; holes: number; course: string | null }[]
  dgRows:        { date: string; score: number; par: number; holes: number; course: string | null }[]
  hikeRows:      { date: string; distance_miles: number; elevation_gain_ft: number | null; difficulty: string | null; trail: string | null }[]
  ttRows:        { date: string; win: boolean; my_score: number | null; opp_score: number | null }[]
  chessRows:     { date: string; result: string; rating_after: number | null; opening: string | null }[]
  poolRows:      { date: string; win: boolean; break_and_run: boolean; game_type: string | null }[]
  vbRows:        { date: string; win: boolean; format: string; kills: number | null }[]
  sbRows:        { date: string; win: boolean }[]
  moodRows:      { date: string; mood?: number | null }[]
  waterRows:     { date: string; oz: number }[]
}

// ── localStorage cache (stale-while-revalidate) ──────────────────
const XP_CACHE_KEY = 'youxp-xp-cache-v2'
const XP_CACHE_TTL = 5 * 60 * 1000

export function getCachedXPData(): { totalXP: number; stats: AppStats } | null {
  try {
    const raw = localStorage.getItem(XP_CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > XP_CACHE_TTL) return null
    return data
  } catch { return null }
}

export function setCachedXPData(data: { totalXP: number; stats: AppStats }) {
  try { localStorage.setItem(XP_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

export function getCachedXPTimestamp(): number | null {
  try {
    const raw = localStorage.getItem(XP_CACHE_KEY)
    if (!raw) return null
    const { ts } = JSON.parse(raw)
    return typeof ts === 'number' ? ts : null
  } catch { return null }
}

/** Fetch XP, stats, and raw activity rows in one parallel batch.
 *  Raw rows are shared with useStreak and useAchievements to eliminate ~35 duplicate queries per session.
 */
export async function fetchXPAndStats(supabase: SupabaseClient): Promise<{ totalXP: number; stats: AppStats; rawRows: RawActivityData }> {
  const [lifting, skate, prs, books, games, challenges, sleepLogs, cardio, goals, moodLogs, measurements, waterLog, basketball, pickleball, golf, discGolf, hiking, tableTennis, chess, volleyball, spikeball, pool] = await Promise.all([
    supabase.from('lifting_log').select('date, lift, est_1rm, weight, sets, reps'),
    supabase.from('skate_sessions').select('miles, date'),
    supabase.from('pr_history').select('lift, est_1rm, date'),
    supabase.from('books').select('date_finished, title').not('date_finished', 'is', null),
    supabase.from('fortnite_games').select('win, kills, mode, date, accuracy'),
    supabase.from('challenges').select('status, xp_reward'),
    supabase.from('sleep_log').select('hours_slept, date').eq('is_nap', false),
    supabase.from('cardio_sessions').select('distance_miles, activity, date'),
    supabase.from('goals').select('xp_reward').eq('status', 'completed'),
    supabase.from('mood_log').select('date, mood'),
    supabase.from('body_measurements').select('date, weight_lbs, body_fat_pct').order('date', { ascending: false }),
    supabase.from('water_log').select('date, oz'),
    supabase.from('basketball_sessions').select('points, date, fg_made, fg_attempted'),
    supabase.from('pickleball_games').select('win, date, my_score, opp_score'),
    supabase.from('golf_rounds').select('score, par, date, holes, course'),
    supabase.from('disc_golf_rounds').select('score, par, date, holes, course'),
    supabase.from('hiking_sessions').select('distance_miles, elevation_gain_ft, date, difficulty, trail'),
    supabase.from('table_tennis_games').select('win, date, my_score, opp_score'),
    supabase.from('chess_games').select('result, date, rating_after, opening'),
    supabase.from('volleyball_sessions').select('win, date, format, kills'),
    supabase.from('spikeball_games').select('win, date'),
    supabase.from('pool_games').select('win, break_and_run, date, game_type'),
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
  const fnXP        = gameRows.reduce((s: number, r: { win: boolean; kills: number; mode?: string | null }) => {
    const isBlitz = r.mode === 'Blitz' || (typeof r.mode === 'string' && r.mode.startsWith('Blitz '))
    const winXP   = r.win ? (isBlitz ? XP_RATES.fortnite_blitz_win : XP_RATES.fortnite_win) : 0
    return s + winXP + ((r.kills ?? 0) * XP_RATES.fortnite_kill)
  }, 0)
  const challengeXP = (challenges.data ?? []).filter((r: { status: string }) => r.status === 'completed' || r.status === 'claimed').reduce((s: number, r: { xp_reward: number }) => s + (r.xp_reward ?? 0), 0)
  const sleepXP     = (sleepLogs.data ?? []).reduce(
    (s: number, r: { hours_slept: number | null }) =>
      s + XP_RATES.sleep_log + ((r.hours_slept ?? 0) >= 7 ? XP_RATES.sleep_quality_bonus : 0),
    0
  )
  const cardioXP      = (cardio.data ?? []).reduce((s: number, r: { distance_miles: number; activity: string }) => {
    const rate = r.activity === 'run'  ? XP_RATES.cardio_run_per_mile
               : r.activity === 'bike' ? XP_RATES.cardio_bike_per_mile
               : r.activity === 'swim' ? XP_RATES.cardio_swim_per_mile
               : r.activity === 'walk' ? XP_RATES.cardio_walk_per_mile
               : XP_RATES.cardio_per_mile
    return s + (r.distance_miles ?? 0) * rate
  }, 0)
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
  const basketballXP  = (basketball.data ?? []).reduce(
    (s: number, r: { points: number }) =>
      s + XP_RATES.basketball_session + ((r.points ?? 0) * XP_RATES.basketball_per_point),
    0
  )
  const pickleballXP  = (pickleball.data ?? []).reduce(
    (s: number, r: { win: boolean }) =>
      s + XP_RATES.pickleball_game + (r.win ? XP_RATES.pickleball_win : 0),
    0
  )
  const golfXP = (golf.data ?? []).reduce(
    (s: number, r: { score: number; par: number }) => {
      const vsP = r.score - r.par
      const underParBonus = vsP < 0 ? Math.abs(vsP) * XP_RATES.golf_under_par : 0
      return s + XP_RATES.golf_round + underParBonus
    }, 0
  )
  const discGolfXP = (discGolf.data ?? []).reduce(
    (s: number, r: { score: number; par: number }) => {
      const vsP = r.score - r.par
      const underParBonus = vsP < 0 ? Math.abs(vsP) * XP_RATES.disc_golf_under_par : 0
      return s + XP_RATES.disc_golf_round + underParBonus
    }, 0
  )
  const hikingXP = (hiking.data ?? []).reduce(
    (s: number, r: { distance_miles: number; elevation_gain_ft: number | null }) => {
      const milesXP = (r.distance_miles ?? 0) * XP_RATES.hiking_per_mile
      const elevXP  = Math.floor((r.elevation_gain_ft ?? 0) / 500) * XP_RATES.hiking_per_500ft
      return s + milesXP + elevXP
    }, 0
  )
  const tableTennisXP = (tableTennis.data ?? []).reduce(
    (s: number, r: { win: boolean }) =>
      s + XP_RATES.table_tennis_game + (r.win ? XP_RATES.table_tennis_win : 0), 0
  )
  const chessXP = (chess.data ?? []).reduce(
    (s: number, r: { result: string }) =>
      s + XP_RATES.chess_game
        + (r.result === 'win'  ? XP_RATES.chess_win  : 0)
        + (r.result === 'draw' ? XP_RATES.chess_draw : 0), 0
  )
  const volleyballXP = (volleyball.data ?? []).reduce(
    (s: number, r: { win: boolean }) =>
      s + XP_RATES.volleyball_game + (r.win ? XP_RATES.volleyball_win : 0), 0
  )
  const spikeballXP = (spikeball.data ?? []).reduce(
    (s: number, r: { win: boolean }) =>
      s + XP_RATES.spikeball_game + (r.win ? XP_RATES.spikeball_win : 0), 0
  )
  const poolXP = (pool.data ?? []).reduce(
    (s: number, r: { win: boolean; break_and_run: boolean }) =>
      s + XP_RATES.pool_game
        + (r.win ? XP_RATES.pool_win : 0)
        + (r.break_and_run ? XP_RATES.pool_break_and_run : 0), 0
  )
  const totalXP = Math.round(setXP + dayXP + prXP + bookXP + skateXP + fnXP + challengeXP + sleepXP + cardioXP + goalXP + moodXP + measurementXP + waterGoalXP + basketballXP + pickleballXP + golfXP + discGolfXP + hikingXP + tableTennisXP + chessXP + volleyballXP + spikeballXP + poolXP)

  // ── Stats ────────────────────────────────────────────────────
  const prMap: Record<string, number> = {}
  prRows.forEach((r: { lift: string; est_1rm: number }) => {
    if (!prMap[r.lift] || r.est_1rm > prMap[r.lift]) prMap[r.lift] = r.est_1rm
  })

  // Sleep: avg of last 7 nights
  const sleepByDate: Record<string, number> = {}
  ;(sleepLogs.data ?? []).forEach((r: { hours_slept: number | null; date: string }) => {
    if (r.hours_slept != null) sleepByDate[r.date] = r.hours_slept
  })
  const sleepDates = Object.keys(sleepByDate).sort().slice(-7)
  const sleepAvg7  = sleepDates.length
    ? Math.round((sleepDates.reduce((s, d) => s + sleepByDate[d], 0) / sleepDates.length) * 10) / 10
    : null

  // Mood: avg last 30 days
  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
  const thirtyAgoStr = localDateStr(thirtyAgo)
  const recentMoods = (moodLogs.data ?? []).filter(
    (r: { mood: number; date: string }) => r.date >= thirtyAgoStr && r.mood != null
  ) as { mood: number; date: string }[]
  const moodAvg30 = recentMoods.length
    ? Math.round((recentMoods.reduce((s, r) => s + r.mood, 0) / recentMoods.length) * 10) / 10
    : null

  // Water: today's total oz
  const todayStr = localDateStr(new Date())
  const waterOzToday = (waterLog.data ?? [])
    .filter((r: { date: string; oz: number }) => r.date === todayStr)
    .reduce((s: number, r: { oz: number }) => s + Number(r.oz), 0)

  // Cardio breakdowns
  const cardioRows = (cardio.data ?? []) as { distance_miles: number; activity: string; date: string }[]
  const cardioMiles = Math.round(cardioRows.reduce((s, r) => s + (r.distance_miles ?? 0), 0) * 10) / 10
  const runMiles    = Math.round(cardioRows.filter(r => r.activity === 'run').reduce((s, r) => s + (r.distance_miles ?? 0), 0) * 10) / 10
  const hikeMiles   = Math.round((hiking.data ?? []).reduce((s: number, r: { distance_miles: number }) => s + (r.distance_miles ?? 0), 0) * 10) / 10

  // FN stats
  const fnKillsAvg = gameRows.length
    ? Math.round((gameRows.reduce((s: number, r: { kills: number }) => s + (r.kills ?? 0), 0) / gameRows.length) * 10) / 10
    : null

  // Latest body measurement
  const latestMeas = (measurements.data ?? [])[0] as { weight_lbs: number | null; body_fat_pct: number | null } | undefined

  const stats: AppStats = {
    benchPR:    prMap['Bench']    ?? null,
    squatPR:    prMap['Squat']    ?? null,
    deadliftPR: prMap['Deadlift'] ?? null,
    ohpPR:      prMap['OHP']      ?? null,
    totalSets:  liftRows.length,
    cardioMiles,
    runMiles,
    hikeMiles,
    totalMiles:     skateRows.reduce((s: number, r: { miles: number }) => s + (r.miles ?? 0), 0),
    booksThisYear:  bookRows.filter((r: { date_finished: string }) => r.date_finished >= `${new Date().getFullYear()}-01-01`).length,
    winCount:       gameRows.filter((r: { win: boolean }) => r.win).length,
    fnGamesTotal:   gameRows.length,
    fnKillsAvg,
    basketballGames:  (basketball.data ?? []).length,
    pickleballGames:  (pickleball.data ?? []).length,
    golfRounds:       (golf.data ?? []).length,
    discGolfRounds:   (discGolf.data ?? []).length,
    chessGames:       (chess.data ?? []).length,
    poolGames:        (pool.data ?? []).length,
    sleepAvg7,
    moodAvg30,
    waterOzToday,
    latestWeight:   latestMeas?.weight_lbs   ?? null,
    latestBodyFat:  latestMeas?.body_fat_pct ?? null,
  }

  const rawRows: RawActivityData = {
    liftingRows:   liftRows as RawActivityData['liftingRows'],
    prRows:        prRows as RawActivityData['prRows'],
    skateRows:     skateRows as RawActivityData['skateRows'],
    bookRows:      bookRows as RawActivityData['bookRows'],
    gameRows:      gameRows as RawActivityData['gameRows'],
    challengeRows: (challenges.data ?? []) as RawActivityData['challengeRows'],
    sleepRows:     (sleepLogs.data ?? []) as RawActivityData['sleepRows'],
    cardioRows:    cardioRows as RawActivityData['cardioRows'],
    bbRows:        (basketball.data ?? []) as RawActivityData['bbRows'],
    pbRows:        (pickleball.data ?? []) as RawActivityData['pbRows'],
    golfRows:      (golf.data ?? []) as RawActivityData['golfRows'],
    dgRows:        (discGolf.data ?? []) as RawActivityData['dgRows'],
    hikeRows:      (hiking.data ?? []) as RawActivityData['hikeRows'],
    ttRows:        (tableTennis.data ?? []) as RawActivityData['ttRows'],
    chessRows:     (chess.data ?? []) as RawActivityData['chessRows'],
    poolRows:      (pool.data ?? []) as RawActivityData['poolRows'],
    vbRows:        (volleyball.data ?? []) as RawActivityData['vbRows'],
    sbRows:        (spikeball.data ?? []) as RawActivityData['sbRows'],
    moodRows:      (moodLogs.data ?? []) as RawActivityData['moodRows'],
    waterRows:     (waterLog.data ?? []) as RawActivityData['waterRows'],
  }

  return { totalXP, stats, rawRows }
}

/** Derive the activity feed from rawRows — eliminates 14 duplicate Supabase queries. */
export function deriveActivityFromRawRows(rawRows: RawActivityData): ActivityEntry[] {
  const entries: ActivityEntry[] = [
    ...rawRows.liftingRows.slice(-3).map(r => ({
      type: 'lift', label: `${r.lift}${r.weight ? ` ${r.weight}lbs` : ''} ×${r.reps ?? 0}`, date: r.date, icon: 'lift',
    })),
    ...rawRows.skateRows.slice(-2).map(r => ({
      type: 'skate', label: `Skate — ${r.miles} mi`, date: r.date, icon: 'skate',
    })),
    ...rawRows.bookRows.filter(r => r.date_finished).slice(-2).map(r => ({
      type: 'book', label: r.title, date: r.date_finished!, icon: 'book',
    })),
    ...rawRows.gameRows.slice(-2).map(r => ({
      type: 'fortnite', label: `Fortnite — ${r.kills} kills${r.win ? ' · WIN' : ''}`, date: r.date, icon: 'game',
    })),
    ...rawRows.bbRows.slice(-2).map(r => ({
      type: 'basketball', label: `Basketball — ${r.points} pts`, date: r.date, icon: 'basketball',
    })),
    ...rawRows.pbRows.slice(-2).map(r => ({
      type: 'pickleball',
      label: `Pickleball — ${r.my_score != null && r.opp_score != null ? `${r.my_score}–${r.opp_score}` : r.win ? 'Win' : 'Loss'}`,
      date: r.date, icon: 'pickleball',
    })),
    ...rawRows.golfRows.slice(-2).map(r => {
      const vp = r.score - r.par; const vpStr = vp === 0 ? 'E' : vp > 0 ? `+${vp}` : String(vp)
      return { type: 'golf', label: `Golf${r.course ? ` — ${r.course}` : ''} (${vpStr})`, date: r.date, icon: 'golf' }
    }),
    ...rawRows.dgRows.slice(-2).map(r => {
      const vp = r.score - r.par; const vpStr = vp === 0 ? 'E' : vp > 0 ? `+${vp}` : String(vp)
      return { type: 'disc_golf', label: `Disc Golf${r.course ? ` — ${r.course}` : ''} (${vpStr})`, date: r.date, icon: 'disc_golf' }
    }),
    ...rawRows.hikeRows.slice(-2).map(r => ({
      type: 'hiking', label: `Hike${r.trail ? ` — ${r.trail}` : ''} (${r.distance_miles} mi)`, date: r.date, icon: 'hiking',
    })),
    ...rawRows.ttRows.slice(-2).map(r => ({
      type: 'table_tennis', label: `Table Tennis — ${r.win ? 'Win' : 'Loss'}`, date: r.date, icon: 'table_tennis',
    })),
    ...rawRows.chessRows.slice(-2).map(r => ({
      type: 'chess',
      label: `Chess — ${r.result.charAt(0).toUpperCase() + r.result.slice(1)}${r.rating_after ? ` (${r.rating_after})` : ''}`,
      date: r.date, icon: 'chess',
    })),
    ...rawRows.poolRows.slice(-2).map(r => ({
      type: 'pool', label: `Pool${r.game_type ? ` — ${r.game_type}` : ''} · ${r.win ? 'Win' : 'Loss'}`, date: r.date, icon: 'pool',
    })),
    ...rawRows.vbRows.slice(-2).map(r => ({
      type: 'volleyball', label: `Volleyball — ${r.format} · ${r.win ? 'Win' : 'Loss'}`, date: r.date, icon: 'volleyball',
    })),
    ...rawRows.sbRows.slice(-2).map(r => ({
      type: 'spikeball', label: `Spikeball — ${r.win ? 'Win' : 'Loss'}`, date: r.date, icon: 'spikeball',
    })),
  ]
  entries.sort((a, b) => b.date.localeCompare(a.date))
  return entries.slice(0, 8)
}

/** Compute trend arrows + PR deltas from rawRows — eliminates 8 duplicate Supabase queries on Home mount. */
export function deriveTrendsFromRawRows(rawRows: RawActivityData): TrendResult {
  const now            = new Date()
  const thisMonthStart = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
  const lastMonthStart = localDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const lastMonthEnd   = localDateStr(new Date(now.getFullYear(), now.getMonth(), 0))
  const thirtyDaysAgo  = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30))
  const sixtyDaysAgo   = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60))

  const dir = (a: number, b: number): TrendDir =>
    a > b * 1.05 ? 'up' : a < b * 0.95 ? 'down' : 'flat'

  const skateMilesThis = rawRows.skateRows.filter(r => r.date >= thisMonthStart).reduce((s, r) => s + r.miles, 0)
  const skateMilesLast = rawRows.skateRows.filter(r => r.date >= lastMonthStart && r.date <= lastMonthEnd).reduce((s, r) => s + r.miles, 0)
  const booksThis      = rawRows.bookRows.filter(r => r.date_finished && r.date_finished >= thisMonthStart).length
  const booksLast      = rawRows.bookRows.filter(r => r.date_finished && r.date_finished >= lastMonthStart && r.date_finished <= lastMonthEnd).length
  const winsThis       = rawRows.gameRows.filter(r => r.win && r.date >= thisMonthStart).length
  const winsLast       = rawRows.gameRows.filter(r => r.win && r.date >= lastMonthStart && r.date <= lastMonthEnd).length

  const prsRecent = rawRows.prRows.filter(r => r.date >= thirtyDaysAgo)
  const prsPrev   = rawRows.prRows.filter(r => r.date >= sixtyDaysAgo && r.date < thirtyDaysAgo)

  const bestPR = (rows: { lift: string; est_1rm: number }[], lift: string) =>
    rows.filter(r => r.lift === lift).reduce((m, r) => Math.max(m, r.est_1rm), 0)

  const calcDelta = (lift: string): number | null => {
    const recent = bestPR(prsRecent, lift)
    const prev   = bestPR(prsPrev, lift)
    if (recent === 0) return null
    const delta = Math.round((recent - prev) * 10) / 10
    return delta !== 0 ? delta : null
  }

  return {
    dirs: {
      bench:    dir(bestPR(prsRecent, 'Bench'),    bestPR(prsPrev, 'Bench')),
      squat:    dir(bestPR(prsRecent, 'Squat'),    bestPR(prsPrev, 'Squat')),
      deadlift: dir(bestPR(prsRecent, 'Deadlift'), bestPR(prsPrev, 'Deadlift')),
      miles:    dir(skateMilesThis, skateMilesLast),
      books:    dir(booksThis, booksLast),
      wins:     dir(winsThis, winsLast),
    },
    prDeltas: {
      bench:    calcDelta('Bench'),
      squat:    calcDelta('Squat'),
      deadlift: calcDelta('Deadlift'),
    },
  }
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
    { threshold: 95,  name: 'Bar Warrior',    icon: 'Wood',   desc: 'Bench pressed 95 lbs — bar + 25s.' },
    { threshold: 135, name: 'One Plate',       icon: 'Bronze', desc: 'Bench pressed 135 lbs — one plate per side.' },
    { threshold: 185, name: 'Smooth Presser',  icon: 'Strong', desc: 'Bench pressed 185 lbs.' },
    { threshold: 225, name: 'Two Plates',      icon: 'Silver', desc: 'Bench pressed 225 lbs — two plates per side.' },
    { threshold: 275, name: 'Powerhouse',      icon: 'Elite',  desc: 'Bench pressed 275 lbs.' },
    { threshold: 315, name: 'Three Plates',    icon: 'Gold',   desc: 'Bench pressed 315 lbs — three plates per side.' },
    { threshold: 365, name: 'Press Lord',      icon: 'Power',  desc: 'Bench pressed 365 lbs.' },
    { threshold: 405, name: 'Four Plates',     icon: 'Crown',  desc: 'Bench pressed 405 lbs — four plates per side.' },
  ],
  Squat: [
    { threshold: 135, name: 'First Squat Plate', icon: 'Leg',   desc: 'Squatted 135 lbs.' },
    { threshold: 225, name: 'Squat Warm-Up',     icon: 'Fire',  desc: 'Squatted 225 lbs.' },
    { threshold: 315, name: 'Quad Dominant',     icon: 'Peak',  desc: 'Squatted 315 lbs — three plates per side.' },
    { threshold: 405, name: 'Four Wheels',       icon: 'Titan', desc: 'Squatted 405 lbs — four wheels.' },
    { threshold: 495, name: 'Squat God',         icon: 'Crown', desc: 'Squatted 495 lbs.' },
    { threshold: 585, name: 'Elite Squatter',    icon: 'Cosmic',desc: 'Squatted 585 lbs.' },
  ],
  Deadlift: [
    { threshold: 225, name: 'Pulling Weight',    icon: 'Chain', desc: 'Deadlifted 225 lbs.' },
    { threshold: 315, name: 'Chain Puller',      icon: 'Iron',  desc: 'Deadlifted 315 lbs.' },
    { threshold: 405, name: 'Four Wheels Pull',  icon: 'Heavy', desc: 'Deadlifted 405 lbs.' },
    { threshold: 500, name: 'Five Hundred',      icon: 'Trophy',desc: 'Deadlifted 500 lbs.' },
    { threshold: 600, name: 'Six Hundred Club',  icon: 'Crown', desc: 'Deadlifted 600 lbs.' },
    { threshold: 700, name: 'Absolute Unit',     icon: 'Cosmic',desc: 'Deadlifted 700 lbs.' },
  ],
  PullUps: [
    { threshold: 1,  name: 'First Pull',         icon: 'Start', desc: 'Did your first pull-up.' },
    { threshold: 5,  name: 'Five Up',             icon: 'Medal', desc: 'Did 5 pull-ups in one set.' },
    { threshold: 10, name: 'Double Digits',       icon: 'Strong',desc: 'Did 10 pull-ups in one set.' },
    { threshold: 15, name: 'Pull-Up Machine',     icon: 'Elite', desc: 'Did 15 pull-ups in one set.' },
    { threshold: 20, name: 'Bar Athlete',         icon: 'Gold',  desc: 'Did 20 pull-ups in one set.' },
    { threshold: 25, name: 'Calisthenics God',    icon: 'Crown', desc: 'Did 25 pull-ups in one set.' },
  ],
  PushUps: [
    { threshold: 10, name: 'Push Starter',        icon: 'Start', desc: 'Did 10 push-ups in one set.' },
    { threshold: 20, name: 'Twenty Strong',        icon: 'Strong',desc: 'Did 20 push-ups in one set.' },
    { threshold: 50, name: 'Half Century Push',    icon: 'Fire',  desc: 'Did 50 push-ups in one set.' },
    { threshold: 100, name: 'Push-Up Legend',      icon: 'Crown', desc: 'Did 100 push-ups in one set.' },
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
