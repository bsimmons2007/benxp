import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { TopBar } from '../components/layout/TopBar'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useXP } from '../hooks/useXP'
import { useAchievements } from '../hooks/useAchievements'
import type { Badge } from '../hooks/useAchievements'
import { useSkills } from '../hooks/useSkills'
import { useUserName } from '../hooks/useUserName'
import { SkillCard } from '../components/ui/SkillCard'
import { supabase } from '../lib/supabase'
import { getLevelTitle, xpForLevel } from '../lib/xp'
import { toRoman, today as appToday, localDateStr } from '../lib/utils'
import {
  PersonIcon, StarIcon, ZapIcon, FlameIcon, TrophyIcon, CheckIcon,
  SwordIcon, DumbbellIcon, SkateIcon, BookIcon, GamepadIcon, MoonIcon,
  BrainIcon, TargetIcon, CalendarIcon, ActivityIcon,
  CrownIcon, ShieldIcon, DiamondIcon, RocketIcon, MountainIcon,
  TrendingIcon, GridIcon, HeartIcon,
} from '../components/ui/Icon'
import type { IconComponent } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

const CATEGORY_LABELS: Record<Badge['category'], string> = {
  general:    'General',
  lifting:    'Lifting',
  skate:      'Skating',
  books:      'Books',
  fortnite:   'Fortnite',
  sleep:      'Sleep',
  challenges: 'Challenges',
}

const CATEGORY_ORDER: Badge['category'][] = ['general', 'lifting', 'skate', 'books', 'fortnite', 'sleep', 'challenges']

