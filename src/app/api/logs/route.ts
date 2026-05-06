import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) as any }
import { today, getLast30Days } from '@/lib/utils'

async function getUser(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = getClient()
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export async function GET(request: Request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getClient()

  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('log_date', getLast30Days()[0])
    .lte('log_date', today())
    .order('log_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getClient()
  const body = await request.json()
  const { habit_id, status, note, log_date } = body

  if (!habit_id || !status) {
    return NextResponse.json({ error: 'habit_id and status required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('habit_logs')
    .upsert({ habit_id, user_id: user.id, log_date: log_date ?? today(), status, note }, { onConflict: 'habit_id,log_date' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
