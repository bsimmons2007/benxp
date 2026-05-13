import { useEffect, useState } from 'react'
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
import { xpForLevel, getLevelTitle } from '../lib/xp'
import { checkStreakBreakWarning } from '../lib/notifications'
import { useStrengthSnapshot } from '../components/StrengthTab'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { useUserName } from '../hooks/useUserName'

// ── Types ─────────────────────────────────────────────────────
type TrendDir = 'up' | 'down' | 'flat'

interface TrendResult {
  dirs:      Record<string, TrendDir>
  prDeltas:  { bench: number | null; squat: number | null; deadlift: number | null }
}

// ── Stat picker config ────────────────────────────────────────
const HOME_STATS_KEY = 'benxp-home-stat-picks'
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

// ── Trend cache ───────────────────────────────────────────────
let trendsCache: { data: TrendResult; ts: number } | null = null
const TRENDS_TTL = 5 * 60 * 1000

function useTrends(): TrendResult {
  const empty: TrendResult = { dirs: {}, prDeltas: { bench: null, squat: null, deadlift: null } }
  const [trends, setTrends] = useState<TrendResult>(trendsCache?.data ?? empty)

  useEffect(() => {
    if (trendsCache && Date.now() - trendsCache.ts < TRENDS_TTL) return

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
      setTrends(result)
    }
    load()
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

        <button onClick={save} style={{
          marginTop: 8, width: '100%', padding: '13px',
          background: 'var(--accent)', color: '#0d0d1a',
          border: 'none', borderRadius: 12,
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
          fontFamily: 'Cinzel, serif', letterSpacing: '0.04em',
        }}>
          Save
        </button>
      </div>
    </>
  )
}

// ── PR Hero Card ──────────────────────────────────────────────
function PRHeroCard({ label, value, unit = 'lbs', trendDir, delta, to }: {
  label: string; value: string | number; unit?: string
  trendDir?: TrendDir; delta?: number | null; to?: string
}) {
  const num      = typeof value === 'number' ? value : parseFloat(String(value))
  const isNum    = !isNaN(num)
  const decimals = String(value).includes('.') ? (String(value).split('.')[1]?.length ?? 0) : 0
  const animated = useCountUp(isNum ? num : 0, 900, decimals)

  const inner = (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 16px',
      boxShadow: 'var(--card-shadow)',
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        letterSpacing: '-0.01em', marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 30, fontWeight: 700,
        color: 'var(--accent)', lineHeight: 1 }}>
        {isNum ? animated : value}
        {unit && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 3 }}>{unit}</span>}
        {trendDir && trendDir !== 'flat' && <TrendArrow direction={trendDir} />}
      </p>
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
function SecondaryStatCard({ label, value, unit, trendDir, to }: {
  label: string; value: string | number; unit?: string; trendDir?: TrendDir; to?: string; delta?: number | null
}) {
  const num      = typeof value === 'number' ? value : parseFloat(String(value))
  const isNum    = !isNaN(num)
  const decimals = String(value).includes('.') ? (String(value).split('.')[1]?.length ?? 0) : 0
  const animated = useCountUp(isNum ? num : 0, 900, decimals)

  const inner = (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 14px',
      boxShadow: 'var(--card-shadow)',
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        letterSpacing: '-0.01em', marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 20, fontWeight: 700,
        color: 'var(--text-primary)', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
        {isNum ? animated : value}
        {unit && <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 3 }}>{unit}</span>}
        {trendDir && trendDir !== 'flat' && <TrendArrow direction={trendDir} />}
      </p>
    </div>
  )

  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

