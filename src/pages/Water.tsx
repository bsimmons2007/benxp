import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Toast } from '../components/ui/Toast'
import { EditModal } from '../components/ui/EditModal'
import { EditIcon, DropletIcon } from '../components/ui/Icon'
import { supabase } from '../lib/supabase'
import { today as appToday } from '../lib/utils'
import { useStore } from '../store/useStore'
import { usePageTitle } from '../hooks/usePageTitle'

const DEFAULT_goalOz = 64
const GOAL_LS_KEY     = 'youxp-water-goal-oz'
const QUICK_ADDS      = [8, 12, 16, 20, 24] // oz presets

interface WaterEntry { id: string; oz: number; created_at: string }

// ── Water glass SVG ───────────────────────────────────────────────────────────

function WaterCup({ ozDrunk, goal }: { ozDrunk: number; goal: number }) {
  const fill = Math.min(1, ozDrunk / goal)
  const pct  = Math.round(fill * 100)

  // Trapezoid glass — wider at top, tapered at bottom
  const CW = 140, CH = 200
  const topL = 18, topR = 122    // top rim x coords
  const botL = 32, botR = 108    // bottom x coords (narrower)
  const rimY = 18, botY = 182    // y positions
  const cupH = botY - rimY

  // Interpolate x at a given y within the glass
  const taper = (y: number) => {
    const t = (y - rimY) / cupH
    return { l: topL + (botL - topL) * t, r: topR + (botR - topR) * t }
  }

  const waterTop = botY - cupH * fill
  const wt = taper(waterTop)

  const waterColor = fill >= 1 ? '#22d3ee' : fill >= 0.6 ? '#38bdf8' : fill >= 0.3 ? '#60c8f5' : '#7dd3fc'
  const accentStroke = fill >= 1 ? '#22d3ee' : '#38bdf8'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: 140, height: 200, userSelect: 'none', overflow: 'visible' }}>
        <defs>
          <linearGradient id="wc-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={waterColor} stopOpacity={0.88} />
            <stop offset="100%" stopColor={waterColor} stopOpacity={0.60} />
          </linearGradient>
          <clipPath id="wc-clip">
            <polygon points={`${topL},${rimY} ${topR},${rimY} ${botR},${botY} ${botL},${botY}`} />
          </clipPath>
        </defs>

        {/* Empty glass interior */}
        <polygon
          points={`${topL},${rimY} ${topR},${rimY} ${botR},${botY} ${botL},${botY}`}
          style={{ fill: 'var(--surface-2)' }}
        />

        {/* Water fill */}
        {fill > 0 && (
          <polygon
            points={`${wt.l},${waterTop} ${wt.r},${waterTop} ${botR},${botY} ${botL},${botY}`}
            fill="url(#wc-water)"
            clipPath="url(#wc-clip)"
            style={{ transition: 'all 0.55s cubic-bezier(0.22,1,0.36,1)' }}
          />
        )}

        {/* Water surface shimmer */}
        {fill > 0 && fill < 1 && (
          <line
            x1={wt.l + 2} y1={waterTop}
            x2={wt.r - 2} y2={waterTop}
            stroke={waterColor} strokeWidth={1.5} strokeOpacity={0.7}
            strokeLinecap="round"
            style={{ transition: 'all 0.55s cubic-bezier(0.22,1,0.36,1)' }}
          />
        )}

        {/* Left highlight — blue tint, no rgba-white (works in light mode) */}
        <line
          x1={topL + 10} y1={rimY + 14}
          x2={botL + 7}  y2={botY - 14}
          stroke={waterColor} strokeWidth={3.5}
          strokeLinecap="round"
          strokeOpacity={fill > 0 ? 0.28 : 0.14}
          clipPath="url(#wc-clip)"
          style={{ transition: 'stroke-opacity 0.4s' }}
        />

        {/* Glass outline on top of water */}
        <polygon
          points={`${topL},${rimY} ${topR},${rimY} ${botR},${botY} ${botL},${botY}`}
          fill="none"
          stroke={fill >= 1 ? accentStroke : 'var(--border-strong)'}
          strokeWidth={fill >= 1 ? 2 : 1.75}
          style={{ transition: 'stroke 0.4s' }}
        />

        {/* Rim cap */}
        <line
          x1={topL} y1={rimY} x2={topR} y2={rimY}
          stroke={fill >= 1 ? accentStroke : 'var(--border-default)'}
          strokeWidth={2.5} strokeLinecap="round"
          style={{ transition: 'stroke 0.4s' }}
        />

        {/* Fill % inside glass */}
        <text
          x={CW / 2}
          y={fill > 0.15 ? waterTop + 22 : botY - 14}
          textAnchor="middle"
          fontSize={15} fontWeight="800"
          fill={fill > 0.18 ? 'var(--base-bg)' : 'var(--text-muted)'}
          fontFamily="Space Grotesk, system-ui, sans-serif"
          style={{ transition: 'all 0.5s ease' }}
        >
          {pct}%
        </text>
      </svg>

      {/* oz counter */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize: 30, fontWeight: 700, lineHeight: 1,
          color: fill >= 1 ? accentStroke : 'var(--text-primary)',
          transition: 'color 0.4s',
        }}>
          {ozDrunk.toFixed(0)}
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-tertiary)' }}>oz</span>
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>of {goal}oz goal</p>
        {fill >= 1 && (
          <p className="pop-in" style={{ fontSize: 12, color: accentStroke, fontWeight: 700, marginTop: 4 }}>
            Goal reached!
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function Water() {
  usePageTitle('Water')
  const [entries,     setEntries]     = useState<WaterEntry[]>([])
  const [customOz,    setCustomOz]    = useState('')
  const [toast,       setToast]       = useState<string | null>(null)
  const [userId,      setUserId]      = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [editEntry,   setEditEntry]   = useState<WaterEntry | null>(null)
  const [editOz,      setEditOz]      = useState('')
  const [saving,      setSaving]      = useState(false)
  const [goalOz,      setGoalOz]      = useState<number>(() => {
    const stored = parseInt(localStorage.getItem(GOAL_LS_KEY) ?? '', 10)
    return isFinite(stored) && stored > 0 ? stored : DEFAULT_goalOz
  })
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput,   setGoalInput]   = useState('')
  const refreshXP = useStore(s => s.refreshXP)

  function saveGoal() {
    const v = parseInt(goalInput, 10)
    if (isFinite(v) && v > 0) {
      localStorage.setItem(GOAL_LS_KEY, String(v))
      setGoalOz(v)
    }
    setEditingGoal(false)
  }

  const todayStr = appToday()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase
      .from('water_log')
      .select('id, oz, created_at')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .order('created_at', { ascending: false })
    setEntries(data ?? [])
    setLoading(false)
  }, [todayStr])

  useEffect(() => { load() }, [load])

  const totalOz = entries.reduce((s, e) => s + Number(e.oz), 0)

  async function addWater(oz: number) {
    if (!userId || oz <= 0) return
    const wasGoalMet = totalOz >= goalOz
    const { error } = await supabase.from('water_log').insert({ user_id: userId, date: todayStr, oz })
    if (error) { setToast('Failed to log — try again'); return }
    const newTotal = totalOz + oz
    const goalJustMet = !wasGoalMet && newTotal >= goalOz
    if (goalJustMet) {
      setToast('Daily goal reached! +50 XP')
      await refreshXP()
    } else {
      setToast(`+${oz}oz logged`)
    }
    load()
  }

  async function deleteEntry(id: string) {
    const { error } = await supabase.from('water_log').delete().eq('id', id)
    if (!error) load()
  }

  async function saveEdit() {
    if (!editEntry) return
    setSaving(true)
    const { error } = await supabase.from('water_log').update({ oz: parseFloat(editOz) || editEntry.oz }).eq('id', editEntry.id)
    setSaving(false)
    if (!error) { setEditEntry(null); load() }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      <TopBar title="Water" />
      <PageWrapper>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{totalOz.toFixed(0)}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 1 }}>oz</span></p>
            <p className="section-label mt-1">Today</p>
          </div>

          {/* Goal tile — tap to edit */}
          <button
            onClick={() => { setGoalInput(String(goalOz)); setEditingGoal(true) }}
            className="rounded-xl p-3 text-center"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
          >
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{goalOz}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 1 }}>oz</span></p>
            <p className="section-label mt-1">Goal</p>
          </button>

          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{totalOz >= goalOz ? 'Done!' : `${Math.max(0, goalOz - totalOz).toFixed(0)}`}{totalOz < goalOz && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 1 }}>oz</span>}</p>
            <p className="section-label mt-1">Remaining</p>
          </div>
        </div>

        {/* Cup */}
        {!loading && (
          <div className="flex justify-center mb-6">
            <WaterCup ozDrunk={totalOz} goal={goalOz} />
          </div>
        )}

        {/* Quick add buttons */}
        <Card className="mb-4">
          <p className="card-title mb-3">Quick Add</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_ADDS.map(oz => (
              <button
                key={oz}
                onClick={() => addWater(oz)}
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: 'rgba(41,182,246,0.12)', border: '1.5px solid rgba(41,182,246,0.3)',
                  color: '#29b6f6', cursor: 'pointer', transition: 'all 0.12s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(41,182,246,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(41,182,246,0.12)')}
              >
                +{oz}oz
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Custom oz..."
              value={customOz}
              onChange={e => setCustomOz(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
              style={{ color: 'var(--text-primary)', background: 'var(--input-bg)', border: '1px solid var(--border)' }}
            />
            <button
              onClick={() => { addWater(parseFloat(customOz) || 0); setCustomOz('') }}
              disabled={!customOz || parseFloat(customOz) <= 0}
              style={{
                padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: customOz && parseFloat(customOz) > 0 ? 'rgba(41,182,246,0.2)' : 'var(--input-bg)',
                border: '1.5px solid rgba(41,182,246,0.3)',
                color: '#29b6f6', cursor: 'pointer',
              }}
            >
              Add
            </button>
          </div>
        </Card>

        {/* Today's log */}
        {entries.length > 0 && (
          <div>
            <p className="card-title mb-3">Today's Log</p>
            {entries.map(e => (
              <Card key={e.id} className="flex items-center justify-between mb-2" style={{ padding: '12px 16px' }}>
                <div className="flex items-center gap-3">
                  <DropletIcon size={18} color="#29b6f6" />
                  <div>
                    <p className="font-bold" style={{ color: '#29b6f6', fontSize: 15 }}>{Number(e.oz).toFixed(0)}oz</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{formatTime(e.created_at)}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setEditEntry(e); setEditOz(String(e.oz)) }}
                  aria-label="Edit entry"
                  style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--input-bg)', border: 'none', cursor: 'pointer',
                  }}
                >
                  <EditIcon size={13} color="var(--text-muted)" />
                </button>
              </Card>
            ))}
          </div>
        )}

        {entries.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <DropletIcon size={36} color="var(--text-muted)" />
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>No water logged yet today</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Tap a quick add button to get started</p>
          </div>
        )}

      </PageWrapper>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {editEntry && (
        <EditModal
          title={`Edit — ${formatTime(editEntry.created_at)}`}
          onClose={() => setEditEntry(null)}
          onDelete={() => { deleteEntry(editEntry.id); setEditEntry(null) }}
          onSave={saveEdit}
          saving={saving}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Amount (oz)</label>
            <input
              type="number" value={editOz} onChange={e => setEditOz(e.target.value)}
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 16, width: '100%' }}
            />
          </div>
        </EditModal>
      )}
      {editingGoal && (
        <EditModal
          title="Set Daily Goal"
          onClose={() => setEditingGoal(false)}
          onSave={saveGoal}
          saving={false}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Daily goal (oz)</label>
            <input
              type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)}
              placeholder="e.g. 64"
              autoFocus
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)', fontSize: 16, width: '100%' }}
            />
          </div>
        </EditModal>
      )}
    </>
  )
}
