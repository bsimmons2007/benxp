import { useNavigate } from 'react-router-dom'
import { useState, useRef, type ReactNode } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { useXP } from '../hooks/useXP'
import { useUserName } from '../hooks/useUserName'
import { useStore } from '../store/useStore'
import { XP_RATES } from '../lib/xp'
import { THEMES, saveTheme, loadTheme, timeThemeEnabled, setTimeThemeEnabled, applyTimeOrSavedTheme } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { EditIcon, TrashIcon, DumbbellIcon, TrophyIcon, BookIcon, SkateIcon, RunIcon, GamepadIcon, MoonIcon, RulerIcon, TargetIcon, SwordIcon, CalendarIcon, ActivityIcon, StarIcon } from '../components/ui/Icon'
import { toRoman } from '../lib/utils'
import {
  SECTION_DEFS, DEFAULT_ORDER,
  loadSectionOrder, saveSectionOrder,
  loadHiddenSections, saveHiddenSections,
} from '../lib/sections'
import {
  sfxEnabled, setSFX, setAmbient, ambientPlaying,
  AMBIENT_SCENES, ambientScene, setAmbientSceneId,
  getAmbientForTheme, getAmbientVolume, setAmbientVolume,
} from '../lib/sounds'
import type { Theme } from '../lib/theme'
import type { SectionKey } from '../lib/sections'
import { usePageTitle } from '../hooks/usePageTitle'
import { resetTutorial } from '../lib/tutorial'

const C = 'var(--text-muted)'
const XP_BREAKDOWN: { label: string; icon: ReactNode; xp: string }[] = [
  { label: 'Per set logged',        icon: <DumbbellIcon  size={14} color={C} />, xp: `${XP_RATES.per_set} XP` },
  { label: 'Per workout day',       icon: <CalendarIcon  size={14} color={C} />, xp: `${XP_RATES.workout_day} XP` },
  { label: 'New personal record',   icon: <TrophyIcon    size={14} color={C} />, xp: `${XP_RATES.new_pr} XP` },
  { label: 'Book finished',         icon: <BookIcon      size={14} color={C} />, xp: `${XP_RATES.book_finished} XP` },
  { label: 'Per mile skated',       icon: <SkateIcon     size={14} color={C} />, xp: `${XP_RATES.skate_per_mile} XP` },
  { label: 'Per mile cardio',       icon: <RunIcon       size={14} color={C} />, xp: `${XP_RATES.cardio_per_mile} XP` },
  { label: 'Fortnite win',          icon: <GamepadIcon   size={14} color={C} />, xp: `${XP_RATES.fortnite_win} XP` },
  { label: 'Sleep logged',          icon: <MoonIcon      size={14} color={C} />, xp: `${XP_RATES.sleep_log} XP` },
  { label: 'Good sleep (7+ hrs)',   icon: <ActivityIcon  size={14} color={C} />, xp: `+${XP_RATES.sleep_quality_bonus} XP bonus` },
  { label: 'Mood check-in',         icon: <ActivityIcon  size={14} color={C} />, xp: `${XP_RATES.mood_log} XP` },
  { label: 'Body measurement',      icon: <RulerIcon     size={14} color={C} />, xp: `${XP_RATES.measurement_log} XP` },
  { label: 'Challenge completed',   icon: <SwordIcon     size={14} color={C} />, xp: 'Variable' },
  { label: 'Goal completed',        icon: <TargetIcon    size={14} color={C} />, xp: 'Variable' },
]

const ALL_TABLES = [
  'lifting_log', 'skate_sessions', 'pr_history', 'books',
  'fortnite_games', 'challenges', 'sleep_log', 'bodyweight_log', 'to_read',
  'mood_log', 'body_measurements', 'cardio_sessions', 'goals',
]

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ].join('\n')
}

function triggerDownload(filename: string, content: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' }))
  a.download = filename
  a.click()
}

async function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 96; canvas.height = 96
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      const size = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 96, 96)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.src = URL.createObjectURL(file)
  })
}


function ThemeSquare({ theme, active, onSelect }: { theme: Theme; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      title={theme.name}
      className="relative rounded-lg transition-all"
      style={{
        width: 40, height: 40,
        background: theme.baseBg,
        border: active ? `2.5px solid ${theme.accent}` : '2px solid rgba(255,255,255,0.1)',
        boxShadow: active ? `0 0 12px ${theme.accent}88` : 'none',
        transform: active ? 'scale(1.12)' : 'scale(1)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Orb blobs inside mini square */}
      <div style={{ position: 'absolute', width: 24, height: 24, borderRadius: '50%', background: theme.orb1, top: -4, left: -4, filter: 'blur(4px)' }} />
      <div style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: theme.orb2, bottom: -4, right: -4, filter: 'blur(4px)' }} />
      {/* Accent dot center */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: theme.accent, boxShadow: `0 0 6px ${theme.accent}` }} />
      </div>
    </button>
  )
}

