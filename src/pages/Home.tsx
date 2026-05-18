import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useXP } from '../hooks/useXP'
import { useStats } from '../hooks/useStats'
import { useCountUp } from '../hooks/useCountUp'
import { useStreak } from '../hooks/useStreak'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { formatDate, toRoman, localDateStr, today as appToday } from '../lib/utils'
import { ArrowUpIcon, ArrowDownIcon, ActivityIconComp } from '../components/ui/Icon'
import { PRHeroSkeleton, SecondaryStatSkeleton, ActivityRowSkeleton } from '../components/ui/Skeleton'
import { xpForLevel, getLevelTitle } from '../lib/xp'
import { checkStreakBreakWarning } from '../lib/notifications'
import { useStrengthSnapshot } from '../components/StrengthTab'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { useUserName } from '../hooks/useUserName'
import { useWellnessScore } from '../hooks/useWellnessScore'

// ── Types ─────────────────────────────────────────────────────
type TrendDir = 'up' | 'down' | 'flat'

interface TrendResult {
  dirs:      Record<string, TrendDir>
  prDeltas:  { bench: number | null; squat: number | null; deadlift: number | null }
}

// ── Stat picker config ────────────────────────────────────────
const HOME_STATS_KEY = 'youxp-home-stat-picks'
const DEFAULT_STAT_PICKS = ['bench', 'squat', 'deadlift', 'sleep_avg', 'miles', 'wins']

const STAT_DEFS = [
  // Lifting
  { id: 'bench',       label: 'Bench PR',        unit: 'lbs',     section: 'Lifting'  },
  { id: 'squat',       label: 'Squat PR',         unit: 'lbs',     section: 'Lifting'  },
  { id: 'deadlift',    label: 'Deadlift PR',      unit: 'lbs',     section: 'Lifting'  },
  { id: 'ohp',         label: 'OHP PR',           unit: 'lbs',     section: 'Lifting'  },
  { id: 'strength',    label: 'Strength Score',   unit: '/100',    section: 'Lifting'  },
  { id: 'total_sets',  label: 'Sets Logged',      unit: '',        section: 'Lifting'  },
  // Cardio
  { id: 'cardio_miles',label: 'Cardio Miles',     unit: 'mi',      section: 'Cardio'   },
  { id: 'run_miles',   label: 'Run Miles',        unit: 'mi',      section: 'Cardio'   },
  { id: 'hike_miles',  label: 'Hike Miles',       unit: 'mi',      section: 'Cardio'   },
  // Skating
  { id: 'miles',       label: 'Skate Miles',      unit: 'mi',      section: 'Skating'  },
  // Wellness
  { id: 'sleep_avg',   label: 'Sleep Avg',        unit: 'hrs',     section: 'Wellness' },
  { id: 'mood_avg',    label: 'Mood Avg',         unit: '/10',     section: 'Wellness' },
  { id: 'water_today', label: 'Water Today',      unit: 'oz',      section: 'Wellness' },
  { id: 'weight',      label: 'Bodyweight',       unit: 'lbs',     section: 'Wellness' },
  { id: 'body_fat',    label: 'Body Fat',         unit: '%',       section: 'Wellness' },
  // Books
  { id: 'books',       label: 'Books This Year',  unit: '',        section: 'Books'    },
  // Sports
  { id: 'basketball',  label: 'Basketball',       unit: 'games',   section: 'Sports'   },
  { id: 'pickleball',  label: 'Pickleball',       unit: 'games',   section: 'Sports'   },
  { id: 'golf',        label: 'Golf',             unit: 'rounds',  section: 'Sports'   },
  { id: 'disc_golf',   label: 'Disc Golf',        unit: 'rounds',  section: 'Sports'   },
  { id: 'chess',       label: 'Chess',            unit: 'games',   section: 'Sports'   },
  { id: 'pool',        label: 'Pool',             unit: 'games',   section: 'Sports'   },
  // Gaming
  { id: 'wins',        label: 'FN Wins',          unit: '',        section: 'Gaming'   },
  { id: 'fn_games',    label: 'FN Games',         unit: '',        section: 'Gaming'   },
  { id: 'fn_kills',    label: 'FN Avg Kills',     unit: '',        section: 'Gaming'   },
] as const

