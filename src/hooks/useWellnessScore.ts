import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { localDateStr } from '../lib/utils'

export interface WellnessScore {
  total:     number   // 0-100
  sleep:     number   // 0-40
  activity:  number   // 0-30
  mood:      number   // 0-20
  water:     number   // 0-10
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
      return { total: 0, sleep: 0, activity: 0, mood: 0, water: 0, loading: true, hasSomeData: false, error: null }
    }

    const weekStart = weekStartStr()

    const sleepRows = rawRows.sleepRows.filter(r => r.date >= weekStart)
    const liftRows  = rawRows.liftingRows.filter(r => r.date >= weekStart)
    const moodRows  = rawRows.moodRows.filter(r => r.date >= weekStart)
    const waterRows = rawRows.waterRows.filter(r => r.date >= weekStart)

    const hasSomeData = sleepRows.length > 0 || liftRows.length > 0 || moodRows.length > 0 || waterRows.length > 0

    const sleepAvg = sleepRows.length
      ? sleepRows.reduce((s, r) => s + (r.hours_slept ?? 0), 0) / sleepRows.length
      : 0
    const sleepScore = Math.min(Math.round((sleepAvg / 8) * 40), 40)

    const gymDays = new Set(liftRows.map(r => r.date)).size
    const activityScore = Math.min(Math.round((gymDays / 5) * 30), 30)

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

    const total = sleepScore + activityScore + moodScore + waterScore

    return {
      total, sleep: sleepScore, activity: activityScore,
      mood: moodScore, water: waterScore,
      loading: false, hasSomeData, error: null,
    }
  }, [rawRows, initialized])
}
