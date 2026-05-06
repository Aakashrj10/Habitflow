import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Browser client (use in Client Components)
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
