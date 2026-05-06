'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { CATEGORY_COLORS } from '@/lib/utils'
import { Check, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const TEMPLATE_PACKS = [
  {
    id: 'morning',
    name: 'Morning Routine',
    emoji: '🌅',
    description: 'Start every day with intention',
    habits: [
      { name: 'Wake up early', category: 'productivity', frequency: 'daily' },
      { name: 'Drink water', category: 'health', frequency: 'daily' },
      { name: 'Morning walk', category: 'health', frequency: 'daily' },
      { name: 'Journal', category: 'wellness', frequency: 'daily' },
    ],
  },
  {
    id: 'fitness',
    name: 'Fitness',
    emoji: '💪',
    description: 'Build a stronger body',
    habits: [
      { name: 'Workout', category: 'health', frequency: 'weekdays' },
      { name: 'Drink 2L water', category: 'health', frequency: 'daily' },
      { name: 'Stretch', category: 'health', frequency: 'daily' },
      { name: 'Sleep 8 hours', category: 'health', frequency: 'daily' },
    ],
  },
  {
    id: 'focus',
    name: 'Deep Focus',
    emoji: '🧠',
    description: 'Level up your productivity',
    habits: [
      { name: 'Deep work block', category: 'productivity', frequency: 'weekdays' },
      { name: 'Read 20 pages', category: 'productivity', frequency: 'daily' },
      { name: 'No phone before 9am', category: 'wellness', frequency: 'daily' },
      { name: 'Plan tomorrow', category: 'productivity', frequency: 'daily' },
    ],
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness',
    emoji: '🧘',
    description: 'Calm your mind, build resilience',
    habits: [
      { name: 'Meditate 10 min', category: 'wellness', frequency: 'daily' },
      { name: 'Gratitude journal', category: 'wellness', frequency: 'daily' },
      { name: 'Digital detox hour', category: 'wellness', frequency: 'daily' },
      { name: 'Evening walk', category: 'health', frequency: 'daily' },
    ],
  },
]

type Step = 'welcome' | 'templates' | 'custom' | 'done'

export default function OnboardingClient() {
  const [step, setStep]             = useState<Step>('welcome')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [customName, setCustomName] = useState('')
  const [loading, setLoading]       = useState(false)
  const [token, setToken]           = useState<string | null>(null)
  const [userName, setUserName]     = useState('')
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)
      setUserName(session.user.user_metadata?.full_name?.split(' ')[0] ?? 'there')
    })
  }, [router, supabase.auth])

  function togglePack(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function createHabits() {
    if (!token) return
    setLoading(true)
    const habitsToCreate = TEMPLATE_PACKS
      .filter(p => selected.has(p.id))
      .flatMap(p => p.habits)

    if (customName.trim()) {
      habitsToCreate.push({ name: customName.trim(), category: 'productivity', frequency: 'daily' })
    }

    await Promise.all(habitsToCreate.map(h =>
      fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...h, color: CATEGORY_COLORS[h.category] }),
      })
    ))
    setLoading(false)
    setStep('done')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Welcome step */}
        {step === 'welcome' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-3">
              Welcome{userName !== 'there' ? `, ${userName}` : ''}! 👋
            </h1>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              Habitflow helps you build lasting habits with streaks, analytics, and AI coaching. Let's get you set up in 60 seconds.
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button onClick={() => setStep('templates')}
                className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-800 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                Get started <ArrowRight size={16} />
              </button>
              <button onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Skip, I'll set up manually
              </button>
            </div>
          </div>
        )}

        {/* Template selection step */}
        {step === 'templates' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Pick your habit packs</h2>
              <p className="text-gray-500 text-sm">Select one or more to get started instantly. You can always edit later.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {TEMPLATE_PACKS.map(pack => {
                const isSelected = selected.has(pack.id)
                return (
                  <button key={pack.id} onClick={() => togglePack(pack.id)}
                    className={cn(
                      'relative text-left p-4 rounded-xl border-2 transition-all',
                      isSelected ? 'border-brand-600 bg-brand-50' : 'border-gray-100 bg-white hover:border-gray-200'
                    )}>
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center">
                        <Check size={11} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                    <div className="text-2xl mb-2">{pack.emoji}</div>
                    <div className="font-medium text-sm text-gray-900 mb-0.5">{pack.name}</div>
                    <div className="text-xs text-gray-400">{pack.description}</div>
                    <div className="mt-2 space-y-0.5">
                      {pack.habits.map(h => (
                        <div key={h.name} className="text-xs text-gray-400 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full inline-block" style={{ background: CATEGORY_COLORS[h.category] }} />
                          {h.name}
                        </div>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mb-5">
              <label className="block text-sm text-gray-600 mb-1.5">Or add one custom habit</label>
              <input value={customName} onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Practice guitar"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-400" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('welcome')}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                Back
              </button>
              <button
                onClick={createHabits}
                disabled={loading || (selected.size === 0 && !customName.trim())}
                className="flex-2 flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-800 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {loading ? 'Creating habits…' : <>Create habits <ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">You&apos;re all set!</h2>
            <p className="text-gray-500 mb-8">
              Your habits are ready. Start checking them off today and build your first streak!
            </p>
            <button onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-800 text-white px-8 py-3 rounded-xl font-medium transition-colors mx-auto">
              Go to dashboard <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
