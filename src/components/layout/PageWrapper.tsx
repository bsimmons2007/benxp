import type { ReactNode } from 'react'

interface PageWrapperProps {
  children: ReactNode
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <main
      className="pb-36 px-4 min-h-screen fade-in"
      style={{ paddingTop: 80 }}
    >
      {children}
    </main>
  )
}
