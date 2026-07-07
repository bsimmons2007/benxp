import { useEffect, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { localDateStr, today as appToday } from '../lib/utils'
import { tokensEarned, getSpentDates, recordSpend } from '../lib/streakTokens'
import { walkStreak } from '../lib/streakWalk'

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
  freezeTokens: number      // available balance after covering the current streak
  tokenSaving: boolean      // a token is currently bridging a gap in the streak
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

  const result = useMemo(() => {
    if (!initialized || !rawRows) {
      return { current: 0, longest: 0, activeToday: false, activeDays: new Set<string>(), loading: true, sleepCurrent: 0, sleepLongest: 0, gymCurrent: 0, gymLongest: 0, cardioCurrent: 0, cardioLongest: 0, freezeTokens: 0, tokenSaving: false, toCover: [] as string[] }
    }

    // App-wide 1AM day boundary — keeps streaks consistent with WeekDotStrip
    const today = appToday()

    // Per-category date sets — used both for token earning and category streaks.
    const bookDates   = rawRows.bookRows.filter(r => r.date_finished).map(r => r.date_finished!)
    const gymDates    = new Set(rawRows.liftingRows.map(r => r.date))
    const skateDates  = new Set(rawRows.skateRows.map(r => r.date))
    const gameDates   = new Set(rawRows.gameRows.map(r => r.date))
    const sleepDates  = new Set(rawRows.sleepRows.map(r => r.date))
    const moodDates   = new Set(rawRows.moodRows.map(r => r.date))
    const cardioOnly  = new Set(rawRows.cardioRows.map(r => r.date))
    const cardioDates = new Set([...rawRows.cardioRows.map(r => r.date), ...rawRows.skateRows.map(r => r.date)])

    const allDates = new Set<string>([
      ...gymDates, ...skateDates, ...gameDates, ...bookDates,
      ...sleepDates, ...moodDates, ...cardioOnly,
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
    const { long: longest } = calcStreakPair(allDates, today)

    // Freeze tokens: earned from month-by-month consistency across categories.
    const earned = tokensEarned([
      gymDates, skateDates, gameDates, new Set(bookDates),
      sleepDates, moodDates, cardioOnly,
    ])
    const spent = getSpentDates()
    const { current, freezeTokens, tokenSaving, toCover } =
      walkStreak(allDates, today, earned, spent)

    const { cur: sleepCurrent,  long: sleepLongest }   = calcStreakPair(sleepDates,  today)
    const { cur: gymCurrent,    long: gymLongest }     = calcStreakPair(gymDates,    today)
    const { cur: cardioCurrent, long: cardioLongest }  = calcStreakPair(cardioDates, today)

    return { current, longest, activeToday, activeDays: allDates, loading: false, sleepCurrent, sleepLongest, gymCurrent, gymLongest, cardioCurrent, cardioLongest, freezeTokens, tokenSaving, toCover }
  }, [rawRows, initialized])

  // Persist any token spends the streak walk made (idempotent).
  useEffect(() => {
    for (const d of result.toCover) recordSpend(d)
  }, [result.toCover])

  const { toCover: _drop, ...data } = result
  void _drop
  return data
}
