import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLast30Days } from '@/lib/utils'
import { eachDayOfInterval, subDays, format, startOfWeek, endOfWeek } from 'date-fns'

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

  const ninetyDaysAgo = format(subDays(new Date(), 89), 'yyyy-MM-dd')
  const [{ data: habitsData }, { data: logsData }, { data: streaksData }] = await Promise.all([
    getClient().from('habits').select('*').eq('user_id', user.id).eq('is_active', true),
    getClient().from('habit_logs').select('*').eq('user_id', user.id).gte('log_date', ninetyDaysAgo),
    getClient().from('streaks').select('*').eq('user_id', user.id),
  ])

  const habits  = (habitsData  ?? []) as any[]
  const logs    = (logsData    ?? []) as any[]
  const streaks = (streaksData ?? []) as any[]

  const days90 = eachDayOfInterval({ start: subDays(new Date(), 89), end: new Date() })
  const heatmap = days90.map((day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const dayLogs = logs.filter((l: any) => l.log_date === dateStr)
    const done    = dayLogs.filter((l: any) => l.status === 'done').length
    return { date: dateStr, done, total: habits.length, pct: habits.length > 0 ? Math.round((done / habits.length) * 100) : 0 }
  })

  const weekly = Array.from({ length: 8 }, (_, i) => {
    const weekStart = startOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 })
    const weekEnd   = endOfWeek(weekStart, { weekStartsOn: 1 })
    const weekDays  = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const weekLogs  = logs.filter((l: any) => weekDays.some((d: Date) => format(d, 'yyyy-MM-dd') === l.log_date))
    const done      = weekLogs.filter((l: any) => l.status === 'done').length
    const possible  = weekDays.length * habits.length
    return { week: format(weekStart, 'MMM d'), done, possible, pct: possible > 0 ? Math.round((done / possible) * 100) : 0 }
  }).reverse()

  const habitStats = habits.map((h: any) => {
    const hLogs  = logs.filter((l: any) => l.habit_id === h.id)
    const done30 = hLogs.filter((l: any) => l.status === 'done' && l.log_date >= getLast30Days()[0]).length
    const streak = streaks.find((s: any) => s.habit_id === h.id)
    return {
      id: h.id, name: h.name, category: h.category, color: h.color,
      done_30d: done30,
      completion_30d: Math.round((done30 / 30) * 100),
      current_streak: streak?.current_streak ?? 0,
      longest_streak: streak?.longest_streak ?? 0,
    }
  }).sort((a: any, b: any) => b.completion_30d - a.completion_30d)

  const last30Logs = logs.filter((l: any) => l.log_date >= getLast30Days()[0])
  const totalDone  = last30Logs.filter((l: any) => l.status === 'done').length
  const totalPoss  = 30 * habits.length
  const bestStreak = Math.max(0, ...streaks.map((s: any) => s.longest_streak as number))
  const avgDaily   = heatmap.slice(-7).reduce((a: number, b: any) => a + b.done, 0) / 7

  return NextResponse.json({
    heatmap, weekly, habitStats,
    summary: {
      completion_30d: totalPoss > 0 ? Math.round((totalDone / totalPoss) * 100) : 0,
      total_done_30d: totalDone,
      best_streak: bestStreak,
      avg_daily_7d: Math.round(avgDaily * 10) / 10,
      total_habits: habits.length,
    }
  })
}
