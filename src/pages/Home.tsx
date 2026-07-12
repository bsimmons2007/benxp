import { useEffect, useMemo, useRef, useState } from 'react'
import { animate } from 'animejs'
import { animateStreakDots, animateWidgets } from '../lib/animations'
import { StreakFire } from '../components/ui/StreakFire'
import { FreezeTokens } from '../components/ui/FreezeTokens'
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
import { formatDate, toRoman, localDateStr, today as appToday } from '../lib/utils'
import { ArrowUpIcon, ArrowDownIcon, ActivityIconComp, ZapIcon } from '../components/ui/Icon'
import { SecondaryStatSkeleton, ActivityRowSkeleton } from '../components/ui/Skeleton'
import { xpForLevel, getLevelTitle, XP_RATES, deriveTrendsFromRawRows, seasonLevel } from '../lib/xp'
import type { TrendResult } from '../lib/xp'
import { checkStreakBreakWarning } from '../lib/notifications'
import { supabase } from '../lib/supabase'
import { getProgress } from '../lib/challenges'
import { useStrengthSnapshot } from '../components/StrengthTab'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { useWellnessScore } from '../hooks/useWellnessScore'
import { getPref, setPref } from '../lib/prefs'
import { TodayCard } from '../components/TodayCard'
import { OnThisDayCard } from '../components/OnThisDayCard'

// ── Types ─────────────────────────────────────────────────────
type TrendDir = 'up' | 'down' | 'flat'

// ── Stat picker config ────────────────────────────────────────
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



function useTrends(): TrendResult {
  const rawRows = useStore(s => s.rawRows)
  const empty: TrendResult = { dirs: {}, prDeltas: { bench: null, squat: null, deadlift: null } }
  return useMemo(
    () => rawRows ? deriveTrendsFromRawRows(rawRows) : empty,
    [rawRows], // eslint-disable-line react-hooks/exhaustive-deps
  )
}

// ── Week Dot Strip ────────────────────────────────────────────
function WeekDotStrip({ streak }: {
  streak: { current: number; longest: number; loading: boolean; activeDays: Set<string>; freezeTokens: number; tokenSaving: boolean }
}) {
  const todayStr  = appToday()
  const todayDate = new Date(todayStr + 'T12:00:00')
  const dow       = todayDate.getDay() // 0=Sun
  const monOffset = dow === 0 ? -6 : 1 - dow
  const dotsRef   = useRef<HTMLDivElement>(null)
  const animated  = useRef(false)

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const days = DAY_LABELS.map((label, i) => {
    const d = new Date(todayDate)
    d.setDate(d.getDate() + monOffset + i)
    const dateStr = localDateStr(d)
    return { label, dateStr, isToday: dateStr === todayStr, isActive: streak.activeDays.has(dateStr) }
  })

  useEffect(() => {
    if (streak.loading || animated.current || !dotsRef.current) return
    animated.current = true
    const dots = Array.from(dotsRef.current.children) as HTMLElement[]
    animateStreakDots(dots)
  }, [streak.loading])

  return (
    <div className="flex items-center justify-between mb-5 px-1">
      {/* Day squares — flexible so the strip never overflows narrow screens */}
      <div ref={dotsRef} className="flex gap-1" style={{ flex: 1, minWidth: 0 }}>
        {days.map((day, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, maxWidth: 38, minWidth: 0 }}>
            <div style={{
              width: '100%', maxWidth: 34, aspectRatio: '1', borderRadius: 8,
              background: day.isActive
                ? 'var(--accent)'
                : day.isToday
                ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                : 'var(--surface-2)',
              border: day.isToday
                ? '2px solid var(--accent)'
                : '1.5px solid transparent',
              transition: 'background 0.2s ease',
            }} />
            <span style={{
              fontSize: 9, fontWeight: day.isToday ? 700 : 500, letterSpacing: '0.02em',
              color: day.isToday ? 'var(--accent)' : 'var(--text-tertiary)',
            }}>
              {day.label}
            </span>
          </div>
        ))}
      </div>

      {/* Streak info */}
      {!streak.loading && (
        <div style={{ textAlign: 'right', paddingLeft: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', lineHeight: 1 }}>
            <span style={{ fontSize: 22, fontWeight: 700,
              color: streak.current > 0 ? 'var(--accent)' : 'var(--text-muted)',
            }}>
              {streak.current}
            </span>
            {streak.current >= 7 && <StreakFire />}
          </div>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>day streak</p>
          {streak.longest > 0 && (
            <p style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 1 }}>
              best {streak.longest}
            </p>
          )}
          <FreezeTokens count={streak.freezeTokens} saving={streak.tokenSaving} />
        </div>
      )}
    </div>
  )
}

