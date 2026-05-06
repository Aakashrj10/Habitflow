'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/ui/Sidebar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Flame, Trophy, Target, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface HeatmapDay  { date: string; done: number; total: number; pct: number }
interface WeeklyBar   { week: string; done: number; possible: number; pct: number }
interface HabitStat   { id: string; name: string; category: string; color: string; done_30d: number; completion_30d: number; current_streak: number; longest_streak: number }
interface Summary     { completion_30d: number; total_done_30d: number; best_streak: number; avg_daily_7d: number; total_habits: number }
interface AnalyticsData { heatmap: HeatmapDay[]; weekly: WeeklyBar[]; habitStats: HabitStat[]; summary: Summary }

function heatColor(pct: number) {
  if (pct === 0)   return 'bg-gray-100'
  if (pct < 25)    return 'bg-brand-100'
  if (pct < 50)    return 'bg-brand-200'
  if (pct < 75)    return 'bg-brand-400'
  return 'bg-brand-600'
}

export default function AnalyticsClient() {
  const [data, setData]       = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [token, setToken]     = useState<string | null>(null)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)
      setProfile(session.user as unknown as Profile)
      fetch('/api/analytics', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json()).then(setData).finally(() => setLoading(false))
    })
  }, [router, supabase.auth])

  const summary = data?.summary

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <main className="flex-1 p-6 mobile-pt max-w-4xl">
        <div className="mb-6">
          <h1 className="text-lg font-medium text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-400">Last 30 days overview</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : !data ? (
          <p className="text-gray-400 text-sm">No data yet — start tracking habits!</p>
        ) : (
          <div className="space-y-6">

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: '30d completion', value: `${summary?.completion_30d}%`, icon: Target,   color: 'text-brand-600' },
                { label: 'Check-ins',      value: summary?.total_done_30d,       icon: TrendingUp, color: 'text-emerald-600' },
                { label: 'Best streak',    value: `${summary?.best_streak}d`,    icon: Flame,    color: 'text-amber-500' },
                { label: 'Avg daily (7d)', value: summary?.avg_daily_7d,         icon: Trophy,   color: 'text-violet-600' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} className={s.color} />
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                    <p className="text-2xl font-medium text-gray-900">{s.value}</p>
                  </div>
                )
              })}
            </div>

            {/* Heatmap */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">90-day activity</h2>
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(13, 1fr)' }}>
                {/* Group by week */}
                {Array.from({ length: 13 }, (_, weekIdx) => {
                  const weekDays = data.heatmap.slice(weekIdx * 7, weekIdx * 7 + 7)
                  return (
                    <div key={weekIdx} className="flex flex-col gap-1">
                      {weekDays.map(day => (
                        <div
                          key={day.date}
                          title={`${day.date}: ${day.done}/${day.total} (${day.pct}%)`}
                          className={cn('w-full aspect-square rounded-sm', heatColor(day.pct))}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-2 mt-3 justify-end">
                <span className="text-xs text-gray-400">Less</span>
                {['bg-gray-100','bg-brand-100','bg-brand-200','bg-brand-400','bg-brand-600'].map(c => (
                  <div key={c} className={cn('w-3 h-3 rounded-sm', c)} />
                ))}
                <span className="text-xs text-gray-400">More</span>
              </div>
            </div>

            {/* Weekly bar chart */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Weekly completion %</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.weekly} barSize={28}>
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Completion']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="pct" radius={[4,4,0,0]}>
                    {data.weekly.map((entry, i) => (
                      <Cell key={i} fill={entry.pct >= 70 ? '#534AB7' : entry.pct >= 40 ? '#AFA9EC' : '#E5E4F8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Per-habit breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Habit breakdown (30d)</h2>
              <div className="space-y-3">
                {data.habitStats.map(h => (
                  <div key={h.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: h.color }} />
                        <span className="text-sm text-gray-700">{h.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Flame size={11} className="text-amber-400" />{h.current_streak}d</span>
                        <span className="font-medium text-gray-700">{h.completion_30d}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${h.completion_30d}%`, background: h.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
