import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Stats {
  benchPR: number | null
  squatPR: number | null
  deadliftPR: number | null
  totalMiles: number
  books2026: number
  winCount: number
}

export function useStats() {
  const [stats, setStats] = useState<Stats>({
    benchPR: null,
    squatPR: null,
    deadliftPR: null,
    totalMiles: 0,
    books2026: 0,
    winCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [prs, skate, books, games] = await Promise.all([
        supabase
          .from('pr_history')
          .select('lift, est_1rm')
          .in('lift', ['Bench', 'Squat', 'Deadlift'])
          .order('est_1rm', { ascending: false }),
        supabase.from('skate_sessions').select('miles'),
        supabase
          .from('books')
          .select('id')
          .not('date_finished', 'is', null)
          .gte('date_finished', '2026-01-01'),
        supabase.from('fortnite_games').select('win'),
      ])

      const prMap: Record<string, number> = {}
      prs.data?.forEach((r: { lift: string; est_1rm: number }) => {
        if (!prMap[r.lift] || r.est_1rm > prMap[r.lift]) prMap[r.lift] = r.est_1rm
      })

      const totalMiles =
        skate.data?.reduce((sum: number, r: { miles: number }) => sum + r.miles, 0) ?? 0
      const winCount = games.data?.length ?? 0

      setStats({
        benchPR: prMap['Bench'] ?? null,
        squatPR: prMap['Squat'] ?? null,
        deadliftPR: prMap['Deadlift'] ?? null,
        totalMiles,
        books2026: books.data?.length ?? 0,
        winCount,
      })
      setLoading(false)
    }
    load()
  }, [])

  return { stats, loading }
}
