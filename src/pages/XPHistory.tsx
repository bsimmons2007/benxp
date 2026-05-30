import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { supabase } from '../lib/supabase'
import { XP_RATES } from '../lib/xp'
import { useXP } from '../hooks/useXP'
import { DumbbellIcon, TrophyIcon, BookIcon, SkateIcon, GamepadIcon, MoonIcon, TargetIcon, ActivityIconComp } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

// Category-specific colors matching the Home activity feed
const CAT_COLORS = {
  lift:       { icon: 'var(--accent)',  bg: 'color-mix(in srgb, var(--accent) 14%, transparent)' },
  pr:         { icon: '#fbbf24',        bg: 'rgba(251,191,36,0.14)' },
  book:       { icon: '#f59e0b',        bg: 'rgba(245,158,11,0.14)' },
  skate:      { icon: '#38bdf8',        bg: 'rgba(56,189,248,0.14)' },
  gaming:     { icon: '#a78bfa',        bg: 'rgba(167,139,250,0.14)' },
  sleep:      { icon: '#818cf8',        bg: 'rgba(129,140,248,0.14)' },
  challenge:  { icon: '#34d399',        bg: 'rgba(52,211,153,0.14)' },
  cardio:     { icon: '#38bdf8',        bg: 'rgba(56,189,248,0.14)' },
  goal:       { icon: '#fbbf24',        bg: 'rgba(251,191,36,0.14)' },
}

interface XPEvent {
  date:      string
  label:     string
  icon:      ReactNode
  xp:        number
  key:       string
  iconBg:    string
}

