import { createClient } from '@supabase/supabase-js'

export function createRouteSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as any
}

export function createServerSupabaseClient() {
  return createRouteSupabaseClient()
}
