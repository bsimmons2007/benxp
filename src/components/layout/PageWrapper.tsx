import { useLocation } from 'react-router-dom'
import { useEffect, useRef, type ReactNode } from 'react'
import { animatePageEnter } from '../../lib/animations'

interface PageWrapperProps {
  children:   ReactNode
  noPadding?: boolean
}

export function PageWrapper({ children, noPadding = false }: PageWrapperProps) {
  const { pathname } = useLocation()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) animatePageEnter(containerRef.current)
  }, [pathname])

  return (
    <main
      className="page-main"
      style={{
        paddingTop:    'calc(72px + env(safe-area-inset-top))',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
        paddingLeft:   noPadding ? 0 : 20,
        paddingRight:  noPadding ? 0 : 20,
        minHeight:     '100dvh',
      }}
    >
      <div key={pathname} ref={containerRef}>
        {children}
      </div>
    </main>
  )
}
