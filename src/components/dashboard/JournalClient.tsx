'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/ui/Sidebar'
import { format } from 'date-fns'
import { Save, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile, JournalEntry } from '@/types'

const MOODS = [
  { value: 1, emoji: '😔', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Meh' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
]

export default function JournalClient() {
  const [entries, setEntries]   = useState<JournalEntry[]>([])
  const [content, setContent]   = useState('')
  const [mood, setMood]         = useState<number>(3)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(true)
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [token, setToken]       = useState<string | null>(null)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)
      setProfile(session.user as unknown as Profile)
      fetch('/api/journal', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json()).then(data => {
          setEntries(data)
          // Pre-fill today's entry if exists
          const todayEntry = data.find((e: JournalEntry) => e.entry_date === format(new Date(), 'yyyy-MM-dd'))
          if (todayEntry) { setContent(todayEntry.content); setMood(todayEntry.mood ?? 3) }
        }).finally(() => setLoading(false))
    })
  }, [router, supabase.auth])

  async function save() {
    if (!token || !content.trim()) return
    setSaving(true)
    await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content, mood }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // Refresh entries
    fetch('/api/journal', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setEntries)
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <main className="flex-1 p-6 mobile-pt max-w-3xl">
        <div className="mb-6">
          <h1 className="text-lg font-medium text-gray-900">Journal</h1>
          <p className="text-sm text-gray-400">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>

        {/* Today's entry */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Today&apos;s entry</h2>

          {/* Mood picker */}
          <div className="flex gap-2 mb-4">
            {MOODS.map(m => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-colors',
                  mood === m.value
                    ? 'border-brand-400 bg-brand-50 text-brand-800'
                    : 'border-gray-100 text-gray-400 hover:border-gray-200'
                )}
              >
                <span className="text-lg">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="How did your habits go today? What's on your mind?"
            rows={5}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-400 resize-none text-gray-700 placeholder:text-gray-300"
          />

          <button
            onClick={save}
            disabled={saving || !content.trim()}
            className="mt-3 flex items-center gap-1.5 text-sm px-4 py-2 bg-brand-600 hover:bg-brand-800 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save size={13} />
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save entry'}
          </button>
        </div>

        {/* Past entries */}
        <div>
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Past entries</h2>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : entries.filter(e => e.entry_date !== format(new Date(), 'yyyy-MM-dd')).length === 0 ? (
            <div className="text-center py-10 text-gray-300">
              <BookOpen size={32} className="mx-auto mb-2" />
              <p className="text-sm">No past entries yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries
                .filter(e => e.entry_date !== format(new Date(), 'yyyy-MM-dd'))
                .map(entry => {
                  const moodEmoji = MOODS.find(m => m.value === entry.mood)?.emoji
                  return (
                    <div key={entry.id} className="bg-white rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">
                          {format(new Date(entry.entry_date), 'EEEE, MMM d')}
                        </span>
                        {moodEmoji && <span className="text-base">{moodEmoji}</span>}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{entry.content}</p>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
