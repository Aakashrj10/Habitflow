'use client'
import { useState, useEffect } from 'react'
import { Flame, Target, Trophy, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ProfileData {
  profile: { id: string; full_name: string | null; email: string }
  stats: { total_habits: number; best_streak: number; total_done_30d: number; completion_30d: number }
  heatmap: { date: string; done: number; total: number; pct: number }[]
  habits: { name: string; category: string; color: string; streak: number }[]
}

function heatColor(pct: number) {
  if (pct === 0)  return 'bg-gray-100'
  if (pct < 25)   return 'bg-brand-100'
  if (pct < 50)   return 'bg-brand-200'
  if (pct < 75)   return 'bg-brand-400'
  return 'bg-brand-600'
}

export default function PublicProfileClient({ userId }: { userId: string }) {
  const [data, setData]     = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetch(`/api/profile/public/${userId}`)
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then(setData)
      .catch(() => setError('Profile not found'))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-sm text-gray-400">Loading profile…</div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-3">Profile not found</p>
        <Link href="/" className="text-brand-600 text-sm hover:underline">Go to Habitflow →</Link>
      </div>
    </div>
  )

  const name = data.profile.full_name ?? data.profile.email.split('@')[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-semibold text-brand-700 mx-auto mb-3">
            {name[0].toUpperCase()}
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{name}</h1>
          <p className="text-sm text-gray-400 mt-1">Habit tracker on Habitflow</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: '30d completion', value: `${data.stats.completion_30d}%`, icon: Target,    color: 'text-brand-600' },
            { label: 'Best streak',    value: `${data.stats.best_streak}d`,    icon: Flame,     color: 'text-amber-500' },
            { label: 'Check-ins',      value: data.stats.total_done_30d,       icon: TrendingUp, color: 'text-emerald-600' },
            { label: 'Habits',         value: data.stats.total_habits,         icon: Trophy,    color: 'text-violet-600' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon size={12} className={s.color} />
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">{s.label}</span>
                </div>
                <p className="text-2xl font-medium text-gray-900">{s.value}</p>
              </div>
            )
          })}
        </div>

        {/* Heatmap */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">30-day activity</p>
          <div className="flex gap-1">
            {data.heatmap.map(day => (
              <div key={day.date} title={`${day.date}: ${day.pct}%`}
                className={cn('flex-1 aspect-square rounded-sm', heatColor(day.pct))} />
            ))}
          </div>
        </div>

        {/* Habits */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Habits</p>
          <div className="space-y-2">
            {data.habits.map(h => (
              <div key={h.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: h.color }} />
                  <span className="text-sm text-gray-700">{h.name}</span>
                </div>
                {h.streak > 0 && (
                  <div className="flex items-center gap-1 text-amber-500">
                    <Flame size={11} /><span className="text-xs">{h.streak}d</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-sm text-gray-400 mb-3">Want to track your own habits?</p>
          <Link href="/"
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-800 text-white text-sm px-5 py-2 rounded-lg transition-colors">
            Try Habitflow free →
          </Link>
        </div>
      </div>
    </div>
  )
}