type StatId = typeof STAT_DEFS[number]['id']

// ── Trend arrow ───────────────────────────────────────────────
function TrendArrow({ direction }: { direction: TrendDir }) {
  if (direction === 'up')   return <ArrowUpIcon   size={10} color="var(--green)" style={{ marginLeft: 3 }} />
  if (direction === 'down') return <ArrowDownIcon size={10} color="var(--red)"   style={{ marginLeft: 3 }} />
  return null
}

function fmtAgo(ts: number | null): string | null {
  if (!ts) return null
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Trend cache ───────────────────────────────────────────────
let trendsCache: { data: TrendResult; ts: number } | null = null
const TRENDS_TTL = 5 * 60 * 1000

function useTrends(): TrendResult {
  const empty: TrendResult = { dirs: {}, prDeltas: { bench: null, squat: null, deadlift: null } }
  const [trends, setTrends] = useState<TrendResult>(trendsCache?.data ?? empty)

  useEffect(() => {
    if (trendsCache && Date.now() - trendsCache.ts < TRENDS_TTL) return

    let cancelled = false
    async function load() {
      const now            = new Date()
      const thisMonthStart = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
      const lastMonthStart = localDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      const lastMonthEnd   = localDateStr(new Date(now.getFullYear(), now.getMonth(), 0))
      const thirtyDaysAgo  = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30))
      const sixtyDaysAgo   = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60))

      const [skateThis, skateLast, booksThis, booksLast, winsThis, winsLast, prsRecent, prsPrev] = await Promise.all([
        supabase.from('skate_sessions').select('miles').gte('date', thisMonthStart),
        supabase.from('skate_sessions').select('miles').gte('date', lastMonthStart).lte('date', lastMonthEnd),
        supabase.from('books').select('id').not('date_finished', 'is', null).gte('date_finished', thisMonthStart),
        supabase.from('books').select('id').not('date_finished', 'is', null).gte('date_finished', lastMonthStart).lte('date_finished', lastMonthEnd),
        supabase.from('fortnite_games').select('id').eq('win', true).gte('date', thisMonthStart),
        supabase.from('fortnite_games').select('id').eq('win', true).gte('date', lastMonthStart).lte('date', lastMonthEnd),
        supabase.from('pr_history').select('lift, est_1rm').gte('date', thirtyDaysAgo),
        supabase.from('pr_history').select('lift, est_1rm').gte('date', sixtyDaysAgo).lt('date', thirtyDaysAgo),
      ])

      const dir = (a: number, b: number): TrendDir =>
        a > b * 1.05 ? 'up' : a < b * 0.95 ? 'down' : 'flat'

      const skateMilesThis = (skateThis.data ?? []).reduce((s: number, r: { miles: number }) => s + r.miles, 0)
      const skateMilesLast = (skateLast.data ?? []).reduce((s: number, r: { miles: number }) => s + r.miles, 0)

      const bestPR = (rows: { lift: string; est_1rm: number }[], lift: string) =>
        (rows ?? []).filter(r => r.lift === lift).reduce((m, r) => Math.max(m, r.est_1rm), 0)

      const recentRows = prsRecent.data ?? []
      const prevRows   = prsPrev.data ?? []

      const calcDelta = (lift: string): number | null => {
        const recent = bestPR(recentRows, lift)
        const prev   = bestPR(prevRows, lift)
        if (recent === 0) return null
        const delta = Math.round((recent - prev) * 10) / 10
        return delta !== 0 ? delta : null
      }

      const result: TrendResult = {
        dirs: {
          bench:    dir(bestPR(recentRows, 'Bench'),    bestPR(prevRows, 'Bench')),
          squat:    dir(bestPR(recentRows, 'Squat'),    bestPR(prevRows, 'Squat')),
          deadlift: dir(bestPR(recentRows, 'Deadlift'), bestPR(prevRows, 'Deadlift')),
          miles:    dir(skateMilesThis, skateMilesLast),
          books:    dir(booksThis.data?.length ?? 0, booksLast.data?.length ?? 0),
          wins:     dir(winsThis.data?.length ?? 0, winsLast.data?.length ?? 0),
        },
        prDeltas: {
          bench:    calcDelta('Bench'),
          squat:    calcDelta('Squat'),
          deadlift: calcDelta('Deadlift'),
        },
      }

      trendsCache = { data: result, ts: Date.now() }
      if (!cancelled) setTrends(result)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return trends
}

