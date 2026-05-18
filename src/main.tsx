import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import '@fontsource-variable/inter/index.css'
import './index.css'
import App from './App.tsx'

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
    <App />
    <SpeedInsights />
    <Analytics />
  </StrictMode>,
)
