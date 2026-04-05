import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useUserName(): string {
  const [name, setName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setName(user?.user_metadata?.name ?? '')
    })
  }, [])

  return name
}
