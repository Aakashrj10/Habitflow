'use client'
import { useState } from 'react'
import { TrendingUp, AlertCircle, Lightbulb, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Insight { type: 'strength' | 'weakness' | 'suggestion'; title: string; body: string }
interface AIResponse { insights: Insight[]; weekly_focus: string; new_habit_suggestion: { name: string; category: string; reason: string } }

const typeConfig = {
  strength:   { icon: TrendingUp,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  weakness:   { icon: AlertCircle, color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
  suggestion: { icon: Lightbulb,   color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-100' },
}

export default function AIInsightsPanel({ token }: { token: string }) {
  const [data, setData]       = useState<AIResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function fetchInsights() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/suggestions', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to get suggestions')
      setData(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-600" />
          <h2 className="text-xs font-medium text-gray-900">AI insights</h2>
        </div>
        <button onClick={fetchInsights} disabled={loading}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          {data ? 'Refresh' : 'Analyze'}
        </button>
      </div>

      {!data && !loading && !error && (
        <div className="text-center py-5">
          <p className="text-xs text-gray-400 mb-2.5">Personalized suggestions from your last 30 days.</p>
          <button onClick={fetchInsights}
            className="text-xs bg-brand-600 hover:bg-brand-800 text-white px-3 py-1.5 rounded-lg transition-colors">
            Analyze my habits
          </button>
        </div>
      )}

      {loading && <div className="space-y-1.5">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}</div>}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {data && (
        <div className="space-y-2">
          <div className="bg-violet-50 border border-violet-100 rounded-lg p-2.5">
            <p className="text-[10px] font-medium text-violet-800 mb-0.5 uppercase tracking-wider">This week</p>
            <p className="text-xs text-violet-700">{data.weekly_focus}</p>
          </div>
          {data.insights.map((insight, i) => {
            const config = typeConfig[insight.type]; const Icon = config.icon
            return (
              <div key={i} className={cn('border rounded-lg p-2.5', config.bg)}>
                <div className="flex items-start gap-1.5">
                  <Icon size={12} className={cn('mt-0.5 shrink-0', config.color)} />
                  <div>
                    <p className="text-[10px] font-medium text-gray-900 mb-0.5">{insight.title}</p>
                    <p className="text-[11px] text-gray-600 leading-relaxed">{insight.body}</p>
                  </div>
                </div>
              </div>
            )
          })}
          {data.new_habit_suggestion && (
            <div className="border border-dashed border-gray-200 rounded-lg p-2.5">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">Suggested habit</p>
              <p className="text-xs font-medium text-gray-900">{data.new_habit_suggestion.name}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{data.new_habit_suggestion.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
