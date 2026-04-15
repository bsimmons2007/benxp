import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — YouXP` : 'YouXP'
    return () => { document.title = 'YouXP' }
  }, [title])
}
