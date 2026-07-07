import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { localDateStr } from '../lib/utils'

export interface WellnessScore {
  total:     number   // 0-100
  sleep:     number   // 0-35
  activity:  number   // 0-25
  mood:      number   // 0-20
  water:     number   // 0-10
  nutrition: number   // 0-10
  loading:   boolean
  hasSomeData: boolean
  error:     string | null
}

function weekStartStr(): string {
  const now = new Date()
  const dow = now.getDay()
  const monOff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(now)
  monday.setDate(now.getDate() + monOff)
  return localDateStr(monday)
}

export function useWellnessScore(): WellnessScore {
  const rawRows     = useStore(s => s.rawRows)
  const initialized = useStore(s => s.initialized)

  return useMemo(() => {
    if (!initialized || !rawRows) {
      return { total: 0, sleep: 0, activity: 0, mood: 0, water: 0, nutrition: 0, loading: true, hasSomeData: false, error: null }
    }

    const weekStart = weekStartStr()

    const sleepRows = rawRows.sleepRows.filter(r => r.date >= weekStart)
    const liftRows  = rawRows.liftingRows.filter(r => r.date >= weekStart)
    const moodRows  = rawRows.moodRows.filter(r => r.date >= weekStart)
    const waterRows = rawRows.waterRows.filter(r => r.date >= weekStart)
    const mealRows  = rawRows.mealRows.filter(r => r.date >= weekStart)

    const hasSomeData = sleepRows.length > 0 || liftRows.length > 0 || moodRows.length > 0 || waterRows.length > 0 || mealRows.length > 0

    const sleepAvg = sleepRows.length
      ? sleepRows.reduce((s, r) => s + (r.hours_slept ?? 0), 0) / sleepRows.length
      : 0
    const sleepScore = Math.min(Math.round((sleepAvg / 8) * 35), 35)

    const gymDays = new Set(liftRows.map(r => r.date)).size
    const activityScore = Math.min(Math.round((gymDays / 5) * 25), 25)

    const moodAvg = moodRows.length
      ? moodRows.reduce((s, r) => s + (r.mood ?? 0), 0) / moodRows.length
      : 0
    const moodScore = Math.min(Math.round((moodAvg / 10) * 20), 20)

    // Group by day - multiple logs per day must sum toward the 64oz goal, not dilute the average
    const ozByDay: Record<string, number> = {}
    for (const r of waterRows) ozByDay[r.date] = (ozByDay[r.date] ?? 0) + (r.oz ?? 0)
    const waterDays = Object.values(ozByDay)
    const waterAvg = waterDays.length
      ? waterDays.reduce((s, oz) => s + oz, 0) / waterDays.length
      : 0
    const waterScore = Math.min(Math.round((waterAvg / 64) * 10), 10)

    // Nutrition: half credit for the fraction of the last 7 days with >=1 meal
    // logged, half credit for the fraction of days (out of 3 needed) that hit
    // a "full day" of 3+ meals — full 10 only if every tracked day is a full day.
    const mealsByDate: Record<string, number> = {}
    for (const m of mealRows) mealsByDate[m.date] = (mealsByDate[m.date] ?? 0) + 1
    const loggedDays  = Object.keys(mealsByDate).length
    const fullDays    = Object.values(mealsByDate).filter(c => c >= 3).length
    const loggedScore = Math.min(loggedDays / 7, 1) * 5
    const fullScore = Math.min(fullDays / 3, 1) * 5
    const nutritionScore = Math.min(Math.round(loggedScore + fullScore), 10)

    const total = sleepScore + activityScore + moodScore + waterScore + nutritionScore

    return {
      total, sleep: sleepScore, activity: activityScore,
      mood: moodScore, water: waterScore, nutrition: nutritionScore,
      loading: false, hasSomeData, error: null,
    }
  }, [rawRows, initialized])
}
