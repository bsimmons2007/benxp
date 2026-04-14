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
        if (err) setError(err)
        setSession(session)
        setLoading(false)
      })
      .catch(err => {
        if (!mounted) return
        clearTimeout(timeout)
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSession(session)
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { session, loading, error }
}
