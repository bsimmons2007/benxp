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

// ── Leveling curve ────────────────────────────────────────────
// Sqrt curve through level 30, then a flat cost per level beyond it.
// The flat step equals the level 29->30 increment so the curve stays
// continuous at the transition. Precomputed:
//   xpForLevel(30) = 29^2 * 150 = 126150
//   xpForLevel(29) = 28^2 * 150 = 117600
//   step           = 8550
const LEVEL_CAP = 30
const CAP_XP    = (LEVEL_CAP - 1) ** 2 * 150             // XP to reach level 30 = 126150
const FLAT_STEP = CAP_XP - (LEVEL_CAP - 2) ** 2 * 150    // 8550 XP per level past 30

/** XP required to reach a given level (the floor of that level). */
export function xpForLevel(level: number): number {
  if (level <= LEVEL_CAP) return (level - 1) ** 2 * 150
  return CAP_XP + (level - LEVEL_CAP) * FLAT_STEP
}

export function calculateLevel(totalXP: number): number {
  if (totalXP < CAP_XP) return Math.floor(1 + Math.sqrt(totalXP / 150))
  return LEVEL_CAP + Math.floor((totalXP - CAP_XP) / FLAT_STEP)
}

export function levelProgress(totalXP: number): number {
  const level = calculateLevel(totalXP)
  const floor = xpForLevel(level)
  const ceiling = xpForLevel(level + 1)
  return (totalXP - floor) / (ceiling - floor)
}

// ── Seasonal level ────────────────────────────────────────────
// XP earned since Jan 1 of the current year, on a faster curve so a very
// active year lands around level 40-60. Resets naturally on Jan 1 (date-based).
export function seasonLevel(seasonXP: number): number {
  return Math.floor(Math.sqrt(Math.max(0, seasonXP) / 100))
}

export function seasonXpForLevel(level: number): number {
  return level * level * 100
}

export function seasonProgress(seasonXP: number): number {
  const level = seasonLevel(seasonXP)
  const floor = seasonXpForLevel(level)
  const ceiling = seasonXpForLevel(level + 1)
  if (ceiling === floor) return 0
  return Math.max(0, Math.min(1, (seasonXP - floor) / (ceiling - floor)))
}

// ── XP aggregates ─────────────────────────────────────────────
// Per-table counts/sums needed to compute total XP. Produced either by the
// get_xp_aggregates Postgres RPC (server-side math) or derived from rawRows as
// a fallback. XP is always multiplied by XP_RATES in TS so rates stay retroactive.
export interface XPAggregates {
  set_count: number;            workout_days: number
  pr_count: number
  book_count: number
  skate_miles: number
  fn_wins: number;              fn_blitz_wins: number;    fn_kills: number
  sleep_nights: number;         sleep_quality: number
  cardio_run_mi: number;        cardio_bike_mi: number;   cardio_swim_mi: number
  cardio_walk_mi: number;       cardio_other_mi: number
  challenge_xp: number;         goal_xp: number
  mood_count: number;           measurement_count: number
  water_goal_days: number
  bb_sessions: number;          bb_points: number
  pb_games: number;             pb_wins: number
  golf_rounds: number;          golf_under_par: number
  dg_rounds: number;            dg_under_par: number
  hike_miles: number;           hike_elev_buckets: number
  tt_games: number;             tt_wins: number
  chess_games: number;          chess_wins: number;       chess_draws: number
  vb_games: number;             vb_wins: number
  sb_games: number;             sb_wins: number
  pool_games: number;           pool_wins: number;        pool_bnr: number
}

