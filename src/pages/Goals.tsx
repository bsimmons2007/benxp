import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Toast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { playGoalComplete } from '../lib/sounds'
import type { Goal } from '../types'
import { DumbbellIcon, SkateIcon, RunIcon, BookIcon, GamepadIcon, TargetIcon, TrophyIcon, TrashIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

// ── Preset metric options ────────────────────────────────────
const GOAL_PRESETS = [
  { key: 'squat_1rm',          label: 'Squat 1RM',       unit: 'lbs',   defaultTarget: 315 },
  { key: 'bench_1rm',          label: 'Bench 1RM',       unit: 'lbs',   defaultTarget: 225 },
  { key: 'deadlift_1rm',       label: 'Deadlift 1RM',    unit: 'lbs',   defaultTarget: 405 },
  { key: 'total_skate_miles',  label: 'Skate Miles',     unit: 'miles', defaultTarget: 100 },
  { key: 'total_cardio_miles', label: 'Cardio Miles',    unit: 'miles', defaultTarget: 50  },
  { key: 'books_read',         label: 'Books Read',      unit: 'books', defaultTarget: 20  },
  { key: 'fn_wins',            label: 'Fortnite Wins',   unit: 'wins',  defaultTarget: 10  },
  { key: 'manual',             label: 'Custom Goal',     unit: '',      defaultTarget: 1   },
] as const

type MetricKey = typeof GOAL_PRESETS[number]['key']

function presetFor(key: string) {
  return GOAL_PRESETS.find(p => p.key === key) ?? GOAL_PRESETS[GOAL_PRESETS.length - 1]
}

function GoalIcon({ metricKey, size = 18, color = 'var(--text-muted)' }: { metricKey: string; size?: number; color?: string }) {
  if (metricKey === 'squat_1rm' || metricKey === 'bench_1rm' || metricKey === 'deadlift_1rm') return <DumbbellIcon size={size} color={color} />
  if (metricKey === 'total_skate_miles') return <SkateIcon size={size} color={color} />
  if (metricKey === 'total_cardio_miles') return <RunIcon size={size} color={color} />
  if (metricKey === 'books_read') return <BookIcon size={size} color={color} />
  if (metricKey === 'fn_wins') return <GamepadIcon size={size} color={color} />
  return <TargetIcon size={size} color={color} />
}

// ── Current values hook ──────────────────────────────────────
interface MetricValues {
  squat_1rm:          number
  bench_1rm:          number
  deadlift_1rm:       number
  total_skate_miles:  number
  total_cardio_miles: number
  books_read:         number
  fn_wins:            number
}

function useMetricValues() {
  const [vals, setVals] = useState<MetricValues | null>(null)

  useEffect(() => {
    async function load() {
      const [prs, skate, cardio, books, wins] = await Promise.all([
        supabase.from('pr_history').select('lift, est_1rm'),
        supabase.from('skate_sessions').select('miles'),
        supabase.from('cardio_sessions').select('distance_miles'),
        supabase.from('books').select('id').not('date_finished', 'is', null),
        supabase.from('fortnite_games').select('id').eq('win', true),
      ])

      const bestPR = (lift: string) =>
        (prs.data ?? [])
          .filter((r: { lift: string; est_1rm: number }) => r.lift === lift)
          .reduce((m: number, r: { lift: string; est_1rm: number }) => Math.max(m, r.est_1rm), 0)

      setVals({
        squat_1rm:          bestPR('Squat'),
        bench_1rm:          bestPR('Bench'),
        deadlift_1rm:       bestPR('Deadlift'),
        total_skate_miles:  (skate.data ?? []).reduce((s: number, r: { miles: number }) => s + r.miles, 0),
        total_cardio_miles: (cardio.data ?? []).reduce((s: number, r: { distance_miles: number }) => s + r.distance_miles, 0),
        books_read:         books.data?.length ?? 0,
        fn_wins:            wins.data?.length ?? 0,
      })
    }
    load()
  }, [])

  return vals
}

function currentFor(key: string, vals: MetricValues | null): number {
  if (!vals || key === 'manual') return 0
  return (vals as unknown as Record<string, number>)[key] ?? 0
}

// ── Add Goal form ────────────────────────────────────────────
interface GoalForm { metric_key: MetricKey; target_value: string; title: string; xp_reward: string }

function AddGoalPanel({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm<GoalForm>({
    defaultValues: { metric_key: 'squat_1rm', target_value: '315', title: '', xp_reward: '500' },
  })
  const metricKey = watch('metric_key')
  const preset = presetFor(metricKey)

  // Auto-fill title and target when preset changes
  const handleMetricChange = (key: MetricKey) => {
    const p = presetFor(key)
    setValue('metric_key', key)
    setValue('target_value', String(p.defaultTarget))
    setValue('title', key === 'manual' ? '' : `${p.label} ${p.defaultTarget}${p.unit ? ' ' + p.unit : ''}`)
  }

  const onSubmit = async (data: GoalForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const p = presetFor(data.metric_key)
    await supabase.from('goals').insert({
      user_id: user.id,
      title: data.title || `${p.label} goal`,
      metric_key: data.metric_key,
      target_value: parseFloat(data.target_value),
      target_unit: p.unit,
      xp_reward: parseInt(data.xp_reward) || 500,
    })
    reset()
    setOpen(false)
    onAdded()
  }

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: open ? 'var(--base-bg)' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? '✕ Cancel' : '+ New Goal'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'rgba(16,24,52,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Type</label>
              <select
                {...register('metric_key')}
                onChange={e => handleMetricChange(e.target.value as MetricKey)}
                className="px-3 py-2 rounded-lg text-white outline-none"
                style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {GOAL_PRESETS.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Goal Title"
              type="text"
              placeholder={`e.g. ${preset.label} ${preset.defaultTarget}`}
              {...register('title')}
            />
            <div className="flex gap-3">
              <Input
                label={`Target${preset.unit ? ` (${preset.unit})` : ''}`}
                type="number"
                step="any"
                placeholder={String(preset.defaultTarget)}
                className="flex-1"
                {...register('target_value', { required: true })}
              />
              <Input
                label="XP Reward"
                type="number"
                placeholder="500"
                className="flex-1"
                {...register('xp_reward')}
              />
            </div>
            <Button type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Add Goal'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

// Which metric keys link to which page
const METRIC_LINK: Record<string, string> = {
  squat_1rm:          '/lifting',
  bench_1rm:          '/lifting',
  deadlift_1rm:       '/lifting',
  total_skate_miles:  '/skate',
  total_cardio_miles: '/cardio',
  books_read:         '/books',
  fn_wins:            '/fortnite',
}

// ── Goal card ────────────────────────────────────────────────
function GoalCard({ goal, current, onComplete, onDelete, onNavigate }: {
  goal: Goal
  current: number
  onComplete: () => void
  onDelete: () => void
  onNavigate: (path: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const linkedPage = METRIC_LINK[goal.metric_key]
  const pct = goal.metric_key === 'manual'
    ? (goal.status === 'completed' ? 100 : 0)
    : Math.min((current / goal.target_value) * 100, 100)
  const isAutoComplete = pct >= 100 && goal.status === 'active'

  return (
    <div
      className="rounded-xl p-4 mb-3"
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: isAutoComplete
          ? '1px solid rgba(245,166,35,0.5)'
          : '1px solid rgba(255,255,255,0.07)',
        boxShadow: isAutoComplete ? '0 0 20px rgba(245,166,35,0.15)' : 'none',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
            <GoalIcon metricKey={goal.metric_key} size={17} color="var(--text-secondary)" />
          </div>
          <p className="font-semibold text-white text-sm truncate">{goal.title}</p>
        </div>
        <span className="text-xs font-bold ml-2 shrink-0" style={{ color: 'var(--accent)' }}>
          +{goal.xp_reward} XP
        </span>
      </div>

      {goal.metric_key !== 'manual' && (
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1" style={{ color: '#888' }}>
            <span>{current.toFixed(current % 1 === 0 ? 0 : 1)} {goal.target_unit}</span>
            <span>{goal.target_value} {goal.target_unit}</span>
          </div>
          <ProgressBar value={pct / 100} height={8} glow={isAutoComplete} />
        </div>
      )}

      {isAutoComplete && (
        <p className="text-xs font-bold mb-2" style={{ color: 'var(--accent)' }}>Target reached! Mark it complete.</p>
      )}

      <div className="flex gap-2 mt-2">
        {!confirming ? (
          <>
            {linkedPage && (
              <button
                onClick={() => onNavigate(linkedPage)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--accent)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}
                title="View history for this metric"
              >
                History ↗
              </button>
            )}
            <button
              onClick={onComplete}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              style={{
                background: isAutoComplete ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                color: isAutoComplete ? 'var(--base-bg)' : '#888',
                border: isAutoComplete ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {isAutoComplete ? <><TrophyIcon size={12} color="currentColor" /> Complete!</> : 'Mark Complete'}
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="px-3 py-1.5 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#444', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <TrashIcon size={14} color="#666" />
            </button>
          </>
        ) : (
          <>
            <button onClick={onDelete} className="flex-1 py-1.5 rounded-lg text-xs font-bold" style={{ background: '#E94560', color: '#fff' }}>Delete</button>
            <button onClick={() => setConfirming(false)} className="flex-1 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: '#888' }}>Cancel</button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
export function Goals() {
  usePageTitle('Goals')
  const navigate = useNavigate()
  const [goals, setGoals] = useState<Goal[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const vals = useMetricValues()
  const refreshXP = useStore(s => s.refreshXP)

  async function load() {
    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
    setGoals((data ?? []) as Goal[])
  }

  useEffect(() => { load() }, [])

  async function complete(goal: Goal) {
    await supabase.from('goals').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', goal.id)
    playGoalComplete()
    setToast(`+${goal.xp_reward} XP — Goal complete!`)
    await refreshXP()
    load()
  }

  async function deleteGoal(id: string) {
    await supabase.from('goals').delete().eq('id', id)
    load()
  }

  const active    = goals.filter(g => g.status === 'active')
  const completed = goals.filter(g => g.status === 'completed')

  return (
    <>
      <TopBar title="Goals" />
      <PageWrapper>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Active',    value: active.length    },
            { label: 'Complete',  value: completed.length },
            { label: 'XP Earned', value: completed.reduce((s, g) => s + g.xp_reward, 0) },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>{s.value.toLocaleString()}</p>
              <p className="text-xs mt-0.5" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <AddGoalPanel onAdded={load} />

        {/* Active goals */}
        {active.length === 0 ? (
          <div style={{ padding: '12px 0' }}>
            <p style={{ color: '#555', textAlign: 'center', marginBottom: 14, fontSize: 13 }}>No active goals yet — try one of these:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { emoji: '🏋️', label: 'Bench 225 lbs',      metric: 'bench_1rm',         target: 225 },
                { emoji: '🛼', label: 'Skate 100 miles',     metric: 'total_skate_miles',  target: 100 },
                { emoji: '🏃', label: 'Run 50 miles',        metric: 'total_cardio_miles', target: 50  },
                { emoji: '📚', label: 'Read 5 books',        metric: 'books_read',         target: 5   },
                { emoji: '😴', label: 'Sleep 7h avg',        metric: 'avg_sleep',          target: 7   },
              ].map(t => (
                <button
                  key={t.metric}
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return
                    await supabase.from('goals').insert({
                      user_id: user.id, title: t.label,
                      metric_key: t.metric, target_value: t.target, status: 'active',
                    })
                    load()
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 12, textAlign: 'left',
                    background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                >
                  <span style={{ fontSize: 20 }}>{t.emoji}</span>
                  <span>{t.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>+ Add</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          active.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              current={currentFor(g.metric_key, vals)}
              onComplete={() => complete(g)}
              onDelete={() => deleteGoal(g.id)}
              onNavigate={navigate}
            />
          ))
        )}

        {/* Completed goals */}
        {completed.length > 0 && (
          <>
            <p className="text-xs uppercase tracking-widest mt-4 mb-3 font-semibold" style={{ color: '#555' }}>Completed</p>
            {completed.map(g => (
              <div
                key={g.id}
                className="rounded-xl px-4 py-3 mb-2 flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.6 }}
              >
                <div className="flex items-center gap-2">
                  <GoalIcon metricKey={g.metric_key} size={15} color="var(--text-muted)" />
                  <div>
                    <p className="text-sm text-white">{g.title}</p>
                    {g.completed_at && (
                      <p className="text-xs" style={{ color: '#555' }}>
                        {new Date(g.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold" style={{ color: '#888' }}>+{g.xp_reward} XP</span>
              </div>
            ))}
          </>
        )}
      </PageWrapper>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  )
}
