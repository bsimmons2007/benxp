import { useEffect, useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { XP_RATES, calculateLevel, xpForLevel } from '../lib/xp'
import { usePageTitle } from '../hooks/usePageTitle'

// ── PIN gate ──────────────────────────────────────────────────────────
// PIN is read from env so it is never shipped in the JS bundle.
// Set VITE_DEV_PIN in .env.local (e.g. VITE_DEV_PIN=your-pin-here).
// Falls back to a random value at build time so the gate is always locked
// if the env var is absent.
const DEV_PIN = import.meta.env.VITE_DEV_PIN as string | undefined ?? crypto.randomUUID()
const SESSION_KEY = 'youxp-dev-unlocked'

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState('')
  const [shake, setShake]   = useState(false)

  function press(digit: string) {
    if (input.length >= 4) return
    const next = input + digit
    setInput(next)
    if (next.length === 4) {
      if (next === DEV_PIN) {
        sessionStorage.setItem(SESSION_KEY, '1')
        onUnlock()
      } else {
        setShake(true)
        setTimeout(() => { setShake(false); setInput('') }, 600)
      }
    }
  }

  const KEYS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']]

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh', gap: 32 }}>
      <div>
        <p className="text-xs uppercase tracking-widest text-center mb-1" style={{ color: '#555' }}>Developer Access</p>
        <p className="text-xl font-bold text-center" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>Enter PIN</p>
      </div>

      {/* Dots */}
      <div
        className="flex gap-4"
        style={{ animation: shake ? 'shake 0.5s ease' : 'none' }}
      >
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: '50%',
            background: i < input.length ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: i < input.length ? '0 0 8px var(--accent)' : 'none',
            transition: 'all 0.15s ease',
          }} />
        ))}
      </div>

      {/* Keypad */}
      <div className="flex flex-col gap-3">
        {KEYS.map((row, ri) => (
          <div key={ri} className="flex gap-3 justify-center">
            {row.map((k, ki) => (
              <button
                key={ki}
                onClick={() => {
                  if (k === '⌫') setInput(p => p.slice(0, -1))
                  else if (k !== '') press(k)
                }}
                style={{
                  width: 72, height: 72, borderRadius: 16,
                  background: k === '' ? 'transparent' : 'rgba(255,255,255,0.06)',
                  border: k === '' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  color: '#fff', fontSize: k === '⌫' ? 20 : 24,
                  fontWeight: 600, fontFamily: 'Cinzel, serif',
                  cursor: k === '' ? 'default' : 'pointer',
                  transition: 'background 0.1s ease',
                  boxShadow: k === '' ? 'none' : '0 2px 8px rgba(0,0,0,0.2)',
                }}
                onMouseDown={e => { if (k !== '') (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
                onMouseUp={e => { if (k !== '') (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
              >
                {k}
              </button>
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}

// ── XP Engine viewer ──────────────────────────────────────────────────
interface XPEntry {
  category: string
  icon:     string
  label:    string
  xp:       number
  detail?:  string
}

async function fetchXPEntries(): Promise<{ entries: XPEntry[]; total: number }> {
  const [lifting, skate, prs, books, games, challenges, sleep] = await Promise.all([
    supabase.from('lifting_log').select('date, lift, sets, reps, weight').order('date', { ascending: false }),
    supabase.from('skate_sessions').select('date, miles').order('date', { ascending: false }),
    supabase.from('pr_history').select('date, lift, est_1rm').order('date', { ascending: false }),
    supabase.from('books').select('date_finished, title').not('date_finished', 'is', null).order('date_finished', { ascending: false }),
    supabase.from('fortnite_games').select('date, kills, win').eq('win', true).order('date', { ascending: false }),
    supabase.from('challenges').select('notes, xp_reward').eq('status', 'completed'),
    supabase.from('sleep_log').select('date, hours_slept').order('date', { ascending: false }),
  ])

  const entries: XPEntry[] = []

  // Sets
  const liftRows = lifting.data ?? []
  liftRows.forEach((r: { date: string; lift: string; sets: number; reps: number; weight: number | null }) => {
    entries.push({
      category: 'Lifting', icon: 'lift',
      label: `${r.lift} — ${r.sets}×${r.reps}${r.weight ? ` @ ${r.weight}lbs` : ''}`,
      xp: XP_RATES.per_set,
      detail: r.date,
    })
  })

  // Workout day bonuses
  const uniqueDays = [...new Set(liftRows.map((r: { date: string }) => r.date))]
  uniqueDays.forEach(date => {
    entries.push({ category: 'Lifting', icon: 'cal', label: `Workout day bonus`, xp: XP_RATES.workout_day, detail: date })
  })

  // PRs
  ;(prs.data ?? []).forEach((r: { date: string; lift: string; est_1rm: number }) => {
    entries.push({ category: 'Lifting', icon: 'trophy', label: `PR — ${r.lift} ${r.est_1rm.toFixed(0)} lbs`, xp: XP_RATES.new_pr, detail: r.date })
  })

  // Skate
  ;(skate.data ?? []).forEach((r: { date: string; miles: number }) => {
    const xp = Math.round(r.miles * XP_RATES.skate_per_mile)
    entries.push({ category: 'Skate', icon: 'skate', label: `${r.miles} miles`, xp, detail: r.date })
  })

  // Books
  ;(books.data ?? []).forEach((r: { date_finished: string; title: string }) => {
    entries.push({ category: 'Books', icon: 'books', label: r.title, xp: XP_RATES.book_finished, detail: r.date_finished })
  })

  // Fortnite wins
  ;(games.data ?? []).forEach((r: { date: string; kills: number }) => {
    entries.push({ category: 'Fortnite', icon: 'game', label: `Win — ${r.kills} kills`, xp: XP_RATES.fortnite_win, detail: r.date })
  })

  // Sleep
  ;(sleep.data ?? []).forEach((r: { date: string; hours_slept: number | null }) => {
    const bonus = (r.hours_slept ?? 0) >= 7 ? XP_RATES.sleep_quality_bonus : 0
    const xp = XP_RATES.sleep_log + bonus
    entries.push({
      category: 'Sleep', icon: 'sleep',
      label: `${r.hours_slept ?? '?'}h sleep${bonus > 0 ? ' (+quality bonus)' : ''}`,
      xp, detail: r.date,
    })
  })

  // Challenges
  ;(challenges.data ?? []).forEach((r: { notes: string; xp_reward: number }) => {
    entries.push({ category: 'Challenges', icon: 'sword', label: r.notes ?? 'Challenge', xp: r.xp_reward })
  })

  const total = entries.reduce((s, e) => s + e.xp, 0)
  return { entries, total }
}

const CATEGORY_ORDER = ['Lifting', 'Skate', 'Books', 'Fortnite', 'Sleep', 'Challenges']
const CATEGORY_COLORS: Record<string, string> = {
  Lifting: '#f87171', Skate: '#4ade80', Books: '#60a5fa',
  Fortnite: '#a78bfa', Sleep: '#34d399', Challenges: 'var(--accent)',
}

function XPEngine() {
  const [data, setData]     = useState<{ entries: XPEntry[]; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter]     = useState<string | null>(null)

  useEffect(() => {
    fetchXPEntries().then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <p style={{ color: '#444', textAlign: 'center', padding: 40 }}>Loading XP engine…</p>
  if (!data) return null

  const byCategory = CATEGORY_ORDER.map(cat => ({
    cat,
    entries: data.entries.filter(e => e.category === cat),
    total:   data.entries.filter(e => e.category === cat).reduce((s, e) => s + e.xp, 0),
  })).filter(g => g.entries.length > 0)

  const level   = calculateLevel(data.total)
  const toNext  = xpForLevel(level + 1) - data.total
  const formula = `level = floor(1 + sqrt(totalXP / 200))`

  const visibleEntries = filter
    ? data.entries.filter(e => e.category === filter)
    : data.entries

  return (
    <div>
      {/* Total + formula */}
      <Card className="mb-4" goldBorder>
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#888' }}>Total XP</p>
        <p className="text-4xl font-bold mb-1" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>
          {data.total.toLocaleString()}
        </p>
        <p style={{ color: '#aaa', fontSize: 12 }}>Level {level} · {toNext.toLocaleString()} to next</p>
        <div className="mt-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', fontSize: 11, color: '#4ade80' }}>
          {formula}
        </div>
      </Card>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {byCategory.map(({ cat, entries: es, total: t }) => (
          <button
            key={cat}
            onClick={() => setFilter(filter === cat ? null : cat)}
            style={{
              background: filter === cat ? `${CATEGORY_COLORS[cat]}22` : 'var(--card-bg)',
              border: `1px solid ${filter === cat ? CATEGORY_COLORS[cat] : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 12, padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
            }}
          >
            <p style={{ color: CATEGORY_COLORS[cat], fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{t.toLocaleString()}</p>
            <p style={{ color: '#aaa', fontSize: 10, marginTop: 3 }}>{cat} · {es.length} entries</p>
          </button>
        ))}
      </div>

      {/* XP rates reference */}
      <Card className="mb-4">
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#888' }}>XP Rate Table</p>
        <div className="flex flex-col gap-1.5" style={{ fontFamily: 'monospace', fontSize: 11 }}>
          {Object.entries(XP_RATES).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span style={{ color: '#444' }}>{k.replace(/_/g, ' ')}</span>
              <span style={{ color: 'var(--accent)' }}>{v === 0 ? 'variable' : `${v} XP`}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Entry log */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-widest" style={{ color: '#888' }}>
            {filter ? `${filter} Entries` : 'All XP Entries'} ({visibleEntries.length})
          </p>
          {filter && (
            <button onClick={() => setFilter(null)} style={{ color: 'var(--accent)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear filter
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1" style={{ maxHeight: 400, overflowY: 'auto' }}>
          {visibleEntries.map((e, i) => (
            <div
              key={i}
              onClick={() => setExpanded(expanded === `${i}` ? null : `${i}`)}
              style={{
                padding: '7px 8px', borderRadius: 8, cursor: 'pointer',
                background: expanded === `${i}` ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                border: '1px solid transparent',
                transition: 'background 0.1s ease',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 13 }}>{e.icon}</span>
                  <span style={{ color: '#ccc', fontSize: 11 }}>{e.label}</span>
                </div>
                <span style={{ color: CATEGORY_COLORS[e.category], fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 8 }}>
                  +{e.xp}
                </span>
              </div>
              {expanded === `${i}` && e.detail && (
                <p style={{ color: '#555', fontSize: 10, marginTop: 4, marginLeft: 22, fontFamily: 'monospace' }}>
                  {e.detail} · {e.category}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export function DevSettings() {
  usePageTitle('Dev Tools')
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')
  const [activeTab, setActiveTab] = useState<'xp'>('xp')

  return (
    <>
      <TopBar title="Dev" />
      <PageWrapper>
        {!unlocked ? (
          <PinGate onUnlock={() => setUnlocked(true)} />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>// developer mode</p>
                <p className="font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Settings</p>
              </div>
              <button
                onClick={() => { sessionStorage.removeItem(SESSION_KEY); setUnlocked(false) }}
                style={{ color: '#555', fontSize: 11, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}
              >
                Lock
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-2 mb-5">
              {[{ id: 'xp', label: 'XP Engine' }].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as 'xp')}
                  style={{
                    padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: activeTab === t.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                    color: activeTab === t.id ? 'var(--base-bg)' : '#888',
                    border: 'none',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'xp' && <XPEngine />}
          </>
        )}
      </PageWrapper>
    </>
  )
}
