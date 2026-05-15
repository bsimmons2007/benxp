import { create } from 'zustand'
import { calculateLevel, levelProgress, fetchXPAndStats, getCachedXPData, setCachedXPData, getCachedXPTimestamp } from '../lib/xp'
import type { AppStats } from '../lib/xp'
import { supabase } from '../lib/supabase'
import { invalidateStreakCache } from '../hooks/useStreak'
import { invalidateBadgeCache } from '../hooks/useAchievements'

export type { AppStats }

const LS_LEVEL_KEY = 'youxp-last-seen-level'

export interface ActivityEntry {
  type: string
  label: string
  date: string
  icon: string
}

async function fetchActivity(): Promise<ActivityEntry[]> {
  const [
    lifting, skate, books, games,
    basketball, pickleball, golf, discGolf, hiking,
    tableTennis, chess, pool, volleyball, spikeball,
  ] = await Promise.all([
    supabase.from('lifting_log').select('date, lift, weight, reps').order('created_at', { ascending: false }).limit(3),
    supabase.from('skate_sessions').select('date, miles').order('created_at', { ascending: false }).limit(2),
    supabase.from('books').select('date_finished, title').not('date_finished', 'is', null).order('created_at', { ascending: false }).limit(2),
    supabase.from('fortnite_games').select('date, kills, win').order('created_at', { ascending: false }).limit(2),
    supabase.from('basketball_sessions').select('date, points').order('created_at', { ascending: false }).limit(2),
    supabase.from('pickleball_games').select('date, win, my_score, opp_score').order('created_at', { ascending: false }).limit(2),
    supabase.from('golf_rounds').select('date, course, score, par').order('created_at', { ascending: false }).limit(2),
    supabase.from('disc_golf_rounds').select('date, course, score, par').order('created_at', { ascending: false }).limit(2),
    supabase.from('hiking_sessions').select('date, trail, distance_miles').order('created_at', { ascending: false }).limit(2),
    supabase.from('table_tennis_games').select('date, win').order('created_at', { ascending: false }).limit(2),
    supabase.from('chess_games').select('date, result, rating_after').order('created_at', { ascending: false }).limit(2),
    supabase.from('pool_games').select('date, win, game_type').order('created_at', { ascending: false }).limit(2),
    supabase.from('volleyball_sessions').select('date, win, format').order('created_at', { ascending: false }).limit(2),
    supabase.from('spikeball_games').select('date, win').order('created_at', { ascending: false }).limit(2),
  ])

  const entries: ActivityEntry[] = [
    ...(lifting.data ?? []).map((r: { date: string; lift: string; weight: number; reps: number }) => ({
      type: 'lift', label: `${r.lift} ${r.weight ? `${r.weight}lbs` : ''} ×${r.reps}`, date: r.date, icon: 'lift',
    })),
    ...(skate.data ?? []).map((r: { date: string; miles: number }) => ({
      type: 'skate', label: `Skate — ${r.miles} mi`, date: r.date, icon: 'skate',
    })),
    ...(books.data ?? []).map((r: { date_finished: string; title: string }) => ({
      type: 'book', label: r.title, date: r.date_finished, icon: 'book',
    })),
    ...(games.data ?? []).map((r: { date: string; kills: number; win: boolean }) => ({
      type: 'fortnite', label: `Fortnite — ${r.kills} kills${r.win ? ' · WIN' : ''}`, date: r.date, icon: 'game',
    })),
    ...(basketball.data ?? []).map((r: { date: string; points: number }) => ({
      type: 'basketball', label: `Hoops — ${r.points} pts`, date: r.date, icon: 'basketball',
    })),
    ...(pickleball.data ?? []).map((r: { date: string; win: boolean; my_score: number | null; opp_score: number | null }) => ({
      type: 'pickleball',
      label: `Pickleball — ${r.my_score != null && r.opp_score != null ? `${r.my_score}–${r.opp_score}` : r.win ? 'Win' : 'Loss'}`,
      date: r.date, icon: 'pickleball',
    })),
    ...(golf.data ?? []).map((r: { date: string; course: string; score: number; par: number }) => {
      const vp = r.score - r.par; const vpStr = vp === 0 ? 'E' : vp > 0 ? `+${vp}` : String(vp)
      return { type: 'golf', label: `Golf — ${r.course} (${vpStr})`, date: r.date, icon: 'golf' }
    }),
    ...(discGolf.data ?? []).map((r: { date: string; course: string; score: number; par: number }) => {
      const vp = r.score - r.par; const vpStr = vp === 0 ? 'E' : vp > 0 ? `+${vp}` : String(vp)
      return { type: 'disc_golf', label: `Disc Golf — ${r.course} (${vpStr})`, date: r.date, icon: 'disc_golf' }
    }),
    ...(hiking.data ?? []).map((r: { date: string; trail: string; distance_miles: number }) => ({
      type: 'hiking', label: `Hike — ${r.trail} (${r.distance_miles} mi)`, date: r.date, icon: 'hiking',
    })),
    ...(tableTennis.data ?? []).map((r: { date: string; win: boolean }) => ({
      type: 'table_tennis', label: `Table Tennis — ${r.win ? 'Win' : 'Loss'}`, date: r.date, icon: 'table_tennis',
    })),
    ...(chess.data ?? []).map((r: { date: string; result: string; rating_after: number | null }) => ({
      type: 'chess',
      label: `Chess — ${r.result.charAt(0).toUpperCase() + r.result.slice(1)}${r.rating_after ? ` (${r.rating_after})` : ''}`,
      date: r.date, icon: 'chess',
    })),
    ...(pool.data ?? []).map((r: { date: string; win: boolean; game_type: string }) => ({
      type: 'pool', label: `Pool — ${r.game_type} · ${r.win ? 'Win' : 'Loss'}`, date: r.date, icon: 'pool',
    })),
    ...(volleyball.data ?? []).map((r: { date: string; win: boolean; format: string }) => ({
      type: 'volleyball', label: `Volleyball — ${r.format} · ${r.win ? 'Win' : 'Loss'}`, date: r.date, icon: 'volleyball',
    })),
    ...(spikeball.data ?? []).map((r: { date: string; win: boolean }) => ({
      type: 'spikeball', label: `Spikeball — ${r.win ? 'Win' : 'Loss'}`, date: r.date, icon: 'spikeball',
    })),
  ]
  entries.sort((a, b) => b.date.localeCompare(a.date))
  return entries.slice(0, 8)
}