// Unique icon per badge — every badge gets its own identity
const BADGE_ICON: Record<string, IconComponent> = {
  // ── General XP ──────────────────────────────────────────
  first_login:         StarIcon,
  all_categories:      GridIcon,
  xp_500:              ZapIcon,
  xp_1000:             FlameIcon,
  xp_5000:             RocketIcon,
  xp_10000:            DiamondIcon,
  xp_25000:            CrownIcon,
  xp_50000:            StarIcon,
  xp_100000:           TrophyIcon,
  // ── Levels ──────────────────────────────────────────────
  level_5:             TrendingIcon,
  level_10:            TargetIcon,
  level_20:            ShieldIcon,
  level_25:            TrophyIcon,
  level_50:            CrownIcon,
  level_75:            DiamondIcon,
  level_100:           StarIcon,
  // ── Challenges ──────────────────────────────────────────
  challenges_1:        CheckIcon,
  challenges_5:        SwordIcon,
  challenges_10:       ShieldIcon,
  challenges_25:       TrophyIcon,
  challenges_50:       CrownIcon,
  challenges_75:       DiamondIcon,
  challenges_100:      StarIcon,
  // ── Lifting — Sets ──────────────────────────────────────
  lift_first:          DumbbellIcon,
  lift_50_sets:        ActivityIcon,
  lift_250_sets:       DumbbellIcon,
  lift_500_sets:       FlameIcon,
  lift_1000_sets:      ShieldIcon,
  lift_2000_sets:      CrownIcon,
  // ── Lifting — Days ──────────────────────────────────────
  lift_days_10:        CalendarIcon,
  lift_days_30:        CalendarIcon,
  lift_days_50:        TrendingIcon,
  lift_days_100:       TrophyIcon,
  lift_days_200:       ShieldIcon,
  lift_days_365:       CrownIcon,
  // ── Lifting — Streaks ───────────────────────────────────
  lift_streak_7:       FlameIcon,
  lift_streak_14:      FlameIcon,
  lift_streak_30:      RocketIcon,
  lift_streak_60:      DiamondIcon,
  // ── Lifting — PRs ───────────────────────────────────────
  lift_first_pr:       TrophyIcon,
  lift_10_prs:         TrophyIcon,
  lift_25_prs:         TargetIcon,
  lift_50_prs:         DiamondIcon,
  // ── Lifting — Volume ────────────────────────────────────
  vol_10k:             ActivityIcon,
  vol_50k:             TrendingIcon,
  vol_100k:            MountainIcon,
  vol_250k:            MountainIcon,
  vol_500k:            RocketIcon,
  vol_1m:              CrownIcon,
  // ── Powerlifting Total ───────────────────────────────────
  pl_total_1000:       TrophyIcon,
  pl_total_1500:       DiamondIcon,
  pl_total_2000:       CrownIcon,
  // ── Lifting — Bench ─────────────────────────────────────
  bench_95:            DumbbellIcon,
  bench_135:           DumbbellIcon,
  bench_185:           ShieldIcon,
  bench_225:           TrophyIcon,
  bench_275:           FlameIcon,
  bench_315:           DiamondIcon,
  bench_405:           CrownIcon,
  // ── Lifting — Squat ─────────────────────────────────────
  squat_135:           DumbbellIcon,
  squat_225:           FlameIcon,
  squat_315:           MountainIcon,
  squat_405:           DiamondIcon,
  squat_495:           CrownIcon,
  // ── Lifting — Deadlift ──────────────────────────────────
  dl_225:              DumbbellIcon,
  dl_315:              ActivityIcon,
  dl_405:              TrophyIcon,
  dl_500:              DiamondIcon,
  dl_600:              CrownIcon,
  // ── Lifting — Bodyweight ────────────────────────────────
  lift_all_three:      TrophyIcon,
  pullup_1:            ActivityIcon,
  pullup_5:            ActivityIcon,
  pullup_10:           TrophyIcon,
  pullup_15:           ShieldIcon,
  pullup_20:           CrownIcon,
  pushup_20:           ActivityIcon,
  pushup_50:           FlameIcon,
  pushup_100:          CrownIcon,
  // ── Skate ───────────────────────────────────────────────
  skate_first:         SkateIcon,
  skate_10_sessions:   SkateIcon,
  skate_50_sessions:   ZapIcon,
  skate_100_sessions:  FlameIcon,
  skate_200_sessions:  DiamondIcon,
  skate_3mi_session:   ZapIcon,
  skate_5mi_session:   RocketIcon,
  skate_10mi_session:  DiamondIcon,
  skate_10_miles:      SkateIcon,
  skate_20_miles:      TrendingIcon,
  skate_50_miles:      TrendingIcon,
  skate_100_miles:     TrophyIcon,
  skate_200_miles:     ShieldIcon,
  skate_500_miles:     RocketIcon,
  skate_1000_miles:    CrownIcon,
  skate_streak_7:      FlameIcon,
  skate_streak_30:     RocketIcon,
  // ── Books ───────────────────────────────────────────────
  book_first:          BookIcon,
  book_3:              TrendingIcon,
  book_5:              BookIcon,
  book_10:             BrainIcon,
  book_25:             BrainIcon,
  book_50:             StarIcon,
  book_100:            DiamondIcon,
  // ── Fortnite ────────────────────────────────────────────
  fn_10_games:         GamepadIcon,
  fn_50_games:         ShieldIcon,
  fn_100_games:        DiamondIcon,
  fn_first_win:        TrophyIcon,
  fn_5_wins:           TrophyIcon,
  fn_25_wins:          TargetIcon,
  fn_50_wins:          GamepadIcon,
  fn_100_wins:         SwordIcon,
  fn_500_wins:         CrownIcon,
  fn_100_kills:        SwordIcon,
  fn_500_kills:        SwordIcon,
  fn_1000_kills:       CrownIcon,
  fn_10_kills_game:    ZapIcon,
  fn_20_kills_game:    DiamondIcon,
  fn_accuracy_30:      TargetIcon,
  fn_accuracy_50:      DiamondIcon,
  fn_accuracy_70:      CrownIcon,
  // ── Sleep ───────────────────────────────────────────────
  sleep_first:         MoonIcon,
  sleep_7_nights:      MoonIcon,
  sleep_30_nights:     StarIcon,
  sleep_50_nights:     StarIcon,
  sleep_100_nights:    TrophyIcon,
  sleep_good_3:        MoonIcon,
  sleep_good_14:       ShieldIcon,
  sleep_good_30:       StarIcon,
  sleep_good_60:       TrophyIcon,
  sleep_good_90:       DiamondIcon,
  sleep_streak_7:      FlameIcon,
  sleep_streak_30:     DiamondIcon,
  sleep_perfect_5:     MoonIcon,
  sleep_perfect_10:    CrownIcon,
  sleep_perfect_20:    DiamondIcon,
  sleep_400h:          HeartIcon,
  sleep_1000h:         CrownIcon,
}

