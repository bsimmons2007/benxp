import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import { getLevelTitle } from '../../lib/xp'
import { playLevelUp } from '../../lib/sounds'
import { Confetti } from './Confetti'
import { animateLevelUpOverlay } from '../../lib/animations'

export function LevelUpOverlay() {
  const { levelUpPending, dismissLevelUp } = useStore()
  const [dismissing,   setDismissing]   = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const ringRef     = useRef<HTMLDivElement>(null)
  const levelNumRef = useRef<HTMLSpanElement>(null)
  const labelRef    = useRef<HTMLParagraphElement>(null)
  const titleRef    = useRef<HTMLParagraphElement>(null)
  const hintRef     = useRef<HTMLParagraphElement>(null)
  const particleRefs = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    if (!levelUpPending) return
    setDismissing(false)
    setShowConfetti(true)
    playLevelUp()

    // Small rAF delay so refs are populated before animating
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

    const t = setTimeout(handleDismiss, 4500)
    return () => clearTimeout(t)
  }, [levelUpPending]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!levelUpPending) return null

  const title = getLevelTitle(levelUpPending)

  function handleDismiss() {
    setDismissing(true)
    setTimeout(dismissLevelUp, 250)
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
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        {/* Particle ring */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              ref={el => { if (el) particleRefs.current[i] = el }}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: i % 3 === 0 ? 8 : 5,
                height: i % 3 === 0 ? 8 : 5,
                borderRadius: '50%',
                background: i % 2 === 0 ? 'var(--accent)' : 'var(--text-primary)',
                boxShadow: '0 0 10px var(--accent)',
                transform: `rotate(${i * (360 / 16)}deg) translateX(${100 + (i % 3) * 20}px)`,
                opacity: 0,
              }}
            />
          ))}
        </div>

        {/* Glow ring */}
        <div
          ref={ringRef}
          style={{
            width: 200, height: 200, borderRadius: '50%',
            border: '2px solid var(--accent)',
            boxShadow: '0 0 60px var(--accent), 0 0 120px rgba(245,166,35,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
            marginBottom: 24,
            opacity: 0,
          }}
        >
          <div style={{
            position: 'absolute', inset: -8, borderRadius: '50%',
            border: '1px solid rgba(245,166,35,0.3)',
            animation: 'borderGlow 1.5s ease-in-out infinite',
          }} />
          <span
            ref={levelNumRef}
            style={{
              fontSize: 80, fontWeight: 700,
              color: 'var(--accent)',
              textShadow: '0 0 40px var(--accent), 0 0 80px rgba(245,166,35,0.5)',
              animation: 'glowPulse 2s ease-in-out infinite',
              lineHeight: 1,
              opacity: 0,
            }}
          >
            {levelUpPending}
          </span>
        </div>

        <p
          ref={labelRef}
          style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '0.25em',
            color: 'var(--accent)', textTransform: 'uppercase',
            marginBottom: 8, opacity: 0,
          }}
        >
          Level Up
        </p>

        <p
          ref={titleRef}
          style={{
            fontSize: 28, fontWeight: 700, letterSpacing: '0.1em',
            color: 'var(--text-primary)',
            textShadow: '0 0 20px rgba(255,255,255,0.4)',
            marginBottom: 32, opacity: 0,
          }}
        >
          {title}
        </p>

        <p
          ref={hintRef}
          style={{
            fontSize: 11, color: '#666', letterSpacing: '0.08em',
            opacity: 0,
          }}
        >
          Tap to continue
        </p>
      </div>
    </>
  )
}
