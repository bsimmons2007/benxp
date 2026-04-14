import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Badge } from '../components/ui/Badge'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { syncChallenges, getAutoProgress } from '../lib/challenges'
import { loadHiddenSections, SECTION_DEFS } from '../lib/sections'
import { playGoalComplete } from '../lib/sounds'
import type { Challenge } from '../types'
import { CalendarIcon, SwordIcon } from '../components/ui/Icon'

// ── Tier config ────────────────────────────────────────────────

type TierKey = 'Weekly' | 'Monthly' | 'Boss'

const TIERS: { key: TierKey; label: string; icon: ReactNode; color: string; glow: string }[] = [
  { key: 'Weekly',  label: 'Weekly',  icon: <CalendarIcon size={20} color="currentColor" />, color: '#E94560', glow: 'rgba(233,69,96,0.3)' },
  { key: 'Monthly', label: 'Monthly', icon: <CalendarIcon size={20} color="currentColor" />, color: '#7B2FBE', glow: 'rgba(123,47,190,0.3)' },
  { key: 'Boss',    label: 'Boss',    icon: <SwordIcon    size={20} color="currentColor" />, color: 'var(--accent)', glow: 'rgba(245,166,35,0.3)' },
]

// ── Challenge card ─────────────────────────────────────────────

