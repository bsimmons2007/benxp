import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useXP } from '../hooks/useXP'
import { useStats } from '../hooks/useStats'
import { useUserName } from '../hooks/useUserName'
import { useAchievements } from '../hooks/useAchievements'
import { useCountUp } from '../hooks/useCountUp'
import { useStreak } from '../hooks/useStreak'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import { formatDate, toRoman, localDateStr } from '../lib/utils'
import { ArrowUpIcon, ArrowDownIcon, FlameIcon, ActivityIcon, BadgeIcon, ActivityIconComp } from '../components/ui/Icon'
import { xpForLevel, getLevelTitle } from '../lib/xp'
import { loadHiddenSections } from '../lib/sections'
import { useStrengthSnapshot } from '../components/StrengthTab'
import { usePageTitle } from '../hooks/usePageTitle'

// ── Types ────────────────────────────────────────────────────
type TrendDir = 'up' | 'down' | 'flat'

// ── Trend arrow ──────────────────────────────────────────────
function TrendArrow({ direction }: { direction: TrendDir }) {
  if (direction === 'up')   return <ArrowUpIcon   size={10} color="var(--green)" style={{ marginLeft: 3 }} />
  if (direction === 'down') return <ArrowDownIcon size={10} color="var(--red)"   style={{ marginLeft: 3 }} />
  return null
}

// ── Stat card ────────────────────────────────────────────────
function StatCard({ label, value, unit, trendDir }: {
  label: string; value: string | number; unit?: string; trendDir?: TrendDir
}) {
  const num      = typeof value === 'number' ? value : parseFloat(String(value))
  const isNum    = !isNaN(num)
  const decimals = String(value).includes('.') ? (String(value).split('.')[1]?.length ?? 0) : 0
  const animated = useCountUp(isNum ? num : 0, 900, decimals)

  return (
    <Card className="card-animate" style={{ padding: '10px 12px' }}>
      <p className="section-label mb-1 truncate">{label}</p>
      <p className="font-bold text-lg leading-tight flex items-center" style={{ color: 'var(--accent)' }}>
        {isNum ? animated : value}
        {unit && <span className="font-normal ml-0.5" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{unit}</span>}
        {trendDir && <TrendArrow direction={trendDir} />}
      </p>
    </Card>
  )
}

// ── Streak banner ────────────────────────────────────────────
function StreakBanner({ current, longest, activeToday, loading }: {
  current: number; longest: number; activeToday: boolean; loading: boolean
}) {
  if (loading) return null
  const isActive = activeToday && current > 0

  return (
    <Card
      className="mb-4 card-animate"
      style={{
        border:    `1px solid ${isActive ? 'rgba(255,107,53,0.2)' : 'var(--border)'}`,
        boxShadow: isActive ? '0 4px 20px rgba(255,107,53,0.1)' : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: isActive ? 'rgba(255,107,53,0.12)' : current > 0 ? 'rgba(255,165,50,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isActive ? 'rgba(255,107,53,0.25)' : 'var(--border-faint)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isActive
              ? <FlameIcon    size={20} color="#ff6b35" />
              : current > 0
              ? <ActivityIcon size={18} color="var(--text-muted)" />
              : <ActivityIcon size={18} color="var(--text-dim)" />
            }
          </div>
          <div>
            <p className="font-bold leading-tight" style={{
              color: isActive ? '#ff6b35' : 'var(--text-secondary)',
              fontFamily: 'Cinzel, serif', fontSize: 22,
            }}>
              {current}
              <span className="font-normal ml-1.5" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                day{current !== 1 ? 's' : ''}
              </span>
            </p>
            <p className="section-label" style={{ marginTop: 2 }}>
              {activeToday ? 'Active today' : current > 0 ? 'Log today to keep it' : 'No streak'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold" style={{ color: 'var(--text-secondary)', fontFamily: 'Cinzel, serif', fontSize: 18 }}>
            {longest}
          </p>
          <p className="section-label">Best</p>
        </div>
      </div>
    </Card>
  )
}

// ── Trend cache ──────────────────────────────────────────────
let trendsCache: { data: Record<string, TrendDir>; ts: number } | null = null
const TRENDS_TTL = 5 * 60 * 1000

function useTrends() {
  const [trends, setTrends] = useState<Record<string, TrendDir>>(trendsCache?.data ?? {})

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

      const result: Record<string, TrendDir> = {
        bench:    dir(bestPR(prsRecent.data ?? [], 'Bench'),    bestPR(prsPrev.data ?? [], 'Bench')),
        squat:    dir(bestPR(prsRecent.data ?? [], 'Squat'),    bestPR(prsPrev.data ?? [], 'Squat')),
        deadlift: dir(bestPR(prsRecent.data ?? [], 'Deadlift'), bestPR(prsPrev.data ?? [], 'Deadlift')),
        miles:    dir(skateMilesThis, skateMilesLast),
        books:    dir(booksThis.data?.length ?? 0, booksLast.data?.length ?? 0),
        wins:     dir(winsThis.data?.length ?? 0, winsLast.data?.length ?? 0),
      }

      trendsCache = { data: result, ts: Date.now() }
      setTrends(result)
    }
    load()
  }, [])

  return trends
}

