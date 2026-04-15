import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { supabase } from '../lib/supabase'
import { XP_RATES } from '../lib/xp'
import { useXP } from '../hooks/useXP'
import { DumbbellIcon, TrophyIcon, BookIcon, SkateIcon, GamepadIcon, MoonIcon, TargetIcon, ActivityIconComp } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

interface XPEvent {
  date: string
  label: string
  icon: ReactNode
  xp: number
  key: string
}

async function fetchXPEvents(): Promise<XPEvent[]> {
  const [lifting, prs, books, skate, games, sleep, challenges, cardio, goals] = await Promise.all([
    supabase.from('lifting_log').select('date'),
    supabase.from('pr_history').select('date, lift, est_1rm'),
    supabase.from('books').select('date_finished, title').not('date_finished', 'is', null),
    supabase.from('skate_sessions').select('date, miles'),
    supabase.from('fortnite_games').select('date, kills').eq('win', true),
    supabase.from('sleep_log').select('date, hours_slept'),
    supabase.from('challenges').select('challenge_name, xp_reward, completed_at').eq('status', 'completed').not('completed_at', 'is', null),
    supabase.from('cardio_sessions').select('date, activity, distance_miles'),
    supabase.from('goals').select('title, xp_reward, completed_at').eq('status', 'completed').not('completed_at', 'is', null),
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
      icon: <DumbbellIcon size={18} color="var(--accent)" />,
      xp: sets * XP_RATES.per_set + XP_RATES.workout_day,
      key: `lift-${date}`,
    })
  })

  // PRs
  for (const r of (prs.data ?? []) as { date: string; lift: string; est_1rm: number }[]) {
    events.push({
      date: r.date,
      label: `New PR — ${r.lift} ${r.est_1rm.toFixed(0)} lbs`,
      icon: <TrophyIcon size={18} color="var(--accent)" />,
      xp: XP_RATES.new_pr,
      key: `pr-${r.date}-${r.lift}`,
    })
  }

  // Books
  for (const r of (books.data ?? []) as { date_finished: string; title: string }[]) {
    events.push({
      date: r.date_finished,
      label: r.title,
      icon: <BookIcon size={18} color="var(--accent)" />,
      xp: XP_RATES.book_finished,
      key: `book-${r.date_finished}-${r.title}`,
    })
  }

  // Skate sessions
  for (const r of (skate.data ?? []) as { date: string; miles: number }[]) {
    events.push({
      date: r.date,
      label: `${r.miles} miles skated`,
      icon: <SkateIcon size={18} color="var(--accent)" />,
      xp: Math.round(r.miles * XP_RATES.skate_per_mile),
      key: `skate-${r.date}-${r.miles}`,
    })
  }

  // Fortnite wins
  for (const r of (games.data ?? []) as { date: string; kills: number }[]) {
    events.push({
      date: r.date,
      label: `Fortnite Win${r.kills ? ` — ${r.kills} kills` : ''}`,
      icon: <GamepadIcon size={18} color="var(--accent)" />,
      xp: XP_RATES.fortnite_win,
      key: `fn-${r.date}-${r.kills}`,
    })
  }

  // Sleep logs
  for (const r of (sleep.data ?? []) as { date: string; hours_slept: number | null }[]) {
    const quality = (r.hours_slept ?? 0) >= 7
    events.push({
      date: r.date,
      label: `Sleep — ${r.hours_slept ?? '?'}h${quality ? ' (quality bonus)' : ''}`,
      icon: <MoonIcon size={18} color="var(--accent)" />,
      xp: XP_RATES.sleep_log + (quality ? XP_RATES.sleep_quality_bonus : 0),
      key: `sleep-${r.date}`,
    })
  }

  // Challenges
  for (const r of (challenges.data ?? []) as { challenge_name: string; xp_reward: number; completed_at: string }[]) {
    events.push({
      date: r.completed_at.split('T')[0],
      label: r.challenge_name,
      icon: <TargetIcon size={18} color="var(--accent)" />,
      xp: r.xp_reward ?? 0,
      key: `challenge-${r.completed_at}-${r.challenge_name}`,
    })
  }

  // Cardio sessions
  for (const r of (cardio.data ?? []) as { date: string; activity: string; distance_miles: number }[]) {
    const actLabel = r.activity.charAt(0).toUpperCase() + r.activity.slice(1)
    events.push({
      date: r.date,
      label: `${actLabel} — ${r.distance_miles.toFixed(2)} miles`,
      icon: <ActivityIconComp activityKey={r.activity} size={18} color="var(--accent)" />,
      xp: Math.round(r.distance_miles * XP_RATES.cardio_per_mile),
      key: `cardio-${r.date}-${r.activity}-${r.distance_miles}`,
    })
  }

  // Goal completions
  for (const r of (goals.data ?? []) as { title: string; xp_reward: number; completed_at: string }[]) {
    events.push({
      date: r.completed_at.split('T')[0],
      label: `Goal: ${r.title}`,
      icon: <TrophyIcon size={18} color="var(--accent)" />,
      xp: r.xp_reward ?? 0,
      key: `goal-${r.completed_at}-${r.title}`,
    })
  }

  return events.sort((a, b) => b.date.localeCompare(a.date))
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function XPHistory() {
  usePageTitle('XP History')
  const [events, setEvents] = useState<XPEvent[]>([])
  const [loading, setLoading] = useState(true)
  const { totalXP, loading: xpLoading } = useXP()

  useEffect(() => {
    fetchXPEvents().then(evs => {
      setEvents(evs)
      setLoading(false)
    })
  }, [])

  // Group events by date for visual separators
  const grouped: { date: string; items: XPEvent[] }[] = []
  for (const ev of events) {
    const last = grouped[grouped.length - 1]
    if (last && last.date === ev.date) {
      last.items.push(ev)
    } else {
      grouped.push({ date: ev.date, items: [ev] })
    }
  }

  return (
    <>
      <TopBar title="XP History" />
      <PageWrapper>

        {/* Summary */}
        <div
          className="rounded-xl mb-5 px-4 py-3 flex items-center justify-between"
          style={{
            background: 'var(--card-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          }}
        >
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: '#666', fontFamily: 'Cormorant Garamond, serif' }}>All-time XP</p>
            <p className="font-bold text-2xl" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>
              {xpLoading ? '—' : totalXP.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest" style={{ color: '#666', fontFamily: 'Cormorant Garamond, serif' }}>Events</p>
            <p className="font-bold text-2xl" style={{ color: '#ccc', fontFamily: 'Cinzel, serif' }}>
              {loading ? '—' : events.length}
            </p>
          </div>
        </div>

        {/* Event list */}
        {loading ? (
          <p style={{ color: '#555', textAlign: 'center', paddingTop: 40 }}>Loading…</p>
        ) : (
          <div className="flex flex-col gap-1">
            {grouped.map(group => (
              <div key={group.date}>
                {/* Date separator */}
                <p
                  className="text-xs uppercase tracking-widest px-1 pt-3 pb-1"
                  style={{ color: '#555', fontFamily: 'Cormorant Garamond, serif' }}
                >
                  {formatDate(group.date)}
                </p>

                {/* Events for that day */}
                {group.items.map(ev => (
                  <div
                    key={ev.key}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 mb-1"
                    style={{
                      background: 'var(--card-bg)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{ev.icon}</span>
                    <span className="flex-1 text-sm text-white truncate">{ev.label}</span>
                    <span
                      className="font-bold text-sm shrink-0"
                      style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}
                    >
                      +{ev.xp}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </PageWrapper>
    </>
  )
}
