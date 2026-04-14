import { useState } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { DumbbellIcon, BookIcon, RunIcon, MoonIcon, SwordIcon, BrainIcon, GamepadIcon, TargetIcon } from '../components/ui/Icon'

interface AuthForm {
  name:     string
  email:    string
  password: string
}

const FEATURES: { icon: ReactNode; label: string }[] = [
  { icon: <DumbbellIcon size={16} color="var(--accent)" />, label: 'Strength & PRs'  },
  { icon: <BookIcon     size={16} color="var(--accent)" />, label: 'Book Log'         },
  { icon: <RunIcon      size={16} color="var(--accent)" />, label: 'Cardio Miles'     },
  { icon: <MoonIcon     size={16} color="var(--accent)" />, label: 'Sleep Score'      },
  { icon: <SwordIcon    size={16} color="var(--accent)" />, label: 'Daily Quests'     },
  { icon: <BrainIcon    size={16} color="var(--accent)" />, label: 'Mood Tracking'    },
  { icon: <GamepadIcon  size={16} color="var(--accent)" />, label: 'Gaming Stats'     },
  { icon: <TargetIcon   size={16} color="var(--accent)" />, label: 'Goal Setting'     },
]

const INPUT_BASE: React.CSSProperties = {
  width:        '100%',
  padding:      '12px 16px',
  borderRadius: 12,
  background:   'rgba(255,255,255,0.05)',
  border:       '1px solid rgba(255,255,255,0.10)',
  color:        '#fff',
  fontSize:     15,
  outline:      'none',
  transition:   'border-color 0.18s ease',
  boxSizing:    'border-box',
}

