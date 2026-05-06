import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import type { HabitLog, Habit } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'yyyy-MM-dd')
}

export function today(): string {
  return formatDate(new Date())
}

export function getLast7Days(): string[] {
  return eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  }).map(formatDate)
}

export function getLast30Days(): string[] {
  return eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  }).map(formatDate)
}

// Calculate completion rate for a habit over a date range
export function calcCompletionRate(logs: HabitLog[], days: number): number {
  const dates = eachDayOfInterval({
    start: subDays(new Date(), days - 1),
    end: new Date(),
  }).map(formatDate)

  const doneDates = new Set(
    logs.filter(l => l.status === 'done').map(l => l.log_date)
  )
  const done = dates.filter(d => doneDates.has(d)).length
  return Math.round((done / days) * 100)
}

// Should a habit be shown today based on frequency?
export function isHabitDueToday(habit: Habit): boolean {
  const day = new Date().getDay() // 0=Sun, 6=Sat
  switch (habit.frequency) {
    case 'daily':    return true
    case 'weekdays': return day >= 1 && day <= 5
    case 'weekends': return day === 0 || day === 6
    case 'custom':   return habit.custom_days?.includes(day) ?? false
    default:         return true
  }
}

export const CATEGORY_COLORS: Record<string, string> = {
  health:       '#1D9E75',
  productivity: '#7F77DD',
  wellness:     '#378ADD',
}

export const CATEGORY_BG: Record<string, string> = {
  health:       'bg-emerald-50 text-emerald-700',
  productivity: 'bg-violet-50 text-violet-700',
  wellness:     'bg-blue-50 text-blue-700',
}
