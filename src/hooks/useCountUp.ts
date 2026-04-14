import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from 0 (or previous value) to `target`.
 * - duration: ms for the full animation
 * - decimals: fixed decimal places for display
 * Returns the current display string.
 */
export function useCountUp(target: number, duration = 900, decimals = 0): string {
  const [display, setDisplay] = useState('0')
  const prevRef  = useRef(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === prevRef.current) return
    const from  = prevRef.current
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      // ease out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const current = from + (target - from) * eased
      setDisplay(current.toFixed(decimals))
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        prevRef.current = target
        setDisplay(target.toFixed(decimals))
      }
    }

    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(tick)

    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target, duration, decimals])

  return display
}
