'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { cn, CATEGORY_COLORS } from '@/lib/utils'
import type { HabitCategory, HabitFrequency } from '@/types'

const CATEGORIES: HabitCategory[]  = ['health', 'productivity', 'wellness']
const FREQUENCIES: HabitFrequency[] = ['daily', 'weekdays', 'weekends', 'custom']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props {
  token: string
  onClose: () => void
  onCreated: () => void
}

export default function AddHabitModal({ token, onClose, onCreated }: Props) {
  const [name, setName]             = useState('')
  const [description, setDesc]      = useState('')
  const [category, setCategory]     = useState<HabitCategory>('health')
  const [frequency, setFrequency]   = useState<HabitFrequency>('daily')
  const [customDays, setCustomDays] = useState<number[]>([1,2,3,4,5])
  const [targetTime, setTargetTime] = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  function toggleDay(d: number) {
    setCustomDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, description, category, frequency, custom_days: frequency === 'custom' ? customDays : null, target_time: targetTime || null, color: CATEGORY_COLORS[category] }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      onCreated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create habit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">New habit</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Morning run"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Description (optional)</label>
            <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Add some notes..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Category</label>
            <div className="flex gap-2">
              {CATEGORIES.map(c => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={cn('flex-1 py-1.5 rounded-lg text-sm border transition-colors', category === c ? 'border-brand-600 bg-brand-50 text-brand-800 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Frequency</label>
            <div className="grid grid-cols-4 gap-1.5">
              {FREQUENCIES.map(f => (
                <button key={f} type="button" onClick={() => setFrequency(f)}
                  className={cn('py-1.5 rounded-lg text-xs border transition-colors', frequency === f ? 'border-brand-600 bg-brand-50 text-brand-800 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                  {f}
                </button>
              ))}
            </div>
            {frequency === 'custom' && (
              <div className="flex gap-1 mt-2">
                {DAYS.map((d, i) => (
                  <button key={d} type="button" onClick={() => toggleDay(i)}
                    className={cn('flex-1 py-1 rounded text-xs border transition-colors', customDays.includes(i) ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-gray-200 text-gray-400')}>
                    {d[0]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Reminder time (optional)</label>
            <input type="time" value={targetTime} onChange={e => setTargetTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-800 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50">
            {loading ? 'Creating…' : 'Create habit'}
          </button>
        </form>
      </div>
    </div>
  )
}
