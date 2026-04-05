import { useEffect, useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { BodyweightChart } from '../components/charts/BodyweightChart'
import { LiftTrendChart } from '../components/charts/LiftTrendChart'
import { EditModal } from '../components/ui/EditModal'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import type { LiftType, LiftingLog, PrHistory } from '../types'

function EditLiftModal({ row, onClose, onSaved }: { row: LiftingLog; onClose: () => void; onSaved: () => void }) {
  const [weight, setWeight] = useState(String(row.weight ?? ''))
  const [sets, setSets] = useState(String(row.sets ?? ''))
  const [reps, setReps] = useState(String(row.reps ?? ''))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('lifting_log').update({
      weight: weight ? parseFloat(weight) : null,
      sets: sets ? parseInt(sets) : null,
      reps: reps ? parseInt(reps) : null,
    }).eq('id', row.id)
    setSaving(false); onSaved(); onClose()
  }

  async function del() {
    await supabase.from('lifting_log').delete().eq('id', row.id)
    onSaved(); onClose()
  }

  return (
    <EditModal title={`${row.lift} — ${formatDate(row.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        {row.lift !== 'PullUps' && row.lift !== 'PushUps' && (
          <div className="flex flex-col gap-1">
            <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Weight (lbs)</label>
            <input type="number" step="2.5" value={weight} onChange={(e) => setWeight(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        )}
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Sets</label>
            <input type="number" value={sets} onChange={(e) => setSets(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Reps</label>
            <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>
    </EditModal>
  )
}

const LIFTS: LiftType[] = ['Bench', 'Squat', 'Deadlift', 'PullUps', 'PushUps']

const LIFT_ICONS: Record<LiftType, string> = {
  Bench: '🏋️',
  Squat: '🦵',
  Deadlift: '⛓️',
  PullUps: '🔝',
  PushUps: '💪',
}

function LiftCard({
  lift,
  pr,
  history,
  onSaved,
}: {
  lift: LiftType
  pr: PrHistory | undefined
  history: LiftingLog[]
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LiftingLog | null>(null)
  const liftHistory = history.filter((r) => r.lift === lift).slice(0, 8)

  return (
    <div
      className="rounded-xl mb-3 overflow-hidden"
      style={{
        border: open ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
        background: 'var(--card-bg)',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header row — always visible */}
      <button
        className="w-full flex items-center justify-between px-4 py-4"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{LIFT_ICONS[lift]}</span>
          <div className="text-left">
            <p className="font-bold text-white text-base" style={{ fontFamily: 'Cinzel, serif' }}>{lift}</p>
            <p className="text-xs mt-0.5" style={{ color: '#888' }}>
              {pr ? `PR: ${pr.est_1rm.toFixed(1)} lbs est 1RM` : 'No data yet'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pr && (
            <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
              {pr.est_1rm.toFixed(0)}
              <span className="text-xs font-normal ml-1" style={{ color: '#888' }}>lbs</span>
            </span>
          )}
          <span
            className="text-lg transition-transform duration-200"
            style={{ color: '#888', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', display: 'block' }}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Edit modal */}
      {editing && (
        <EditLiftModal row={editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      )}

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mt-3 mb-2" style={{ color: '#888' }}>
            Est 1RM Trend
          </p>
          <LiftTrendChart lift={lift} pr={pr?.est_1rm ?? 0} />

          {liftHistory.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest mt-4 mb-2" style={{ color: '#888' }}>
                Recent Sets
              </p>
              <div className="flex flex-col gap-1.5">
                {liftHistory.map((row) => (
                  <div key={row.id} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center gap-2">
                      {row.weight ? (
                        <span className="text-sm text-white">{row.weight} lbs</span>
                      ) : (
                        <span className="text-sm" style={{ color: '#888' }}>BW</span>
                      )}
                      <span className="text-sm" style={{ color: '#888' }}>{row.sets}×{row.reps}</span>
                      {row.is_pr && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: 'var(--base-bg)' }}>
                          PR
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {row.est_1rm && (
                        <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                          {row.est_1rm.toFixed(1)} 1RM
                        </span>
                      )}
                      <span className="text-xs" style={{ color: '#888' }}>{formatDate(row.date)}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditing(row) }}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ color: '#888', background: 'rgba(255,255,255,0.06)' }}
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function Records() {
  const [prs, setPrs] = useState<Record<string, PrHistory>>({})
  const [history, setHistory] = useState<LiftingLog[]>([])

  async function load() {
    const [prData, historyData] = await Promise.all([
      supabase.from('pr_history').select('*').order('est_1rm', { ascending: false }),
      supabase.from('lifting_log').select('*').order('date', { ascending: false }).limit(100),
    ])
    const prMap: Record<string, PrHistory> = {}
    prData.data?.forEach((r: PrHistory) => {
      if (!prMap[r.lift]) prMap[r.lift] = r
    })
    setPrs(prMap)
    setHistory(historyData.data ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <>
      <TopBar title="Records" />
      <PageWrapper>

        {/* Lifts — collapsible */}
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif', fontSize: 13 }}>
          Tap a lift to see trend & history
        </p>
        {LIFTS.map((lift) => (
          <LiftCard key={lift} lift={lift} pr={prs[lift]} history={history} onSaved={load} />
        ))}

        {/* Bodyweight trend */}
        <Card className="mt-2">
          <h2 className="font-semibold text-white mb-3" style={{ fontFamily: 'Cinzel, serif' }}>Bodyweight Trend</h2>
          <BodyweightChart />
        </Card>

      </PageWrapper>
    </>
  )
}
