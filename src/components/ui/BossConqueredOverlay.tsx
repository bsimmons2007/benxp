import { useEffect, useState } from 'react'
import { TrophyIcon, ZapIcon } from './Icon'
import { playBossConquered } from '../../lib/sounds'
import { Confetti } from './Confetti'

const BOSS_COLOR    = '#f5a623'
const PARTICLE_COUNT = 28

export function BossConqueredOverlay({
  bossName,
  xp,
  nextName,
  onDone,
}: {
  bossName: string
  xp:       number
  nextName: string
  onDone:   () => void
}) {
  const [dismissing,   setDismissing]   = useState(false)
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    playBossConquered()
    const t = setTimeout(handleDismiss, 5800)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDismiss() {
    setDismissing(true)
    setTimeout(onDone, 380)
  }

  return (
    <>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'radial-gradient(ellipse at 50% 38%, #1c0d00 0%, #0c0500 50%, #000 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          opacity:   dismissing ? 0 : 1,
          transform: dismissing ? 'scale(1.04)' : 'scale(1)',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
        }}
      >
        {/* Gold particle burst */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
            const angle = (i / PARTICLE_COUNT) * 360
            const size  = i % 5 === 0 ? 11 : i % 3 === 0 ? 7 : 5
            const delay = (i % 7) * 0.05
            const dist  = 100 + (i % 6) * 35
            const color = i % 4 === 0 ? '#fff8e1' : i % 4 === 1 ? '#ffd54f' : i % 4 === 2 ? BOSS_COLOR : '#ffecb3'
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: '40%', left: '50%',
                  width: size, height: size,
                  borderRadius: i % 6 === 0 ? 3 : '50%',
                  background: color,
                  boxShadow: `0 0 ${size * 2}px ${color}`,
                  animation: `bossParticle 1.6s cubic-bezier(0.2,0.6,0.4,1) ${delay}s both`,
                  '--a': `${angle}deg`,
                  '--d': `${dist}px`,
                } as React.CSSProperties}
              />
            )
          })}
        </div>

        {/* Trophy ring */}
        <div style={{
          width: 168, height: 168, borderRadius: '50%',
          border: `2px solid ${BOSS_COLOR}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          marginBottom: 30,
          animation: 'bossTrophyIn 0.75s cubic-bezier(0.34,1.56,0.64,1) 0.15s both, bossGlowPulse 2.4s ease-in-out 1s infinite',
        }}>
          {/* Outer breathing ring */}
          <div style={{
            position: 'absolute', inset: -10, borderRadius: '50%',
            border: `1px solid ${BOSS_COLOR}33`,
          }} />
          <div style={{
            position: 'absolute', inset: -22, borderRadius: '50%',
            border: `1px solid ${BOSS_COLOR}18`,
          }} />

          <TrophyIcon
            size={76}
            color={BOSS_COLOR}
            style={{ filter: `drop-shadow(0 0 18px ${BOSS_COLOR}) drop-shadow(0 0 40px ${BOSS_COLOR}88)` }}
          />
        </div>

        {/* BOSS CONQUERED label */}
        <p style={{
          fontSize: 11, fontWeight: 800,
          color: BOSS_COLOR,
          textTransform: 'uppercase',
          letterSpacing: '0.32em',
          marginBottom: 14,
          textShadow: `0 0 24px ${BOSS_COLOR}99`,
          animation: 'bossLabelIn 0.6s ease 0.85s both',
        }}>
          Boss Conquered
        </p>

        {/* Boss name */}
        <p style={{
          fontSize: 23, fontWeight: 700,
          color: '#fff',
          textAlign: 'center', lineHeight: 1.25,
          maxWidth: 290,
          marginBottom: 18,
          textShadow: `0 2px 24px ${BOSS_COLOR}44`,
          animation: 'bossTextIn 0.5s ease 1.05s both',
        }}>
          {bossName}
        </p>

        {/* XP badge */}
        <div style={{
          background: `linear-gradient(135deg, ${BOSS_COLOR}28, ${BOSS_COLOR}12)`,
          border: `1px solid ${BOSS_COLOR}55`,
          borderRadius: 14, padding: '9px 22px',
          marginBottom: 22,
          animation: 'bossTextIn 0.5s ease 1.25s both',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22,
            color: BOSS_COLOR,
            textShadow: `0 0 18px ${BOSS_COLOR}`,
          }}>
            +{xp} XP
          </span>
        </div>

        {/* Next tier unlock teaser */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '7px 14px',
          maxWidth: 290,
          marginBottom: 32,
          animation: 'bossTextIn 0.5s ease 1.45s both',
        }}>
          <ZapIcon size={12} color={BOSS_COLOR} style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.3 }}>
            Next: <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{nextName}</span>
          </p>
        </div>

        {/* Tap hint */}
        <p style={{
          fontSize: 11, color: 'rgba(255,255,255,0.28)',
          letterSpacing: '0.08em',
          animation: 'bossTextIn 0.5s ease 2s both',
        }}>
          Tap to continue
        </p>
      </div>
    </>
  )
}
