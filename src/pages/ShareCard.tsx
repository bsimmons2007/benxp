import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { useStore } from '../store/useStore'
import { useXP } from '../hooks/useXP'
import { useAchievements } from '../hooks/useAchievements'
import type { Badge } from '../hooks/useAchievements'
import { useSkills } from '../hooks/useSkills'
import { getLevelTitle, xpForLevel } from '../lib/xp'
import { toRoman } from '../lib/utils'
import { getPref } from '../lib/prefs'
import {
  SectionIcon, StarIcon, ZapIcon, FlameIcon, TrophyIcon, CheckIcon,
  SwordIcon, DumbbellIcon, SkateIcon, BookIcon, GamepadIcon, MoonIcon,
  BrainIcon, TargetIcon, CalendarIcon, ActivityIcon,
} from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

function badgeIconSm(badge: Badge, accentColor: string): ReactNode {
  const { id, category } = badge
  const s = 16
  const c = accentColor
  if (
    id === 'xp_25000' || id === 'level_20' || id === 'level_50' || id === 'level_100' ||
    id === 'challenges_10' || id === 'challenges_25' ||
    id === 'lift_days_100' || id === 'lift_first_pr' || id === 'lift_10_prs' || id === 'lift_all_three' ||
    id === 'vol_500k' || id === 'vol_1m' ||
    id === 'bench_315' || id === 'bench_405' || id === 'squat_405' || id === 'squat_495' ||
    id === 'dl_500' || id === 'dl_600' || id === 'pullup_20' || id === 'pushup_100' ||
    id === 'skate_100_miles' || id === 'skate_500_miles' ||
    id === 'fn_first_win' || id === 'fn_5_wins' || id === 'fn_100_wins'
  ) return <TrophyIcon size={s} color={c} />
  if (id === 'xp_1000' || id === 'xp_5000' || id === 'lift_streak_7' || id === 'lift_streak_14' || id === 'squat_225' || id === 'pushup_50')
    return <FlameIcon size={s} color={c} />
  if (id === 'xp_500' || id === 'level_5' || id === 'fn_10_kills_game' || id === 'skate_50_sessions')
    return <ZapIcon size={s} color={c} />
  if (id === 'challenges_1') return <CheckIcon size={s} color={c} />
  if (id === 'level_10' || id === 'lift_25_prs' || id === 'fn_25_wins' || id === 'fn_accuracy_30')
    return <TargetIcon size={s} color={c} />
  if (id === 'lift_days_10' || id === 'lift_days_30') return <CalendarIcon size={s} color={c} />
  if (id.startsWith('vol_') || id.startsWith('pullup_') || id.startsWith('pushup_'))
    return <ActivityIcon size={s} color={c} />
  if (id === 'fn_100_kills' || id === 'fn_500_kills') return <SwordIcon size={s} color={c} />
  if (id === 'fn_50_wins') return <GamepadIcon size={s} color={c} />
  if (id === 'book_25' || id === 'book_50') return <BrainIcon size={s} color={c} />
  if (id === 'first_login' || id === 'xp_10000' || id === 'sleep_30_nights' || id === 'sleep_perfect_5')
    return <StarIcon size={s} color={c} />
  switch (category) {
    case 'lifting':    return <DumbbellIcon size={s} color={c} />
    case 'skate':      return <SkateIcon    size={s} color={c} />
    case 'books':      return <BookIcon     size={s} color={c} />
    case 'fortnite':   return <GamepadIcon  size={s} color={c} />
    case 'sleep':      return <MoonIcon     size={s} color={c} />
    case 'challenges': return <SwordIcon    size={s} color={c} />
    default:           return <StarIcon     size={s} color={c} />
  }
}

// Fixed brand palette — hardcoded because html2canvas exports don't reliably
// resolve CSS custom properties, and the card should always render on-brand
// regardless of the viewer's active in-app theme.
const CARD_CORAL   = '#e5443f'
const CARD_PAPER   = '#f3efe6'
const CARD_INK     = '#0d0d1a'
const CARD_SURFACE = '#ffffff'
const CARD_RAISED  = '#ede8df'
const CARD_BORDER  = 'rgba(13,13,26,0.10)'
const CARD_TEXT_2  = '#6e6e73'
const CARD_TEXT_3  = '#aeaeb2'
const CARD_FONT_SANS = '"Space Grotesk", system-ui, sans-serif'
const CARD_FONT_MONO = '"JetBrains Mono", "Cascadia Code", monospace'

