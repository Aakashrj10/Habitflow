'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/ui/Sidebar'
import { Send, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface Message { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  "How are my habits looking this week?",
  "Why do I keep skipping evening habits?",
  "What habit should I add next?",
  "Help me build a morning routine",
  "I'm losing motivation, help me",
]

export default function CoachClient() {
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [token, setToken]         = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router    = useRouter()
  const supabase  = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)
      setProfile(session.user as unknown as Profile)
      // Welcome message
      setMessages([{
        role: 'assistant',
        content: "Hey! I'm your habit coach. I've looked at your habit data and I'm here to help you build better routines. What's on your mind?",
      }])
    })
  }, [router, supabase.auth])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(content: string) {
    if (!token || !content.trim() || loading) return
    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Try again!' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar profile={profile} />
      <main className="flex-1 flex flex-col mobile-pt max-w-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-medium text-gray-900">AI Habit Coach</h1>
              <p className="text-[10px] text-gray-400">Powered by Claude · knows your habits</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                msg.role === 'user' ? 'bg-brand-600' : 'bg-gray-200'
              )}>
                {msg.role === 'user'
                  ? <User size={12} className="text-white" />
                  : <Bot size={12} className="text-gray-600" />}
              </div>
              <div className={cn(
                'max-w-xs rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-tr-sm'
                  : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm'
              )}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                <Bot size={12} className="text-gray-600" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-3 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Ask your habit coach..."
              className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
            <button onClick={() => send(input)} disabled={loading || !input.trim()}
              className="w-9 h-9 bg-brand-600 hover:bg-brand-800 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0">
              <Send size={14} />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
