'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/ui/Sidebar'
import { Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface Template {
  id: string
  name: string
  emoji: string
  category_tag: string
  habits: { name: string; category: string; frequency: string }[]
}

const CAT_COLORS: Record<string, string> = {
  health: 'bg-emerald-50 text-emerald-700',
  productivity: 'bg-violet-50 text-violet-700',
  wellness: 'bg-blue-50 text-blue-700',
}

export default function TemplatesClient() {
  const [templates, setTemplates]   = useState<Template[]>([])
  const [loading, setLoading]       = useState(true)
  const [adding, setAdding]         = useState<string | null>(null)
  const [added, setAdded]           = useState<Set<string>>(new Set())
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [token, setToken]           = useState<string | null>(null)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)
      setProfile(session.user as unknown as Profile)
    })
    fetch('/api/templates').then(r => r.json()).then(setTemplates).finally(() => setLoading(false))
  }, [router, supabase.auth])

  async function addTemplate(templateId: string) {
    if (!token) return
    setAdding(templateId)
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ templateId }),
    })
    if (res.ok) setAdded(prev => new Set([...prev, templateId]))
    setAdding(null)
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar profile={profile} />
      <main className="flex-1 p-5 mobile-pt max-w-2xl">
        <div className="mb-5">
          <h1 className="text-sm font-medium text-gray-900">Habit templates</h1>
          <p className="text-xs text-gray-400 mt-0.5">Add a pre-built habit pack in one click</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {templates.map(t => {
              const isAdded   = added.has(t.id)
              const isAdding  = adding === t.id
              return (
                <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col">
                  <div className="text-2xl mb-2">{t.emoji}</div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">{t.name}</h3>
                  <div className="space-y-1 flex-1 mb-3">
                    {t.habits.map(h => (
                      <div key={h.name} className="flex items-center gap-1.5">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', CAT_COLORS[h.category])}>
                          {h.category}
                        </span>
                        <span className="text-[11px] text-gray-600 truncate">{h.name}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addTemplate(t.id)}
                    disabled={isAdded || isAdding}
                    className={cn(
                      'w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg transition-colors',
                      isAdded
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-brand-600 hover:bg-brand-800 text-white disabled:opacity-50'
                    )}>
                    {isAdded ? <><Check size={11} /> Added</> : isAdding ? 'Adding…' : <><Plus size={11} /> Add pack</>}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
