import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { usePageTitle } from '../hooks/usePageTitle'
import { useStore } from '../store/useStore'
import type { RawActivityData } from '../store/useStore'
import { XP_RATES } from '../lib/xp'
import { CHART_TOOLTIP_STYLE, localDateStr } from '../lib/utils'
import { CalendarIcon } from '../components/ui/Icon'
import { EmptyState } from '../components/ui/EmptyState'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

const CELL = 11
const GAP  = 2

interface DayEvent { date: string; category: string }

/** Flatten every dated row across all tables into (date, category) events. */
function collectEvents(r: RawActivityData): DayEvent[] {
  const out: DayEvent[] = []
  const push = (dates: (string | null | undefined)[], category: string) => {
    for (const d of dates) if (d) out.push({ date: d, category })
  }
  push(r.liftingRows.map(x => x.date), 'Lifting')
  push(r.cardioRows.map(x => x.date),  'Cardio')
  push(r.skateRows.map(x => x.date),   'Cardio')
  push(r.hikeRows.map(x => x.date),    'Cardio')
  push(r.sleepRows.map(x => x.date),   'Sleep')
  push(r.moodRows.map(x => x.date),    'Wellness')
  push(r.waterRows.map(x => x.date),   'Wellness')
  push(r.bookRows.map(x => x.date_finished), 'Reading')
  push(r.gameRows.map(x => x.date),    'Gaming')
  push(r.bbRows.map(x => x.date),      'Sports')
  push(r.pbRows.map(x => x.date),      'Sports')
  push(r.golfRows.map(x => x.date),    'Sports')
  push(r.dgRows.map(x => x.date),      'Sports')
  push(r.ttRows.map(x => x.date),      'Sports')
  push(r.chessRows.map(x => x.date),   'Sports')
  push(r.poolRows.map(x => x.date),    'Sports')
  push(r.vbRows.map(x => x.date),      'Sports')
  push(r.sbRows.map(x => x.date),      'Sports')
  return out
}

/** XP earned within a year, recomputed from raw rows with the same rates as xp.ts.
 *  Excludes quest/goal/measurement XP (no dates in rawRows) — close, not exact. */
