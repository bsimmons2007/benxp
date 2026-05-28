import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { EmptyState } from '../components/ui/EmptyState'
import { TrophyIcon, SearchIcon, DumbbellIcon, ZapIcon } from '../components/ui/Icon'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import type { PrHistory, LiftType } from '../types'
import { usePageTitle } from '../hooks/usePageTitle'

const LIFT_ORDER: LiftType[] = ['Bench', 'Squat', 'Deadlift', 'PullUps', 'PushUps']

// Best lift strength-level tier labels
function strengthTier(lift: string, est1rm: number): { label: string; color: string } | null {
  const tiers: Record<string, { threshold: number; label: string; color: string }[]> = {
    Bench:    [
      { threshold: 315, label: 'Elite',         color: '#e879f9' },
      { threshold: 225, label: 'Intermediate',  color: 'var(--accent)' },
      { threshold: 135, label: 'Beginner',       color: '#38bdf8' },
    ],
    Squat:    [
      { threshold: 405, label: 'Elite',         color: '#e879f9' },
      { threshold: 315, label: 'Intermediate',  color: 'var(--accent)' },
      { threshold: 225, label: 'Beginner',       color: '#38bdf8' },
    ],
    Deadlift: [
      { threshold: 500, label: 'Elite',         color: '#e879f9' },
      { threshold: 405, label: 'Intermediate',  color: 'var(--accent)' },
      { threshold: 315, label: 'Beginner',       color: '#38bdf8' },
    ],
  }
  const lifTiers = tiers[lift]
  if (!lifTiers) return null
  for (const t of lifTiers) {
    if (est1rm >= t.threshold) return { label: t.label, color: t.color }
  }
  return null
}

function BestLiftRanking({ prs }: { prs: PrHistory[] }) {
  const best: Record<string, number> = {}
  prs.forEach(r => {
    if (!best[r.lift] || r.est_1rm > best[r.lift]) best[r.lift] = r.est_1rm
  })

  const ranked = LIFT_ORDER
    .filter(l => best[l])
    .map(l => ({ lift: l, est1rm: best[l] }))
    .sort((a, b) => b.est1rm - a.est1rm)

  if (!ranked.length) return null

  const max = ranked[0].est1rm

  return (
    <div className="mb-5 rounded-2xl overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <TrophyIcon size={14} color="var(--accent)" />
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Best Lifts
        </p>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 2 }}>
          All-time 1RM estimates
        </span>
      </div>

      {/* Ranked bars */}
      <div className="flex flex-col px-4 py-3 gap-4">
        {ranked.map((r, i) => {
          const pct  = (r.est1rm / max) * 100
          const tier = strengthTier(r.lift, r.est1rm)
          const isTop = i === 0
          return (
            <div key={r.lift}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span style={{
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    color: isTop ? '#fbbf24' : 'var(--text-tertiary)',
                    minWidth: 24,
                  }}>
                    #{i + 1}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{r.lift}</span>
                  {tier && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      color: tier.color, background: `color-mix(in srgb, ${tier.color} 12%, transparent)`,
                      padding: '2px 6px', borderRadius: 4,
                    }}>
                      {tier.label}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: isTop ? '#fbbf24' : 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  {r.est1rm.toFixed(0)} <span style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 400 }}>lbs</span>
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 999,
                  background: isTop
                    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                    : 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, transparent))',
                  transition: 'width 0.7s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PRFeed() {
  usePageTitle('PR Feed')
  const navigate = useNavigate()
  const [prs,     setPrs]     = useState<PrHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<LiftType | 'All'>('All')

  useEffect(() => {
    supabase
      .from('pr_history')
      .select('*')
      .order('date', { ascending: false })
      .then(({ data }) => {
        setPrs(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = filter === 'All' ? prs : prs.filter(r => r.lift === filter)

  // Best PR per lift
  const bestPerLift: Record<string, number> = {}
  prs.forEach(r => {
    if (!bestPerLift[r.lift] || r.est_1rm > bestPerLift[r.lift]) bestPerLift[r.lift] = r.est_1rm
  })

  const liftsWithData = LIFT_ORDER.filter(l => bestPerLift[l])

  return (
    <>
      <TopBar title="PR Feed" />
      <PageWrapper>

        {/* Best lift ranking */}
        {!loading && prs.length > 0 && <BestLiftRanking prs={prs} />}

        {/* Filter tabs */}
        {liftsWithData.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {(['All', ...liftsWithData] as (LiftType | 'All')[]).map(l => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                  whiteSpace: 'nowrap', flexShrink: 0,
                  background: filter === l ? 'var(--accent)' : 'var(--surface-2)',
                  color:      filter === l ? '#1A1A2E'       : 'var(--text-secondary)',
                  border: filter === l ? 'none' : '1px solid var(--border-subtle)',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                {l === 'All' ? 'All Lifts' : l}
              </button>
            ))}
          </div>
        )}

        {/* PR count */}
        {!loading && filtered.length > 0 && (
          <p className="section-label mb-3">
            {filtered.length} PR{filtered.length !== 1 ? 's' : ''}{filter !== 'All' ? ` · ${filter}` : ''}
          </p>
        )}

        {loading ? null : prs.length === 0 ? (
          <EmptyState
            icon={<TrophyIcon size={64} color="var(--text-muted)" />}
            title="No PRs yet"
            sub="Log a lift and beat your last weight to set your first personal record."
            action={{ label: 'Go to Lifting', onClick: () => navigate('/lifting') }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<SearchIcon size={64} color="var(--text-muted)" />} title="No PRs for this lift" sub="Try a different filter above." />
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map(pr => {
              const isBest = bestPerLift[pr.lift] === pr.est_1rm
              return (
                <div
                  key={pr.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{
                    background: 'var(--surface-1)',
                    border: isBest ? '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' : '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Icon container */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: isBest ? 'rgba(251,191,36,0.14)' : 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isBest
                      ? <ZapIcon size={16} color="#fbbf24" />
                      : <DumbbellIcon size={16} color="var(--text-secondary)" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{pr.lift}</span>
                      {isBest && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                          background: '#fbbf24', color: '#1A1A2E',
                          padding: '2px 5px', borderRadius: 4,
                        }}>
                          BEST
                        </span>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{formatDate(pr.date)}</span>
                  </div>

                  <span style={{ fontWeight: 700, fontSize: 18, color: isBest ? '#fbbf24' : 'var(--accent)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                    {pr.est_1rm.toFixed(0)}
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 400, marginLeft: 3 }}>lbs</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </PageWrapper>
    </>
  )
}
