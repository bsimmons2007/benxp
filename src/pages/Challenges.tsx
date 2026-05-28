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
  daysUntilYearEnd,
  syncBossChallenges,
  getBossProgress,
  nextBossTarget,
  bossChallengeName,
} from '../lib/challenges'
import type { BossKey } from '../lib/challenges'
import { playGoalComplete } from '../lib/sounds'
import type { Challenge } from '../types'
import type { TutorialStep } from '../lib/challenges'
import { CheckIcon, ZapIcon, RefreshCwIcon, SwordIcon, TrophyIcon } from '../components/ui/Icon'
import { BossConqueredOverlay } from '../components/ui/BossConqueredOverlay'
import { usePageTitle } from '../hooks/usePageTitle'

// ── Tier color constants ───────────────────────────────────────────

const WEEKLY_COLOR  = 'var(--accent)'
const MONTHLY_COLOR = '#7c3aed'
const BOSS_COLOR    = '#f5a623'

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

// ── Challenge card (Weekly / Monthly) ─────────────────────────────

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
  const isClaimed   = challenge.status === 'claimed'
  const target      = parseFloat(challenge.target ?? '1') || 1
  const pct         = Math.min((progress / target) * 100, 100)
  const isDone      = pct >= 100
  const templateKey = challenge.notes ?? ''

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
        <div className="flex-1">
          <p className="font-semibold text-sm leading-snug mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {challenge.challenge_name}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {challenge.category && <Badge label={challenge.category} />}
            <span className="text-xs font-mono font-semibold" style={{ color: accentColor }}>
              +{challenge.xp_reward} XP
            </span>
            {isClaimed && (
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>· Claimed</span>
            )}
            {isDone && !isClaimed && (
              <span className="text-xs font-semibold" style={{ color: accentColor }}>· Done!</span>
            )}
          </div>
        </div>

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
              {isDone ? 'Complete!' : 'Progress'}
            </span>
            <span className="text-xs font-mono" style={{ color: isDone ? accentColor : 'var(--text-secondary)' }}>
              {progress} / {target}
            </span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'var(--surface-2)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: isDone ? accentColor : `linear-gradient(90deg, ${accentColor}88, ${accentColor})`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          {resetLabel}
        </span>
        {isClaimed ? (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <CheckIcon size={12} /> Claimed
          </span>
        ) : !isDone ? (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Complete to claim</span>
        ) : null}
      </div>

      {/* Claim button — full-width, prominent */}
      {!isClaimed && isDone && (
        <button
          onClick={() => onClaim(challenge.id, challenge.xp_reward)}
          className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-[0.98]"
          style={{
            padding: '13px 0',
            background: accentColor,
            color: '#1A1A2E',
            fontSize: 15,
            boxShadow: `0 4px 20px ${accentColor}44`,
            letterSpacing: '0.01em',
          }}
        >
          <ZapIcon size={16} color="#1A1A2E" />
          Claim {challenge.xp_reward} XP
        </button>
      )}

      {/* Reroll confirm inline */}
      {showRerollConfirm && (
        <div
          className="mt-3 rounded-xl p-3 flex flex-col gap-2.5"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Reroll this challenge?
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => { onReroll(challenge.id, templateKey); setShowRerollConfirm(false) }}
              className="flex-1 rounded-xl font-bold transition-all active:scale-95"
              style={{ padding: '10px 0', background: accentColor, color: '#1A1A2E', fontSize: 13 }}
            >
              Yes, reroll
            </button>
            <button
              onClick={() => setShowRerollConfirm(false)}
              className="flex-1 rounded-xl font-semibold transition-all active:scale-95"
              style={{ padding: '10px 0', background: 'var(--surface-3)', color: 'var(--text-secondary)', fontSize: 13 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Boss card ─────────────────────────────────────────────────────

function BossCard({
  challenge,
  onClaim,
}: {
  challenge: Challenge
  onClaim: (id: string, xp: number) => Promise<void>
}) {
  const [progress, setProgress] = useState<{ current: number; target: number } | null>(null)
  const [claiming, setClaiming] = useState(false)
  const poolKey   = challenge.notes ?? ''
  const targetVal = parseFloat(challenge.target ?? '0')
  const daysLeft  = daysUntilYearEnd()
  const isClaimed = challenge.status === 'claimed'

  useEffect(() => {
    if (!poolKey || !targetVal) return
    let cancelled = false
    getBossProgress(supabase, poolKey, targetVal).then(r => { if (!cancelled) setProgress(r) })
    return () => { cancelled = true }
  }, [poolKey, targetVal])

  const pct    = progress ? Math.min((progress.current / progress.target) * 100, 100) : null
  const isDone = pct !== null && pct >= 100

  const progressLabel = poolKey === 'boss_skate' ? 'Total Miles' : 'Best 1RM'
  const unit          = poolKey === 'boss_skate' ? 'mi' : 'lbs'
  const nextTarget    = nextBossTarget(poolKey as BossKey, targetVal)
  const nextName      = bossChallengeName(poolKey as BossKey, nextTarget)

  async function handleClaim() {
    setClaiming(true)
    await onClaim(challenge.id, challenge.xp_reward)
    setClaiming(false)
  }

  return (
    <div
      className="mb-4 rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'var(--surface-1)',
        border: `1px solid ${isDone && !isClaimed ? BOSS_COLOR + '99' : 'var(--border-subtle)'}`,
        boxShadow: isDone && !isClaimed ? `0 4px 24px ${BOSS_COLOR}28` : 'none',
        opacity: isClaimed ? 0.65 : 1,
      }}
    >
      {/* Top accent strip */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${BOSS_COLOR}44, ${BOSS_COLOR}, ${BOSS_COLOR}44)` }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${BOSS_COLOR}18`, border: `1px solid ${BOSS_COLOR}44` }}
          >
            <SwordIcon size={18} color={BOSS_COLOR} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-snug mb-2" style={{ color: 'var(--text-primary)', fontSize: 15 }}>
              {challenge.challenge_name}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-xs" style={{ color: BOSS_COLOR }}>
                +{challenge.xp_reward} XP
              </span>
              {challenge.category && <Badge label={challenge.category} />}
              {isClaimed && (
                <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: BOSS_COLOR }}>
                  <CheckIcon size={11} /> Conquered
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress */}
        {progress && !isClaimed && (
          <div className="mb-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="section-label">{progressLabel}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: isDone ? BOSS_COLOR : 'var(--text-secondary)' }}>
                {progress.current}
                <span style={{ color: 'var(--text-tertiary)', fontSize: 11, marginLeft: 2 }}>{unit}</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 400 }}> / {progress.target} {unit}</span>
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'var(--surface-2)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct ?? 0}%`,
                  background: isDone ? BOSS_COLOR : `linear-gradient(90deg, ${BOSS_COLOR}66, ${BOSS_COLOR})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
            Resets Jan 1 · {daysLeft} day{daysLeft === 1 ? '' : 's'} left
          </span>
          {isClaimed && (
            <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: BOSS_COLOR }}>
              <TrophyIcon size={12} /> Conquered
            </span>
          )}
          {!isDone && !isClaimed && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>In progress</span>
          )}
        </div>

        {/* Claim section — only shows when conquered */}
        {isDone && !isClaimed && (
          <div className="mt-4">
            {/* Next tier preview */}
            <div
              className="flex items-center gap-2.5 rounded-xl p-3 mb-3"
              style={{ background: `${BOSS_COLOR}0d`, border: `1px solid ${BOSS_COLOR}2a` }}
            >
              <ZapIcon size={14} color={BOSS_COLOR} />
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: BOSS_COLOR, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.2 }}>
                  Next tier unlocks after claiming
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {nextName}
                </p>
              </div>
            </div>

            {/* Claim button */}
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-[0.97]"
              style={{
                padding: '15px 0',
                background: `linear-gradient(135deg, ${BOSS_COLOR}ee, ${BOSS_COLOR})`,
                color: '#1A1A2E',
                fontSize: 16,
                boxShadow: `0 6px 28px ${BOSS_COLOR}55`,
                letterSpacing: '0.02em',
              }}
            >
              <TrophyIcon size={18} color="#1A1A2E" />
              {claiming ? 'Claiming…' : `Conquer — ${challenge.xp_reward} XP`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Weekly / Monthly section ──────────────────────────────────────

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
    return (progressMap[c.id] ?? 0) >= target
  }).length

  if (challenges.length === 0) return null

  return (
    <section className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            {label} Quests
          </h2>
          <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-secondary)' }}>
            {resetLabel}
            {' · '}
            <span style={{ color: rerolls > 0 ? accentColor : 'var(--text-secondary)' }}>
              {rerolls > 0 ? `${rerolls} reroll${rerolls === 1 ? '' : 's'} left` : 'No rerolls'}
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

      {/* Overall progress bar */}
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

      {claimed.length > 0 && (
        <>
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-2 mt-1"
            style={{ color: 'var(--text-secondary)', letterSpacing: '0.08em' }}
          >
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

  const [loading, setLoading]             = useState(true)
  const [challenges, setChallenges]       = useState<Challenge[]>([])
  const [progressMap, setProgressMap]     = useState<Record<string, number>>({})
  const [tutorialMode, setTutorialMode]   = useState(false)
  const [tutorialSteps, setTutorialSteps] = useState<TutorialStep[]>([])
  const [weeklyRerolls, setWeeklyRerolls] = useState(3)
  const [monthlyRerolls, setMonthlyRerolls] = useState(3)
  const [conqueredBoss, setConqueredBoss] = useState<{ name: string; xp: number; nextName: string } | null>(null)

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

      // Fetch progress for active weekly/monthly challenges in parallel
      const active = rows.filter(c => c.status === 'active' && (c.tier === 'Weekly' || c.tier === 'Monthly') && c.notes)
      const entries = await Promise.all(
        active.map(async c => {
          const prog = await getProgress(supabase, c.notes!, c.tier as 'Weekly' | 'Monthly')
          return [c.id, prog] as [string, number]
        })
      )
      setProgressMap(Object.fromEntries(entries))

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
    await supabase.from('challenges')
      .update({ status: 'claimed', completed_at: new Date().toISOString() })
      .eq('id', id)
    playGoalComplete()
    await refreshXP()
    await load()
  }

  // Separate wrapper — triggers the conquest overlay after claiming
  async function handleBossClaim(id: string, xp: number): Promise<void> {
    const c = challenges.find(ch => ch.id === id)
    await handleClaim(id, xp)
    if (c) {
      const poolKey    = c.notes ?? ''
      const targetVal  = parseFloat(c.target ?? '0')
      const nextTarget = nextBossTarget(poolKey as BossKey, targetVal)
      const nextName   = bossChallengeName(poolKey as BossKey, nextTarget)
      setConqueredBoss({ name: c.challenge_name, xp, nextName })
    }
  }

  async function handleClaimAll(tierChallenges: Challenge[]) {
    const claimable = tierChallenges.filter(c => {
      const target = parseFloat(c.target ?? '1') || 1
      return c.status === 'active' && (progressMap[c.id] ?? 0) >= target
    })
    if (claimable.length === 0) return
    await Promise.all(
      claimable.map(c =>
        supabase.from('challenges')
          .update({ status: 'claimed', completed_at: new Date().toISOString() })
          .eq('id', c.id)
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
  const hasAnyContent   = !tutorialMode && (weekly.length > 0 || monthly.length > 0 || boss.length > 0)

  return (
    <>
      {conqueredBoss && (
        <BossConqueredOverlay
          bossName={conqueredBoss.name}
          xp={conqueredBoss.xp}
          nextName={conqueredBoss.nextName}
          onDone={() => setConqueredBoss(null)}
        />
      )}
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
              accentColor={WEEKLY_COLOR}
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
              accentColor={MONTHLY_COLOR}
              resetLabel={monthResetLabel}
              rerolls={monthlyRerolls}
              challenges={monthly}
              progressMap={progressMap}
              onClaim={handleClaim}
              onReroll={(id, key) => handleReroll(id, 'monthly', key)}
              onClaimAll={() => handleClaimAll(monthly)}
            />

            {/* Boss section — yearly, long-haul challenges */}
            {boss.length > 0 && (
              <section className="mb-6">
                {/* Boss header */}
                <div
                  className="rounded-xl px-4 py-3 mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${BOSS_COLOR}14, ${BOSS_COLOR}05)`,
                    border: `1px solid ${BOSS_COLOR}33`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrophyIcon size={17} color={BOSS_COLOR} />
                      <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                        Boss Quests
                      </h2>
                    </div>
                    <span className="text-xs font-mono" style={{ color: BOSS_COLOR }}>
                      {daysUntilYearEnd()} days left
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Epic long-haul quests · Resets each January
                  </p>
                </div>

                {boss.map(c => <BossCard key={c.id} challenge={c} onClaim={handleBossClaim} />)}
              </section>
            )}
          </>
        )}
      </PageWrapper>
    </>
  )
}
