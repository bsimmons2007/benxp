import { useEffect, useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { supabase } from '../lib/supabase'
import { XP_RATES } from '../lib/xp'
import { today as appToday, localDateStr } from '../lib/utils'
import { usePageTitle } from '../hooks/usePageTitle'

function getMondayOfWeek(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return localDateStr(d)
}

function getSundayOfWeek(monday: string): string {
  const d = new Date(monday + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return localDateStr(d)
}

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

interface WeeklyData {
  xpEarned:       number
  workoutDays:    number
  totalSets:      number
  bestLift:       { lift: string; weight: number; reps: number } | null
  newPRs:         number
  milesSkated:   number
  skateSessions:  number
  wins:           number
  kills:          number
  booksFinished:  { title: string }[]
  sleepNights:    number
  avgSleep:       number
  goodSleepNights:number
  streak:         number   // consecutive active days this week
  activeDays:     string[] // which days had activity
}

export function Weekly() {
  usePageTitle('Weekly Review')
  const [data, setData]         = useState<WeeklyData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [weekOffset, setWeekOffset] = useState(0) // 0 = this week, -1 = last week

  // Respect the 1AM day boundary by deriving the anchor from appToday()
  const todayStr = appToday()
  const today  = new Date(todayStr + 'T12:00:00')
  const target = new Date(today)
  target.setDate(today.getDate() + weekOffset * 7)
  const monday = getMondayOfWeek(target)
  const sunday = getSundayOfWeek(monday)
  const isCurrentWeek = weekOffset === 0

  const weekLabel = isCurrentWeek
    ? 'This Week'
    : `${formatDateShort(monday)} – ${formatDateShort(sunday)}`

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [lifting, prs, skate, books, games, sleep] = await Promise.all([
        supabase.from('lifting_log').select('date, lift, weight, reps, est_1rm').gte('date', monday).lte('date', sunday),
        supabase.from('pr_history').select('lift, est_1rm, date').gte('date', monday).lte('date', sunday),
        supabase.from('skate_sessions').select('miles, date').gte('date', monday).lte('date', sunday),
        supabase.from('books').select('title, date_finished').not('date_finished', 'is', null).gte('date_finished', monday).lte('date_finished', sunday),
        supabase.from('fortnite_games').select('date, kills, win').gte('date', monday).lte('date', sunday),
        supabase.from('sleep_log').select('date, hours_slept').gte('date', monday).lte('date', sunday),
      ])

      const liftRows  = lifting.data ?? []
      const prRows    = prs.data ?? []
      const skateRows = skate.data ?? []
      const bookRows  = books.data ?? []
      const gameRows  = games.data ?? []
      const sleepRows = sleep.data ?? []

      const workoutDays = new Set(liftRows.map((r: { date: string }) => r.date)).size
      const totalSets   = liftRows.length

      // best lift by est_1rm this week
      const bestLiftRow = liftRows.reduce((best: { lift: string; weight: number; reps: number; est_1rm: number | null } | null,
        r: { lift: string; weight: number; reps: number; est_1rm: number | null }) => {
        if (!best) return r
        return (r.est_1rm ?? 0) > (best.est_1rm ?? 0) ? r : best
      }, null)

      const totalMiles = skateRows.reduce((s: number, r: { miles: number }) => s + r.miles, 0)
      const wins  = gameRows.filter((r: { win: boolean }) => r.win).length
      const kills = gameRows.reduce((s: number, r: { kills: number }) => s + (r.kills ?? 0), 0)

      const sleepHours  = sleepRows.map((r: { hours_slept: number | null }) => r.hours_slept ?? 0)
      const avgSleep    = sleepHours.length ? sleepHours.reduce((a: number, b: number) => a + b, 0) / sleepHours.length : 0
      const goodNights  = sleepHours.filter((h: number) => h >= 7).length

      // XP calc for this week
      const setXP        = totalSets * XP_RATES.per_set
      const dayXP        = workoutDays * XP_RATES.workout_day
      const prXP         = prRows.length * XP_RATES.new_pr
      const bookXP       = bookRows.length * XP_RATES.book_finished
      const skateXP      = totalMiles * XP_RATES.skate_per_mile
      const fnXP         = wins * XP_RATES.fortnite_win
      const sleepXP      = sleepRows.reduce((s: number, r: { hours_slept: number | null }) =>
        s + XP_RATES.sleep_log + ((r.hours_slept ?? 0) >= 7 ? XP_RATES.sleep_quality_bonus : 0), 0)
      const xpEarned     = Math.round(setXP + dayXP + prXP + bookXP + skateXP + fnXP + sleepXP)

      // active days and streak
      const activeDays = new Set([
        ...liftRows.map((r: { date: string }) => r.date),
        ...skateRows.map((r: { date: string }) => r.date),
        ...bookRows.map((r: { date_finished: string }) => r.date_finished ?? ''),
        ...gameRows.map((r: { date: string }) => r.date),
        ...sleepRows.map((r: { date: string }) => r.date),
      ])
      const activeSorted = [...activeDays].filter(Boolean).sort()
      let streak = 0, cur = 0
      for (let i = 0; i < activeSorted.length; i++) {
        if (i === 0) { cur = 1; continue }
        const diff = (new Date(activeSorted[i]).getTime() - new Date(activeSorted[i - 1]).getTime()) / 86400000
        cur = diff === 1 ? cur + 1 : 1
        streak = Math.max(streak, cur)
      }

      setData({
        xpEarned, workoutDays, totalSets, newPRs: prRows.length,
        bestLift: bestLiftRow ? { lift: bestLiftRow.lift, weight: bestLiftRow.weight, reps: bestLiftRow.reps } : null,
        milesSkated: totalMiles, skateSessions: skateRows.length,
        wins, kills,
        booksFinished: bookRows.map((r: { title: string }) => ({ title: r.title })),
        sleepNights: sleepRows.length, avgSleep, goodSleepNights: goodNights,
        streak, activeDays: activeSorted,
      })
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monday, sunday])

  const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <>
      <TopBar title="Weekly Review" />
      <PageWrapper>

        {/* Week navigator */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}
          >‹</button>
          <p className="font-semibold text-white text-sm">{weekLabel}</p>
          <button
            onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
            disabled={isCurrentWeek}
            style={{
              color: isCurrentWeek ? '#444' : 'var(--accent)',
              background: 'none', border: 'none',
              cursor: isCurrentWeek ? 'default' : 'pointer',
              fontSize: 20, padding: '4px 8px',
            }}
          >›</button>
        </div>

        {loading ? (
          <p style={{ color: '#666', textAlign: 'center', paddingTop: 40 }}>Loading…</p>
        ) : !data ? null : (
          <>
            {/* XP Earned hero */}
            <Card className="mb-4 text-center" goldBorder>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#888' }}>XP This Week</p>
              <p className="text-5xl font-bold xp-number" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>
                +{data.xpEarned.toLocaleString()}
              </p>
              {data.xpEarned === 0 && (
                <p className="text-xs mt-2" style={{ color: '#555' }}>No activity logged this week yet.</p>
              )}
            </Card>

            {/* Day activity heatmap */}
            <Card className="mb-4">
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888' }}>Activity This Week</p>
              <div className="flex justify-between gap-1">
                {WEEK_DAYS.map((day, i) => {
                  const date = new Date(monday + 'T12:00:00')
                  date.setDate(date.getDate() + i)
                  const iso  = localDateStr(date)
                  const active = data.activeDays.includes(iso)
                  const isToday = iso === todayStr
                  return (
                    <div key={day} className="flex flex-col items-center gap-1 flex-1">
                      <div style={{
                        width: '100%', aspectRatio: '1',
                        borderRadius: 8,
                        background: active
                          ? 'linear-gradient(135deg, var(--accent) 0%, rgba(245,166,35,0.5) 100%)'
                          : 'rgba(255,255,255,0.05)',
                        border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
                        boxShadow: active ? '0 0 12px var(--accent-dim)' : 'none',
                        transition: 'all 0.2s ease',
                      }} />
                      <span style={{ fontSize: 9, color: isToday ? 'var(--accent)' : '#555' }}>{day}</span>
                    </div>
                  )
                })}
              </div>
              {data.streak > 1 && (
                <p className="text-xs mt-2 text-center" style={{ color: 'var(--accent)' }}>
                  {data.streak}-day active streak this week
                </p>
              )}
            </Card>

            {/* Stats breakdown */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Lifting */}
              {data.workoutDays > 0 && (
                <Card>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#888' }}>Lifting</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{data.workoutDays}</p>
                  <p style={{ color: '#888', fontSize: 11 }}>workout days</p>
                  <p className="mt-1" style={{ color: '#aaa', fontSize: 11 }}>{data.totalSets} sets total</p>
                  {data.newPRs > 0 && (
                    <p style={{ color: '#4ade80', fontSize: 11 }}>{data.newPRs} new PR{data.newPRs > 1 ? 's' : ''}</p>
                  )}
                  {data.bestLift && (
                    <p style={{ color: '#888', fontSize: 11 }}>
                      Best: {data.bestLift.lift} {data.bestLift.weight}lbs ×{data.bestLift.reps}
                    </p>
                  )}
                </Card>
              )}

              {/* Skate */}
              {data.skateSessions > 0 && (
                <Card>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#888' }}>Skating</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{data.milesSkated.toFixed(1)}</p>
                  <p style={{ color: '#888', fontSize: 11 }}>miles</p>
                  <p className="mt-1" style={{ color: '#aaa', fontSize: 11 }}>{data.skateSessions} session{data.skateSessions > 1 ? 's' : ''}</p>
                </Card>
              )}

              {/* Fortnite */}
              {(data.wins > 0 || data.kills > 0) && (
                <Card>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#888' }}>Fortnite</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{data.wins}</p>
                  <p style={{ color: '#888', fontSize: 11 }}>wins</p>
                  {data.kills > 0 && <p className="mt-1" style={{ color: '#aaa', fontSize: 11 }}>{data.kills} kills</p>}
                </Card>
              )}

              {/* Sleep */}
              {data.sleepNights > 0 && (
                <Card>
                  <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#888' }}>Sleep</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{data.avgSleep.toFixed(1)}</p>
                  <p style={{ color: '#888', fontSize: 11 }}>avg hours/night</p>
                  <p className="mt-1" style={{ color: '#aaa', fontSize: 11 }}>{data.sleepNights} nights logged</p>
                  {data.goodSleepNights > 0 && (
                    <p style={{ color: '#4ade80', fontSize: 11 }}>{data.goodSleepNights} good night{data.goodSleepNights > 1 ? 's' : ''}</p>
                  )}
                  {/* Sleep quality bar */}
                  <div className="mt-2">
                    <ProgressBar value={Math.min(data.avgSleep / 9, 1)} height={6} />
                  </div>
                </Card>
              )}
            </div>

            {/* Books finished */}
            {data.booksFinished.length > 0 && (
              <Card className="mb-4">
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#888' }}>Finished This Week</p>
                {data.booksFinished.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span style={{ color: 'var(--accent)', fontSize: 14 }}>✓</span>
                    <span className="text-sm text-white">{b.title}</span>
                  </div>
                ))}
              </Card>
            )}

            {/* Weekly Performance Score */}
            {data.xpEarned > 0 && (() => {
              // Score 0–100 from key signals: workout days (0-3+), PRs, miles, wins, sleep
              const workoutScore  = Math.min(data.workoutDays / 4, 1)       * 35
              const prScore       = Math.min(data.newPRs, 3) / 3            * 20
              const skateScore    = Math.min(data.milesSkated / 15, 1)      * 15
              const sleepScore    = Math.min(data.goodSleepNights / 5, 1)   * 15
              const fnScore       = Math.min(data.wins / 3, 1)              * 10
              const bookScore     = Math.min(data.booksFinished.length, 2) / 2 * 5
              const score = Math.round(workoutScore + prScore + skateScore + sleepScore + fnScore + bookScore)
              const grade = score >= 85 ? 'S' : score >= 70 ? 'A' : score >= 55 ? 'B' : score >= 40 ? 'C' : 'D'
              const gradeColor = score >= 85 ? '#ffd700' : score >= 70 ? '#4ade80' : score >= 55 ? 'var(--accent)' : score >= 40 ? '#f97316' : '#888'
              return (
                <Card className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-widest" style={{ color: '#888' }}>Weekly Score</p>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 28, fontWeight: 900, color: gradeColor, fontFamily: 'Cinzel, serif', lineHeight: 1 }}>{grade}</span>
                      <span style={{ color: '#888', fontSize: 12 }}>{score}/100</span>
                    </div>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${score}%`, borderRadius: 999,
                      background: `linear-gradient(90deg, ${gradeColor}88, ${gradeColor})`,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {[
                      { label: 'Workout', val: `${data.workoutDays}d`, pct: workoutScore / 35 },
                      { label: 'PRs',     val: String(data.newPRs),   pct: prScore / 20 },
                      { label: 'Sleep',   val: String(data.goodSleepNights), pct: sleepScore / 15 },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <p style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 700 }}>{s.val}</p>
                        <p style={{ color: '#666', fontSize: 10 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })()}

            {/* Empty state */}
            {data.xpEarned === 0 && (
              <Card>
                <p className="text-center text-sm" style={{ color: '#666', padding: '8px 0' }}>
                  No activity this week yet — get after it.
                </p>
              </Card>
            )}
          </>
        )}
      </PageWrapper>
    </>
  )
}
