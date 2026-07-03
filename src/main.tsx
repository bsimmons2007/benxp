import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initSentry } from './lib/sentry'
import { seedPrefsFromLegacy, hydratePrefs } from './lib/prefs'

initSentry()

// Migrate existing youxp-* prefs into the prefs doc synchronously (so theme /
// stat picks read seeded values on first paint), then pull the server doc.
seedPrefsFromLegacy()
void hydratePrefs()

// Auto-reload on stale chunk errors (old bundle hash after a new deploy)
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

// Strip non-numeric characters (keep digits, minus, dot) when pasting into number inputs
document.addEventListener('paste', (e) => {
  const target = e.target as HTMLInputElement
  if (target.tagName !== 'INPUT' || target.type !== 'number') return
  const text = e.clipboardData?.getData('text') ?? ''
  const cleaned = text.replace(/[^0-9.\-]/g, '')
  if (cleaned !== text) {
    e.preventDefault()
    const start = target.selectionStart ?? 0
    const end   = target.selectionEnd   ?? 0
    const current = target.value
    target.value = current.slice(0, start) + cleaned + current.slice(end)
    target.dispatchEvent(new Event('input', { bubbles: true }))
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <SpeedInsights />
      <Analytics />
    </ErrorBoundary>
  </StrictMode>,
)
