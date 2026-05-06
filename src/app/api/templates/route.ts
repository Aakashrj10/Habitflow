import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as any
}

async function getUser(r: Request) {
  const token = r.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await getClient().auth.getUser(token)
  return user
}

const TEMPLATES = [
  { id: 'morning', name: 'Morning Routine', emoji: '🌅', category_tag: 'productivity',
    habits: [
      { name: 'Wake up early', category: 'productivity', frequency: 'daily', color: '#7F77DD' },
      { name: 'Drink water', category: 'health', frequency: 'daily', color: '#1D9E75' },
      { name: 'Morning walk', category: 'health', frequency: 'daily', color: '#1D9E75' },
      { name: 'Journal', category: 'wellness', frequency: 'daily', color: '#378ADD' },
    ]},
  { id: 'fitness', name: 'Fitness', emoji: '💪', category_tag: 'health',
    habits: [
      { name: 'Workout', category: 'health', frequency: 'weekdays', color: '#1D9E75' },
      { name: 'Drink 2L water', category: 'health', frequency: 'daily', color: '#1D9E75' },
      { name: 'Stretch', category: 'health', frequency: 'daily', color: '#1D9E75' },
      { name: 'Sleep 8 hours', category: 'health', frequency: 'daily', color: '#1D9E75' },
    ]},
  { id: 'focus', name: 'Deep Focus', emoji: '🧠', category_tag: 'productivity',
    habits: [
      { name: 'Deep work block', category: 'productivity', frequency: 'weekdays', color: '#7F77DD' },
      { name: 'Read 20 pages', category: 'productivity', frequency: 'daily', color: '#7F77DD' },
      { name: 'No phone before 9am', category: 'wellness', frequency: 'daily', color: '#378ADD' },
      { name: 'Plan tomorrow', category: 'productivity', frequency: 'daily', color: '#7F77DD' },
    ]},
  { id: 'mindfulness', name: 'Mindfulness', emoji: '🧘', category_tag: 'wellness',
    habits: [
      { name: 'Meditate 10 min', category: 'wellness', frequency: 'daily', color: '#378ADD' },
      { name: 'Gratitude journal', category: 'wellness', frequency: 'daily', color: '#378ADD' },
      { name: 'Digital detox hour', category: 'wellness', frequency: 'daily', color: '#378ADD' },
      { name: 'Evening walk', category: 'health', frequency: 'daily', color: '#1D9E75' },
    ]},
  { id: 'nutrition', name: 'Healthy Eating', emoji: '🥗', category_tag: 'health',
    habits: [
      { name: 'Eat vegetables', category: 'health', frequency: 'daily', color: '#1D9E75' },
      { name: 'No junk food', category: 'health', frequency: 'daily', color: '#1D9E75' },
      { name: 'Drink 2L water', category: 'health', frequency: 'daily', color: '#1D9E75' },
      { name: 'No eating after 8pm', category: 'health', frequency: 'daily', color: '#1D9E75' },
    ]},
  { id: 'learning', name: 'Learning', emoji: '📚', category_tag: 'productivity',
    habits: [
      { name: 'Read 30 min', category: 'productivity', frequency: 'daily', color: '#7F77DD' },
      { name: 'Practice a skill', category: 'productivity', frequency: 'daily', color: '#7F77DD' },
      { name: 'Watch educational content', category: 'productivity', frequency: 'daily', color: '#7F77DD' },
      { name: 'Review notes', category: 'productivity', frequency: 'weekdays', color: '#7F77DD' },
    ]},
  { id: 'sleep', name: 'Better Sleep', emoji: '😴', category_tag: 'health',
    habits: [
      { name: 'Sleep by 11pm', category: 'health', frequency: 'daily', color: '#1D9E75' },
      { name: 'No screens 1hr before bed', category: 'wellness', frequency: 'daily', color: '#378ADD' },
      { name: 'Wake up same time', category: 'health', frequency: 'daily', color: '#1D9E75' },
      { name: 'Evening wind down', category: 'wellness', frequency: 'daily', color: '#378ADD' },
    ]},
  { id: 'social', name: 'Social & Relationships', emoji: '❤️', category_tag: 'wellness',
    habits: [
      { name: 'Connect with a friend', category: 'wellness', frequency: 'daily', color: '#378ADD' },
      { name: 'Call family', category: 'wellness', frequency: 'weekends', color: '#378ADD' },
      { name: 'Random act of kindness', category: 'wellness', frequency: 'daily', color: '#378ADD' },
      { name: 'Express gratitude', category: 'wellness', frequency: 'daily', color: '#378ADD' },
    ]},
]

export async function GET() {
  return NextResponse.json(TEMPLATES)
}

export async function POST(request: Request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { templateId } = await request.json()
  const template = TEMPLATES.find(t => t.id === templateId)
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const db = getClient()
  const results = await Promise.all(
    template.habits.map((h: any) =>
      db.from('habits').insert({ user_id: user.id, ...h }).select().single()
    )
  )
  const errors = results.filter((r: any) => r.error)
  if (errors.length > 0) return NextResponse.json({ error: 'Some habits failed to create' }, { status: 500 })
  return NextResponse.json({ success: true, created: template.habits.length })
}