// ── Week Dot Strip ────────────────────────────────────────────
function WeekDotStrip({ activityDates, streak }: {
  activityDates: Set<string>
  streak: { current: number; longest: number; loading: boolean }
}) {
  const todayStr  = appToday()
  const todayDate = new Date(todayStr + 'T12:00:00')
  const dow       = todayDate.getDay() // 0=Sun
  const monOffset = dow === 0 ? -6 : 1 - dow

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const days = DAY_LABELS.map((label, i) => {
    const d = new Date(todayDate)
    d.setDate(d.getDate() + monOffset + i)
    const dateStr = localDateStr(d)
    return { label, dateStr, isToday: dateStr === todayStr, isActive: activityDates.has(dateStr) }
  })

  return (
    <div className="flex items-center justify-between mb-5 px-1">
      {/* Day squares */}
      <div className="flex gap-1">
        {days.map((day, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: day.isActive ? 'var(--accent)' : 'var(--input-bg)',
              outline: day.isToday ? '1.5px solid var(--border)' : 'none',
              outlineOffset: 2,
              boxShadow: day.isActive ? '0 0 10px var(--accent-dim)' : 'none',
              transition: 'background 0.2s ease, box-shadow 0.2s ease',
            }} />
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.02em',
              color: day.isToday ? 'var(--text-primary)' : 'var(--text-dim)',
            }}>
              {day.label}
            </span>
          </div>
        ))}
      </div>

      {/* Streak info */}
      {!streak.loading && (
        <div style={{ textAlign: 'right', paddingLeft: 10 }}>
          <p style={{
            fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700,
            color: streak.current > 0 ? 'var(--accent)' : 'var(--text-muted)', lineHeight: 1,
          }}>
            {streak.current}
          </p>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>day streak</p>
          {streak.longest > 0 && (
            <p style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 1 }}>
              best {streak.longest}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Stats Picker Modal ────────────────────────────────────────
function StatsPickerModal({ picks, onChange, onClose }: {
  picks: StatId[]
  onChange: (picks: StatId[]) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<StatId[]>(picks)

  const toggle = (id: StatId) => {
    setLocal(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const save = () => { onChange(local); onClose() }

  // Group by section
  const sections = Array.from(new Set(STAT_DEFS.map(d => d.section)))

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)',
      }} />

      {/* Sheet */}
      <div className="pop-in" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg-mid)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 20px 44px',
        border: '1px solid var(--border)',
        borderBottom: 'none',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)',
          margin: '0 auto 18px' }} />

        <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700,
            color: 'var(--text-primary)' }}>
            Customize Stats
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{local.length} selected</p>
        </div>

        {sections.map(section => (
          <div key={section} style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
              {section}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STAT_DEFS.filter(d => d.section === section).map(def => {
                const active = local.includes(def.id)
                return (
                  <button key={def.id} onClick={() => toggle(def.id)} style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: active ? 'var(--accent-dim)' : 'var(--input-bg)',
                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}>
                    {def.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '13px',
            background: 'var(--input-bg)', color: 'var(--text-secondary)',
            border: '1px solid var(--border)', borderRadius: 12,
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={save} style={{
            flex: 2, padding: '13px',
            background: 'var(--accent)', color: '#0d0d1a',
            border: 'none', borderRadius: 12,
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
            fontFamily: 'Cinzel, serif', letterSpacing: '0.04em',
          }}>
            Save
          </button>
        </div>
      </div>
    </>
  )
}

// ── Category colors ───────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  lifting:  'var(--accent)',
  cardio:   '#3b82f6',
  sleep:    '#818cf8',
  mood:     '#f472b6',
  wellness: '#34d399',
  books:    '#fbbf24',
  sports:   '#f97316',
  gaming:   '#a78bfa',
}

// ── PR Hero Card ──────────────────────────────────────────────
function PRHeroCard({ label, value, unit = 'lbs', trendDir, delta, to, color }: {
  label: string; value: string | number; unit?: string
  trendDir?: TrendDir; delta?: number | null; to?: string; color?: string
}) {
  const num      = typeof value === 'number' ? value : parseFloat(String(value))
  const isNum    = !isNaN(num)
  const decimals = String(value).includes('.') ? (String(value).split('.')[1]?.length ?? 0) : 0
  const animated = useCountUp(isNum ? num : 0, 900, decimals)

  const borderColor = color ?? 'var(--accent)'
  const inner = (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 14, padding: '14px 16px',
      boxShadow: 'var(--card-shadow)',
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        letterSpacing: '-0.01em', marginBottom: 6 }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, lineHeight: 1 }}>
        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, fontWeight: 700, color: borderColor }}>
          {isNum ? animated : value}
        </span>
        {trendDir && trendDir !== 'flat' && <TrendArrow direction={trendDir} />}
      </div>
      {unit && <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.10em', marginTop: 2 }}>{unit}</p>}
      {delta != null && (
        <p style={{ fontSize: 10, color: delta > 0 ? 'var(--green)' : 'var(--red)', marginTop: 4 }}>
          {delta > 0 ? `↑ ${delta} lbs this month` : `↓ ${Math.abs(delta)} lbs this month`}
        </p>
      )}
    </div>
  )
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