export function Settings() {
  usePageTitle('Settings')
  const navigate = useNavigate()
  const { totalXP, level } = useXP()
  const userName      = useUserName()
  const refreshUser   = useStore(s => s.refreshUser)
  const resetStore    = useStore(s => s.reset)
  const storeAvatar   = useStore(s => s.avatarUrl)

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(storeAvatar)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [activeTheme, setActiveTheme]   = useState<Theme>(loadTheme)
  const [themeOpen, setThemeOpen]       = useState(false)
  const [timeTheme, setTimeThemeState]  = useState(timeThemeEnabled)
  const [levelStyle, setLevelStyle] = useState<'number' | 'roman'>(
    () => (localStorage.getItem('benxp-level-style') as 'number' | 'roman') ?? 'number'
  )
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>(loadSectionOrder)
  const [hiddenSections, setHiddenSections] = useState<SectionKey[]>(loadHiddenSections)
  const [sfx, setSfxState]             = useState(sfxEnabled)
  const [ambient, setAmbientState]     = useState(ambientPlaying)
  const [activeScene, setActiveScene]  = useState(ambientScene)
  const [volume, setVolumeState]       = useState(getAmbientVolume)
  const [soundOpen, setSoundOpen]      = useState(false)
  const [levelOpen, setLevelOpen]      = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState(false)
  const [xpOpen, setXpOpen]           = useState(false)
  const [dataOpen, setDataOpen]        = useState(false)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle')
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function saveName() {
    if (!nameInput.trim()) return
    setNameSaving(true)
    await supabase.auth.updateUser({ data: { name: nameInput.trim() } })
    setNameSaving(false)
    setEditingName(false)
    refreshUser()
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    const base64 = await compressAvatar(file)
    await supabase.auth.updateUser({ data: { avatar_url: base64 } })
    setAvatarUrl(base64)
    refreshUser()
    setAvatarLoading(false)
  }

  async function handleExportCSV() {
    setExporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setExporting(false); return }
    for (const table of ALL_TABLES) {
      const { data } = await supabase.from(table).select('*').eq('user_id', user.id)
      if (data?.length) {
        triggerDownload(`youxp_${table}.csv`, toCSV(data as Record<string, unknown>[]))
        await new Promise(r => setTimeout(r, 250))
      }
    }
    setExporting(false)
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await Promise.all(ALL_TABLES.map(t => supabase.from(t).delete().eq('user_id', user.id)))
    }
    await supabase.auth.signOut()
    resetStore()
    navigate('/login')
  }

  function handleTheme(theme: Theme) {
    setActiveTheme(theme)
    saveTheme(theme)
    // Sync the highlighted scene to whatever the theme maps to
    const mapped = getAmbientForTheme(theme.id)
    if (ambientScene() !== mapped) setActiveScene(mapped)
  }

  function handleLevelStyle(style: 'number' | 'roman') {
    setLevelStyle(style)
    localStorage.setItem('benxp-level-style', style)
  }

  function toggleHidden(key: SectionKey) {
    const next = hiddenSections.includes(key)
      ? hiddenSections.filter(k => k !== key)
      : [...hiddenSections, key]
    setHiddenSections(next)
    saveHiddenSections(next)
  }

  function moveSection(key: SectionKey, dir: -1 | 1) {
    const idx = sectionOrder.indexOf(key)
    const next = [...sectionOrder]
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= next.length) return
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    setSectionOrder(next)
    saveSectionOrder(next)
  }

  function resetSections() {
    setSectionOrder(DEFAULT_ORDER)
    setHiddenSections([])
    saveSectionOrder(DEFAULT_ORDER)
    saveHiddenSections([])
  }

  async function logout() {
    await supabase.auth.signOut()
    resetStore()
    navigate('/login')
  }

  const displayLevel = levelStyle === 'roman' ? toRoman(level) : String(level)

  // Reusable chevron
  function Chevron({ open }: { open: boolean }) {
    return <span style={{ color: '#555', fontSize: 12, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', display: 'block', flexShrink: 0 }}>▾</span>
  }

  // Reusable toggle pill
  function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
    return (
      <button onClick={onToggle} className="relative rounded-full transition-all duration-200 shrink-0" style={{ width: 44, height: 26, background: value ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease' }} />
      </button>
    )
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

        {/* ── Profile hero ─────────────────────────────────────────── */}
        <Card className="mb-2">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold relative"
                style={{ background: avatarUrl ? 'transparent' : 'var(--accent)', color: 'var(--base-bg)', fontFamily: 'Cinzel, serif' }}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : (userName ? userName[0].toUpperCase() : '?')
                }
                {avatarLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <span className="text-xs text-white">...</span>
                  </div>
                )}
              </button>
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center pointer-events-none" style={{ background: 'var(--accent)', color: 'var(--base-bg)', fontSize: 10 }}>📷</div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name + stats */}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={nameRef} autoFocus value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                    className="flex-1 px-3 py-1.5 rounded-lg text-white outline-none text-base"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--accent)' }}
                    placeholder="Your name"
                  />
                  <button onClick={saveName} disabled={nameSaving} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'var(--accent)', color: 'var(--base-bg)' }}>
                    {nameSaving ? '...' : 'Save'}
                  </button>
                  <button onClick={() => setEditingName(false)} className="px-2 py-1.5 rounded-lg text-xs" style={{ color: '#888', background: 'rgba(255,255,255,0.06)' }}>✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-xl truncate" style={{ fontFamily: 'Cinzel, serif' }}>{userName || '—'}</p>
                  <button onClick={() => { setNameInput(userName); setEditingName(true) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', flexShrink: 0 }}><EditIcon size={12} color="var(--text-muted)" /></button>
                </div>
              )}
              <p className="mt-0.5" style={{ color: 'var(--accent)', fontSize: 13, fontFamily: 'Cinzel, serif' }}>
                Level {displayLevel}
              </p>
              <p style={{ color: '#444', fontSize: 12 }}>{totalXP.toLocaleString()} XP total</p>
            </div>
          </div>
        </Card>

        {/* ── Restart Tutorial ─────────────────────────────────────── */}
        <button
          onClick={() => {
            resetTutorial()
            window.dispatchEvent(new Event('tutorial-reset'))
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '12px 16px',
            marginBottom: 8,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 16 }}>🎮</span>
          Restart App Tutorial
        </button>

        {/* ── Appearance card ───────────────────────────────────────── */}
        <Card className="mb-2">

          {/* Theme row */}
          <button onClick={() => setThemeOpen(o => !o)} className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg relative overflow-hidden flex-shrink-0" style={{ background: activeTheme.baseBg, border: `2px solid ${activeTheme.accent}` }}>
                <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: activeTheme.orb1, top: -3, left: -3, filter: 'blur(4px)' }} />
                <div style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: activeTheme.orb2, bottom: -3, right: -3, filter: 'blur(3px)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: activeTheme.accent, boxShadow: `0 0 6px ${activeTheme.accent}` }} />
                </div>
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm text-white">{activeTheme.name}</p>
                <p style={{ color: '#444', fontSize: 11 }}>Color theme</p>
              </div>
            </div>
            <Chevron open={themeOpen} />
          </button>
          {themeOpen && (
            <div className="mt-3 pb-1 pop-in">
              <div className="flex flex-wrap gap-2">
                {THEMES.map(t => (
                  <div key={t.id} className="flex flex-col items-center gap-1">
                    <ThemeSquare theme={t} active={activeTheme.id === t.id} onSelect={() => handleTheme(t)} />
                    <span style={{ color: activeTheme.id === t.id ? t.accent : '#555', fontSize: 9, fontWeight: 600, maxWidth: 40, textAlign: 'center', lineHeight: 1.2 }}>{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '2px 0' }} />

          {/* Level style row */}
          <button onClick={() => setLevelOpen(o => !o)} className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><TrophyIcon size={18} color="var(--text-secondary)" /></span>
              <div className="text-left">
                <p className="font-semibold text-sm text-white">Level Display</p>
                <p style={{ color: '#444', fontSize: 11 }}>{levelStyle === 'roman' ? `Roman — ${toRoman(level)}` : `Numeric — ${level}`}</p>
              </div>
            </div>
            <Chevron open={levelOpen} />
          </button>
          {levelOpen && (
            <div className="pb-2 pop-in">
              <div className="flex gap-3">
                {(['number', 'roman'] as const).map(style => (
                  <button
                    key={style}
                    onClick={() => handleLevelStyle(style)}
                    className="flex-1 py-3 rounded-xl font-bold transition-all"
                    style={{
                      background: levelStyle === style ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                      color: levelStyle === style ? 'var(--base-bg)' : '#666',
                      border: `1px solid ${levelStyle === style ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`,
                      fontFamily: 'Cinzel, serif', fontSize: 20,
                    }}
                  >
                    {style === 'number' ? level : toRoman(level)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '2px 0' }} />

          {/* Time of day auto-theme row */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>🕐</span>
              <div>
                <p className="font-semibold text-sm text-white">Time of Day Theme</p>
                <p style={{ color: '#444', fontSize: 11 }}>
                  {timeTheme ? 'Auto-switches: Dawn · Day · Dusk · Night' : 'Auto-switches with the clock'}
                </p>
              </div>
            </div>
            <Toggle
              value={timeTheme}
              onToggle={() => {
                const next = !timeTheme
                setTimeThemeState(next)
                setTimeThemeEnabled(next)
                const applied = applyTimeOrSavedTheme()
                setActiveTheme(applied)
              }}
            />
          </div>
        </Card>

        {/* ── Dashboard sections card ───────────────────────────────── */}
        <Card className="mb-2">
          <button onClick={() => setSectionsOpen(o => !o)} className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><DumbbellIcon size={18} color="var(--text-secondary)" /></span>
              <div className="text-left">
                <p className="font-semibold text-sm text-white">Dashboard Sections</p>
                <p style={{ color: '#444', fontSize: 11 }}>
                  {hiddenSections.length === 0 ? 'All visible' : `${hiddenSections.length} hidden`} · {sectionOrder.length} sections
                </p>
              </div>
            </div>
            <Chevron open={sectionsOpen} />
          </button>
          {sectionsOpen && (
            <div className="pb-1 pop-in">
              <div className="flex flex-col gap-2 mb-2">
                {sectionOrder.map((key, idx) => {
                  const def = SECTION_DEFS[key]
                  const isHidden = hiddenSections.includes(key)
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-3 py-2 px-3 rounded-xl"
                      style={{ background: isHidden ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', opacity: isHidden ? 0.5 : 1 }}
                    >
                      <span className="text-base">{def.icon}</span>
                      <span className="flex-1 font-medium" style={{ color: isHidden ? '#555' : '#CCC', fontFamily: 'Cormorant Garamond, serif', fontSize: 15 }}>{def.label}</span>
                      <button onClick={() => moveSection(key, -1)} disabled={idx === 0} className="w-7 h-7 rounded flex items-center justify-center text-sm" style={{ color: idx === 0 ? '#333' : '#777', background: 'rgba(255,255,255,0.06)' }}>↑</button>
                      <button onClick={() => moveSection(key, 1)} disabled={idx === sectionOrder.length - 1} className="w-7 h-7 rounded flex items-center justify-center text-sm" style={{ color: idx === sectionOrder.length - 1 ? '#333' : '#777', background: 'rgba(255,255,255,0.06)' }}>↓</button>
                      <button onClick={() => toggleHidden(key)} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: isHidden ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)' }}>
                        {isHidden ? '🙈' : '👁️'}
                      </button>
                    </div>
                  )
                })}
              </div>
              <button onClick={resetSections} className="w-full py-2 rounded-lg text-xs" style={{ color: '#444', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                Reset to default order
              </button>
            </div>
          )}
        </Card>

        {/* ── Sound card ────────────────────────────────────────────── */}
        <Card className="mb-2">
          <button onClick={() => setSoundOpen(o => !o)} className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>
                {sfx || ambient ? (volume < 0.15 ? '🔇' : '🔊') : '🔇'}
              </span>
              <div className="text-left">
                <p className="font-semibold text-sm text-white">Sound</p>
                <p style={{ color: '#444', fontSize: 11 }}>
                  {[sfx && 'SFX', ambient && `Ambient · ${AMBIENT_SCENES.find(s => s.id === activeScene)?.name ?? ''}`].filter(Boolean).join(' · ') || 'All off'}
                </p>
              </div>
            </div>
            <Chevron open={soundOpen} />
          </button>

          {soundOpen && (
            <div className="pb-1 pop-in">
              {[
                { label: 'Sound Effects', sub: 'XP chimes, level-up, PR burst', icon: <ActivityIcon size={16} color="var(--accent)" /> as ReactNode, value: sfx, toggle: () => { const n = !sfx; setSfxState(n); setSFX(n) } },
                { label: 'Ambient', sub: 'Background soundscape', icon: <StarIcon size={16} color="var(--accent)" /> as ReactNode, value: ambient, toggle: () => { const n = !ambient; setAmbientState(n); setAmbient(n) } },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3">
                    <span style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{row.icon}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{row.label}</p>
                      <p style={{ color: '#555', fontSize: 11 }}>{row.sub}</p>
                    </div>
                  </div>
                  <Toggle value={row.value} onToggle={row.toggle} />
                </div>
              ))}

              {/* Volume */}
              <div className="flex items-center gap-3 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ width: 28, textAlign: 'center' }}>{volume < 0.15 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium mb-1">Volume</p>
                  <input
                    type="range" min={0} max={1} step={0.01} value={volume}
                    onChange={e => { const v = parseFloat(e.target.value); setVolumeState(v); setAmbientVolume(v) }}
                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                </div>
                <span style={{ color: '#444', fontSize: 11, minWidth: 28, textAlign: 'right' }}>{Math.round(volume * 100)}%</span>
              </div>

              {/* Scene picker */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#444' }}>Atmosphere</p>
                <div className="flex flex-col gap-1.5">
                  {AMBIENT_SCENES.map(scene => {
                    const isActive = activeScene === scene.id
                    return (
                      <button
                        key={scene.id}
                        onClick={() => { setActiveScene(scene.id); setAmbientSceneId(scene.id, ambient) }}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left"
                        style={{
                          background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                          border: isActive ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{scene.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{scene.name}</p>
                          <p className="text-xs truncate" style={{ color: '#444' }}>{scene.description}</p>
                        </div>
                        {isActive && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', flexShrink: 0, animation: ambient ? 'glowPulse 2s ease-in-out infinite' : 'none' }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ── XP Rates card ─────────────────────────────────────────── */}
        <Card className="mb-2">
          <button onClick={() => setXpOpen(o => !o)} className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><ActivityIcon size={18} color="var(--text-secondary)" /></span>
              <div className="text-left">
                <p className="font-semibold text-sm text-white">XP Rates</p>
                <p style={{ color: '#444', fontSize: 11 }}>How XP is earned per activity</p>
              </div>
            </div>
            <Chevron open={xpOpen} />
          </button>
          {xpOpen && (
            <div className="pb-1 pop-in">
              {XP_BREAKDOWN.map(r => (
                <div key={r.label} className="flex items-center justify-between py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2">
                    <span>{r.icon}</span>
                    <span style={{ color: '#BBBBBB', fontFamily: 'Cormorant Garamond, serif', fontSize: 15 }}>{r.label}</span>
                  </div>
                  <span className="font-bold" style={{ color: 'var(--accent)', fontSize: 13 }}>{r.xp}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Data & account card ───────────────────────────────────── */}
        <Card className="mb-2">
          <button onClick={() => setDataOpen(o => !o)} className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>🗄️</span>
              <div className="text-left">
                <p className="font-semibold text-sm text-white">Data & Account</p>
                <p style={{ color: '#444', fontSize: 11 }}>Export, delete · BenXP v1.0.0</p>
              </div>
            </div>
            <Chevron open={dataOpen} />
          </button>
          {dataOpen && (
            <div className="pb-1 pop-in">
              <div
                className="flex items-center justify-between py-2.5 cursor-pointer"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                onClick={!exporting ? handleExportCSV : undefined}
              >
                <div className="flex items-center gap-3">
                  <span style={{ width: 28, textAlign: 'center' }}>📤</span>
                  <span className="text-white text-sm">{exporting ? 'Exporting...' : 'Export data as CSV'}</span>
                </div>
                <span style={{ color: '#555' }}>›</span>
              </div>

              {deleteStep === 'idle' ? (
                <div
                  className="flex items-center justify-between py-2.5 cursor-pointer"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => setDeleteStep('confirm')}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><TrashIcon size={16} color="#E94560" /></span>
                    <span style={{ color: '#E94560', fontSize: 14 }}>Delete account &amp; all data</span>
                  </div>
                  <span style={{ color: '#555' }}>›</span>
                </div>
              ) : (
                <div className="py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-sm mb-3" style={{ color: '#E94560' }}>This will permanently delete all your data. This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteStep('idle')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: '#888' }}>Cancel</button>
                    <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(233,69,96,0.2)', color: '#E94560', border: '1px solid rgba(233,69,96,0.4)' }}>
                      {deleting ? 'Deleting...' : 'Yes, delete everything'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ── Sign out ──────────────────────────────────────────────── */}
        <button onClick={logout} className="w-full py-3.5 rounded-xl font-semibold mt-2" style={{ background: 'rgba(233,69,96,0.12)', color: '#E94560', border: '1px solid rgba(233,69,96,0.25)', fontFamily: 'Cinzel, serif' }}>
          Sign Out
        </button>

      </PageWrapper>
    </>
  )
}
