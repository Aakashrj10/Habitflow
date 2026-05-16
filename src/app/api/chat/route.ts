import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chat } from '@/lib/llm'
import { getLast30Days } from '@/lib/utils'

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
  const { messages } = await request.json()
  const [{ data: habits }, { data: logs }, { data: streaks }] = await Promise.all([
    getClient().from('habits').select('*').eq('user_id', user.id).eq('is_active', true),
    getClient().from('habit_logs').select('*').eq('user_id', user.id).gte('log_date', getLast30Days()[0]),
    getClient().from('streaks').select('*').eq('user_id', user.id),
  ])
  const summary = (habits ?? []).map((h: any) => {
    const hLogs = (logs ?? []).filter((l: any) => l.habit_id === h.id)
    const streak = (streaks ?? []).find((s: any) => s.habit_id === h.id)
    return `- ${h.name} (${h.category}): ${hLogs.filter((l: any) => l.status === 'done').length}/30 done, streak ${streak?.current_streak ?? 0}d`
  }).join('\n')
  const system = `You are a friendly habit coach. User's habits:\n${summary || 'No habits yet.'}\nBe warm, specific, and helpful. Keep responses to 2-4 sentences.`
  const text = await chat({ system, messages, max_tokens: 400 })
  return NextResponse.json({ message: text })
}
