import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️  Supabase env vars missing — check your .env file')
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      // Implicit flow: el token llega como hash fragment (#access_token=...)
      // No requiere PKCE state — evita el error "OAuth state not found or expired"
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: true,
    }
  }
)
