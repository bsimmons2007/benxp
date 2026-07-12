import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { XP_RATES } from '../lib/xp'
import { useXP } from '../hooks/useXP'
import {
  DumbbellIcon, TrophyIcon, BookIcon, SkateIcon, GamepadIcon, MoonIcon, TargetIcon,
  ActivityIconComp, BasketballIcon, GolfIcon, DiscIcon, MountainIcon, TableTennisIcon,
  ChessIcon, PoolIcon, VolleyballIcon, SpikeballIcon, BrainIcon, DropletIcon, RulerIcon,
  ZapIcon,
} from '../components/ui/Icon'

const CAT_COLORS = {
  lift:      { icon: 'var(--accent)',  bg: 'color-mix(in srgb, var(--accent) 14%, transparent)' },
  pr:        { icon: '#fbbf24',        bg: 'rgba(251,191,36,0.14)' },
  book:      { icon: '#f59e0b',        bg: 'rgba(245,158,11,0.14)' },
  skate:     { icon: '#38bdf8',        bg: 'rgba(56,189,248,0.14)' },
  gaming:    { icon: '#a78bfa',        bg: 'rgba(167,139,250,0.14)' },
  sleep:     { icon: '#818cf8',        bg: 'rgba(129,140,248,0.14)' },
  challenge: { icon: '#34d399',        bg: 'rgba(52,211,153,0.14)' },
  cardio:    { icon: '#38bdf8',        bg: 'rgba(56,189,248,0.14)' },
  goal:      { icon: '#fbbf24',        bg: 'rgba(251,191,36,0.14)' },
  sport:     { icon: '#fb923c',        bg: 'rgba(251,146,60,0.14)' },
  mood:      { icon: '#c084fc',        bg: 'rgba(192,132,252,0.14)' },
  water:     { icon: '#22d3ee',        bg: 'rgba(34,211,238,0.14)' },
  measure:   { icon: '#94a3b8',        bg: 'rgba(148,163,184,0.14)' },
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
  const [
    lifting, prs, books, skate, games, sleep, challenges, cardio, goals,
    basketball, pickleball, golf, discGolf, hiking, tableTennis, chess,
    volleyball, spikeball, pool, mood, water, measurements,
  ] = await Promise.all([
    supabase.from('lifting_log').select('date').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('pr_history').select('date, lift, est_1rm').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('books').select('date_finished, title').eq('user_id', userId).not('date_finished', 'is', null).order('date_finished', { ascending: false }).limit(500),
    supabase.from('skate_sessions').select('date, miles').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('fortnite_games').select('date, kills, mode').eq('user_id', userId).eq('win', true).order('date', { ascending: false }).limit(500),
    supabase.from('sleep_log').select('date, hours_slept').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('challenges').select('challenge_name, xp_reward, completed_at').eq('user_id', userId).in('status', ['completed', 'claimed']).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(500),
    supabase.from('cardio_sessions').select('date, activity, distance_miles').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('goals').select('title, xp_reward, completed_at').eq('user_id', userId).eq('status', 'completed').not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(500),
    supabase.from('basketball_sessions').select('date, points').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('pickleball_games').select('date, win').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('golf_rounds').select('date, score, par').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('disc_golf_rounds').select('date, score, par').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('hiking_sessions').select('date, distance_miles, elevation_gain_ft, trail').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('table_tennis_games').select('date, win').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('chess_games').select('date, result').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('volleyball_sessions').select('date, win').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('spikeball_games').select('date, win').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('pool_games').select('date, win, break_and_run').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('mood_log').select('date').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('water_log').select('date, oz').eq('user_id', userId).order('date', { ascending: false }).limit(500),
    supabase.from('body_measurements').select('date').eq('user_id', userId).order('date', { ascending: false }).limit(500),
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

  // Fortnite wins — blitz rate + kill XP + index key to avoid same-day duplicates
  ;(games.data ?? []).forEach((r: { date: string; kills: number; mode: string | null }, i: number) => {
    const isBlitz = r.mode === 'Blitz' || (typeof r.mode === 'string' && r.mode.startsWith('Blitz '))
    const winXP   = isBlitz ? XP_RATES.fortnite_blitz_win : XP_RATES.fortnite_win
    events.push({
      date: r.date,
      label: `Fortnite Win${r.kills ? ` — ${r.kills} kills` : ''}${isBlitz ? ' · Blitz' : ''}`,
      icon: <GamepadIcon size={18} color={CAT_COLORS.gaming.icon} />,
      xp: winXP + (r.kills ?? 0) * XP_RATES.fortnite_kill,
      key: `fn-${r.date}-${i}`,
      iconBg: CAT_COLORS.gaming.bg,
    })
  })

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
    const cardioRate = r.activity === 'run'  ? XP_RATES.cardio_run_per_mile
                     : r.activity === 'bike' ? XP_RATES.cardio_bike_per_mile
                     : r.activity === 'swim' ? XP_RATES.cardio_swim_per_mile
                     : r.activity === 'walk' ? XP_RATES.cardio_walk_per_mile
                     : XP_RATES.cardio_per_mile
    events.push({
      date: r.date,
      label: `${actLabel} — ${r.distance_miles.toFixed(2)} mi`,
      icon: <ActivityIconComp activityKey={r.activity} size={18} color={CAT_COLORS.cardio.icon} />,
      xp: Math.round(r.distance_miles * cardioRate),
      key: `cardio-${r.date}-${r.activity}-${r.distance_miles}`,
      iconBg: CAT_COLORS.cardio.bg,
    })
  }

  // Goal completions
  ;(goals.data ?? []).forEach((r: { title: string; xp_reward: number; completed_at: string }, i: number) => {
    events.push({
      date: r.completed_at.split('T')[0],
      label: `Goal: ${r.title}`,
      icon: <TrophyIcon size={18} color={CAT_COLORS.goal.icon} />,
      xp: r.xp_reward ?? 0,
      key: `goal-${r.completed_at}-${i}`,
      iconBg: CAT_COLORS.goal.bg,
    })
  })

  // Basketball
  ;(basketball.data ?? []).forEach((r: { date: string; points: number }, i: number) => {
    events.push({
      date: r.date,
      label: `Basketball — ${r.points ?? 0} pts`,
      icon: <BasketballIcon size={18} color={CAT_COLORS.sport.icon} />,
      xp: XP_RATES.basketball_session + (r.points ?? 0) * XP_RATES.basketball_per_point,
      key: `bb-${r.date}-${i}`,
      iconBg: CAT_COLORS.sport.bg,
    })
  })

  // Pickleball
  ;(pickleball.data ?? []).forEach((r: { date: string; win: boolean }, i: number) => {
    events.push({
      date: r.date,
      label: `Pickleball — ${r.win ? 'Win' : 'Loss'}`,
      icon: <TargetIcon size={18} color={CAT_COLORS.sport.icon} />,
      xp: XP_RATES.pickleball_game + (r.win ? XP_RATES.pickleball_win : 0),
      key: `pb-${r.date}-${i}`,
      iconBg: CAT_COLORS.sport.bg,
    })
  })

  // Golf
  ;(golf.data ?? []).forEach((r: { date: string; score: number; par: number }, i: number) => {
    const vspar = r.score - r.par
    const vsStr = vspar === 0 ? 'E' : vspar > 0 ? `+${vspar}` : String(vspar)
    events.push({
      date: r.date,
      label: `Golf — ${vsStr} vs par`,
      icon: <GolfIcon size={18} color={CAT_COLORS.sport.icon} />,
      xp: XP_RATES.golf_round + (vspar < 0 ? Math.abs(vspar) * XP_RATES.golf_under_par : 0),
      key: `golf-${r.date}-${i}`,
      iconBg: CAT_COLORS.sport.bg,
    })
  })

  // Disc Golf
  ;(discGolf.data ?? []).forEach((r: { date: string; score: number; par: number }, i: number) => {
    const vspar = r.score - r.par
    const vsStr = vspar === 0 ? 'E' : vspar > 0 ? `+${vspar}` : String(vspar)
    events.push({
      date: r.date,
      label: `Disc Golf — ${vsStr} vs par`,
      icon: <DiscIcon size={18} color={CAT_COLORS.sport.icon} />,
      xp: XP_RATES.disc_golf_round + (vspar < 0 ? Math.abs(vspar) * XP_RATES.disc_golf_under_par : 0),
      key: `dg-${r.date}-${i}`,
      iconBg: CAT_COLORS.sport.bg,
    })
  })

  // Hiking
  ;(hiking.data ?? []).forEach((r: { date: string; distance_miles: number; elevation_gain_ft: number | null; trail: string | null }, i: number) => {
    const elevXP = Math.floor((r.elevation_gain_ft ?? 0) / 500) * XP_RATES.hiking_per_500ft
    events.push({
      date: r.date,
      label: `Hike${r.trail ? ` — ${r.trail}` : ''} · ${r.distance_miles.toFixed(1)} mi`,
      icon: <MountainIcon size={18} color={CAT_COLORS.sport.icon} />,
      xp: Math.round(r.distance_miles * XP_RATES.hiking_per_mile + elevXP),
      key: `hike-${r.date}-${i}`,
      iconBg: CAT_COLORS.sport.bg,
    })
  })

  // Table Tennis
  ;(tableTennis.data ?? []).forEach((r: { date: string; win: boolean }, i: number) => {
    events.push({
      date: r.date,
      label: `Table Tennis — ${r.win ? 'Win' : 'Loss'}`,
      icon: <TableTennisIcon size={18} color={CAT_COLORS.sport.icon} />,
      xp: XP_RATES.table_tennis_game + (r.win ? XP_RATES.table_tennis_win : 0),
      key: `tt-${r.date}-${i}`,
      iconBg: CAT_COLORS.sport.bg,
    })
  })

  // Chess
  ;(chess.data ?? []).forEach((r: { date: string; result: string }, i: number) => {
    events.push({
      date: r.date,
      label: `Chess — ${r.result.charAt(0).toUpperCase() + r.result.slice(1)}`,
      icon: <ChessIcon size={18} color={CAT_COLORS.sport.icon} />,
      xp: XP_RATES.chess_game + (r.result === 'win' ? XP_RATES.chess_win : r.result === 'draw' ? XP_RATES.chess_draw : 0),
      key: `chess-${r.date}-${i}`,
      iconBg: CAT_COLORS.sport.bg,
    })
  })

  // Volleyball
  ;(volleyball.data ?? []).forEach((r: { date: string; win: boolean }, i: number) => {
    events.push({
      date: r.date,
      label: `Volleyball — ${r.win ? 'Win' : 'Loss'}`,
      icon: <VolleyballIcon size={18} color={CAT_COLORS.sport.icon} />,
      xp: XP_RATES.volleyball_game + (r.win ? XP_RATES.volleyball_win : 0),
      key: `vb-${r.date}-${i}`,
      iconBg: CAT_COLORS.sport.bg,
    })
  })

  // Spikeball
  ;(spikeball.data ?? []).forEach((r: { date: string; win: boolean }, i: number) => {
    events.push({
      date: r.date,
      label: `Spikeball — ${r.win ? 'Win' : 'Loss'}`,
      icon: <SpikeballIcon size={18} color={CAT_COLORS.sport.icon} />,
      xp: XP_RATES.spikeball_game + (r.win ? XP_RATES.spikeball_win : 0),
      key: `sb-${r.date}-${i}`,
      iconBg: CAT_COLORS.sport.bg,
    })
  })

  // Pool
  ;(pool.data ?? []).forEach((r: { date: string; win: boolean; break_and_run: boolean }, i: number) => {
    events.push({
      date: r.date,
      label: `Pool — ${r.win ? 'Win' : 'Loss'}${r.break_and_run ? ' · B&R' : ''}`,
      icon: <PoolIcon size={18} color={CAT_COLORS.sport.icon} />,
      xp: XP_RATES.pool_game + (r.win ? XP_RATES.pool_win : 0) + (r.break_and_run ? XP_RATES.pool_break_and_run : 0),
      key: `pool-${r.date}-${i}`,
      iconBg: CAT_COLORS.sport.bg,
    })
  })

  // Mood logs
  ;(mood.data ?? []).forEach((r: { date: string }, i: number) => {
    events.push({
      date: r.date,
      label: 'Mood logged',
      icon: <BrainIcon size={18} color={CAT_COLORS.mood.icon} />,
      xp: XP_RATES.mood_log,
      key: `mood-${r.date}-${i}`,
      iconBg: CAT_COLORS.mood.bg,
    })
  })

  // Water goal — group by date, award XP for days hitting 64 oz
  const waterByDate: Record<string, number> = {}
  for (const r of (water.data ?? []) as { date: string; oz: number }[]) {
    waterByDate[r.date] = (waterByDate[r.date] ?? 0) + Number(r.oz)
  }
  for (const [date, oz] of Object.entries(waterByDate)) {
    if (oz >= 64) {
      events.push({
        date,
        label: `Water goal · ${oz} oz`,
        icon: <DropletIcon size={18} color={CAT_COLORS.water.icon} />,
        xp: XP_RATES.water_goal_reached,
        key: `water-${date}`,
        iconBg: CAT_COLORS.water.bg,
      })
    }
  }

  // Body measurements
  ;(measurements.data ?? []).forEach((r: { date: string }, i: number) => {
    events.push({
      date: r.date,
      label: 'Body measurements logged',
      icon: <RulerIcon size={18} color={CAT_COLORS.measure.icon} />,
      xp: XP_RATES.measurement_log,
      key: `meas-${r.date}-${i}`,
      iconBg: CAT_COLORS.measure.bg,
    })
  })

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

export function XPHistoryContent() {
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
              style={{ padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: 'var(--surface-0)', border: 'none', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', paddingTop: 40 }}>Loading…</p>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center py-16 fade-in" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16, opacity: 0.3 }}><ZapIcon size={48} color="var(--text-secondary)" /></div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>No XP earned yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 240, lineHeight: 1.6 }}>
              Log a workout, finish a book, or get some sleep — every action earns XP.
            </p>
          </div>
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
    </>
  )
}