// XP-only pulse path, mirrors components/brand/Wordmark.tsx (replicated inline
// so it survives html2canvas export without depending on that component tree)
const WORDMARK_PULSE_PATH = 'M 0 11 L 192 11 L 204 11 L 214 4 L 224 18 L 234 0 L 244 22 L 254 11 L 320 11'

function CardWordmark() {
  return (
    <span style={{ display: 'inline-block', lineHeight: 1 }}>
      <span style={{
        display: 'block', fontFamily: CARD_FONT_SANS, fontWeight: 700,
        fontSize: 20, letterSpacing: '-0.08em', lineHeight: 0.9, color: CARD_INK,
      }}>
        you<span style={{ color: CARD_CORAL }}>xp</span>
      </span>
      <svg width="70" height="5" viewBox="0 -2 320 28" preserveAspectRatio="none" style={{ display: 'block', marginTop: 2 }}>
        <path d={WORDMARK_PULSE_PATH} stroke={CARD_CORAL} strokeWidth={3} fill="none" strokeLinejoin="miter" strokeLinecap="square" />
      </svg>
    </span>
  )
}

// ── The card itself — rendered as a fixed-size div for screenshotting
function Card() {
  const { totalXP, level, progress } = useXP()
  const userName  = useStore(s => s.userName)
  const stats     = useStore(s => s.stats)
  const { earned } = useAchievements()
  const { skills } = useSkills()
  const title     = getLevelTitle(level)
  const levelStyle = getPref<'number' | 'roman'>('levelStyle', 'number')
  const displayLevel = levelStyle === 'roman' ? toRoman(level) : String(level)
  const toNext    = xpForLevel(level + 1) - totalXP
  const pct       = Math.min(Math.max(progress * 100, 0), 100)

  // top 6 earned badges
  const topBadges = earned.slice(0, 6)

  // top 3 skills by level
  const topSkills = [...skills].sort((a, b) => b.level - a.level).slice(0, 3)

  return (
    <div style={{
      width: 360,
      background: CARD_PAPER,
      borderRadius: 24,
      padding: 28,
      border: `1px solid ${CARD_BORDER}`,
      fontFamily: CARD_FONT_SANS,
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <CardWordmark />
          <p style={{ color: CARD_INK, fontSize: 16, fontWeight: 700, margin: '8px 0 0' }}>{userName || 'Player'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: CARD_CORAL, fontSize: 36, fontWeight: 700, lineHeight: 1, margin: 0 }}>{displayLevel}</p>
          <p style={{ color: CARD_CORAL, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: CARD_FONT_MONO, margin: 0 }}>{title}</p>
        </div>
      </div>

      {/* XP bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ color: CARD_TEXT_2, fontSize: 10, fontFamily: CARD_FONT_MONO }}>{totalXP.toLocaleString()} XP</span>
          <span style={{ color: CARD_CORAL, fontSize: 10, fontFamily: CARD_FONT_MONO }}>{toNext.toLocaleString()} to next</span>
        </div>
        <div style={{ height: 8, background: CARD_RAISED, borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: CARD_CORAL }} />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        {[
          stats.benchPR    ? { label: 'Bench',  value: `${stats.benchPR.toFixed(0)}` }    : null,
          stats.squatPR    ? { label: 'Squat',  value: `${stats.squatPR.toFixed(0)}` }    : null,
          stats.deadliftPR ? { label: 'Deadlift', value: `${stats.deadliftPR.toFixed(0)}` } : null,
          stats.totalMiles ? { label: 'Miles',  value: stats.totalMiles.toFixed(1) }      : null,
          stats.winCount   ? { label: 'FN Wins', value: String(stats.winCount) }           : null,
          stats.booksThisYear  ? { label: 'Books',  value: String(stats.booksThisYear) }           : null,
        ].filter(Boolean).slice(0, 6).map((s, i) => s && (
          <div key={i} style={{
            background: CARD_SURFACE,
            borderRadius: 10, padding: '8px 10px',
            border: `1px solid ${CARD_BORDER}`,
          }}>
            <p style={{ color: CARD_CORAL, fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1, fontFamily: CARD_FONT_MONO }}>{s.value}</p>
            <p style={{ color: CARD_TEXT_3, fontSize: 9, margin: '3px 0 0', textTransform: 'uppercase', fontFamily: CARD_FONT_MONO, letterSpacing: '0.06em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Top skills */}
      {topSkills.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: CARD_TEXT_3, fontSize: 9, textTransform: 'uppercase', fontFamily: CARD_FONT_MONO, letterSpacing: '0.15em', marginBottom: 8, fontWeight: 700 }}>Skill Mastery</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topSkills.map(s => {
              const pctS = Math.min(Math.max(s.progress * 100, 0), 100)
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SectionIcon
                      sectionKey={s.key === 'sports' ? 'basketball' : s.key === 'reading' ? 'books' : s.key === 'sleep' ? 'sleep' : s.key === 'cardio' ? 'cardio' : s.key}
                      size={14}
                      color={CARD_CORAL}
                    />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ color: CARD_TEXT_2, fontSize: 10 }}>{s.title}</span>
                      <span style={{ color: CARD_CORAL, fontSize: 10, fontWeight: 700, fontFamily: CARD_FONT_MONO }}>Lvl {s.level}</span>
                    </div>
                    <div style={{ height: 4, background: CARD_RAISED, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pctS}%`, background: CARD_CORAL, borderRadius: 999 }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Badges */}
      {topBadges.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: CARD_TEXT_3, fontSize: 9, textTransform: 'uppercase', fontFamily: CARD_FONT_MONO, letterSpacing: '0.15em', marginBottom: 8, fontWeight: 700 }}>Badges</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {topBadges.map(b => (
              <div key={b.id} style={{
                width: 36, height: 36, borderRadius: 9,
                background: CARD_SURFACE,
                border: `1px solid ${CARD_BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {badgeIconSm(b, CARD_CORAL)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: `1px solid ${CARD_BORDER}` }}>
        <p style={{ color: CARD_TEXT_3, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: CARD_FONT_MONO, margin: 0 }}>you-xp.com</p>
        <p style={{ color: CARD_TEXT_3, fontSize: 9, margin: 0, fontFamily: CARD_FONT_MONO }}>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
      </div>
    </div>
  )
}

// ── Share page ────────────────────────────────────────────────
export function ShareCard() {
  usePageTitle('Share Card')
  const cardRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [hint, setHint]     = useState(false)

  // Show screenshot hint after 1s on mount
  useEffect(() => {
    const t = setTimeout(() => setHint(true), 800)
    return () => clearTimeout(t)
  }, [])

  async function copyToClipboard() {
    try {
      const { default: html2canvas } = await import('html2canvas')
      if (!cardRef.current) return
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2, useCORS: true })
      canvas.toBlob(async blob => {
        if (!blob) return
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setCopied(true)
          setTimeout(() => setCopied(false), 2500)
        } catch {
          const url = URL.createObjectURL(blob)
          const a   = document.createElement('a')
          a.href     = url
          a.download = 'youxp-card.png'
          a.click()
          URL.revokeObjectURL(url)
        }
      })
    } catch {
      setHint(true)
    }
  }

  return (
    <>
      <TopBar title="Share" />
      <PageWrapper>
        <p className="section-label text-center mb-6" style={{ letterSpacing: '0.1em' }}>
          Your Progress Card
        </p>

        {/* Card preview — centered */}
        <div className="flex justify-center mb-6">
          <div ref={cardRef}>
            <Card />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 px-4">
          <button
            onClick={copyToClipboard}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            style={{
              background: copied ? 'var(--green)' : 'var(--accent)',
              color: 'var(--base-bg)',
              border: 'none', cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
          >
            {copied && <CheckIcon size={16} color="var(--base-bg)" />}
            {copied ? 'Copied to Clipboard!' : 'Copy as Image'}
          </button>

          {hint && (
            <div className="rounded-xl px-4 py-3 text-center pop-in" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-faint)' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                Or take a screenshot of the card above to share directly.
              </p>
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  )
}
