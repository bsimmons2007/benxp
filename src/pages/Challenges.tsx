import { useEffect, useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Badge } from '../components/ui/Badge'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import type { Challenge } from '../types'

// ── Auto-tracking ──────────────────────────────────────────────

function startOfWeek() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}
function startOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function startOfYear() {
  return `${new Date().getFullYear()}-01-01`
}

interface AutoProgress { current: number; target: number | null }

async function getAutoProgress(name: string): Promise<AutoProgress | null> {
  const sw = startOfWeek()
  const sm = startOfMonth()
  const sy = startOfYear()

  // Weekly
  if (name === 'Hit the gym 4x this week') {
    const { data } = await supabase.from('lifting_log').select('date').gte('date', sw)
    const days = new Set(data?.map((r: { date: string }) => r.date)).size
    return { current: days, target: 4 }
  }
  if (name === 'Skate 3x this week') {
    const { count } = await supabase.from('skate_sessions').select('id', { count: 'exact', head: true }).gte('date', sw)
    return { current: count ?? 0, target: 3 }
  }
  if (name === 'Skate 20+ miles this week') {
    const { data } = await supabase.from('skate_sessions').select('miles').gte('date', sw)
    const total = data?.reduce((s: number, r: { miles: number }) => s + r.miles, 0) ?? 0
    return { current: Math.round(total * 10) / 10, target: 20 }
  }
  if (name === 'Finish a book this week') {
    const { count } = await supabase.from('books').select('id', { count: 'exact', head: true }).gte('date_finished', sw)
    return { current: count ?? 0, target: 1 }
  }

  // Monthly
  if (name === 'Hit the gym 12x this month') {
    const { data } = await supabase.from('lifting_log').select('date').gte('date', sm)
    const days = new Set(data?.map((r: { date: string }) => r.date)).size
    return { current: days, target: 12 }
  }
  if (name === 'New PR in any lift') {
    const { count } = await supabase.from('pr_history').select('id', { count: 'exact', head: true }).gte('date', sm)
    return { current: count ?? 0, target: 1 }
  }
  if (name === 'Skate 50 miles this month') {
    const { data } = await supabase.from('skate_sessions').select('miles').gte('date', sm)
    const total = data?.reduce((s: number, r: { miles: number }) => s + r.miles, 0) ?? 0
    return { current: Math.round(total * 10) / 10, target: 50 }
  }
  if (name === 'Finish 2 books this month') {
    const { count } = await supabase.from('books').select('id', { count: 'exact', head: true }).gte('date_finished', sm)
    return { current: count ?? 0, target: 2 }
  }
  if (name === 'Win a Fortnite game this month') {
    const { count } = await supabase.from('fortnite_games').select('id', { count: 'exact', head: true }).eq('win', true).gte('date', sm)
    return { current: count ?? 0, target: 1 }
  }
  if (name === 'Get a 10-kill game') {
    const { data } = await supabase.from('fortnite_games').select('kills').gte('date', sm).order('kills', { ascending: false }).limit(1)
    return { current: data?.[0]?.kills ?? 0, target: 10 }
  }

  // Boss
  if (name === 'Bench 175 lbs (Est 1RM)') {
    const { data } = await supabase.from('pr_history').select('est_1rm').eq('lift', 'Bench').order('est_1rm', { ascending: false }).limit(1)
    return { current: data?.[0]?.est_1rm ?? 0, target: 175 }
  }
  if (name === 'Squat 200 lbs (Est 1RM)') {
    const { data } = await supabase.from('pr_history').select('est_1rm').eq('lift', 'Squat').order('est_1rm', { ascending: false }).limit(1)
    return { current: data?.[0]?.est_1rm ?? 0, target: 200 }
  }
  if (name === 'Deadlift 200 lbs (Est 1RM)') {
    const { data } = await supabase.from('pr_history').select('est_1rm').eq('lift', 'Deadlift').order('est_1rm', { ascending: false }).limit(1)
    return { current: data?.[0]?.est_1rm ?? 0, target: 200 }
  }
  if (name === 'Skate 100 total miles') {
    const { data } = await supabase.from('skate_sessions').select('miles')
    const total = data?.reduce((s: number, r: { miles: number }) => s + r.miles, 0) ?? 0
    return { current: Math.round(total * 10) / 10, target: 100 }
  }
  if (name === 'Read 10 books in 2026') {
    const { count } = await supabase.from('books').select('id', { count: 'exact', head: true }).gte('date_finished', sy)
    return { current: count ?? 0, target: 10 }
  }
  if (name === 'Win 5 Fortnite games total') {
    const { count } = await supabase.from('fortnite_games').select('id', { count: 'exact', head: true }).eq('win', true)
    return { current: count ?? 0, target: 5 }
  }
  if (name === "Match all-time record (22 wins)") {
    const { count } = await supabase.from('fortnite_games').select('id', { count: 'exact', head: true }).eq('win', true)
    return { current: count ?? 0, target: 22 }
  }

  return null
}

// ── Tier config ────────────────────────────────────────────────

const TIERS = [
  { key: 'Weekly',  label: 'Weekly',  icon: '📅', color: '#E94560', glow: 'rgba(233,69,96,0.3)' },
  { key: 'Monthly', label: 'Monthly', icon: '🗓️', color: '#7B2FBE', glow: 'rgba(123,47,190,0.3)' },
  { key: 'Boss',    label: 'Boss',    icon: '💀', color: '#F5A623', glow: 'rgba(245,166,35,0.3)' },
] as const
type TierKey = 'Weekly' | 'Monthly' | 'Boss'

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
  const [progress, setProgress] = useState<AutoProgress | null>(null)
  const isBoss = challenge.tier === 'Boss'
  const isCompleted = challenge.status === 'completed'

  useEffect(() => {
    getAutoProgress(challenge.challenge_name).then(setProgress)
  }, [challenge.challenge_name])

  const pct = progress && progress.target
    ? Math.min((progress.current / progress.target) * 100, 100)
    : null

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
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ background: tierColor }}>
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
      {progress && progress.target && !isCompleted && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: '#888' }}>Progress</span>
            <span className="text-xs font-semibold" style={{ color: tierColor }}>
              {progress.current} / {progress.target}
            </span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full progress-bar-fill"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${tierColor}aa, ${tierColor})`,
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
  const refreshXP = useStore((s) => s.refreshXP)

  async function load() {
    const { data } = await supabase.from('challenges').select('*')
    setChallenges(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleComplete(id: string) {
    await supabase.from('challenges').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
    await load()
    await refreshXP()
  }

  const tier = TIERS.find((t) => t.key === activeTier)!
  const visible = challenges.filter((c) => c.tier === activeTier)
  const completedCount = visible.filter((c) => c.status === 'completed').length

  return (
    <>
      <TopBar title="Challenges" />
      <PageWrapper>

        {/* Tier selector tabs */}
        <div className="flex gap-2 mb-5">
          {TIERS.map((t) => {
            const isActive = activeTier === t.key
            const count = challenges.filter((c) => c.tier === t.key).length
            const done = challenges.filter((c) => c.tier === t.key && c.status === 'completed').length
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
                <span className="text-xl mb-1">{t.icon}</span>
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
              {completedCount} of {visible.length} completed
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

        {/* Challenge cards */}
        {visible.map((c) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            onComplete={() => handleComplete(c.id)}
            tierColor={tier.color}
            tierGlow={tier.glow}
          />
        ))}

      </PageWrapper>
    </>
  )
}
