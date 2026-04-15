import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { EmptyState } from '../components/ui/EmptyState'
import { TrophyIcon, SearchIcon, DumbbellIcon } from '../components/ui/Icon'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import type { PrHistory, LiftType } from '../types'
import { usePageTitle } from '../hooks/usePageTitle'

const LIFT_ORDER: LiftType[] = ['Bench', 'Squat', 'Deadlift', 'PullUps', 'PushUps']

const RANK_LABELS = ['1st', '2nd', '3rd']

// Best lift ranking — strength score relative to each other
function BestLiftRanking({ prs }: { prs: PrHistory[] }) {
  // Get best PR per lift
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
    <div
      className="rounded-xl mb-4 overflow-hidden"
      style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <TrophyIcon size={13} color="var(--text-muted)" />
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#888' }}>
          Best Lift Ranking
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {ranked.map((r, i) => {
          const pct = (r.est1rm / max) * 100
          return (
            <div key={r.lift}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: i === 0 ? 'var(--accent)' : 'var(--text-muted)', minWidth: 28 }}>
                    {RANK_LABELS[i] ?? `#${i + 1}`}
                  </span>
                  <DumbbellIcon size={14} color="var(--text-secondary)" />
                  <span className="text-sm font-semibold text-white">{r.lift}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                  {r.est1rm.toFixed(0)} <span style={{ color: '#888', fontSize: 11, fontWeight: 400 }}>lbs</span>
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`, borderRadius: 999,
                  background: i === 0
                    ? 'linear-gradient(90deg, var(--accent), #ffd700)'
                    : 'rgba(255,255,255,0.15)',
                  transition: 'width 0.6s ease',
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
  const [prs, setPrs] = useState<PrHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<LiftType | 'All'>('All')

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

  // Group by lift for best-per-lift
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
        {!loading && <BestLiftRanking prs={prs} />}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {(['All', ...liftsWithData] as (LiftType | 'All')[]).map(l => (
            <button
              key={l}
              onClick={() => setFilter(l)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                background: filter === l ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                color:      filter === l ? 'var(--base-bg)' : '#888',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {l === 'All' ? 'All Lifts' : l}
            </button>
          ))}
        </div>

        {/* PR count */}
        {!loading && (
          <p className="text-xs mb-3" style={{ color: '#555' }}>
            {filtered.length} PR{filtered.length !== 1 ? 's' : ''} total
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
          <div className="flex flex-col gap-2">
            {filtered.map((pr, i) => {
              const isBest = bestPerLift[pr.lift] === pr.est_1rm
              return (
                <div
                  key={pr.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{
                    background: isBest && i < 5
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)'
                      : 'var(--card-bg)',
                    border: isBest && i < 5
                      ? '1px solid rgba(255,255,255,0.12)'
                      : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    <DumbbellIcon size={16} color="var(--text-secondary)" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{pr.lift}</span>
                      {isBest && (
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--accent)', color: 'var(--base-bg)', fontSize: 9 }}
                        >
                          BEST
                        </span>
                      )}
                    </div>
                    <span style={{ color: '#555', fontSize: 11 }}>{formatDate(pr.date)}</span>
                  </div>
                  <span className="font-bold text-lg" style={{ color: 'var(--accent)' }}>
                    {pr.est_1rm.toFixed(0)}
                    <span style={{ color: '#666', fontSize: 11, fontWeight: 400, marginLeft: 3 }}>lbs</span>
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
