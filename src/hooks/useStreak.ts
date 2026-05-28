import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { today as appToday, localDateStr } from '../lib/utils'

export interface StreakData {
  current: number
  longest: number
  activeToday: boolean
  activeDays: Set<string>
  loading: boolean
  sleepCurrent: number
  sleepLongest: number
  gymCurrent: number
  gymLongest: number
  cardioCurrent: number
  cardioLongest: number
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return localDateStr(d)
}

function calcStreakPair(dates: Set<string>, todayStr: string): { cur: number; long: number } {
  const activeToday = dates.has(todayStr)
  const start = activeToday ? todayStr : prevDay(todayStr)
  let cur = 0
  if (dates.has(start)) {
    let d = start
    while (dates.has(d)) { cur++; d = prevDay(d) }
  }
  const sorted = Array.from(dates).sort((a, b) => b.localeCompare(a))
  let long = 0; let run = 0; let prev: string | null = null
  for (const d of sorted) {
    if (prev === null) { run = 1 }
    else {
      const gap = (new Date(prev + 'T12:00:00').getTime() - new Date(d + 'T12:00:00').getTime()) / 86400000
      run = gap === 1 ? run + 1 : 1
    }
    if (run > long) long = run
    prev = d
  }
  return { cur, long }
}

export function useStreak(): StreakData {
  const rawRows     = useStore(s => s.rawRows)
  const initialized = useStore(s => s.initialized)

  return useMemo(() => {
    if (!initialized || !rawRows) {
      return { current: 0, longest: 0, activeToday: false, activeDays: new Set<string>(), loading: true, sleepCurrent: 0, sleepLongest: 0, gymCurrent: 0, gymLongest: 0, cardioCurrent: 0, cardioLongest: 0 }
    }

    const today = appToday()

    const allDates = new Set<string>([
      ...rawRows.liftingRows.map(r => r.date),
      ...rawRows.skateRows.map(r => r.date),
      ...rawRows.gameRows.map(r => r.date),
      ...rawRows.bookRows.filter(r => r.date_finished).map(r => r.date_finished!),
      ...rawRows.sleepRows.map(r => r.date),
      ...rawRows.moodRows.map(r => r.date),
      ...rawRows.cardioRows.map(r => r.date),
      ...rawRows.bbRows.map(r => r.date),
      ...rawRows.pbRows.map(r => r.date),
      ...rawRows.golfRows.map(r => r.date),
      ...rawRows.dgRows.map(r => r.date),
      ...rawRows.hikeRows.map(r => r.date),
      ...rawRows.ttRows.map(r => r.date),
      ...rawRows.chessRows.map(r => r.date),
      ...rawRows.poolRows.map(r => r.date),
      ...rawRows.vbRows.map(r => r.date),
      ...rawRows.sbRows.map(r => r.date),
    ])

    const activeToday = allDates.has(today)
    const startFrom   = activeToday ? today : prevDay(today)
    let current = 0
    if (allDates.has(startFrom)) {
      let d = startFrom
      while (allDates.has(d)) { current++; d = prevDay(d) }
    }

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

    const sleepDates   = new Set(rawRows.sleepRows.map(r => r.date))
    const gymDates     = new Set(rawRows.liftingRows.map(r => r.date))
    const cardioDates  = new Set([...rawRows.cardioRows.map(r => r.date), ...rawRows.skateRows.map(r => r.date)])

    const { cur: sleepCurrent,  long: sleepLongest }   = calcStreakPair(sleepDates,  today)
    const { cur: gymCurrent,    long: gymLongest }     = calcStreakPair(gymDates,    today)
    const { cur: cardioCurrent, long: cardioLongest }  = calcStreakPair(cardioDates, today)

    return { current, longest, activeToday, activeDays: allDates, loading: false, sleepCurrent, sleepLongest, gymCurrent, gymLongest, cardioCurrent, cardioLongest }
  }, [rawRows, initialized])
}
