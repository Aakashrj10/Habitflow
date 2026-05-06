import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// GET — fetch top 20 leaderboard
export async function GET() {
  const { data, error } = await getClient()
    .from('leaderboard')
    .select('*')
    .order('best_streak', { ascending: false })
    .limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — join or update leaderboard
export async function POST(request: Request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { display_name } = await request.json()
  const db = getClient()

  // Calculate user's best streak and total done
  const [{ data: streaks }, { data: logs }] = await Promise.all([
    db.from('streaks').select('longest_streak').eq('user_id', user.id),
    db.from('habit_logs').select('id').eq('user_id', user.id).eq('status', 'done'),
  ])

  const best_streak = Math.max(0, ...(streaks ?? []).map((s: any) => s.longest_streak))
  const total_done  = (logs ?? []).length

  const { data, error } = await db.from('leaderboard')
    .upsert({ user_id: user.id, display_name, best_streak, total_done, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — leave leaderboard
export async function DELETE(request: Request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await getClient().from('leaderboard').delete().eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
