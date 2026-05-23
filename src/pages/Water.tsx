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

  // Glass geometry — rounded rect, 120×180 interior
  const W = 120, H = 220
  const glassX = 10, glassY = 20
  const glassW = 100, glassH = 170
  const r = 14  // corner radius bottom

  // Water top Y (higher fill = lower Y value)
  const waterTopY = glassY + glassH * (1 - fill)

  // Color ramp: low → mid → full
  const waterColor = fill >= 1 ? '#22d3ee' : fill >= 0.6 ? '#38bdf8' : fill >= 0.3 ? '#60c8f5' : '#7dd3fc'
  const borderColor = fill >= 1 ? '#22d3ee' : '#38bdf8'

  // Clip path for the glass interior
  const clipId = 'wc-clip'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 130, height: 210, userSelect: 'none', overflow: 'visible' }}>
        <defs>
          <linearGradient id="wc-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={waterColor} stopOpacity={0.85} />
            <stop offset="100%" stopColor={waterColor} stopOpacity={0.55} />
          </linearGradient>
          {/* Clip to glass interior */}
          <clipPath id={clipId}>
            <rect x={glassX} y={glassY} width={glassW} height={glassH} rx={r} />
          </clipPath>
        </defs>

        {/* Glass body — empty fill */}
        <rect
          x={glassX} y={glassY} width={glassW} height={glassH} rx={r}
          style={{ fill: 'var(--surface-2)', transition: 'fill 0.4s' }}
          stroke="var(--border-strong)"
          strokeWidth={1.5}
        />

        {/* Water fill (clipped inside glass) */}
        {fill > 0 && (
          <rect
            x={glassX} y={waterTopY}
            width={glassW} height={glassH - (waterTopY - glassY)}
            fill="url(#wc-water)"
            clipPath={`url(#${clipId})`}
            rx={r}
            style={{ transition: 'y 0.55s cubic-bezier(0.22,1,0.36,1), height 0.55s cubic-bezier(0.22,1,0.36,1)' }}
          />
        )}

        {/* Water surface shimmer line */}
        {fill > 0 && fill < 1 && (
          <line
            x1={glassX + 2} y1={waterTopY}
            x2={glassX + glassW - 2} y2={waterTopY}
            stroke={waterColor} strokeWidth={1.5} strokeOpacity={0.6}
            strokeLinecap="round"
            style={{ transition: 'y1 0.55s cubic-bezier(0.22,1,0.36,1)' }}
          />
        )}

        {/* Left highlight — glass shine (theme-agnostic via blue tint) */}
        <rect
          x={glassX + 8} y={glassY + 10}
          width={6} height={glassH * 0.5}
          rx={3}
          fill={waterColor} fillOpacity={fill > 0 ? 0.18 : 0.1}
          clipPath={`url(#${clipId})`}
        />

        {/* Glass border overlay (on top of water) */}
        <rect
          x={glassX} y={glassY} width={glassW} height={glassH} rx={r}
          fill="none"
          stroke={fill >= 1 ? borderColor : 'var(--border-strong)'}
          strokeWidth={fill >= 1 ? 2 : 1.5}
          style={{ transition: 'stroke 0.4s' }}
        />

        {/* Percentage text inside glass */}
        <text
          x={glassX + glassW / 2}
          y={fill > 0.12 ? waterTopY + 20 : glassY + glassH - 16}
          textAnchor="middle"
          fontSize={14} fontWeight="800"
          fill={fill > 0.15 ? '#fff' : 'var(--text-muted)'}
          fontFamily="Inter Variable, Inter, system-ui, sans-serif"
          style={{ transition: 'all 0.5s ease' }}
        >
          {pct}%
        </text>
      </svg>

      {/* oz counter */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize: 30, fontWeight: 900, lineHeight: 1,
          color: fill >= 1 ? borderColor : 'var(--text-primary)',
          transition: 'color 0.4s',
        }}>
          {ozDrunk.toFixed(0)}
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-tertiary)' }}>oz</span>
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>of {goal}oz goal</p>
        {fill >= 1 && (
          <p className="pop-in" style={{ fontSize: 12, color: borderColor, fontWeight: 700, marginTop: 4 }}>
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
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{totalOz.toFixed(0)}oz</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Today</p>
          </div>

          {/* Goal tile — tap to edit */}
          <button
            onClick={() => { setGoalInput(String(goalOz)); setEditingGoal(true) }}
            className="rounded-xl p-3 text-center"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{goalOz}oz</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Goal</p>
          </button>

          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{totalOz >= goalOz ? 'Done!' : `${Math.max(0, goalOz - totalOz).toFixed(0)}oz`}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Remaining</p>
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
