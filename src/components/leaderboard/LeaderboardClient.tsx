'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/ui/Sidebar'
import { Trophy, Medal, Crown, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface LeaderboardEntry {
  id: string
  user_id: string
  display_name: string
  best_streak: number
  total_done: number
  updated_at: string
}

export default function LeaderboardClient() {
  const [entries, setEntries]     = useState<LeaderboardEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [token, setToken]         = useState<string | null>(null)
  const [userId, setUserId]       = useState<string | null>(null)
  const [joined, setJoined]       = useState(false)
  const [displayName, setDisplay] = useState('')
  const [joining, setJoining]     = useState(false)
  const [showJoin, setShowJoin]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)
      setUserId(session.user.id)
      setProfile(session.user as unknown as Profile)
      setDisplay((session.user.user_metadata?.full_name as string) ?? session.user.email?.split('@')[0] ?? '')
      fetch('/api/leaderboard').then(r => r.json()).then(data => {
        setEntries(data)
        setJoined(data.some((e: LeaderboardEntry) => e.user_id === session.user.id))
        setLoading(false)
      })
    })
  }, [router, supabase.auth])

  async function joinLeaderboard() {
    if (!token || !displayName.trim()) return
    setJoining(true)
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ display_name: displayName }),
    })
    if (res.ok) {
      const data = await fetch('/api/leaderboard').then(r => r.json())
      setEntries(data)
      setJoined(true)
      setShowJoin(false)
    }
    setJoining(false)
  }

  async function leaveLeaderboard() {
    if (!token || !confirm('Leave the leaderboard?')) return
    await fetch('/api/leaderboard', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setEntries(prev => prev.filter(e => e.user_id !== userId))
    setJoined(false)
  }

  const rankIcon = (i: number) => {
    if (i === 0) return <Crown size={14} className="text-amber-500" />
    if (i === 1) return <Medal size={14} className="text-gray-400" />
    if (i === 2) return <Medal size={14} className="text-amber-700" />
    return <span className="text-xs text-gray-400 w-3.5 text-center">{i + 1}</span>
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar profile={profile} />
      <main className="flex-1 p-5 mobile-pt max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-sm font-medium text-gray-900">Leaderboard</h1>
            <p className="text-xs text-gray-400 mt-0.5">Top streaks this week</p>
          </div>
          {!joined ? (
            <button onClick={() => setShowJoin(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-gray-300 transition-colors">
              <Plus size={12} /> Join
            </button>
          ) : (
            <button onClick={leaveLeaderboard}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors">
              <Trash2 size={12} /> Leave
            </button>
          )}
        </div>

        {showJoin && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
            <p className="text-xs text-gray-500 mb-2">Choose a display name for the leaderboard</p>
            <div className="flex gap-2">
              <input value={displayName} onChange={e => setDisplay(e.target.value)}
                placeholder="Your display name"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-400" />
              <button onClick={joinLeaderboard} disabled={joining}
                className="text-xs px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-50">
                {joining ? 'Joining…' : 'Join'}
              </button>
              <button onClick={() => setShowJoin(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse" />)}</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Trophy size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-1">No one on the leaderboard yet</p>
            <p className="text-xs text-gray-300">Be the first to join!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const isMe = entry.user_id === userId
              return (
                <div key={entry.id}
                  className={cn('flex items-center gap-3 px-3 py-3 rounded-xl border transition-all',
                    isMe ? 'bg-brand-50 border-brand-200' : 'bg-white border-gray-100'
                  )}>
                  <div className="w-5 flex items-center justify-center shrink-0">{rankIcon(i)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', isMe ? 'text-brand-800' : 'text-gray-900')}>
                      {entry.display_name} {isMe && <span className="text-xs text-brand-400">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-400">{entry.total_done} total check-ins</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 shrink-0">
                    <span className="text-lg">🔥</span>
                    <span className="text-sm font-medium text-gray-900">{entry.best_streak}d</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
