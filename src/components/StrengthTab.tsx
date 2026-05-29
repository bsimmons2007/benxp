// StrengthTab — full muscle ranking panel, embeddable inside Records or standalone.
// triggerLoad: set to true the first time the tab is shown to lazy-fetch data.

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { Card } from './ui/Card'
import { BodyMap } from './BodyMap'
import { playRankUp } from '../lib/sounds'
import {
  computeMuscleScores, computeStrengthQuotient, detectImbalances,
  MUSCLES, RANKS, IMBALANCE_PAIRS,
  type MuscleScoreResult, type LiftRow, type ExerciseDef, type ActivationRow, type RankMeta,
} from '../lib/muscleScore'

// ── Rank badge ────────────────────────────────────────────────────────────────

export function RankBadge({ rank, size = 'md' }: { rank: RankMeta; size?: 'sm' | 'md' | 'lg' }) {
  const sz  = size === 'lg' ? 18 : size === 'md' ? 13 : 11
  const pad = size === 'lg' ? '6px 14px' : size === 'md' ? '3px 8px' : '2px 5px'
  const color = rank.glow !== 'none' ? rank.glow : 'var(--text-tertiary)'
  return (
    <span style={{
      display: 'inline-block', padding: pad, borderRadius: 6,
      background: 'var(--surface-2)', border: `1px solid var(--border-default)`,
      color, fontSize: sz, fontWeight: 700, letterSpacing: '0.04em',
    }}>
      {rank.icon} {rank.label}
    </span>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function RankProgressBar({ result }: { result: MuscleScoreResult }) {
  const pct   = Math.round(result.progressToNext * 100)
  const color = result.rank.glow !== 'none' ? result.rank.glow : 'var(--accent)'
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Progress to next rank</span>
        <span style={{ fontSize: 10, color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{pct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: color, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

// ── Muscle detail panel ───────────────────────────────────────────────────────

function MuscleDetail({ result }: { result: MuscleScoreResult }) {
  const muscle   = MUSCLES.find(m => m.key === result.muscleKey)
  const nextRank = RANKS.find(r => r.tier === result.rank.tier + 1)
  const color    = result.rank.glow !== 'none' ? result.rank.glow : 'var(--text-tertiary)'

  return (
    <div className="pop-in" style={{ padding: '14px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 10, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 2 }}>
            {muscle?.group}
          </p>
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16 }}>
            {muscle?.name ?? result.muscleKey}
          </p>
        </div>
        <RankBadge rank={result.rank} size="md" />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
          {result.score.toFixed(3)}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>strength score</span>
        {result.isStale && (
          <span style={{
            fontSize: 10, color: 'var(--warning)',
            background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
            padding: '2px 6px', borderRadius: 4,
          }}>
            stale
          </span>
        )}
      </div>

      {result.rank.tier < 18 && <RankProgressBar result={result} />}
      {result.rank.tier === 18 && (
        <p style={{ fontSize: 12, color, textAlign: 'center', marginTop: 6 }}>Maximum rank achieved</p>
      )}

      {nextRank && result.rank.tier > 0 && (
        <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Need{' '}
            <span style={{ color: nextRank.glow !== 'none' ? nextRank.glow : 'var(--text-secondary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              +{(nextRank.minScore - result.score).toFixed(3)}
            </span>
            {' '}for{' '}
            <span style={{ color: nextRank.glow !== 'none' ? nextRank.glow : 'var(--text-secondary)' }}>
              {nextRank.label}
            </span>
          </span>
        </div>
      )}

      {result.contributions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', marginBottom: 6 }}>
            Contributing exercises
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.contributions.map((c, i) => {
              const pct = result.score > 0 ? ((c.weightedContrib / result.score) * 100).toFixed(0) : '0'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.exerciseName}
                      </span>
                      <span style={{ fontSize: 11, color, fontWeight: 700, flexShrink: 0, marginLeft: 4, fontFamily: 'var(--font-mono)' }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'var(--surface-2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, opacity: 0.7 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{c.oneRM.toFixed(0)} lbs</p>
                    {c.isStale && <p style={{ fontSize: 9, color: 'var(--warning)' }}>{c.daysAgo}d ago</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {result.rank.tier === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 12 }}>
          No data yet.{' '}
          <span style={{ color: 'var(--text-secondary)' }}>Log a lift for {muscle?.name ?? 'this muscle'}.</span>
        </p>
      )}
    </div>
  )
}

// ── Muscle group pill row ─────────────────────────────────────────────────────

function GroupRow({ group, results, selected, onSelect }: {
  group:    string
  results:  MuscleScoreResult[]
  selected: string | null
  onSelect: (key: string) => void
}) {
  const groupMuscles = MUSCLES.filter(m => m.group === group)
  return (
    <div style={{ marginBottom: 2 }}>
      <p style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 4 }}>
        {group}
      </p>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {groupMuscles.map(muscle => {
          const result     = results.find(r => r.muscleKey === muscle.key)
          const isSelected = selected === muscle.key
          const tier       = result?.rank.tier ?? 0
          // Ranked pill: dark medal background (rank.color) + vivid glow text
          // Unranked pill: subtle surface
          const pillBg   = tier > 0 ? result!.rank.color : 'var(--surface-2)'
          const textColor = tier > 0
            ? (result!.rank.glow !== 'none' ? result!.rank.glow : 'var(--text-primary)')
            : 'var(--text-tertiary)'
          const borderColor = isSelected
            ? textColor
            : tier > 0 ? `${textColor}55` : 'var(--border-subtle)'
          return (
            <button
              key={muscle.key}
              onClick={() => onSelect(muscle.key)}
              style={{
                padding: '4px 9px', borderRadius: 8,
                background: pillBg,
                border: `${isSelected ? '2px' : '1px'} solid ${borderColor}`,
                color: textColor,
                fontSize: 11, fontWeight: tier > 0 ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.12s',
                whiteSpace: 'nowrap',
                transform: isSelected ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              {muscle.name}
              {tier > 0 && (
                <span style={{ marginLeft: 3, fontSize: 10 }}>{result!.rank.icon}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Weak links ────────────────────────────────────────────────────────────────

function WeakLinksCard({ warnings }: { warnings: ReturnType<typeof detectImbalances> }) {
  if (warnings.length === 0) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ color: '#e07830' }}>⚠</span> Weak links
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {warnings.map((w, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 10,
            background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
          }}>
            <span style={{ color: '#e07830', fontSize: 13, flexShrink: 0 }}>△</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{w.label}</p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {w.direction} lags by {w.delta} tiers
              </p>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-disabled)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
              Rk {Math.min(w.aTier, w.bTier)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Rank tiers — collapsable full list ────────────────────────────────────────

function RankDropdown() {
  const ranked = [...RANKS.filter(r => r.tier > 0)].reverse()
  return (
    <details>
      <summary style={{
        cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '2px 0 10px',
        fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
        borderBottom: '1px solid var(--border-subtle)', userSelect: 'none',
      }}>
        <span>Rank Tiers</span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>▾ tap to expand</span>
      </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 10 }}>
        {ranked.map(rank => {
          const color = rank.glow !== 'none' ? rank.glow : 'var(--text-tertiary)'
          return (
            <div key={rank.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '7px 12px', borderRadius: 8,
              background: rank.color, border: `1px solid ${rank.border ?? 'transparent'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{rank.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color }}>{rank.label}</span>
              </div>
              <span style={{ fontSize: 11, color: `${color}99`, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                {rank.minScore.toFixed(2)}{rank.maxScore === Infinity ? '+' : ` – ${rank.maxScore.toFixed(2)}`}
              </span>
            </div>
          )
        })}
      </div>
    </details>
  )
}

// ── Strength Quotient medal ───────────────────────────────────────────────────

function SQMedal({ sq, topRank, rankedCount, setCount }: {
  sq:          number
  topRank:     RankMeta | null
  rankedCount: number
  setCount:    number
}) {
  const fill   = topRank && topRank.glow !== 'none' ? topRank.glow : 'var(--accent)'
  const discBg = topRank?.color ?? 'var(--surface-2)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 4px' }}>
      {/* Ribbon clasp bar */}
      <div style={{
        width: 40, height: 9, borderRadius: 5,
        background: fill, opacity: 0.72,
      }} />
      {/* Ribbon stem */}
      <div style={{ width: 3, height: 18, background: fill, opacity: 0.5 }} />

      {/* Medal disc */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%', position: 'relative',
        background: discBg,
        border: `3px solid ${fill}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Inner engraved ring */}
        <div style={{
          position: 'absolute', inset: 8, borderRadius: '50%',
          border: `1px solid ${fill}`, opacity: 0.28, pointerEvents: 'none',
        }} />
        <span style={{
          fontSize: 36, fontWeight: 800, color: fill,
          fontFamily: 'var(--font-mono)', lineHeight: 1,
        }}>
          {sq}
        </span>
        <span style={{
          fontSize: 8, color: fill, opacity: 0.7,
          letterSpacing: '0.14em', fontFamily: 'var(--font-mono)',
        }}>
          SQ
        </span>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10, fontWeight: 600 }}>
        Strength Quotient
      </p>
      {topRank && (
        <div style={{ marginTop: 4 }}>
          <RankBadge rank={topRank} size="sm" />
        </div>
      )}
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
        {rankedCount} muscles ranked · {setCount} sets
      </p>
    </div>
  )
}

// ── Main StrengthTab export ───────────────────────────────────────────────────

interface StrengthTabProps {
  triggerLoad: boolean
}

export function StrengthTab({ triggerLoad }: StrengthTabProps) {
  const [view,     setView]      = useState<'front' | 'back'>('front')
  const [selected, setSelected]  = useState<string | null>(null)
  const [loading,  setLoading]   = useState(false)
  const [loaded,   setLoaded]    = useState(false)

  const [liftLog,     setLiftLog]     = useState<LiftRow[]>([])
  const [exercises,   setExercises]   = useState<ExerciseDef[]>([])
  const [activations, setActivations] = useState<ActivationRow[]>([])
  const [bodyweight,  setBodyweight]  = useState(160)

  const totalXP = useStore(s => s.totalXP)

  useEffect(() => {
    if (!triggerLoad) return
    setLoading(true)

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [logRes, bwRes, exRes, actRes] = await Promise.all([
        supabase.from('lifting_log').select('lift,weight,reps,sets,est_1rm,bodyweight,duration_secs,date').eq('user_id', user.id),
        supabase.from('bodyweight_log').select('weight_lbs').eq('user_id', user.id).order('date', { ascending: false }).limit(1),
        supabase.from('exercises').select('name,type,weight_multiplier,equipment'),
        supabase.from('exercise_muscle_activations').select('muscle_key, activation, exercises(name)').order('activation', { ascending: false }),
      ])

      let bw = 160
      if (bwRes.data?.[0]) bw = Number(bwRes.data[0].weight_lbs)
      else {
        const bwFromLifts = (logRes.data ?? []).find((r: LiftRow) => r.bodyweight != null)?.bodyweight
        if (bwFromLifts) bw = bwFromLifts
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flatActs: ActivationRow[] = (actRes.data ?? []).map((a: any) => ({
        exercise_name: a.exercises?.name ?? '',
        muscle_key:    a.muscle_key,
        activation:    Number(a.activation),
      })).filter((a: ActivationRow) => a.exercise_name)

      setLiftLog(logRes.data ?? [])
      setExercises(exRes.data ?? [])
      setActivations(flatActs)
      setBodyweight(bw)
      setLoaded(true)
      setLoading(false)
      if ((logRes.data ?? []).length > 0 && !loaded) setTimeout(() => playRankUp(), 600)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerLoad, totalXP])

  const results = useMemo(() =>
    computeMuscleScores(liftLog, exercises, activations, bodyweight),
  [liftLog, exercises, activations, bodyweight])

  const sq          = useMemo(() => computeStrengthQuotient(results), [results])
  const imbalances  = useMemo(() => detectImbalances(results), [results])
  const topRank     = useMemo(() => {
    const ranked = results.filter(r => r.rank.tier > 0).sort((a, b) => b.rank.tier - a.rank.tier)
    return ranked[0]?.rank ?? null
  }, [results])
  const rankedCount = useMemo(() => results.filter(r => r.rank.tier > 0).length, [results])

  const lagKeys = useMemo(() => {
    const keys = new Set<string>()
    imbalances.forEach(w => {
      const pair = IMBALANCE_PAIRS.find(p => p.label === w.label)
      if (pair) {
        if (w.aTier < w.bTier) keys.add(pair.a)
        else keys.add(pair.b)
      }
    })
    return keys
  }, [imbalances])

  const selectedResult = selected ? results.find(r => r.muscleKey === selected) : null
  const GROUPS = ['chest', 'shoulders', 'arms', 'back', 'core', 'legs']

  function handleSelect(key: string) {
    setSelected(prev => prev === key ? null : key)
    const muscle = MUSCLES.find(m => m.key === key)
    if (muscle?.side === 'back'  && view === 'front') setView('back')
    if (muscle?.side === 'front' && view === 'back')  setView('front')
  }

  if (!triggerLoad && !loaded) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading strength data…</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Computing strength scores…</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="md:flex md:gap-4 md:items-start">

        {/* ── Left: body map ── */}
        <div className="md:w-[42%] md:sticky md:top-[84px]">
          <Card style={{ padding: '14px 10px 10px', marginBottom: 12 }}>

            {/* Physique header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  Physique
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Overall physique ranking</p>
              </div>
              {topRank
                ? <RankBadge rank={topRank} size="md" />
                : <span style={{ fontSize: 11, color: 'var(--text-disabled)', paddingTop: 2 }}>Unranked</span>
              }
            </div>

            {/* View toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['front', 'back'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    flex: 1, padding: '5px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: view === v ? 'var(--accent)' : 'var(--surface-2)',
                    color:      view === v ? 'var(--base-bg)' : 'var(--text-secondary)',
                    border:     view === v ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer', transition: 'all 0.12s', textTransform: 'capitalize',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            <BodyMap
              view={view}
              scores={results}
              selected={selected}
              onSelect={handleSelect}
              imbalancedKeys={lagKeys.size > 0 ? lagKeys : undefined}
            />

            {selectedResult && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 8 }}>
                <MuscleDetail result={selectedResult} />
              </div>
            )}
          </Card>
        </div>

        {/* ── Right: stats + muscles + tiers ── */}
        <div className="md:flex-1">

          {/* SQ medal */}
          <Card style={{ marginBottom: 12 }}>
            <SQMedal
              sq={sq}
              topRank={topRank}
              rankedCount={rankedCount}
              setCount={liftLog.length}
            />
          </Card>

          {/* Weak links */}
          {imbalances.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <WeakLinksCard warnings={imbalances} />
            </Card>
          )}

          {/* Muscle group breakdown */}
          <Card style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              All Muscles
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {GROUPS.map(group => (
                <GroupRow
                  key={group}
                  group={group}
                  results={results}
                  selected={selected}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </Card>

          {/* Rank tiers — collapsable */}
          <Card>
            <RankDropdown />
          </Card>
        </div>

      </div>
    </div>
  )
}

// ── Convenience hook for external SQ display (Home.tsx etc.) ─────────────────

let snapshotCache: { sq: number | null; topRank: RankMeta | null; ts: number } | null = null
const SNAPSHOT_TTL = 5 * 60 * 1000

export function useStrengthSnapshot() {
  const [sq, setSq]           = useState<number | null>(snapshotCache?.sq ?? null)
  const [topRank, setTopRank] = useState<RankMeta | null>(snapshotCache?.topRank ?? null)

  useEffect(() => {
    if (snapshotCache && Date.now() - snapshotCache.ts < SNAPSHOT_TTL) return
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [logRes, bwRes, exRes, actRes] = await Promise.all([
        supabase.from('lifting_log').select('lift,weight,reps,sets,est_1rm,bodyweight,duration_secs,date').eq('user_id', user.id),
        supabase.from('bodyweight_log').select('weight_lbs').eq('user_id', user.id).order('date', { ascending: false }).limit(1),
        supabase.from('exercises').select('name,type,weight_multiplier,equipment'),
        supabase.from('exercise_muscle_activations').select('muscle_key, activation, exercises(name)').order('activation', { ascending: false }),
      ])

      let bw = 160
      if (bwRes.data?.[0]) bw = Number(bwRes.data[0].weight_lbs)
      else {
        const bwFromLifts = (logRes.data ?? []).find((r: LiftRow) => r.bodyweight != null)?.bodyweight
        if (bwFromLifts) bw = bwFromLifts
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flatActs: ActivationRow[] = (actRes.data ?? []).map((a: any) => ({
        exercise_name: a.exercises?.name ?? '',
        muscle_key:    a.muscle_key,
        activation:    Number(a.activation),
      })).filter((a: ActivationRow) => a.exercise_name)

      const r      = computeMuscleScores(logRes.data ?? [], exRes.data ?? [], flatActs, bw)
      const sqVal  = computeStrengthQuotient(r)
      const ranked = r.filter(x => x.rank.tier > 0).sort((a, b) => b.rank.tier - a.rank.tier)
      const best   = ranked[0]?.rank ?? null

      snapshotCache = { sq: sqVal, topRank: best, ts: Date.now() }
      setSq(sqVal)
      setTopRank(best)
    }
    load()
  }, [])

  return { sq, topRank }
}
