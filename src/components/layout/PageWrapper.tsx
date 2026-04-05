import type { ReactNode } from 'react'

interface PageWrapperProps {
  children: ReactNode
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <main className="pt-14 pb-20 px-4 min-h-screen" style={{ background: '#1A1A2E' }}>
      {children}
    </main>
  )
}
