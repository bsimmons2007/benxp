import { useEffect, useState } from 'react'
import type { StrengthMilestone } from '../../lib/xp'
import { TrophyIcon, FlameIcon } from './Icon'

interface Props {
  milestone: StrengthMilestone
  liftName:  string
  onDismiss: () => void
}

export function MilestoneOverlay({ milestone, liftName, onDismiss }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Pop in on next frame
    const t1 = setTimeout(() => setVisible(true), 30)
    // Auto-dismiss after 5s
    const t2 = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 400)
    }, 5000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDismiss])

  function dismiss() {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(10px)',
        transition: 'opacity 0.35s ease',
        opacity: visible ? 1 : 0,
        padding: '0 32px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(18,18,32,0.98) 0%, rgba(10,10,22,0.99) 100%)',
          border: '1px solid var(--accent)',
          borderRadius: 24,
          padding: '36px 32px',
          textAlign: 'center',
          maxWidth: 320,
          width: '100%',
          boxShadow: '0 0 60px var(--accent-dim), 0 24px 64px rgba(0,0,0,0.8)',
          transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.82) translateY(20px)',
        }}
      >
        {/* Milestone tag */}
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--accent)', marginBottom: 14, fontFamily: 'Cinzel, serif',
        }}>
          <TrophyIcon size={11} color="var(--accent)" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }} />Milestone Unlocked
        </p>

        {/* Icon */}
        <div style={{
          fontSize: 72, lineHeight: 1, marginBottom: 16,
          filter: 'drop-shadow(0 0 24px var(--accent))',
          animation: 'numberPop 0.5s ease 0.2s both',
        }}>
          {milestone.icon}
        </div>

        {/* Name */}
        <p style={{
          fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 6,
          fontFamily: 'Cinzel, serif', letterSpacing: '0.04em',
          textShadow: '0 0 30px var(--accent)',
        }}>
          {milestone.name}
        </p>

        {/* Lift + threshold */}
        <p style={{
          fontSize: 14, color: 'var(--accent)', fontWeight: 700, marginBottom: 10,
          fontFamily: 'Cinzel, serif',
        }}>
          {liftName} · {milestone.threshold}+
        </p>

        {/* Description */}
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 24 }}>
          {milestone.desc}
        </p>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 12,
            background: 'var(--accent)', color: 'var(--base-bg)',
            fontWeight: 700, fontSize: 14, fontFamily: 'Cinzel, serif',
            letterSpacing: '0.04em', border: 'none', cursor: 'pointer',
            boxShadow: '0 0 20px var(--accent-dim)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>Let's Go <FlameIcon size={15} color="var(--base-bg)" /></span>
        </button>

        {/* Drain bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: '0 0 24px 24px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: 'var(--accent)',
            animationName: 'toastDrain', animationDuration: '5000ms',
            animationTimingFunction: 'linear', animationFillMode: 'forwards',
          }} />
        </div>
      </div>
    </div>
  )
}
