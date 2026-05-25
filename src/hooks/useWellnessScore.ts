import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDateStr } from '../lib/utils'

export interface WellnessScore {
  total:     number   // 0–100
  sleep:     number   // 0–40
  activity:  number   // 0–30
  mood:      number   // 0–20
  water:     number   // 0–10
  loading:   boolean
  hasSomeData: boolean
  error:     string | null
}

let cache: { data: WellnessScore; ts: number } | null = null
const TTL = 5 * 60 * 1000

export function useWellnessScore(): WellnessScore {
  const empty: WellnessScore = { total: 0, sleep: 0, activity: 0, mood: 0, water: 0, loading: true, hasSomeData: false, error: null }
  const [score, setScore] = useState<WellnessScore>(cache?.data ?? empty)

  useEffect(() => {
    if (cache && Date.now() - cache.ts < TTL) { setScore(cache.data); return }

    let cancelled = false
    async function load() {
      try {
      const now   = new Date()
      const dow   = now.getDay()
      const monOff = dow === 0 ? -6 : 1 - dow
      const monday = new Date(now)
      monday.setDate(now.getDate() + monOff)
      const weekStart = localDateStr(monday)

      const [sleepRes, liftRes, moodRes, waterRes] = await Promise.all([
        supabase.from('sleep_log').select('hours_slept, date').gte('date', weekStart),
        supabase.from('lifting_log').select('date').gte('date', weekStart),
        supabase.from('mood_log').select('mood, date').gte('date', weekStart),
        supabase.from('water_log').select('oz, date').gte('date', weekStart),
      ])

      const firstErr = sleepRes.error?.message ?? liftRes.error?.message ?? moodRes.error?.message ?? waterRes.error?.message ?? null
      if (firstErr) {
        if (!cancelled) setScore({ ...empty, loading: false, error: firstErr })
        return
      }

      const sleepRows  = sleepRes.data  ?? []
      const liftRows   = liftRes.data   ?? []
      const moodRows   = moodRes.data   ?? []
      const waterRows  = waterRes.data  ?? []

      const hasSomeData = sleepRows.length > 0 || liftRows.length > 0 || moodRows.length > 0 || waterRows.length > 0

      // Sleep score: avg hours / 8 * 40, capped at 40
      const sleepAvg = sleepRows.length
        ? sleepRows.reduce((s, r) => s + (r.hours_slept ?? 0), 0) / sleepRows.length
        : 0
      const sleepScore = Math.min(Math.round((sleepAvg / 8) * 40), 40)

      // Activity score: unique workout days / 5 (target 5/wk) * 30
      const gymDays = new Set(liftRows.map(r => r.date)).size
      const activityScore = Math.min(Math.round((gymDays / 5) * 30), 30)

      // Mood score: avg mood / 10 * 20
      const moodAvg = moodRows.length
        ? moodRows.reduce((s, r) => s + (r.mood ?? 0), 0) / moodRows.length
        : 0
      const moodScore = Math.min(Math.round((moodAvg / 10) * 20), 20)

      // Water score: avg oz / 64 (8 cups) * 10
      const waterAvg = waterRows.length
        ? waterRows.reduce((s, r) => s + (r.oz ?? 0), 0) / waterRows.length
        : 0
      const waterScore = Math.min(Math.round((waterAvg / 64) * 10), 10)

      const total = sleepScore + activityScore + moodScore + waterScore

      const result: WellnessScore = {
        total, sleep: sleepScore, activity: activityScore,
        mood: moodScore, water: waterScore,
        loading: false, hasSomeData, error: null,
      }
      cache = { data: result, ts: Date.now() }
      if (!cancelled) setScore(result)
      } catch (err) {
        console.error('[useWellnessScore] failed:', err)
        if (!cancelled) setScore({ ...empty, loading: false, error: String(err) })
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return score
}
