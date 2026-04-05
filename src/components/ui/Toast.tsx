import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onDone: () => void
}

export function Toast({ message, onDone }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onDone, 300)
    }, 2500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all duration-300 z-50"
      style={{
        background: 'var(--accent)',
        color: 'var(--base-bg)',
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? 0 : 10}px)`,
      }}
    >
      {message}
    </div>
  )
}
