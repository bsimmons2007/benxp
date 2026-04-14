import { useEffect, useRef, useState } from 'react'
import { playXPGain, playPR } from '../../lib/sounds'

interface ToastProps {
  message:   string
  onDone:    () => void
  onUndo?:   () => void
  duration?: number        // ms before auto-dismiss (default 2800, or 4500 with undo)
}

export function Toast({ message, onDone, onUndo, duration }: ToastProps) {
  const ms      = duration ?? (onUndo ? 4500 : 2800)
  const [vis, setVis] = useState(true)
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (message.includes('PR') || message.includes('🎉')) playPR()
    else if (message.includes('XP')) playXPGain()

    timerRef.current = setTimeout(() => {
      setVis(false)
      setTimeout(onDone, 280)
    }, ms)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [onDone, ms])   // eslint-disable-line react-hooks/exhaustive-deps

  function handleUndo() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVis(false)
    setTimeout(() => { onUndo?.(); onDone() }, 50)
  }

  return (
    <div
      className="fixed left-1/2 z-50 overflow-hidden rounded-xl shadow-xl transition-all duration-280"
      style={{
        bottom: 88,
        transform: `translateX(-50%) translateY(${vis ? 0 : 12}px)`,
        opacity: vis ? 1 : 0,
        background: 'var(--accent)',
        color: 'var(--base-bg)',
        minWidth: 220,
        maxWidth: 'calc(100vw - 40px)',
      }}
    >
      {/* Message row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex-1 font-semibold text-sm leading-tight">{message}</span>

        {onUndo && (
          <button
            onClick={handleUndo}
            className="shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition-opacity"
            style={{ background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
          >
            Undo
          </button>
        )}
      </div>

      {/* Countdown drain bar */}
      <div style={{ height: 3, background: 'rgba(0,0,0,0.15)' }}>
        <div
          style={{
            height: '100%',
            background: 'rgba(0,0,0,0.3)',
            animationName: 'toastDrain',
            animationDuration: `${ms}ms`,
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards',
          }}
        />
      </div>
    </div>
  )
}
