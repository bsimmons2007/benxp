import { create } from 'zustand'
import { calculateLevel, levelProgress, fetchXPAndStats, getCachedXPData, setCachedXPData, getCachedXPTimestamp, deriveActivityFromRawRows } from '../lib/xp'
import type { AppStats, RawActivityData, ActivityEntry } from '../lib/xp'
import { supabase } from '../lib/supabase'
import { invalidateStreakCache } from '../hooks/useStreak'
import { invalidateBadgeCache } from '../hooks/useAchievements'

export type { AppStats, RawActivityData, ActivityEntry }

const LS_LEVEL_KEY = 'youxp-last-seen-level'

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
  rawRows:        RawActivityData | null
  recentActivity: ActivityEntry[]

  // Cache metadata
  lastUpdated: number | null

  // Init state
  initialized:    boolean
  _initializing:  boolean
  _refreshingXP:  boolean

  // Actions
  dismissLevelUp:          () => void
  reset:                   () => void
  init:                    () => Promise<void>
  refreshXP:               () => Promise<void>
  refreshActivity:         () => void
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
  rawRows:        null,
  recentActivity: [],
  lastUpdated:    getCachedXPTimestamp(),
  initialized:    false,
  // Set synchronously before first await so concurrent callers
  // (e.g. StrictMode double-mount) can't pass the guard while
  // the first load is still in-flight (P0-3 race condition fix)
  _initializing:  false,
  _refreshingXP:  false,

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
    rawRows:        null,
    recentActivity: [],
    lastUpdated:    null,
    initialized:    false,
    _initializing:  false,
    _refreshingXP:  false,
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
      const [userData, { totalXP, stats, rawRows }] = await Promise.all([
        fetchUser(),
        fetchXPAndStats(supabase),
      ])
      setCachedXPData({ totalXP, stats })
      const now = Date.now()

      const level    = calculateLevel(totalXP)
      const lastSeen = parseInt(localStorage.getItem(LS_LEVEL_KEY) ?? '1', 10) || 1

      set({
        totalXP,
        level,
        progress:       levelProgress(totalXP),
        loading:        false,
        initialized:    true,
        _initializing:  false,
        levelUpPending: level > lastSeen ? level : null,
        stats,
        rawRows,
        recentActivity: deriveActivityFromRawRows(rawRows),
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
    if (get()._refreshingXP) return
    set({ _refreshingXP: true })
    try {
      const { totalXP, stats, rawRows } = await fetchXPAndStats(supabase)
      setCachedXPData({ totalXP, stats })
      const level    = calculateLevel(totalXP)
      const lastSeen = parseInt(localStorage.getItem(LS_LEVEL_KEY) ?? '1', 10) || 1
      set({
        totalXP,
        level,
        progress:       levelProgress(totalXP),
        loading:        false,
        stats,
        rawRows,
        recentActivity: deriveActivityFromRawRows(rawRows),
        lastUpdated:    Date.now(),
        ...(level > lastSeen ? { levelUpPending: level } : {}),
        _refreshingXP: false,
      })
    } catch (err) {
      console.error('[useStore] refreshXP() failed:', err)
      set({ _refreshingXP: false })
    }
  },

  refreshActivity: () => {
    invalidateStreakCache()
    invalidateBadgeCache()
    const rawRows = get().rawRows
    if (rawRows) set({ recentActivity: deriveActivityFromRawRows(rawRows) })
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
