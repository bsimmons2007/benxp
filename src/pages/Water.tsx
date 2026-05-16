import { useEffect, useState, useCallback } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
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

// ── Water cup SVG ─────────────────────────────────────────────────────────────

function WaterCup({ ozDrunk, goal }: { ozDrunk: number; goal: number }) {
  const fill   = Math.min(1, ozDrunk / goal)
  const pct    = Math.round(fill * 100)

  // Cup geometry (SVG coords)
  const CW = 140, CH = 200       // viewBox
  const topL = 20, topR = 120    // top rim x coords
  const botL = 30, botR = 110    // bottom x coords
  const rimY = 22, botY = 185    // y coords
  const cupH = botY - rimY       // 163px of cup interior

  // Water fill: bottom of cup up to fill level
  const waterTop = botY - cupH * fill
  // Water polygon: trapezoid from bottom, clipped by fill level
  // At waterTop, interpolate x coords using linear taper
  const taper = (y: number) => {
    const t = (y - rimY) / cupH  // 0 at rim, 1 at bottom
    return { l: topL + (botL - topL) * t, r: topR + (botR - topR) * t }
  }
  const wt = taper(waterTop)

  // Color based on fill
  const waterColor = fill >= 1 ? '#00e5ff' : fill >= 0.6 ? '#29b6f6' : fill >= 0.3 ? '#4fc3f7' : '#81d4fa'
  const glowColor  = fill >= 1 ? '#00e5ff' : '#29b6f6'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: 160, height: 230, userSelect: 'none' }}>
        <defs>
          {/* Water gradient */}
          <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={waterColor} stopOpacity={0.9} />
            <stop offset="100%" stopColor={waterColor} stopOpacity={0.6} />
          </linearGradient>
          {/* Cup glass gradient */}
          <linearGradient id="cup-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.12)" />
            <stop offset="40%"  stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="water-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Cup clip */}
          <clipPath id="cup-clip">
            <polygon points={`${topL},${rimY} ${topR},${rimY} ${botR},${botY} ${botL},${botY}`} />
          </clipPath>
        </defs>

        {/* Cup fill background (empty part) */}
        <polygon
          points={`${topL},${rimY} ${topR},${rimY} ${botR},${botY} ${botL},${botY}`}
          fill="rgba(255,255,255,0.03)"
          stroke="none"
        />

        {/* Water fill */}
        {fill > 0 && (
          <polygon
            points={`${wt.l},${waterTop} ${wt.r},${waterTop} ${botR},${botY} ${botL},${botY}`}
            fill="url(#water-grad)"
            clipPath="url(#cup-clip)"
            filter={fill >= 0.5 ? 'url(#water-glow)' : undefined}
            style={{ transition: 'all 0.5s cubic-bezier(0.22,1,0.36,1)' }}
          />
        )}

        {/* Water surface wave (simple horizontal line with slight curve label) */}
        {fill > 0 && fill < 1 && (
          <line
            x1={wt.l} y1={waterTop}
            x2={wt.r} y2={waterTop}
            stroke={waterColor} strokeWidth={2} strokeOpacity={0.7}
            style={{ transition: 'all 0.5s cubic-bezier(0.22,1,0.36,1)' }}
          />
        )}

        {/* Glass highlight (left edge) */}
        <line x1={topL + 6} y1={rimY + 10} x2={botL + 4} y2={botY - 10}
          stroke="rgba(255,255,255,0.18)" strokeWidth={3} strokeLinecap="round" />

        {/* Cup outline */}
        <polygon
          points={`${topL},${rimY} ${topR},${rimY} ${botR},${botY} ${botL},${botY}`}
          fill="url(#cup-grad)"
          stroke={fill >= 1 ? glowColor : 'rgba(255,255,255,0.25)'}
          strokeWidth={fill >= 1 ? 2 : 1.5}
          style={{ transition: 'stroke 0.4s ease' }}
        />

        {/* Rim */}
        <rect x={topL - 4} y={rimY - 6} width={topR - topL + 8} height={8}
          rx={3} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth={1} />

        {/* Fill % text centered in cup */}
        <text
          x={CW / 2} y={fill > 0.15 ? waterTop + 22 : botY - 10}
          textAnchor="middle" fontSize={fill >= 1 ? 20 : 15}
          fontWeight="700" fill={fill > 0.18 ? '#fff' : 'rgba(255,255,255,0.4)'}
          fontFamily="Cinzel, serif"
          style={{ transition: 'all 0.5s ease' }}
        >
          {pct}%
        </text>

        {/* Goal line */}
        {(() => {
          const goalTaper = taper(rimY)
          return (
            <line x1={goalTaper.l} y1={rimY} x2={goalTaper.r} y2={rimY}
              stroke={fill >= 1 ? glowColor : 'rgba(255,255,255,0.15)'}
              strokeWidth={1.5} strokeDasharray="4 3" />
          )
        })()}
      </svg>

      {/* oz label */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 28, fontWeight: 900, color: fill >= 1 ? glowColor : '#fff', fontFamily: 'Cinzel, serif', lineHeight: 1,
          textShadow: fill >= 1 ? `0 0 20px ${glowColor}` : 'none', transition: 'all 0.4s ease' }}>
          {ozDrunk.toFixed(0)}<span style={{ fontSize: 14, fontWeight: 400, color: '#444' }}>oz</span>
        </p>
        <p style={{ fontSize: 12, color: '#555', marginTop: 2 }}>of {goal}oz goal</p>
        {fill >= 1 && (
          <p className="pop-in" style={{ fontSize: 12, color: glowColor, fontWeight: 700, marginTop: 4 }}>
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
            <p className="text-xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>{totalOz.toFixed(0)}oz</p>
            <p className="text-xs mt-0.5" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>Today</p>
          </div>

          {/* Goal tile — tap to edit */}
          <button
            onClick={() => { setGoalInput(String(goalOz)); setEditingGoal(true) }}
            className="rounded-xl p-3 text-center"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <p className="text-xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>{goalOz}oz</p>
            <p className="text-xs mt-0.5" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>Goal ✏️</p>
          </button>

          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <p className="text-xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>{totalOz >= goalOz ? 'Done!' : `${Math.max(0, goalOz - totalOz).toFixed(0)}oz`}</p>
            <p className="text-xs mt-0.5" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>Remaining</p>
          </div>
        </div>

        {/* Cup */}
        {!loading && (
          <div className="flex justify-center mb-6">
            <WaterCup ozDrunk={totalOz} goal={goalOz} />
          </div>
        )}

        {/* Quick add buttons */}
        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
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
              className="flex-1 px-3 py-2 rounded-lg text-white outline-none text-sm"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
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
        </div>

        {/* Today's log */}
        {entries.length > 0 && (
          <div>
            <p className="card-title mb-3">Today's Log</p>
            {entries.map(e => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 rounded-xl mb-2"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-faint)' }}>
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
              </div>
            ))}
          </div>
        )}

        {entries.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#444' }}>
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
