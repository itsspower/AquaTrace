import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabasePublicKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const supabaseConfigurationError = (() => {
  if (!supabaseUrl && !supabasePublicKey) return null
  if (!supabaseUrl || !supabasePublicKey) {
    return 'Supabase configuration is incomplete. Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  }

  try {
    const url = new URL(supabaseUrl)
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return 'VITE_SUPABASE_URL must use HTTPS except for a local development server.'
    }
  } catch {
    return 'VITE_SUPABASE_URL must be a valid project URL.'
  }

  return null
})()

export const supabase =
  supabaseUrl && supabasePublicKey && !supabaseConfigurationError
    ? createClient(supabaseUrl, supabasePublicKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null
