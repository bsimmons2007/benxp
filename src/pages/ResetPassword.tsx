// ResetPassword — handles the Supabase password-recovery redirect link.
// Supabase sends an email link → user clicks → lands here with the session
// already restored via the URL hash. We just show a "choose new password" form.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const INPUT: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 12,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
  color: '#fff', fontSize: 15, outline: 'none', transition: 'border-color 0.18s ease',
  boxSizing: 'border-box',
}

export function ResetPassword() {
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [status,     setStatus]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error,      setError]      = useState<string | null>(null)
  const [ready,      setReady]      = useState(false)   // session from recovery link is live
  const navigate = useNavigate()

  // Supabase fires SIGNED_IN + PASSWORD_RECOVERY when the magic link is followed
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
    // Also check if we already have an active session (user opened the link in same browser)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setStatus('loading')
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) {
      setError(updateErr.message)
      setStatus('error')
    } else {
      setStatus('done')
      setTimeout(() => navigate('/'), 2000)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--base-bg)' }}
    >
      <div
        className="fade-in w-full"
        style={{
          maxWidth: 380, borderRadius: 20, padding: '30px 28px',
          background: 'rgba(13,17,40,0.88)', backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        }}
      >
        <h2 style={{ color: '#e0e0e0', fontFamily: 'Cinzel, serif', fontSize: 19, fontWeight: 700, marginBottom: 6 }}>
          Set New Password
        </h2>
        <p style={{ color: '#555', fontSize: 13, marginBottom: 24 }}>
          Choose a strong password for your account.
        </p>

        {!ready && (
          <p style={{ color: '#555', fontSize: 13, textAlign: 'center' }}>
            Verifying reset link…
          </p>
        )}

        {ready && status !== 'done' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* New password */}
            <div>
              <label style={{ display: 'block', color: '#777', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{ ...INPUT, paddingRight: 46 }}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: showPass ? 'var(--accent)' : '#555', fontSize: 15, padding: 3,
                  }}
                >
                  {showPass ? '👁' : '🙈'}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label style={{ display: 'block', color: '#777', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                Confirm Password
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                style={INPUT}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
              />
            </div>

            {/* Error banner */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', borderRadius: 10,
                background: 'rgba(233,69,96,0.10)', border: '1px solid rgba(233,69,96,0.22)',
              }}>
                <span style={{ fontSize: 14 }}>⚠</span>
                <p style={{ color: '#E94560', fontSize: 13, margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 13, border: 'none',
                background: 'var(--accent)', color: '#1A1A2E',
                fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700,
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                opacity: status === 'loading' ? 0.75 : 1,
                boxShadow: '0 4px 24px var(--accent-dim)',
              }}
            >
              {status === 'loading' ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}

        {status === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', margin: '0 auto 12px' }}>
              <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="#2ECC71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l5 5 9-9" /></svg>
            </div>
            <p style={{ color: '#4caf50', fontWeight: 700, fontSize: 15, fontFamily: 'Cinzel, serif' }}>
              Password updated!
            </p>
            <p style={{ color: '#555', fontSize: 13, marginTop: 6 }}>
              Redirecting you home…
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
