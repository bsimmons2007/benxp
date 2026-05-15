import { useEffect, useRef } from 'react'

const COLORS = ['#F5A623', '#4ade80', '#818cf8', '#f472b6', '#34d399', '#fbbf24', '#60a5fa']
const COUNT  = 60

interface Particle {
  x: number; y: number
  vx: number; vy: number
  color: string
  rotation: number
  rotSpeed: number
  size: number
  opacity: number
}

export function Confetti({ onDone }: { onDone?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x:        canvas.width  * (0.3 + Math.random() * 0.4),
      y:        canvas.height * 0.35,
      vx:       (Math.random() - 0.5) * 9,
      vy:       -(Math.random() * 8 + 4),
      color:    COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.25,
      size:     5 + Math.random() * 5,
      opacity:  1,
    }))

    let frame: number
    let startTime: number | null = null
    const DURATION = 2200

    function draw(ts: number) {
      if (!startTime) startTime = ts
      const elapsed = ts - startTime

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      for (const p of particles) {
        p.vy    += 0.22
        p.x     += p.vx
        p.y     += p.vy
        p.vx    *= 0.98
        p.rotation += p.rotSpeed
        p.opacity = Math.max(0, 1 - elapsed / DURATION)

        ctx!.save()
        ctx!.globalAlpha = p.opacity
        ctx!.translate(p.x, p.y)
        ctx!.rotate(p.rotation)
        ctx!.fillStyle = p.color
        ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx!.restore()
      }

      if (elapsed < DURATION) {
        frame = requestAnimationFrame(draw)
      } else {
        onDone?.()
      }
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [onDone])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        pointerEvents: 'none',
      }}
    />
  )
}
