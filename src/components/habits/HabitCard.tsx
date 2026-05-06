'use client'
import { cn } from '@/lib/utils'
import { Flame } from 'lucide-react'
import type { Habit } from '@/types'

const CAT_PILL: Record<string, string> = {
  health:       'bg-emerald-50 text-emerald-700',
  productivity: 'bg-violet-50 text-violet-700',
  wellness:     'bg-blue-50 text-blue-700',
}

interface Props { habit: Habit; onToggle: () => void }

export default function HabitCard({ habit, onToggle }: Props) {
  const done   = habit.today_log?.status === 'done'
  const streak = habit.streak?.current_streak ?? 0

  return (
    <div onClick={onToggle}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all',
        done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100 hover:border-gray-200'
      )}>
      <div className={cn(
        'w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all',
        done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
      )}>
        {done && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <polyline points="1,3.5 3.5,6 8,1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-xs font-medium', done ? 'text-emerald-800 line-through opacity-50' : 'text-gray-900')}>
          {habit.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', CAT_PILL[habit.category])}>
            {habit.category}
          </span>
          {habit.target_time && (
            <span className="text-[10px] text-gray-400">{habit.target_time.slice(0, 5)}</span>
          )}
        </div>
      </div>

      {streak > 0 && (
        <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
          <Flame size={11} />
          <span className="text-[11px] font-medium">{streak}d</span>
        </div>
      )}
    </div>
  )
}
