// Standalone /strength route — thin wrapper around StrengthTab.
// The main entry point is now the 💪 Strength Map tab inside /lifting.

import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'
import { StrengthTab } from '../components/StrengthTab'

export function Strength() {
  const navigate = useNavigate()
  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 flex items-center px-4 py-3 z-40"
        style={{ background: 'rgba(10,12,28,0.88)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <button onClick={() => navigate(-1)} className="mr-3 text-xl" style={{ color: 'var(--accent)' }}>←</button>
        <span className="text-2xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>Strength Map</span>
      </header>
      <PageWrapper>
        <StrengthTab triggerLoad={true} />
      </PageWrapper>
    </>
  )
}
