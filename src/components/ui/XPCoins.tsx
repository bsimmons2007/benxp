import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'

function coinCount(xp: number) {
  return Math.min(10, Math.max(2, Math.round(xp / 20)))
}

export function XPCoins({ xp }: { xp: number }) {
  const ref   = useRef<HTMLDivElement>(null)
  const count = coinCount(xp)

  useEffect(() => {
    if (!ref.current) return
    const coins = Array.from(ref.current.children) as HTMLElement[]
    animate(coins, {
      translateY: [0, -12, -140],
      scale:      [0.2, 1.3, 0.7],
      opacity:    [0, 1, 0],
      duration:   950,
      delay:      stagger(65, { from: 'center' }),
      ease:       'outCubic',
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', bottom: 106, left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none', zIndex: 201,
        display: 'flex', gap: 5,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 32%, #ffe066, #f5a623 60%, #d97706)',
            border: '1.5px solid #f5a623',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 7, fontWeight: 900, color: '#78350f',
            boxShadow: '0 2px 8px rgba(245,166,35,0.45)',
            flexShrink: 0, userSelect: 'none',
          }}
        >
          XP
        </div>
      ))}
    </div>
  )
}
