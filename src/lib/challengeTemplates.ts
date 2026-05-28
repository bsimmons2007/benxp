import type { SupabaseClient } from '@supabase/supabase-js'

export type ActivitySection =
  | 'lifting' | 'run' | 'bike' | 'swim' | 'walk' | 'skate'
  | 'sleep' | 'water' | 'books' | 'mood'
  | 'chess' | 'disc_golf' | 'fortnite' | 'golf' | 'hiking'
  | 'basketball' | 'pickleball' | 'pool' | 'spikeball'
  | 'table_tennis' | 'volleyball'

export type DisplayMode = 'count' | 'sum' | 'avg'

export interface UserStats {
  lifting:      { avgDaysPerWeek: number; avgSetsPerWeek: number }
  run:          { avgMilesPerWeek: number; avgSessionsPerWeek: number }
  bike:         { avgMilesPerWeek: number; avgSessionsPerWeek: number }
  swim:         { avgSessionsPerWeek: number }
  walk:         { avgMilesPerWeek: number; avgSessionsPerWeek: number }
  skate:        { avgMilesPerWeek: number; avgSessionsPerWeek: number }
  sleep:        { avgHours: number; avgNightsPerWeek: number }
  water:        { avgDaysPerWeek: number }
  books:        { avgPerMonth: number }
  mood:         { avgScore: number; avgDaysPerWeek: number }
  chess:        { avgPerWeek: number; winRate: number }
  disc_golf:    { avgPerMonth: number }
  fortnite:     { avgPerWeek: number; avgKills: number }
  golf:         { avgPerMonth: number }
  hiking:       { avgMilesPerMonth: number; avgSessionsPerMonth: number }
  basketball:   { avgPerWeek: number }
  pickleball:   { avgPerWeek: number; winRate: number }
  pool:         { avgPerWeek: number; winRate: number }
  spikeball:    { avgPerWeek: number; winRate: number }
  table_tennis: { avgPerWeek: number; winRate: number }
  volleyball:   { avgPerWeek: number; winRate: number }
}

export interface ChallengeTemplate {
  key: string
  section: ActivitySection
  period: 'weekly' | 'monthly'
  name: (n: number) => string
  unit: string
  progressKey: string
  displayMode: DisplayMode
  scaleTarget: (stats: UserStats) => number
  xpForTarget: (n: number) => number
}

export const SECTION_DISPLAY: Record<ActivitySection, string> = {
  lifting: 'Lifting', run: 'Running', bike: 'Cycling', swim: 'Swimming',
  walk: 'Walking', skate: 'Skating', sleep: 'Sleep', water: 'Hydration',
  books: 'Reading', mood: 'Mood', chess: 'Chess', disc_golf: 'Disc Golf',
  fortnite: 'Gaming', golf: 'Golf', hiking: 'Hiking', basketball: 'Basketball',
  pickleball: 'Pickleball', pool: 'Pool', spikeball: 'Spikeball',
  table_tennis: 'Table Tennis', volleyball: 'Volleyball',
}

// ── Helpers ──────────────────────────────────────────────────────

function cr(n: number): number {
  return Math.max(1, Math.round(n))
}

function sc(avg: number, factor: number, min: number, max = Infinity): number {
  return Math.min(max, Math.max(min, cr(avg * factor)))
}

// ── Game/sport factory ───────────────────────────────────────────

interface SportFactoryOpts {
  section: ActivitySection
  displayName: string
  gamesKey: string
  winsKey: string
  statsGetter: (stats: UserStats) => { avgPerWeek: number; winRate: number }
}

function gameSportTemplates(opts: SportFactoryOpts): ChallengeTemplate[] {
  const { section, displayName, gamesKey, winsKey, statsGetter } = opts
  return [
    { key: `${section}_games_w1`, section, period: 'weekly' as const, name: (n: number) => `Play ${displayName} ${n} time${n === 1 ? '' : 's'} this week`, unit: 'games', progressKey: gamesKey, displayMode: 'count' as const, scaleTarget: (s) => sc(statsGetter(s).avgPerWeek, 1.5, 1, 7), xpForTarget: (n) => n * 35 },
    { key: `${section}_games_w2`, section, period: 'weekly' as const, name: (n: number) => `Log ${n} ${displayName} game${n === 1 ? '' : 's'} this week`, unit: 'games', progressKey: gamesKey, displayMode: 'count' as const, scaleTarget: (s) => sc(statsGetter(s).avgPerWeek, 1.8, 1, 7), xpForTarget: (n) => n * 40 },
    { key: `${section}_wins_w1`, section, period: 'weekly' as const, name: (_n: number) => `Win a ${displayName} game this week`, unit: 'wins', progressKey: winsKey, displayMode: 'count' as const, scaleTarget: () => 1, xpForTarget: () => 100 },
    { key: `${section}_games_w3`, section, period: 'weekly' as const, name: (n: number) => `Get ${n} ${displayName} session${n === 1 ? '' : 's'} in this week`, unit: 'games', progressKey: gamesKey, displayMode: 'count' as const, scaleTarget: (s) => sc(statsGetter(s).avgPerWeek, 2, 2, 7), xpForTarget: (n) => n * 45 },
    { key: `${section}_wins_w2`, section, period: 'weekly' as const, name: (n: number) => `Win ${n} ${displayName} game${n === 1 ? '' : 's'} this week`, unit: 'wins', progressKey: winsKey, displayMode: 'count' as const, scaleTarget: (s) => Math.max(1, cr(statsGetter(s).avgPerWeek * statsGetter(s).winRate * 1.5)), xpForTarget: (n) => n * 100 },
    { key: `${section}_games_w4`, section, period: 'weekly' as const, name: (n: number) => `Play ${n} rounds of ${displayName} this week`, unit: 'games', progressKey: gamesKey, displayMode: 'count' as const, scaleTarget: (s) => sc(statsGetter(s).avgPerWeek, 1.6, 1, 6), xpForTarget: (n) => n * 38 },
    { key: `${section}_games_w5`, section, period: 'weekly' as const, name: (n: number) => `Log ${n} competitive ${displayName} match${n === 1 ? '' : 'es'} this week`, unit: 'games', progressKey: gamesKey, displayMode: 'count' as const, scaleTarget: (s) => sc(statsGetter(s).avgPerWeek, 2.2, 2, 7), xpForTarget: (n) => n * 50 },
    { key: `${section}_games_m1`, section, period: 'monthly' as const, name: (n: number) => `Play ${displayName} ${n} times this month`, unit: 'games', progressKey: gamesKey, displayMode: 'count' as const, scaleTarget: (s) => sc(statsGetter(s).avgPerWeek * 4, 1.4, 3, 25), xpForTarget: (n) => n * 20 },
    { key: `${section}_wins_m1`, section, period: 'monthly' as const, name: (n: number) => `Win ${n} ${displayName} game${n === 1 ? '' : 's'} this month`, unit: 'wins', progressKey: winsKey, displayMode: 'count' as const, scaleTarget: (s) => Math.max(1, cr(statsGetter(s).avgPerWeek * 4 * statsGetter(s).winRate * 1.4)), xpForTarget: (n) => n * 75 },
    { key: `${section}_games_m2`, section, period: 'monthly' as const, name: (n: number) => `Log ${n} ${displayName} sessions this month`, unit: 'games', progressKey: gamesKey, displayMode: 'count' as const, scaleTarget: (s) => sc(statsGetter(s).avgPerWeek * 4, 1.6, 4), xpForTarget: (n) => n * 22 },
  ]
}

