import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { getLast30Days } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

async function getUser(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export async function POST(request: Request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await request.json()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) as any

  // Fetch habit context
  const [{ data: habits }, { data: logs }, { data: streaks }] = await Promise.all([
    supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('habit_logs').select('*').eq('user_id', user.id).gte('log_date', getLast30Days()[0]),
    supabase.from('streaks').select('*').eq('user_id', user.id),
  ])

  const habitSummary = (habits ?? []).map((h: any) => {
    const hLogs = (logs ?? []).filter((l: any) => l.habit_id === h.id)
    const streak = (streaks ?? []).find((s: any) => s.habit_id === h.id)
    const done30 = hLogs.filter((l: any) => l.status === 'done').length
    return `- ${h.name} (${h.category}): ${done30}/30 days done, streak: ${streak?.current_streak ?? 0}d`
  }).join('\n')

  const systemPrompt = `You are a friendly, knowledgeable habit coach for Habitflow. You have access to the user's habit data and give personalized, actionable advice.

User's habit data (last 30 days):
${habitSummary || 'No habits tracked yet.'}

Guidelines:
- Be warm, encouraging, and specific
- Reference their actual habits and numbers
- Give concrete, actionable tips
- Keep responses concise (2-4 sentences usually)
- If they have no habits, help them get started
- You can suggest new habits, help with motivation, explain habit science, or troubleshoot struggles`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: systemPrompt,
    messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
  })

  const text = response.content.find((b: any) => b.type === 'text')?.text ?? ''
  return NextResponse.json({ message: text })
}
