import { useNavigate } from 'react-router-dom'
import { useState, useRef, type ReactNode } from 'react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { useXP } from '../hooks/useXP'
import { useUserName } from '../hooks/useUserName'
import { useStore } from '../store/useStore'
import { XP_RATES } from '../lib/xp'
import { THEMES, saveTheme, loadTheme, isLightMode, setLightMode, applyTheme } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { logAuditEvent } from '../lib/audit'
import { EditIcon, TrashIcon, DumbbellIcon, TrophyIcon, BookIcon, SkateIcon, RunIcon, GamepadIcon, MoonIcon, SunIcon, RulerIcon, TargetIcon, SwordIcon, CalendarIcon, ActivityIcon, StarIcon, DotsIcon, ShareIcon, SectionIcon, AmbientSceneIcon, ShieldIcon, BellIcon, ChevronIcon, CloseIcon } from '../components/ui/Icon'
import { getNotifPrefs, saveNotifPrefs, requestPermission, permissionGranted, notificationsSupported } from '../lib/notifications'
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
import { CHANGELOG, CURRENT_VERSION } from '../lib/changelog'

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

// All tables that hold user data. body_measurements is the correct table
// for weight/measurements — bodyweight_log does not exist (P0-5 fix).
const ALL_TABLES = [
  'lifting_log', 'skate_sessions', 'pr_history', 'books',
  'fortnite_games', 'challenges', 'sleep_log', 'to_read',
  'mood_log', 'body_measurements', 'cardio_sessions', 'goals',
  'basketball_sessions', 'pickleball_games', 'golf_rounds', 'disc_golf_rounds',
  'hiking_sessions', 'table_tennis_games', 'chess_games', 'pool_games',
  'volleyball_sessions', 'spikeball_games', 'water_log',
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
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Revoke after a tick so the browser has time to start the download (P2-9)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

async function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = 96; canvas.height = 96
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const size = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 96, 96)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}


