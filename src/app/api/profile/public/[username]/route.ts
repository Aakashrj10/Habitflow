import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLast30Days } from '@/lib/utils'
import { eachDayOfInterval, subDays, format } from 'date-fns'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as any
}

export async function GET(request: Request, { params }: { params: { username: string } }) {
  const supabase = getClient()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', params.username).single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [{ data: habits }, { data: logs }, { data: streaks }] = await Promise.all([
    supabase.from('habits').select('*').eq('user_id', profile.id).eq('is_active', true),
    supabase.from('habit_logs').select('*').eq('user_id', profile.id).gte('log_date', getLast30Days()[0]),
    supabase.from('streaks').select('*').eq('user_id', profile.id),
  ])

  const days30 = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() })
  const heatmap = days30.map((day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const dayLogs = (logs ?? []).filter((l: any) => l.log_date === dateStr)
    const done = dayLogs.filter((l: any) => l.status === 'done').length
    const total = (habits ?? []).length
    return { date: dateStr, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  })

  const bestStreak = Math.max(0, ...(streaks ?? []).map((s: any) => s.longest_streak as number))
  const totalDone = (logs ?? []).filter((l: any) => l.status === 'done').length
  const habitCount = (habits ?? []).length

  return NextResponse.json({
    profile: { id: profile.id, full_name: profile.full_name, email: profile.email },
    stats: {
      total_habits: habitCount,
      best_streak: bestStreak,
      total_done_30d: totalDone,
      completion_30d: habitCount > 0 ? Math.round((totalDone / (30 * habitCount)) * 100) : 0,
    },
    heatmap,
    habits: (habits ?? []).map((h: any) => ({
      name: h.name, category: h.category, color: h.color,
      streak: ((streaks ?? []).find((s: any) => s.habit_id === h.id) as any)?.current_streak ?? 0,
    })),
  })
}
