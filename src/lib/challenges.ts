import type { SupabaseClient } from '@supabase/supabase-js'

// ── Types ────────────────────────────────────────────────────────

export interface ChallengeTemplate {
  key: string
  name: string
  category: string
  xp: number
  targetValue: number
}

// ── Challenge Pools ──────────────────────────────────────────────

export const WEEKLY_POOL: ChallengeTemplate[] = [
  { key: 'gym_3x_week',       name: 'Hit the gym 3x this week',        category: 'Workout', xp: 60,  targetValue: 3  },
  { key: 'gym_4x_week',       name: 'Hit the gym 4x this week',        category: 'Workout', xp: 90,  targetValue: 4  },
  { key: 'gym_5x_week',       name: 'Hit the gym 5x this week',        category: 'Workout', xp: 130, targetValue: 5  },
  { key: 'sets_10_week',      name: 'Log 10 sets this week',           category: 'Workout', xp: 50,  targetValue: 10 },
  { key: 'sets_15_week',      name: 'Log 15 sets this week',           category: 'Workout', xp: 75,  targetValue: 15 },
  { key: 'sets_20_week',      name: 'Log 20 sets this week',           category: 'Workout', xp: 110, targetValue: 20 },
  { key: 'skate_2x_week',     name: 'Skate 2x this week',              category: 'Skate',   xp: 50,  targetValue: 2  },
  { key: 'skate_3x_week',     name: 'Skate 3x this week',              category: 'Skate',   xp: 80,  targetValue: 3  },
  { key: 'skate_5mi_week',    name: 'Skate 5+ miles this week',        category: 'Skate',   xp: 40,  targetValue: 5  },
  { key: 'skate_10mi_week',   name: 'Skate 10+ miles this week',       category: 'Skate',   xp: 80,  targetValue: 10 },
  { key: 'skate_20mi_week',   name: 'Skate 20+ miles this week',       category: 'Skate',   xp: 150, targetValue: 20 },
  { key: 'skate_30mi_week',   name: 'Skate 30+ miles this week',       category: 'Skate',   xp: 220, targetValue: 30 },
  { key: 'book_1_week',       name: 'Finish a book this week',         category: 'Reading', xp: 150, targetValue: 1  },
  { key: 'fortnite_win_week', name: 'Win a Fortnite game this week',   category: 'Gaming',  xp: 125, targetValue: 1  },
  { key: 'sleep_5_week',      name: 'Log sleep 5 nights this week',    category: 'Sleep',   xp: 50,  targetValue: 5  },
  { key: 'sleep_7_week',      name: 'Log all 7 nights this week',      category: 'Sleep',   xp: 100, targetValue: 7  },
  { key: 'gym_bench_week',    name: 'Log a Bench session this week',   category: 'Workout', xp: 40,  targetValue: 1  },
  { key: 'gym_squat_week',    name: 'Log a Squat session this week',   category: 'Workout', xp: 40,  targetValue: 1  },
]