async function fetchXPEvents(userId: string): Promise<XPEvent[]> {
  const [lifting, prs, books, skate, games, sleep, challenges, cardio, goals] = await Promise.all([
    supabase.from('lifting_log').select('date').eq('user_id', userId),
    supabase.from('pr_history').select('date, lift, est_1rm').eq('user_id', userId),
    supabase.from('books').select('date_finished, title').eq('user_id', userId).not('date_finished', 'is', null),
    supabase.from('skate_sessions').select('date, miles').eq('user_id', userId),
    supabase.from('fortnite_games').select('date, kills').eq('user_id', userId).eq('win', true),
    supabase.from('sleep_log').select('date, hours_slept').eq('user_id', userId),
    supabase.from('challenges').select('challenge_name, xp_reward, completed_at').eq('user_id', userId).eq('status', 'completed').not('completed_at', 'is', null),
    supabase.from('cardio_sessions').select('date, activity, distance_miles').eq('user_id', userId),
    supabase.from('goals').select('title, xp_reward, completed_at').eq('user_id', userId).eq('status', 'completed').not('completed_at', 'is', null),
  ])

  const events: XPEvent[] = []

  // Lifting: group by date → one "Gym Day" event per day
  const liftByDay = new Map<string, number>()
  for (const r of (lifting.data ?? []) as { date: string }[]) {
    liftByDay.set(r.date, (liftByDay.get(r.date) ?? 0) + 1)
  }
  liftByDay.forEach((sets, date) => {
    events.push({
      date,
      label: `Gym Day — ${sets} set${sets !== 1 ? 's' : ''}`,
      icon: <DumbbellIcon size={18} color={CAT_COLORS.lift.icon} />,
      xp: sets * XP_RATES.per_set + XP_RATES.workout_day,
      key: `lift-${date}`,
      iconBg: CAT_COLORS.lift.bg,
    })
  })

  // PRs
  for (const r of (prs.data ?? []) as { date: string; lift: string; est_1rm: number }[]) {
    events.push({
      date: r.date,
      label: `New PR — ${r.lift} ${r.est_1rm.toFixed(0)} lbs`,
      icon: <TrophyIcon size={18} color={CAT_COLORS.pr.icon} />,
      xp: XP_RATES.new_pr,
      key: `pr-${r.date}-${r.lift}`,
      iconBg: CAT_COLORS.pr.bg,
    })
  }

  // Books
  for (const r of (books.data ?? []) as { date_finished: string; title: string }[]) {
    events.push({
      date: r.date_finished,
      label: r.title,
      icon: <BookIcon size={18} color={CAT_COLORS.book.icon} />,
      xp: XP_RATES.book_finished,
      key: `book-${r.date_finished}-${r.title}`,
      iconBg: CAT_COLORS.book.bg,
    })
  }

  // Skate sessions
  for (const r of (skate.data ?? []) as { date: string; miles: number }[]) {
    events.push({
      date: r.date,
      label: `${r.miles} miles skated`,
      icon: <SkateIcon size={18} color={CAT_COLORS.skate.icon} />,
      xp: Math.round(r.miles * XP_RATES.skate_per_mile),
      key: `skate-${r.date}-${r.miles}`,
      iconBg: CAT_COLORS.skate.bg,
    })
  }

  // Fortnite wins
  for (const r of (games.data ?? []) as { date: string; kills: number }[]) {
    events.push({
      date: r.date,
      label: `Fortnite Win${r.kills ? ` — ${r.kills} kills` : ''}`,
      icon: <GamepadIcon size={18} color={CAT_COLORS.gaming.icon} />,
      xp: XP_RATES.fortnite_win,
      key: `fn-${r.date}-${r.kills}`,
      iconBg: CAT_COLORS.gaming.bg,
    })
  }

  // Sleep logs
  for (const r of (sleep.data ?? []) as { date: string; hours_slept: number | null }[]) {
    const quality = (r.hours_slept ?? 0) >= 7
    events.push({
      date: r.date,
      label: `Sleep — ${r.hours_slept ?? '?'}h${quality ? ' · quality bonus' : ''}`,
      icon: <MoonIcon size={18} color={CAT_COLORS.sleep.icon} />,
      xp: XP_RATES.sleep_log + (quality ? XP_RATES.sleep_quality_bonus : 0),
      key: `sleep-${r.date}`,
      iconBg: CAT_COLORS.sleep.bg,
    })
  }

  // Challenges / Quests
  for (const r of (challenges.data ?? []) as { challenge_name: string; xp_reward: number; completed_at: string }[]) {
    events.push({
      date: r.completed_at.split('T')[0],
      label: r.challenge_name,
      icon: <TargetIcon size={18} color={CAT_COLORS.challenge.icon} />,
      xp: r.xp_reward ?? 0,
      key: `challenge-${r.completed_at}-${r.challenge_name}`,
      iconBg: CAT_COLORS.challenge.bg,
    })
  }

  // Cardio sessions
  for (const r of (cardio.data ?? []) as { date: string; activity: string; distance_miles: number }[]) {
    const actLabel = r.activity.charAt(0).toUpperCase() + r.activity.slice(1)
    events.push({
      date: r.date,
      label: `${actLabel} — ${r.distance_miles.toFixed(2)} mi`,
      icon: <ActivityIconComp activityKey={r.activity} size={18} color={CAT_COLORS.cardio.icon} />,
      xp: Math.round(r.distance_miles * XP_RATES.cardio_per_mile),
      key: `cardio-${r.date}-${r.activity}-${r.distance_miles}`,
      iconBg: CAT_COLORS.cardio.bg,
    })
  }

  // Goal completions
  for (const r of (goals.data ?? []) as { title: string; xp_reward: number; completed_at: string }[]) {
    events.push({
      date: r.completed_at.split('T')[0],
      label: `Goal: ${r.title}`,
      icon: <TrophyIcon size={18} color={CAT_COLORS.goal.icon} />,
      xp: r.xp_reward ?? 0,
      key: `goal-${r.completed_at}-${r.title}`,
      iconBg: CAT_COLORS.goal.bg,
    })
  }

  return events.sort((a, b) => b.date.localeCompare(a.date))
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === yesterday.getTime()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function XPHistory() {
  usePageTitle('XP History')
  const [events,       setEvents]       = useState<XPEvent[]>([])
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(false)
  const [visibleCount, setVisibleCount] = useState(40)
  const { totalXP, level, loading: xpLoading } = useXP()

  async function load() {
    setLoadError(false)
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const evs = await fetchXPEvents(user.id)
      setEvents(evs)
      setLoading(false)
    } catch {
      setLoadError(true)
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Group events by date for visual separators (paginated)
  const visibleEvents = events.slice(0, visibleCount)
  const grouped: { date: string; items: XPEvent[]; dayTotal: number }[] = []
  for (const ev of visibleEvents) {
    const last = grouped[grouped.length - 1]
    if (last && last.date === ev.date) {
      last.items.push(ev)
      last.dayTotal += ev.xp
    } else {
      grouped.push({ date: ev.date, items: [ev], dayTotal: ev.xp })
    }
  }

  return (
    <>
      <TopBar title="XP History" />
      <PageWrapper>

        {/* Hero */}
        <div className="mb-5 rounded-2xl p-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
          <p className="section-label mb-1">All-Time XP</p>
          <p style={{ fontSize: 44, fontWeight: 700, color: 'var(--accent)', lineHeight: 1, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
            {xpLoading ? '—' : totalXP.toLocaleString()}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Level {level}
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-default)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {loading ? '—' : events.length.toLocaleString()} events
            </span>
          </div>
        </div>

        {/* Event list */}
        {loadError ? (
          <div className="flex flex-col items-center py-12 gap-3 fade-in">
            <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Could not load XP history</p>
            <button
              onClick={load}
              style={{ padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: '#1A1A2E', border: 'none', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', paddingTop: 40 }}>Loading…</p>
        ) : (
          <div>
            {grouped.map(group => (
              <div key={group.date} className="mb-3">
                {/* Date header with day total */}
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <p className="section-label">{formatDate(group.date)}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                    +{group.dayTotal.toLocaleString()} XP
                  </p>
                </div>

                {/* Events for that day */}
                <div className="flex flex-col gap-1">
                  {group.items.map(ev => (
                    <div
                      key={ev.key}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: ev.iconBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {ev.icon}
                      </div>
                      <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.label}</span>
                      <span
                        className="font-bold text-sm shrink-0"
                        style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
                      >
                        +{ev.xp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {visibleCount < events.length && (
              <button
                onClick={() => setVisibleCount(c => c + 40)}
                style={{
                  marginTop: 8, width: '100%', padding: '10px', borderRadius: 12,
                  background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Load more · {events.length - visibleCount} remaining
              </button>
            )}
          </div>
        )}
      </PageWrapper>
    </>
  )
}