/** Total XP from aggregates × XP_RATES — the single source of XP truth. */
export function xpFromAggregates(a: XPAggregates): number {
  const cardioXP =
      a.cardio_run_mi  * XP_RATES.cardio_run_per_mile
    + a.cardio_bike_mi * XP_RATES.cardio_bike_per_mile
    + a.cardio_swim_mi * XP_RATES.cardio_swim_per_mile
    + a.cardio_walk_mi * XP_RATES.cardio_walk_per_mile
    + a.cardio_other_mi * XP_RATES.cardio_per_mile
  return Math.round(
      a.set_count      * XP_RATES.per_set
    + a.workout_days   * XP_RATES.workout_day
    + a.pr_count       * XP_RATES.new_pr
    + a.book_count     * XP_RATES.book_finished
    + a.skate_miles    * XP_RATES.skate_per_mile
    + a.fn_wins        * XP_RATES.fortnite_win
    + a.fn_blitz_wins  * XP_RATES.fortnite_blitz_win
    + a.fn_kills       * XP_RATES.fortnite_kill
    + a.sleep_nights   * XP_RATES.sleep_log
    + a.sleep_quality  * XP_RATES.sleep_quality_bonus
    + cardioXP
    + a.challenge_xp
    + a.goal_xp
    + a.mood_count        * XP_RATES.mood_log
    + a.measurement_count * XP_RATES.measurement_log
    + a.water_goal_days   * XP_RATES.water_goal_reached
    + a.bb_sessions   * XP_RATES.basketball_session
    + a.bb_points     * XP_RATES.basketball_per_point
    + a.pb_games      * XP_RATES.pickleball_game
    + a.pb_wins       * XP_RATES.pickleball_win
    + a.golf_rounds   * XP_RATES.golf_round
    + a.golf_under_par * XP_RATES.golf_under_par
    + a.dg_rounds     * XP_RATES.disc_golf_round
    + a.dg_under_par  * XP_RATES.disc_golf_under_par
    + a.hike_miles        * XP_RATES.hiking_per_mile
    + a.hike_elev_buckets * XP_RATES.hiking_per_500ft
    + a.tt_games      * XP_RATES.table_tennis_game
    + a.tt_wins       * XP_RATES.table_tennis_win
    + a.chess_games   * XP_RATES.chess_game
    + a.chess_wins    * XP_RATES.chess_win
    + a.chess_draws   * XP_RATES.chess_draw
    + a.vb_games      * XP_RATES.volleyball_game
    + a.vb_wins       * XP_RATES.volleyball_win
    + a.sb_games      * XP_RATES.spikeball_game
    + a.sb_wins       * XP_RATES.spikeball_win
    + a.pool_games    * XP_RATES.pool_game
    + a.pool_wins     * XP_RATES.pool_win
    + a.pool_bnr      * XP_RATES.pool_break_and_run
  )
}

/** Pull the `_season` variants out of the RPC payload into an XPAggregates.
 *  Season-agnostic dimensions (goal XP, challenge XP, measurements, sport
 *  counts) are only ever all-time in the aggregates RPC, so they contribute 0
 *  to season XP — season XP is dominated by activity-count/mileage dimensions.
 */
export function seasonAggregatesFromRpc(raw: Record<string, number>): XPAggregates {
  const s = (k: string) => Number(raw[`${k}_season`] ?? 0)
  return {
    set_count: s('set_count'), workout_days: s('workout_days'),
    pr_count: s('pr_count'), book_count: s('book_count'),
    skate_miles: s('skate_miles'),
    fn_wins: s('fn_wins'), fn_blitz_wins: s('fn_blitz_wins'), fn_kills: s('fn_kills'),
    sleep_nights: s('sleep_nights'), sleep_quality: s('sleep_quality'),
    cardio_run_mi: s('cardio_run_mi'), cardio_bike_mi: s('cardio_bike_mi'),
    cardio_swim_mi: s('cardio_swim_mi'), cardio_walk_mi: s('cardio_walk_mi'),
    cardio_other_mi: s('cardio_other_mi'),
    challenge_xp: 0, goal_xp: 0,
    mood_count: s('mood_count'), measurement_count: 0,
    water_goal_days: s('water_goal_days'),
    bb_sessions: 0, bb_points: 0, pb_games: 0, pb_wins: 0,
    golf_rounds: 0, golf_under_par: 0, dg_rounds: 0, dg_under_par: 0,
    hike_miles: 0, hike_elev_buckets: 0, tt_games: 0, tt_wins: 0,
    chess_games: 0, chess_wins: 0, chess_draws: 0, vb_games: 0, vb_wins: 0,
    sb_games: 0, sb_wins: 0, pool_games: 0, pool_wins: 0, pool_bnr: 0,
  }
}

function isBlitz(mode?: string | null): boolean {
  return mode === 'Blitz' || (typeof mode === 'string' && mode.startsWith('Blitz '))
}

/** Derive XP aggregates from already-fetched rawRows — the client-side fallback
 *  when the RPC is unavailable, and the source of season XP (pass a `since` date
 *  to count only rows on/after it). Mirrors get_xp_aggregates exactly. */
