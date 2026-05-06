'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/ui/Sidebar'
import HabitCard from '@/components/habits/HabitCard'
import AddHabitModal from '@/components/habits/AddHabitModal'
import AIInsightsPanel from '@/components/dashboard/AIInsightsPanel'
import { useSession, useApi, invalidateCache } from '@/hooks/useApi'
import { useConfetti } from '@/hooks/useConfetti'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import type { Habit, Profile } from '@/types'

export default function DashboardClient({ profile: _profile }: { profile: Profile | null }) {
  const [showAdd, setShowAdd]       = useState(false)
  const [celebrated, setCelebrated] = useState(false)
  const router   = useRouter()
  const { fire } = useConfetti()
  const prevDone = useRef(0)

  const { token, email, name, ready } = useSession()
  const { data: habits, loading, refetch } = useApi<Habit[]>('/api/habits', token)

  useEffect(() => {
    if (ready && !token) router.push('/login')
  }, [ready, token, router])

  useEffect(() => {
    const done  = habits?.filter(h => h.today_log?.status === 'done').length ?? 0
    const total = habits?.length ?? 0
    if (total > 0 && done === total && prevDone.current < total && !celebrated) {
      fire(); setCelebrated(true)
    }
    if (done < total) setCelebrated(false)
    prevDone.current = done
  }, [habits, fire, celebrated])

  async function toggleHabit(habitId: string, currentStatus: string | undefined) {
    if (!token) return
    const newStatus = currentStatus === 'done' ? 'skipped' : 'done'
    // Optimistic update
    invalidateCache('/api/habits')
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ habit_id: habitId, status: newStatus }),
    })
    refetch()
  }

  const profile = { email, name } as unknown as Profile
  const done    = habits?.filter(h => h.today_log?.status === 'done').length ?? 0
  const total   = habits?.length ?? 0
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar profile={profile} />
      <main className="flex-1 p-5 mobile-pt max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-sm font-medium text-gray-900">
              {done === total && total > 0 ? '🎉 All done today!' : name ? `Hey, ${name.split(' ')[0]}` : "Today's habits"}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-gray-300 transition-colors">
            <Plus size={12} /> Add habit
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Done today',  value: `${done} / ${total}` },
            { label: 'Completion',  value: `${pct}%` },
            { label: 'Best streak', value: `${Math.max(0, ...(habits?.map(h => h.streak?.longest_streak ?? 0) ?? [0]))}d` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border border-gray-100 px-3 py-2.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-lg font-medium text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        {total > 0 && (
          <div className="bg-white rounded-lg border border-gray-100 px-3 py-2.5 mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] text-gray-400">{done} of {total} completed</span>
              <span className="text-[10px] text-gray-400">{pct}%</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <section className="mb-4">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Habits</p>
          {loading ? (
            <div className="space-y-1.5">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />)}</div>
          ) : !habits?.length ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-xs mb-1.5">No habits yet.</p>
              <button onClick={() => setShowAdd(true)} className="text-brand-600 text-xs hover:underline">Add your first habit</button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {habits.map(habit => (
                <HabitCard key={habit.id} habit={habit} onToggle={() => toggleHabit(habit.id, habit.today_log?.status)} />
              ))}
            </div>
          )}
        </section>

        {(habits?.length ?? 0) >= 2 && token && <AIInsightsPanel token={token} />}
      </main>

      {showAdd && token && (
        <AddHabitModal token={token} onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); invalidateCache('/api/habits'); refetch() }} />
      )}
    </div>
  )
}
