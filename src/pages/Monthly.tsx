import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { Card } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { XP_RATES } from '../lib/xp'
import { useCountUp } from '../hooks/useCountUp'
import { localDateStr } from '../lib/utils'
import { DumbbellIcon, SkateIcon, GamepadIcon, MoonIcon, TrophyIcon, BookIcon, StarIcon } from '../components/ui/Icon'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const end   = localDateStr(new Date(year, month + 1, 0))
  return { start, end }
}

interface Highlight {
  icon:    ReactNode
  label:   string
  value:   string
  sub?:    string
  accent?: boolean
}

interface MonthlyData {
  xpEarned:    number
  highlights:  Highlight[]
  topMoments:  { icon: ReactNode; text: string }[]
  workoutDays: number
  newPRs:      { lift: string; est_1rm: number }[]
  wins:        number
  totalKills:  number
  milesSkated: number
  booksRead:   { title: string }[]
  sleepNights: number
  avgSleep:    number
}

export function Monthly() {
  const now    = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [data,  setData]  = useState<MonthlyData | null>(null)
  const [loading, setLoading] = useState(true)

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (isCurrentMonth) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { start, end } = monthRange(year, month)

      const [lifting, prs, skate, books, games, sleep] = await Promise.all([
        supabase.from('lifting_log').select('date, lift, weight, reps, est_1rm').gte('date', start).lte('date', end),
        supabase.from('pr_history').select('lift, est_1rm, date').gte('date', start).lte('date', end).order('est_1rm', { ascending: false }),
        supabase.from('skate_sessions').select('miles, date').gte('date', start).lte('date', end).order('miles', { ascending: false }),
        supabase.from('books').select('title, date_finished').not('date_finished', 'is', null).gte('date_finished', start).lte('date_finished', end),
        supabase.from('fortnite_games').select('date, kills, win').gte('date', start).lte('date', end).order('kills', { ascending: false }),
        supabase.from('sleep_log').select('date, hours_slept').gte('date', start).lte('date', end),
      ])

      const liftRows  = lifting.data ?? []
      const prRows    = prs.data     ?? []
      const skateRows = skate.data   ?? []
      const bookRows  = books.data   ?? []
      const gameRows  = games.data   ?? []
      const sleepRows = sleep.data   ?? []

      const workoutDays = new Set(liftRows.map((r: { date: string }) => r.date)).size
      const totalSets   = liftRows.length
      const milesSkated = skateRows.reduce((s: number, r: { miles: number }) => s + r.miles, 0)
      const wins        = gameRows.filter((r: { win: boolean }) => r.win).length
      const totalKills  = gameRows.reduce((s: number, r: { kills: number }) => s + (r.kills ?? 0), 0)
      const sleepHours  = sleepRows.map((r: { hours_slept: number | null }) => r.hours_slept ?? 0)
      const avgSleep    = sleepHours.length ? sleepHours.reduce((a: number, b: number) => a + b, 0) / sleepHours.length : 0
      const booksRead   = bookRows.map((r: { title: string }) => ({ title: r.title }))
      const newPRs      = prRows.map((r: { lift: string; est_1rm: number }) => ({ lift: r.lift, est_1rm: r.est_1rm }))

      // XP for month
      const setXP    = totalSets * XP_RATES.per_set
      const dayXP    = workoutDays * XP_RATES.workout_day
      const prXP     = newPRs.length * XP_RATES.new_pr
      const bookXP   = booksRead.length * XP_RATES.book_finished
      const skateXP  = milesSkated * XP_RATES.skate_per_mile
      const fnXP     = wins * XP_RATES.fortnite_win
      const sleepXP  = sleepRows.reduce((s: number, r: { hours_slept: number | null }) =>
        s + XP_RATES.sleep_log + ((r.hours_slept ?? 0) >= 7 ? XP_RATES.sleep_quality_bonus : 0), 0)
      const xpEarned = Math.round(setXP + dayXP + prXP + bookXP + skateXP + fnXP + sleepXP)

      // Best single session
      const bestSkateSession = skateRows[0]
      const bestKillGame     = gameRows[0]
      const bestLiftRow      = liftRows.reduce(
        (best: { lift: string; weight: number; reps: number; est_1rm: number | null } | null,
         r:    { lift: string; weight: number; reps: number; est_1rm: number | null }) =>
          !best || (r.est_1rm ?? 0) > (best.est_1rm ?? 0) ? r : best, null)

      // Build highlight cards
      const highlights: Highlight[] = []
      if (workoutDays > 0) highlights.push({ icon: <DumbbellIcon size={18} color="var(--text-secondary)" />, label: 'Workout Days', value: String(workoutDays), sub: `${totalSets} total sets` })
      if (milesSkated > 0) highlights.push({ icon: <SkateIcon size={18} color="var(--text-secondary)" />, label: 'Miles Skated', value: milesSkated.toFixed(1), sub: `${skateRows.length} sessions` })
      if (wins > 0)        highlights.push({ icon: <GamepadIcon size={18} color="var(--text-secondary)" />, label: 'Wins', value: String(wins), sub: totalKills > 0 ? `${totalKills} kills` : undefined })
      if (sleepRows.length > 0) highlights.push({ icon: <MoonIcon size={18} color="var(--text-secondary)" />, label: 'Avg Sleep', value: `${avgSleep.toFixed(1)}h`, sub: `${sleepRows.length} nights logged` })
      if (newPRs.length > 0)    highlights.push({ icon: <TrophyIcon size={18} color="var(--accent)" />, label: 'New PRs', value: String(newPRs.length), accent: true })
      if (booksRead.length > 0) highlights.push({ icon: <BookIcon size={18} color="var(--text-secondary)" />, label: 'Books Finished', value: String(booksRead.length) })

      // Top moments
      const topMoments: { icon: string; text: string }[] = []
      if (newPRs.length > 0) {
        const best = newPRs[0]
        topMoments.push({ icon: <TrophyIcon size={16} color="var(--accent)" />, text: `New ${best.lift} PR — ${best.est_1rm.toFixed(0)} lbs est. 1RM` })
      }
      if (bestSkateSession && bestSkateSession.miles >= 5) {
        topMoments.push({ icon: <SkateIcon size={16} color="var(--text-secondary)" />, text: `Best skate session — ${bestSkateSession.miles} miles` })
      }
      if (bestKillGame && (bestKillGame.kills ?? 0) >= 5) {
        topMoments.push({ icon: <GamepadIcon size={16} color="var(--text-secondary)" />, text: `Best game — ${bestKillGame.kills} kills${bestKillGame.win ? ' + WIN' : ''}` })
      }
      if (bestLiftRow) {
        topMoments.push({ icon: <DumbbellIcon size={16} color="var(--text-secondary)" />, text: `Top lift — ${bestLiftRow.lift} ${bestLiftRow.weight ? `${bestLiftRow.weight}lbs` : 'BW'} ×${bestLiftRow.reps}` })
      }
      booksRead.forEach(b => topMoments.push({ icon: <BookIcon size={16} color="var(--text-secondary)" />, text: `Finished "${b.title}"` }))

      setData({ xpEarned, highlights, topMoments, workoutDays, newPRs, wins, totalKills, milesSkated, booksRead, sleepNights: sleepRows.length, avgSleep })
      setLoading(false)
    }
    load()
  }, [year, month])

  const animatedXP = useCountUp(data?.xpEarned ?? 0, 1000)

  return (
    <>
      <TopBar title="Monthly" />
      <PageWrapper>

        {/* Month navigator */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}>‹</button>
          <p className="font-semibold text-white">{MONTH_NAMES[month]} {year}</p>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            style={{ color: isCurrentMonth ? '#444' : 'var(--accent)', background: 'none', border: 'none', cursor: isCurrentMonth ? 'default' : 'pointer', fontSize: 20, padding: '4px 8px' }}
          >›</button>
        </div>

        {loading ? (
          <p style={{ color: '#666', textAlign: 'center', paddingTop: 40 }}>Loading…</p>
        ) : !data || data.xpEarned === 0 ? (
          <Card>
            <p className="text-center text-sm py-4" style={{ color: '#666' }}>No activity logged this month.</p>
          </Card>
        ) : (
          <>
            {/* XP hero */}
            <Card className="mb-4 text-center" goldBorder>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#888' }}>XP Earned</p>
              <p className="text-5xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>
                +{parseInt(animatedXP).toLocaleString()}
              </p>
              <p className="text-xs mt-1" style={{ color: '#666' }}>{MONTH_NAMES[month]} {year}</p>
            </Card>

            {/* Stat highlights grid */}
            {data.highlights.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {data.highlights.map(h => (
                  <div key={h.label} className="card-animate rounded-xl p-3" style={{ background: 'var(--card-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: h.accent ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.07)', boxShadow: h.accent ? '0 0 16px var(--accent-dim)' : '0 4px 16px rgba(0,0,0,0.15)' }}>
                    <div style={{ marginBottom: 4 }}>{h.icon}</div>
                    <p style={{ color: 'var(--accent)', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{h.value}</p>
                    <p style={{ color: '#aaa', fontSize: 10, marginTop: 2 }}>{h.label}</p>
                    {h.sub && <p style={{ color: '#666', fontSize: 9, marginTop: 1 }}>{h.sub}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Top moments */}
            {data.topMoments.length > 0 && (
              <Card className="mb-4">
                <h3 className="font-semibold text-white text-sm mb-3" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StarIcon size={14} color="var(--accent)" /> Top Moments</h3>
                <div className="flex flex-col gap-2.5">
                  {data.topMoments.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 slide-in" style={{ animationDelay: `${i * 0.06}s` }}>
                      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{m.icon}</span>
                      <span className="text-sm text-white">{m.text}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* PR list */}
            {data.newPRs.length > 0 && (
              <Card className="mb-4">
                <h3 className="font-semibold text-white text-sm mb-3">Personal Records</h3>
                <div className="flex flex-col gap-2">
                  {data.newPRs.map((pr, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-white">{pr.lift}</span>
                      <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>{pr.est_1rm.toFixed(0)} lbs</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Books */}
            {data.booksRead.length > 0 && (
              <Card>
                <h3 className="font-semibold text-white text-sm mb-3">Books Finished</h3>
                {data.booksRead.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span style={{ color: 'var(--accent)' }}>✓</span>
                    <span className="text-sm text-white">{b.title}</span>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </PageWrapper>
    </>
  )
}
