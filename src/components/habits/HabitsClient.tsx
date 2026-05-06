'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/ui/Sidebar'
import AddHabitModal from '@/components/habits/AddHabitModal'
import { Pencil, Trash2, Plus, Flame, Check, X } from 'lucide-react'
import { cn, CATEGORY_BG, CATEGORY_COLORS } from '@/lib/utils'
import type { Habit, Profile, HabitCategory } from '@/types'

const CATEGORIES: HabitCategory[] = ['health', 'productivity', 'wellness']

export default function HabitsClient() {
  const [habits, setHabits]     = useState<Habit[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCat, setEditCat]   = useState<HabitCategory>('health')
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [token, setToken]       = useState<string | null>(null)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)
      setProfile(session.user as unknown as Profile)
      fetchHabits(session.access_token)
    })
  }, [router, supabase.auth])

  async function fetchHabits(tok: string) {
    const res = await fetch('/api/habits', { headers: { Authorization: `Bearer ${tok}` } })
    if (res.ok) setHabits(await res.json())
    setLoading(false)
  }

  async function deleteHabit(id: string) {
    if (!token || !confirm('Delete this habit? This cannot be undone.')) return
    await fetch(`/api/habits/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  async function saveEdit(id: string) {
    if (!token) return
    await fetch(`/api/habits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: editName, category: editCat, color: CATEGORY_COLORS[editCat] }),
    })
    setEditId(null)
    fetchHabits(token)
  }

  function startEdit(habit: Habit) {
    setEditId(habit.id)
    setEditName(habit.name)
    setEditCat(habit.category)
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = habits.filter(h => h.category === cat)
    return acc
  }, {} as Record<string, Habit[]>)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <main className="flex-1 p-6 mobile-pt max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium text-gray-900">All habits</h1>
            <p className="text-sm text-gray-400">{habits.length} habits total</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
            <Plus size={14} /> Add habit
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : habits.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm mb-2">No habits yet.</p>
            <button onClick={() => setShowAdd(true)} className="text-brand-600 text-sm hover:underline">Add your first habit</button>
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORIES.map(cat => grouped[cat].length > 0 && (
              <div key={cat}>
                <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 capitalize">{cat}</h2>
                <div className="space-y-2">
                  {grouped[cat].map(habit => (
                    <div key={habit.id} className="bg-white rounded-xl border border-gray-100 p-4">
                      {editId === habit.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editName} onChange={e => setEditName(e.target.value)}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-400"
                          />
                          <div className="flex gap-1">
                            {CATEGORIES.map(c => (
                              <button key={c} onClick={() => setEditCat(c)}
                                className={cn('px-2 py-1 rounded text-xs border', editCat === c ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-400')}>
                                {c}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => saveEdit(habit.id)} className="text-emerald-500 hover:text-emerald-700"><Check size={16} /></button>
                          <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: habit.color }} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{habit.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={cn('text-xs px-1.5 py-0.5 rounded-md', CATEGORY_BG[habit.category])}>{habit.category}</span>
                              <span className="text-xs text-gray-400 capitalize">{habit.frequency}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-amber-500 mr-2">
                            <Flame size={13} />
                            <span className="text-xs">{habit.streak?.current_streak ?? 0}d</span>
                          </div>
                          <button onClick={() => startEdit(habit)} className="text-gray-300 hover:text-gray-500 transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => deleteHabit(habit.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showAdd && token && (
        <AddHabitModal token={token} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); fetchHabits(token) }} />
      )}
    </div>
  )
}