export const MONTHLY_POOL: ChallengeTemplate[] = [
  { key: 'gym_8x_month',          name: 'Hit the gym 8x this month',          category: 'Workout', xp: 100, targetValue: 8  },
  { key: 'gym_12x_month',         name: 'Hit the gym 12x this month',         category: 'Workout', xp: 150, targetValue: 12 },
  { key: 'gym_16x_month',         name: 'Hit the gym 16x this month',         category: 'Workout', xp: 220, targetValue: 16 },
  { key: 'sets_50_month',         name: 'Log 50 sets this month',             category: 'Workout', xp: 100, targetValue: 50 },
  { key: 'sets_80_month',         name: 'Log 80 sets this month',             category: 'Workout', xp: 175, targetValue: 80 },
  { key: 'pr_any_month',          name: 'Hit a new PR in any lift',           category: 'Workout', xp: 200, targetValue: 1  },
  { key: 'pr_bench_month',        name: 'New Bench PR this month',            category: 'Workout', xp: 150, targetValue: 1  },
  { key: 'pr_squat_month',        name: 'New Squat PR this month',            category: 'Workout', xp: 150, targetValue: 1  },
  { key: 'pr_deadlift_month',     name: 'New Deadlift PR this month',         category: 'Workout', xp: 150, targetValue: 1  },
  { key: 'skate_30mi_month',      name: 'Skate 30 miles this month',          category: 'Skate',   xp: 100, targetValue: 30 },
  { key: 'skate_50mi_month',      name: 'Skate 50 miles this month',          category: 'Skate',   xp: 200, targetValue: 50 },
  { key: 'skate_75mi_month',      name: 'Skate 75 miles this month',          category: 'Skate',   xp: 300, targetValue: 75 },
  { key: 'book_1_month',          name: 'Finish 1 book this month',           category: 'Reading', xp: 150, targetValue: 1  },
  { key: 'book_2_month',          name: 'Finish 2 books this month',          category: 'Reading', xp: 300, targetValue: 2  },
  { key: 'fortnite_win_month',    name: 'Win a Fortnite game this month',     category: 'Gaming',  xp: 125, targetValue: 1  },
  { key: 'fortnite_2wins_month',  name: 'Win 2 Fortnite games this month',    category: 'Gaming',  xp: 250, targetValue: 2  },
  { key: 'fortnite_10k_month',    name: 'Get a 10-kill game this month',      category: 'Gaming',  xp: 100, targetValue: 10 },
  { key: 'fortnite_15k_month',    name: 'Get a 15-kill game this month',      category: 'Gaming',  xp: 175, targetValue: 15 },
  { key: 'sleep_15_month',        name: 'Log sleep 15 nights this month',     category: 'Sleep',   xp: 100, targetValue: 15 },
  { key: 'sleep_20_month',        name: 'Log sleep 20 nights this month',     category: 'Sleep',   xp: 150, targetValue: 20 },
]

// ── Boss config ──────────────────────────────────────────────────

export type BossKey = 'boss_bench' | 'boss_squat' | 'boss_deadlift' | 'boss_skate'

const BOSS_CONFIGS: Record<BossKey, { displayName: string; lift: string | null; baseXP: number }> = {
  boss_bench:    { displayName: 'Bench Press', lift: 'Bench',    baseXP: 500 },
  boss_squat:    { displayName: 'Squat',       lift: 'Squat',    baseXP: 500 },
  boss_deadlift: { displayName: 'Deadlift',    lift: 'Deadlift', baseXP: 500 },
  boss_skate:    { displayName: 'Skate Miles', lift: null,       baseXP: 400 },
}

function roundToNearest5(n: number): number {
  return Math.round(n / 5) * 5
}

export function nextBossTarget(key: BossKey, currentTarget: number): number {
  if (key === 'boss_skate') return currentTarget + 100
  return roundToNearest5(currentTarget * 1.1)
}

export function bossChallengeName(key: BossKey, target: number): string {
  if (key === 'boss_skate') return `Skate ${target} total miles`
  return `${BOSS_CONFIGS[key].displayName} ${target} lbs (Est 1RM)`
}

function bossXP(key: BossKey, target: number): number {
  if (key === 'boss_skate') return (target / 100) * 400
  return Math.round((target / 150) * BOSS_CONFIGS[key].baseXP)
}

// ── Date helpers ─────────────────────────────────────────────────

function startOfWeekISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfMonthISO(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function startOfWeekDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export function startOfMonthDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ── Seeded shuffle (consistent within same week/month) ───────────

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = ((s * 1664525) + 1013904223) & 0x7fffffff
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function weekSeed(): number {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
}

function monthSeed(): number {
  const d = new Date()
  return d.getFullYear() * 100 + d.getMonth()
}

// ── Slot counts ──────────────────────────────────────────────────

const WEEKLY_SLOTS = 6
const MONTHLY_SLOTS = 6

// ── Main sync function ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncChallenges(supabase: SupabaseClient, userId: string): Promise<void> {
  const swISO = startOfWeekISO()
  const smISO = startOfMonthISO()

  // Expire stale active challenges
  await supabase.from('challenges').update({ status: 'expired' })
    .eq('user_id', userId).eq('tier', 'Weekly').eq('status', 'active').lt('created_at', swISO)
  await supabase.from('challenges').update({ status: 'expired' })
    .eq('user_id', userId).eq('tier', 'Monthly').eq('status', 'active').lt('created_at', smISO)

  // Load current state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: all } = await supabase.from('challenges').select('*').eq('user_id', userId) as { data: any[] | null }
  const rows = all ?? []

  // ── Weekly ──
  const activeWeekly = rows.filter(c => c.tier === 'Weekly' && c.status === 'active')
  const usedWeeklyKeys = new Set([
    ...activeWeekly.map(c => c.notes),
    ...rows.filter(c => c.tier === 'Weekly' && c.status === 'completed' && (c.completed_at ?? '') >= swISO).map(c => c.notes),
  ])
  const weeklyNeeded = WEEKLY_SLOTS - activeWeekly.length
  if (weeklyNeeded > 0) {
    const picks = seededShuffle(WEEKLY_POOL.filter(t => !usedWeeklyKeys.has(t.key)), weekSeed()).slice(0, weeklyNeeded)
    if (picks.length > 0) {
      await supabase.from('challenges').insert(picks.map(t => ({
        user_id: userId, tier: 'Weekly', challenge_name: t.name, category: t.category,
        xp_reward: t.xp, status: 'active', auto_verified: true, notes: t.key, target: String(t.targetValue),
      })))
    }
  }

  // ── Monthly ──
  const activeMonthly = rows.filter(c => c.tier === 'Monthly' && c.status === 'active')
  const usedMonthlyKeys = new Set([
    ...activeMonthly.map(c => c.notes),
    ...rows.filter(c => c.tier === 'Monthly' && c.status === 'completed' && (c.completed_at ?? '') >= smISO).map(c => c.notes),
  ])
  const monthlyNeeded = MONTHLY_SLOTS - activeMonthly.length
  if (monthlyNeeded > 0) {
    const picks = seededShuffle(MONTHLY_POOL.filter(t => !usedMonthlyKeys.has(t.key)), monthSeed()).slice(0, monthlyNeeded)
    if (picks.length > 0) {
      await supabase.from('challenges').insert(picks.map(t => ({
        user_id: userId, tier: 'Monthly', challenge_name: t.name, category: t.category,
        xp_reward: t.xp, status: 'active', auto_verified: true, notes: t.key, target: String(t.targetValue),
      })))
    }
  }

  // ── Boss ──
  const activeBossKeys = new Set(rows.filter(c => c.tier === 'Boss' && c.status === 'active').map(c => c.notes))
  for (const key of Object.keys(BOSS_CONFIGS) as BossKey[]) {
    if (activeBossKeys.has(key)) continue

    const completed = rows
      .filter(c => c.tier === 'Boss' && c.notes === key && c.status === 'completed')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))

    let target: number | null = null
    if (completed.length > 0) {
      target = nextBossTarget(key, parseFloat(completed[0].target ?? '0'))
    } else {
      // Generate initial target from current stats
      if (key === 'boss_skate') {
        const { data } = await supabase.from('skate_sessions').select('miles')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const total = data?.reduce((s: number, r: any) => s + r.miles, 0) ?? 0
        target = Math.ceil(Math.max(total, 1) / 100) * 100
      } else {
        const lift = BOSS_CONFIGS[key].lift!
        const { data } = await supabase.from('pr_history').select('est_1rm').eq('lift', lift).order('est_1rm', { ascending: false }).limit(1)
        const pr = data?.[0]?.est_1rm
        if (pr) target = roundToNearest5(pr * 1.1)
      }
    }

    if (target !== null) {
      await supabase.from('challenges').insert({
        user_id: userId, tier: 'Boss',
        challenge_name: bossChallengeName(key, target),
        category: BOSS_CONFIGS[key].lift ? 'Lifting' : 'Skate',
        xp_reward: bossXP(key, target), status: 'active',
        auto_verified: true, notes: key, target: String(target),
      })
    }
  }
}