function xpForYear(r: RawActivityData, year: number): number {
  const inYear = (d: string | null | undefined) => !!d && d.startsWith(`${year}-`)

  const lifting = r.liftingRows.filter(x => inYear(x.date))
  const setXP   = lifting.length * XP_RATES.per_set
  const dayXP   = new Set(lifting.map(x => x.date)).size * XP_RATES.workout_day
  const prXP    = r.prRows.filter(x => inYear(x.date)).length * XP_RATES.new_pr
  const bookXP  = r.bookRows.filter(x => inYear(x.date_finished)).length * XP_RATES.book_finished
  const skateXP = r.skateRows.filter(x => inYear(x.date)).reduce((s, x) => s + (x.miles ?? 0), 0) * XP_RATES.skate_per_mile
  const fnXP    = r.gameRows.filter(x => inYear(x.date)).reduce((s, x) => {
    const isBlitz = typeof x.mode === 'string' && (x.mode === 'Blitz' || x.mode.startsWith('Blitz '))
    return s + (x.win ? (isBlitz ? XP_RATES.fortnite_blitz_win : XP_RATES.fortnite_win) : 0) + (x.kills ?? 0) * XP_RATES.fortnite_kill
  }, 0)
  const sleepXP = r.sleepRows.filter(x => inYear(x.date)).reduce(
    (s, x) => s + XP_RATES.sleep_log + ((x.hours_slept ?? 0) >= 7 ? XP_RATES.sleep_quality_bonus : 0), 0)
  const cardioXP = r.cardioRows.filter(x => inYear(x.date)).reduce((s, x) => {
    const rate = x.activity === 'run'  ? XP_RATES.cardio_run_per_mile
               : x.activity === 'bike' ? XP_RATES.cardio_bike_per_mile
               : x.activity === 'swim' ? XP_RATES.cardio_swim_per_mile
               : x.activity === 'walk' ? XP_RATES.cardio_walk_per_mile
               : XP_RATES.cardio_per_mile
    return s + (x.distance_miles ?? 0) * rate
  }, 0)
  const moodXP  = r.moodRows.filter(x => inYear(x.date)).length * XP_RATES.mood_log
  const waterXP = (() => {
    const byDate: Record<string, number> = {}
    for (const x of r.waterRows) if (inYear(x.date)) byDate[x.date] = (byDate[x.date] ?? 0) + Number(x.oz)
    return Object.values(byDate).filter(oz => oz >= 64).length * XP_RATES.water_goal_reached
  })()
  const bbXP   = r.bbRows.filter(x => inYear(x.date)).reduce((s, x) => s + XP_RATES.basketball_session + (x.points ?? 0) * XP_RATES.basketball_per_point, 0)
  const pbXP   = r.pbRows.filter(x => inYear(x.date)).reduce((s, x) => s + XP_RATES.pickleball_game + (x.win ? XP_RATES.pickleball_win : 0), 0)
  const golfXP = r.golfRows.filter(x => inYear(x.date)).reduce((s, x) => {
    const vsP = x.score - x.par
    return s + XP_RATES.golf_round + (vsP < 0 ? Math.abs(vsP) * XP_RATES.golf_under_par : 0)
  }, 0)
  const dgXP   = r.dgRows.filter(x => inYear(x.date)).reduce((s, x) => {
    const vsP = x.score - x.par
    return s + XP_RATES.disc_golf_round + (vsP < 0 ? Math.abs(vsP) * XP_RATES.disc_golf_under_par : 0)
  }, 0)
  const hikeXP = r.hikeRows.filter(x => inYear(x.date)).reduce(
    (s, x) => s + (x.distance_miles ?? 0) * XP_RATES.hiking_per_mile + Math.floor((x.elevation_gain_ft ?? 0) / 500) * XP_RATES.hiking_per_500ft, 0)
  const ttXP   = r.ttRows.filter(x => inYear(x.date)).reduce((s, x) => s + XP_RATES.table_tennis_game + (x.win ? XP_RATES.table_tennis_win : 0), 0)
  const chessXP = r.chessRows.filter(x => inYear(x.date)).reduce(
    (s, x) => s + XP_RATES.chess_game + (x.result === 'win' ? XP_RATES.chess_win : 0) + (x.result === 'draw' ? XP_RATES.chess_draw : 0), 0)
  const vbXP   = r.vbRows.filter(x => inYear(x.date)).reduce((s, x) => s + XP_RATES.volleyball_game + (x.win ? XP_RATES.volleyball_win : 0), 0)
  const sbXP   = r.sbRows.filter(x => inYear(x.date)).reduce((s, x) => s + XP_RATES.spikeball_game + (x.win ? XP_RATES.spikeball_win : 0), 0)
  const poolXP = r.poolRows.filter(x => inYear(x.date)).reduce(
    (s, x) => s + XP_RATES.pool_game + (x.win ? XP_RATES.pool_win : 0) + (x.break_and_run ? XP_RATES.pool_break_and_run : 0), 0)

  return Math.round(setXP + dayXP + prXP + bookXP + skateXP + fnXP + sleepXP + cardioXP + moodXP + waterXP + bbXP + pbXP + golfXP + dgXP + hikeXP + ttXP + chessXP + vbXP + sbXP + poolXP)
}

function intensityLevel(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3)  return 2
  if (count <= 6)  return 3
  return 4
}

const LEVEL_BG = [
  'var(--surface-2)',
  'color-mix(in srgb, var(--accent) 25%, var(--surface-2))',
  'color-mix(in srgb, var(--accent) 45%, var(--surface-2))',
  'color-mix(in srgb, var(--accent) 70%, var(--surface-2))',
  'var(--accent)',
]

