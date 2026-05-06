import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { getLast30Days, calcCompletionRate } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

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
    return {
      name: h.name,
      category: h.category,
      current_streak: streak?.current_streak ?? 0,
      completion_rate_30d: calcCompletionRate(habitLogs, 30),
      completion_rate_7d: calcCompletionRate(habitLogs, 7),
    }
  })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You are a habit coach. Analyze this 30-day habit data and give personalized suggestions. Respond ONLY in JSON, no markdown:\n${JSON.stringify(summary, null, 2)}\n\nReturn: {"insights":[{"type":"strength"|"weakness"|"suggestion","title":"...","body":"..."}],"weekly_focus":"...","new_habit_suggestion":{"name":"...","category":"...","reason":"..."}}`,
    }],
  })

  const text = response.content.find((b: any) => b.type === 'text')?.text ?? '{}'
  try {
    return NextResponse.json(JSON.parse(text.replace(/```json|```/g, '').trim()))
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
