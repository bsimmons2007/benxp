import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code  = params.get('code')
    const error = params.get('error')

    if (error) {
      navigate(`/login?error=${encodeURIComponent(params.get('error_description') ?? error)}`, { replace: true })
      return
    }

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error: e }) => {
          if (e) navigate('/login?error=signin_failed', { replace: true })
          else    navigate('/', { replace: true })
        })
        .catch(() => navigate('/login?error=signin_failed', { replace: true }))
    } else {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: 'var(--base-bg)',
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Signing you in…</p>
    </div>
  )
}
