import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CHALLENGE_TEMPLATES, PROGRESS_FNS, SECTION_DISPLAY,
  type ActivitySection, type UserStats, type ChallengeTemplate,
} from './challengeTemplates'

// ── Date helpers ──────────────────────────────────────────────────

export function startOfWeekDate(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday
  d.setDate(d.getDate() + diff)
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

export function nextMondayLabel(): string {
  const today = new Date()
  const day = today.getDay()
  const daysUntil = day === 1 ? 7 : day === 0 ? 1 : 8 - day
  if (daysUntil === 1) return 'Resets Monday'
  return `Resets in ${daysUntil} days`
}

export function daysUntilMonthEnd(): number {
  const now = new Date()
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return last.getDate() - now.getDate()
}

export function startOfYearDate(): string {
  return `${new Date().getFullYear()}-01-01`
}

export function daysUntilYearEnd(): number {
  const now = new Date()
  const yearEnd = new Date(now.getFullYear(), 11, 31)
  return Math.max(0, Math.round((yearEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
}

export function getWeekKey(): string {
  const d = new Date()
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export function getMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Reroll localStorage helpers ───────────────────────────────────

const MAX_REROLLS = 3

function rerollStorageKey(period: 'weekly' | 'monthly'): string {
  const cycleKey = period === 'weekly' ? getWeekKey() : getMonthKey()
  return `youxp-rerolls-${period}-${cycleKey}`
}

export function getRerollsRemaining(period: 'weekly' | 'monthly'): number {
  const key = rerollStorageKey(period)
  const stored = localStorage.getItem(key)
  if (stored === null) return MAX_REROLLS
  const used = parseInt(stored, 10)
  return isNaN(used) ? MAX_REROLLS : Math.max(0, MAX_REROLLS - used)
}

export function consumeReroll(period: 'weekly' | 'monthly'): boolean {
  const remaining = getRerollsRemaining(period)
  if (remaining <= 0) return false
  const key = rerollStorageKey(period)
  const stored = localStorage.getItem(key)
  const used = stored ? parseInt(stored, 10) || 0 : 0
  localStorage.setItem(key, String(used + 1))
  return true
}

// ── Seen-template helpers ─────────────────────────────────────────

const SEEN_MAX = 30

function seenStorageKey(period: 'weekly' | 'monthly'): string {
  return `youxp-seen-templates-${period}`
}

export function addSeen(period: 'weekly' | 'monthly', key: string): void {
  const seen = getSeen(period)
  const updated = [key, ...seen.filter(k => k !== key)].slice(0, SEEN_MAX)
  localStorage.setItem(seenStorageKey(period), JSON.stringify(updated))
}

export function getSeen(period: 'weekly' | 'monthly'): string[] {
  try {
    const raw = localStorage.getItem(seenStorageKey(period))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as string[]
  } catch { /* ignore */ }
  return []
}

// ── Activity detection ────────────────────────────────────────────

export async function detectActiveSections(supabase: SupabaseClient, userId: string): Promise<Set<ActivitySection>> {
  const checks: Array<[ActivitySection, () => Promise<number>]> = [
    ['lifting',      () => supabase.from('lifting_log').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['run',          () => supabase.from('cardio_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('activity', 'run').then(r => r.count ?? 0)],
    ['bike',         () => supabase.from('cardio_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('activity', 'bike').then(r => r.count ?? 0)],
    ['swim',         () => supabase.from('cardio_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('activity', 'swim').then(r => r.count ?? 0)],
    ['walk',         () => supabase.from('cardio_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('activity', 'walk').then(r => r.count ?? 0)],
    ['skate',        () => supabase.from('skate_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['sleep',        () => supabase.from('sleep_log').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['water',        () => supabase.from('water_log').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['books',        () => supabase.from('books').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('date_finished', 'is', null).then(r => r.count ?? 0)],
    ['mood',         () => supabase.from('mood_log').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['chess',        () => supabase.from('chess_games').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['disc_golf',    () => supabase.from('disc_golf_rounds').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['fortnite',     () => supabase.from('fortnite_games').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['golf',         () => supabase.from('golf_rounds').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['hiking',       () => supabase.from('hiking_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['basketball',   () => supabase.from('basketball_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['pickleball',   () => supabase.from('pickleball_games').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['pool',         () => supabase.from('pool_games').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['spikeball',    () => supabase.from('spikeball_games').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['table_tennis', () => supabase.from('table_tennis_games').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
    ['volleyball',   () => supabase.from('volleyball_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0)],
  ]

  const results = await Promise.all(checks.map(([, fn]) => fn().catch(() => 0)))
  const active = new Set<ActivitySection>()
  checks.forEach(([section], i) => { if (results[i] > 0) active.add(section) })
  return active
}

// ── Stats computation ─────────────────────────────────────────────

export async function fetchUserStats(supabase: SupabaseClient, userId: string): Promise<UserStats> {
  const [
    liftingDates, liftingSets,
    cardioAll,
    skateSessions,
    sleepLogs,
    waterLogs,
    books,
    moodLogs,
    chessGames,
    discGolfRounds,
    fortniteGames,
    golfRounds,
    hikingSessions,
    basketballSessions,
    pickleballGames,
    poolGames,
    spikeballGames,
    tableTennisGames,
    volleyballSessions,
  ] = await Promise.all([
    supabase.from('lifting_log').select('date').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('lifting_log').select('date').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('cardio_sessions').select('date, activity, distance_miles').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('skate_sessions').select('date, miles').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('sleep_log').select('date, hours_slept, is_nap').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('water_log').select('date').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('books').select('date_finished').eq('user_id', userId).not('date_finished', 'is', null).then(r => r.data ?? []),
    supabase.from('mood_log').select('date, mood').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('chess_games').select('date, result').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('disc_golf_rounds').select('date').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('fortnite_games').select('date, kills').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('golf_rounds').select('date').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('hiking_sessions').select('date, distance_miles').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('basketball_sessions').select('date').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('pickleball_games').select('date, win').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('pool_games').select('date, win').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('spikeball_games').select('date, win').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('table_tennis_games').select('date, win').eq('user_id', userId).then(r => r.data ?? []),
    supabase.from('volleyball_sessions').select('date, win').eq('user_id', userId).then(r => r.data ?? []),
  ])

  function weeksSpan(rows: { date: string }[]): number {
    if (rows.length === 0) return 1
    const dates = rows.map(r => new Date(r.date + 'T12:00:00').getTime())
    const first = Math.min(...dates)
    return Math.max(1, (Date.now() - first) / (7 * 24 * 60 * 60 * 1000))
  }

  function monthsSpan(rows: { date?: string; date_finished?: string | null }[]): number {
    if (rows.length === 0) return 1
    const dates = rows.map(r => new Date(((r.date ?? r.date_finished ?? '') + 'T12:00:00')).getTime()).filter(Boolean)
    if (dates.length === 0) return 1
    const first = Math.min(...dates)
    return Math.max(1, (Date.now() - first) / (30 * 24 * 60 * 60 * 1000))
  }

  function winRate(rows: { win: boolean }[]): number {
    if (rows.length === 0) return 0.5
    return rows.filter(r => r.win).length / rows.length
  }

  // lifting
  const liftWeeks = weeksSpan(liftingDates as { date: string }[])
  const liftDistinctDates = new Set((liftingDates as { date: string }[]).map(r => r.date)).size
  const liftAvgDays = liftDistinctDates / liftWeeks
  const liftAvgSets = (liftingSets as { date: string }[]).length / liftWeeks

  // cardio subsets
  type CardioRow = { date: string; activity: string; distance_miles: number }
  const runRows    = (cardioAll as CardioRow[]).filter(r => r.activity === 'run')
  const bikeRows   = (cardioAll as CardioRow[]).filter(r => r.activity === 'bike')
  const swimRows   = (cardioAll as CardioRow[]).filter(r => r.activity === 'swim')
  const walkRows   = (cardioAll as CardioRow[]).filter(r => r.activity === 'walk')

  const runWeeks  = weeksSpan(runRows)
  const bikeWeeks = weeksSpan(bikeRows)
  const swimWeeks = weeksSpan(swimRows)
  const walkWeeks = weeksSpan(walkRows)

  // skate
  type SkateRow = { date: string; miles: number }
  const skateWeeks = weeksSpan(skateSessions as { date: string }[])
  const skateMiles = (skateSessions as SkateRow[]).reduce((s, r) => s + (r.miles ?? 0), 0)

  // sleep
  type SleepRow = { date: string; hours_slept: number | null; is_nap: boolean }
  const sleepNights = (sleepLogs as SleepRow[]).filter(r => !r.is_nap)
  const sleepWeeks  = weeksSpan(sleepNights)
  const sleepHoursData = sleepNights.filter(r => r.hours_slept !== null)
  const avgHours = sleepHoursData.length > 0 ? sleepHoursData.reduce((s, r) => s + (r.hours_slept ?? 0), 0) / sleepHoursData.length : 7

  // water
  const waterWeeks   = weeksSpan(waterLogs as { date: string }[])
  const waterDaySet  = new Set((waterLogs as { date: string }[]).map(r => r.date)).size

  // books
  type BookRow = { date_finished: string | null }
  const booksMonths  = monthsSpan((books as BookRow[]).map(r => ({ date: r.date_finished ?? '' })))

  // mood
  type MoodRow = { date: string; mood: number | null }
  const moodWeeks   = weeksSpan(moodLogs as { date: string }[])
  const moodWithVal = (moodLogs as MoodRow[]).filter(r => r.mood !== null)
  const avgMood     = moodWithVal.length > 0 ? moodWithVal.reduce((s, r) => s + (r.mood ?? 0), 0) / moodWithVal.length : 7

  // chess
  type ChessRow = { date: string; result: string }
  const chessWeeks = weeksSpan(chessGames as { date: string }[])
  const chessWins  = (chessGames as ChessRow[]).filter(r => r.result === 'win').length

  // fortnite
  type FortniteRow = { date: string; kills: number }
  const fnWeeks = weeksSpan(fortniteGames as { date: string }[])
  const fnKills = fortniteGames.length > 0 ? (fortniteGames as FortniteRow[]).reduce((s, r) => s + (r.kills ?? 0), 0) / fortniteGames.length : 0

  // hiking
  type HikeRow = { date: string; distance_miles: number }
  const hikeMonths = monthsSpan(hikingSessions as { date: string }[])
  const hikeMiles  = (hikingSessions as HikeRow[]).reduce((s, r) => s + (r.distance_miles ?? 0), 0)

  // sport rows with win
  type WinRow = { date: string; win: boolean }

  const bbWeeks  = weeksSpan(basketballSessions as { date: string }[])
  const pbWeeks  = weeksSpan(pickleballGames as { date: string }[])
  const poolWeeks = weeksSpan(poolGames as { date: string }[])
  const spikeWeeks = weeksSpan(spikeballGames as { date: string }[])
  const ttWeeks  = weeksSpan(tableTennisGames as { date: string }[])
  const vbWeeks  = weeksSpan(volleyballSessions as { date: string }[])
  const discMonths = monthsSpan(discGolfRounds as { date: string }[])
  const golfMonths = monthsSpan(golfRounds as { date: string }[])

  return {
    lifting:      { avgDaysPerWeek: liftAvgDays, avgSetsPerWeek: liftAvgSets },
    run:          { avgMilesPerWeek: runRows.reduce((s, r) => s + (r.distance_miles ?? 0), 0) / runWeeks, avgSessionsPerWeek: runRows.length / runWeeks },
    bike:         { avgMilesPerWeek: bikeRows.reduce((s, r) => s + (r.distance_miles ?? 0), 0) / bikeWeeks, avgSessionsPerWeek: bikeRows.length / bikeWeeks },
    swim:         { avgSessionsPerWeek: swimRows.length / swimWeeks },
    walk:         { avgMilesPerWeek: walkRows.reduce((s, r) => s + (r.distance_miles ?? 0), 0) / walkWeeks, avgSessionsPerWeek: walkRows.length / walkWeeks },
    skate:        { avgMilesPerWeek: skateMiles / skateWeeks, avgSessionsPerWeek: (skateSessions as { date: string }[]).length / skateWeeks },
    sleep:        { avgHours, avgNightsPerWeek: sleepNights.length / sleepWeeks },
    water:        { avgDaysPerWeek: waterDaySet / waterWeeks },
    books:        { avgPerMonth: (books as BookRow[]).length / booksMonths },
    mood:         { avgScore: avgMood, avgDaysPerWeek: (moodLogs as { date: string }[]).length / moodWeeks },
    chess:        { avgPerWeek: (chessGames as { date: string }[]).length / chessWeeks, winRate: chessGames.length > 0 ? chessWins / chessGames.length : 0.5 },
    disc_golf:    { avgPerMonth: (discGolfRounds as { date: string }[]).length / discMonths },
    fortnite:     { avgPerWeek: (fortniteGames as { date: string }[]).length / fnWeeks, avgKills: fnKills },
    golf:         { avgPerMonth: (golfRounds as { date: string }[]).length / golfMonths },
    hiking:       { avgMilesPerMonth: hikeMiles / hikeMonths, avgSessionsPerMonth: (hikingSessions as { date: string }[]).length / hikeMonths },
    basketball:   { avgPerWeek: (basketballSessions as { date: string }[]).length / bbWeeks },
    pickleball:   { avgPerWeek: (pickleballGames as { date: string }[]).length / pbWeeks, winRate: winRate(pickleballGames as WinRow[]) },
    pool:         { avgPerWeek: (poolGames as { date: string }[]).length / poolWeeks, winRate: winRate(poolGames as WinRow[]) },
    spikeball:    { avgPerWeek: (spikeballGames as { date: string }[]).length / spikeWeeks, winRate: winRate(spikeballGames as WinRow[]) },
    table_tennis: { avgPerWeek: (tableTennisGames as { date: string }[]).length / ttWeeks, winRate: winRate(tableTennisGames as WinRow[]) },
    volleyball:   { avgPerWeek: (volleyballSessions as { date: string }[]).length / vbWeeks, winRate: winRate(volleyballSessions as WinRow[]) },
  }
}

// ── Template picker ───────────────────────────────────────────────

function pickTemplates(
  activeSections: Set<ActivitySection>,
  stats: UserStats,
  period: 'weekly' | 'monthly',
  existingTemplateKeys: Set<string>,
  totalSlots: number,
): Array<{ template: ChallengeTemplate; target: number; xp: number }> {
  const seen = getSeen(period)
  const seenSet = new Set(seen)

  // Filter by period and active section
  const eligible = CHALLENGE_TEMPLATES.filter(
    t => t.period === period && activeSections.has(t.section) && !existingTemplateKeys.has(t.key)
  )

  // Prefer unseen templates; fallback to all eligible
  const unseen = eligible.filter(t => !seenSet.has(t.key))
  const pool = unseen.length >= totalSlots ? unseen : eligible

  // Group by section
  const bySection = new Map<ActivitySection, ChallengeTemplate[]>()
  for (const t of pool) {
    const arr = bySection.get(t.section) ?? []
    arr.push(t)
    bySection.set(t.section, arr)
  }

  // Shuffle section order
  const sections = Array.from(bySection.keys())
  for (let i = sections.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[sections[i], sections[j]] = [sections[j], sections[i]]
  }

  // Round-robin pick
  const result: Array<{ template: ChallengeTemplate; target: number; xp: number }> = []
  let round = 0
  while (result.length < totalSlots) {
    let picked = false
    for (const section of sections) {
      if (result.length >= totalSlots) break
      const templates = bySection.get(section) ?? []
      if (templates.length > 0) {
        // Rotate within section each round
        const idx = round % templates.length
        const template = templates[idx]
        const target = Math.max(1, template.scaleTarget(stats))
        const xp = template.xpForTarget(target)
        result.push({ template, target, xp })
        picked = true
      }
    }
    round++
    // Safety break if no templates left
    if (!picked || round > 20) break
  }

  return result
}

// ── Main sync ─────────────────────────────────────────────────────

export async function syncUserChallenges(supabase: SupabaseClient, userId: string): Promise<void> {
  const activeSections = await detectActiveSections(supabase, userId)

  if (activeSections.size === 0) {
    localStorage.setItem('youxp-needs-tutorial', 'true')
    return
  }
  localStorage.removeItem('youxp-needs-tutorial')

  const sw = startOfWeekDate()
  const sm = startOfMonthDate()

  // Expire stale challenges
  await Promise.all([
    supabase.from('challenges').update({ status: 'expired' })
      .eq('user_id', userId).eq('tier', 'Weekly').eq('status', 'active').lt('created_at', sw + 'T00:00:00'),
    supabase.from('challenges').update({ status: 'expired' })
      .eq('user_id', userId).eq('tier', 'Monthly').eq('status', 'active').lt('created_at', sm + 'T00:00:00'),
  ])

  // Load current active challenges
  const { data: currentData } = await supabase.from('challenges')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'claimed'])
    .in('tier', ['Weekly', 'Monthly'])

  const current = (currentData ?? []) as { id: string; tier: string; notes: string | null }[]
  const activeWeekly  = current.filter(c => c.tier === 'Weekly')
  const activeMonthly = current.filter(c => c.tier === 'Monthly')

  const weeklySlots  = Math.min(10, Math.max(5, activeSections.size))
  const monthlySlots = Math.min(6, Math.max(3, Math.ceil(activeSections.size / 2)))

  const weeklyNeeded  = weeklySlots  - activeWeekly.length
  const monthlyNeeded = monthlySlots - activeMonthly.length

  if (weeklyNeeded <= 0 && monthlyNeeded <= 0) return

  const stats = await fetchUserStats(supabase, userId)

  if (weeklyNeeded > 0) {
    const usedKeys = new Set(activeWeekly.map(c => c.notes ?? ''))
    const picks = pickTemplates(activeSections, stats, 'weekly', usedKeys, weeklyNeeded)
    if (picks.length > 0) {
      await supabase.from('challenges').insert(picks.map(({ template, target, xp }) => ({
        user_id: userId,
        tier: 'Weekly',
        challenge_name: template.name(target),
        category: SECTION_DISPLAY[template.section],
        xp_reward: xp,
        status: 'active',
        auto_verified: true,
        notes: template.key,
        target: String(target),
      })))
      for (const { template } of picks) addSeen('weekly', template.key)
    }
  }

  if (monthlyNeeded > 0) {
    const usedKeys = new Set(activeMonthly.map(c => c.notes ?? ''))
    const picks = pickTemplates(activeSections, stats, 'monthly', usedKeys, monthlyNeeded)
    if (picks.length > 0) {
      await supabase.from('challenges').insert(picks.map(({ template, target, xp }) => ({
        user_id: userId,
        tier: 'Monthly',
        challenge_name: template.name(target),
        category: SECTION_DISPLAY[template.section],
        xp_reward: xp,
        status: 'active',
        auto_verified: true,
        notes: template.key,
        target: String(target),
      })))
      for (const { template } of picks) addSeen('monthly', template.key)
    }
  }
}

// ── Progress getter ───────────────────────────────────────────────

export async function getProgress(
  supabase: SupabaseClient,
  templateKey: string,
  tier: 'Weekly' | 'Monthly',
  userId: string,
): Promise<number> {
  const template = CHALLENGE_TEMPLATES.find(t => t.key === templateKey)
  if (!template) return 0
  const fn = PROGRESS_FNS[template.progressKey]
  if (!fn) return 0
  const since = tier === 'Weekly' ? startOfWeekDate() : startOfMonthDate()
  return fn(supabase, since, userId).catch(() => 0)
}

// ── Reroll ────────────────────────────────────────────────────────

export async function rerollChallenge(
  supabase: SupabaseClient,
  userId: string,
  challengeId: string,
  period: 'weekly' | 'monthly',
  currentTemplateKey: string,
): Promise<boolean> {
  if (!consumeReroll(period)) return false

  const activeSections = await detectActiveSections(supabase, userId)
  const stats = await fetchUserStats(supabase, userId)

  const currentTemplate = CHALLENGE_TEMPLATES.find(t => t.key === currentTemplateKey)
  const section = currentTemplate?.section

  // Load existing active template keys for this period
  const { data: existing } = await supabase.from('challenges')
    .select('notes')
    .eq('user_id', userId)
    .in('status', ['active', 'claimed'])
    .eq('tier', period === 'weekly' ? 'Weekly' : 'Monthly')

  const existingKeys = new Set([
    ...(existing ?? []).map((c: { notes: string | null }) => c.notes ?? ''),
    currentTemplateKey,
  ])

  // Find a template from the same section
  let candidates = section
    ? CHALLENGE_TEMPLATES.filter(
        t => t.period === period && t.section === section && !existingKeys.has(t.key)
      )
    : []

  // Fallback: allow any from same section (exhausted pool)
  if (candidates.length === 0 && section) {
    candidates = CHALLENGE_TEMPLATES.filter(
      t => t.period === period && t.section === section && t.key !== currentTemplateKey
    )
  }

  // Fallback: any template
  if (candidates.length === 0) {
    candidates = CHALLENGE_TEMPLATES.filter(t => t.period === period)
  }

  if (candidates.length === 0) return false

  const newTemplate = candidates[Math.floor(Math.random() * candidates.length)]
  const target = Math.max(1, newTemplate.scaleTarget(stats))
  const xp = newTemplate.xpForTarget(target)

  // Mark old challenge expired and insert new one
  await supabase.from('challenges').update({ status: 'expired' }).eq('id', challengeId)
  await supabase.from('challenges').insert({
    user_id: userId,
    tier: period === 'weekly' ? 'Weekly' : 'Monthly',
    challenge_name: newTemplate.name(target),
    category: SECTION_DISPLAY[newTemplate.section],
    xp_reward: xp,
    status: 'active',
    auto_verified: true,
    notes: newTemplate.key,
    target: String(target),
  })

  addSeen(period, newTemplate.key)
  return true
}

// ── Tutorial helpers ──────────────────────────────────────────────

export async function isTutorialMode(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const [lifting, mood, water, sleep, books] = await Promise.all([
    supabase.from('lifting_log').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0),
    supabase.from('mood_log').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0),
    supabase.from('water_log').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0),
    supabase.from('sleep_log').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => r.count ?? 0),
    supabase.from('books').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('date_finished', 'is', null).then(r => r.count ?? 0),
  ])
  return lifting === 0 && mood === 0 && water === 0 && sleep === 0 && books === 0
}

export interface TutorialStep {
  key: string
  name: string
  description: string
  done: boolean
  path: string
}

export async function getTutorialSteps(supabase: SupabaseClient, userId: string): Promise<TutorialStep[]> {
  const theme = localStorage.getItem('youxp-theme')
  const [lifting, mood, water, sleep] = await Promise.all([
    supabase.from('lifting_log').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => (r.count ?? 0) > 0),
    supabase.from('mood_log').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => (r.count ?? 0) > 0),
    supabase.from('water_log').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => (r.count ?? 0) > 0),
    supabase.from('sleep_log').select('id', { count: 'exact', head: true }).eq('user_id', userId).then(r => (r.count ?? 0) > 0),
  ])
  return [
    { key: 'theme',   name: 'Change your theme',          description: 'Head to Settings and pick a theme that fits your style.', done: theme !== null && theme !== 'coral',  path: '/settings' },
    { key: 'workout', name: 'Log your first workout',     description: 'Head to Lifting and log a set.',                           done: lifting,                               path: '/records'  },
    { key: 'mood',    name: 'Log your first mood',        description: 'Head to Mood and rate how you feel today.',                done: mood,                                  path: '/mood'     },
    { key: 'water',   name: 'Log your first water intake',description: 'Head to Water and log today\'s hydration.',               done: water,                                 path: '/water'    },
    { key: 'sleep',   name: 'Log your first sleep',       description: 'Head to Sleep and log last night\'s rest.',               done: sleep,                                 path: '/sleep'    },
  ]
}

// ── Boss challenges (kept for backward compat) ────────────────────

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

export async function syncBossChallenges(supabase: SupabaseClient, userId: string): Promise<void> {
  // Expire boss challenges that started before this calendar year
  const sy = startOfYearDate()
  await supabase.from('challenges')
    .update({ status: 'expired' })
    .eq('user_id', userId)
    .eq('tier', 'Boss')
    .eq('status', 'active')
    .lt('created_at', sy + 'T00:00:00')

  const { data: all } = await supabase.from('challenges').select('*').eq('user_id', userId).eq('tier', 'Boss')
  const rows = (all ?? []) as { id: string; tier: string; notes: string | null; status: string; completed_at: string | null; target: string | null; created_at: string }[]

  // Deduplicate: if multiple active boss challenges share the same key, keep the newest and expire the rest
  const activeBoss = rows.filter(c => c.tier === 'Boss' && c.status === 'active')
  const seenBossKeys = new Set<string>()
  const dupIds: string[] = []
  for (const c of [...activeBoss].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const key = c.notes ?? ''
    if (seenBossKeys.has(key)) { dupIds.push(c.id) } else { seenBossKeys.add(key) }
  }
  if (dupIds.length > 0) {
    await supabase.from('challenges').update({ status: 'expired' }).in('id', dupIds)
  }

  const activeBossKeys = new Set(
    rows.filter(c => c.tier === 'Boss' && c.status === 'active' && !dupIds.includes(c.id)).map(c => c.notes)
  )
  for (const key of Object.keys(BOSS_CONFIGS) as BossKey[]) {
    if (activeBossKeys.has(key)) continue

    const completed = rows
      .filter(c => c.tier === 'Boss' && c.notes === key && (c.status === 'completed' || c.status === 'claimed'))
      .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))

    let target: number | null = null
    if (completed.length > 0) {
      target = nextBossTarget(key, parseFloat(completed[0].target ?? '0'))
    } else {
      if (key === 'boss_skate') {
        const { data } = await supabase.from('skate_sessions').select('miles').eq('user_id', userId)
        const total = (data ?? []).reduce((s: number, r: { miles: number }) => s + r.miles, 0)
        target = Math.ceil(Math.max(total, 1) / 100) * 100
      } else {
        const lift = BOSS_CONFIGS[key].lift!
        const { data } = await supabase.from('pr_history').select('est_1rm').eq('user_id', userId).eq('lift', lift).order('est_1rm', { ascending: false }).limit(1)
        const pr = (data as { est_1rm: number }[] | null)?.[0]?.est_1rm
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

export async function getBossProgress(
  supabase: SupabaseClient,
  poolKey: string,
  targetValue: number,
  userId: string,
): Promise<{ current: number; target: number }> {
  const t = targetValue
  if (poolKey === 'boss_bench') {
    const { data } = await supabase.from('pr_history').select('est_1rm').eq('user_id', userId).eq('lift', 'Bench').order('est_1rm', { ascending: false }).limit(1)
    return { current: Math.round(((data as { est_1rm: number }[] | null)?.[0]?.est_1rm ?? 0) * 10) / 10, target: t }
  }
  if (poolKey === 'boss_squat') {
    const { data } = await supabase.from('pr_history').select('est_1rm').eq('user_id', userId).eq('lift', 'Squat').order('est_1rm', { ascending: false }).limit(1)
    return { current: Math.round(((data as { est_1rm: number }[] | null)?.[0]?.est_1rm ?? 0) * 10) / 10, target: t }
  }
  if (poolKey === 'boss_deadlift') {
    const { data } = await supabase.from('pr_history').select('est_1rm').eq('user_id', userId).eq('lift', 'Deadlift').order('est_1rm', { ascending: false }).limit(1)
    return { current: Math.round(((data as { est_1rm: number }[] | null)?.[0]?.est_1rm ?? 0) * 10) / 10, target: t }
  }
  if (poolKey === 'boss_skate') {
    const { data } = await supabase.from('skate_sessions').select('miles').eq('user_id', userId)
    const total = (data ?? []).reduce((s: number, r: { miles: number }) => s + r.miles, 0)
    return { current: Math.round(total * 10) / 10, target: t }
  }
  return { current: 0, target: t }
}
