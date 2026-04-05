import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { useXP } from '../hooks/useXP'
import { useUserName } from '../hooks/useUserName'
import { XP_RATES } from '../lib/xp'
import { THEMES, saveTheme, loadTheme } from '../lib/theme'
import { supabase } from '../lib/supabase'
import type { Theme } from '../lib/theme'

const XP_BREAKDOWN = [
  { label: 'Per set logged',      icon: '🏋️', xp: `${XP_RATES.per_set} XP` },
  { label: 'Per workout day',     icon: '📅', xp: `${XP_RATES.workout_day} XP` },
  { label: 'New personal record', icon: '🏆', xp: `${XP_RATES.new_pr} XP` },
  { label: 'Book finished',       icon: '📚', xp: `${XP_RATES.book_finished} XP` },
  { label: 'Per mile skated',     icon: '🛼', xp: `${XP_RATES.skate_per_mile} XP` },
  { label: 'Fortnite win',        icon: '🎮', xp: `${XP_RATES.fortnite_win} XP` },
  { label: 'Challenge completed', icon: '⚔️', xp: 'Variable' },
]

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest mb-2 mt-6" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif', fontSize: 13 }}>
      {title}
    </p>
  )
}

function ThemeSwatch({ theme, active, onSelect }: { theme: Theme; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all"
      style={{
        background: active ? `${theme.accent}22` : 'rgba(255,255,255,0.03)',
        border: active ? `2px solid ${theme.accent}` : '2px solid rgba(255,255,255,0.06)',
        boxShadow: active ? `0 0 20px ${theme.accent}44` : 'none',
        transform: active ? 'translateY(-2px)' : 'none',
      }}
    >
      {/* Mini preview orbs */}
      <div className="relative w-8 h-8 rounded-full overflow-hidden" style={{ background: theme.baseBg }}>
        <div className="absolute" style={{ width: 18, height: 18, borderRadius: '50%', background: theme.orb1, top: -2, left: -2, filter: 'blur(3px)' }} />
        <div className="absolute" style={{ width: 16, height: 16, borderRadius: '50%', background: theme.orb2, bottom: -2, right: -2, filter: 'blur(3px)' }} />
        <div className="absolute inset-0 flex items-center justify-center text-xs">{theme.emoji}</div>
      </div>
      <div
        className="w-4 h-4 rounded-full"
        style={{ background: theme.accent, boxShadow: `0 0 6px ${theme.accent}88` }}
      />
      <p className="text-xs font-semibold text-center leading-tight" style={{ color: active ? theme.accent : '#888', maxWidth: 64, fontSize: 10 }}>
        {theme.name}
      </p>
    </button>
  )
}

export function Settings() {
  const navigate = useNavigate()
  const { totalXP, level } = useXP()
  const userName = useUserName()
  const [activeTheme, setActiveTheme] = useState<Theme>(loadTheme)

  async function logout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function handleTheme(theme: Theme) {
    setActiveTheme(theme)
    saveTheme(theme)
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 flex items-center px-4 py-3 z-40"
        style={{ background: 'rgba(10,12,28,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button onClick={() => navigate(-1)} className="mr-3 text-xl" style={{ color: 'var(--accent)' }}>←</button>
        <span className="text-2xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>Settings</span>
      </header>

      <PageWrapper>
        {/* Profile */}
        <Card className="flex items-center gap-4 mb-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{ background: 'var(--accent)', color: 'var(--base-bg)', fontFamily: 'Cinzel, serif' }}
          >
            {userName ? userName[0].toUpperCase() : '?'}
          </div>
          <div>
            <p className="text-white font-bold text-lg" style={{ fontFamily: 'Cinzel, serif' }}>{userName || '—'}</p>
            <p style={{ color: '#888', fontSize: 14 }}>Level {level} · {totalXP.toLocaleString()} XP</p>
          </div>
        </Card>

        {/* Color scheme */}
        <SectionHeader title="Color Scheme" />
        <Card>
          <p className="text-sm mb-4" style={{ color: '#888' }}>Pick a theme — changes apply instantly.</p>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => (
              <ThemeSwatch key={t.id} theme={t} active={activeTheme.id === t.id} onSelect={() => handleTheme(t)} />
            ))}
          </div>
        </Card>

        {/* XP rates */}
        <SectionHeader title="XP Rates" />
        <Card>
          {XP_BREAKDOWN.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2">
                <span>{r.icon}</span>
                <span style={{ color: '#CCCCCC', fontFamily: 'Cormorant Garamond, serif', fontSize: 16 }}>{r.label}</span>
              </div>
              <span className="font-bold" style={{ color: 'var(--accent)', fontSize: 14 }}>{r.xp}</span>
            </div>
          ))}
        </Card>

        {/* Data */}
        <SectionHeader title="Data" />
        <Card>
          <div
            className="flex items-center justify-between py-3 px-1 cursor-pointer"
            onClick={() => alert('Coming soon!')}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📤</span>
              <span className="text-white" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17 }}>Export data as CSV</span>
            </div>
            <span style={{ color: '#888' }}>›</span>
          </div>
        </Card>

        {/* About */}
        <SectionHeader title="About" />
        <Card>
          <div className="flex items-center justify-between py-3 px-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">⚡</span>
              <span className="text-white" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17 }}>YouXP</span>
            </div>
            <span style={{ color: '#888', fontSize: 14 }}>v1.0.0</span>
          </div>
        </Card>

        {/* Sign out */}
        <button
          onClick={logout}
          className="w-full py-3.5 rounded-xl font-semibold mt-4"
          style={{ background: 'rgba(233,69,96,0.12)', color: '#E94560', border: '1px solid rgba(233,69,96,0.25)', fontFamily: 'Cinzel, serif' }}
        >
          Sign Out
        </button>
      </PageWrapper>
    </>
  )
}
