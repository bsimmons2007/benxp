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
import { loadTheme } from '../lib/theme'
import {
  SectionIcon, StarIcon, ZapIcon, FlameIcon, TrophyIcon, CheckIcon,
  SwordIcon, DumbbellIcon, SkateIcon, BookIcon, GamepadIcon, MoonIcon,
  BrainIcon, TargetIcon, CalendarIcon, ActivityIcon,
} from '../components/ui/Icon'

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

// ── The card itself — rendered as a fixed-size div for screenshotting
function Card() {
  const { totalXP, level, progress } = useXP()
  const userName  = useStore(s => s.userName)
  const stats     = useStore(s => s.stats)
  const { earned } = useAchievements()
  const { skills } = useSkills()
  const theme     = loadTheme()
  const title     = getLevelTitle(level)
  const levelStyle = (localStorage.getItem('benxp-level-style') as 'number' | 'roman') ?? 'number'
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
      background: `linear-gradient(145deg, ${theme.bgDeep} 0%, ${theme.baseBg} 100%)`,
      borderRadius: 24,
      padding: 28,
      border: `1px solid ${theme.accent}44`,
      boxShadow: `0 0 60px ${theme.accent}22, 0 20px 60px rgba(0,0,0,0.6)`,
      fontFamily: 'system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: theme.orb1, top: -40, right: -40, filter: 'blur(50px)', opacity: 0.5, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: theme.orb2, bottom: -30, left: -30, filter: 'blur(40px)', opacity: 0.4, pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
        <div>
          <p style={{ color: theme.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 2 }}>YouXP</p>
          <p style={{ color: '#ffffff', fontSize: 18, fontWeight: 800, margin: 0 }}>{userName || 'Player'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: theme.accent, fontSize: 36, fontWeight: 900, lineHeight: 1, margin: 0, textShadow: `0 0 20px ${theme.accent}` }}>{displayLevel}</p>
          <p style={{ color: theme.accent, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85, margin: 0 }}>{title}</p>
        </div>
      </div>

      {/* XP bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ color: '#888', fontSize: 10 }}>{totalXP.toLocaleString()} XP</span>
          <span style={{ color: theme.accent, fontSize: 10 }}>{toNext.toLocaleString()} to next</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 999,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${theme.accent}88, ${theme.accent})`,
            boxShadow: `0 0 8px ${theme.accent}`,
          }} />
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
          stats.books2026  ? { label: 'Books',  value: String(stats.books2026) }           : null,
        ].filter(Boolean).slice(0, 6).map((s, i) => s && (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 10, padding: '8px 10px',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <p style={{ color: theme.accent, fontSize: 16, fontWeight: 800, margin: 0, lineHeight: 1 }}>{s.value}</p>
            <p style={{ color: '#888', fontSize: 9, margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Top skills */}
      {topSkills.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: '#666', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, fontWeight: 700 }}>Skill Mastery</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topSkills.map(s => {
              const pctS = Math.min(Math.max(s.progress * 100, 0), 100)
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SectionIcon
                      sectionKey={s.key === 'skating' ? 'skate' : s.key === 'reading' ? 'books' : s.key === 'sleep' ? 'sleep' : s.key === 'cardio' ? 'cardio' : s.key}
                      size={14}
                      color={theme.accent}
                    />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ color: '#ccc', fontSize: 10 }}>{s.title}</span>
                      <span style={{ color: theme.accent, fontSize: 10, fontWeight: 700 }}>Lvl {s.level}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pctS}%`, background: theme.accent, borderRadius: 999 }} />
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
          <p style={{ color: '#666', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8, fontWeight: 700 }}>Badges</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {topBadges.map(b => (
              <div key={b.id} style={{
                width: 36, height: 36, borderRadius: 9,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {badgeIconSm(b, theme.accent)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#444', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>youxp.app</p>
        <p style={{ color: '#444', fontSize: 9, margin: 0 }}>{new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
      </div>
    </div>
  )
}

// ── Share page ────────────────────────────────────────────────
export function ShareCard() {
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
        <p className="text-xs uppercase tracking-widest text-center mb-6" style={{ color: '#555' }}>
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
            className="w-full py-3 rounded-xl font-bold text-sm transition-all"
            style={{
              background: copied ? '#4ade80' : 'var(--accent)',
              color: 'var(--base-bg)',
              border: 'none', cursor: 'pointer',
              boxShadow: copied ? '0 0 20px #4ade8066' : '0 0 20px var(--accent-dim)',
              transition: 'all 0.2s ease',
            }}
          >
            {copied ? '✓ Copied to Clipboard!' : 'Copy as Image'}
          </button>

          {hint && (
            <div className="rounded-xl px-4 py-3 text-center pop-in" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ color: '#666', fontSize: 12 }}>
                Or take a screenshot of the card above to share directly.
              </p>
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  )
}
