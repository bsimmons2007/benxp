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
      style={{
        paddingTop:    60,
        paddingBottom: 100,
        paddingLeft:   noPadding ? 0 : 16,
        paddingRight:  noPadding ? 0 : 16,
        minHeight:     '100vh',
        animation:     'pageEnter 0.24s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      {children}
    </main>
  )
}