export function aggregatesFromRawRows(r: RawActivityData, since?: string): XPAggregates {
  const on = (d: string | null | undefined) => !since || (!!d && d >= since)
  const lift  = r.liftingRows.filter(x => on(x.date))
  const skate = r.skateRows.filter(x => on(x.date))
  const pr    = r.prRows.filter(x => on(x.date))
  const book  = r.bookRows.filter(x => x.date_finished && on(x.date_finished))
  const game  = r.gameRows.filter(x => on(x.date))
  const sleep = r.sleepRows.filter(x => on(x.date))
  const cardio = r.cardioRows.filter(x => on(x.date))
  const mood  = r.moodRows.filter(x => on(x.date))
  const water = r.waterRows.filter(x => on(x.date))
  const bb = r.bbRows.filter(x => on(x.date)); const pb = r.pbRows.filter(x => on(x.date))
  const golf = r.golfRows.filter(x => on(x.date)); const dg = r.dgRows.filter(x => on(x.date))
  const hike = r.hikeRows.filter(x => on(x.date)); const tt = r.ttRows.filter(x => on(x.date))
  const chess = r.chessRows.filter(x => on(x.date)); const vb = r.vbRows.filter(x => on(x.date))
  const sb = r.sbRows.filter(x => on(x.date)); const pool = r.poolRows.filter(x => on(x.date))

  const waterByDate: Record<string, number> = {}
  for (const w of water) waterByDate[w.date] = (waterByDate[w.date] ?? 0) + Number(w.oz)

  return {
    set_count: lift.length,
    workout_days: new Set(lift.map(x => x.date)).size,
    pr_count: pr.length,
    book_count: book.length,
    skate_miles: skate.reduce((s, x) => s + (x.miles ?? 0), 0),
    fn_wins: game.filter(x => x.win && !isBlitz(x.mode)).length,
    fn_blitz_wins: game.filter(x => x.win && isBlitz(x.mode)).length,
    fn_kills: game.reduce((s, x) => s + (x.kills ?? 0), 0),
    sleep_nights: sleep.length,
    sleep_quality: sleep.filter(x => (x.hours_slept ?? 0) >= 7).length,
    cardio_run_mi:  cardio.filter(x => x.activity === 'run').reduce((s, x) => s + (x.distance_miles ?? 0), 0),
    cardio_bike_mi: cardio.filter(x => x.activity === 'bike').reduce((s, x) => s + (x.distance_miles ?? 0), 0),
    cardio_swim_mi: cardio.filter(x => x.activity === 'swim').reduce((s, x) => s + (x.distance_miles ?? 0), 0),
    cardio_walk_mi: cardio.filter(x => x.activity === 'walk').reduce((s, x) => s + (x.distance_miles ?? 0), 0),
    cardio_other_mi: cardio.filter(x => !['run','bike','swim','walk'].includes(x.activity)).reduce((s, x) => s + (x.distance_miles ?? 0), 0),
    challenge_xp: since ? 0 : r.challengeRows.filter(x => x.status === 'completed' || x.status === 'claimed').reduce((s, x) => s + (x.xp_reward ?? 0), 0),
    goal_xp: 0,   // goals not in rawRows; RPC path supplies goal XP
    mood_count: mood.length,
    measurement_count: 0,   // measurements not in rawRows; RPC path supplies it
    water_goal_days: Object.values(waterByDate).filter(oz => oz >= 64).length,
    bb_sessions: bb.length,
    bb_points: bb.reduce((s, x) => s + (x.points ?? 0), 0),
    pb_games: pb.length, pb_wins: pb.filter(x => x.win).length,
    golf_rounds: golf.length,
    golf_under_par: golf.reduce((s, x) => s + Math.max(x.par - x.score, 0), 0),
    dg_rounds: dg.length,
    dg_under_par: dg.reduce((s, x) => s + Math.max(x.par - x.score, 0), 0),
    hike_miles: hike.reduce((s, x) => s + (x.distance_miles ?? 0), 0),
    hike_elev_buckets: hike.reduce((s, x) => s + Math.floor((x.elevation_gain_ft ?? 0) / 500), 0),
    tt_games: tt.length, tt_wins: tt.filter(x => x.win).length,
    chess_games: chess.length,
    chess_wins: chess.filter(x => x.result === 'win').length,
    chess_draws: chess.filter(x => x.result === 'draw').length,
    vb_games: vb.length, vb_wins: vb.filter(x => x.win).length,
    sb_games: sb.length, sb_wins: sb.filter(x => x.win).length,
    pool_games: pool.length, pool_wins: pool.filter(x => x.win).length,
    pool_bnr: pool.filter(x => x.break_and_run).length,
  }
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

// ── localStorage cache (stale-while-revalidate, keyed per user) ──
const XP_CACHE_TTL = 5 * 60 * 1000

function xpCacheKey(userId: string) { return `youxp-xp-cache-v3-${userId}` }

export function getCachedXPData(userId: string): { totalXP: number; seasonXP?: number; stats: AppStats } | null {
  try {
    const raw = localStorage.getItem(xpCacheKey(userId))
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > XP_CACHE_TTL) return null
    return data
  } catch { return null }
}

