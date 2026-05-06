import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { today } from '@/lib/utils'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as any
}

async function getUser(r: Request) {
  const token = r.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await getClient().auth.getUser(token)
  return user
}

export async function GET(request: Request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: habits, error } = await getClient().from('habits')
    .select('*, streak:streaks(*), today_log:habit_logs(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .eq('habit_logs.log_date', today())
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const normalized = (habits as any[]).map((h: any) => ({
    ...h,
    today_log: h.today_log?.[0] ?? null,
    streak: h.streak?.[0] ?? null,
  }))
  return NextResponse.json(normalized)
}

export async function POST(request: Request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { name, description, category, frequency, custom_days, target_time, color, icon } = body
  if (!name || !category) return NextResponse.json({ error: 'name and category are required' }, { status: 400 })
  const { data, error } = await getClient().from('habits')
    .insert({ user_id: user.id, name, description, category, frequency: frequency ?? 'daily', custom_days, target_time, color: color ?? '#7F77DD', icon: icon ?? 'circle' })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
