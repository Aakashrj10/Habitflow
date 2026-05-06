'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/ui/Sidebar'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface Achievement {
  key: string
  title: string
  desc: string
  icon: string
  unlocked: boolean
  new: boolean
}

export default function AchievementsClient() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading]           = useState(true)
  const [profile, setProfile]           = useState<Profile | null>(null)
  const [token, setToken]               = useState<string | null>(null)
  const [stats, setStats]               = useState<any>(null)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)
      setProfile(session.user as unknown as Profile)
      fetch('/api/achievements', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json())
        .then(data => { setAchievements(data.achievements); setStats(data.stats) })
        .finally(() => setLoading(false))
    })
  }, [router, supabase.auth])

  const unlocked = achievements.filter(a => a.unlocked).length
  const total    = achievements.length

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar profile={profile} />
      <main className="flex-1 p-5 mobile-pt max-w-2xl">
        <div className="mb-5">
          <h1 className="text-sm font-medium text-gray-900">Achievements</h1>
          <p className="text-xs text-gray-400 mt-0.5">{unlocked} of {total} unlocked</p>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Progress</span>
            <span className="text-[10px] text-gray-400">{unlocked}/{total}</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-600 rounded-full transition-all duration-500"
              style={{ width: total > 0 ? `${Math.round((unlocked / total) * 100)}%` : '0%' }} />
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Best streak', value: `${stats.best_streak}d` },
              { label: 'Check-ins', value: stats.total_done },
              { label: 'Habits', value: stats.total_habits },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-lg border border-gray-100 px-3 py-2.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
                <p className="text-lg font-medium text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {achievements.map(a => (
              <div key={a.key} className={cn(
                'relative rounded-xl border p-3 transition-all',
                a.unlocked ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100 opacity-50',
                a.new && 'border-brand-300 bg-brand-50 opacity-100'
              )}>
                {a.new && (
                  <span className="absolute top-2 right-2 text-[9px] bg-brand-600 text-white px-1.5 py-0.5 rounded-full">NEW</span>
                )}
                <div className="text-2xl mb-1.5">{a.unlocked ? a.icon : '🔒'}</div>
                <p className="text-xs font-medium text-gray-900">{a.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
