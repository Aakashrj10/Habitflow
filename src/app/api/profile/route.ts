import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!) as any }

async function getUser(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = getClient()
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export async function PATCH(request: Request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getClient()
  const body = await request.json()

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: body.full_name })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
