import { useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { getLevelTitle } from '../../lib/xp'
import { playLevelUp } from '../../lib/sounds'

export function LevelUpOverlay() {
  const { levelUpPending, dismissLevelUp } = useStore()

  useEffect(() => {
    if (!levelUpPending) return
    playLevelUp()
    const t = setTimeout(dismissLevelUp, 4000)
    return () => clearTimeout(t)
  }, [levelUpPending, dismissLevelUp])

  if (!levelUpPending) return null

  const title = getLevelTitle(levelUpPending)

  return (
    <div
      onClick={dismissLevelUp}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(123,47,190,0.35) 0%, rgba(13,13,26,0.97) 70%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        cursor: 'pointer',
      }}
    >
      {/* Particle ring */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 6, height: 6,
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 12px var(--accent)',
              transform: `rotate(${i * 30}deg) translateX(120px)`,
              animation: `particleBurst 0.8s cubic-bezier(0.22,1,0.36,1) both`,
              animationDelay: `${i * 0.04}s`,
            }}
          />
        ))}
      </div>

      {/* Glow ring */}
      <div style={{
        width: 200, height: 200, borderRadius: '50%',
        border: '2px solid var(--accent)',
        boxShadow: '0 0 60px var(--accent), 0 0 120px rgba(245,166,35,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        position: 'relative',
        marginBottom: 24,
      }}>
        <div style={{
          position: 'absolute', inset: -8, borderRadius: '50%',
          border: '1px solid rgba(245,166,35,0.3)',
          animation: 'borderGlow 1.5s ease-in-out infinite',
        }} />
        <span style={{
          fontSize: 80, fontWeight: 900, fontFamily: 'Cinzel, serif',
          color: 'var(--accent)',
          textShadow: '0 0 40px var(--accent), 0 0 80px rgba(245,166,35,0.5)',
          animation: 'glowPulse 2s ease-in-out infinite',
          lineHeight: 1,
        }}>
          {levelUpPending}
        </span>
      </div>

      <p style={{
        fontSize: 13, fontWeight: 700, letterSpacing: '0.25em',
        color: 'var(--accent)', textTransform: 'uppercase',
        fontFamily: 'Cormorant Garamond, serif',
        animation: 'fadeInUp 0.5s 0.2s ease both',
        marginBottom: 8,
      }}>
        Level Up
      </p>

      <p style={{
        fontSize: 28, fontWeight: 700, letterSpacing: '0.1em',
        color: '#ffffff',
        fontFamily: 'Cinzel, serif',
        textShadow: '0 0 20px rgba(255,255,255,0.4)',
        animation: 'fadeInUp 0.5s 0.3s ease both',
        marginBottom: 32,
      }}>
        {title}
      </p>

      <p style={{
        fontSize: 11, color: '#666', letterSpacing: '0.08em',
        animation: 'fadeInUp 0.5s 0.6s ease both',
      }}>
        Tap to continue
      </p>

      <style>{`
        @keyframes particleBurst {
          from { opacity: 0; transform: rotate(var(--r, 0deg)) translateX(40px) scale(0); }
          to   { opacity: 1; transform: rotate(var(--r, 0deg)) translateX(120px) scale(1); }
        }
      `}</style>
    </div>
  )
}
