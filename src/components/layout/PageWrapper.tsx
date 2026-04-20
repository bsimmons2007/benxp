import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

interface PageWrapperProps {
  children:   ReactNode
  noPadding?: boolean
}

export function PageWrapper({ children, noPadding = false }: PageWrapperProps) {
  const { pathname } = useLocation()

  return (
    <main
      key={pathname}
      className="page-main"
      style={{
        paddingTop:    'calc(72px + env(safe-area-inset-top))',
        paddingBottom: 'calc(110px + env(safe-area-inset-bottom))',
        paddingLeft:   noPadding ? 0 : 20,
        paddingRight:  noPadding ? 0 : 20,
        minHeight:     '100dvh',
        animation:     'pageEnter 0.24s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      {children}
    </main>
  )
}
