import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { today as appToday, localDateStr } from '../lib/utils'

export interface StreakData {
  current: number
  longest: number
  activeToday: boolean
  loading: boolean
  sleepCurrent: number
  sleepLongest: number
  gymCurrent: number
  gymLongest: number
  cardioCurrent: number
  cardioLongest: number
}

let streakCache: { data: StreakData; ts: number } | null = null
const STREAK_TTL = 5 * 60 * 1000

export function invalidateStreakCache() {
  streakCache = null
}

export function useStreak(): StreakData {
  const [streak, setStreak] = useState<StreakData>(
    streakCache?.data ?? { current: 0, longest: 0, activeToday: false, loading: true, sleepCurrent: 0, sleepLongest: 0, gymCurrent: 0, gymLongest: 0, cardioCurrent: 0, cardioLongest: 0 }
  )

  useEffect(() => {
    if (streakCache && Date.now() - streakCache.ts < STREAK_TTL) return

    let cancelled = false

    async function load() {
      const [
        lifting, skate, games, books, sleep, mood, cardio,
        basketball, pickleball, golf, discGolf, hiking,
        tableTennis, chess, pool, volleyball, spikeball,
      ] = await Promise.all([
        supabase.from('lifting_log').select('date'),
        supabase.from('skate_sessions').select('date'),
        supabase.from('fortnite_games').select('date'),
        supabase.from('books').select('date_finished').not('date_finished', 'is', null),
        supabase.from('sleep_log').select('date'),
        supabase.from('mood_log').select('date'),
        supabase.from('cardio_sessions').select('date'),
        supabase.from('basketball_sessions').select('date'),
        supabase.from('pickleball_games').select('date'),
        supabase.from('golf_rounds').select('date'),
        supabase.from('disc_golf_rounds').select('date'),
        supabase.from('hiking_sessions').select('date'),
        supabase.from('table_tennis_games').select('date'),
        supabase.from('chess_games').select('date'),
        supabase.from('pool_games').select('date'),
        supabase.from('volleyball_sessions').select('date'),
        supabase.from('spikeball_games').select('date'),
      ])

      if (cancelled) return

      const allDates = new Set<string>([
        ...(lifting.data ?? []).map((r: { date: string }) => r.date),
        ...(skate.data ?? []).map((r: { date: string }) => r.date),
        ...(games.data ?? []).map((r: { date: string }) => r.date),
        ...(books.data ?? []).map((r: { date_finished: string }) => r.date_finished),
        ...(sleep.data ?? []).map((r: { date: string }) => r.date),
        ...(mood.data ?? []).map((r: { date: string }) => r.date),
        ...(cardio.data ?? []).map((r: { date: string }) => r.date),
        ...(basketball.data ?? []).map((r: { date: string }) => r.date),
        ...(pickleball.data ?? []).map((r: { date: string }) => r.date),
        ...(golf.data ?? []).map((r: { date: string }) => r.date),
        ...(discGolf.data ?? []).map((r: { date: string }) => r.date),
        ...(hiking.data ?? []).map((r: { date: string }) => r.date),
        ...(tableTennis.data ?? []).map((r: { date: string }) => r.date),
        ...(chess.data ?? []).map((r: { date: string }) => r.date),
        ...(pool.data ?? []).map((r: { date: string }) => r.date),
        ...(volleyball.data ?? []).map((r: { date: string }) => r.date),
        ...(spikeball.data ?? []).map((r: { date: string }) => r.date),
      ])

      const today = appToday()
      function prevDay(dateStr: string): string {
        const d = new Date(dateStr + 'T12:00:00')
        d.setDate(d.getDate() - 1)
        return localDateStr(d)
      }

      const activeToday = allDates.has(today)

      function walkBack(from: string): number {
        let count = 0; let d = from
        while (allDates.has(d)) { count++; d = prevDay(d) }
        return count
      }

      const startFrom = activeToday ? today : prevDay(today)
      const current = allDates.has(startFrom) ? walkBack(startFrom) : 0

      const sorted = Array.from(allDates).sort((a, b) => b.localeCompare(a))
      let longest = 0; let run = 0; let prev: string | null = null
      for (const d of sorted) {
        if (prev === null) { run = 1 }
        else {
          const gap = (new Date(prev + 'T12:00:00').getTime() - new Date(d + 'T12:00:00').getTime()) / 86400000
          run = gap === 1 ? run + 1 : 1
        }
        if (run > longest) longest = run
        prev = d
      }

      function calcStreakPair(dates: Set<string>): { cur: number; long: number } {
        const s = Array.from(dates).sort((a, b) => b.localeCompare(a))
        const activeT = dates.has(today)
        const start = activeT ? today : prevDay(today)
        let cur = 0
        if (dates.has(start)) {
          let d = start
          while (dates.has(d)) { cur++; d = prevDay(d) }
        }
        let long = 0; let r = 0; let p: string | null = null
        for (const d of s) {
          if (p === null) { r = 1 }
          else {
            const gap = (new Date(p + 'T12:00:00').getTime() - new Date(d + 'T12:00:00').getTime()) / 86400000
            r = gap === 1 ? r + 1 : 1
          }
          if (r > long) long = r
          p = d
        }
        return { cur, long }
      }

      const sleepDates = new Set<string>((sleep.data ?? []).map((r: { date: string }) => r.date))
      const { cur: sleepCurrent, long: sleepLongest } = calcStreakPair(sleepDates)

      const gymDates = new Set<string>((lifting.data ?? []).map((r: { date: string }) => r.date))
      const { cur: gymCurrent, long: gymLongest } = calcStreakPair(gymDates)

      const cardioDates = new Set<string>([
        ...(cardio.data ?? []).map((r: { date: string }) => r.date),
        ...(skate.data ?? []).map((r: { date: string }) => r.date),
      ])
      const { cur: cardioCurrent, long: cardioLongest } = calcStreakPair(cardioDates)

      const data: StreakData = { current, longest, activeToday, loading: false, sleepCurrent, sleepLongest, gymCurrent, gymLongest, cardioCurrent, cardioLongest }
      streakCache = { data, ts: Date.now() }
      setStreak(data)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return streak
}
