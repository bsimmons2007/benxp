import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { DumbbellIcon, BookIcon, RunIcon, MoonIcon, SwordIcon, BrainIcon, GamepadIcon, TargetIcon } from '../components/ui/Icon'

interface AuthForm {
  name:     string
  email:    string
  password: string
  confirm:  string
}

// â"€â"€ Friendly Supabase error map â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials':             'Wrong email or password.',
  'Email not confirmed':                   'Check your inbox to confirm your email first.',
  'User already registered':               'An account with that email already exists.',
  'Password should be at least 6 characters': 'Password must be at least 8 characters.',
  'signup_disabled':                       'Sign-ups are currently disabled.',
  'invalid_credentials':                   'Wrong email or password.',
  'email_not_confirmed':                   'Check your inbox to confirm your email first.',
}

function friendlyError(msg: string): string {
  for (const [key, friendly] of Object.entries(ERROR_MAP)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return friendly
  }
  return msg
}

// â"€â"€ Demo XP feed events â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const DEMO_EVENTS = [
  { xp: '+60 XP', label: 'Gym day',         detail: '8 sets · chest & shoulders' },
  { xp: '+250 XP', label: 'New PR!',        detail: 'Bench press · 225 lbs'       },
  { xp: '+50 XP', label: 'Morning run',     detail: '3.1 miles · 28 min'          },
  { xp: '+250 XP', label: 'Book finished',  detail: 'Atomic Habits'               },
  { xp: '+30 XP', label: 'Sleep bonus',     detail: '8.5h logged · quality 9/10'  },
  { xp: '+100 XP', label: 'Fortnite win',   detail: '#1 · 7 kills'                },
]

// â"€â"€ Rotating quotes â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const QUOTES = [
  { text: 'Every rep. Every mile. Every page.', highlight: 'All XP.' },
  { text: 'Small logs compound.', highlight: 'Level up daily.' },
  { text: 'Track everything.', highlight: 'Miss nothing.' },
  { text: 'Your life is the game.', highlight: 'Play to win.' },
]

const FEATURES: { icon: ReactNode; label: string; sub: string }[] = [
  { icon: <DumbbellIcon size={20} color="var(--accent)" />, label: 'Strength & PRs',  sub: 'bench, squat, deadlift' },
  { icon: <BookIcon     size={20} color="var(--accent)" />, label: 'Book Log',         sub: 'genre, rating, series'  },
  { icon: <RunIcon      size={20} color="var(--accent)" />, label: 'Cardio Miles',     sub: 'run, bike, skate'       },
  { icon: <MoonIcon     size={20} color="var(--accent)" />, label: 'Sleep Score',      sub: 'debt, quality, streak'  },
  { icon: <SwordIcon    size={20} color="var(--accent)" />, label: 'Quests',           sub: 'weekly, monthly, boss'  },
  { icon: <BrainIcon    size={20} color="var(--accent)" />, label: 'Mood Tracking',    sub: 'score, tags, trends'    },
  { icon: <GamepadIcon  size={20} color="var(--accent)" />, label: 'Gaming Stats',     sub: 'wins, kills, rank'      },
  { icon: <TargetIcon   size={20} color="var(--accent)" />, label: 'Goal Setting',     sub: 'progress, reminders'    },
]

const LOGIN_HEADINGS = [
  'Welcome back.',
  'Welcome back, warrior.',
  'Ready to grind?',
  'Back at it.',
]

const INPUT_BASE: React.CSSProperties = {
  width:        '100%',
  padding:      '12px 16px',
  borderRadius: 12,
  background:   'var(--input-bg)',
  border:       '1px solid var(--border)',
  color:        'var(--text-primary)',
  fontSize:     15,
  outline:      'none',
  transition:   'border-color 0.18s ease, box-shadow 0.18s ease',
  boxSizing:    'border-box',
}

function inputFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--accent)'
  e.target.style.boxShadow   = '0 0 0 3px var(--accent-dim)'
}
function inputBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--border)'
  e.target.style.boxShadow   = 'none'
}