interface WeekCol {
  days: { date: string; count: number; inYear: boolean }[]
  monthStart: number | null   // month index if the 1st falls in this column
}

function buildGrid(year: number, dayCounts: Record<string, number>): WeekCol[] {
  const jan1  = new Date(year, 0, 1)
  const dec31 = new Date(year, 11, 31)
  // Back up to the Monday on/before Jan 1
  const start = new Date(jan1)
  const dow = (start.getDay() + 6) % 7   // 0 = Monday
  start.setDate(start.getDate() - dow)

  const weeks: WeekCol[] = []
  const cursor = new Date(start)
  while (cursor <= dec31) {
    const col: WeekCol = { days: [], monthStart: null }
    for (let i = 0; i < 7; i++) {
      const dateStr = localDateStr(cursor)
      const inYear = cursor.getFullYear() === year
      col.days.push({ date: dateStr, count: dayCounts[dateStr] ?? 0, inYear })
      if (inYear && cursor.getDate() === 1) col.monthStart = cursor.getMonth()
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(col)
  }
  return weeks
}

function longestStreakInYear(activeDates: Set<string>, year: number): number {
  const dates = [...activeDates].filter(d => d.startsWith(`${year}-`)).sort()
  let best = 0, run = 0
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) { run = 1 } else {
      const prev = new Date(dates[i - 1] + 'T12:00:00')
      const curr = new Date(dates[i]     + 'T12:00:00')
      const gap  = Math.round((curr.getTime() - prev.getTime()) / 86400000)
      run = gap === 1 ? run + 1 : 1
    }
    if (run > best) best = run
  }
  return best
}

