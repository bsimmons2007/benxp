import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '../components/layout/PageWrapper'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <PageWrapper>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '60dvh', gap: 16, textAlign: 'center', padding: '0 24px',
      }}>
        <p style={{ fontSize: 64, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>404</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Page not found</p>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          This page doesn't exist or was moved.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 8, padding: '10px 24px', borderRadius: 'var(--radius-lg)',
            background: 'var(--accent)', color: 'var(--base-bg)',
            fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
          }}
        >
          Go home
        </button>
      </div>
    </PageWrapper>
  )
}