export function Login() {
  const [mode,        setMode]        = useState<'login' | 'signup'>('login')
  const [error,       setError]       = useState<string | null>(null)
  const [resetMsg,    setResetMsg]    = useState<string | null>(null)
  const [showPass,    setShowPass]    = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [capsLock,    setCapsLock]    = useState(false)
  const [quoteIdx,    setQuoteIdx]    = useState(0)
  const [quoteFade,   setQuoteFade]   = useState(true)
  const [headingIdx]                  = useState(() => Math.floor(Math.random() * LOGIN_HEADINGS.length))
  const [rememberMe,  setRememberMe]  = useState(() => localStorage.getItem('youxp-remember-me') !== 'false')
  const [success,     setSuccess]     = useState(false)
  const [modeKey,     setModeKey]     = useState(0)
  const [demoIdx,     setDemoIdx]     = useState(0)
  const [demoFade,    setDemoFade]    = useState(true)

  const emailRef    = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)

  const { register, handleSubmit, watch, setValue, setFocus, formState: { isSubmitting, errors } } = useForm<AuthForm>()
  const navigate   = useNavigate()
  const location   = useLocation()
  const resetStore = useStore(s => s.reset)

  // Pre-fill "password updated" message if redirected from reset flow
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('reset') === '1') setResetMsg('Password updated — sign back in.')
  }, [location.search])

  // Auto-focus email on desktop
  useEffect(() => {
    if (window.innerWidth >= 768) setTimeout(() => setFocus('email'), 100)
  }, [setFocus])

  // Rotate quotes with crossfade
  useEffect(() => {
    const id = setInterval(() => {
      setQuoteFade(false)
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length)
        setQuoteFade(true)
      }, 300)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  // Cycle demo XP feed events every 3s
  useEffect(() => {
    const id = setInterval(() => {
      setDemoFade(false)
      setTimeout(() => {
        setDemoIdx(i => (i + 1) % DEMO_EVENTS.length)
        setDemoFade(true)
      }, 250)
    }, 3000)
    return () => clearInterval(id)
  }, [])

  const onSubmit = async (data: AuthForm) => {
    setError(null)
    setResetMsg(null)

    if (mode === 'signup' && data.password !== data.confirm) {
      setError('Passwords do not match.')
      return
    }

    await supabase.auth.signOut()
    resetStore()

    const { error: authErr } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
        : await supabase.auth.signUp({
            email: data.email, password: data.password,
            options: { data: { name: data.name.trim() } },
          })

    if (authErr) {
      setError(friendlyError(authErr.message))
      // Clear password and re-focus on failed login
      if (mode === 'login') {
        setValue('password', '')
        setTimeout(() => passwordRef.current?.focus(), 50)
      }
    } else {
      localStorage.setItem('youxp-remember-me', String(rememberMe))
      if (!rememberMe) {
        // Clear persisted session so it doesn't survive a browser restart
        const tokenKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
        if (tokenKey) {
          sessionStorage.setItem(tokenKey, localStorage.getItem(tokenKey)!)
          localStorage.removeItem(tokenKey)
        }
      }
      setSuccess(true)
      const from = (location.state as { from?: string })?.from ?? '/'
      setTimeout(() => navigate(from), 420)
    }
  }

  function switchMode(next: 'login' | 'signup') {
    setMode(next)
    setModeKey(k => k + 1)
    setError(null)
    setResetMsg(null)
    setShowPass(false)
    setShowConfirm(false)
  }

  const emailReg     = register('email',    { required: true })
  const passwordReg  = register('password', { required: true, minLength: { value: 8, message: 'Password must be at least 8 characters' } })

  // Password strength
  const pw = watch('password') ?? ''
  const pwStrength = pw.length === 0 ? 0 : pw.length < 8 ? 1 : /[^a-zA-Z0-9]/.test(pw) && pw.length >= 12 ? 3 : 2
  const pwColors   = ['transparent', '#ef4444', '#f59e0b', '#22c55e']
  const pwLabels   = ['', 'Weak', 'Fair', 'Strong']

  // Email inline validation
  const emailVal = watch('email') ?? ''
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)

  const quote = QUOTES[quoteIdx]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--base-bg)' }}>

      {/* â"€â"€ Left hero panel — desktop only â"€â"€ */}
      <div
        className="hidden md:flex flex-col justify-between"
        style={{
          width:     '52%',
          minHeight: '100vh',
          padding:   '52px 56px',
          position:  'relative',
          overflow:  'hidden',
          background: 'linear-gradient(155deg, rgba(22,18,48,0.98) 0%, rgba(8,10,22,1) 60%, rgba(14,10,32,0.97) 100%)',
        }}
      >
        {/* Diagonal clip — gives a slight angled edge on the right side */}
        <div style={{
          position: 'absolute', top: 0, right: -1, width: 32, height: '100%',
          background: 'var(--base-bg)',
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          zIndex: 10,
        }} />

        {/* Ambient orbs */}
        <div className="orb-float" style={{ position: 'absolute', top: -60, right: 60, width: 440, height: 440, borderRadius: '50%', background: 'var(--orb1)', filter: 'blur(110px)', opacity: 0.35 }} />
        <div className="orb-float" style={{ position: 'absolute', bottom: -50, left: -20, width: 320, height: 320, borderRadius: '50%', background: 'var(--orb2)', filter: 'blur(90px)', opacity: 0.28, animationDelay: '3s' }} />

        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 90% 90% at 50% 50%, black 40%, transparent 100%)',
        }} />

        {/* XP bar texture — subtle horizontal lines */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(245,166,35,0.025) 28px, rgba(245,166,35,0.025) 29px)',
        }} />

        {/* Scanline sweep */}
        <div className="login-scanline" />

        {/* Brand */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1
            className="glow-pulse"
            style={{
              color: 'var(--accent)', fontFamily: 'Cinzel, serif',
              fontSize: 52, fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1, marginBottom: 10,
            }}
          >
            YouXP
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: 'Cormorant Garamond, serif' }}>
            Level up your life.
          </p>
        </div>

        {/* Feature grid */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 20 }}>
            Everything you track
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px', marginBottom: 32 }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  animation: `fadeSlideDown 0.4s ease both`,
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{f.icon}</span>
                <span>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>{f.label}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 10, margin: '2px 0 0', lineHeight: 1 }}>{f.sub}</p>
                </span>
              </div>
            ))}
          </div>

          {/* Rotating quote */}
          <div style={{
            padding: '18px 22px', borderRadius: 14,
            background: 'rgba(245,166,35,0.05)',
            border: '1px solid rgba(245,166,35,0.15)',
            textAlign: 'center',
            transition: 'opacity 0.3s ease',
            opacity: quoteFade ? 1 : 0,
            marginBottom: 24,
          }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>
              "{quote.text}{' '}
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontStyle: 'normal' }}>{quote.highlight}</span>"
            </p>
          </div>

          {/* Demo XP feed card */}
          <div style={{
            marginBottom: 18,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'opacity 0.25s ease',
            opacity: demoFade ? 1 : 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
                  {DEMO_EVENTS[demoIdx].label}
                </p>
                <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 11, lineHeight: 1 }}>
                  {DEMO_EVENTS[demoIdx].detail}
                </p>
              </div>
              <span style={{
                color: 'var(--accent)', fontFamily: 'Cinzel, serif',
                fontSize: 15, fontWeight: 800, letterSpacing: '0.02em', flexShrink: 0, marginLeft: 12,
              }}>
                {DEMO_EVENTS[demoIdx].xp}
              </span>
            </div>
          </div>

          {/* Social proof */}
          <p style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', letterSpacing: '0.06em' }}>
            All your personal data. Yours forever.
          </p>
        </div>

        {/* Level 1 teaser + signup CTA */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            {/* Mini level ring */}
            <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
              <svg width="48" height="48" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(245,166,35,0.15)" strokeWidth="3" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--accent)" strokeWidth="3"
                  strokeDasharray="125.6" strokeDashoffset="113" strokeLinecap="round" />
              </svg>
              <span style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700,
              }}>1</span>
            </div>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, margin: 0 }}>Everyone starts at Level 1.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '3px 0 0' }}>Where you go is up to you.</p>
            </div>
          </div>
          <button
            onClick={() => switchMode('signup')}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid rgba(245,166,35,0.3)',
              background: 'rgba(245,166,35,0.07)', color: 'var(--accent)', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,166,35,0.13)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(245,166,35,0.07)')}
          >
            Join today — it's free
          </button>
        </div>
      </div>

      {/* â"€â"€ Right: auth form â"€â"€ */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden"
        style={{ minHeight: '100vh' }}
      >
        {/* Mobile-only orbs */}
        <div className="md:hidden orb-float" style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'var(--orb1)', filter: 'blur(60px)', opacity: 0.3 }} />
        <div className="md:hidden orb-float" style={{ position: 'absolute', bottom: -60, right: -60, width: 250, height: 250, borderRadius: '50%', background: 'var(--orb2)', filter: 'blur(50px)', opacity: 0.25, animationDelay: '2s' }} />

        <div className="relative z-10 w-full" style={{ maxWidth: 380 }}>

          {/* Mobile-only logo */}
          <div className="md:hidden text-center mb-8">
            <h1 className="glow-pulse" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif', fontSize: 48, fontWeight: 900 }}>
              YouXP
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 6, fontFamily: 'Cormorant Garamond, serif' }}>
              Level up your life.
            </p>
          </div>

          {/* Reset success message */}
          {resetMsg && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 10,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
              color: '#4ade80', fontSize: 13, textAlign: 'center',
            }}>
              {resetMsg}
            </div>
          )}

          {/* Card */}
          <div
            key={`card-${modeKey}`}
            className={success ? 'login-success-out' : modeKey > 0 ? 'mode-switch-pulse' : 'fade-in'}
            style={{
              borderRadius: 20, padding: '30px 28px',
              background:           'var(--card-bg)',
              backdropFilter:       'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border:     '1px solid var(--border)',
              boxShadow:  '0 24px 64px rgba(0,0,0,0.45)',
            }}
          >
            {/* Heading */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ color: 'var(--text-primary)', fontFamily: 'Cinzel, serif', fontSize: 19, fontWeight: 700, margin: '0 0 5px' }}>
                {mode === 'login' ? LOGIN_HEADINGS[headingIdx] : 'Create your account'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
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
                  tabIndex={mode === 'signup' ? 0 : -1}
                  {...register('name', { required: mode === 'signup', maxLength: 64 })}
                  style={INPUT_BASE}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
              </div>

              {/* Email */}
              <div>
                <FieldLabel>Email</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...emailReg}
                    ref={e => { emailReg.ref(e); (emailRef as React.MutableRefObject<HTMLInputElement | null>).current = e }}
                    style={{ ...INPUT_BASE, paddingRight: 40 }}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); passwordRef.current?.focus() } }}
                  />
                  {/* Inline email checkmark */}
                  {emailValid && emailVal.length > 0 && (
                    <span style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      color: '#22c55e', fontSize: 16, lineHeight: 1,
                    }}>âœ"</span>
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <FieldLabel style={{ marginBottom: 0 }}>Password</FieldLabel>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const email = watch('email')
                        if (!email) { setError('Enter your email first'); return }
                        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/reset-password?reset=1`,
                        })
                        if (resetErr) { setError(resetErr.message); return }
                        setError(null)
                        setResetMsg('Reset link sent — check your inbox.')
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    {...passwordReg}
                    ref={e => { passwordReg.ref(e); (passwordRef as React.MutableRefObject<HTMLInputElement | null>).current = e }}
                    style={{ ...INPUT_BASE, paddingRight: 46 }}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    onKeyDown={e => {
                      setCapsLock(e.getModifierState('CapsLock'))
                      if (e.key === 'Enter' && mode === 'login') handleSubmit(onSubmit)()
                    }}
                    onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: showPass ? 'var(--accent)' : 'var(--text-muted)',
                      padding: 3, transition: 'color 0.15s ease', display: 'flex', alignItems: 'center',
                    }}
                  >
                    <EyeIcon open={showPass} />
                  </button>
                </div>

                {/* Caps Lock warning */}
                {capsLock && (
                  <p style={{ color: '#f59e0b', fontSize: 11, marginTop: 4 }}>âš  Caps Lock is on</p>
                )}

                {/* Password strength — signup only */}
                {mode === 'signup' && pw.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1,2,3].map(lvl => (
                        <div key={lvl} style={{
                          flex: 1, height: 3, borderRadius: 2,
                          background: pwStrength >= lvl ? pwColors[pwStrength] : 'var(--input-bg)',
                          transition: 'background 0.2s ease',
                        }} />
                      ))}
                    </div>
                    <p style={{ color: pwColors[pwStrength], fontSize: 10, marginTop: 3 }}>{pwLabels[pwStrength]}</p>
                  </div>
                )}
              </div>

              {/* Confirm password — signup only */}
              {mode === 'signup' && (
                <div style={{
                  overflow: 'hidden',
                  maxHeight: mode === 'signup' ? 80 : 0,
                  opacity: mode === 'signup' ? 1 : 0,
                  transition: 'max-height 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
                }}>
                  <FieldLabel>Confirm Password</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                      {...register('confirm', { required: mode === 'signup' })}
                      style={{ ...INPUT_BASE, paddingRight: 46 }}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(p => !p)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: showConfirm ? 'var(--accent)' : 'var(--text-muted)',
                        padding: 3, display: 'flex', alignItems: 'center',
                      }}
                    >
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>
                </div>
              )}

              {/* Remember me — login only */}
              {mode === 'login' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', userSelect: 'none' }}>
                  <div
                    onClick={() => setRememberMe(v => !v)}
                    style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `1.5px solid ${rememberMe ? 'var(--accent)' : 'var(--border)'}`,
                      background: rememberMe ? 'var(--accent)' : 'var(--input-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s ease, border-color 0.15s ease',
                    }}
                  >
                    {rememberMe && (
                      <svg className="check-pop" width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="var(--base-bg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Remember me</span>
                </label>
              )}

              {/* Error banner */}
              {(error || errors.password) && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(233,69,96,0.10)',
                  border: '1px solid rgba(233,69,96,0.22)',
                }}>
                  <WarningIcon />
                  <p style={{ color: '#E94560', fontSize: 13, margin: 0 }}>
                    {errors.password?.message ?? error}
                  </p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                loading={isSubmitting} disabled={isSubmitting}
                style={{
                  width: '100%', padding: '13px 0', marginTop: 2, borderRadius: 13, border: 'none',
                  background: 'var(--accent)', color: 'var(--base-bg)',
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
                  ? <><SpinnerIcon /> Loadingâ€¦</>
                  : mode === 'login' ? 'Sign In' : 'Create Account'
                }
              </button>
            </form>

            {/* Divider + mode switch */}
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border-faint)' }}>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
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
                  {mode === 'login' ? 'Start free — no card needed' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>

          {/* Version number */}
          <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-muted)', fontSize: 10, opacity: 0.5 }}>v2.1</p>
        </div>
      </div>
    </div>
  )
}

// â"€â"€ Small helpers â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function FieldLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{
      display: 'block', color: 'var(--text-muted)', fontSize: 11,
      fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase', marginBottom: 6,
      ...style,
    }}>
      {children}
    </label>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <>
          <path d="M17 10s-3.134 4-7 4-7-4-7-4 3.134-4 7-4 7 4 7 4Z" />
          <circle cx="10" cy="10" r="2" />
          <path d="M3 3l14 14" />
        </>
      ) : (
        <>
          <path d="M17 10s-3.134 4-7 4-7-4-7-4 3.134-4 7-4 7 4 7 4Z" />
          <circle cx="10" cy="10" r="2" />
        </>
      )}
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#E94560" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10 2L1.5 17h17L10 2Z" />
      <path d="M10 8v4" />
      <circle cx="10" cy="14.5" r="0.75" fill="#E94560" stroke="none" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
      <path d="M10 2a8 8 0 1 0 8 8" />
    </svg>
  )
}
