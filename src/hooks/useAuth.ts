import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

const SESSION_TIMEOUT_MS = 10_000

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    // Subscribe BEFORE getSession() per Supabase best-practice — ensures no
    // auth state change (token refresh, sign-out) is missed between the
    // getSession() call and its resolution (P1-8 fix).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setSession(session)
      // A session arriving late (e.g. after the timeout fired) supersedes any
      // stale timeout error — otherwise ProtectedRoute bounces a valid session to /login
      if (session) { setError(null); setLoading(false) }
    })

    const timeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false)
        setError(new Error('Auth check timed out — check your connection'))
      }
    }, SESSION_TIMEOUT_MS)

    supabase.auth.getSession()
      .then(({ data: { session }, error: err }) => {
        if (!mounted) return
        clearTimeout(timeout)
        setError(err ?? null)
        setSession(session)
        setLoading(false)
      })
      .catch(err => {
        if (!mounted) return
        clearTimeout(timeout)
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { session, loading, error }
}