// ── Category colors ───────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  lifting:  'var(--accent)',
  cardio:   'var(--cat-cardio)',
  sleep:    'var(--cat-sleep)',
  mood:     'var(--cat-mood)',
  wellness: 'var(--cat-wellness)',
  books:    'var(--cat-books)',
  sports:   'var(--cat-sports)',
  gaming:   'var(--cat-gaming)',
}

// Activity icon key → accent color
const ACTIVITY_COLORS: Record<string, string> = {
  lift:         'var(--accent)',
  skate:        'var(--cat-cardio)',
  book:         'var(--cat-books)',
  game:         'var(--cat-gaming)',
  fortnite:     'var(--cat-gaming)',
  basketball:   'var(--cat-sports)',
  pickleball:   'var(--cat-sports)',
  golf:         'var(--cat-wellness)',
  disc_golf:    'var(--cat-wellness)',
  hiking:       'var(--cat-wellness)',
  table_tennis: 'var(--cat-sports)',
  chess:        'var(--cat-sports)',
  pool:         'var(--cat-sports)',
  volleyball:   'var(--cat-sports)',
  spikeball:    'var(--cat-sports)',
  run:          'var(--cat-cardio)',
  bike:         'var(--cat-cardio)',
  swim:         'var(--cat-cardio)',
  walk:         'var(--cat-cardio)',
}

