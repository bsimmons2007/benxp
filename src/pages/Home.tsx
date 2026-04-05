import { useEffect, useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useXP } from '../hooks/useXP'
import { useStats } from '../hooks/useStats'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import { xpForLevel } from '../lib/xp'

interface ActivityEntry {
  type: string
  label: string
  date: string
  icon: string
}

function useRecentActivity() {
  const [activity, setActivity] = useState<ActivityEntry[]>([])

  useEffect(() => {
    async function load() {
      const [lifting, skate, books, games] = await Promise.all([
        supabase.from('lifting_log').select('date, lift, weight, reps').order('created_at', { ascending: false }).limit(3),
        supabase.from('skate_sessions').select('date, miles').order('created_at', { ascending: false }).limit(2),
        supabase.from('books').select('date_finished, title').not('date_finished', 'is', null).order('created_at', { ascending: false }).limit(2),
        supabase.from('fortnite_games').select('date, kills, win').order('created_at', { ascending: false }).limit(2),
      ])

      const entries: ActivityEntry[] = [
        ...(lifting.data ?? []).map((r: { date: string; lift: string; weight: number; reps: number }) => ({
          type: 'lift',
          label: `${r.lift} ${r.weight ? `${r.weight}lbs` : ''} ×${r.reps}`,
          date: r.date,
          icon: '🏋️',
        })),
        ...(skate.data ?? []).map((r: { date: string; miles: number }) => ({
          type: 'skate',
          label: `${r.miles} miles`,
          date: r.date,
          icon: '🛼',
        })),
        ...(books.data ?? []).map((r: { date_finished: string; title: string }) => ({
          type: 'book',
          label: r.title,
          date: r.date_finished,
          icon: '📚',
        })),
        ...(games.data ?? []).map((r: { date: string; kills: number; win: boolean }) => ({
          type: 'fortnite',
          label: `${r.kills} kills${r.win ? ' — WIN' : ''}`,
          date: r.date,
          icon: '🎮',
        })),
      ]

      entries.sort((a, b) => b.date.localeCompare(a.date))
      setActivity(entries.slice(0, 5))
    }
    load()
  }, [])

  return activity
}

export function Home() {
  const { totalXP, level, progress, loading } = useXP()
  const { stats } = useStats()
  const activity = useRecentActivity()
  const toNext = xpForLevel(level + 1) - totalXP

  return (
    <>
      <TopBar />
      <PageWrapper>
        {/* Level hero */}
        <div className="text-center py-6">
          <h1 className="text-6xl font-bold" style={{ color: '#F5A623' }}>
            {loading ? '—' : level}
          </h1>
          <p className="text-sm font-medium mt-1" style={{ color: '#888' }}>
            Level
          </p>
          <p className="text-sm mt-1" style={{ color: '#CCCCCC' }}>
            {totalXP.toLocaleString()} XP · {toNext.toLocaleString()} to next level
          </p>
        </div>

        {/* XP bar */}
        <div className="mb-6">
          <ProgressBar value={progress} />
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard label="Bench PR" value={stats.benchPR ? stats.benchPR.toFixed(1) : '—'} unit="lbs" />
          <StatCard label="Squat PR" value={stats.squatPR ? stats.squatPR.toFixed(1) : '—'} unit="lbs" />
          <StatCard label="Deadlift PR" value={stats.deadliftPR ? stats.deadliftPR.toFixed(1) : '—'} unit="lbs" />
          <StatCard label="Total Miles" value={stats.totalMiles.toFixed(1)} unit="mi" />
          <StatCard label="Books 2026" value={stats.books2026} />
          <StatCard label="Win Rate" value={`${stats.winRate}%`} />
        </div>

        {/* Recent activity */}
        <Card>
          <h2 className="font-semibold text-white mb-3">Recent Activity</h2>
          {activity.length === 0 ? (
            <p style={{ color: '#888' }}>No activity yet. Start logging!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {activity.map((a, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{a.icon}</span>
                    <span className="text-sm text-white">{a.label}</span>
                  </div>
                  <span className="text-xs" style={{ color: '#888' }}>{formatDate(a.date)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </PageWrapper>
    </>
  )
}