export function setCachedXPData(userId: string, data: { totalXP: number; seasonXP: number; stats: AppStats }) {
  try { localStorage.setItem(xpCacheKey(userId), JSON.stringify({ data, ts: Date.now() })) } catch {}
}

export function getCachedXPTimestamp(userId: string): number | null {
  try {
    const raw = localStorage.getItem(xpCacheKey(userId))
    if (!raw) return null
    const { ts } = JSON.parse(raw)
    return typeof ts === 'number' ? ts : null
  } catch { return null }
}

/** Fetch XP, stats, and raw activity rows in one parallel batch.
 *  Raw rows are shared with useStreak and useAchievements to eliminate ~35 duplicate queries per session.
 */
export async function fetchXPAndStats(supabase: SupabaseClient, userId: string): Promise<{ totalXP: number; seasonXP: number; stats: AppStats; rawRows: RawActivityData }> {
  // Server-side XP aggregates (Phase 4a). Runs in parallel with the row fetches.
  // If the RPC is missing (migration not yet run) rpc.error is set and we fall
  // back to computing XP from rawRows below — same numbers, more bytes.
  const aggPromise = supabase.rpc('get_xp_aggregates', { uid: userId })

  const [lifting, skate, prs, books, games, challenges, sleepLogs, cardio, goals, moodLogs, measurements, waterLog, basketball, pickleball, golf, discGolf, hiking, tableTennis, chess, volleyball, spikeball, pool] = await Promise.all([
    supabase.from('lifting_log').select('date, lift, est_1rm, weight, sets, reps').eq('user_id', userId),
    supabase.from('skate_sessions').select('miles, date').eq('user_id', userId),
    supabase.from('pr_history').select('lift, est_1rm, date').eq('user_id', userId),
    supabase.from('books').select('date_finished, title').eq('user_id', userId).not('date_finished', 'is', null),
    supabase.from('fortnite_games').select('win, kills, mode, date, accuracy').eq('user_id', userId),
    supabase.from('challenges').select('status, xp_reward').eq('user_id', userId),
    supabase.from('sleep_log').select('hours_slept, date').eq('user_id', userId).eq('is_nap', false),
    supabase.from('cardio_sessions').select('distance_miles, activity, date').eq('user_id', userId),
    supabase.from('goals').select('xp_reward').eq('user_id', userId).eq('status', 'completed'),
    supabase.from('mood_log').select('date, mood').eq('user_id', userId),
    supabase.from('body_measurements').select('date, weight_lbs, body_fat_pct').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('water_log').select('date, oz').eq('user_id', userId),
    supabase.from('basketball_sessions').select('points, date, fg_made, fg_attempted').eq('user_id', userId),
    supabase.from('pickleball_games').select('win, date, my_score, opp_score').eq('user_id', userId),
    supabase.from('golf_rounds').select('score, par, date, holes, course').eq('user_id', userId),
    supabase.from('disc_golf_rounds').select('score, par, date, holes, course').eq('user_id', userId),
    supabase.from('hiking_sessions').select('distance_miles, elevation_gain_ft, date, difficulty, trail').eq('user_id', userId),
    supabase.from('table_tennis_games').select('win, date, my_score, opp_score').eq('user_id', userId),
    supabase.from('chess_games').select('result, date, rating_after, opening').eq('user_id', userId),
    supabase.from('volleyball_sessions').select('win, date, format, kills').eq('user_id', userId),
    supabase.from('spikeball_games').select('win, date').eq('user_id', userId),
    supabase.from('pool_games').select('win, break_and_run, date, game_type').eq('user_id', userId),
  ])

  // Rows reused by the Stats section below
  const liftRows  = lifting.data  ?? []
  const skateRows = skate.data    ?? []
  const prRows    = prs.data      ?? []
  const bookRows  = books.data    ?? []
  const gameRows  = games.data    ?? []

  // ── Raw rows (needed regardless for streak/achievements/trends/stats) ──
  const rawRows: RawActivityData = {
    liftingRows:   liftRows as RawActivityData['liftingRows'],
    prRows:        prRows as RawActivityData['prRows'],
    skateRows:     skateRows as RawActivityData['skateRows'],
    bookRows:      bookRows as RawActivityData['bookRows'],
    gameRows:      gameRows as RawActivityData['gameRows'],
    challengeRows: (challenges.data ?? []) as RawActivityData['challengeRows'],
    sleepRows:     (sleepLogs.data ?? []) as RawActivityData['sleepRows'],
    cardioRows:    (cardio.data ?? []) as RawActivityData['cardioRows'],
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

  // ── XP: prefer server-side aggregates, fall back to rawRows ────
  const jan1 = `${new Date().getFullYear()}-01-01`
  let totalXP: number
  let seasonXP: number
  const agg = await aggPromise
  if (!agg.error && agg.data) {
    const raw = agg.data as Record<string, number>
    const allAgg: XPAggregates = {
      set_count: Number(raw.set_count ?? 0), workout_days: Number(raw.workout_days ?? 0),
      pr_count: Number(raw.pr_count ?? 0), book_count: Number(raw.book_count ?? 0),
      skate_miles: Number(raw.skate_miles ?? 0),
      fn_wins: Number(raw.fn_wins ?? 0), fn_blitz_wins: Number(raw.fn_blitz_wins ?? 0), fn_kills: Number(raw.fn_kills ?? 0),
      sleep_nights: Number(raw.sleep_nights ?? 0), sleep_quality: Number(raw.sleep_quality ?? 0),
      cardio_run_mi: Number(raw.cardio_run_mi ?? 0), cardio_bike_mi: Number(raw.cardio_bike_mi ?? 0),
      cardio_swim_mi: Number(raw.cardio_swim_mi ?? 0), cardio_walk_mi: Number(raw.cardio_walk_mi ?? 0),
      cardio_other_mi: Number(raw.cardio_other_mi ?? 0),
      challenge_xp: Number(raw.challenge_xp ?? 0), goal_xp: Number(raw.goal_xp ?? 0),
      mood_count: Number(raw.mood_count ?? 0), measurement_count: Number(raw.measurement_count ?? 0),
      water_goal_days: Number(raw.water_goal_days ?? 0),
      bb_sessions: Number(raw.bb_sessions ?? 0), bb_points: Number(raw.bb_points ?? 0),
      pb_games: Number(raw.pb_games ?? 0), pb_wins: Number(raw.pb_wins ?? 0),
      golf_rounds: Number(raw.golf_rounds ?? 0), golf_under_par: Number(raw.golf_under_par ?? 0),
      dg_rounds: Number(raw.dg_rounds ?? 0), dg_under_par: Number(raw.dg_under_par ?? 0),
      hike_miles: Number(raw.hike_miles ?? 0), hike_elev_buckets: Number(raw.hike_elev_buckets ?? 0),
      tt_games: Number(raw.tt_games ?? 0), tt_wins: Number(raw.tt_wins ?? 0),
      chess_games: Number(raw.chess_games ?? 0), chess_wins: Number(raw.chess_wins ?? 0), chess_draws: Number(raw.chess_draws ?? 0),
      vb_games: Number(raw.vb_games ?? 0), vb_wins: Number(raw.vb_wins ?? 0),
      sb_games: Number(raw.sb_games ?? 0), sb_wins: Number(raw.sb_wins ?? 0),
      pool_games: Number(raw.pool_games ?? 0), pool_wins: Number(raw.pool_wins ?? 0), pool_bnr: Number(raw.pool_bnr ?? 0),
    }
    totalXP  = xpFromAggregates(allAgg)
    seasonXP = xpFromAggregates(seasonAggregatesFromRpc(raw))
  } else {
    // Fallback: goals + measurements aren't in rawRows, so fold their XP in here
    // to match the RPC path exactly.
    const goalXP = (goals.data ?? []).reduce((s: number, r: { xp_reward: number }) => s + (r.xp_reward ?? 0), 0)
    const measurementXP = (measurements.data ?? []).length * XP_RATES.measurement_log
    totalXP  = xpFromAggregates(aggregatesFromRawRows(rawRows)) + Math.round(goalXP + measurementXP)
    seasonXP = xpFromAggregates(aggregatesFromRawRows(rawRows, jan1))
  }

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

  return { totalXP, seasonXP, stats, rawRows }
}

/** Derive the activity feed from rawRows — eliminates 14 duplicate Supabase queries. */
export function deriveActivityFromRawRows(rawRows: RawActivityData): ActivityEntry[] {
  // Sort newest-first before slicing so we always get the most recent N, not the last N inserted
  const top = <T extends { date: string }>(arr: T[], n: number) =>
    [...arr].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n)

  const entries: ActivityEntry[] = [
    ...top(rawRows.liftingRows, 3).map(r => ({
      type: 'lift', label: `${r.lift}${r.weight ? ` ${r.weight}lbs` : ''} ×${r.reps ?? 0}`, date: r.date, icon: 'lift',
    })),
    ...top(rawRows.skateRows, 2).map(r => ({
      type: 'skate', label: `Skate — ${r.miles} mi`, date: r.date, icon: 'skate',
    })),
    ...[...rawRows.bookRows.filter(r => r.date_finished)]
      .sort((a, b) => (b.date_finished ?? '').localeCompare(a.date_finished ?? '')).slice(0, 2)
      .map(r => ({ type: 'book', label: r.title, date: r.date_finished!, icon: 'book' })),
    ...top(rawRows.gameRows, 2).map(r => ({
      type: 'fortnite', label: `Fortnite — ${r.kills} kills${r.win ? ' · WIN' : ''}`, date: r.date, icon: 'game',
    })),
    ...top(rawRows.bbRows, 2).map(r => ({
      type: 'basketball', label: `Basketball — ${r.points} pts`, date: r.date, icon: 'basketball',
    })),
    ...top(rawRows.pbRows, 2).map(r => ({
      type: 'pickleball',
      label: `Pickleball — ${r.my_score != null && r.opp_score != null ? `${r.my_score}–${r.opp_score}` : r.win ? 'Win' : 'Loss'}`,
      date: r.date, icon: 'pickleball',
    })),
    ...top(rawRows.golfRows, 2).map(r => {
      const vp = r.score - r.par; const vpStr = vp === 0 ? 'E' : vp > 0 ? `+${vp}` : String(vp)
      return { type: 'golf', label: `Golf${r.course ? ` — ${r.course}` : ''} (${vpStr})`, date: r.date, icon: 'golf' }
    }),
    ...top(rawRows.dgRows, 2).map(r => {
      const vp = r.score - r.par; const vpStr = vp === 0 ? 'E' : vp > 0 ? `+${vp}` : String(vp)
      return { type: 'disc_golf', label: `Disc Golf${r.course ? ` — ${r.course}` : ''} (${vpStr})`, date: r.date, icon: 'disc_golf' }
    }),
    ...top(rawRows.hikeRows, 2).map(r => ({
      type: 'hiking', label: `Hike${r.trail ? ` — ${r.trail}` : ''} (${r.distance_miles} mi)`, date: r.date, icon: 'hiking',
    })),
    ...top(rawRows.ttRows, 2).map(r => ({
      type: 'table_tennis', label: `Table Tennis — ${r.win ? 'Win' : 'Loss'}`, date: r.date, icon: 'table_tennis',
    })),
    ...top(rawRows.chessRows, 2).map(r => ({
      type: 'chess',
      label: `Chess — ${r.result.charAt(0).toUpperCase() + r.result.slice(1)}${r.rating_after ? ` (${r.rating_after})` : ''}`,
      date: r.date, icon: 'chess',
    })),
    ...top(rawRows.poolRows, 2).map(r => ({
      type: 'pool', label: `Pool${r.game_type ? ` — ${r.game_type}` : ''} · ${r.win ? 'Win' : 'Loss'}`, date: r.date, icon: 'pool',
    })),
    ...top(rawRows.vbRows, 2).map(r => ({
      type: 'volleyball', label: `Volleyball — ${r.format} · ${r.win ? 'Win' : 'Loss'}`, date: r.date, icon: 'volleyball',
    })),
    ...top(rawRows.sbRows, 2).map(r => ({
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
    .eq('user_id', userId)
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
