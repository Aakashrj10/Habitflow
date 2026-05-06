import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { today } from '@/lib/utils'

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

export async function POST(request: Request) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'Resend key missing' }, { status: 500 })
  const { Resend } = await import('resend')
  const resend = new Resend(resendKey)
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [{ data: habits }, { data: logs }] = await Promise.all([
    getClient().from('habits').select('*').eq('user_id', user.id).eq('is_active', true),
    getClient().from('habit_logs').select('*').eq('user_id', user.id).eq('log_date', today()),
  ])
  if (!habits) return NextResponse.json({ error: 'No habits' }, { status: 400 })
  const doneLogs = (logs as any[] ?? []).filter((l: any) => l.status === 'done')
  const done = doneLogs.length
  const total = (habits as any[]).length
  const pending = (habits as any[]).filter((h: any) => !doneLogs.find((l: any) => l.habit_id === h.id))
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://habitflow.vercel.app'
  const subject = done === total ? 'All habits done today!' : `${pending.length} habits left today`
  const html = `<h2>Habitflow</h2><p>${done}/${total} habits done.</p><a href="${appUrl}/dashboard">Open app</a>`
  const { error } = await resend.emails.send({
    from: 'Habitflow <onboarding@resend.dev>',
    to: user.email,
    subject,
    html,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, sent_to: user.email })
}
