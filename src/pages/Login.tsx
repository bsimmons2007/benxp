import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface AuthForm {
  email: string
  password: string
}

export function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<AuthForm>()
  const navigate = useNavigate()

  const onSubmit = async (data: AuthForm) => {
    setError(null)
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
        : await supabase.auth.signUp({ email: data.email, password: data.password })
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden" style={{ background: 'var(--base-bg)' }}>

      {/* Background orbs */}
      <div className="orb-float absolute" style={{ width: 300, height: 300, borderRadius: '50%', background: 'var(--orb1)', top: '-60px', left: '-80px', filter: 'blur(60px)', opacity: 0.7 }} />
      <div className="orb-float absolute" style={{ width: 250, height: 250, borderRadius: '50%', background: 'var(--orb2)', bottom: '-60px', right: '-60px', filter: 'blur(50px)', opacity: 0.6, animationDelay: '2s' }} />
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
      }} />

      <div className="relative z-10 w-full" style={{ maxWidth: 400 }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold glow-pulse" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>
            BenXP
          </h1>
          <p className="mt-2 text-sm uppercase tracking-widest" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>
            Your life. Gamified.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 fade-in"
          style={{ background: 'rgba(16,24,52,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
        >
          {/* Mode tabs */}
          <div className="flex mb-6 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null) }}
                className="flex-1 py-2.5 text-sm font-semibold transition-all"
                style={mode === m
                  ? { background: 'var(--accent)', color: '#1A1A2E' }
                  : { color: '#888' }}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Email</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email', { required: true })}
                className="px-4 py-3 rounded-xl text-white outline-none text-base"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Password</label>
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                {...register('password', { required: true })}
                className="px-4 py-3 rounded-xl text-white outline-none text-base"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {error && (
              <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(233,69,96,0.15)', color: '#E94560', border: '1px solid rgba(233,69,96,0.3)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl font-bold text-base mt-1 transition-all"
              style={{ background: 'var(--accent)', color: '#1A1A2E', opacity: isSubmitting ? 0.7 : 1, fontFamily: 'Cinzel, serif', boxShadow: '0 4px 24px var(--accent-dim)' }}
            >
              {isSubmitting ? '...' : mode === 'login' ? 'Enter' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
