import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Fire-and-forget wake ping — wakes Supabase from free-tier inactivity pause immediately
// on bundle load, before auth resolves, so the DB is ready when real queries fire.
supabase.from('sleep_log').select('id').limit(1).then(() => {}).catch(() => {})