function ChallengeCard({
  challenge,
  onComplete,
  tierColor,
  tierGlow,
}: {
  challenge: Challenge
  onComplete: () => void
  tierColor: string
  tierGlow: string
}) {
  const [progress, setProgress] = useState<{ current: number; target: number } | null>(null)
  const isBoss = challenge.tier === 'Boss'
  const isCompleted = challenge.status === 'completed'
  const poolKey = challenge.notes ?? ''
  const targetValue = parseFloat(challenge.target ?? '0')

  useEffect(() => {
    if (!poolKey || !targetValue) return
    getAutoProgress(supabase, poolKey, targetValue).then(setProgress)
  }, [poolKey, targetValue])

  const pct = progress ? Math.min((progress.current / progress.target) * 100, 100) : null
  const autoCompleted = pct !== null && pct >= 100

  return (
    <div
      className={`rounded-xl p-4 mb-3 slide-in ${isBoss ? 'border-glow' : ''}`}
      style={{
        background: 'rgba(15, 20, 40, 0.7)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${isCompleted || autoCompleted ? tierColor : 'rgba(255,255,255,0.08)'}`,
        boxShadow: isCompleted || autoCompleted ? `0 0 20px ${tierGlow}` : 'none',
        transition: 'all 0.3s ease',
        opacity: isCompleted ? 0.55 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="font-bold text-white"
              style={{ fontFamily: isBoss ? 'Cinzel, serif' : 'Inter, sans-serif', fontSize: isBoss ? 15 : 14 }}
            >
              {challenge.challenge_name}
            </span>
            {challenge.category && <Badge label={challenge.category} />}
          </div>
          {challenge.target && (
            <p className="text-xs mb-2" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif', fontSize: 13 }}>
              Target: {challenge.target}
            </p>
          )}
          <span className="text-sm font-bold" style={{ color: tierColor }}>
            +{challenge.xp_reward.toLocaleString()} XP
          </span>
        </div>

        <div className="flex-shrink-0">
          {isCompleted || autoCompleted ? (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ background: '#4ade80', color: '#0a1a0a' }}
            >
              ✓
            </div>
          ) : (
            <button
              onClick={onComplete}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#CCCCCC' }}
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Auto-tracked progress bar */}
      {progress && !isCompleted && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: '#888' }}>Progress</span>
            <span className="text-xs font-semibold" style={{ color: autoCompleted ? '#4ade80' : 'var(--accent)' }}>
              {progress.current} / {progress.target}
            </span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full progress-bar-fill"
              style={{
                width: `${pct}%`,
                background: autoCompleted
                  ? 'linear-gradient(90deg, #4ade80aa, #4ade80)'
                  : 'linear-gradient(90deg, var(--accent-dim, rgba(245,166,35,0.6)), var(--accent))',
                transition: 'width 1s cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────

export function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [activeTier, setActiveTier] = useState<TierKey>('Weekly')
  const [syncing, setSyncing] = useState(true)
  const refreshXP = useStore((s) => s.refreshXP)

  async function syncAndLoad() {
    setSyncing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await syncChallenges(supabase, user.id)
    const { data } = await supabase.from('challenges')
      .select('*')
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false })
    setChallenges(data ?? [])
    setSyncing(false)
  }

  useEffect(() => { syncAndLoad() }, [])

  async function handleComplete(id: string) {
    await supabase.from('challenges')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
    playGoalComplete()
    await syncAndLoad()
    await refreshXP()
  }

  const tier = TIERS.find((t) => t.key === activeTier)!
  const hiddenCategories = loadHiddenSections().flatMap(k => SECTION_DEFS[k].categories)
  const active = challenges.filter((c) =>
    c.tier === activeTier && c.status === 'active' &&
    (!c.category || !hiddenCategories.includes(c.category))
  )
  const completed = challenges.filter((c) =>
    c.tier === activeTier && c.status === 'completed' &&
    (!c.category || !hiddenCategories.includes(c.category))
  )
  const visible = [...active, ...completed]
  const completedCount = completed.length

  return (
    <>
      <TopBar title="Challenges" />
      <PageWrapper>

        {/* Tier selector tabs */}
        <div className="flex gap-2 mb-5">
          {TIERS.map((t) => {
            const isActive = activeTier === t.key
            const tierChallenges = challenges.filter((c) => c.tier === t.key)
            const count = tierChallenges.length
            const done = tierChallenges.filter((c) => c.status === 'completed').length
            return (
              <button
                key={t.key}
                onClick={() => setActiveTier(t.key)}
                className="flex-1 flex flex-col items-center py-3 rounded-xl font-semibold transition-all duration-200"
                style={{
                  background: isActive ? t.color : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#fff' : '#888',
                  boxShadow: isActive ? `0 4px 20px ${t.glow}` : 'none',
                  border: `1px solid ${isActive ? t.color : 'rgba(255,255,255,0.06)'}`,
                  transform: isActive ? 'translateY(-2px)' : 'none',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>{t.icon}</span>
                <span className="text-xs">{t.label}</span>
                <span className="text-xs mt-0.5" style={{ opacity: 0.7 }}>{done}/{count}</span>
              </button>
            )
          })}
        </div>

        {/* Tier header */}
        <div
          className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between"
          style={{
            background: `linear-gradient(135deg, ${tier.color}22, ${tier.color}08)`,
            border: `1px solid ${tier.color}44`,
          }}
        >
          <div>
            <p className="font-bold text-white" style={{ fontFamily: 'Cinzel, serif', fontSize: 16 }}>
              {tier.icon} {tier.label} Challenges
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>
              {syncing ? 'Syncing...' : `${active.length} active · ${completedCount} completed`}
            </p>
          </div>
          {/* Mini completion bar */}
          <div className="w-16">
            <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: visible.length ? `${(completedCount / visible.length) * 100}%` : '0%',
                  background: tier.color,
                  transition: 'width 0.8s ease',
                }}
              />
            </div>
            <p className="text-xs text-right mt-1" style={{ color: tier.color }}>
              {visible.length ? Math.round((completedCount / visible.length) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Loading state */}
        {syncing && (
          <div className="text-center py-8" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>
            Loading challenges...
          </div>
        )}

        {/* Active challenges first */}
        {!syncing && active.map((c) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            onComplete={() => handleComplete(c.id)}
            tierColor={tier.color}
            tierGlow={tier.glow}
          />
        ))}

        {/* Completed challenges faded at bottom */}
        {!syncing && completed.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest mt-4 mb-2" style={{ color: '#555' }}>
              Completed
            </p>
            {completed.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                onComplete={() => {}}
                tierColor={tier.color}
                tierGlow={tier.glow}
              />
            ))}
          </>
        )}

        {/* Empty state */}
        {!syncing && active.length === 0 && completed.length === 0 && (
          <div className="text-center py-12" style={{ color: '#555', fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>
            No {activeTier.toLowerCase()} challenges yet.
          </div>
        )}

      </PageWrapper>
    </>
  )
}