const CATEGORY_DEFAULT: Record<Badge['category'], IconComponent> = {
  lifting:    DumbbellIcon,
  skate:      SkateIcon,
  books:      BookIcon,
  fortnite:   GamepadIcon,
  sleep:      MoonIcon,
  challenges: SwordIcon,
  general:    StarIcon,
}

function badgeIcon(badge: Badge, size = 22): ReactNode {
  const Comp = BADGE_ICON[badge.id] ?? CATEGORY_DEFAULT[badge.category] ?? StarIcon
  return <Comp size={size} color="var(--accent)" />
}

function BadgeTile({ badge }: { badge: Badge }) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        width: 56, height: 56, borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: badge.earned
          ? 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)'
          : 'rgba(255,255,255,0.03)',
        border: badge.earned
          ? '1px solid rgba(255,255,255,0.18)'
          : '1px solid rgba(255,255,255,0.05)',
        boxShadow: badge.earned ? '0 4px 16px rgba(0,0,0,0.25)' : 'none',
        opacity: badge.earned ? 1 : 0.35,
        filter: badge.earned ? 'none' : 'grayscale(1)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: hover && badge.earned ? 'translateY(-2px) scale(1.05)' : 'none',
        cursor: 'default',
      }}
    >
      {badgeIcon(badge)}

      {/* Tooltip */}
      {hover && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(10,10,20,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '6px 10px',
          whiteSpace: 'nowrap', zIndex: 50,
          pointerEvents: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <p style={{ color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{badge.name}</p>
          <p style={{ color: '#888', fontSize: 10 }}>{badge.description}</p>
          {badge.earned && badge.earnedDate && (
            <p style={{ color: 'var(--accent)', fontSize: 9, marginTop: 2 }}>
              Earned {badge.earnedDate}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const HEATMAP_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CELL = 11
const GAP  = 2

function ActivityHeatmap() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      const year  = new Date().getFullYear()
      const start = `${year}-01-01`
      const end   = `${year}-12-31`

      const [lifting, skate, games, books, sleep, mood, cardio] = await Promise.all([
        supabase.from('lifting_log').select('date').gte('date', start).lte('date', end),
        supabase.from('skate_sessions').select('date').gte('date', start).lte('date', end),
        supabase.from('fortnite_games').select('date').gte('date', start).lte('date', end),
        supabase.from('books').select('date_finished').not('date_finished', 'is', null).gte('date_finished', start).lte('date_finished', end),
        supabase.from('sleep_log').select('date').gte('date', start).lte('date', end),
        supabase.from('mood_log').select('date').gte('date', start).lte('date', end),
        supabase.from('cardio_sessions').select('date').gte('date', start).lte('date', end),
      ])

      const c: Record<string, number> = {}
      const bump = (d: string) => { c[d] = (c[d] ?? 0) + 1 }
      ;(lifting.data ?? []).forEach((r: { date: string }) => bump(r.date))
      ;(skate.data   ?? []).forEach((r: { date: string }) => bump(r.date))
      ;(games.data   ?? []).forEach((r: { date: string }) => bump(r.date))
      ;(books.data   ?? []).forEach((r: { date_finished: string }) => bump(r.date_finished))
      ;(sleep.data   ?? []).forEach((r: { date: string }) => bump(r.date))
      ;(mood.data    ?? []).forEach((r: { date: string }) => bump(r.date))
      ;(cardio.data  ?? []).forEach((r: { date: string }) => bump(r.date))

      setCounts(c)
      setLoaded(true)
    }
    load()
  }, [])

  const year  = new Date().getFullYear()
  const today = appToday()

  const { weeks, monthCols } = useMemo(() => {
    const allDays: string[] = []
    const cur = new Date(Date.UTC(year, 0, 1))
    while (cur.getUTCFullYear() === year) {
      allDays.push(cur.toISOString().split('T')[0])
      cur.setUTCDate(cur.getUTCDate() + 1)
    }

    const startDow = new Date(Date.UTC(year, 0, 1)).getUTCDay()
    const padded: (string | null)[] = [...Array(startDow).fill(null), ...allDays]
    while (padded.length % 7 !== 0) padded.push(null)

    const weeks: (string | null)[][] = []
    for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7))

    const monthCols: { label: string; col: number }[] = []
    let lastMonth = -1
    weeks.forEach((week, wi) => {
      const first = week.find(d => d !== null)
      if (!first) return
      const m = parseInt(first.split('-')[1]) - 1
      if (m !== lastMonth) { monthCols.push({ label: HEATMAP_MONTHS[m], col: wi }); lastMonth = m }
    })

    return { weeks, monthCols }
  }, [year])

  function cellBg(date: string | null): string {
    if (!date)        return 'transparent'
    if (date > today) return 'rgba(255,255,255,0.03)'
    const n = counts[date] ?? 0
    if (n === 0) return 'rgba(255,255,255,0.07)'
    if (n === 1) return 'rgba(245,166,35,0.30)'
    if (n === 2) return 'rgba(245,166,35,0.55)'
    if (n === 3) return 'rgba(245,166,35,0.75)'
    return 'rgba(245,166,35,0.95)'
  }

  function cellGlow(date: string | null): string | undefined {
    if (!date || date > today) return undefined
    const n = counts[date] ?? 0
    if (n >= 3) return '0 0 6px rgba(245,166,35,0.5)'
    if (n >= 2) return '0 0 4px rgba(245,166,35,0.3)'
    return undefined
  }

  return (
    <Card className="mb-5">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ color: '#ccc', fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, letterSpacing: '0.05em' }}>
          {year} Activity
        </p>
        {loaded && (
          <p style={{ color: '#555', fontSize: 11 }}>
            {Object.keys(counts).length} active days
          </p>
        )}
      </div>
      {!loaded ? (
        <p style={{ color: '#555', fontSize: 12 }}>Loading…</p>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
          <div style={{ display: 'block', width: 'fit-content', margin: '0 auto' }}>
            {/* Month labels */}
            <div style={{ display: 'flex', marginBottom: 4 }}>
              {weeks.map((_, wi) => {
                const mc = monthCols.find(m => m.col === wi)
                return (
                  <div key={wi} style={{ width: CELL + GAP, flexShrink: 0, position: 'relative' }}>
                    {mc && <span style={{ fontSize: 8, color: '#444', userSelect: 'none', position: 'absolute', whiteSpace: 'nowrap' }}>{mc.label}</span>}
                  </div>
                )
              })}
            </div>
            {/* 7 rows × N week columns */}
            {[0,1,2,3,4,5,6].map(dow => (
              <div key={dow} style={{ display: 'flex', gap: GAP, marginBottom: GAP }}>
                {weeks.map((week, wi) => {
                  const date    = week[dow]
                  const isToday = date === today
                  return (
                    <div
                      key={wi}
                      title={date ?? undefined}
                      style={{
                        width: CELL, height: CELL, borderRadius: 3, flexShrink: 0,
                        background: cellBg(date),
                        outline: isToday ? '1.5px solid rgba(245,166,35,0.9)' : 'none',
                        outlineOffset: '-1px',
                        boxShadow: cellGlow(date),
                        transition: 'background 0.2s ease',
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 9, color: '#555' }}>Less</span>
        {['rgba(255,255,255,0.07)','rgba(245,166,35,0.30)','rgba(245,166,35,0.55)','rgba(245,166,35,0.75)','rgba(245,166,35,0.95)'].map((bg, i) => (
          <div key={i} style={{ width: CELL, height: CELL, borderRadius: 2, background: bg }} />
        ))}
        <span style={{ fontSize: 9, color: '#555' }}>More</span>
      </div>
    </Card>
  )
}

function useConsistencyScore() {
  const [score, setScore] = useState<number | null>(null)
  const [activeDays, setActiveDays] = useState(0)

  useEffect(() => {
    async function load() {
      // Look at last 30 days (local dates)
      const now   = new Date()
      const e = localDateStr(now)
      const s = localDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29))

      const [lifting, skate, games, sleep] = await Promise.all([
        supabase.from('lifting_log').select('date').gte('date', s).lte('date', e),
        supabase.from('skate_sessions').select('date').gte('date', s).lte('date', e),
        supabase.from('fortnite_games').select('date').gte('date', s).lte('date', e),
        supabase.from('sleep_log').select('date').gte('date', s).lte('date', e),
      ])

      const days = new Set([
        ...(lifting.data ?? []).map((r: { date: string }) => r.date),
        ...(skate.data   ?? []).map((r: { date: string }) => r.date),
        ...(games.data   ?? []).map((r: { date: string }) => r.date),
        ...(sleep.data   ?? []).map((r: { date: string }) => r.date),
      ])

      const active = days.size
      setActiveDays(active)
      setScore(Math.round((active / 30) * 100))
    }
    load()
  }, [])

  return { score, activeDays }
}

function useLifetimeStats() {
  const [s, setS] = useState({ totalSets: 0, totalMiles: 0, totalWins: 0, booksRead: 0, totalPRs: 0, memberSince: '' })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : ''

      const [sets, miles, wins, books, prs] = await Promise.all([
        supabase.from('lifting_log').select('id', { count: 'exact', head: true }),
        supabase.from('skate_sessions').select('miles'),
        supabase.from('fortnite_games').select('id', { count: 'exact', head: true }).eq('win', true),
        supabase.from('books').select('id', { count: 'exact', head: true }).not('date_finished', 'is', null),
        supabase.from('pr_history').select('id', { count: 'exact', head: true }),
      ])

      setS({
        totalSets:  sets.count ?? 0,
        totalMiles: (miles.data ?? []).reduce((a: number, r: { miles: number }) => a + r.miles, 0),
        totalWins:  wins.count ?? 0,
        booksRead:  books.count ?? 0,
        totalPRs:   prs.count ?? 0,
        memberSince,
      })
    }
    load()
  }, [])

  return s
}

export function Profile() {
  usePageTitle('Profile')
  const { totalXP, level, progress } = useXP()
  const { badges, earned, loading }  = useAchievements()
  const { skills, loading: skillsLoading } = useSkills()
  const userName   = useUserName()
  const stats      = useLifetimeStats()
  const title      = getLevelTitle(level)
  const toNext     = xpForLevel(level + 1) - totalXP
  const levelStyle = (localStorage.getItem('benxp-level-style') as 'number' | 'roman') ?? 'number'
  const displayLevel = levelStyle === 'roman' ? toRoman(level) : String(level)

  const { score: consistencyScore, activeDays } = useConsistencyScore()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAvatarUrl(user?.user_metadata?.avatar_url ?? null)
    })
  }, [])

  const byCategory = CATEGORY_ORDER.map(cat => ({
    cat,
    label: CATEGORY_LABELS[cat],
    items: badges.filter(b => b.category === cat),
    earnedCount: badges.filter(b => b.category === cat && b.earned).length,
  })).filter(g => g.items.length > 0)

  return (
    <>
      <TopBar title="Profile" />
      <PageWrapper>

        {/* Hero card */}
        <Card className="mb-4 text-center" goldBorder>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            border: '2px solid var(--accent)',
            boxShadow: '0 0 20px var(--accent-dim)',
            background: 'rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', margin: '0 auto 12px',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <PersonIcon size={32} color="var(--text-secondary)" />
            }
          </div>

          <h2 className="font-bold text-xl text-white" style={{ fontFamily: 'Cinzel, serif' }}>
            {userName ?? 'Player'}
          </h2>
          <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: 'var(--accent)' }}>
            {title}
          </p>
          {stats.memberSince && (
            <p className="text-xs mt-1" style={{ color: '#555' }}>Member since {stats.memberSince}</p>
          )}

          {/* Level + XP bar */}
          <div className="mt-4 px-2">
            <div className="flex justify-between text-xs mb-1" style={{ color: '#888' }}>
              <span>Level {displayLevel}</span>
              <span>{totalXP.toLocaleString()} XP · {toNext.toLocaleString()} to next</span>
            </div>
            <ProgressBar value={progress} height={14} glow />
          </div>
        </Card>

        {/* Activity Heatmap — hero position */}
        <ActivityHeatmap />

        {/* Consistency Score */}
        {consistencyScore !== null && (
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs uppercase tracking-widest" style={{ color: '#888' }}>Consistency Score</p>
                <p className="text-xs mt-0.5" style={{ color: '#555' }}>{activeDays} active days in the last 30</p>
              </div>
              <span style={{
                fontSize: 32, fontWeight: 900,
                color: consistencyScore >= 70 ? '#4ade80' : consistencyScore >= 40 ? 'var(--accent)' : '#888',
                fontFamily: 'Cinzel, serif', lineHeight: 1,
              }}>
                {consistencyScore}%
              </span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${consistencyScore}%`,
                borderRadius: 999,
                background: consistencyScore >= 70
                  ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                  : consistencyScore >= 40
                  ? 'linear-gradient(90deg, var(--accent), #fbbf24)'
                  : 'rgba(255,255,255,0.2)',
                transition: 'width 0.8s ease',
              }} />
            </div>
          </Card>
        )}

        {/* Lifetime stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Total Sets',  value: stats.totalSets.toLocaleString() },
            { label: 'Miles',       value: stats.totalMiles.toFixed(1) },
            { label: 'FN Wins',     value: stats.totalWins },
            { label: 'Books Read',  value: stats.booksRead },
            { label: 'Total PRs',   value: stats.totalPRs },
            { label: 'Badges',      value: `${earned.length}/${badges.filter(b => !b.secret).length}` },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '10px 12px',
            }}>
              <p style={{ color: '#888', fontSize: 10, fontFamily: 'Cormorant Garamond, serif', marginBottom: 2 }}>{s.label}</p>
              <p style={{ color: 'var(--accent)', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Skill Mastery */}
        <div className="mb-2">
          <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: '#444' }}>Skill Mastery</p>
          {skillsLoading ? (
            <p style={{ color: '#444', fontSize: 13 }}>Loading skills…</p>
          ) : (
            <div className="flex flex-col gap-2">
              {skills.map(s => <SkillCard key={s.key} skill={s} />)}
            </div>
          )}
        </div>

        {/* Badges by category */}
        {loading ? (
          <p style={{ color: '#444', textAlign: 'center', paddingTop: 20 }}>Loading badges…</p>
        ) : (
          byCategory.map(({ cat, label, items, earnedCount }) => (
            <Card key={cat} className="mb-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-sm">{label}</h3>
                <span style={{ color: earnedCount === items.length ? 'var(--accent)' : '#555', fontSize: 11 }}>
                  {earnedCount}/{items.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map(b => (
                  <BadgeTile key={b.id} badge={b} />
                ))}
              </div>
            </Card>
          ))
        )}
      </PageWrapper>
    </>
  )
}
