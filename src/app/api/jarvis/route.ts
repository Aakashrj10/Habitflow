import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLast30Days, today } from '@/lib/utils'
import { format, subDays } from 'date-fns'

function getClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) as any
}
async function getUser(r: Request) {
  const token = r.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await getClient().auth.getUser(token)
  return user
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ message: 'Please log in again.' }, { status: 401 })

    const { messages, mode } = await request.json()
    const db = getClient()

    const [{ data: habits }, { data: logs }, { data: streaks }, { data: journal }] = await Promise.all([
      db.from('habits').select('*').eq('user_id', user.id).eq('is_active', true),
      db.from('habit_logs').select('*').eq('user_id', user.id).gte('log_date', getLast30Days()[0]),
      db.from('streaks').select('*').eq('user_id', user.id),
      db.from('journal_entries').select('*').eq('user_id', user.id).order('entry_date', { ascending: false }).limit(7),
    ])

    const todayStr = today()
    const todayDone = (habits ?? []).filter((h: any) => (logs ?? []).find((l: any) => l.habit_id === h.id && l.log_date === todayStr && l.status === 'done'))
    const todayPending = (habits ?? []).filter((h: any) => !todayDone.find((d: any) => d.id === h.id))
    const bestStreak = Math.max(0, ...(streaks ?? []).map((s: any) => s.longest_streak))
    const userName = user.user_metadata?.full_name?.split(' ')[0] ?? 'there'
    const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]

    const habitSummary = (habits ?? []).map((h: any) => {
      const hLogs = (logs ?? []).filter((l: any) => l.habit_id === h.id)
      const streak = (streaks ?? []).find((s: any) => s.habit_id === h.id)
      return `- ${h.name}: ${hLogs.filter((l: any) => l.status === 'done').length}/30 done, streak ${streak?.current_streak ?? 0}d${todayDone.find((d: any) => d.id === h.id) ? ' ✓' : ' ⏳'}`
    }).join('\n')

    const system = `You are Jarvis, a personal habit coach for ${userName}. Be warm, concise, insightful.
Time: ${format(new Date(), 'HH:mm')} on ${dayName}, ${format(new Date(), 'MMM d')}
Today: ${todayDone.length}/${(habits ?? []).length} habits done. Pending: ${todayPending.map((h: any) => h.name).join(', ') || 'all done!'}
Best streak: ${bestStreak}d
Habits:\n${habitSummary || 'none yet'}
${mode === 'briefing' ? 'Give a morning briefing: greet, summarize today, one insight, one tip. Max 3 sentences.' : ''}
${mode === 'checkin' ? 'Quick check-in on progress. Max 2 sentences.' : ''}
${mode === 'review' ? 'Weekly review: wins, one improvement, intention. Max 4 sentences.' : ''}
Keep responses SHORT — 2-3 sentences max unless asked for more.`

    const chatMsgs = messages?.length > 0 ? messages : [{ role: 'user', content: mode === 'briefing' ? 'Morning briefing.' : 'Hello!' }]

    // Try Ollama with streaming
    try {
      const ollamaRes = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:1b',
          stream: true,
          options: { num_predict: 200, temperature: 0.7 },
          messages: [{ role: 'system', content: system }, ...chatMsgs],
        }),
        signal: AbortSignal.timeout(120000),
      })

      if (ollamaRes.ok && ollamaRes.body) {
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async start(controller) {
            const reader = ollamaRes.body!.getReader()
            const decoder = new TextDecoder()
            let fullText = ''
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value)
                const lines = chunk.split('\n').filter(Boolean)
                for (const line of lines) {
                  try {
                    const json = JSON.parse(line)
                    const token = json.message?.content ?? ''
                    if (token) {
                      fullText += token
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
                    }
                    if (json.done) {
                      // Send context at the end
                      const yDate = format(subDays(new Date(), 1), 'yyyy-MM-dd')
                      const yDone = (logs ?? []).filter((l: any) => l.log_date === yDate && l.status === 'done').length
                      const ctx = {
                        habits_today: { done: todayDone.length, total: (habits ?? []).length, pending: todayPending.map((h: any) => h.name) },
                        best_streak: bestStreak,
                        avg_mood_7d: (journal ?? []).length > 0 ? ((journal ?? []).reduce((a: number, j: any) => a + (j.mood || 3), 0) / (journal ?? []).length).toFixed(1) : null,
                        yesterday_completion: (habits ?? []).length > 0 ? Math.round((yDone / (habits ?? []).length) * 100) : 0,
                        habit_patterns: (habits ?? []).map((h: any) => {
                          const hLogs = (logs ?? []).filter((l: any) => l.habit_id === h.id)
                          const streak = (streaks ?? []).find((s: any) => s.habit_id === h.id)
                          return { name: h.name, completion_30d: Math.round((hLogs.filter((l: any) => l.status === 'done').length / 30) * 100), current_streak: streak?.current_streak ?? 0, done_today: !!todayDone.find((d: any) => d.id === h.id) }
                        }),
                      }
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, context: ctx })}\n\n`))
                    }
                  } catch {}
                }
              }
            } finally {
              controller.close()
            }
          }
        })
        return new Response(stream, {
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
        })
      }
    } catch (e: any) {
      console.log('Ollama error:', e.message)
    }

    // Fallback: non-streaming with OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
      const models = ['google/gemma-3-4b-it:free', 'mistralai/mistral-7b-instruct:free', 'qwen/qwen-2.5-7b-instruct:free']
      for (const model of models) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'HTTP-Referer': 'https://habitflow.vercel.app', 'X-Title': 'Habitflow' },
            body: JSON.stringify({ model, max_tokens: 200, messages: [{ role: 'system', content: system }, ...chatMsgs] }),
          })
          if (res.ok) {
            const data = await res.json()
            const text = data.choices?.[0]?.message?.content ?? ''
            if (text) return NextResponse.json({ message: text })
          }
        } catch {}
      }
    }

    return NextResponse.json({ message: "I'm having trouble connecting. Make sure Ollama is running with: ollama serve" }, { status: 500 })
  } catch (err: any) {
    return NextResponse.json({ message: `Error: ${err.message}` }, { status: 500 })
  }
}