// ── Unified stat widget card ──────────────────────────────────
function StatWidget({ label, value, unit, trendDir, delta, to, color, editMode, onRemove, slotIn = false }: {
  label: string; value: string | number; unit?: string
  trendDir?: TrendDir; delta?: number | null; to?: string; color?: string
  editMode?: boolean; onRemove?: () => void; slotIn?: boolean
}) {
  const num      = typeof value === 'number' ? value : parseFloat(String(value))
  const isNum    = !isNaN(num)
  const decimals = String(value).includes('.') ? (String(value).split('.')[1]?.length ?? 0) : 0
  const animated = useCountUp(isNum ? num : 0, 900, decimals)
  const accent   = color ?? 'var(--accent)'

  // Slot machine: session-once spin to real value
  const [slotDisplay, setSlotDisplay] = useState<string | null>(null)
  const slotDone = useRef(false)
  useEffect(() => {
    if (!slotIn || slotDone.current || !isNum || num === 0) return
    slotDone.current = true
    const duration  = 1100 + Math.random() * 600
    const startVal  = 50 + Math.random() * Math.max(900, num * 1.8)
    const delayMs   = Math.random() * 350
    let rafId: number
    let startTs: number | null = null
    function tick(ts: number) {
      if (!startTs) startTs = ts
      const t      = Math.min((ts - startTs) / duration, 1)
      const eased  = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      setSlotDisplay((startVal + (num - startVal) * eased).toFixed(decimals))
      if (t < 1) rafId = requestAnimationFrame(tick)
      else setSlotDisplay(null)
    }
    const tid = setTimeout(() => { rafId = requestAnimationFrame(tick) }, delayMs)
    return () => { clearTimeout(tid); cancelAnimationFrame(rafId) }
  }, [isNum, num, slotIn, decimals])

  // Card tilt on desktop hover
  const cardRef = useRef<HTMLDivElement>(null)
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current || window.matchMedia('(max-width: 767px)').matches) return
    const r = cardRef.current.getBoundingClientRect()
    const x = ((e.clientX - r.left)  / r.width  - 0.5) * 2
    const y = ((e.clientY - r.top)   / r.height - 0.5) * 2
    animate(cardRef.current, { rotateY: x * 9, rotateX: -y * 7, duration: 80, ease: 'linear' })
  }
  function handleMouseLeave() {
    if (!cardRef.current) return
    animate(cardRef.current, { rotateY: 0, rotateX: 0, duration: 380, ease: 'outCubic' })
  }

  const displayNum = slotDisplay ?? (isNum ? animated : String(value))

  const inner = (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        background:  'var(--surface-1)',
        border:      '1px solid var(--border-subtle)',
        borderLeft:  `3px solid ${accent}`,
        borderRadius: 12, padding: '16px 14px',
        boxShadow:   'var(--card-shadow)',
        minHeight:   88, height: '100%',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.01em', marginBottom: 5 }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, lineHeight: 1 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: accent }}>
          {displayNum}
        </span>
        {trendDir && trendDir !== 'flat' && <TrendArrow direction={trendDir} />}
      </div>
      {unit && <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.10em', marginTop: 2 }}>{unit}</p>}
      {delta != null && (
        <p style={{ fontSize: 10, color: delta > 0 ? 'var(--green)' : 'var(--red)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          {delta > 0
            ? <><ArrowUpIcon size={10} color="var(--green)" /> {delta} lbs</>
            : <><ArrowDownIcon size={10} color="var(--red)" /> {Math.abs(delta)} lbs</>}
        </p>
      )}
    </div>
  )

  return (
    <div style={{ position: 'relative', perspective: 600 }}>
      {to ? <Link to={to} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>{inner}</Link> : inner}
      {editMode && (
        <button
          onClick={onRemove}
          aria-label="Remove widget"
          style={{
            position: 'absolute', top: -7, right: -7,
            width: 22, height: 22, borderRadius: '50%',
            background: 'var(--red)', color: 'white',
            border: '2px solid var(--base-bg)',
            cursor: 'pointer', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 5, lineHeight: 1, padding: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}

// ── Add widget panel (slides from right) ──────────────────────
function AddPanel({ picks, onAdd, onClose }: {
  picks: StatId[]; onAdd: (id: StatId) => void; onClose: () => void
}) {
  const available = STAT_DEFS.filter(d => !picks.includes(d.id))
  const sections  = Array.from(new Set(available.map(d => d.section)))

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100%',
        width: 'clamp(280px, 85vw, 340px)',
        zIndex: 200, background: 'var(--surface-1)',
        borderLeft: '1px solid var(--border-default)',
        animation: 'slideInRight 0.25s cubic-bezier(0.22,1,0.36,1) both',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Add Widget</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 24, lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 40px' }}>
          {available.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>All stats are added</p>
          ) : sections.map(section => (
            <div key={section} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 8 }}>{section}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {STAT_DEFS.filter(d => d.section === section && !picks.includes(d.id)).map(def => (
                  <button
                    key={def.id}
                    onClick={() => onAdd(def.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: 10,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, textAlign: 'left',
                      width: '100%',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {def.label}
                    <span style={{ color: 'var(--accent)', fontSize: 20, fontWeight: 300, lineHeight: 1 }}>+</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Quest card — single surface for claimable + in-progress quests ──
const TIER_COLORS = {
  Weekly:  'var(--accent)',
  Monthly: '#7c3aed',
  Boss:    '#f5a623',
} as const

function QuestCard() {
  const [loaded,    setLoaded]    = useState(false)
  const [claimable, setClaimable] = useState(0)
  const [best, setBest] = useState<{
    name: string; tier: 'Weekly' | 'Monthly'; pct: number; xp: number
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('challenges')
        .select('challenge_name, notes, tier, target, xp_reward')
        .eq('user_id', user.id)
        .in('tier', ['Weekly', 'Monthly'])
        .eq('status', 'active')
      if (!data?.length) return
      const progresses = await Promise.all(
        data.map((c: { notes: string | null; tier: string }) =>
          getProgress(supabase, c.notes ?? '', c.tier as 'Weekly' | 'Monthly', user.id))
      )
      let done = 0
      let top: typeof best = null
      data.forEach((c: { challenge_name: string; tier: string; target: string | null; xp_reward: number }, i: number) => {
        const target = parseFloat(c.target ?? '1') || 1
        const pct = Math.min(1, progresses[i] / target)
        if (pct >= 1) done++
        else if (!top || pct > top.pct) top = { name: c.challenge_name, tier: c.tier as 'Weekly' | 'Monthly', pct, xp: c.xp_reward }
      })
      if (!cancelled) { setClaimable(done); setBest(top); setLoaded(true) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (!loaded) return null

  if (claimable > 0) return (
    <Link to="/challenges" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 14,
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, var(--surface-1)), color-mix(in srgb, var(--accent) 8%, var(--surface-1)))',
        border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
        boxShadow: '0 2px 14px color-mix(in srgb, var(--accent) 18%, transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'color-mix(in srgb, var(--accent) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ZapIcon size={17} color="var(--accent)" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {claimable} quest{claimable !== 1 ? 's' : ''} ready to claim
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Tap to collect your XP</p>
          </div>
        </div>
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
          <path d="M1 1l5 5-5 5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  )

  if (!best) return null

  const color = TIER_COLORS[best.tier]
  return (
    <Link to="/challenges" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
      <div style={{
        padding: '12px 14px', borderRadius: 14,
        background: 'var(--surface-1)',
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        borderLeft: `3px solid ${color}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color, background: `color-mix(in srgb, ${color} 10%, transparent)`, padding: '2px 8px', borderRadius: 4,
            fontFamily: 'var(--font-mono)',
          }}>
            {best.tier} quest
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            +{best.xp} XP
          </span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 8 }}>
          {best.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 3, background: 'var(--input-bg)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(best.pct * 100)}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
          <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>
            {Math.round(best.pct * 100)}%
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Wellness Score widget ─────────────────────────────────────
function WellnessWidget() {
  const w = useWellnessScore()
  if (w.loading || !w.hasSomeData) return null

  const COMPONENTS = [
    { label: 'Sleep',    value: w.sleep,    max: 35, color: '#818cf8' },
    { label: 'Activity', value: w.activity, max: 25, color: 'var(--accent)' },
    { label: 'Mood',     value: w.mood,     max: 20, color: '#f472b6' },
    { label: 'Water',    value: w.water,    max: 10, color: '#34d399' },
    { label: 'Meals',    value: w.nutrition, max: 10, color: '#fbbf24' },
  ]

  const pct   = w.total / 100
  const grade = w.total >= 80 ? 'Great' : w.total >= 60 ? 'Good' : w.total >= 40 ? 'Fair' : 'Low'
  const gradeColor = w.total >= 80 ? '#34d399' : w.total >= 60 ? 'var(--accent)' : w.total >= 40 ? '#fbbf24' : '#f87171'

  return (
    <div className="mb-5 rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
          Weekly Wellness
        </p>
        <div className="flex items-baseline gap-1">
          <span style={{ fontSize: 22, fontWeight: 700, color: gradeColor }}>{w.total}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/100</span>
          <span className="ml-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: gradeColor + '22', color: gradeColor }}>{grade}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, borderRadius: 3, background: 'var(--input-bg)', marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: gradeColor, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>

      {/* Component breakdown */}
      <div className="grid grid-cols-5 gap-2">
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
  const { totalXP, seasonXP, level, progress, loading } = useXP()
  const { stats }       = useStats()
  const activity        = useStore(s => s.recentActivity)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const lastUpdated     = useStore(s => s.lastUpdated)
  const trends          = useTrends()
  const streak          = useStreak()

  // Slot machine plays once per session for initial stats reveal
  const [doSlot] = useState<boolean>(() => {
    const key = 'youxp-home-slot-played'
    if (sessionStorage.getItem(key)) return false
    sessionStorage.setItem(key, '1')
    return true
  })

  // Stat picker / widget grid
  const [statPicks, setStatPicks] = useState<StatId[]>(() => {
    const saved = getPref<StatId[] | null>('homeStatPicks', null)
    return Array.isArray(saved) ? saved : (DEFAULT_STAT_PICKS as StatId[])
  })
  const [editMode,       setEditMode]       = useState(false)
  const [showAddPanel,   setShowAddPanel]   = useState(false)
  const widgetGridRef  = useRef<HTMLDivElement>(null)
  const widgetsAnimated = useRef(false)
  const [showBreakdown,  setShowBreakdown]  = useState(false)
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
    setPref('homeStatPicks', picks)
  }
  const removeWidget = (id: StatId) => savePicks(statPicks.filter(p => p !== id))
  const addWidget    = (id: StatId) => {
    if (statPicks.includes(id) || statPicks.length >= 6) return
    savePicks([...statPicks, id])
  }

  useEffect(() => {
    if (!streak.loading) checkStreakBreakWarning(streak.current, streak.activeToday, streak.freezeTokens)
  }, [streak.loading, streak.current, streak.activeToday, streak.freezeTokens])

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id   = 'youxp-org-schema'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'YouXP',
      url: 'https://you-xp.com',
      description: 'Track every gym set, mile run, book finished, and game won. Real life earns real XP — turn your daily habits into a personal RPG.',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Any',
      logo: 'https://you-xp.com/favicon.svg',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    })
    document.head.appendChild(script)
    return () => { document.getElementById('youxp-org-schema')?.remove() }
  }, [])

  useEffect(() => {
    if (loading || widgetsAnimated.current || !widgetGridRef.current) return
    widgetsAnimated.current = true
    const cards = Array.from(widgetGridRef.current.children) as HTMLElement[]
    animateWidgets(cards)
  }, [loading])

  const toNext       = xpForLevel(level + 1) - totalXP
  const { refreshing, pullDistance, threshold } = usePullToRefresh(async () => {
    await refreshXP()
    refreshActivity()
  })
  const [levelStyle] = useState<'number' | 'roman'>(() =>
    getPref<'number' | 'roman'>('levelStyle', 'number')
  )
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


  return (
    <>
      <TopBar />
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
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-md)',
            }}>
              {refreshing ? (
                <div className="spin" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
              ) : (
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: `2px solid ${pullDistance >= threshold ? 'var(--accent)' : 'var(--border-strong)'}`,
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
            background: 'var(--surface-1)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
            color: 'var(--accent)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
            boxShadow: 'var(--shadow-sm)',
          }}>
            ✓ Data updated
          </div>
        </div>

        {/* ── XP Hero Card ── */}
        <div className="rounded-2xl mb-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          <div className="flex items-center gap-4 p-4">
            {/* Level ring — no glow */}
            <Link to="/profile" style={{ flexShrink: 0, display: 'block', WebkitTapHighlightColor: 'transparent' }}>
              <svg width="80" height="80" viewBox="0 0 100 100" style={{ display: 'block' }}>
                <circle cx="50" cy="50" r="44" fill="none" stroke="var(--accent)" strokeWidth="3" opacity="0.12" />
                <circle cx="50" cy="50" r="44" fill="none"
                  stroke="var(--accent)" strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 44 * Math.min(ringProgress, 1)} ${2 * Math.PI * 44 * (1 - Math.min(ringProgress, 1))}`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
                <text x="50" y="46" textAnchor="middle" dominantBaseline="middle"
                  fill="var(--accent)" fontFamily="Space Grotesk, system-ui, sans-serif" fontSize="26" fontWeight="700">
                  {displayLevel}
                </text>
                <text x="50" y="63" textAnchor="middle" dominantBaseline="middle"
                  fill="var(--text-muted)" fontSize="9" fontFamily="Space Grotesk, system-ui, sans-serif"
                  fontWeight="600" letterSpacing="2">
                  LEVEL
                </text>
              </svg>
            </Link>

            {/* Info column */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: 2 }}>
                {title}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10, overflow: 'hidden' }}>
                <span
                  key={loading ? 'l' : 'r'}
                  style={{ display: 'inline-block', animation: loading ? 'none' : 'odometerIn 0.45s ease-out both' }}
                >
                  {Number(animatedXP).toLocaleString()} XP
                </span>
                {!loading && <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>· {toNext.toLocaleString()} to next</span>}
              </p>
              <ProgressBar value={progress} height={4} />
              {!loading && seasonXP > 0 && (
                <p className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                  <span style={{ color: 'var(--accent)' }}>SEASON</span> Lv {seasonLevel(seasonXP)} · {seasonXP.toLocaleString()} XP
                </p>
              )}
            </div>
          </div>

          {/* Category breakdown toggle */}
          <button
            onClick={() => setShowBreakdown(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 16px', background: 'none', border: 'none', borderTop: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            <span>BY CATEGORY</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showBreakdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
              <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showBreakdown && (() => {
            const liftingXP  = Math.round(stats.totalSets * XP_RATES.per_set)
            const cardioXP   = Math.round(stats.cardioMiles * XP_RATES.cardio_per_mile)
            const readingXP  = Math.round(stats.booksThisYear * XP_RATES.book_finished)
            const gamingXP   = Math.round(stats.winCount * XP_RATES.fortnite_win)
            const skatingXP  = Math.round(stats.totalMiles * XP_RATES.skate_per_mile)
            const cats = [
              { label: 'Lifting',  xp: liftingXP,  color: CAT_COLORS.lifting  },
              { label: 'Cardio',   xp: cardioXP,   color: CAT_COLORS.cardio   },
              { label: 'Reading',  xp: readingXP,  color: CAT_COLORS.books    },
              { label: 'Gaming',   xp: gamingXP,   color: CAT_COLORS.gaming   },
              { label: 'Skating',  xp: skatingXP,  color: CAT_COLORS.cardio   },
            ]
            const maxXP = Math.max(...cats.map(c => c.xp), 1)
            return (
              <div className="grid grid-cols-5" style={{ padding: '10px 12px 14px', gap: 8 }}>
                {cats.map(cat => (
                  <div key={cat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ height: 36, width: '100%', background: 'var(--input-bg)', borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ width: '100%', height: `${(cat.xp / maxXP) * 100}%`, background: cat.color, transition: 'height 0.8s ease', minHeight: cat.xp > 0 ? 2 : 0 }} />
                    </div>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{cat.label}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: cat.color }}>{cat.xp.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* ── Week Dot Strip ── */}
        <WeekDotStrip streak={streak} />

        {/* ── Today checklist ── */}
        <TodayCard />

        {/* ── Quest: claimable banner or nearest-to-done ── */}
        <QuestCard />

        {/* ── On This Day ── */}
        <OnThisDayCard />

        {/* ── Weekly Wellness ── */}
        <WellnessWidget />

        {/* ── Widget grid ── */}
        <div className="mb-5">
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em', marginBottom: 12 }}>
            My Stats
          </p>

          {loading ? (
            <div className="grid grid-cols-2 gap-2">
              {[0,1,2,3].map(i => <SecondaryStatSkeleton key={i} />)}
            </div>
          ) : (
            <div ref={widgetGridRef} className="grid grid-cols-2 gap-2">
              {statPicks.map(id => (
                <StatWidget
                  key={id}
                  {...getCardProps(id)}
                  editMode={editMode}
                  onRemove={() => removeWidget(id)}
                  slotIn={doSlot}
                />
              ))}
              {/* Add tile — shown in edit mode when below max */}
              {editMode && statPicks.length < 6 && (
                <button
                  onClick={() => setShowAddPanel(true)}
                  style={{
                    borderRadius: 12, minHeight: 88,
                    border: '1.5px dashed var(--border)',
                    background: 'transparent',
                    color: 'var(--text-muted)', fontSize: 28, fontWeight: 300,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  +
                </button>
              )}
              {/* Empty state */}
              {statPicks.length === 0 && !editMode && (
                <div className="col-span-2" style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  Tap Edit to add stats
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Recent Activity ── */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
              Recent Activity
            </p>
            <Link to="/progress?tab=history" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
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
            <div className="flex flex-col gap-1">
              {activity.map((a) => {
                const iconColor = ACTIVITY_COLORS[a.icon] ?? 'var(--accent)'
                return (
                  <div key={`${a.type}-${a.date}-${a.label}`} className="flex items-center justify-between" style={{ padding: '5px 0' }}>
                    <div className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: iconColor + '18',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ActivityIconComp activityKey={a.icon} size={16} color={iconColor} />
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>{formatDate(a.date)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

      </PageWrapper>

      {/* ── Floating edit button ── */}
      <button
        onClick={() => { setEditMode(v => !v); setShowAddPanel(false) }}
        className="widget-edit-fab"
        style={{
          position: 'fixed', right: 20, zIndex: 45,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 18px',
          background: editMode ? 'var(--surface-1)' : 'var(--accent)',
          color:      editMode ? 'var(--text-primary)' : 'white',
          border:     editMode ? '1px solid var(--border-default)' : 'none',
          borderRadius: 20, fontSize: 13, fontWeight: 600,
          boxShadow: 'var(--shadow-md)', cursor: 'pointer',
          transition: 'background 0.2s ease, color 0.2s ease',
        }}
      >
        {editMode ? 'Done' : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </>
        )}
      </button>

      {/* ── Add widget panel ── */}
      {showAddPanel && (
        <AddPanel
          picks={statPicks}
          onAdd={(id) => { addWidget(id); setShowAddPanel(false) }}
          onClose={() => setShowAddPanel(false)}
        />
      )}
    </>
  )
}
