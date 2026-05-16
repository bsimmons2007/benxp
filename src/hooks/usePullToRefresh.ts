import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 64   // px pull needed to trigger refresh
const MAX_PULL  = 88   // px maximum visual pull distance

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [refreshing,   setRefreshing]   = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY      = useRef<number | null>(null)
  const pulling     = useRef(false)
  const pullDistRef = useRef(0)
  const refreshRef  = useRef(onRefresh)
  refreshRef.current = onRefresh

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 4) return          // only when at top of page
      startY.current = e.touches[0].clientY
      pulling.current = false
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null || refreshing) return
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0) {
        pulling.current = true
        const dist = Math.min(delta * 0.45, MAX_PULL)
        pullDistRef.current = dist
        setPullDistance(dist)
      }
    }

    async function onTouchEnd() {
      if (!pulling.current) { startY.current = null; return }
      const dist = pullDistRef.current  // read ref — never stale
      pullDistRef.current = 0
      startY.current = null
      setPullDistance(0)
      if (dist >= THRESHOLD && !refreshing) {
        setRefreshing(true)
        try {
          await refreshRef.current()
        } finally {
          setRefreshing(false)
        }
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: true })
    document.addEventListener('touchend',   onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
    }
  }, [refreshing])

  return { refreshing, pullDistance, threshold: THRESHOLD }
}