// ── Main page ─────────────────────────────────────────────────
export function Home() {
  usePageTitle('Home')
  const { totalXP, level, progress, loading } = useXP()
  const { stats }       = useStats()
  const activity        = useStore(s => s.recentActivity)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
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
  const [showPicker, setShowPicker] = useState(false)

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
  const levelStyle   = (localStorage.getItem('benxp-level-style') as 'number' | 'roman') ?? 'number'
  const displayLevel = loading ? '—' : levelStyle === 'roman' ? toRoman(level) : String(level)
  const title        = getLevelTitle(level)
  const { sq: strengthSQ } = useStrengthSnapshot()
  const animatedXP   = useCountUp(loading ? 0 : totalXP, 1200)

  // Derive which days this week had activity
  const activityDates = new Set(activity.map(a => a.date))

  // Build card props for a given stat ID
  const getCardProps = (id: StatId) => {
    const yr = new Date().getFullYear()
    switch (id) {
      case 'bench':        return { label: 'Bench PR',       value: stats.benchPR    ? stats.benchPR.toFixed(1)    : '—', unit: 'lbs',  trendDir: trends.dirs['bench']    as TrendDir, delta: trends.prDeltas.bench,    to: '/records' }
      case 'squat':        return { label: 'Squat PR',       value: stats.squatPR    ? stats.squatPR.toFixed(1)    : '—', unit: 'lbs',  trendDir: trends.dirs['squat']    as TrendDir, delta: trends.prDeltas.squat,    to: '/records' }
      case 'deadlift':     return { label: 'Deadlift PR',    value: stats.deadliftPR ? stats.deadliftPR.toFixed(1) : '—', unit: 'lbs',  trendDir: trends.dirs['deadlift'] as TrendDir, delta: trends.prDeltas.deadlift, to: '/records' }
      case 'ohp':          return { label: 'OHP PR',         value: stats.ohpPR      ? stats.ohpPR.toFixed(1)      : '—', unit: 'lbs',  to: '/records' }
      case 'strength':     return { label: 'Strength Score', value: strengthSQ !== null ? String(strengthSQ) : '—', unit: '/100', to: '/strength' }
      case 'total_sets':   return { label: 'Sets Logged',    value: stats.totalSets,  to: '/lifting' }
      case 'cardio_miles': return { label: 'Cardio Miles',   value: stats.cardioMiles.toFixed(1), unit: 'mi', to: '/cardio' }
      case 'run_miles':    return { label: 'Run Miles',      value: stats.runMiles.toFixed(1),    unit: 'mi', to: '/cardio' }
      case 'hike_miles':   return { label: 'Hike Miles',     value: stats.hikeMiles.toFixed(1),   unit: 'mi', to: '/hiking' }
      case 'miles':        return { label: 'Skate Miles',    value: stats.totalMiles.toFixed(1),  unit: 'mi', trendDir: trends.dirs['miles'] as TrendDir, to: '/skate' }
      case 'sleep_avg':    return { label: 'Sleep Avg (7d)', value: stats.sleepAvg7 != null ? stats.sleepAvg7.toFixed(1) : '—', unit: 'hrs', to: '/sleep' }
      case 'mood_avg':     return { label: 'Mood Avg (30d)', value: stats.moodAvg30 != null ? stats.moodAvg30.toFixed(1) : '—', unit: '/10', to: '/mood' }
      case 'water_today':  return { label: 'Water Today',    value: stats.waterOzToday, unit: 'oz', to: '/water' }
      case 'weight':       return { label: 'Bodyweight',     value: stats.latestWeight  != null ? stats.latestWeight.toFixed(1)  : '—', unit: 'lbs', to: '/measurements' }
      case 'body_fat':     return { label: 'Body Fat',       value: stats.latestBodyFat != null ? stats.latestBodyFat.toFixed(1) : '—', unit: '%',   to: '/measurements' }
      case 'books':        return { label: `Books ${yr}`,    value: stats.booksThisYear, trendDir: trends.dirs['books'] as TrendDir, to: '/books' }
      case 'basketball':   return { label: 'Basketball',     value: stats.basketballGames, unit: 'games', to: '/basketball' }
      case 'pickleball':   return { label: 'Pickleball',     value: stats.pickleballGames, unit: 'games', to: '/pickleball' }
      case 'golf':         return { label: 'Golf',           value: stats.golfRounds,      unit: 'rounds', to: '/golf' }
      case 'disc_golf':    return { label: 'Disc Golf',      value: stats.discGolfRounds,  unit: 'rounds', to: '/disc-golf' }
      case 'chess':        return { label: 'Chess',          value: stats.chessGames,      unit: 'games',  to: '/chess' }
      case 'pool':         return { label: 'Pool',           value: stats.poolGames,       unit: 'games',  to: '/pool' }
      case 'wins':         return { label: 'FN Wins',        value: stats.winCount,  trendDir: trends.dirs['wins'] as TrendDir, to: '/fortnite' }
      case 'fn_games':     return { label: 'FN Games',       value: stats.fnGamesTotal, to: '/fortnite' }
      case 'fn_kills':     return { label: 'FN Avg Kills',   value: stats.fnKillsAvg != null ? stats.fnKillsAvg.toFixed(1) : '—', to: '/fortnite' }
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

        {/* ── Command Center Header ── */}
        <div className="flex items-center gap-4 pt-4 pb-5">

          {/* Ring SVG */}
          <div style={{ flexShrink: 0 }}>
            <svg width="100" height="100" viewBox="0 0 100 100" style={{ display: 'block' }}>
              <circle cx="50" cy="50" r="44" fill="none"
                stroke="var(--accent)" strokeWidth="2.5" opacity="0.08" />
              <circle cx="50" cy="50" r="44" fill="none"
                stroke="var(--accent)" strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 44 * Math.min(progress, 1)} ${2 * Math.PI * 44 * (1 - Math.min(progress, 1))}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ filter: 'drop-shadow(0 0 5px var(--accent))', transition: 'stroke-dasharray 1s ease' }}
              />
              <text x="50" y="46" textAnchor="middle" dominantBaseline="middle"
                fill="var(--accent)" fontFamily="Cinzel, serif" fontSize="26" fontWeight="700">
                {displayLevel}
              </text>
              <text x="50" y="63" textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="Inter, sans-serif"
                fontWeight="600" letterSpacing="2">
                LEVEL
              </text>
            </svg>
          </div>

          {/* Stacked info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'Cinzel, serif', fontSize: 11, fontWeight: 700,
              color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 2, opacity: 0.9 }}>
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
            </p>
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 20 }} />

        {/* ── Week Dot Strip ── */}
        <WeekDotStrip activityDates={activityDates} streak={streak} />

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
          {activity.length === 0 ? (
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