async function fetchUser(): Promise<{ userName: string; avatarUrl: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  return {
    userName:  user?.user_metadata?.name      ?? '',
    avatarUrl: user?.user_metadata?.avatar_url ?? null,
  }
}

const DEFAULT_STATS: AppStats = {
  benchPR: null, squatPR: null, deadliftPR: null, ohpPR: null,
  totalSets: 0, cardioMiles: 0, runMiles: 0, hikeMiles: 0,
  totalMiles: 0, booksThisYear: 0,
  winCount: 0, fnGamesTotal: 0, fnKillsAvg: null,
  basketballGames: 0, pickleballGames: 0, golfRounds: 0,
  discGolfRounds: 0, chessGames: 0, poolGames: 0,
  sleepAvg7: null, moodAvg30: null, waterOzToday: 0,
  latestWeight: null, latestBodyFat: null,
}

interface AppState {
  // XP / level
  totalXP:        number
  level:          number
  progress:       number
  loading:        boolean
  levelUpPending: number | null

  // User identity
  userName:  string
  avatarUrl: string | null

  // Shared data
  stats:          AppStats
  recentActivity: ActivityEntry[]

  // Cache metadata
  lastUpdated: number | null

  // Init state
  initialized:   boolean
  _initializing: boolean

  // Actions
  dismissLevelUp:          () => void
  reset:                   () => void
  init:                    () => Promise<void>
  refreshXP:               () => Promise<void>
  refreshActivity:         () => Promise<void>
  refreshUser:             () => Promise<void>
  addOptimisticActivity:   (entry: ActivityEntry) => void
}

