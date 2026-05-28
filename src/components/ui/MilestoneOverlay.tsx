import { useEffect, useRef, useState } from 'react'
import type { StrengthMilestone } from '../../lib/xp'
import { FlameIcon } from './Icon'
import { Confetti } from './Confetti'
import { Wordmark } from '../brand/Wordmark'

interface Props {
  milestone: StrengthMilestone
  liftName:  string
  onDismiss: () => void
}

const MILESTONE_DURATION = 5200

export function MilestoneOverlay({ milestone, liftName, onDismiss }: Props) {
  const [visible,      setVisible]      = useState(false)
  const [showConfetti, setShowConfetti] = useState(true)
  const drainDuration  = useRef(MILESTONE_DURATION)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 30)
    const t2 = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 380)
    }, MILESTONE_DURATION)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDismiss])

  function dismiss() {
    setVisible(false)
    setTimeout(onDismiss, 320)
  }

  return (
    <>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {/* Mode-aware scrim */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'color-mix(in srgb, var(--surface-0) 65%, transparent)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          transition: 'opacity 0.35s ease',
          opacity: visible ? 1 : 0,
          padding: '0 28px',
        }}
      >
        {/* Card */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative',
            background: 'var(--surface-1)',
            border: '1px solid color-mix(in srgb, var(--accent) 55%, transparent)',
            borderRadius: 28,
            padding: '0 0 28px',
            textAlign: 'center',
            maxWidth: 330,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 0 60px color-mix(in srgb, var(--accent) 22%, transparent), 0 24px 60px rgba(0,0,0,0.28)',
            transition: 'transform 0.42s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
            transform: visible ? 'scale(1) translateY(0)' : 'scale(0.84) translateY(24px)',
          }}
        >
          {/* Accent top strip */}
          <div style={{
            height: 4,
            background: `linear-gradient(90deg, color-mix(in srgb, var(--accent) 40%, transparent), var(--accent), color-mix(in srgb, var(--accent) 40%, transparent))`,
          }} />

          {/* Wordmark header */}
          <div style={{
            paddingTop: 22, paddingBottom: 16,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <Wordmark size={18} color="var(--text-tertiary)" accent="var(--accent)" showPulse={false} />
            <p style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: 'var(--accent)',
              marginTop: 6,
            }}>
              Milestone Unlocked
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '24px 28px 0' }}>
            {/* Icon orb */}
            <div style={{
              width: 88, height: 88, borderRadius: '50%', margin: '0 auto 20px',
              background: 'color-mix(in srgb, var(--accent) 12%, var(--surface-2))',
              border: '2px solid color-mix(in srgb, var(--accent) 45%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 42, lineHeight: 1,
              boxShadow: '0 0 28px color-mix(in srgb, var(--accent) 25%, transparent)',
              animation: 'bossTrophyIn 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.15s both',
            }}>
              {milestone.icon}
            </div>

            {/* Name */}
            <p style={{
              fontSize: 27, fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 6, letterSpacing: '0.03em',
              lineHeight: 1.15,
            }}>
              {milestone.name}
            </p>

            {/* Lift + weight */}
            <p style={{
              fontSize: 13, fontWeight: 700,
              color: 'var(--accent)',
              marginBottom: 12, fontFamily: 'var(--font-mono)',
            }}>
              {liftName} · {milestone.threshold}+ lbs
            </p>

            {/* Description */}
            <p style={{
              fontSize: 13, color: 'var(--text-secondary)',
              lineHeight: 1.65, marginBottom: 22,
            }}>
              {milestone.desc}
            </p>

            {/* CTA button */}
            <button
              onClick={dismiss}
              style={{
                width: '100%', padding: '13px 0',
                borderRadius: 14,
                background: 'var(--accent)',
                color: 'var(--surface-0)',
                fontWeight: 700, fontSize: 14,
                letterSpacing: '0.04em',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: '0 4px 20px color-mix(in srgb, var(--accent) 40%, transparent)',
              }}
            >
              Let's Go <FlameIcon size={15} color="var(--surface-0)" />
            </button>
          </div>

          {/* Drain bar */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 3, background: 'var(--surface-2)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'var(--accent)',
              animationName: 'toastDrain',
              animationDuration: `${drainDuration.current}ms`,
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
            }} />
          </div>
        </div>
      </div>
    </>
  )
}
