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
  return (
    <span
      style={{
        display: 'inline-block', padding: pad, borderRadius: 6,
        background: rank.color, border: `1px solid ${rank.border}`,
        color: rank.glow !== 'none' ? rank.glow : '#aaa',
        fontSize: sz, fontWeight: 700, fontFamily: 'Cinzel, serif',
        letterSpacing: '0.04em',
        boxShadow: rank.glow !== 'none' ? `0 0 8px ${rank.glow}55` : 'none',
      }}
    >
      {rank.icon} {rank.label}
    </span>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function RankProgressBar({ result }: { result: MuscleScoreResult }) {
  const pct  = Math.round(result.progressToNext * 100)
  const glow = result.rank.glow !== 'none' ? result.rank.glow : 'var(--accent)'
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: '#666' }}>Progress to next rank</span>
        <span style={{ fontSize: 10, color: glow, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%', width: `${pct}%`, borderRadius: 3,
            background: result.rank.tier >= 16
              ? `linear-gradient(90deg, ${result.rank.color}, ${glow})`
              : glow,
            boxShadow: `0 0 6px ${glow}88`,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  )
}

// ── Muscle detail panel ───────────────────────────────────────────────────────

function MuscleDetail({ result }: { result: MuscleScoreResult }) {
  const muscle  = MUSCLES.find(m => m.key === result.muscleKey)
  const nextRank = RANKS.find(r => r.tier === result.rank.tier + 1)
  const glow    = result.rank.glow !== 'none' ? result.rank.glow : '#888'

  return (
    <div className="pop-in" style={{ padding: '16px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ color: '#aaa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
            {muscle?.group}
          </p>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, fontFamily: 'Cinzel, serif' }}>
            {muscle?.name ?? result.muscleKey}
          </p>
        </div>
        <RankBadge rank={result.rank} size="md" />
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: glow, fontFamily: 'Cinzel, serif' }}>
          {result.score.toFixed(3)}
        </span>
        <span style={{ fontSize: 12, color: '#777' }}>strength score</span>
        {result.isStale && (
          <span style={{ fontSize: 10, color: '#e07830', background: 'rgba(224,120,48,0.12)', border: '1px solid rgba(224,120,48,0.3)', padding: '2px 6px', borderRadius: 4 }}>
            ⚠ stale
          </span>
        )}
      </div>

      {result.rank.tier < 18 && <RankProgressBar result={result} />}
      {result.rank.tier === 18 && (
        <p style={{ fontSize: 12, color: glow, textAlign: 'center', marginTop: 6, fontFamily: 'Cinzel, serif' }}>
          ✦ Maximum Rank Achieved ✦
        </p>
      )}

      {nextRank && result.rank.tier > 0 && (
        <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 11, color: '#777' }}>
            Need{' '}
            <span style={{ color: nextRank.glow !== 'none' ? nextRank.glow : '#aaa', fontWeight: 700 }}>
              +{(nextRank.minScore - result.score).toFixed(3)}
            </span>
            {' '}score for{' '}
            <span style={{ color: nextRank.glow !== 'none' ? nextRank.glow : '#aaa' }}>
              {nextRank.icon} {nextRank.label}
            </span>
          </span>
        </div>
      )}

      {result.contributions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Contributing exercises
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.contributions.map((c, i) => {
              const pct = result.score > 0 ? ((c.weightedContrib / result.score) * 100).toFixed(0) : '0'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 12, color: '#ccc', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.exerciseName}
                      </span>
                      <span style={{ fontSize: 11, color: glow, fontWeight: 700, flexShrink: 0, marginLeft: 4 }}>
                        {pct}%
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: glow, borderRadius: 2, opacity: 0.7 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 11, color: '#888' }}>{c.oneRM.toFixed(0)} lbs</p>
                    {c.isStale && <p style={{ fontSize: 9, color: '#e07830' }}>{c.daysAgo}d ago</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {result.rank.tier === 0 && (
        <p style={{ fontSize: 13, color: '#777', textAlign: 'center', marginTop: 12 }}>
          No exercise data yet.<br />
          <span style={{ color: '#888' }}>Log a lift that targets {muscle?.name ?? 'this muscle'}.</span>
        </p>
      )}
    </div>
  )
}

// ── Muscle group overview row ─────────────────────────────────────────────────