export function Login() {
  const [mode,     setMode]     = useState<'login' | 'signup'>('login')
  const [error,    setError]    = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)
  const { register, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm<AuthForm>()
  const navigate  = useNavigate()
  const resetStore = useStore(s => s.reset)

  const onSubmit = async (data: AuthForm) => {
    setError(null)
    // Sign out any active session first so a different account's data never bleeds through
    await supabase.auth.signOut()
    resetStore()

    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
        : await supabase.auth.signUp({
            email: data.email, password: data.password,
            options: { data: { name: data.name.trim() } },
          })
    if (error) setError(error.message)
    else navigate('/')
  }

  function switchMode(next: 'login' | 'signup') {
    setMode(next)
    setError(null)
    setShowPass(false)
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--base-bg)' }}>

      {/* ── Left hero panel — desktop only ── */}
      <div
        className="hidden md:flex flex-col justify-between"
        style={{
          width:        '52%',
          minHeight:    '100vh',
          padding:      '52px 56px',
          position:     'relative',
          overflow:     'hidden',
          borderRight:  '1px solid rgba(255,255,255,0.05)',
          background:   'linear-gradient(155deg, rgba(22,18,48,0.95) 0%, rgba(8,10,22,1) 100%)',
        }}
      >
        {/* Ambient orbs */}
        <div className="orb-float" style={{ position: 'absolute', top: -120, right: -80, width: 440, height: 440, borderRadius: '50%', background: 'var(--orb1)', filter: 'blur(110px)', opacity: 0.3 }} />
        <div className="orb-float" style={{ position: 'absolute', bottom: -100, left: -60, width: 320, height: 320, borderRadius: '50%', background: 'var(--orb2)', filter: 'blur(90px)', opacity: 0.22, animationDelay: '3s' }} />

        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 40%, transparent 100%)',
        }} />

        {/* Brand */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1
            className="glow-pulse"
            style={{
              color: 'var(--accent)', fontFamily: 'Cinzel, serif',
              fontSize: 48, fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1, marginBottom: 10,
            }}
          >
            YouXP
          </h1>
          <p style={{ color: '#555', fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'Cormorant Garamond, serif' }}>
            Your life. Gamified.
          </p>
        </div>

        {/* Feature grid + quote */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#3a3a5a', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 18 }}>
            Everything you track
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px', marginBottom: 28 }}>
            {FEATURES.map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>{f.icon}</span>
                <span style={{ color: '#666', fontSize: 13 }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div style={{
            padding: '14px 18px', borderRadius: 12,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <p style={{ color: '#444', fontSize: 13, fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>
              "Every rep. Every mile. Every page.{' '}
              <span style={{ color: 'var(--accent)', fontWeight: 600, fontStyle: 'normal' }}>All XP.</span>"
            </p>
          </div>
        </div>

        {/* Level 1 teaser */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(245,166,35,0.08)',
            border: '1px solid rgba(245,166,35,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700 }}>1</span>
          </div>
          <div>
            <p style={{ color: '#888', fontSize: 13, fontWeight: 600, margin: 0 }}>Start at Level 1 · Newcomer</p>
            <p style={{ color: '#444', fontSize: 12, margin: '3px 0 0' }}>Earn XP with every single activity you log</p>
          </div>
        </div>
      </div>

      {/* ── Right: auth form ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden"
        style={{ minHeight: '100vh' }}
      >
        {/* Mobile-only orbs */}
        <div className="md:hidden orb-float" style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'var(--orb1)', filter: 'blur(60px)', opacity: 0.5 }} />
        <div className="md:hidden orb-float" style={{ position: 'absolute', bottom: -60, right: -60, width: 250, height: 250, borderRadius: '50%', background: 'var(--orb2)', filter: 'blur(50px)', opacity: 0.4, animationDelay: '2s' }} />

        <div className="relative z-10 w-full" style={{ maxWidth: 380 }}>

          {/* Mobile-only logo */}
          <div className="md:hidden text-center mb-8">
            <h1 className="glow-pulse" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif', fontSize: 44, fontWeight: 900 }}>
              YouXP
            </h1>
            <p style={{ color: '#666', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 6, fontFamily: 'Cormorant Garamond, serif' }}>
              Your life. Gamified.
            </p>
          </div>

          {/* Card */}
          <div
            className="fade-in"
            style={{
              borderRadius: 20, padding: '30px 28px',
              background:           'rgba(13,17,40,0.88)',
              backdropFilter:       'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border:     '1px solid rgba(255,255,255,0.08)',
              boxShadow:  '0 24px 64px rgba(0,0,0,0.55)',
            }}
          >
            {/* Heading */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ color: '#e0e0e0', fontFamily: 'Cinzel, serif', fontSize: 19, fontWeight: 700, margin: '0 0 5px' }}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p style={{ color: '#555', fontSize: 13, margin: 0 }}>
                {mode === 'login'
                  ? 'Sign in to continue your grind'
                  : 'Start earning XP for everything you do'}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Name — animates in for signup */}
              <div style={{
                overflow:   'hidden',
                maxHeight:  mode === 'signup' ? 72 : 0,
                opacity:    mode === 'signup' ? 1 : 0,
                transition: 'max-height 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
              }}>
                <FieldLabel>Your Name</FieldLabel>
                <input
                  type="text"
                  placeholder="Ben"
                  {...register('name', { required: mode === 'signup', maxLength: 64 })}
                  style={INPUT_BASE}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
              </div>

              {/* Email */}
              <div>
                <FieldLabel>Email</FieldLabel>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register('email', { required: true })}
                  style={INPUT_BASE}
                  onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
              </div>

              {/* Password with show/hide + forgot */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <FieldLabel style={{ marginBottom: 0 }}>Password</FieldLabel>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const email = watch('email')
                        if (!email) { setError('Enter your email first'); return }
                        const redirectTo = `${window.location.origin}/reset-password`
                        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
                        if (resetErr) { setError(resetErr.message); return }
                        setError(null)
                        alert('Check your email for a reset link!')
                      }}
                      style={{ background: 'none', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    {...register('password', { required: true, minLength: { value: 8, message: 'Password must be at least 8 characters' } })}
                    style={{ ...INPUT_BASE, paddingRight: 46 }}
                    onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    style={{
                      position:  'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: showPass ? 'var(--accent)' : '#555',
                      fontSize: 15, lineHeight: 1, padding: 3,
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {showPass ? '👁' : '🙈'}
                  </button>
                </div>
              </div>

              {/* Error banner */}
              {(error || errors.password) && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(233,69,96,0.10)',
                  border: '1px solid rgba(233,69,96,0.22)',
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
                  <p style={{ color: '#E94560', fontSize: 13, margin: 0 }}>
                    {errors.password?.message ?? error}
                  </p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%', padding: '13px 0', marginTop: 2, borderRadius: 13, border: 'none',
                  background: 'var(--accent)', color: '#1A1A2E',
                  fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 700, letterSpacing: '0.04em',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.75 : 1,
                  boxShadow: isSubmitting ? 'none' : '0 4px 24px var(--accent-dim)',
                  transition: 'opacity 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (!isSubmitting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 28px var(--accent-dim)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px var(--accent-dim)' }}
              >
                {isSubmitting
                  ? <><span className="spin" style={{ fontSize: 15, marginRight: 2 }}>⟳</span>Loading…</>
                  : mode === 'login' ? 'Sign In' : 'Create Account'
                }
              </button>
            </form>

            {/* Mode switch */}
            <p style={{ textAlign: 'center', marginTop: 22, color: '#555', fontSize: 13 }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'var(--accent)', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Small helper to keep label style DRY ──────────────────────────────────────

function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{
      display: 'block', color: '#777', fontSize: 11,
      fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', marginBottom: 6,
      ...style,
    }}>
      {children}
    </label>
  )
}