// ── Secondary stat card (2×2 grid) ───────────────────────────
function SecondaryStatCard({ label, value, unit, trendDir, to, color }: {
  label: string; value: string | number; unit?: string; trendDir?: TrendDir; to?: string; delta?: number | null; color?: string
}) {
  const num      = typeof value === 'number' ? value : parseFloat(String(value))
  const isNum    = !isNaN(num)
  const decimals = String(value).includes('.') ? (String(value).split('.')[1]?.length ?? 0) : 0
  const animated = useCountUp(isNum ? num : 0, 900, decimals)

  const borderColor = color ?? 'var(--accent)'
  const inner = (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 12, padding: '12px 14px',
      boxShadow: 'var(--card-shadow)',
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        letterSpacing: '-0.01em', marginBottom: 4 }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, lineHeight: 1 }}>
        <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 20, fontWeight: 700, color: borderColor }}>
          {isNum ? animated : value}
        </span>
        {trendDir && trendDir !== 'flat' && <TrendArrow direction={trendDir} />}
      </div>
      {unit && <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.10em', marginTop: 2 }}>{unit}</p>}
    </div>
  )

  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

// ── Wellness Score widget ─────────────────────────────────────
function WellnessWidget() {
  const w = useWellnessScore()
  if (w.loading || !w.hasSomeData) return null

  const COMPONENTS = [
    { label: 'Sleep',    value: w.sleep,    max: 40, color: '#818cf8' },
    { label: 'Activity', value: w.activity, max: 30, color: 'var(--accent)' },
    { label: 'Mood',     value: w.mood,     max: 20, color: '#f472b6' },
    { label: 'Water',    value: w.water,    max: 10, color: '#34d399' },
  ]

  const pct   = w.total / 100
  const grade = w.total >= 80 ? 'Great' : w.total >= 60 ? 'Good' : w.total >= 40 ? 'Fair' : 'Low'
  const gradeColor = w.total >= 80 ? '#34d399' : w.total >= 60 ? 'var(--accent)' : w.total >= 40 ? '#fbbf24' : '#f87171'

  return (
    <div className="mb-5 rounded-xl p-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
          Weekly Wellness
        </p>
        <div className="flex items-baseline gap-1">
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 700, color: gradeColor }}>{w.total}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/100</span>
          <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: gradeColor + '22', color: gradeColor }}>{grade}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, borderRadius: 3, background: 'var(--input-bg)', marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: gradeColor, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>

      {/* Component breakdown */}
      <div className="grid grid-cols-4 gap-2">
        {COMPONENTS.map(c => (
          <div key={c.label} className="flex flex-col items-center gap-1">
            <div style={{ height: 28, width: '100%', background: 'var(--input-bg)', borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '100%', height: `${(c.value / c.max) * 100}%`, background: c.color, transition: 'height 0.8s ease' }} />
            </div>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>{c.label}</p>
            <p style={{ fontSize: 10, fontWeight: 700, color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export function Home() {
  usePageTitle('Home')
  const { totalXP, level, progress, loading } = useXP()
  const { stats }       = useStats()
  const activity        = useStore(s => s.recentActivity)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const lastUpdated     = useStore(s => s.lastUpdated)
  const trends          = useTrends()
  const userName        = useUserName()
  const streak          = useStreak()

  // Stat picker
  const [statPicks, setStatPicks] = useState<StatId[]>(() => {
    try {
      const saved = localStorage.getItem(HOME_STATS_KEY)
      return saved ? JSON.parse(saved) : DEFAULT_STAT_PICKS
    } catch { return DEFAULT_STAT_PICKS as StatId[] }
  })
  const [showPicker,     setShowPicker]     = useState(false)
  const [showUpdatedChip, setShowUpdatedChip] = useState(false)

  // Show auto-dismiss "Data updated" chip after background refresh
  const isFirstUpdate = useRef(true)
  useEffect(() => {
    if (!lastUpdated) return
    if (isFirstUpdate.current) { isFirstUpdate.current = false; return }
    setShowUpdatedChip(true)
    const id = setTimeout(() => setShowUpdatedChip(false), 2500)
    return () => clearTimeout(id)
  }, [lastUpdated])

  const savePicks = (picks: StatId[]) => {
    setStatPicks(picks)
    localStorage.setItem(HOME_STATS_KEY, JSON.stringify(picks))
  }

  useEffect(() => {
    if (!streak.loading) checkStreakBreakWarning(streak.current, streak.activeToday)
  }, [streak.loading, streak.current, streak.activeToday])

  const toNext       = xpForLevel(level + 1) - totalXP
  const { refreshing, pullDistance, threshold } = usePullToRefresh(async () => {
    await Promise.all([refreshXP(), refreshActivity()])
  })
  const levelStyle   = (localStorage.getItem('youxp-level-style') as 'number' | 'roman') ?? 'number'
  const displayLevel = loading ? '—' : levelStyle === 'roman' ? toRoman(level) : String(level)
  const title        = getLevelTitle(level)
  const { sq: strengthSQ } = useStrengthSnapshot()
  const animatedXP   = useCountUp(loading ? 0 : totalXP, 1200)

  // Ring fill animation — start at 0, transition to real value after mount
  const [ringProgress, setRingProgress] = useState(0)
  useEffect(() => {
    if (loading) return
    const id = setTimeout(() => setRingProgress(progress), 60)
    return () => clearTimeout(id)
  }, [loading, progress])

  // Derive which days this week had activity
  const activityDates = useMemo(() => new Set(activity.map(a => a.date)), [activity])

  // Build card props for a given stat ID
  const getCardProps = (id: StatId) => {
    const yr = new Date().getFullYear()
    switch (id) {
      case 'bench':        return { label: 'Bench PR',       value: stats.benchPR    ? stats.benchPR.toFixed(1)    : '—', unit: 'lbs',  trendDir: trends.dirs['bench']    as TrendDir, delta: trends.prDeltas.bench,    to: '/records',      color: CAT_COLORS.lifting  }
      case 'squat':        return { label: 'Squat PR',       value: stats.squatPR    ? stats.squatPR.toFixed(1)    : '—', unit: 'lbs',  trendDir: trends.dirs['squat']    as TrendDir, delta: trends.prDeltas.squat,    to: '/records',      color: CAT_COLORS.lifting  }
      case 'deadlift':     return { label: 'Deadlift PR',    value: stats.deadliftPR ? stats.deadliftPR.toFixed(1) : '—', unit: 'lbs',  trendDir: trends.dirs['deadlift'] as TrendDir, delta: trends.prDeltas.deadlift, to: '/records',      color: CAT_COLORS.lifting  }
      case 'ohp':          return { label: 'OHP PR',         value: stats.ohpPR      ? stats.ohpPR.toFixed(1)      : '—', unit: 'lbs',  to: '/records',      color: CAT_COLORS.lifting  }
      case 'strength':     return { label: 'Strength Score', value: strengthSQ !== null ? String(strengthSQ) : '—', unit: '/100', to: '/strength',     color: CAT_COLORS.lifting  }
      case 'total_sets':   return { label: 'Sets Logged',    value: stats.totalSets,  to: '/lifting',      color: CAT_COLORS.lifting  }
      case 'cardio_miles': return { label: 'Cardio Miles',   value: stats.cardioMiles.toFixed(1), unit: 'mi', to: '/cardio',       color: CAT_COLORS.cardio   }
      case 'run_miles':    return { label: 'Run Miles',      value: stats.runMiles.toFixed(1),    unit: 'mi', to: '/cardio',       color: CAT_COLORS.cardio   }
      case 'hike_miles':   return { label: 'Hike Miles',     value: stats.hikeMiles.toFixed(1),   unit: 'mi', to: '/hiking',       color: CAT_COLORS.cardio   }
      case 'miles':        return { label: 'Skate Miles',    value: stats.totalMiles.toFixed(1),  unit: 'mi', trendDir: trends.dirs['miles'] as TrendDir, to: '/skate', color: CAT_COLORS.cardio   }
      case 'sleep_avg':    return { label: 'Sleep Avg (7d)', value: stats.sleepAvg7 != null ? stats.sleepAvg7.toFixed(1) : '—', unit: 'hrs', to: '/sleep',       color: CAT_COLORS.sleep    }
      case 'mood_avg':     return { label: 'Mood Avg (30d)', value: stats.moodAvg30 != null ? stats.moodAvg30.toFixed(1) : '—', unit: '/10', to: '/mood',        color: CAT_COLORS.mood     }
      case 'water_today':  return { label: 'Water Today',    value: stats.waterOzToday, unit: 'oz', to: '/water',        color: CAT_COLORS.wellness }
      case 'weight':       return { label: 'Bodyweight',     value: stats.latestWeight  != null ? stats.latestWeight.toFixed(1)  : '—', unit: 'lbs', to: '/measurements', color: CAT_COLORS.wellness }
      case 'body_fat':     return { label: 'Body Fat',       value: stats.latestBodyFat != null ? stats.latestBodyFat.toFixed(1) : '—', unit: '%',   to: '/measurements', color: CAT_COLORS.wellness }
      case 'books':        return { label: `Books ${yr}`,    value: stats.booksThisYear, trendDir: trends.dirs['books'] as TrendDir, to: '/books',  color: CAT_COLORS.books    }
      case 'basketball':   return { label: 'Basketball',     value: stats.basketballGames, unit: 'games', to: '/basketball',   color: CAT_COLORS.sports   }
      case 'pickleball':   return { label: 'Pickleball',     value: stats.pickleballGames, unit: 'games', to: '/pickleball',   color: CAT_COLORS.sports   }
      case 'golf':         return { label: 'Golf',           value: stats.golfRounds,      unit: 'rounds', to: '/golf',        color: CAT_COLORS.sports   }
      case 'disc_golf':    return { label: 'Disc Golf',      value: stats.discGolfRounds,  unit: 'rounds', to: '/disc-golf',   color: CAT_COLORS.sports   }
      case 'chess':        return { label: 'Chess',          value: stats.chessGames,      unit: 'games',  to: '/chess',       color: CAT_COLORS.sports   }
      case 'pool':         return { label: 'Pool',           value: stats.poolGames,       unit: 'games',  to: '/pool',        color: CAT_COLORS.sports   }
      case 'wins':         return { label: 'FN Wins',        value: stats.winCount,  trendDir: trends.dirs['wins'] as TrendDir, to: '/fortnite', color: CAT_COLORS.gaming   }
      case 'fn_games':     return { label: 'FN Games',       value: stats.fnGamesTotal, to: '/fortnite',     color: CAT_COLORS.gaming   }
      case 'fn_kills':     return { label: 'FN Avg Kills',   value: stats.fnKillsAvg != null ? stats.fnKillsAvg.toFixed(1) : '—', to: '/fortnite', color: CAT_COLORS.gaming   }
    }
  }

  const heroCards      = statPicks.slice(0, 2)
  const secondaryCards = statPicks.slice(2)

  return (
    <>
      <TopBar logButton />
      <PageWrapper>

        {/* ── Pull-to-refresh indicator ── */}
        {(pullDistance > 0 || refreshing) && (
          <div style={{
            position: 'fixed', top: 'calc(60px + env(safe-area-inset-top))', left: 0, right: 0,
            display: 'flex', justifyContent: 'center', zIndex: 40, pointerEvents: 'none',
            transform: `translateY(${Math.min(pullDistance, 40)}px)`,
            transition: refreshing ? 'none' : 'transform 0.1s',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(12,14,30,0.92)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}>
              {refreshing ? (
                <div className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
              ) : (
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: `2px solid ${pullDistance >= threshold ? 'var(--accent)' : '#444'}`,
                  borderTopColor: 'transparent',
                  transform: `rotate(${(pullDistance / threshold) * 360}deg)`,
                  transition: 'border-color 0.15s',
                }} />
              )}
            </div>
          </div>
        )}

        {/* ── Data-updated chip ── */}
        <div style={{
          position: 'fixed', top: 'calc(60px + env(safe-area-inset-top) + 8px)', left: '50%',
          transform: `translateX(-50%) translateY(${showUpdatedChip ? 0 : -12}px)`,
          opacity: showUpdatedChip ? 1 : 0,
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          zIndex: 50, pointerEvents: 'none',
        }}>
          <div style={{
            padding: '5px 14px', borderRadius: 20,
            background: 'var(--card-bg)', border: '1px solid var(--accent-dim)',
            color: 'var(--accent)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}>
            ✓ Data updated
          </div>
        </div>

        {/* ── Command Center Header ── */}
        <div className="flex items-center gap-4 pt-4 pb-5">

          {/* Ring SVG — tappable, navigates to Profile */}
          <Link to="/profile" style={{ flexShrink: 0, display: 'block', WebkitTapHighlightColor: 'transparent' }}>
            <svg width="100" height="100" viewBox="0 0 100 100" style={{ display: 'block' }}>
              <circle cx="50" cy="50" r="44" fill="none"
                stroke="var(--accent)" strokeWidth="2.5" opacity="0.08" />
              <circle cx="50" cy="50" r="44" fill="none"
                stroke="var(--accent)" strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 44 * Math.min(ringProgress, 1)} ${2 * Math.PI * 44 * (1 - Math.min(ringProgress, 1))}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ filter: 'drop-shadow(0 0 5px var(--accent))', transition: 'stroke-dasharray 1s ease' }}
              />
              <text x="50" y="46" textAnchor="middle" dominantBaseline="middle"
                fill="var(--accent)" fontFamily="Cinzel, serif" fontSize="26" fontWeight="700">
                {displayLevel}
              </text>
              <text x="50" y="63" textAnchor="middle" dominantBaseline="middle"
                fill="var(--text-muted)" fontSize="9" fontFamily="Inter, sans-serif"
                fontWeight="600" letterSpacing="2">
                LEVEL
              </text>
            </svg>
          </Link>

          {/* Stacked info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
              color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: 2 }}>
              {title}
            </p>
            <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700,
              color: 'var(--text-primary)', lineHeight: 1, marginBottom: 8 }}>
              {Number(animatedXP).toLocaleString()}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>XP</span>
            </p>
            <ProgressBar value={progress} height={5} glow />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
              Lv {level}{' '}
              <span style={{ color: 'var(--text-dim)', margin: '0 3px' }}>←→</span>
              {' '}{toNext.toLocaleString()} to go
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
              {streak.current > 0 && <>{streak.current} Streak · </>}
              {stats.booksThisYear} Books · {stats.winCount} Wins
              {userName && <> · {userName}XP</>}
              {(() => { const t = fmtAgo(lastUpdated); return t ? <span style={{ marginLeft: 6, opacity: 0.6 }}>· {t}</span> : null })()}
            </p>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

        {/* ── Week Dot Strip ── */}
        <WeekDotStrip activityDates={activityDates} streak={streak} />

        {/* ── Weekly Wellness ── */}
        <WellnessWidget />

        {/* ── My Stats ── */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
              My Stats
            </p>
            <button
              onClick={() => setShowPicker(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', fontSize: 11, fontWeight: 600, padding: 0,
              }}
            >
              {/* Pencil icon */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
          </div>

          {statPicks.length === 0 ? (
            <button
              onClick={() => setShowPicker(true)}
              style={{
                width: '100%', padding: '18px',
                background: 'var(--card-bg)', border: '1px dashed var(--border)',
                borderRadius: 14, cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
              }}
            >
              Tap Edit to choose which stats to display
            </button>
          ) : loading ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <PRHeroSkeleton /><PRHeroSkeleton />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[0,1,2,3].map(i => <SecondaryStatSkeleton key={i} />)}
              </div>
            </>
          ) : (
            <>
              {/* Hero cards — first 2 */}
              {heroCards.length > 0 && (
                <div className={`grid gap-3 mb-3 ${heroCards.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {heroCards.map(id => (
                    <PRHeroCard key={id} {...getCardProps(id)} />
                  ))}
                </div>
              )}

              {/* Secondary cards — rest */}
              {secondaryCards.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {secondaryCards.map(id => (
                    <SecondaryStatCard key={id} {...getCardProps(id)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Recent Activity ── */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
              Recent Activity
            </p>
            <Link to="/more" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
              See all →
            </Link>
          </div>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[0,1,2,3].map(i => <ActivityRowSkeleton key={i} />)}
            </div>
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <ActivityIconComp activityKey="lift" size={32} color="var(--text-dim)" />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No activity yet — start logging!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activity.map((a) => (
                <div key={`${a.type}-${a.date}-${a.label}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ActivityIconComp activityKey={a.icon} size={17} color="var(--text-muted)" />
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{a.label}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(a.date)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

      </PageWrapper>

      {/* ── Stats Picker ── */}
      {showPicker && (
        <StatsPickerModal
          picks={statPicks}
          onChange={savePicks}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
