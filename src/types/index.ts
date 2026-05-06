export type HabitCategory = 'health' | 'productivity' | 'wellness'
export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom'
export type LogStatus = 'done' | 'skipped' | 'missed'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  description: string | null
  category: HabitCategory
  frequency: HabitFrequency
  custom_days: number[] | null
  target_time: string | null
  color: string
  icon: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  // joined
  streak?: Streak
  today_log?: HabitLog | null
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  log_date: string
  status: LogStatus
  note: string | null
  created_at: string
}

export interface Streak {
  id: string
  habit_id: string
  user_id: string
  current_streak: number
  longest_streak: number
  last_log_date: string | null
  updated_at: string
}

export interface JournalEntry {
  id: string
  user_id: string
  entry_date: string
  content: string
  mood: number | null
  created_at: string
}

// API response shapes
export interface HabitWithStats extends Habit {
  streak: Streak
  completion_rate_7d: number
  logs_7d: HabitLog[]
}

export interface DashboardData {
  habits: HabitWithStats[]
  today_done: number
  today_total: number
  current_streak: number
  weekly_rate: number
}