function GroupRow({ group, results, selected, onSelect }: {
  group:    string
  results:  MuscleScoreResult[]
  selected: string | null
  onSelect: (key: string) => void
}) {
  const groupMuscles = MUSCLES.filter(m => m.group === group)
  return (
    <div style={{ marginBottom: 2 }}>
      <p style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'Cormorant Garamond, serif' }}>
        {group}
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {groupMuscles.map(muscle => {
          const result     = results.find(r => r.muscleKey === muscle.key)
          const isSelected = selected === muscle.key
          const glow       = result?.rank.glow ?? 'none'
          return (
            <button
              key={muscle.key}
              onClick={() => onSelect(muscle.key)}
              style={{
                padding: '5px 10px', borderRadius: 8,
                background: result?.rank.color ?? RANKS[0].color,
                border: `1px solid ${isSelected ? (glow !== 'none' ? glow : 'var(--accent)') : (result?.rank.border ?? RANKS[0].border)}`,
                color: glow !== 'none' ? glow : '#888',
                fontSize: 11, fontWeight: isSelected ? 700 : 500, cursor: 'pointer',
                boxShadow: isSelected && glow !== 'none' ? `0 0 8px ${glow}66` : 'none',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              {muscle.name}
              {result && result.rank.tier > 0 && (
                <span style={{ marginLeft: 4, fontSize: 10 }}>{result.rank.icon}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Imbalance warnings ────────────────────────────────────────────────────────

function ImbalanceCard({ warnings }: { warnings: ReturnType<typeof detectImbalances> }) {
  if (warnings.length === 0) return null
  return (
    <Card style={{ border: '1px solid rgba(224,120,48,0.25)', background: 'rgba(224,120,48,0.05)' }}>
      <p style={{ fontSize: 11, color: '#e07830', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontWeight: 700 }}>
        ⚠ Muscle Imbalances Detected
      </p>
      {warnings.map((w, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < warnings.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
          <div>
            <p style={{ fontSize: 12, color: '#ddd', fontWeight: 600 }}>{w.label}</p>
            <p style={{ fontSize: 10, color: '#888' }}>
              {w.aName} (Tier {w.aTier}) vs {w.bName} (Tier {w.bTier})
            </p>
            <p style={{ fontSize: 10, color: '#e07830' }}>
              {w.direction} is lagging by {w.delta} rank tiers
            </p>
          </div>
          <div style={{ fontSize: 18, color: '#e07830' }}>△</div>
        </div>
      ))}
    </Card>
  )
}

// ── Strength Quotient orb ─────────────────────────────────────────────────────

function StrengthOrb({ sq }: { sq: number }) {
  const tier = sq >= 80 ? 'god' : sq >= 65 ? 'champion' : sq >= 50 ? 'elite' : sq >= 38 ? 'diamond3' : sq >= 28 ? 'platinum2' : sq >= 18 ? 'gold2' : sq >= 10 ? 'silver2' : 'bronze2'
  const rank = RANKS.find(r => r.id === tier) ?? RANKS[2]
  const glow = rank.glow !== 'none' ? rank.glow : '#888'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '12px 0' }}>
      <div
        style={{
          width: 100, height: 100, borderRadius: '50%',
          background: `radial-gradient(circle at 35% 35%, ${rank.color}dd, ${rank.color})`,
          border: `2px solid ${glow}88`,
          boxShadow: `0 0 28px ${glow}55, 0 0 56px ${glow}22, inset 0 0 20px rgba(0,0,0,0.5)`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 32, fontWeight: 900, color: glow, fontFamily: 'Cinzel, serif', lineHeight: 1 }}>
          {sq}
        </span>
        <span style={{ fontSize: 9, color: `${glow}aa`, letterSpacing: '0.14em' }}>SQ</span>
      </div>
      <p style={{ fontSize: 11, color: '#666', textAlign: 'center' }}>Strength Quotient</p>
      <RankBadge rank={rank} size="sm" />
    </div>
  )
}

// ── Rank tier reference dropdown ──────────────────────────────────────────────

function RankDropdown() {
  // God → Bronze I (descending)
  const ranked = [...RANKS.filter(r => r.tier > 0)].reverse()
  return (
    <details style={{ marginTop: 2 }}>
      <summary
        style={{
          cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '10px 0',
          fontSize: 13, fontWeight: 700, color: '#ccc', fontFamily: 'Cinzel, serif',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          userSelect: 'none',
        }}
      >
        <span>Rank Tiers</span>
        <span style={{ fontSize: 10, color: '#777' }}>▾ tap to expand</span>
      </summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 10 }}>
        {ranked.map(rank => {
          const glow = rank.glow !== 'none' ? rank.glow : '#aaa'
          const isTop = rank.tier >= 16
          return (
            <div
              key={rank.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 12px', borderRadius: 8,
                background: rank.color,
                border: `1px solid ${rank.border}`,
                boxShadow: isTop ? `0 0 10px ${glow}22` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: isTop ? 16 : 14 }}>{rank.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: glow, fontFamily: 'Cinzel, serif' }}>
                  {rank.label}
                </span>
              </div>
              <span style={{ fontSize: 11, color: `${glow}99`, fontVariantNumeric: 'tabular-nums' }}>
                {rank.minScore.toFixed(2)}
                {rank.maxScore === Infinity ? '+' : ` – ${rank.maxScore.toFixed(2)}`}
              </span>
            </div>
          )
        })}
      </div>
    </details>
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

  // Re-fetch whenever XP changes (covers log + delete in Records.tsx)
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
      // Play reveal sound if user has any ranked muscles (gold+ = tier ≥ 7)
      const scores = (logRes.data ?? [])
      if (scores.length > 0 && !loaded) setTimeout(() => playRankUp(), 600)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerLoad, totalXP])

  const results = useMemo(() =>
    computeMuscleScores(liftLog, exercises, activations, bodyweight),
  [liftLog, exercises, activations, bodyweight])

  const sq           = useMemo(() => computeStrengthQuotient(results), [results])
  const imbalances   = useMemo(() => detectImbalances(results), [results])
  const lagKeys      = useMemo(() => {
    const keys = new Set<string>()
    imbalances.forEach(w => {
      const pair = IMBALANCE_PAIRS.find(p => p.label === w.label)
      if (pair) {
        // whichever side has lower tier is the lagging one
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
        <p style={{ color: '#666', fontSize: 13 }}>Loading strength data…</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
        <p style={{ color: '#666', fontFamily: 'Cinzel, serif', fontSize: 13 }}>Computing strength scores…</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      {/* ── Split-pane on desktop: body model left, data panels right ── */}
      <div className="md:flex md:gap-4 md:items-start">

        {/* ── Left column: Body Map (sticky on desktop) ── */}
        <div className="md:w-[42%] md:sticky md:top-[84px]">
          <Card style={{ padding: '12px 8px', marginBottom: 12 }}>
            {/* View toggle */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
              {(['front', 'back'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '5px 20px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: view === v ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color:      view === v ? 'var(--base-bg)' : '#888',
                    border:     view === v ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                    textTransform: 'capitalize',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            <BodyMap view={view} scores={results} selected={selected} onSelect={handleSelect} imbalancedKeys={lagKeys.size > 0 ? lagKeys : undefined} />

            {selectedResult && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 8 }}>
                <MuscleDetail result={selectedResult} />
              </div>
            )}
            {!selected && (
              <p style={{ textAlign: 'center', fontSize: 12, color: '#666', marginTop: 8 }}>
                Tap a muscle to see its rank &amp; contributors
              </p>
            )}
          </Card>
        </div>

        {/* ── Right column: SQ + Imbalances + Muscles + Rank reference ── */}
        <div className="md:flex-1">
          {/* Strength Quotient */}
          <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
            <StrengthOrb sq={sq} />
            <p style={{ fontSize: 12, color: '#777', textAlign: 'center', marginTop: 4 }}>
              Based on {liftLog.length} logged sets across{' '}
              {new Set(liftLog.map(r => r.lift)).size} exercises
            </p>
          </Card>

          {/* Imbalance warnings */}
          {imbalances.length > 0 && <ImbalanceCard warnings={imbalances} />}

          {/* Muscle group breakdown */}
          <Card style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#ccc', fontFamily: 'Cinzel, serif', marginBottom: 12 }}>
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

          {/* Rank reference dropdown */}
          <Card>
            <RankDropdown />
          </Card>
        </div>

      </div>
    </div>
  )
}

// ── Convenience hook for external SQ display (Home.tsx etc.) ─────────────────

export function useStrengthSnapshot() {
  const [sq, setSq]         = useState<number | null>(null)
  const [topRank, setTopRank] = useState<RankMeta | null>(null)

  useEffect(() => {
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

      const results   = computeMuscleScores(logRes.data ?? [], exRes.data ?? [], flatActs, bw)
      const sqVal     = computeStrengthQuotient(results)
      const ranked    = results.filter(r => r.rank.tier > 0).sort((a, b) => b.rank.tier - a.rank.tier)
      const best      = ranked[0]?.rank ?? null

      setSq(sqVal)
      setTopRank(best)
    }
    load()
  }, [])

  return { sq, topRank }
}
