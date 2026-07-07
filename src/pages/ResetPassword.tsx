// ResetPassword — handles the Supabase password-recovery redirect link.
// Supabase sends an email link → user clicks → lands here with the session
// already restored via the URL hash. We just show a "choose new password" form.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const INPUT: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 12,
  background: 'var(--input-bg)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', fontSize: 15, outline: 'none', transition: 'border-color 0.18s ease',
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
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    // Trust an existing session only when arriving via a recovery link (hash contains type=recovery)
    if (window.location.hash.includes('type=recovery')) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true)
      })
    }
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
      await supabase.auth.signOut({ scope: 'global' })
      setTimeout(() => navigate('/login'), 2000)
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
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
        }}
      >
        <h2 style={{ color: 'var(--text-primary)', fontSize: 19, fontWeight: 700, marginBottom: 6 }}>
          Set New Password
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
          Choose a strong password for your account.
        </p>

        {!ready && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
            Verifying reset link…
          </p>
        )}

        {ready && status !== 'done' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* New password */}
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
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
                  onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: showPass ? 'var(--accent)' : 'var(--text-muted)', fontSize: 15, padding: 3,
                  }}
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
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
                onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Error banner */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', borderRadius: 10,
                background: 'color-mix(in srgb, var(--red) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--red) 22%, transparent)',
              }}>
                <span style={{ fontSize: 14 }}>⚠</span>
                <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 13, border: 'none',
                background: 'var(--accent)', color: 'var(--base-bg)', fontSize: 14, fontWeight: 700,
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
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16,
              background: 'color-mix(in srgb, var(--green) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)',
              margin: '0 auto 12px',
            }}>
              <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l5 5 9-9" /></svg>
            </div>
            <p style={{ color: 'var(--green)', fontWeight: 700, fontSize: 15 }}>
              Password updated!
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>
              Redirecting you home…
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