export function Yearly() {
  usePageTitle('Yearly')
  const rawRows = useStore(s => s.rawRows)

  const events = useMemo(() => (rawRows ? collectEvents(rawRows) : []), [rawRows])

  const years = useMemo(() => {
    const set = new Set(events.map(e => parseInt(e.date.slice(0, 4))))
    set.add(new Date().getFullYear())
    return [...set].filter(y => y >= 2000 && y <= 2100).sort((a, b) => b - a)
  }, [events])

  const [year, setYear] = useState(() => new Date().getFullYear())
  const [selected, setSelected] = useState<{ date: string; count: number } | null>(null)

  const yearEvents = useMemo(() => events.filter(e => e.date.startsWith(`${year}-`)), [events, year])

  const dayCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const e of yearEvents) m[e.date] = (m[e.date] ?? 0) + 1
    return m
  }, [yearEvents])

  const grid = useMemo(() => buildGrid(year, dayCounts), [year, dayCounts])

  const activeDates = useMemo(() => new Set(Object.keys(dayCounts)), [dayCounts])
  const yearXP      = useMemo(() => (rawRows ? xpForYear(rawRows, year) : 0), [rawRows, year])
  const streak      = useMemo(() => longestStreakInYear(activeDates, year), [activeDates, year])

  const topCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of yearEvents) counts[e.category] = (counts[e.category] ?? 0) + 1
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return top ? top[0] : null
  }, [yearEvents])

  const monthData = useMemo(() =>
    MONTHS.map((label, i) => ({
      label,
      count: yearEvents.filter(e => parseInt(e.date.slice(5, 7)) === i + 1).length,
    })), [yearEvents])

  // Scroll the heatmap to the current week on mount (mobile sees recent months)
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current && year === new Date().getFullYear()) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [year, grid.length])

  const fmt = (d: string) => {
    const [, m, day] = d.split('-')
    return `${MONTHS[parseInt(m) - 1]} ${parseInt(day)}`
  }

  return (
    <>
      <TopBar title="Yearly" back backTo="/more" />
      <PageWrapper>

        {/* Year switcher */}
        {years.length > 1 && (
          <div className="flex gap-2 mb-4">
            {years.map(y => (
              <button
                key={y}
                type="button"
                onClick={() => { setYear(y); setSelected(null) }}
                className="px-4 py-1.5 rounded-full text-xs font-semibold font-mono"
                style={{
                  background: year === y ? 'var(--accent)' : 'var(--input-bg)',
                  color: year === y ? 'var(--base-bg)' : 'var(--text-muted)',
                  border: `1px solid ${year === y ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Heatmap */}
        <Card className="mb-4" style={{ padding: '16px 12px' }}>
          <p className="font-bold mb-3" style={{ fontSize: 15, color: 'var(--text-primary)', paddingLeft: 4 }}>
            {year} Activity
          </p>

          <div className="flex" style={{ gap: 6 }}>
            {/* Weekday labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, paddingTop: 16, flexShrink: 0 }}>
              {DAY_LABELS.map((label, i) => (
                <div key={i} style={{ height: CELL, fontSize: 8, color: 'var(--text-tertiary)', lineHeight: `${CELL}px`, width: 22, fontFamily: 'var(--font-mono)' }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Scrollable grid */}
            <div ref={scrollRef} style={{ overflowX: 'auto', paddingBottom: 4 }}>
              {/* Month labels */}
              <div style={{ display: 'flex', gap: GAP, height: 14, marginBottom: 2 }}>
                {grid.map((col, i) => (
                  <div key={i} style={{ width: CELL, flexShrink: 0, position: 'relative' }}>
                    {col.monthStart != null && (
                      <span style={{ position: 'absolute', left: 0, fontSize: 8, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                        {MONTHS[col.monthStart]}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: GAP }}>
                {grid.map((col, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: GAP, flexShrink: 0 }}>
                    {col.days.map(day => (
                      <button
                        key={day.date}
                        type="button"
                        aria-label={`${fmt(day.date)}: ${day.count} ${day.count === 1 ? 'activity' : 'activities'}`}
                        title={`${fmt(day.date)} — ${day.count}`}
                        onClick={() => day.inYear && setSelected({ date: day.date, count: day.count })}
                        style={{
                          width: CELL, height: CELL, borderRadius: 3, padding: 0,
                          border: selected?.date === day.date ? '1px solid var(--text-primary)' : 'none',
                          background: day.inYear ? LEVEL_BG[intensityLevel(day.count)] : 'transparent',
                          cursor: day.inYear ? 'pointer' : 'default',
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected day + legend */}
          <div className="flex items-center justify-between mt-3" style={{ paddingLeft: 4 }}>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', minHeight: 14 }}>
              {selected
                ? <>{fmt(selected.date)}, {year} — <span className="font-mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>{selected.count}</span> {selected.count === 1 ? 'activity' : 'activities'}</>
                : <span style={{ color: 'var(--text-muted)' }}>Tap a day for details</span>}
            </p>
            <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
              <span style={{ fontSize: 8, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>Less</span>
              {LEVEL_BG.map((bg, i) => (
                <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: bg }} />
              ))}
              <span style={{ fontSize: 8, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>More</span>
            </div>
          </div>
        </Card>

        {/* Year totals */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: `XP in ${year}`,   value: yearXP.toLocaleString() },
            { label: 'Active Days',     value: activeDates.size },
            { label: 'Longest Streak',  value: streak ? `${streak}d` : '—' },
            { label: 'Top Category',    value: topCategory ?? '—' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center card-animate" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
              <p className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.1 }}>{s.value}</p>
              <p className="section-label mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Per-month activity */}
        {yearEvents.length > 0 && (
          <Card className="mb-4">
            <p className="font-bold mb-3" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Activities by Month</p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={monthData} barGap={2}>
                <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 8 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={26} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'var(--border-subtle)' }} formatter={(v: number) => [v, 'Activities']} />
                <Bar dataKey="count" fill="var(--accent)" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {yearEvents.length === 0 && (
          <EmptyState
            icon={<CalendarIcon size={56} color="var(--text-muted)" />}
            title={`No activity in ${year}`}
            sub="Log anything — a set, a mile, a night of sleep — and it lights up here."
          />
        )}

      </PageWrapper>
    </>
  )
}
