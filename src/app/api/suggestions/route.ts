import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chat } from '@/lib/llm'
import { getLast30Days, calcCompletionRate } from '@/lib/utils'

function getClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) as any }
async function getUser(r: Request) {
  const token = r.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await getClient().auth.getUser(token)
  return user
}
export async function POST(request: Request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [{ data: habits }, { data: logs }] = await Promise.all([
    getClient().from('habits').select('*, streak:streaks(*)').eq('user_id', user.id).eq('is_active', true),
    getClient().from('habit_logs').select('*').eq('user_id', user.id).gte('log_date', getLast30Days()[0]),
  ])
  if (!habits || !logs) return NextResponse.json({ error: 'Could not fetch data' }, { status: 500 })
  const summary = (habits as any[]).map((h: any) => {
    const habitLogs = (logs as any[]).filter((l: any) => l.habit_id === h.id)
    const streak = Array.isArray(h.streak) ? h.streak[0] : h.streak
    return { name: h.name, category: h.category, current_streak: streak?.current_streak ?? 0, completion_rate_30d: calcCompletionRate(habitLogs, 30) }
  })
  const system = `You are a habit coach. Analyze this data and respond ONLY with valid JSON, no markdown or extra text.
Return exactly: {"insights":[{"type":"strength","title":"...","body":"..."},{"type":"weakness","title":"...","body":"..."},{"type":"suggestion","title":"...","body":"..."}],"weekly_focus":"...","new_habit_suggestion":{"name":"...","category":"health","reason":"..."}}`
  const text = await chat({ system, messages: [{ role: 'user', content: `Habit data: ${JSON.stringify(summary)}` }], max_tokens: 800 })
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    return NextResponse.json(JSON.parse(clean.slice(start, end + 1)))
  } catch {
    return NextResponse.json({ error: 'Parse failed', insights: [], weekly_focus: 'Keep going!', new_habit_suggestion: { name: 'Morning walk', category: 'health', reason: 'Great for building consistency' } })
  }
}