// ── Main page ────────────────────────────────────────────────
export function Home() {
  usePageTitle('Home')
  const { totalXP, level, progress, loading } = useXP()
  const { stats }    = useStats()
  const activity     = useStore(s => s.recentActivity)
  const trends       = useTrends()
  const userName     = useUserName()
  const { earned, loading: badgesLoading } = useAchievements()
  const streak       = useStreak()
  const toNext       = xpForLevel(level + 1) - totalXP
  const levelStyle   = (localStorage.getItem('benxp-level-style') as 'number' | 'roman') ?? 'number'
  const displayLevel = loading ? '—' : levelStyle === 'roman' ? toRoman(level) : String(level)
  const title        = getLevelTitle(level)
  const { sq: strengthSQ } = useStrengthSnapshot()
  const recentBadges = earned.slice(0, 8)
  const animatedXP   = useCountUp(loading ? 0 : totalXP, 1200)
  const hidden       = loadHiddenSections()

  const statCards: { label: string; value: string | number; unit?: string; trendKey?: string; to?: string }[] = [
    ...(!hidden.includes('lifting') ? [
      { label: 'Bench PR',    value: stats.benchPR    ? stats.benchPR.toFixed(1)    : '—', unit: 'lbs', trendKey: 'bench'    },
      { label: 'Squat PR',    value: stats.squatPR    ? stats.squatPR.toFixed(1)    : '—', unit: 'lbs', trendKey: 'squat'    },
      { label: 'Deadlift PR', value: stats.deadliftPR ? stats.deadliftPR.toFixed(1) : '—', unit: 'lbs', trendKey: 'deadlift' },
      { label: 'Strength SQ', value: strengthSQ !== null ? String(strengthSQ) : '—', unit: '/100', to: '/strength' },
    ] : []),
    ...(!hidden.includes('skate')    ? [{ label: 'Total Miles', value: stats.totalMiles.toFixed(1), unit: 'mi', trendKey: 'miles' }] : []),
    ...(!hidden.includes('books')    ? [{ label: `Books ${new Date().getFullYear()}`,  value: stats.books2026, trendKey: 'books' }] : []),
    ...(!hidden.includes('fortnite') ? [{ label: 'FN Wins',     value: stats.winCount,  trendKey: 'wins'  }] : []),
  ]

  return (
    <>
      <TopBar />
      <PageWrapper>

        {/* ── Level hero ── */}
        <div className="text-center py-8">

          <h1
            className="xp-number glow-pulse"
            style={{ fontSize: 96, fontWeight: 900, lineHeight: 1, color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}
          >
            {displayLevel}
          </h1>

          <p style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.9, marginTop: 4 }}>
            {title}
          </p>

          <p style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.1em',
            textTransform: 'uppercase', marginTop: 4 }}>
            {userName ? `${userName}XP` : 'YouXP'} · Level
          </p>

          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
            {parseInt(animatedXP).toLocaleString()} XP
            <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>·</span>
            <span style={{ color: 'var(--accent)' }}>{toNext.toLocaleString()} to next</span>
          </p>
        </div>

        {/* ── XP bar ── */}
        <div className="mb-5">
          <div className="flex justify-between mb-1.5" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <span>Lv {level}</span>
            <span>Lv {level + 1}</span>
          </div>
          <ProgressBar value={progress} height={6} glow />
        </div>

        {/* ── Streak ── */}
        <StreakBanner
          current={streak.current}
          longest={streak.longest}
          activeToday={streak.activeToday}
          loading={streak.loading}
        />

        {/* ── Badges ── */}
        <div className="mb-5" style={{ minHeight: badgesLoading ? 68 : undefined }}>
        {recentBadges.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="section-label">Badges</p>
              <a href="/profile" style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600 }}>
                See all →
              </a>
            </div>
            <div className="flex gap-2 flex-wrap">
              {recentBadges.map(b => (
                <div
                  key={b.id}
                  title={`${b.name}: ${b.description}`}
                  className="pop-in"
                  style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'default',
                  }}
                >
                  <BadgeIcon icon={b.icon} size={18} color="var(--accent)" />
                </div>
              ))}
            </div>
          </div>
        )}
        </div>

        {/* ── Stats grid ── */}
        {statCards.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            {statCards.map(c => {
              const card = (
                <StatCard
                  key={c.label}
                  label={c.label}
                  value={c.value}
                  unit={c.unit}
                  trendDir={c.trendKey ? trends[c.trendKey] : undefined}
                />
              )
              return c.to ? (
                <Link key={c.label} to={c.to} style={{ textDecoration: 'none' }}>{card}</Link>
              ) : card
            })}
          </div>
        )}

        {/* ── Recent activity ── */}
        <Card>
          <p className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Recent Activity</p>
          {activity.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <ActivityIconComp activityKey="lift" size={32} color="var(--text-dim)" />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No activity yet — start logging!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activity.map((a, i) => (
                <div key={i} className="flex items-center justify-between">
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