// ── Templates ────────────────────────────────────────────────────

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  // ── LIFTING WEEKLY ──
  { key: 'lifting_days_w1', section: 'lifting', period: 'weekly', name: (n) => `Hit the gym ${n}× this week`, unit: 'days', progressKey: 'lifting_days', displayMode: 'count', scaleTarget: (s) => sc(s.lifting.avgDaysPerWeek, 1.5, 2, 7), xpForTarget: (n) => n * 30 },
  { key: 'lifting_days_w2', section: 'lifting', period: 'weekly', name: (n) => `Train ${n} days this week`, unit: 'days', progressKey: 'lifting_days', displayMode: 'count', scaleTarget: (s) => sc(s.lifting.avgDaysPerWeek, 1.8, 3, 7), xpForTarget: (n) => n * 35 },
  { key: 'lifting_sets_w1', section: 'lifting', period: 'weekly', name: (n) => `Log ${n} sets this week`, unit: 'sets', progressKey: 'lifting_sets', displayMode: 'count', scaleTarget: (s) => sc(s.lifting.avgSetsPerWeek, 1.5, 8), xpForTarget: (n) => n * 4 },
  { key: 'lifting_sets_w2', section: 'lifting', period: 'weekly', name: (n) => `Crush ${n} sets this week`, unit: 'sets', progressKey: 'lifting_sets', displayMode: 'count', scaleTarget: (s) => sc(s.lifting.avgSetsPerWeek, 1.9, 12), xpForTarget: (n) => n * 5 },
  { key: 'lifting_pr_w1', section: 'lifting', period: 'weekly', name: (_n) => `Hit a new PR on any lift this week`, unit: 'PRs', progressKey: 'lifting_prs', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 200 },
  { key: 'lifting_variety_w1', section: 'lifting', period: 'weekly', name: (n) => `Train ${n} different exercises this week`, unit: 'exercises', progressKey: 'lifting_distinct_lifts', displayMode: 'count', scaleTarget: (s) => Math.min(4, Math.max(2, cr(s.lifting.avgSetsPerWeek / 10) + 2)), xpForTarget: (n) => n * 40 },
  { key: 'lifting_bench_w1', section: 'lifting', period: 'weekly', name: (_n) => `Log a bench press session this week`, unit: 'sessions', progressKey: 'lifting_bench_sets', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 50 },
  { key: 'lifting_squat_w1', section: 'lifting', period: 'weekly', name: (_n) => `Log a squat session this week`, unit: 'sessions', progressKey: 'lifting_squat_sets', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 50 },
  // ── LIFTING MONTHLY ──
  { key: 'lifting_days_m1', section: 'lifting', period: 'monthly', name: (n) => `Hit the gym ${n}× this month`, unit: 'days', progressKey: 'lifting_days', displayMode: 'count', scaleTarget: (s) => sc(s.lifting.avgDaysPerWeek * 4, 1.3, 8, 24), xpForTarget: (n) => n * 10 },
  { key: 'lifting_sets_m1', section: 'lifting', period: 'monthly', name: (n) => `Log ${n} total sets this month`, unit: 'sets', progressKey: 'lifting_sets', displayMode: 'count', scaleTarget: (s) => sc(s.lifting.avgSetsPerWeek * 4, 1.3, 30), xpForTarget: (n) => n * 2 },
  { key: 'lifting_pr_m1', section: 'lifting', period: 'monthly', name: (_n) => `Land a new PR this month`, unit: 'PRs', progressKey: 'lifting_prs', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 250 },
  { key: 'lifting_prs_m2', section: 'lifting', period: 'monthly', name: (_n) => `Set 2 new PRs this month`, unit: 'PRs', progressKey: 'lifting_prs', displayMode: 'count', scaleTarget: () => 2, xpForTarget: () => 400 },
  { key: 'lifting_sets_m2', section: 'lifting', period: 'monthly', name: (n) => `Complete ${n} sets this month`, unit: 'sets', progressKey: 'lifting_sets', displayMode: 'count', scaleTarget: (s) => sc(s.lifting.avgSetsPerWeek * 4, 1.6, 50), xpForTarget: (n) => n * 3 },
  // ── RUN WEEKLY ──
  { key: 'run_miles_w1', section: 'run', period: 'weekly', name: (n) => `Run ${n} miles this week`, unit: 'miles', progressKey: 'run_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.run.avgMilesPerWeek, 1.6, 2), xpForTarget: (n) => n * 15 },
  { key: 'run_miles_w2', section: 'run', period: 'weekly', name: (n) => `Log ${n} miles of running this week`, unit: 'miles', progressKey: 'run_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.run.avgMilesPerWeek, 2, 3), xpForTarget: (n) => n * 18 },
  { key: 'run_sessions_w1', section: 'run', period: 'weekly', name: (n) => `Complete ${n} run${n === 1 ? '' : 's'} this week`, unit: 'runs', progressKey: 'run_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.run.avgSessionsPerWeek, 1.5, 1, 7), xpForTarget: (n) => n * 35 },
  { key: 'run_sessions_w2', section: 'run', period: 'weekly', name: (n) => `Hit the pavement ${n} time${n === 1 ? '' : 's'} this week`, unit: 'runs', progressKey: 'run_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.run.avgSessionsPerWeek, 1.8, 2, 7), xpForTarget: (n) => n * 40 },
  { key: 'run_miles_w3', section: 'run', period: 'weekly', name: (n) => `Cover ${n} miles on foot this week`, unit: 'miles', progressKey: 'run_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.run.avgMilesPerWeek, 1.4, 1), xpForTarget: (n) => n * 12 },
  { key: 'run_sessions_w3', section: 'run', period: 'weekly', name: (n) => `Lace up and run ${n} day${n === 1 ? '' : 's'} this week`, unit: 'days', progressKey: 'run_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.run.avgSessionsPerWeek, 1.6, 1, 6), xpForTarget: (n) => n * 30 },
  { key: 'run_miles_w4', section: 'run', period: 'weekly', name: (n) => `Push for ${n} miles total this week`, unit: 'miles', progressKey: 'run_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.run.avgMilesPerWeek, 2.2, 4), xpForTarget: (n) => n * 20 },
  // ── RUN MONTHLY ──
  { key: 'run_miles_m1', section: 'run', period: 'monthly', name: (n) => `Run ${n} miles this month`, unit: 'miles', progressKey: 'run_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.run.avgMilesPerWeek * 4, 1.4, 8), xpForTarget: (n) => n * 10 },
  { key: 'run_miles_m2', section: 'run', period: 'monthly', name: (n) => `Log ${n}+ miles of running this month`, unit: 'miles', progressKey: 'run_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.run.avgMilesPerWeek * 4, 1.7, 12), xpForTarget: (n) => n * 12 },
  { key: 'run_sessions_m1', section: 'run', period: 'monthly', name: (n) => `Complete ${n} run${n === 1 ? '' : 's'} this month`, unit: 'runs', progressKey: 'run_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.run.avgSessionsPerWeek * 4, 1.4, 4, 28), xpForTarget: (n) => n * 20 },
  { key: 'run_sessions_m2', section: 'run', period: 'monthly', name: (n) => `Run ${n} time${n === 1 ? '' : 's'} this month`, unit: 'runs', progressKey: 'run_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.run.avgSessionsPerWeek * 4, 1.6, 6, 30), xpForTarget: (n) => n * 22 },
  // ── BIKE WEEKLY ──
  { key: 'bike_miles_w1', section: 'bike', period: 'weekly', name: (n) => `Ride ${n} miles this week`, unit: 'miles', progressKey: 'bike_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.bike.avgMilesPerWeek, 1.6, 2), xpForTarget: (n) => n * 12 },
  { key: 'bike_miles_w2', section: 'bike', period: 'weekly', name: (n) => `Log ${n} cycling miles this week`, unit: 'miles', progressKey: 'bike_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.bike.avgMilesPerWeek, 2, 3), xpForTarget: (n) => n * 14 },
  { key: 'bike_sessions_w1', section: 'bike', period: 'weekly', name: (n) => `Complete ${n} ride${n === 1 ? '' : 's'} this week`, unit: 'rides', progressKey: 'bike_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.bike.avgSessionsPerWeek, 1.5, 1, 7), xpForTarget: (n) => n * 35 },
  { key: 'bike_sessions_w2', section: 'bike', period: 'weekly', name: (n) => `Hop on the bike ${n} time${n === 1 ? '' : 's'} this week`, unit: 'rides', progressKey: 'bike_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.bike.avgSessionsPerWeek, 1.8, 2, 7), xpForTarget: (n) => n * 40 },
  { key: 'bike_miles_w3', section: 'bike', period: 'weekly', name: (n) => `Cover ${n} miles by bike this week`, unit: 'miles', progressKey: 'bike_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.bike.avgMilesPerWeek, 1.4, 1), xpForTarget: (n) => n * 10 },
  { key: 'bike_miles_w4', section: 'bike', period: 'weekly', name: (n) => `Push for ${n} cycling miles this week`, unit: 'miles', progressKey: 'bike_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.bike.avgMilesPerWeek, 2.2, 4), xpForTarget: (n) => n * 16 },
  // ── BIKE MONTHLY ──
  { key: 'bike_miles_m1', section: 'bike', period: 'monthly', name: (n) => `Ride ${n} miles this month`, unit: 'miles', progressKey: 'bike_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.bike.avgMilesPerWeek * 4, 1.4, 8), xpForTarget: (n) => n * 8 },
  { key: 'bike_miles_m2', section: 'bike', period: 'monthly', name: (n) => `Log ${n}+ cycling miles this month`, unit: 'miles', progressKey: 'bike_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.bike.avgMilesPerWeek * 4, 1.7, 12), xpForTarget: (n) => n * 10 },
  { key: 'bike_sessions_m1', section: 'bike', period: 'monthly', name: (n) => `Complete ${n} ride${n === 1 ? '' : 's'} this month`, unit: 'rides', progressKey: 'bike_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.bike.avgSessionsPerWeek * 4, 1.4, 4, 28), xpForTarget: (n) => n * 18 },
  { key: 'bike_sessions_m2', section: 'bike', period: 'monthly', name: (n) => `Log ${n} cycling sessions this month`, unit: 'rides', progressKey: 'bike_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.bike.avgSessionsPerWeek * 4, 1.6, 6, 30), xpForTarget: (n) => n * 20 },
  // ── SWIM WEEKLY ──
  { key: 'swim_sessions_w1', section: 'swim', period: 'weekly', name: (n) => `Swim ${n} time${n === 1 ? '' : 's'} this week`, unit: 'sessions', progressKey: 'swim_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.swim.avgSessionsPerWeek, 1.5, 1, 7), xpForTarget: (n) => n * 40 },
  { key: 'swim_sessions_w2', section: 'swim', period: 'weekly', name: (n) => `Log ${n} swim session${n === 1 ? '' : 's'} this week`, unit: 'sessions', progressKey: 'swim_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.swim.avgSessionsPerWeek, 1.8, 1, 7), xpForTarget: (n) => n * 45 },
  { key: 'swim_sessions_w3', section: 'swim', period: 'weekly', name: (n) => `Hit the pool ${n} time${n === 1 ? '' : 's'} this week`, unit: 'sessions', progressKey: 'swim_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.swim.avgSessionsPerWeek, 2, 2, 7), xpForTarget: (n) => n * 50 },
  { key: 'swim_sessions_w4', section: 'swim', period: 'weekly', name: (n) => `Complete ${n} swim${n === 1 ? '' : 's'} this week`, unit: 'sessions', progressKey: 'swim_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.swim.avgSessionsPerWeek, 1.6, 1, 6), xpForTarget: (n) => n * 38 },
  { key: 'swim_sessions_w5', section: 'swim', period: 'weekly', name: (_n) => `Get in the water this week`, unit: 'sessions', progressKey: 'swim_sessions', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 50 },
  // ── SWIM MONTHLY ──
  { key: 'swim_sessions_m1', section: 'swim', period: 'monthly', name: (n) => `Swim ${n} time${n === 1 ? '' : 's'} this month`, unit: 'sessions', progressKey: 'swim_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.swim.avgSessionsPerWeek * 4, 1.4, 4, 28), xpForTarget: (n) => n * 25 },
  { key: 'swim_sessions_m2', section: 'swim', period: 'monthly', name: (n) => `Log ${n} swim sessions this month`, unit: 'sessions', progressKey: 'swim_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.swim.avgSessionsPerWeek * 4, 1.6, 6, 30), xpForTarget: (n) => n * 28 },
  { key: 'swim_sessions_m3', section: 'swim', period: 'monthly', name: (n) => `Complete ${n} pool sessions this month`, unit: 'sessions', progressKey: 'swim_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.swim.avgSessionsPerWeek * 4, 1.3, 3, 25), xpForTarget: (n) => n * 22 },
  // ── WALK WEEKLY ──
  { key: 'walk_miles_w1', section: 'walk', period: 'weekly', name: (n) => `Walk ${n} miles this week`, unit: 'miles', progressKey: 'walk_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.walk.avgMilesPerWeek, 1.5, 2), xpForTarget: (n) => n * 10 },
  { key: 'walk_miles_w2', section: 'walk', period: 'weekly', name: (n) => `Log ${n} walking miles this week`, unit: 'miles', progressKey: 'walk_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.walk.avgMilesPerWeek, 1.8, 3), xpForTarget: (n) => n * 12 },
  { key: 'walk_miles_w3', section: 'walk', period: 'weekly', name: (n) => `Cover ${n} miles on foot this week`, unit: 'miles', progressKey: 'walk_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.walk.avgMilesPerWeek, 1.3, 1), xpForTarget: (n) => n * 9 },
  { key: 'walk_sessions_w1', section: 'walk', period: 'weekly', name: (n) => `Go for ${n} walk${n === 1 ? '' : 's'} this week`, unit: 'walks', progressKey: 'walk_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.walk.avgSessionsPerWeek, 1.5, 1, 7), xpForTarget: (n) => n * 25 },
  { key: 'walk_sessions_w2', section: 'walk', period: 'weekly', name: (n) => `Log ${n} walk session${n === 1 ? '' : 's'} this week`, unit: 'walks', progressKey: 'walk_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.walk.avgSessionsPerWeek, 1.8, 2, 7), xpForTarget: (n) => n * 28 },
  // ── WALK MONTHLY ──
  { key: 'walk_miles_m1', section: 'walk', period: 'monthly', name: (n) => `Walk ${n} miles this month`, unit: 'miles', progressKey: 'walk_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.walk.avgMilesPerWeek * 4, 1.4, 8), xpForTarget: (n) => n * 7 },
  { key: 'walk_sessions_m1', section: 'walk', period: 'monthly', name: (n) => `Go for ${n} walk${n === 1 ? '' : 's'} this month`, unit: 'walks', progressKey: 'walk_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.walk.avgSessionsPerWeek * 4, 1.4, 4, 25), xpForTarget: (n) => n * 15 },
  { key: 'walk_miles_m2', section: 'walk', period: 'monthly', name: (n) => `Log ${n} walking miles this month`, unit: 'miles', progressKey: 'walk_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.walk.avgMilesPerWeek * 4, 1.6, 10), xpForTarget: (n) => n * 8 },
  // ── SKATE WEEKLY ──
  { key: 'skate_miles_w1', section: 'skate', period: 'weekly', name: (n) => `Skate ${n} miles this week`, unit: 'miles', progressKey: 'skate_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.skate.avgMilesPerWeek, 1.6, 2), xpForTarget: (n) => n * 14 },
  { key: 'skate_miles_w2', section: 'skate', period: 'weekly', name: (n) => `Log ${n} miles on wheels this week`, unit: 'miles', progressKey: 'skate_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.skate.avgMilesPerWeek, 2, 3), xpForTarget: (n) => n * 17 },
  { key: 'skate_sessions_w1', section: 'skate', period: 'weekly', name: (n) => `Skate ${n} time${n === 1 ? '' : 's'} this week`, unit: 'sessions', progressKey: 'skate_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.skate.avgSessionsPerWeek, 1.5, 1, 7), xpForTarget: (n) => n * 35 },
  { key: 'skate_sessions_w2', section: 'skate', period: 'weekly', name: (n) => `Get on the board ${n} day${n === 1 ? '' : 's'} this week`, unit: 'days', progressKey: 'skate_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.skate.avgSessionsPerWeek, 1.8, 2, 7), xpForTarget: (n) => n * 40 },
  { key: 'skate_miles_w3', section: 'skate', period: 'weekly', name: (n) => `Cover ${n} skate miles this week`, unit: 'miles', progressKey: 'skate_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.skate.avgMilesPerWeek, 1.4, 1), xpForTarget: (n) => n * 12 },
  { key: 'skate_miles_w4', section: 'skate', period: 'weekly', name: (n) => `Push to ${n} miles this week`, unit: 'miles', progressKey: 'skate_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.skate.avgMilesPerWeek, 2.5, 4), xpForTarget: (n) => n * 22 },
  { key: 'skate_sessions_w3', section: 'skate', period: 'weekly', name: (n) => `Roll out ${n} time${n === 1 ? '' : 's'} this week`, unit: 'sessions', progressKey: 'skate_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.skate.avgSessionsPerWeek, 2, 2, 7), xpForTarget: (n) => n * 45 },
  { key: 'skate_miles_w5', section: 'skate', period: 'weekly', name: (n) => `Rack up ${n} skate miles this week`, unit: 'miles', progressKey: 'skate_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.skate.avgMilesPerWeek, 1.8, 3), xpForTarget: (n) => n * 15 },
  // ── SKATE MONTHLY ──
  { key: 'skate_miles_m1', section: 'skate', period: 'monthly', name: (n) => `Skate ${n} miles this month`, unit: 'miles', progressKey: 'skate_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.skate.avgMilesPerWeek * 4, 1.4, 8), xpForTarget: (n) => n * 9 },
  { key: 'skate_miles_m2', section: 'skate', period: 'monthly', name: (n) => `Log ${n}+ miles on wheels this month`, unit: 'miles', progressKey: 'skate_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.skate.avgMilesPerWeek * 4, 1.7, 12), xpForTarget: (n) => n * 11 },
  { key: 'skate_miles_m3', section: 'skate', period: 'monthly', name: (n) => `Rack up ${n} skate miles this month`, unit: 'miles', progressKey: 'skate_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.skate.avgMilesPerWeek * 4, 2, 15), xpForTarget: (n) => n * 13 },
  { key: 'skate_sessions_m1', section: 'skate', period: 'monthly', name: (n) => `Skate ${n} time${n === 1 ? '' : 's'} this month`, unit: 'sessions', progressKey: 'skate_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.skate.avgSessionsPerWeek * 4, 1.4, 4, 25), xpForTarget: (n) => n * 20 },
  { key: 'skate_sessions_m2', section: 'skate', period: 'monthly', name: (n) => `Roll out ${n} time${n === 1 ? '' : 's'} this month`, unit: 'sessions', progressKey: 'skate_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.skate.avgSessionsPerWeek * 4, 1.6, 6, 28), xpForTarget: (n) => n * 22 },
  // ── SLEEP WEEKLY ──
  { key: 'sleep_nights_w1', section: 'sleep', period: 'weekly', name: (n) => `Log sleep ${n} night${n === 1 ? '' : 's'} this week`, unit: 'nights', progressKey: 'sleep_nights', displayMode: 'count', scaleTarget: (s) => Math.min(7, Math.max(3, cr(s.sleep.avgNightsPerWeek + 1))), xpForTarget: (n) => n * 20 },
  { key: 'sleep_nights_w2', section: 'sleep', period: 'weekly', name: (n) => `Track your sleep ${n} night${n === 1 ? '' : 's'} this week`, unit: 'nights', progressKey: 'sleep_nights', displayMode: 'count', scaleTarget: (s) => Math.min(7, Math.max(3, cr(s.sleep.avgNightsPerWeek + 2))), xpForTarget: (n) => n * 22 },
  { key: 'sleep_hours_w1', section: 'sleep', period: 'weekly', name: (n) => `Average ${n}+ hours of sleep this week`, unit: 'hrs', progressKey: 'sleep_avg_hours', displayMode: 'avg', scaleTarget: (s) => Math.max(7, Math.min(9, cr(s.sleep.avgHours + 0.5))), xpForTarget: (n) => n * 30 },
  { key: 'sleep_hours_w2', section: 'sleep', period: 'weekly', name: (_n) => `Get 7 hours average sleep this week`, unit: 'hrs', progressKey: 'sleep_avg_hours', displayMode: 'avg', scaleTarget: () => 7, xpForTarget: () => 200 },
  { key: 'sleep_quality_w1', section: 'sleep', period: 'weekly', name: (n) => `Log ${n} quality night${n === 1 ? '' : 's'} (7h+) this week`, unit: 'nights', progressKey: 'sleep_quality_nights', displayMode: 'count', scaleTarget: (s) => Math.min(7, Math.max(2, cr(s.sleep.avgNightsPerWeek * 0.7 + 1))), xpForTarget: (n) => n * 35 },
  { key: 'sleep_nights_w3', section: 'sleep', period: 'weekly', name: (_n) => `Log sleep every night this week`, unit: 'nights', progressKey: 'sleep_nights', displayMode: 'count', scaleTarget: () => 7, xpForTarget: () => 180 },
  { key: 'sleep_quality_w2', section: 'sleep', period: 'weekly', name: (n) => `Hit 7+ hours of sleep ${n} night${n === 1 ? '' : 's'}`, unit: 'nights', progressKey: 'sleep_quality_nights', displayMode: 'count', scaleTarget: (s) => Math.min(5, Math.max(1, cr(s.sleep.avgNightsPerWeek * 0.6))), xpForTarget: (n) => n * 40 },
  { key: 'sleep_nights_w4', section: 'sleep', period: 'weekly', name: (n) => `Stay consistent — log sleep ${n} day${n === 1 ? '' : 's'}`, unit: 'nights', progressKey: 'sleep_nights', displayMode: 'count', scaleTarget: (s) => Math.min(6, Math.max(4, cr(s.sleep.avgNightsPerWeek + 1))), xpForTarget: (n) => n * 18 },
  // ── SLEEP MONTHLY ──
  { key: 'sleep_nights_m1', section: 'sleep', period: 'monthly', name: (n) => `Log sleep ${n} night${n === 1 ? '' : 's'} this month`, unit: 'nights', progressKey: 'sleep_nights', displayMode: 'count', scaleTarget: (s) => sc(s.sleep.avgNightsPerWeek * 4, 1.3, 10, 28), xpForTarget: (n) => n * 6 },
  { key: 'sleep_nights_m2', section: 'sleep', period: 'monthly', name: (n) => `Track your sleep ${n} night${n === 1 ? '' : 's'} this month`, unit: 'nights', progressKey: 'sleep_nights', displayMode: 'count', scaleTarget: (s) => sc(s.sleep.avgNightsPerWeek * 4, 1.5, 14, 30), xpForTarget: (n) => n * 7 },
  { key: 'sleep_nights_m3', section: 'sleep', period: 'monthly', name: (n) => `Stay consistent — log sleep ${n} day${n === 1 ? '' : 's'} this month`, unit: 'nights', progressKey: 'sleep_nights', displayMode: 'count', scaleTarget: (s) => sc(s.sleep.avgNightsPerWeek * 4, 1.7, 16, 30), xpForTarget: (n) => n * 8 },
  { key: 'sleep_quality_m1', section: 'sleep', period: 'monthly', name: (n) => `Log ${n} quality night${n === 1 ? '' : 's'} (7h+) this month`, unit: 'nights', progressKey: 'sleep_quality_nights', displayMode: 'count', scaleTarget: (s) => sc(s.sleep.avgNightsPerWeek * 4 * 0.7, 1.3, 8, 25), xpForTarget: (n) => n * 12 },
  { key: 'sleep_quality_m2', section: 'sleep', period: 'monthly', name: (n) => `Hit 7+ hours of sleep ${n} night${n === 1 ? '' : 's'} this month`, unit: 'nights', progressKey: 'sleep_quality_nights', displayMode: 'count', scaleTarget: (s) => sc(s.sleep.avgNightsPerWeek * 4 * 0.6, 1.4, 6, 22), xpForTarget: (n) => n * 14 },
  // ── WATER WEEKLY ──
  { key: 'water_days_w1', section: 'water', period: 'weekly', name: (n) => `Log water ${n} day${n === 1 ? '' : 's'} this week`, unit: 'days', progressKey: 'water_days', displayMode: 'count', scaleTarget: (s) => Math.min(7, Math.max(3, cr(s.water.avgDaysPerWeek * 1.4 + 1))), xpForTarget: (n) => n * 18 },
  { key: 'water_days_w2', section: 'water', period: 'weekly', name: (n) => `Track hydration ${n} day${n === 1 ? '' : 's'} this week`, unit: 'days', progressKey: 'water_days', displayMode: 'count', scaleTarget: (s) => Math.min(7, Math.max(3, cr(s.water.avgDaysPerWeek * 1.5 + 1))), xpForTarget: (n) => n * 20 },
  { key: 'water_goal_w1', section: 'water', period: 'weekly', name: (n) => `Hit your water goal ${n} day${n === 1 ? '' : 's'} this week`, unit: 'days', progressKey: 'water_goal_days', displayMode: 'count', scaleTarget: (s) => Math.min(7, Math.max(2, cr(s.water.avgDaysPerWeek * 1.3))), xpForTarget: (n) => n * 25 },
  { key: 'water_days_w3', section: 'water', period: 'weekly', name: (_n) => `Log water every day this week`, unit: 'days', progressKey: 'water_days', displayMode: 'count', scaleTarget: () => 7, xpForTarget: () => 160 },
  { key: 'water_goal_w2', section: 'water', period: 'weekly', name: (n) => `Drink 64oz+ ${n} day${n === 1 ? '' : 's'} this week`, unit: 'days', progressKey: 'water_goal_days', displayMode: 'count', scaleTarget: (s) => Math.min(6, Math.max(3, cr(s.water.avgDaysPerWeek * 1.5))), xpForTarget: (n) => n * 28 },
  { key: 'water_days_w4', section: 'water', period: 'weekly', name: (n) => `Stay hydrated — log ${n} day${n === 1 ? '' : 's'}`, unit: 'days', progressKey: 'water_days', displayMode: 'count', scaleTarget: (s) => Math.min(7, Math.max(4, cr(s.water.avgDaysPerWeek + 2))), xpForTarget: (n) => n * 15 },
  // ── WATER MONTHLY ──
  { key: 'water_days_m1', section: 'water', period: 'monthly', name: (n) => `Log water ${n} day${n === 1 ? '' : 's'} this month`, unit: 'days', progressKey: 'water_days', displayMode: 'count', scaleTarget: (s) => Math.min(30, Math.max(8, cr(s.water.avgDaysPerWeek * 4 * 1.3))), xpForTarget: (n) => n * 6 },
  { key: 'water_goal_m1', section: 'water', period: 'monthly', name: (n) => `Hit your goal ${n} day${n === 1 ? '' : 's'} this month`, unit: 'days', progressKey: 'water_goal_days', displayMode: 'count', scaleTarget: (s) => Math.min(28, Math.max(6, cr(s.water.avgDaysPerWeek * 4 * 1.2))), xpForTarget: (n) => n * 8 },
  { key: 'water_days_m2', section: 'water', period: 'monthly', name: (n) => `Stay hydrated ${n} day${n === 1 ? '' : 's'} this month`, unit: 'days', progressKey: 'water_days', displayMode: 'count', scaleTarget: (s) => Math.min(30, Math.max(10, cr(s.water.avgDaysPerWeek * 4 * 1.5))), xpForTarget: (n) => n * 7 },
  // ── BOOKS WEEKLY ──
  { key: 'books_finish_w1', section: 'books', period: 'weekly', name: (_n) => `Finish a book this week`, unit: 'books', progressKey: 'books_finished', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 250 },
  { key: 'books_finish_w2', section: 'books', period: 'weekly', name: (_n) => `Complete a book this week`, unit: 'books', progressKey: 'books_finished', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 250 },
  { key: 'books_read_w3', section: 'books', period: 'weekly', name: (_n) => `Read a book this week`, unit: 'books', progressKey: 'books_finished', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 220 },
  { key: 'books_month_w1', section: 'books', period: 'weekly', name: (_n) => `Finish a book this week (monthly goal start!)`, unit: 'books', progressKey: 'books_finished', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 300 },
  { key: 'books_w5', section: 'books', period: 'weekly', name: (_n) => `Close out a book this week`, unit: 'books', progressKey: 'books_finished', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 250 },
  { key: 'books_w6', section: 'books', period: 'weekly', name: (_n) => `Power through a book this week`, unit: 'books', progressKey: 'books_finished', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 250 },
  // ── BOOKS MONTHLY ──
  { key: 'books_finish_m1', section: 'books', period: 'monthly', name: (n) => `Finish ${n} book${n === 1 ? '' : 's'} this month`, unit: 'books', progressKey: 'books_finished', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.books.avgPerMonth * 1.4)), xpForTarget: (n) => n * 250 },
  { key: 'books_finish_m2', section: 'books', period: 'monthly', name: (n) => `Read ${n} book${n === 1 ? '' : 's'} this month`, unit: 'books', progressKey: 'books_finished', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.books.avgPerMonth * 1.6)), xpForTarget: (n) => n * 280 },
  { key: 'books_finish_m3', section: 'books', period: 'monthly', name: (n) => `Complete ${n} book${n === 1 ? '' : 's'} this month`, unit: 'books', progressKey: 'books_finished', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.books.avgPerMonth * 1.2)), xpForTarget: (n) => n * 230 },
  { key: 'books_finish_m4', section: 'books', period: 'monthly', name: (n) => `Add ${n} book${n === 1 ? '' : 's'} to your finished list this month`, unit: 'books', progressKey: 'books_finished', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.books.avgPerMonth * 1.8)), xpForTarget: (n) => n * 300 },
  // ── MOOD WEEKLY ──
  { key: 'mood_days_w1', section: 'mood', period: 'weekly', name: (n) => `Log mood ${n} day${n === 1 ? '' : 's'} this week`, unit: 'days', progressKey: 'mood_days', displayMode: 'count', scaleTarget: (s) => Math.min(7, Math.max(3, cr(s.mood.avgDaysPerWeek * 1.5))), xpForTarget: (n) => n * 18 },
  { key: 'mood_days_w2', section: 'mood', period: 'weekly', name: (n) => `Check in with your mood ${n} day${n === 1 ? '' : 's'}`, unit: 'days', progressKey: 'mood_days', displayMode: 'count', scaleTarget: (s) => Math.min(7, Math.max(3, cr(s.mood.avgDaysPerWeek * 1.5))), xpForTarget: (n) => n * 20 },
  { key: 'mood_avg_w1', section: 'mood', period: 'weekly', name: (n) => `Maintain a mood average of ${n}+ this week`, unit: '/10', progressKey: 'mood_avg', displayMode: 'avg', scaleTarget: (s) => Math.max(6, Math.min(9, cr(s.mood.avgScore))), xpForTarget: (n) => n * 25 },
  { key: 'mood_days_w3', section: 'mood', period: 'weekly', name: (_n) => `Log mood every day this week`, unit: 'days', progressKey: 'mood_days', displayMode: 'count', scaleTarget: () => 7, xpForTarget: () => 160 },
  { key: 'mood_avg_w2', section: 'mood', period: 'weekly', name: (_n) => `Hit a 7/10 average mood this week`, unit: '/10', progressKey: 'mood_avg', displayMode: 'avg', scaleTarget: () => 7, xpForTarget: () => 180 },
  { key: 'mood_days_w4', section: 'mood', period: 'weekly', name: (n) => `Track your mood ${n} day${n === 1 ? '' : 's'} this week`, unit: 'days', progressKey: 'mood_days', displayMode: 'count', scaleTarget: (s) => Math.min(7, Math.max(4, cr(s.mood.avgDaysPerWeek + 2))), xpForTarget: (n) => n * 15 },
  { key: 'mood_days_w5', section: 'mood', period: 'weekly', name: (n) => `Stay mindful — log mood ${n} day${n === 1 ? '' : 's'}`, unit: 'days', progressKey: 'mood_days', displayMode: 'count', scaleTarget: (s) => Math.min(6, Math.max(2, cr(s.mood.avgDaysPerWeek * 1.8))), xpForTarget: (n) => n * 22 },
  // ── MOOD MONTHLY ──
  { key: 'mood_days_m1', section: 'mood', period: 'monthly', name: (n) => `Log mood ${n} day${n === 1 ? '' : 's'} this month`, unit: 'days', progressKey: 'mood_days', displayMode: 'count', scaleTarget: (s) => sc(s.mood.avgDaysPerWeek * 4, 1.4, 10, 30), xpForTarget: (n) => n * 5 },
  { key: 'mood_days_m2', section: 'mood', period: 'monthly', name: (n) => `Check in with your mood ${n} time${n === 1 ? '' : 's'} this month`, unit: 'days', progressKey: 'mood_days', displayMode: 'count', scaleTarget: (s) => sc(s.mood.avgDaysPerWeek * 4, 1.6, 12, 30), xpForTarget: (n) => n * 6 },
  { key: 'mood_avg_m1', section: 'mood', period: 'monthly', name: (_n) => `Average a 7/10 mood this month`, unit: '/10', progressKey: 'mood_avg', displayMode: 'avg', scaleTarget: () => 7, xpForTarget: () => 300 },
  { key: 'mood_days_m3', section: 'mood', period: 'monthly', name: (n) => `Log mood ${n} day${n === 1 ? '' : 's'} this month (consistent)`, unit: 'days', progressKey: 'mood_days', displayMode: 'count', scaleTarget: (s) => sc(s.mood.avgDaysPerWeek * 4, 1.4, 8, 28), xpForTarget: (n) => n * 5 },
  // ── CHESS (via factory) ──
  ...gameSportTemplates({ section: 'chess', displayName: 'chess', gamesKey: 'chess_games', winsKey: 'chess_wins', statsGetter: (s) => ({ avgPerWeek: s.chess.avgPerWeek, winRate: s.chess.winRate }) }),
  // ── DISC GOLF WEEKLY ──
  { key: 'disc_golf_rounds_w1', section: 'disc_golf', period: 'weekly', name: (_n) => `Play a round of disc golf this week`, unit: 'rounds', progressKey: 'disc_golf_rounds', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 80 },
  { key: 'disc_golf_rounds_w2', section: 'disc_golf', period: 'weekly', name: (_n) => `Hit the disc golf course this week`, unit: 'rounds', progressKey: 'disc_golf_rounds', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 80 },
  { key: 'disc_golf_rounds_w3', section: 'disc_golf', period: 'weekly', name: (_n) => `Get out and disc golf this week`, unit: 'rounds', progressKey: 'disc_golf_rounds', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 80 },
  { key: 'disc_golf_rounds_w4', section: 'disc_golf', period: 'weekly', name: (n) => `Play ${n} round${n === 1 ? '' : 's'} of disc golf this week`, unit: 'rounds', progressKey: 'disc_golf_rounds', displayMode: 'count', scaleTarget: (s) => Math.min(3, Math.max(1, cr(s.disc_golf.avgPerMonth / 4 * 1.5))), xpForTarget: (n) => n * 80 },
  { key: 'disc_golf_rounds_w5', section: 'disc_golf', period: 'weekly', name: (_n) => `Log a disc golf session this week`, unit: 'rounds', progressKey: 'disc_golf_rounds', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 75 },
  // ── DISC GOLF MONTHLY ──
  { key: 'disc_golf_rounds_m1', section: 'disc_golf', period: 'monthly', name: (n) => `Play ${n} round${n === 1 ? '' : 's'} of disc golf this month`, unit: 'rounds', progressKey: 'disc_golf_rounds', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.disc_golf.avgPerMonth * 1.4)), xpForTarget: (n) => n * 70 },
  { key: 'disc_golf_rounds_m2', section: 'disc_golf', period: 'monthly', name: (n) => `Hit ${n} course${n === 1 ? '' : 's'} this month`, unit: 'rounds', progressKey: 'disc_golf_rounds', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.disc_golf.avgPerMonth * 1.4)), xpForTarget: (n) => n * 75 },
  { key: 'disc_golf_rounds_m3', section: 'disc_golf', period: 'monthly', name: (n) => `Log ${n} disc golf round${n === 1 ? '' : 's'} this month`, unit: 'rounds', progressKey: 'disc_golf_rounds', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.disc_golf.avgPerMonth * 1.6)), xpForTarget: (n) => n * 65 },
  // ── FORTNITE WEEKLY ──
  { key: 'fortnite_wins_w1', section: 'fortnite', period: 'weekly', name: (_n) => `Win a Fortnite game this week`, unit: 'wins', progressKey: 'fortnite_wins', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 200 },
  { key: 'fortnite_games_w1', section: 'fortnite', period: 'weekly', name: (n) => `Play ${n} Fortnite game${n === 1 ? '' : 's'} this week`, unit: 'games', progressKey: 'fortnite_games', displayMode: 'count', scaleTarget: (s) => sc(s.fortnite.avgPerWeek, 1.5, 2), xpForTarget: (n) => n * 15 },
  { key: 'fortnite_games_w2', section: 'fortnite', period: 'weekly', name: (n) => `Log ${n} Fortnite session${n === 1 ? '' : 's'} this week`, unit: 'games', progressKey: 'fortnite_games', displayMode: 'count', scaleTarget: (s) => sc(s.fortnite.avgPerWeek, 2, 3), xpForTarget: (n) => n * 18 },
  { key: 'fortnite_kills_w1', section: 'fortnite', period: 'weekly', name: (n) => `Get ${n} total kills this week`, unit: 'kills', progressKey: 'fortnite_kills_total', displayMode: 'count', scaleTarget: (s) => Math.max(5, cr(s.fortnite.avgKills * s.fortnite.avgPerWeek * 1.5)), xpForTarget: (n) => n * 3 },
  { key: 'fortnite_wins_w2', section: 'fortnite', period: 'weekly', name: (n) => `Secure ${n} Fortnite win${n === 1 ? '' : 's'} this week`, unit: 'wins', progressKey: 'fortnite_wins', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.fortnite.avgPerWeek * 0.3 * 1.5)), xpForTarget: (n) => n * 200 },
  { key: 'fortnite_games_w3', section: 'fortnite', period: 'weekly', name: (n) => `Queue up ${n} Fortnite match${n === 1 ? '' : 'es'} this week`, unit: 'games', progressKey: 'fortnite_games', displayMode: 'count', scaleTarget: (s) => sc(s.fortnite.avgPerWeek, 1.8, 2), xpForTarget: (n) => n * 12 },
  { key: 'fortnite_kills_w2', section: 'fortnite', period: 'weekly', name: (n) => `Rack up ${n} kills in Fortnite this week`, unit: 'kills', progressKey: 'fortnite_kills_total', displayMode: 'count', scaleTarget: (s) => Math.max(3, cr(s.fortnite.avgKills * s.fortnite.avgPerWeek * 2)), xpForTarget: (n) => n * 4 },
  // ── FORTNITE MONTHLY ──
  { key: 'fortnite_wins_m1', section: 'fortnite', period: 'monthly', name: (n) => `Win ${n} Fortnite game${n === 1 ? '' : 's'} this month`, unit: 'wins', progressKey: 'fortnite_wins', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.fortnite.avgPerWeek * 4 * 0.3 * 1.4)), xpForTarget: (n) => n * 180 },
  { key: 'fortnite_games_m1', section: 'fortnite', period: 'monthly', name: (n) => `Play ${n} Fortnite game${n === 1 ? '' : 's'} this month`, unit: 'games', progressKey: 'fortnite_games', displayMode: 'count', scaleTarget: (s) => sc(s.fortnite.avgPerWeek * 4, 1.4, 8), xpForTarget: (n) => n * 10 },
  { key: 'fortnite_kills_m1', section: 'fortnite', period: 'monthly', name: (n) => `Get ${n} total kills this month`, unit: 'kills', progressKey: 'fortnite_kills_total', displayMode: 'count', scaleTarget: (s) => Math.max(20, cr(s.fortnite.avgKills * s.fortnite.avgPerWeek * 4 * 1.4)), xpForTarget: (n) => n * 2 },
  { key: 'fortnite_wins_m2', section: 'fortnite', period: 'monthly', name: (n) => `Secure ${n} Fortnite victory royale${n === 1 ? '' : 's'} this month`, unit: 'wins', progressKey: 'fortnite_wins', displayMode: 'count', scaleTarget: (s) => Math.max(2, cr(s.fortnite.avgPerWeek * 4 * 0.3 * 1.7)), xpForTarget: (n) => n * 200 },
  { key: 'fortnite_games_m2', section: 'fortnite', period: 'monthly', name: (n) => `Log ${n} Fortnite session${n === 1 ? '' : 's'} this month`, unit: 'games', progressKey: 'fortnite_games', displayMode: 'count', scaleTarget: (s) => sc(s.fortnite.avgPerWeek * 4, 1.6, 10), xpForTarget: (n) => n * 12 },
  // ── GOLF WEEKLY ──
  { key: 'golf_rounds_w1', section: 'golf', period: 'weekly', name: (_n) => `Play a round of golf this week`, unit: 'rounds', progressKey: 'golf_rounds', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 100 },
  { key: 'golf_rounds_w2', section: 'golf', period: 'weekly', name: (_n) => `Hit the golf course this week`, unit: 'rounds', progressKey: 'golf_rounds', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 100 },
  { key: 'golf_rounds_w3', section: 'golf', period: 'weekly', name: (_n) => `Get out and golf this week`, unit: 'rounds', progressKey: 'golf_rounds', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 100 },
  { key: 'golf_rounds_w4', section: 'golf', period: 'weekly', name: (n) => `Play ${n} round${n === 1 ? '' : 's'} of golf this week`, unit: 'rounds', progressKey: 'golf_rounds', displayMode: 'count', scaleTarget: (s) => Math.min(3, Math.max(1, cr(s.golf.avgPerMonth / 4 * 1.5))), xpForTarget: (n) => n * 100 },
  { key: 'golf_rounds_w5', section: 'golf', period: 'weekly', name: (_n) => `Log a golf session this week`, unit: 'rounds', progressKey: 'golf_rounds', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 90 },
  // ── GOLF MONTHLY ──
  { key: 'golf_rounds_m1', section: 'golf', period: 'monthly', name: (n) => `Play ${n} round${n === 1 ? '' : 's'} of golf this month`, unit: 'rounds', progressKey: 'golf_rounds', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.golf.avgPerMonth * 1.4)), xpForTarget: (n) => n * 80 },
  { key: 'golf_rounds_m2', section: 'golf', period: 'monthly', name: (n) => `Hit the course ${n} time${n === 1 ? '' : 's'} this month`, unit: 'rounds', progressKey: 'golf_rounds', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.golf.avgPerMonth * 1.4)), xpForTarget: (n) => n * 85 },
  { key: 'golf_rounds_m3', section: 'golf', period: 'monthly', name: (n) => `Log ${n} golf round${n === 1 ? '' : 's'} this month`, unit: 'rounds', progressKey: 'golf_rounds', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.golf.avgPerMonth * 1.6)), xpForTarget: (n) => n * 75 },
  // ── HIKING WEEKLY ──
  { key: 'hiking_miles_w1', section: 'hiking', period: 'weekly', name: (n) => `Hike ${n} mile${n === 1 ? '' : 's'} this week`, unit: 'miles', progressKey: 'hiking_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.hiking.avgMilesPerMonth / 4, 1.6, 2), xpForTarget: (n) => n * 20 },
  { key: 'hiking_sessions_w1', section: 'hiking', period: 'weekly', name: (n) => `Complete ${n} hike${n === 1 ? '' : 's'} this week`, unit: 'hikes', progressKey: 'hiking_sessions', displayMode: 'count', scaleTarget: (s) => Math.max(1, cr(s.hiking.avgSessionsPerMonth / 4 * 1.5)), xpForTarget: (n) => n * 60 },
  { key: 'hiking_miles_w2', section: 'hiking', period: 'weekly', name: (n) => `Log ${n} trail mile${n === 1 ? '' : 's'} this week`, unit: 'miles', progressKey: 'hiking_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.hiking.avgMilesPerMonth / 4, 2, 3), xpForTarget: (n) => n * 22 },
  { key: 'hiking_sessions_w2', section: 'hiking', period: 'weekly', name: (_n) => `Get outdoors this week`, unit: 'hikes', progressKey: 'hiking_sessions', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 70 },
  { key: 'hiking_miles_w3', section: 'hiking', period: 'weekly', name: (n) => `Cover ${n} mile${n === 1 ? '' : 's'} on the trail this week`, unit: 'miles', progressKey: 'hiking_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.hiking.avgMilesPerMonth / 4, 1.4, 1), xpForTarget: (n) => n * 18 },
  { key: 'hiking_sessions_w3', section: 'hiking', period: 'weekly', name: (_n) => `Hit the trail this week`, unit: 'hikes', progressKey: 'hiking_sessions', displayMode: 'count', scaleTarget: () => 1, xpForTarget: () => 65 },
  { key: 'hiking_miles_w4', section: 'hiking', period: 'weekly', name: (n) => `Push for ${n} trail mile${n === 1 ? '' : 's'} this week`, unit: 'miles', progressKey: 'hiking_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.hiking.avgMilesPerMonth / 4, 2.2, 4), xpForTarget: (n) => n * 25 },
  // ── HIKING MONTHLY ──
  { key: 'hiking_miles_m1', section: 'hiking', period: 'monthly', name: (n) => `Hike ${n} mile${n === 1 ? '' : 's'} this month`, unit: 'miles', progressKey: 'hiking_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.hiking.avgMilesPerMonth, 1.4, 5), xpForTarget: (n) => n * 15 },
  { key: 'hiking_sessions_m1', section: 'hiking', period: 'monthly', name: (n) => `Complete ${n} hike${n === 1 ? '' : 's'} this month`, unit: 'hikes', progressKey: 'hiking_sessions', displayMode: 'count', scaleTarget: (s) => Math.max(2, cr(s.hiking.avgSessionsPerMonth * 1.4)), xpForTarget: (n) => n * 50 },
  { key: 'hiking_miles_m2', section: 'hiking', period: 'monthly', name: (n) => `Log ${n} trail mile${n === 1 ? '' : 's'} this month`, unit: 'miles', progressKey: 'hiking_miles', displayMode: 'sum', scaleTarget: (s) => sc(s.hiking.avgMilesPerMonth, 1.7, 8), xpForTarget: (n) => n * 18 },
  { key: 'hiking_sessions_m2', section: 'hiking', period: 'monthly', name: (n) => `Get outside ${n} time${n === 1 ? '' : 's'} this month`, unit: 'hikes', progressKey: 'hiking_sessions', displayMode: 'count', scaleTarget: (s) => Math.max(2, cr(s.hiking.avgSessionsPerMonth * 1.6)), xpForTarget: (n) => n * 55 },
  // ── BASKETBALL WEEKLY ──
  { key: 'basketball_sessions_w1', section: 'basketball', period: 'weekly', name: (n) => `Play basketball ${n} time${n === 1 ? '' : 's'} this week`, unit: 'sessions', progressKey: 'basketball_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.basketball.avgPerWeek, 1.5, 1, 7), xpForTarget: (n) => n * 35 },
  { key: 'basketball_sessions_w2', section: 'basketball', period: 'weekly', name: (n) => `Hit the court ${n} time${n === 1 ? '' : 's'} this week`, unit: 'sessions', progressKey: 'basketball_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.basketball.avgPerWeek, 1.5, 1, 7), xpForTarget: (n) => n * 40 },
  { key: 'basketball_sessions_w3', section: 'basketball', period: 'weekly', name: (n) => `Log ${n} basketball session${n === 1 ? '' : 's'} this week`, unit: 'sessions', progressKey: 'basketball_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.basketball.avgPerWeek, 1.8, 1, 7), xpForTarget: (n) => n * 45 },
  { key: 'basketball_sessions_w4', section: 'basketball', period: 'weekly', name: (n) => `Ball up ${n} day${n === 1 ? '' : 's'} this week`, unit: 'sessions', progressKey: 'basketball_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.basketball.avgPerWeek, 1.8, 1, 7), xpForTarget: (n) => n * 38 },
  { key: 'basketball_sessions_w5', section: 'basketball', period: 'weekly', name: (n) => `Get ${n} hoops session${n === 1 ? '' : 's'} in this week`, unit: 'sessions', progressKey: 'basketball_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.basketball.avgPerWeek, 2, 2, 7), xpForTarget: (n) => n * 50 },
  { key: 'basketball_sessions_w6', section: 'basketball', period: 'weekly', name: (n) => `Play hoops ${n} time${n === 1 ? '' : 's'} this week`, unit: 'sessions', progressKey: 'basketball_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.basketball.avgPerWeek, 1.5, 1, 5), xpForTarget: (n) => n * 35 },
  // ── BASKETBALL MONTHLY ──
  { key: 'basketball_sessions_m1', section: 'basketball', period: 'monthly', name: (n) => `Play basketball ${n} time${n === 1 ? '' : 's'} this month`, unit: 'sessions', progressKey: 'basketball_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.basketball.avgPerWeek * 4, 1.4, 3, 25), xpForTarget: (n) => n * 20 },
  { key: 'basketball_sessions_m2', section: 'basketball', period: 'monthly', name: (n) => `Log ${n} basketball session${n === 1 ? '' : 's'} this month`, unit: 'sessions', progressKey: 'basketball_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.basketball.avgPerWeek * 4, 1.6, 4), xpForTarget: (n) => n * 22 },
  { key: 'basketball_sessions_m3', section: 'basketball', period: 'monthly', name: (n) => `Hit the court ${n} time${n === 1 ? '' : 's'} this month`, unit: 'sessions', progressKey: 'basketball_sessions', displayMode: 'count', scaleTarget: (s) => sc(s.basketball.avgPerWeek * 4, 1.3, 3), xpForTarget: (n) => n * 18 },
  // ── PICKLEBALL (via factory) ──
  ...gameSportTemplates({ section: 'pickleball', displayName: 'pickleball', gamesKey: 'pickleball_games', winsKey: 'pickleball_wins', statsGetter: (s) => ({ avgPerWeek: s.pickleball.avgPerWeek, winRate: s.pickleball.winRate }) }),
  // ── POOL (via factory) ──
  ...gameSportTemplates({ section: 'pool', displayName: 'pool', gamesKey: 'pool_games', winsKey: 'pool_wins', statsGetter: (s) => ({ avgPerWeek: s.pool.avgPerWeek, winRate: s.pool.winRate }) }),
  // ── SPIKEBALL (via factory) ──
  ...gameSportTemplates({ section: 'spikeball', displayName: 'spikeball', gamesKey: 'spikeball_games', winsKey: 'spikeball_wins', statsGetter: (s) => ({ avgPerWeek: s.spikeball.avgPerWeek, winRate: s.spikeball.winRate }) }),
  // ── TABLE TENNIS (via factory) ──
  ...gameSportTemplates({ section: 'table_tennis', displayName: 'table tennis', gamesKey: 'table_tennis_games', winsKey: 'table_tennis_wins', statsGetter: (s) => ({ avgPerWeek: s.table_tennis.avgPerWeek, winRate: s.table_tennis.winRate }) }),
  // ── VOLLEYBALL (via factory) ──
  ...gameSportTemplates({ section: 'volleyball', displayName: 'volleyball', gamesKey: 'volleyball_sessions', winsKey: 'volleyball_wins', statsGetter: (s) => ({ avgPerWeek: s.volleyball.avgPerWeek, winRate: s.volleyball.winRate }) }),
]

// ── Progress functions ────────────────────────────────────────────

export const PROGRESS_FNS: Record<string, (sb: SupabaseClient, since: string) => Promise<number>> = {
  lifting_days: async (sb, since) => {
    const { data } = await sb.from('lifting_log').select('date').gte('date', since)
    return new Set((data ?? []).map((r: { date: string }) => r.date)).size
  },
  lifting_sets: async (sb, since) => {
    const { count } = await sb.from('lifting_log').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  lifting_prs: async (sb, since) => {
    const { count } = await sb.from('pr_history').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  lifting_distinct_lifts: async (sb, since) => {
    const { data } = await sb.from('lifting_log').select('lift').gte('date', since)
    return new Set((data ?? []).map((r: { lift: string }) => r.lift)).size
  },
  lifting_bench_sets: async (sb, since) => {
    const { count } = await sb.from('lifting_log').select('id', { count: 'exact', head: true }).eq('lift', 'Bench').gte('date', since)
    return count ?? 0
  },
  lifting_squat_sets: async (sb, since) => {
    const { count } = await sb.from('lifting_log').select('id', { count: 'exact', head: true }).eq('lift', 'Squat').gte('date', since)
    return count ?? 0
  },
  run_miles: async (sb, since) => {
    const { data } = await sb.from('cardio_sessions').select('distance_miles').eq('activity', 'run').gte('date', since)
    return Math.round(((data ?? []).reduce((s: number, r: { distance_miles: number }) => s + (r.distance_miles ?? 0), 0)) * 10) / 10
  },
  run_sessions: async (sb, since) => {
    const { count } = await sb.from('cardio_sessions').select('id', { count: 'exact', head: true }).eq('activity', 'run').gte('date', since)
    return count ?? 0
  },
  bike_miles: async (sb, since) => {
    const { data } = await sb.from('cardio_sessions').select('distance_miles').eq('activity', 'bike').gte('date', since)
    return Math.round(((data ?? []).reduce((s: number, r: { distance_miles: number }) => s + (r.distance_miles ?? 0), 0)) * 10) / 10
  },
  bike_sessions: async (sb, since) => {
    const { count } = await sb.from('cardio_sessions').select('id', { count: 'exact', head: true }).eq('activity', 'bike').gte('date', since)
    return count ?? 0
  },
  swim_sessions: async (sb, since) => {
    const { count } = await sb.from('cardio_sessions').select('id', { count: 'exact', head: true }).eq('activity', 'swim').gte('date', since)
    return count ?? 0
  },
  walk_miles: async (sb, since) => {
    const { data } = await sb.from('cardio_sessions').select('distance_miles').eq('activity', 'walk').gte('date', since)
    return Math.round(((data ?? []).reduce((s: number, r: { distance_miles: number }) => s + (r.distance_miles ?? 0), 0)) * 10) / 10
  },
  walk_sessions: async (sb, since) => {
    const { count } = await sb.from('cardio_sessions').select('id', { count: 'exact', head: true }).eq('activity', 'walk').gte('date', since)
    return count ?? 0
  },
  skate_miles: async (sb, since) => {
    const { data } = await sb.from('skate_sessions').select('miles').gte('date', since)
    return Math.round(((data ?? []).reduce((s: number, r: { miles: number }) => s + (r.miles ?? 0), 0)) * 10) / 10
  },
  skate_sessions: async (sb, since) => {
    const { count } = await sb.from('skate_sessions').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  sleep_nights: async (sb, since) => {
    const { count } = await sb.from('sleep_log').select('id', { count: 'exact', head: true }).eq('is_nap', false).gte('date', since)
    return count ?? 0
  },
  sleep_avg_hours: async (sb, since) => {
    const { data } = await sb.from('sleep_log').select('hours_slept').eq('is_nap', false).gte('date', since).not('hours_slept', 'is', null)
    if (!data || data.length === 0) return 0
    const sum = data.reduce((s: number, r: { hours_slept: number }) => s + (r.hours_slept ?? 0), 0)
    return Math.round((sum / data.length) * 10) / 10
  },
  sleep_quality_nights: async (sb, since) => {
    const { count } = await sb.from('sleep_log').select('id', { count: 'exact', head: true }).eq('is_nap', false).gte('hours_slept', 7).gte('date', since)
    return count ?? 0
  },
  water_days: async (sb, since) => {
    const { data } = await sb.from('water_log').select('date').gte('date', since)
    return new Set((data ?? []).map((r: { date: string }) => r.date)).size
  },
  water_goal_days: async (sb, since) => {
    const { data } = await sb.from('water_log').select('date, oz').gte('date', since)
    if (!data || data.length === 0) return 0
    const byDate: Record<string, number> = {}
    for (const r of data as { date: string; oz: number }[]) {
      byDate[r.date] = (byDate[r.date] ?? 0) + (r.oz ?? 0)
    }
    return Object.values(byDate).filter(oz => oz >= 64).length
  },
  books_finished: async (sb, since) => {
    const { count } = await sb.from('books').select('id', { count: 'exact', head: true }).not('date_finished', 'is', null).gte('date_finished', since)
    return count ?? 0
  },
  mood_days: async (sb, since) => {
    const { count } = await sb.from('mood_log').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  mood_avg: async (sb, since) => {
    const { data } = await sb.from('mood_log').select('mood').gte('date', since).not('mood', 'is', null)
    if (!data || data.length === 0) return 0
    const sum = data.reduce((s: number, r: { mood: number }) => s + (r.mood ?? 0), 0)
    return Math.round((sum / data.length) * 10) / 10
  },
  chess_games: async (sb, since) => {
    const { count } = await sb.from('chess_games').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  chess_wins: async (sb, since) => {
    const { count } = await sb.from('chess_games').select('id', { count: 'exact', head: true }).eq('result', 'win').gte('date', since)
    return count ?? 0
  },
  disc_golf_rounds: async (sb, since) => {
    const { count } = await sb.from('disc_golf_rounds').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  fortnite_games: async (sb, since) => {
    const { count } = await sb.from('fortnite_games').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  fortnite_wins: async (sb, since) => {
    const { count } = await sb.from('fortnite_games').select('id', { count: 'exact', head: true }).eq('win', true).gte('date', since)
    return count ?? 0
  },
  fortnite_kills_total: async (sb, since) => {
    const { data } = await sb.from('fortnite_games').select('kills').gte('date', since)
    return (data ?? []).reduce((s: number, r: { kills: number }) => s + (r.kills ?? 0), 0)
  },
  golf_rounds: async (sb, since) => {
    const { count } = await sb.from('golf_rounds').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  hiking_miles: async (sb, since) => {
    const { data } = await sb.from('hiking_sessions').select('distance_miles').gte('date', since)
    return Math.round(((data ?? []).reduce((s: number, r: { distance_miles: number }) => s + (r.distance_miles ?? 0), 0)) * 10) / 10
  },
  hiking_sessions: async (sb, since) => {
    const { count } = await sb.from('hiking_sessions').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  basketball_sessions: async (sb, since) => {
    const { count } = await sb.from('basketball_sessions').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  pickleball_games: async (sb, since) => {
    const { count } = await sb.from('pickleball_games').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  pickleball_wins: async (sb, since) => {
    const { count } = await sb.from('pickleball_games').select('id', { count: 'exact', head: true }).eq('win', true).gte('date', since)
    return count ?? 0
  },
  pool_games: async (sb, since) => {
    const { count } = await sb.from('pool_games').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  pool_wins: async (sb, since) => {
    const { count } = await sb.from('pool_games').select('id', { count: 'exact', head: true }).eq('win', true).gte('date', since)
    return count ?? 0
  },
  spikeball_games: async (sb, since) => {
    const { count } = await sb.from('spikeball_games').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  spikeball_wins: async (sb, since) => {
    const { count } = await sb.from('spikeball_games').select('id', { count: 'exact', head: true }).eq('win', true).gte('date', since)
    return count ?? 0
  },
  table_tennis_games: async (sb, since) => {
    const { count } = await sb.from('table_tennis_games').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  table_tennis_wins: async (sb, since) => {
    const { count } = await sb.from('table_tennis_games').select('id', { count: 'exact', head: true }).eq('win', true).gte('date', since)
    return count ?? 0
  },
  volleyball_sessions: async (sb, since) => {
    const { count } = await sb.from('volleyball_sessions').select('id', { count: 'exact', head: true }).gte('date', since)
    return count ?? 0
  },
  volleyball_wins: async (sb, since) => {
    const { count } = await sb.from('volleyball_sessions').select('id', { count: 'exact', head: true }).eq('win', true).gte('date', since)
    return count ?? 0
  },
}
