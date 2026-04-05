import type { ReactNode } from 'react'

interface PageWrapperProps {
  children: ReactNode
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <main
      className="px-4 min-h-screen fade-in"
      style={{ paddingTop: 80, paddingBottom: 120 }}
    >
      {children}
    </main>
  )
}