export const useStore = create<AppState>((set, get) => ({
  totalXP:        0,
  level:          1,
  progress:       0,
  loading:        true,
  levelUpPending: null,
  userName:       '',
  avatarUrl:      null,
  stats:          DEFAULT_STATS,
  recentActivity: [],
  lastUpdated:    getCachedXPTimestamp(),
  initialized:    false,
  // Set synchronously before first await so concurrent callers
  // (e.g. StrictMode double-mount) can't pass the guard while
  // the first load is still in-flight (P0-3 race condition fix)
  _initializing:  false,

  dismissLevelUp: () => {
    localStorage.setItem(LS_LEVEL_KEY, String(get().level))
    set({ levelUpPending: null })
  },

  reset: () => set({
    totalXP:        0,
    level:          1,
    progress:       0,
    loading:        true,
    levelUpPending: null,
    userName:       '',
    avatarUrl:      null,
    stats:          DEFAULT_STATS,
    recentActivity: [],
    lastUpdated:    null,
    initialized:    false,
    _initializing:  false,
  }),

  /** Full cold-start load — called once on boot. */
  init: async () => {
    // Guard: bail if already done OR already in-flight (P0-3 race condition)
    const { initialized, _initializing } = get()
    if (initialized || _initializing) return
    set({ _initializing: true })  // synchronous — blocks any concurrent caller

    // Show stale cache immediately so the UI isn't blank while fetching
    const cached = getCachedXPData()
    if (cached) {
      const cachedLevel = calculateLevel(cached.totalXP)
      set({
        totalXP:  cached.totalXP,
        level:    cachedLevel,
        progress: levelProgress(cached.totalXP),
        stats:    cached.stats,
        loading:  false,
      })
    }

    try {
      const [{ totalXP, stats }, userData, recentActivity] = await Promise.all([
        fetchXPAndStats(supabase),
        fetchUser(),
        fetchActivity(),
      ])
      setCachedXPData({ totalXP, stats })
      const now = Date.now()

      const level    = calculateLevel(totalXP)
      const lastSeen = parseInt(localStorage.getItem(LS_LEVEL_KEY) ?? '1', 10)

      set({
        totalXP,
        level,
        progress:       levelProgress(totalXP),
        loading:        false,
        initialized:    true,
        _initializing:  false,
        levelUpPending: level > lastSeen ? level : null,
        stats,
        recentActivity,
        lastUpdated:    now,
        ...userData,
      })
    } catch (err) {
      console.error('[useStore] init() failed:', err)
      // Reset initializing flag so a retry is possible (e.g. on reconnect)
      set({ loading: false, _initializing: false })
    }
  },

  /** XP + stats refresh — called after logging any activity. */
  refreshXP: async () => {
    try {
      const { totalXP, stats } = await fetchXPAndStats(supabase)
      setCachedXPData({ totalXP, stats })
      const level    = calculateLevel(totalXP)
      const lastSeen = parseInt(localStorage.getItem(LS_LEVEL_KEY) ?? '1', 10)
      set({
        totalXP,
        level,
        progress:    levelProgress(totalXP),
        loading:     false,
        stats,
        lastUpdated: Date.now(),
        ...(level > lastSeen ? { levelUpPending: level } : {}),
      })
    } catch (err) {
      console.error('[useStore] refreshXP() failed:', err)
    }
  },

  refreshActivity: async () => {
    invalidateStreakCache()
    invalidateBadgeCache()
    const recentActivity = await fetchActivity()
    set({ recentActivity })
  },

  addOptimisticActivity: (entry: ActivityEntry) => {
    const prev = get().recentActivity
    set({ recentActivity: [entry, ...prev].slice(0, 20) })
  },

  refreshUser: async () => {
    const userData = await fetchUser()
    set(userData)
  },
}))