function ThemeSwatch({ theme, active, onSelect }: { theme: Theme; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      title={theme.name}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '5px 10px 5px 7px',
        borderRadius: 999,
        border: active ? `1.5px solid ${theme.accent}` : '1.5px solid var(--border-subtle)',
        background: active
          ? `color-mix(in srgb, ${theme.accent} 10%, var(--surface-1))`
          : 'var(--surface-1)',
        cursor: 'pointer',
        transition: 'border-color 0.15s, background 0.15s',
        boxShadow: active ? `0 0 0 2px ${theme.accent}28` : 'none',
        flexShrink: 0,
      }}
    >
      <span style={{
        width: 11, height: 11, borderRadius: '50%',
        background: theme.accent, flexShrink: 0,
        outline: `2px solid ${theme.accent}44`, outlineOffset: 1,
      }} />
      <span style={{
        fontSize: 11.5, fontWeight: active ? 600 : 500,
        color: active ? theme.accent : 'var(--text-secondary)',
        whiteSpace: 'nowrap',
      }}>{theme.name}</span>
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
  const [lightMode, setLightModeState]  = useState(isLightMode)
  const [levelStyle, setLevelStyle] = useState<'number' | 'roman'>(
    () => (localStorage.getItem('youxp-level-style') as 'number' | 'roman') ?? 'number'
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
  const [privacyOpen, setPrivacyOpen]  = useState(false)
  const [isOnLeaderboard, setIsOnLeaderboard] = useState<boolean | null>(null)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'type-email'>('idle')
  const [deleteEmailInput, setDeleteEmailInput] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [notifOpen, setNotifOpen]       = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(() => getNotifPrefs().enabled)
  const [notifTime, setNotifTime]       = useState(() => getNotifPrefs().time)
  const [notifPerm, setNotifPerm]       = useState(() => permissionGranted())
  const [changelogOpen, setChangelogOpen] = useState(false)

  async function saveName() {
    if (!nameInput.trim()) return
    setNameSaving(true)
    const { error } = await supabase.auth.updateUser({ data: { name: nameInput.trim() } })
    setNameSaving(false)
    if (!error) { setEditingName(false); refreshUser() }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarLoading(true)
    try {
      const base64 = await compressAvatar(file)
      await supabase.auth.updateUser({ data: { avatar_url: base64 } })
      setAvatarUrl(base64)
      refreshUser()
    } catch (err) {
      console.error('Avatar upload failed:', err)
    } finally {
      setAvatarLoading(false)
    }
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
    if (!user) { setDeleting(false); return }

    // Delete all user data first — only sign out if every delete succeeds (P0-4)
    const results = await Promise.all(
      ALL_TABLES.map(t => supabase.from(t).delete().eq('user_id', user.id))
    )
    const failed = results.filter(r => r.error)
    if (failed.length > 0) {
      console.error('[deleteAccount] Some deletions failed:', failed.map(r => r.error))
      setDeleting(false)
      setDeleteStep('idle')
      // Surface the error — a proper toast would be ideal but alert is safe here
      alert('Failed to delete some data. Please try again or contact support.')
      return
    }

    await logAuditEvent('account_delete')
    await supabase.auth.signOut()
    resetStore()
    navigate('/login')
  }

  function handleTheme(theme: Theme) {
    setActiveTheme(theme)
    saveTheme(theme)
    applyTheme(theme, lightMode)
    // Sync the highlighted scene to whatever the theme maps to
    const mapped = getAmbientForTheme(theme.id)
    if (ambientScene() !== mapped) setActiveScene(mapped)
  }

  function handleLevelStyle(style: 'number' | 'roman') {
    setLevelStyle(style)
    localStorage.setItem('youxp-level-style', style)
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
    return <span style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', display: 'block', flexShrink: 0 }}><ChevronIcon size={14} color="var(--text-muted)" /></span>
  }

  // Reusable toggle pill
  function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
    return (
      <button
        onClick={onToggle}
        className="relative rounded-full shrink-0"
        style={{
          width: 44, height: 26,
          background: value ? 'var(--accent)' : 'var(--border)',
          transition: 'background 0.2s ease',
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: value ? 21 : 3,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </button>
    )
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 flex items-center px-4 py-3 z-40"
        style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--border-faint)' }}
      >
        <button onClick={() => navigate(-1)} className="mr-3 text-xl" style={{ color: 'var(--accent)' }}>←</button>
        <span className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>Settings</span>
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
                style={{ background: avatarUrl ? 'transparent' : 'var(--accent)', color: 'var(--base-bg)' }}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : (userName ? userName[0].toUpperCase() : '?')
                }
                {avatarLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: 'var(--overlay)' }}>
                    <span style={{ color: "var(--text-primary)", fontSize: "0.75rem" }}>...</span>
                  </div>
                )}
              </button>
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center pointer-events-none" style={{ background: 'var(--accent)', color: 'var(--base-bg)', fontSize: 10 }}>+</div>
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
                    className="flex-1 px-3 py-1.5 rounded-lg outline-none text-base"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--accent)', color: 'var(--text-primary)' }}
                    placeholder="Your name"
                  />
                  <button onClick={saveName} disabled={nameSaving} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'var(--accent)', color: 'var(--base-bg)' }}>
                    {nameSaving ? '...' : 'Save'}
                  </button>
                  <button type="button" aria-label="Cancel" onClick={() => setEditingName(false)} className="px-2 py-1.5 rounded-lg text-xs inline-flex items-center" style={{ color: 'var(--text-muted)', background: 'var(--input-bg)' }}><CloseIcon size={13} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName || '—'}</p>
                  <button onClick={() => { setNameInput(userName); setEditingName(true) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: 'var(--input-bg)', border: 'none', cursor: 'pointer', flexShrink: 0 }}><EditIcon size={12} color="var(--text-muted)" /></button>
                </div>
              )}
              <p className="mt-0.5" style={{ color: 'var(--accent)', fontSize: 13 }}>
                Level {displayLevel}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{totalXP.toLocaleString()} XP total</p>
            </div>
          </div>
        </Card>

        {/* ── Appearance card ───────────────────────────────────────── */}
        <Card className="mb-2">

          {/* Theme picker — always visible grid */}
          <div className="py-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Color Theme</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{activeTheme.name}</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {THEMES.map(t => (
                <ThemeSwatch key={t.id} theme={t} active={activeTheme.id === t.id} onSelect={() => handleTheme(t)} />
              ))}
            </div>
          </div>

          {/* Light / Dark mode toggle */}
          <div className="flex items-center justify-between py-2 mt-1">
            <div className="flex items-center gap-3">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}>
                {lightMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
              </span>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {lightMode ? 'Light Mode' : 'Dark Mode'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  {lightMode ? 'Light background, dark accent' : 'Dark background, vivid accent'}
                </p>
              </div>
            </div>
            <Toggle
              value={lightMode}
              onToggle={() => {
                const next = !lightMode
                setLightModeState(next)
                setLightMode(next)
                applyTheme(activeTheme, next)
              }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border-faint)', margin: '2px 0' }} />

          {/* Level style row */}
          <button onClick={() => setLevelOpen(o => !o)} className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><TrophyIcon size={18} color="var(--text-secondary)" /></span>
              <div className="text-left">
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Level Display</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{levelStyle === 'roman' ? `Roman — ${toRoman(level)}` : `Numeric — ${level}`}</p>
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
                      background: levelStyle === style ? 'var(--accent)' : 'var(--input-bg)',
                      color: levelStyle === style ? 'var(--base-bg)' : 'var(--text-muted)',
                      border: `1px solid ${levelStyle === style ? 'var(--accent)' : 'var(--border)'}`, fontSize: 20,
                    }}
                  >
                    {style === 'number' ? level : toRoman(level)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ── Dashboard sections card ───────────────────────────────── */}
        <Card className="mb-2">
          <button onClick={() => setSectionsOpen(o => !o)} className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><DumbbellIcon size={18} color="var(--text-secondary)" /></span>
              <div className="text-left">
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Dashboard Sections</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>
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
                      style={{ background: isHidden ? 'var(--border-faint)' : 'var(--input-bg)', opacity: isHidden ? 0.5 : 1 }}
                    >
                      <SectionIcon sectionKey={key} size={18} color="var(--text-secondary)" />
                      <span className="flex-1 font-medium text-sm" style={{ color: isHidden ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{def.label}</span>
                      <button onClick={() => moveSection(key, -1)} disabled={idx === 0} className="w-7 h-7 rounded flex items-center justify-center text-sm" style={{ color: idx === 0 ? 'var(--text-dim)' : 'var(--text-muted)', background: 'var(--input-bg)' }}>↑</button>
                      <button onClick={() => moveSection(key, 1)} disabled={idx === sectionOrder.length - 1} className="w-7 h-7 rounded flex items-center justify-center text-sm" style={{ color: idx === sectionOrder.length - 1 ? 'var(--text-dim)' : 'var(--text-muted)', background: 'var(--input-bg)' }}>↓</button>
                      <button onClick={() => toggleHidden(key)} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: isHidden ? 'var(--border-faint)' : 'var(--border)' }}>
                        {isHidden ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  )
                })}
              </div>
              <button onClick={resetSections} className="w-full py-2 rounded-lg text-xs" style={{ color: 'var(--text-muted)', background: 'var(--input-bg)', border: '1px solid var(--border-faint)' }}>
                Reset to default order
              </button>
            </div>
          )}
        </Card>

        {/* ── Sound card ────────────────────────────────────────────── */}
        <Card className="mb-2">
          <button onClick={() => setSoundOpen(o => !o)} className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><ActivityIcon size={18} color="var(--text-secondary)" /></span>
              <div className="text-left">
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Sound</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>
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
                <div key={row.label} className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid var(--border-faint)' }}>
                  <div className="flex items-center gap-3">
                    <span style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{row.icon}</span>
                    <div>
                      <p style={{ color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 500 }}>{row.label}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{row.sub}</p>
                    </div>
                  </div>
                  <Toggle value={row.value} onToggle={row.toggle} />
                </div>
              ))}

              {/* Volume */}
              <div className="flex items-center gap-3 py-2.5" style={{ borderTop: '1px solid var(--border-faint)' }}>
                <span style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ActivityIcon size={16} color="var(--text-tertiary)" /></span>
                <div className="flex-1">
                  <p style={{ color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 500, marginBottom: 4 }}>Volume</p>
                  <input
                    type="range" min={0} max={1} step={0.01} value={volume}
                    onChange={e => { const v = parseFloat(e.target.value); setVolumeState(v); setAmbientVolume(v) }}
                    style={{
                      width: '100%',
                      background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${volume * 100}%, var(--surface-2) ${volume * 100}%, var(--surface-2) 100%)`,
                    }}
                  />
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 28, textAlign: 'right' }}>{Math.round(volume * 100)}%</span>
              </div>

              {/* Scene picker */}
              <div style={{ borderTop: '1px solid var(--border-faint)', paddingTop: 12 }}>
                <p className="text-xs uppercase tracking-widest font-mono mb-2" style={{ color: 'var(--text-muted)' }}>Atmosphere</p>
                <div className="flex flex-col gap-1.5">
                  {AMBIENT_SCENES.map(scene => {
                    const isActive = activeScene === scene.id
                    return (
                      <button
                        key={scene.id}
                        onClick={() => { setActiveScene(scene.id); setAmbientSceneId(scene.id, ambient) }}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left"
                        style={{
                          background: isActive ? 'var(--border)' : 'var(--input-bg)',
                          border: isActive ? '1px solid var(--accent)' : '1px solid var(--border-faint)',
                        }}
                      >
                        <span style={{ flexShrink: 0, minWidth: 36, display: 'flex', justifyContent: 'center' }}>
                          <AmbientSceneIcon id={scene.id} size={16} color="var(--accent)" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 600 }}>{scene.name}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{scene.description}</p>
                        </div>
                        {isActive && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, animation: ambient ? 'glowPulse 2s ease-in-out infinite' : 'none' }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ── Notifications card ───────────────────────────────────── */}
        {notificationsSupported() && (
          <Card className="mb-2">
            <button onClick={() => setNotifOpen(o => !o)} className="w-full flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><BellIcon size={18} color="var(--text-secondary)" /></span>
                <div className="text-left">
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Reminders</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {notifEnabled && notifPerm
                      ? `Daily reminder at ${notifTime}`
                      : notifEnabled && !notifPerm
                      ? 'Permission needed — tap to fix'
                      : 'Off'}
                  </p>
                </div>
              </div>
              <Chevron open={notifOpen} />
            </button>

            {notifOpen && (
              <div className="pb-1 pop-in">
                {/* Enable toggle */}
                <div className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid var(--border-faint)' }}>
                  <div className="flex items-center gap-3">
                    <span style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BellIcon size={16} color="var(--accent)" /></span>
                    <div>
                      <p style={{ color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 500 }}>Daily log reminder</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Reminds you when you open the app near your chosen time</p>
                    </div>
                  </div>
                  <Toggle
                    value={notifEnabled}
                    onToggle={async () => {
                      if (!notifEnabled) {
                        const perm = await requestPermission()
                        const granted = perm === 'granted'
                        setNotifPerm(granted)
                        if (!granted) {
                          // Show friendly message but still save intent
                          setNotifEnabled(true)
                          saveNotifPrefs({ enabled: true, time: notifTime })
                          return
                        }
                      }
                      const next = !notifEnabled
                      setNotifEnabled(next)
                      saveNotifPrefs({ enabled: next, time: notifTime })
                    }}
                  />
                </div>

                {/* Permission warning */}
                {notifEnabled && !notifPerm && (
                  <div className="pop-in" style={{
                    margin: '0 0 8px', padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)',
                  }}>
                    <p style={{ color: 'var(--accent)', fontSize: 12, lineHeight: 1.5 }}>
                      Notification permission was denied. To enable reminders, allow notifications for this site in your browser settings, then toggle back on.
                    </p>
                  </div>
                )}

                {/* Time picker */}
                {notifEnabled && (
                  <div className="flex items-center justify-between py-2.5 pop-in" style={{ borderTop: '1px solid var(--border-faint)' }}>
                    <div className="flex items-center gap-3">
                      <span style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CalendarIcon size={16} color="var(--text-muted)" /></span>
                      <div>
                        <p style={{ color: "var(--text-primary)", fontSize: "0.875rem", fontWeight: 500 }}>Reminder time</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Open the app within 5 min to trigger it</p>
                      </div>
                    </div>
                    <input
                      type="time"
                      value={notifTime}
                      onChange={e => {
                        setNotifTime(e.target.value)
                        saveNotifPrefs({ enabled: notifEnabled, time: e.target.value })
                      }}
                      style={{
                        padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: 'var(--input-bg)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', outline: 'none', flexShrink: 0,
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* ── XP Rates card ─────────────────────────────────────────── */}
        <Card className="mb-2">
          <button onClick={() => setXpOpen(o => !o)} className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><ActivityIcon size={18} color="var(--text-secondary)" /></span>
              <div className="text-left">
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>XP Rates</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>How XP is earned per activity</p>
              </div>
            </div>
            <Chevron open={xpOpen} />
          </button>
          {xpOpen && (
            <div className="pb-1 pop-in">
              {XP_BREAKDOWN.map(r => (
                <div key={r.label} className="flex items-center justify-between py-2" style={{ borderTop: '1px solid var(--border-faint)' }}>
                  <div className="flex items-center gap-2">
                    <span>{r.icon}</span>
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  </div>
                  <span className="font-bold" style={{ color: 'var(--accent)', fontSize: 13 }}>{r.xp}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Privacy card ─────────────────────────────────────────── */}
        <Card className="mb-2">
          <button
            onClick={async () => {
              if (!privacyOpen && isOnLeaderboard === null) {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                  const { data } = await supabase
                    .from('public_profiles')
                    .select('is_public')
                    .eq('user_id', user.id)
                    .maybeSingle()
                  setIsOnLeaderboard(data?.is_public ?? false)
                }
              }
              setPrivacyOpen(o => !o)
            }}
            className="w-full flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-3">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}>
                <ShieldIcon size={18} color="var(--text-secondary)" />
              </span>
              <div className="text-left">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Privacy</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Leaderboard · data visibility</p>
              </div>
            </div>
            <Chevron open={privacyOpen} />
          </button>

          {privacyOpen && (
            <div className="pb-1 pop-in">
              {/* Leaderboard visibility */}
              <div className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid var(--border-faint)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Global leaderboard</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {isOnLeaderboard
                      ? 'Your display name and XP are visible to other users.'
                      : 'You are not listed publicly.'}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return
                    const next = !isOnLeaderboard
                    await supabase
                      .from('public_profiles')
                      .update({ is_public: next })
                      .eq('user_id', user.id)
                    setIsOnLeaderboard(next)
                  }}
                  style={{
                    width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', flexShrink: 0,
                    background: isOnLeaderboard ? 'var(--accent)' : 'var(--input-bg)',
                    position: 'relative', transition: 'background 0.2s ease',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: isOnLeaderboard ? 21 : 3,
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>

              {/* What's always private */}
              <div className="py-2.5" style={{ borderTop: '1px solid var(--border-faint)' }}>
                <p className="text-xs font-bold mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Always private</p>
                {[
                  'Workout logs & personal records',
                  'Sleep, mood & water data',
                  'Goals & challenges',
                  'Game stats & scores',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 mb-1.5">
                    <ShieldIcon size={12} color="var(--text-muted)" />
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item}</p>
                  </div>
                ))}
              </div>

              {/* Link to full leaderboard settings */}
              <div className="py-2" style={{ borderTop: '1px solid var(--border-faint)' }}>
                <button
                  onClick={() => { window.location.href = '/leaderboard' }}
                  style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Manage display name & leaderboard profile →
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* ── Data & account card ───────────────────────────────────── */}
        <Card className="mb-2">
          <button onClick={() => setDataOpen(o => !o)} className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><DotsIcon size={18} color="var(--text-secondary)" /></span>
              <div className="text-left">
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Data & Account</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Export, delete · YouXP</p>
              </div>
            </div>
            <Chevron open={dataOpen} />
          </button>
          {dataOpen && (
            <div className="pb-1 pop-in">
              <div
                className="flex items-center justify-between py-2.5 cursor-pointer"
                style={{ borderTop: '1px solid var(--border-faint)' }}
                onClick={!exporting ? handleExportCSV : undefined}
              >
                <div className="flex items-center gap-3">
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><ShareIcon size={16} color="var(--text-muted)" /></span>
                  <span style={{ color: "var(--text-primary)", fontSize: "0.875rem" }}>{exporting ? 'Exporting...' : 'Export data as CSV'}</span>
                </div>
                <span style={{ color: 'var(--text-muted)' }}>›</span>
              </div>

              <div
                className="flex items-center justify-between py-2.5 cursor-pointer"
                style={{ borderTop: '1px solid var(--border-faint)' }}
                onClick={() => { resetTutorial(); window.dispatchEvent(new Event('tutorial-reset')) }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><GamepadIcon size={16} color="var(--text-muted)" /></span>
                  <span style={{ color: "var(--text-primary)", fontSize: "0.875rem" }}>Restart app tutorial</span>
                </div>
                <span style={{ color: 'var(--text-muted)' }}>›</span>
              </div>

              {deleteStep === 'idle' ? (
                <div
                  className="flex items-center justify-between py-2.5 cursor-pointer"
                  style={{ borderTop: '1px solid var(--border-faint)' }}
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser()
                    setAccountEmail(user?.email ?? '')
                    setDeleteEmailInput('')
                    setDeleteStep('confirm')
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><TrashIcon size={16} color="#E94560" /></span>
                    <span style={{ color: 'var(--red)', fontSize: 14 }}>Delete account &amp; all data</span>
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>›</span>
                </div>
              ) : deleteStep === 'confirm' ? (
                <div className="py-3" style={{ borderTop: '1px solid var(--border-faint)' }}>
                  <p className="text-sm mb-1 font-bold" style={{ color: 'var(--red)' }}>Permanently delete your account?</p>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>All workouts, logs, XP, and settings will be erased forever. This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteStep('idle')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => setDeleteStep('type-email')} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'color-mix(in srgb, var(--red) 15%, transparent)', color: 'var(--red)', border: '1px solid color-mix(in srgb, var(--red) 35%, transparent)', cursor: 'pointer' }}>
                      Continue
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-3" style={{ borderTop: '1px solid var(--border-faint)' }}>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    Type your account email to confirm:
                  </p>
                  <input
                    type="email"
                    value={deleteEmailInput}
                    onChange={e => setDeleteEmailInput(e.target.value)}
                    placeholder={accountEmail || 'your@email.com'}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 10,
                      background: 'var(--input-bg)', border: '1px solid var(--border)',
                      color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteStep('idle')} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>Cancel</button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteEmailInput.toLowerCase() !== accountEmail.toLowerCase()}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                      style={{
                        background: 'color-mix(in srgb, var(--red) 15%, transparent)',
                        color: 'var(--red)',
                        border: '1px solid color-mix(in srgb, var(--red) 35%, transparent)',
                        cursor: deleting || deleteEmailInput.toLowerCase() !== accountEmail.toLowerCase() ? 'not-allowed' : 'pointer',
                        opacity: deleteEmailInput.toLowerCase() !== accountEmail.toLowerCase() ? 0.5 : 1,
                      }}
                    >
                      {deleting ? 'Deleting…' : 'Delete forever'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ── Version history card ─────────────────────────────────── */}
        <Card className="mb-2">
          <button onClick={() => setChangelogOpen(o => !o)} className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><StarIcon size={18} color="var(--text-secondary)" /></span>
              <div className="text-left">
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Version History</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{CURRENT_VERSION} · {CHANGELOG.length} releases</p>
              </div>
            </div>
            <Chevron open={changelogOpen} />
          </button>
          {changelogOpen && (
            <div className="pb-2 pop-in" style={{ borderTop: '1px solid var(--border-faint)', paddingTop: 12 }}>
              {CHANGELOG.map((entry, idx) => (
                <div key={entry.version} style={{
                  marginBottom: idx < CHANGELOG.length - 1 ? 16 : 0,
                  paddingLeft: 12,
                  borderLeft: idx === 0
                    ? '2px solid var(--accent)'
                    : '2px solid var(--border-subtle)',
                }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: idx === 0 ? 'var(--accent)' : 'var(--text-primary)',
                      letterSpacing: '0.02em',
                    }}>{entry.version}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                      background: idx === 0
                        ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
                        : 'var(--surface-2)',
                      color: idx === 0 ? 'var(--accent)' : 'var(--text-muted)',
                      textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                    }}>{entry.label}</span>
                    {idx === 0 && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                        background: 'var(--accent)', color: 'var(--base-bg)',
                        textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                      }}>Current</span>
                    )}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {entry.items.map(item => (
                      <li key={item} className="flex items-start gap-1.5 mb-0.5">
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 1.5, flexShrink: 0 }}>·</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Legal ─────────────────────────────────────────────────── */}
        <div className="flex justify-center gap-6 mt-4 mb-2">
          <button
            onClick={() => navigate('/terms')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <ShieldIcon size={13} color="var(--text-muted)" />
            Terms of Service
          </button>
          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>·</span>
          <button
            onClick={() => navigate('/privacy')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <ShieldIcon size={13} color="var(--text-muted)" />
            Privacy Policy
          </button>
        </div>

        {/* ── Sign out ──────────────────────────────────────────────── */}
        <button onClick={logout} className="w-full py-3.5 rounded-xl font-semibold mt-2" style={{ background: 'color-mix(in srgb, var(--red) 10%, transparent)', color: 'var(--red)', border: '1px solid color-mix(in srgb, var(--red) 25%, transparent)' }}>
          Sign Out
        </button>

      </PageWrapper>
    </>
  )
}