// ── Auto-progress per pool key ───────────────────────────────────

export async function getAutoProgress(
  supabase: SupabaseClient,
  poolKey: string,
  targetValue: number
): Promise<{ current: number; target: number }> {
  const sw = startOfWeekDate()
  const sm = startOfMonthDate()
  const t = targetValue

  // Weekly gym days
  if (['gym_3x_week','gym_4x_week','gym_5x_week'].includes(poolKey)) {
    const { data } = await supabase.from('lifting_log').select('date').gte('date', sw)
    return { current: new Set(data?.map((r: { date: string }) => r.date)).size, target: t }
  }
  // Weekly bench/squat session
  if (poolKey === 'gym_bench_week') {
    const { count } = await supabase.from('lifting_log').select('id', { count: 'exact', head: true }).eq('lift', 'Bench').gte('date', sw)
    return { current: count ?? 0, target: t }
  }
  if (poolKey === 'gym_squat_week') {
    const { count } = await supabase.from('lifting_log').select('id', { count: 'exact', head: true }).eq('lift', 'Squat').gte('date', sw)
    return { current: count ?? 0, target: t }
  }
  // Weekly sets
  if (['sets_10_week','sets_15_week','sets_20_week'].includes(poolKey)) {
    const { count } = await supabase.from('lifting_log').select('id', { count: 'exact', head: true }).gte('date', sw)
    return { current: count ?? 0, target: t }
  }
  // Weekly skate sessions
  if (['skate_2x_week','skate_3x_week'].includes(poolKey)) {
    const { count } = await supabase.from('skate_sessions').select('id', { count: 'exact', head: true }).gte('date', sw)
    return { current: count ?? 0, target: t }
  }
  // Weekly skate miles
  if (['skate_5mi_week','skate_10mi_week','skate_20mi_week','skate_30mi_week'].includes(poolKey)) {
    const { data } = await supabase.from('skate_sessions').select('miles').gte('date', sw)
    const total = data?.reduce((s: number, r: { miles: number }) => s + r.miles, 0) ?? 0
    return { current: Math.round(total * 10) / 10, target: t }
  }
  // Weekly book
  if (poolKey === 'book_1_week') {
    const { count } = await supabase.from('books').select('id', { count: 'exact', head: true }).gte('date_finished', sw).not('date_finished', 'is', null)
    return { current: count ?? 0, target: t }
  }
  // Weekly fortnite win
  if (poolKey === 'fortnite_win_week') {
    const { count } = await supabase.from('fortnite_games').select('id', { count: 'exact', head: true }).eq('win', true).gte('date', sw)
    return { current: count ?? 0, target: t }
  }
  // Weekly sleep
  if (['sleep_5_week','sleep_7_week'].includes(poolKey)) {
    const { count } = await supabase.from('sleep_log').select('id', { count: 'exact', head: true }).gte('date', sw)
    return { current: count ?? 0, target: t }
  }

  // Monthly gym days
  if (['gym_8x_month','gym_12x_month','gym_16x_month'].includes(poolKey)) {
    const { data } = await supabase.from('lifting_log').select('date').gte('date', sm)
    return { current: new Set(data?.map((r: { date: string }) => r.date)).size, target: t }
  }
  // Monthly sets
  if (['sets_50_month','sets_80_month'].includes(poolKey)) {
    const { count } = await supabase.from('lifting_log').select('id', { count: 'exact', head: true }).gte('date', sm)
    return { current: count ?? 0, target: t }
  }
  // Monthly PRs
  if (poolKey === 'pr_any_month') {
    const { count } = await supabase.from('pr_history').select('id', { count: 'exact', head: true }).gte('date', sm)
    return { current: count ?? 0, target: t }
  }
  if (poolKey === 'pr_bench_month') {
    const { count } = await supabase.from('pr_history').select('id', { count: 'exact', head: true }).eq('lift', 'Bench').gte('date', sm)
    return { current: count ?? 0, target: t }
  }
  if (poolKey === 'pr_squat_month') {
    const { count } = await supabase.from('pr_history').select('id', { count: 'exact', head: true }).eq('lift', 'Squat').gte('date', sm)
    return { current: count ?? 0, target: t }
  }
  if (poolKey === 'pr_deadlift_month') {
    const { count } = await supabase.from('pr_history').select('id', { count: 'exact', head: true }).eq('lift', 'Deadlift').gte('date', sm)
    return { current: count ?? 0, target: t }
  }
  // Monthly skate miles
  if (['skate_30mi_month','skate_50mi_month','skate_75mi_month'].includes(poolKey)) {
    const { data } = await supabase.from('skate_sessions').select('miles').gte('date', sm)
    const total = data?.reduce((s: number, r: { miles: number }) => s + r.miles, 0) ?? 0
    return { current: Math.round(total * 10) / 10, target: t }
  }
  // Monthly books
  if (['book_1_month','book_2_month'].includes(poolKey)) {
    const { count } = await supabase.from('books').select('id', { count: 'exact', head: true }).gte('date_finished', sm).not('date_finished', 'is', null)
    return { current: count ?? 0, target: t }
  }
  // Monthly fortnite wins
  if (['fortnite_win_month','fortnite_2wins_month'].includes(poolKey)) {
    const { count } = await supabase.from('fortnite_games').select('id', { count: 'exact', head: true }).eq('win', true).gte('date', sm)
    return { current: count ?? 0, target: t }
  }
  // Monthly fortnite kills
  if (['fortnite_10k_month','fortnite_15k_month'].includes(poolKey)) {
    const { data } = await supabase.from('fortnite_games').select('kills').gte('date', sm).order('kills', { ascending: false }).limit(1)
    return { current: data?.[0]?.kills ?? 0, target: t }
  }
  // Monthly sleep
  if (['sleep_15_month','sleep_20_month'].includes(poolKey)) {
    const { count } = await supabase.from('sleep_log').select('id', { count: 'exact', head: true }).gte('date', sm)
    return { current: count ?? 0, target: t }
  }

  // Boss
  if (poolKey === 'boss_bench') {
    const { data } = await supabase.from('pr_history').select('est_1rm').eq('lift', 'Bench').order('est_1rm', { ascending: false }).limit(1)
    return { current: Math.round((data?.[0]?.est_1rm ?? 0) * 10) / 10, target: t }
  }
  if (poolKey === 'boss_squat') {
    const { data } = await supabase.from('pr_history').select('est_1rm').eq('lift', 'Squat').order('est_1rm', { ascending: false }).limit(1)
    return { current: Math.round((data?.[0]?.est_1rm ?? 0) * 10) / 10, target: t }
  }
  if (poolKey === 'boss_deadlift') {
    const { data } = await supabase.from('pr_history').select('est_1rm').eq('lift', 'Deadlift').order('est_1rm', { ascending: false }).limit(1)
    return { current: Math.round((data?.[0]?.est_1rm ?? 0) * 10) / 10, target: t }
  }
  if (poolKey === 'boss_skate') {
    const { data } = await supabase.from('skate_sessions').select('miles')
    const total = data?.reduce((s: number, r: { miles: number }) => s + r.miles, 0) ?? 0
    return { current: Math.round(total * 10) / 10, target: t }
  }

  return { current: 0, target: t }
}
