import { create } from 'zustand'
import { calculateLevel, levelProgress, fetchXPAndStats } from '../lib/xp'
import type { AppStats } from '../lib/xp'
import { supabase } from '../lib/supabase'
import { invalidateStreakCache } from '../hooks/useStreak'

export type { AppStats }

const LS_LEVEL_KEY = 'benxp-last-seen-level'

export interface ActivityEntry {
  type: string
  label: string
  date: string
  icon: string
}

async function fetchActivity(): Promise<ActivityEntry[]> {
  const [lifting, skate, books, games] = await Promise.all([
    supabase.from('lifting_log').select('date, lift, weight, reps').order('created_at', { ascending: false }).limit(3),
    supabase.from('skate_sessions').select('date, miles').order('created_at', { ascending: false }).limit(2),
    supabase.from('books').select('date_finished, title').not('date_finished', 'is', null).order('created_at', { ascending: false }).limit(2),
    supabase.from('fortnite_games').select('date, kills, win').order('created_at', { ascending: false }).limit(2),
  ])

  const entries: ActivityEntry[] = [
    ...(lifting.data ?? []).map((r: { date: string; lift: string; weight: number; reps: number }) => ({
      type: 'lift', label: `${r.lift} ${r.weight ? `${r.weight}lbs` : ''} ×${r.reps}`, date: r.date, icon: '🏋️',
    })),
    ...(skate.data ?? []).map((r: { date: string; miles: number }) => ({
      type: 'skate', label: `${r.miles} miles`, date: r.date, icon: '🛼',
    })),
    ...(books.data ?? []).map((r: { date_finished: string; title: string }) => ({
      type: 'book', label: r.title, date: r.date_finished, icon: '📚',
    })),
    ...(games.data ?? []).map((r: { date: string; kills: number; win: boolean }) => ({
      type: 'fortnite', label: `${r.kills} kills${r.win ? ' — WIN' : ''}`, date: r.date, icon: '🎮',
    })),
  ]
  entries.sort((a, b) => b.date.localeCompare(a.date))
  return entries.slice(0, 5)
}

async function fetchUser(): Promise<{ userName: string; avatarUrl: string | null }> {
  const { data: { user } } = await supabase.auth.getUser()
  return {
    userName:  user?.user_metadata?.name      ?? '',
    avatarUrl: user?.user_metadata?.avatar_url ?? null,
  }
}

const DEFAULT_STATS: AppStats = {
  benchPR: null, squatPR: null, deadliftPR: null,
  totalMiles: 0, books2026: 0, winCount: 0,
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

  // Init state
  initialized: boolean

  // Actions
  dismissLevelUp:  () => void
  reset:           () => void            // wipe state so next init() re-fetches for new user
  init:            () => Promise<void>   // full load — called once on boot
  refreshXP:       () => Promise<void>   // XP + stats — after any logging
  refreshActivity: () => Promise<void>   // after logging anything
  refreshUser:     () => Promise<void>   // after updating profile
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
  initialized:    false,

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
    initialized:    false,
  }),

  /** Full cold-start load — 7 + 4 + 1 = 12 queries in parallel, called once. */
  init: async () => {
    if (get().initialized) return

    const [{ totalXP, stats }, userData, recentActivity] = await Promise.all([
      fetchXPAndStats(supabase),
      fetchUser(),
      fetchActivity(),
    ])

    const level    = calculateLevel(totalXP)
    const lastSeen = parseInt(localStorage.getItem(LS_LEVEL_KEY) ?? '1', 10)

    set({
      totalXP,
      level,
      progress:       levelProgress(totalXP),
      loading:        false,
      initialized:    true,
      levelUpPending: level > lastSeen ? level : null,
      stats,
      recentActivity,
      ...userData,
    })
  },

  /** XP + stats refresh — called after logging any activity. */
  refreshXP: async () => {
    const { totalXP, stats } = await fetchXPAndStats(supabase)
    const level    = calculateLevel(totalXP)
    const lastSeen = parseInt(localStorage.getItem(LS_LEVEL_KEY) ?? '1', 10)
    set({
      totalXP,
      level,
      progress: levelProgress(totalXP),
      loading:  false,
      stats,
      ...(level > lastSeen ? { levelUpPending: level } : {}),
    })
  },

  refreshActivity: async () => {
    invalidateStreakCache()
    const recentActivity = await fetchActivity()
    set({ recentActivity })
  },

  refreshUser: async () => {
    const userData = await fetchUser()
    set(userData)
  },
}))
