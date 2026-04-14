import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { today as appToday, localDateStr } from '../lib/utils'

export interface StreakData {
  current: number
  longest: number
  activeToday: boolean
  loading: boolean
}

let streakCache: { data: StreakData; ts: number } | null = null
const STREAK_TTL = 2 * 60 * 1000

export function invalidateStreakCache() {
  streakCache = null
}

export function useStreak(): StreakData {
  const [streak, setStreak] = useState<StreakData>(
    streakCache?.data ?? { current: 0, longest: 0, activeToday: false, loading: true }
  )

  useEffect(() => {
    if (streakCache && Date.now() - streakCache.ts < STREAK_TTL) return

    async function load() {
      const [lifting, skate, games, books, sleep, mood, cardio] = await Promise.all([
        supabase.from('lifting_log').select('date'),
        supabase.from('skate_sessions').select('date'),
        supabase.from('fortnite_games').select('date'),
        supabase.from('books').select('date_finished').not('date_finished', 'is', null),
        supabase.from('sleep_log').select('date'),
        supabase.from('mood_log').select('date'),
        supabase.from('cardio_sessions').select('date'),
      ])

      const allDates = new Set<string>([
        ...(lifting.data ?? []).map((r: { date: string }) => r.date),
        ...(skate.data ?? []).map((r: { date: string }) => r.date),
        ...(games.data ?? []).map((r: { date: string }) => r.date),
        ...(books.data ?? []).map((r: { date_finished: string }) => r.date_finished),
        ...(sleep.data ?? []).map((r: { date: string }) => r.date),
        ...(mood.data ?? []).map((r: { date: string }) => r.date),
        ...(cardio.data ?? []).map((r: { date: string }) => r.date),
      ])

      const today = appToday()
      // Subtract 1 calendar day from an app-day string (using local noon to be DST-safe)
      function prevDay(dateStr: string): string {
        const d = new Date(dateStr + 'T12:00:00')
        d.setDate(d.getDate() - 1)
        return localDateStr(d)
      }
      const yesterday = prevDay(today)

      const activeToday = allDates.has(today)

      // Current streak: walk backwards from today (if logged) or yesterday
      function walkBack(from: string): number {
        let count = 0
        let d = from
        while (allDates.has(d)) {
          count++
          d = prevDay(d)
        }
        return count
      }

      const startFrom = activeToday ? today : yesterday
      const current = allDates.has(startFrom) ? walkBack(startFrom) : 0

      // Longest streak: scan all sorted dates
      const sorted = Array.from(allDates).sort((a, b) => b.localeCompare(a))
      let longest = 0
      let run = 0
      let prev: string | null = null
      for (const d of sorted) {
        if (prev === null) {
          run = 1
        } else {
          const gap = (new Date(prev + 'T12:00:00').getTime() - new Date(d + 'T12:00:00').getTime()) / 86400000
          run = gap === 1 ? run + 1 : 1
        }
        if (run > longest) longest = run
        prev = d
      }

      const data: StreakData = { current, longest, activeToday, loading: false }
      streakCache = { data, ts: Date.now() }
      setStreak(data)
    }

    load()
  }, [])

  return streak
}
