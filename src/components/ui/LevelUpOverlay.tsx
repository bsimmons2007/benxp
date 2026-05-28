import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { getLevelTitle } from '../../lib/xp'
import { playLevelUp } from '../../lib/sounds'
import { Confetti } from './Confetti'
import { Wordmark } from '../brand/Wordmark'
import { animateLevelUpOverlay } from '../../lib/animations'

export function LevelUpOverlay() {
  const { levelUpPending, dismissLevelUp } = useStore()
  const [dismissing,   setDismissing]   = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const ringRef      = useRef<HTMLDivElement>(null)
  const levelNumRef  = useRef<HTMLSpanElement>(null)
  const labelRef     = useRef<HTMLParagraphElement>(null)
  const titleRef     = useRef<HTMLParagraphElement>(null)
  const hintRef      = useRef<HTMLParagraphElement>(null)
  const particleRefs = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    if (!levelUpPending) return
    setDismissing(false)
    setShowConfetti(true)
    playLevelUp()

    requestAnimationFrame(() => {
      if (
        ringRef.current && levelNumRef.current &&
        labelRef.current && titleRef.current && hintRef.current
      ) {
        animateLevelUpOverlay({
          ring:      ringRef.current,
          levelNum:  levelNumRef.current,
          particles: particleRefs.current.filter(Boolean),
          label:     labelRef.current,
          title:     titleRef.current,
          hint:      hintRef.current,
        })
      }
    })

    const t = setTimeout(handleDismiss, 4800)
    return () => clearTimeout(t)
  }, [levelUpPending]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!levelUpPending) return null

  const title = getLevelTitle(levelUpPending)

  function handleDismiss() {
    setDismissing(true)
    setTimeout(dismissLevelUp, 260)
  }

  return (
    <>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      <div
        onClick={handleDismiss}
        className="level-up-bg"
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          opacity:   dismissing ? 0 : 1,
          transform: dismissing ? 'scale(1.03)' : 'scale(1)',
          transition: 'opacity 0.26s ease, transform 0.26s ease',
        }}
      >
        {/* YouXP wordmark — brand stamp at top */}
        <div style={{
          position: 'absolute', top: 48,
          opacity: 0.7,
          animation: 'bossTextIn 0.6s ease 0.1s both',
        }}>
          <Wordmark size={22} color="var(--text-secondary)" accent="var(--accent)" showPulse />
        </div>

        {/* Particle ring — same refs, animejs drives them */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              ref={el => { if (el) particleRefs.current[i] = el }}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width:  i % 3 === 0 ? 9 : 6,
                height: i % 3 === 0 ? 9 : 6,
                borderRadius: '50%',
                background: i % 2 === 0 ? 'var(--accent)' : 'var(--text-primary)',
                boxShadow: `0 0 12px var(--accent)`,
                transform: `rotate(${i * (360 / 18)}deg) translateX(${110 + (i % 4) * 22}px)`,
                opacity: 0,
              }}
            />
          ))}
        </div>

        {/* Glow ring — borderGlow now defined in CSS */}
        <div
          ref={ringRef}
          style={{
            width: 216, height: 216, borderRadius: '50%',
            border: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            marginBottom: 28,
            opacity: 0,
            animation: 'borderGlow 2s ease-in-out 1.2s infinite',
          }}
        >
          {/* Outer breathing ring */}
          <div style={{
            position: 'absolute', inset: -10, borderRadius: '50%',
            border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
            animation: 'borderGlow 2.4s ease-in-out 1.6s infinite',
          }} />

          <span
            ref={levelNumRef}
            style={{
              fontSize: 88, fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent)',
              lineHeight: 1,
              opacity: 0,
              animation: 'glowPulse 2.2s ease-in-out 1.2s infinite',
            }}
          >
            {levelUpPending}
          </span>
        </div>

        {/* LEVEL UP label */}
        <p
          ref={labelRef}
          style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.3em',
            color: 'var(--accent)', textTransform: 'uppercase',
            marginBottom: 10, opacity: 0,
            textShadow: '0 0 20px color-mix(in srgb, var(--accent) 70%, transparent)',
          }}
        >
          Level Up
        </p>

        {/* Level title */}
        <p
          ref={titleRef}
          style={{
            fontSize: 30, fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '0.06em',
            marginBottom: 36,
            opacity: 0,
            textShadow: '0 2px 30px color-mix(in srgb, var(--accent) 35%, transparent)',
          }}
        >
          {title}
        </p>

        {/* Hint */}
        <p
          ref={hintRef}
          style={{
            fontSize: 11, color: 'var(--text-tertiary)',
            letterSpacing: '0.08em', opacity: 0,
          }}
        >
          Tap to continue
        </p>

        {/* "level up your life" tagline at bottom */}
        <p style={{
          position: 'absolute', bottom: 44,
          fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          animation: 'bossTextIn 0.5s ease 2.2s both',
          opacity: 0,
        }}>
          level up your life
        </p>
      </div>
    </>
  )
}
