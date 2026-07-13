import { useEffect, useRef, useMemo } from 'react'
import { animate } from 'animejs'

function coinCount(xp: number) {
  return Math.min(30, Math.max(8, Math.round(xp / 10)))
}

export function XPCoins({ xp }: { xp: number }) {
  const ref   = useRef<HTMLDivElement>(null)
  const count = coinCount(xp)

  // Stable random positions — generated once per mount
  const coinData = useMemo(() =>
    Array.from({ length: count }, () => ({
      left:     4 + Math.random() * 90,          // 4–94% across screen
      delay:    Math.random() * 750,              // 0–750ms stagger
      duration: 1300 + Math.random() * 900,       // 1.3–2.2s fall
      size:     0.7 + Math.random() * 0.6,        // 0.7–1.3× scale
    })),
   
  [count])

  useEffect(() => {
    if (!ref.current) return
    const els  = Array.from(ref.current.children) as HTMLElement[]
    const dist = window.innerHeight + 60

    els.forEach((el, i) => {
      const d = coinData[i]
      animate(el, {
        translateY: [0, dist],
        opacity:    [0, 1, 1, 0],
        scale:      [0.2, d.size, d.size],
        duration:   d.duration,
        delay:      d.delay,
        ease:       'linear',
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 201,
      }}
    >
      {coinData.map((coin, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${coin.left}%`,
            top: -28,
            width: 22, height: 22, borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 32%, #ffe066, #f5a623 60%, #d97706)',
            border: '1.5px solid #f5a623',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 7, fontWeight: 900, color: '#78350f',
            boxShadow: '0 2px 8px rgba(245,166,35,0.45)',
            flexShrink: 0, userSelect: 'none', opacity: 0,
          }}
        >
          XP
        </div>
      ))}
    </div>
  )
}
