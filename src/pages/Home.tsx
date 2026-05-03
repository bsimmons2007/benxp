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
import { loadHiddenSections } from '../lib/sections'
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
  const todayStr = appToday()
  const todayDate = new Date(todayStr + 'T12:00:00')
  const dow = todayDate.getDay() // 0=Sun
  const monOffset = dow === 0 ? -6 : 1 - dow

  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const days = DAY_LABELS.map((label, i) => {
    const d = new Date(todayDate)
    d.setDate(d.getDate() + monOffset + i)
    const dateStr = localDateStr(d)
    return { label, dateStr, isToday: dateStr === todayStr, isActive: activityDates.has(dateStr) }
  })

  return (
    <div className="flex items-center justify-between mb-5 px-1">
      {/* Day squares */}
      <div className="flex gap-1.5">
        {days.map((day, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: day.isActive ? 'rgba(255,107,53,0.85)' : 'rgba(255,255,255,0.06)',
              outline: day.isToday ? '1.5px solid rgba(255,255,255,0.3)' : 'none',
              outlineOffset: 1,
              transition: 'background 0.2s ease',
            }} />
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
              color: day.isToday ? 'var(--text-primary)' : 'var(--text-dim)',
            }}>
              {day.label}
            </span>
          </div>
        ))}
      </div>

      {/* Streak info */}
      {!streak.loading && (
        <div style={{ textAlign: 'right', paddingLeft: 8 }}>
          <p style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 700,
            color: streak.current > 0 ? '#ff6b35' : 'var(--text-muted)', lineHeight: 1 }}>
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

// ── PR Hero Card ──────────────────────────────────────────────
function PRHeroCard({ label, value, unit = 'lbs', trendDir, delta }: {
  label: string; value: string | number; unit?: string
  trendDir?: TrendDir; delta?: number | null
}) {
  const num      = typeof value === 'number' ? value : parseFloat(String(value))
  const isNum    = !isNaN(num)
  const decimals = String(value).includes('.') ? (String(value).split('.')[1]?.length ?? 0) : 0
  const animated = useCountUp(isNum ? num : 0, 900, decimals)

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 16px',
      boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
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
}

// ── Secondary stat card (2×2 grid) ───────────────────────────
function SecondaryStatCard({ label, value, unit, trendDir, to }: {
  label: string; value: string | number; unit?: string; trendDir?: TrendDir; to?: string
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
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
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
  const hidden       = loadHiddenSections()

  // Derive which days this week had activity (from recentActivity + streak data)
  const activityDates = new Set(activity.map(a => a.date))

  const showLifting  = !hidden.includes('lifting')
  const showSkate    = !hidden.includes('skate')
  const showBooks    = !hidden.includes('books')
  const showFortnite = !hidden.includes('fortnite')

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
              {/* Track */}
              <circle cx="50" cy="50" r="44" fill="none"
                stroke="var(--accent)" strokeWidth="2.5" opacity="0.08" />
              {/* Progress arc */}
              <circle cx="50" cy="50" r="44" fill="none"
                stroke="var(--accent)" strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 44 * Math.min(progress, 1)} ${2 * Math.PI * 44 * (1 - Math.min(progress, 1))}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ filter: 'drop-shadow(0 0 5px var(--accent))', transition: 'stroke-dasharray 1s ease' }}
              />
              {/* Level number */}
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
            {/* Meta row */}
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

        {/* ── Personal Records ── */}
        {showLifting && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
                Personal Records
              </p>
              <Link to="/strength" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
                See all →
              </Link>
            </div>

            {/* 2 hero cards */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <PRHeroCard
                label="Bench PR"
                value={stats.benchPR ? stats.benchPR.toFixed(1) : '—'}
                trendDir={trends.dirs['bench']}
                delta={trends.prDeltas.bench}
              />
              <PRHeroCard
                label="Squat PR"
                value={stats.squatPR ? stats.squatPR.toFixed(1) : '—'}
                trendDir={trends.dirs['squat']}
                delta={trends.prDeltas.squat}
              />
            </div>

            {/* 2×2 secondary grid */}
            <div className="grid grid-cols-2 gap-2">
              <SecondaryStatCard
                label="Deadlift PR"
                value={stats.deadliftPR ? stats.deadliftPR.toFixed(1) : '—'}
                unit="lbs"
                trendDir={trends.dirs['deadlift']}
              />
              {showSkate && (
                <SecondaryStatCard
                  label="Total Miles"
                  value={stats.totalMiles.toFixed(1)}
                  unit="mi"
                  trendDir={trends.dirs['miles']}
                />
              )}
              {showBooks && (
                <SecondaryStatCard
                  label={`Books ${new Date().getFullYear()}`}
                  value={stats.booksThisYear}
                  trendDir={trends.dirs['books']}
                />
              )}
              {showFortnite && (
                <SecondaryStatCard
                  label="FN Wins"
                  value={stats.winCount}
                  trendDir={trends.dirs['wins']}
                />
              )}
              {strengthSQ !== null && (
                <SecondaryStatCard
                  label="Strength SQ"
                  value={String(strengthSQ)}
                  unit="/100"
                  to="/strength"
                />
              )}
            </div>
          </div>
        )}

        {/* Non-lifting stat cards when lifting hidden */}
        {!showLifting && (showSkate || showBooks || showFortnite) && (
          <div className="mb-5">
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
              letterSpacing: '-0.015em', marginBottom: 12 }}>Stats</p>
            <div className="grid grid-cols-2 gap-2">
              {showSkate && (
                <SecondaryStatCard label="Total Miles" value={stats.totalMiles.toFixed(1)} unit="mi" trendDir={trends.dirs['miles']} />
              )}
              {showBooks && (
                <SecondaryStatCard label={`Books ${new Date().getFullYear()}`} value={stats.booksThisYear} trendDir={trends.dirs['books']} />
              )}
              {showFortnite && (
                <SecondaryStatCard label="FN Wins" value={stats.winCount} trendDir={trends.dirs['wins']} />
              )}
            </div>
          </div>
        )}

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
    </>
  )
}
