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

const ACHIEVEMENTS = [
  { key: 'first_checkin',   title: 'First step',       desc: 'Complete your first habit',          icon: '🌱', condition: (s: any) => s.total_done >= 1 },
  { key: 'streak_3',        title: '3-day streak',     desc: 'Maintain a 3-day streak',             icon: '🔥', condition: (s: any) => s.best_streak >= 3 },
  { key: 'streak_7',        title: 'Week warrior',     desc: 'Maintain a 7-day streak',             icon: '⚡', condition: (s: any) => s.best_streak >= 7 },
  { key: 'streak_14',       title: 'Two week titan',   desc: 'Maintain a 14-day streak',            icon: '💪', condition: (s: any) => s.best_streak >= 14 },
  { key: 'streak_30',       title: 'Monthly master',   desc: 'Maintain a 30-day streak',            icon: '🏆', condition: (s: any) => s.best_streak >= 30 },
  { key: 'streak_100',      title: 'Century club',     desc: 'Maintain a 100-day streak',           icon: '👑', condition: (s: any) => s.best_streak >= 100 },
  { key: 'checkins_10',     title: 'Getting started',  desc: 'Complete 10 habit check-ins',         icon: '✅', condition: (s: any) => s.total_done >= 10 },
  { key: 'checkins_50',     title: 'Habit builder',    desc: 'Complete 50 habit check-ins',         icon: '🎯', condition: (s: any) => s.total_done >= 50 },
  { key: 'checkins_100',    title: 'Century check-in', desc: 'Complete 100 habit check-ins',        icon: '💯', condition: (s: any) => s.total_done >= 100 },
  { key: 'checkins_500',    title: 'Habit machine',    desc: 'Complete 500 habit check-ins',        icon: '🤖', condition: (s: any) => s.total_done >= 500 },
  { key: 'habits_3',        title: 'Triad',            desc: 'Track 3 or more habits',              icon: '🌟', condition: (s: any) => s.total_habits >= 3 },
  { key: 'habits_5',        title: 'High five',        desc: 'Track 5 or more habits',              icon: '🖐️', condition: (s: any) => s.total_habits >= 5 },
  { key: 'perfect_day',     title: 'Perfect day',      desc: 'Complete all habits in a single day', icon: '🎉', condition: (s: any) => s.had_perfect_day },
  { key: 'perfect_week',    title: 'Perfect week',     desc: 'Complete all habits for 7 days',      icon: '🌈', condition: (s: any) => s.perfect_week },
]

export async function GET(request: Request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getClient()

  const [{ data: streaks }, { data: logs }, { data: habits }, { data: existing }] = await Promise.all([
    db.from('streaks').select('*').eq('user_id', user.id),
    db.from('habit_logs').select('*').eq('user_id', user.id).eq('status', 'done'),
    db.from('habits').select('id').eq('user_id', user.id).eq('is_active', true),
    db.from('achievements').select('key').eq('user_id', user.id),
  ])

  const best_streak   = Math.max(0, ...(streaks ?? []).map((s: any) => s.longest_streak))
  const total_done    = (logs ?? []).length
  const total_habits  = (habits ?? []).length
  const existingKeys  = new Set((existing ?? []).map((a: any) => a.key))

  // Check for perfect day
  const logsByDate = (logs ?? []).reduce((acc: any, l: any) => {
    acc[l.log_date] = (acc[l.log_date] || 0) + 1
    return acc
  }, {})
  const had_perfect_day = Object.values(logsByDate).some((count: any) => count >= total_habits && total_habits > 0)

  // Check for perfect week (7 consecutive perfect days)
  const sortedDates = Object.keys(logsByDate).sort()
  let perfect_week = false
  for (let i = 0; i <= sortedDates.length - 7; i++) {
    const week = sortedDates.slice(i, i + 7)
    if (week.every(d => (logsByDate[d] || 0) >= total_habits && total_habits > 0)) {
      perfect_week = true; break
    }
  }

  const stats = { best_streak, total_done, total_habits, had_perfect_day, perfect_week }

  // Unlock new achievements
  const toUnlock = ACHIEVEMENTS.filter(a => !existingKeys.has(a.key) && a.condition(stats))
  if (toUnlock.length > 0) {
    await db.from('achievements').insert(toUnlock.map(a => ({ user_id: user.id, key: a.key })))
  }

  // Return all achievements with unlock status
  const allAchievements = ACHIEVEMENTS.map(a => ({
    ...a,
    condition: undefined,
    unlocked: existingKeys.has(a.key) || toUnlock.some(u => u.key === a.key),
    new: toUnlock.some(u => u.key === a.key),
  }))

  return NextResponse.json({ achievements: allAchievements, stats })
}
