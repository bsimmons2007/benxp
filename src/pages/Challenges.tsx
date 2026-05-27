import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Badge } from '../components/ui/Badge'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import {
  syncUserChallenges,
  getProgress,
  rerollChallenge,
  isTutorialMode,
  getTutorialSteps,
  getRerollsRemaining,
  nextMondayLabel,
  daysUntilMonthEnd,
  syncBossChallenges,
  getBossProgress,
} from '../lib/challenges'
import { playGoalComplete } from '../lib/sounds'
import type { Challenge } from '../types'
import type { TutorialStep } from '../lib/challenges'
import { CheckIcon, ZapIcon, RefreshCwIcon, SwordIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

// ── Skeleton ───────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div>
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="mb-3 rounded-xl animate-pulse"
          style={{ height: 96, background: 'var(--surface-2)' }}
        />
      ))}
    </div>
  )
}

// ── Challenge card ─────────────────────────────────────────────────

interface ChallengeCardProps {
  challenge: Challenge
  progress: number
  accentColor: string
  resetLabel: string
  canReroll: boolean
  onClaim: (id: string, xp: number) => void
  onReroll: (id: string, key: string) => void
}

function ChallengeCard({
  challenge,
  progress,
  accentColor,
  resetLabel,
  canReroll,
  onClaim,
  onReroll,
}: ChallengeCardProps) {
  const [showRerollConfirm, setShowRerollConfirm] = useState(false)
  const isClaimed  = challenge.status === 'claimed'
  const target     = parseFloat(challenge.target ?? '1') || 1
  const pct        = Math.min((progress / target) * 100, 100)
  const isDone     = pct >= 100
  const templateKey = challenge.notes ?? ''

  const progressLabel = isDone ? 'Complete!' : 'Progress'

  return (
    <div
      className="mb-3 rounded-xl p-4 transition-all"
      style={{
        background: 'var(--surface-1)',
        border: `1px solid ${isDone && !isClaimed ? accentColor + '66' : 'var(--border)'}`,
        boxShadow: isDone && !isClaimed ? `0 0 16px ${accentColor}22` : 'none',
        opacity: isClaimed ? 0.6 : 1,
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {challenge.category && <Badge label={challenge.category} />}
            <span
              className="text-xs font-mono font-semibold"
              style={{ color: accentColor }}
            >
              +{challenge.xp_reward} XP
            </span>
            {isClaimed && (
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Claimed
              </span>
            )}
            {isDone && !isClaimed && (
              <span className="text-xs font-semibold" style={{ color: accentColor }}>
                Complete!
              </span>
            )}
          </div>
          <p className="font-semibold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
            {challenge.challenge_name}
          </p>
        </div>
        {/* Reroll button */}
        {!isClaimed && (
          <button
            onClick={() => setShowRerollConfirm(true)}
            disabled={!canReroll}
            className="flex-shrink-0 p-1.5 rounded-lg transition-all"
            title={canReroll ? 'Reroll this challenge' : 'No rerolls remaining'}
            style={{
              background: 'var(--surface-2)',
              color: canReroll ? 'var(--text-secondary)' : 'var(--text-disabled)',
              opacity: canReroll ? 1 : 0.4,
              cursor: canReroll ? 'pointer' : 'not-allowed',
            }}
          >
            <RefreshCwIcon size={13} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {!isClaimed && (
        <div className="mt-3">
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {progressLabel}
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: isDone ? accentColor : 'var(--text-secondary)' }}
            >
              {progress} / {target}
            </span>
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 4, background: 'var(--surface-2)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: isDone
                  ? accentColor
                  : `linear-gradient(90deg, ${accentColor}88, ${accentColor})`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          {resetLabel}
        </span>
        {!isClaimed && isDone ? (
          <button
            onClick={() => onClaim(challenge.id, challenge.xp_reward)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95"
            style={{ background: accentColor, color: 'var(--surface-0)' }}
          >
            Claim {challenge.xp_reward} XP
          </button>
        ) : !isClaimed ? (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Complete to claim
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <CheckIcon size={12} /> Claimed
          </span>
        )}
      </div>

      {/* Reroll confirm inline */}
      {showRerollConfirm && (
        <div
          className="mt-2 rounded-lg p-3 flex items-center gap-3"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <span className="text-xs flex-1" style={{ color: 'var(--text-primary)' }}>
            Reroll this challenge?
          </span>
          <button
            onClick={() => { onReroll(challenge.id, templateKey); setShowRerollConfirm(false) }}
            className="text-xs px-2 py-1 rounded-md font-semibold"
            style={{ background: accentColor, color: 'var(--surface-0)' }}
          >
            Yes
          </button>
          <button
            onClick={() => setShowRerollConfirm(false)}
            className="text-xs px-2 py-1 rounded-md"
            style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ── Boss card ─────────────────────────────────────────────────────

function BossCard({ challenge }: { challenge: Challenge }) {
  const [progress, setProgress] = useState<{ current: number; target: number } | null>(null)
  const poolKey = challenge.notes ?? ''
  const targetValue = parseFloat(challenge.target ?? '0')

  useEffect(() => {
    if (!poolKey || !targetValue) return
    let cancelled = false
    getBossProgress(supabase, poolKey, targetValue).then(r => { if (!cancelled) setProgress(r) })
    return () => { cancelled = true }
  }, [poolKey, targetValue])

  const pct    = progress ? Math.min((progress.current / progress.target) * 100, 100) : null
  const isDone = pct !== null && pct >= 100

  return (
    <div
      className="mb-3 rounded-xl p-4 transition-all"
      style={{
        background: 'var(--surface-1)',
        border: `1px solid ${isDone ? 'var(--accent)' : 'var(--border)'}`,
        boxShadow: isDone ? '0 0 16px var(--accent)22' : 'none',
      }}
    >
      <div className="flex items-start gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}
        >
          <SwordIcon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge label={challenge.category ?? 'Boss'} />
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>
              +{challenge.xp_reward} XP
            </span>
          </div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {challenge.challenge_name}
          </p>
        </div>
      </div>
      {progress && (
        <div className="mt-2">
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Current 1RM</span>
            <span className="text-xs font-mono" style={{ color: isDone ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {progress.current} / {progress.target}
            </span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'var(--surface-2)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct ?? 0}%`, background: 'var(--accent)' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section component ─────────────────────────────────────────────

interface ChallengesSectionProps {
  label: string
  accentColor: string
  resetLabel: string
  rerolls: number
  challenges: Challenge[]
  progressMap: Record<string, number>
  onClaim: (id: string, xp: number) => void
  onReroll: (id: string, key: string) => void
  onClaimAll: () => void
}

function ChallengesSection({
  label,
  accentColor,
  resetLabel,
  rerolls,
  challenges,
  progressMap,
  onClaim,
  onReroll,
  onClaimAll,
}: ChallengesSectionProps) {
  const active  = challenges.filter(c => c.status === 'active')
  const claimed = challenges.filter(c => c.status === 'claimed')

  const claimableCount = active.filter(c => {
    const target = parseFloat(c.target ?? '1') || 1
    const prog   = progressMap[c.id] ?? 0
    return prog >= target
  }).length

  if (challenges.length === 0) return null

  return (
    <section className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            {label} Quests
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {resetLabel}
            {' · '}
            <span style={{ color: rerolls > 0 ? accentColor : 'var(--text-secondary)' }}>
              {rerolls > 0 ? `${rerolls} rerolls left` : 'No rerolls left'}
            </span>
          </p>
        </div>
        {claimableCount > 1 && (
          <button
            onClick={onClaimAll}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95"
            style={{ background: accentColor, color: 'var(--surface-0)' }}
          >
            Claim All ({claimableCount})
          </button>
        )}
      </div>

      {/* Progress pills */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: 'var(--surface-2)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: challenges.length > 0 ? `${(claimed.length / challenges.length) * 100}%` : '0%',
              background: accentColor,
            }}
          />
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          {claimed.length}/{challenges.length}
        </span>
      </div>

      {/* Active challenges */}
      {active.map(c => (
        <ChallengeCard
          key={c.id}
          challenge={c}
          progress={progressMap[c.id] ?? 0}
          accentColor={accentColor}
          resetLabel={resetLabel}
          canReroll={rerolls > 0}
          onClaim={onClaim}
          onReroll={onReroll}
        />
      ))}

      {/* Claimed challenges */}
      {claimed.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 mt-1" style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
            Claimed
          </p>
          {claimed.map(c => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              progress={progressMap[c.id] ?? 0}
              accentColor={accentColor}
              resetLabel={resetLabel}
              canReroll={false}
              onClaim={onClaim}
              onReroll={onReroll}
            />
          ))}
        </>
      )}
    </section>
  )
}

// ── Tutorial section ──────────────────────────────────────────────

function TutorialSection({ steps, onRefresh }: { steps: TutorialStep[]; onRefresh: () => void }) {
  const doneCount = steps.filter(s => s.done).length
  const allDone   = doneCount === steps.length

  const SECTION_PATHS: Record<string, string> = {
    theme:   '/settings',
    workout: '/records',
    mood:    '/mood',
    water:   '/water',
    sleep:   '/sleep',
  }

  return (
    <div>
      {/* Header */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{
          background: 'linear-gradient(135deg, var(--accent)18, var(--accent)06)',
          border: '1px solid var(--accent)44',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <ZapIcon size={18} color="var(--accent)" />
          <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
            Getting Started
          </h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Complete these steps to unlock personalized quests that adapt to your activity.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: 'var(--surface-2)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(doneCount / steps.length) * 100}%`, background: 'var(--accent)' }}
            />
          </div>
          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>
            {doneCount}/{steps.length}
          </span>
        </div>
        {allDone && (
          <button
            onClick={onRefresh}
            className="mt-3 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95"
            style={{ background: 'var(--accent)', color: 'var(--surface-0)' }}
          >
            Unlock My Quests
          </button>
        )}
      </div>

      {/* Steps */}
      {steps.map(step => (
        <Link
          key={step.key}
          to={SECTION_PATHS[step.key] ?? '/'}
          className="block mb-3 rounded-xl p-4 transition-all"
          style={{
            background: 'var(--surface-1)',
            border: `1px solid ${step.done ? 'var(--accent)44' : 'var(--border)'}`,
            opacity: step.done ? 0.65 : 1,
            textDecoration: 'none',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: step.done ? 'var(--accent)' : 'var(--surface-2)',
                color: step.done ? 'var(--surface-0)' : 'var(--text-secondary)',
              }}
            >
              {step.done ? <CheckIcon size={14} /> : <ZapIcon size={14} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: step.done ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                {step.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {step.description}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export function Challenges() {
  usePageTitle('Quests')

  const [loading, setLoading]                   = useState(true)
  const [challenges, setChallenges]             = useState<Challenge[]>([])
  const [progressMap, setProgressMap]           = useState<Record<string, number>>({})
  const [tutorialMode, setTutorialMode]         = useState(false)
  const [tutorialSteps, setTutorialSteps]       = useState<TutorialStep[]>([])
  const [weeklyRerolls, setWeeklyRerolls]       = useState(3)
  const [monthlyRerolls, setMonthlyRerolls]     = useState(3)

  const refreshXP = useStore(s => s.refreshXP)

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await syncUserChallenges(supabase, user.id)
      await syncBossChallenges(supabase, user.id)

      const { data } = await supabase
        .from('challenges')
        .select('*')
        .in('status', ['active', 'claimed'])
        .in('tier', ['Weekly', 'Monthly', 'Boss'])
        .order('created_at', { ascending: false })

      const rows = (data ?? []) as Challenge[]
      setChallenges(rows)

      setWeeklyRerolls(getRerollsRemaining('weekly'))
      setMonthlyRerolls(getRerollsRemaining('monthly'))

      // Fetch progress for all active weekly/monthly challenges in parallel
      const active = rows.filter(c => c.status === 'active' && (c.tier === 'Weekly' || c.tier === 'Monthly') && c.notes)
      const entries = await Promise.all(
        active.map(async c => {
          const prog = await getProgress(supabase, c.notes!, c.tier as 'Weekly' | 'Monthly')
          return [c.id, prog] as [string, number]
        })
      )
      setProgressMap(Object.fromEntries(entries))

      // Tutorial mode
      const tutorial = await isTutorialMode(supabase)
      setTutorialMode(tutorial)
      if (tutorial) {
        const steps = await getTutorialSteps(supabase)
        setTutorialSteps(steps)
      }
    } catch (e) {
      console.error('[Challenges] load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleClaim(id: string, xp: number) {
    await supabase
      .from('challenges')
      .update({ status: 'claimed', completed_at: new Date().toISOString() })
      .eq('id', id)
    playGoalComplete()
    await refreshXP()
    await load()
  }

  async function handleClaimAll(tierChallenges: Challenge[]) {
    const claimable = tierChallenges.filter(c => {
      const target = parseFloat(c.target ?? '1') || 1
      const prog   = progressMap[c.id] ?? 0
      return c.status === 'active' && prog >= target
    })
    if (claimable.length === 0) return
    await Promise.all(
      claimable.map(c =>
        supabase.from('challenges').update({ status: 'claimed', completed_at: new Date().toISOString() }).eq('id', c.id)
      )
    )
    playGoalComplete()
    await refreshXP()
    await load()
  }

  async function handleReroll(challengeId: string, period: 'weekly' | 'monthly', templateKey: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const success = await rerollChallenge(supabase, user.id, challengeId, period, templateKey)
    if (success) {
      setWeeklyRerolls(getRerollsRemaining('weekly'))
      setMonthlyRerolls(getRerollsRemaining('monthly'))
      await load()
    }
  }

  const weekly  = challenges.filter(c => c.tier === 'Weekly')
  const monthly = challenges.filter(c => c.tier === 'Monthly')
  const boss    = challenges.filter(c => c.tier === 'Boss')

  const monthResetLabel = `Resets in ${daysUntilMonthEnd()} day${daysUntilMonthEnd() === 1 ? '' : 's'}`

  const hasAnyContent = !tutorialMode && (weekly.length > 0 || monthly.length > 0 || boss.length > 0)

  return (
    <>
      <TopBar title="Quests" />
      <PageWrapper>
        {loading ? (
          <LoadingSkeleton />
        ) : tutorialMode ? (
          <TutorialSection steps={tutorialSteps} onRefresh={load} />
        ) : (
          <>
            {!hasAnyContent && (
              <div className="text-center py-12" style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Start logging in any section to unlock personalized challenges.
              </div>
            )}

            <ChallengesSection
              label="Weekly"
              accentColor="var(--accent)"
              resetLabel={nextMondayLabel()}
              rerolls={weeklyRerolls}
              challenges={weekly}
              progressMap={progressMap}
              onClaim={handleClaim}
              onReroll={(id, key) => handleReroll(id, 'weekly', key)}
              onClaimAll={() => handleClaimAll(weekly)}
            />

            <ChallengesSection
              label="Monthly"
              accentColor="#7c3aed"
              resetLabel={monthResetLabel}
              rerolls={monthlyRerolls}
              challenges={monthly}
              progressMap={progressMap}
              onClaim={handleClaim}
              onReroll={(id, key) => handleReroll(id, 'monthly', key)}
              onClaimAll={() => handleClaimAll(monthly)}
            />

            {boss.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <SwordIcon size={16} color="var(--accent)" />
                  <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    Boss Challenges
                  </h2>
                </div>
                {boss.map(c => <BossCard key={c.id} challenge={c} />)}
              </section>
            )}
          </>
        )}
      </PageWrapper>
    </>
  )
}
