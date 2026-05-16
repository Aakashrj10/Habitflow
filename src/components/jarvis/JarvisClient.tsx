'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Mic, MicOff, Send, Zap, Sun, Clock, BarChart2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import Link from 'next/link'

interface Message { role: 'user' | 'assistant'; content: string; timestamp?: Date }

export default function JarvisClient() {
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [token, setToken]         = useState<string | null>(null)
  const [ctx, setCtx]             = useState<any>(null)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recognRef = useRef<any>(null)
  const tokenRef  = useRef<string | null>(null)
  const didInit   = useRef(false)
  const router    = useRouter()
  const supabase  = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      tokenRef.current = session.access_token
      setToken(session.access_token)
    })
  }, [])

  useEffect(() => {
    if (!token || didInit.current) return
    didInit.current = true
    doFetch([], 'briefing')
  }, [token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, streaming])

  function speak(text: string) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text.replace(/[*_~`#]/g, ''))
    utt.rate = 1.1; utt.pitch = 0.9
    const v = window.speechSynthesis.getVoices().find(v => v.name.includes('Google UK English Male') || v.name.includes('Daniel'))
    if (v) utt.voice = v
    utt.onstart = () => setSpeaking(true)
    utt.onend = utt.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
  }

  async function doFetch(msgs: Message[], mode?: string) {
    const tok = tokenRef.current
    if (!tok) return
    setLoading(true)

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ messages: msgs.map(m => ({ role: m.role, content: m.content })), mode }),
      })

      const contentType = res.headers.get('content-type') ?? ''

      // Streaming response (Ollama)
      if (contentType.includes('text/event-stream') && res.body) {
        setLoading(false)
        setStreaming(true)
        let fullText = ''
        const aiMsg: Message = { role: 'assistant', content: '', timestamp: new Date() }
        setMessages(prev => [...prev, aiMsg])

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.token) {
                fullText += data.token
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullText }
                  return updated
                })
              }
              if (data.done && data.context) {
                setCtx(data.context)
                speak(fullText)
              }
            } catch {}
          }
        }
        setStreaming(false)
      } else {
        // Non-streaming fallback
        const data = await res.json()
        if (data.context) setCtx(data.context)
        const reply = data.message ?? 'Something went wrong.'
        setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }])
        speak(reply)
        setLoading(false)
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error: ' + e.message }])
      setLoading(false)
      setStreaming(false)
    }
  }

  function sendMessage(content: string, mode?: string) {
    if (content) {
      const userMsg: Message = { role: 'user', content, timestamp: new Date() }
      setMessages(prev => {
        doFetch([...prev, userMsg], mode)
        return [...prev, userMsg]
      })
      setInput('')
    } else {
      doFetch(messages, mode)
    }
  }

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Voice not supported. Use Chrome.'); return }
    const r = new SR()
    r.lang = 'en-US'
    let sent = false
    r.onresult = (e: any) => {
      if (sent) return
      sent = true
      setListening(false)
      sendMessage(e.results[0][0].transcript)
    }
    r.onerror = () => setListening(false)
    r.onend   = () => setListening(false)
    r.start(); recognRef.current = r; setListening(true)
  }

  const pct = ctx ? Math.round((ctx.habits_today.done / Math.max(ctx.habits_today.total, 1)) * 100) : 0
  const isThinking = loading || streaming

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-300 text-xs">← Dashboard</Link>
        <div className="flex items-center gap-2">
          <div className={cn('w-1.5 h-1.5 rounded-full transition-colors',
            speaking ? 'bg-blue-400 animate-pulse' : streaming ? 'bg-green-400 animate-pulse' : loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400')} />
          <span className="text-xs text-gray-400">JARVIS {streaming && '· typing...'}</span>
        </div>
        <div className="text-xs text-gray-500">{format(new Date(), 'HH:mm')}</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex w-56 border-r border-gray-800 flex-col p-4 gap-3 shrink-0">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Status</p>
          <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <p className="text-[10px] text-gray-500 mb-2">TODAY</p>
            <div className="flex items-end gap-1 mb-1.5">
              <span className="text-2xl font-medium">{ctx?.habits_today.done ?? '—'}</span>
              <span className="text-gray-500 text-sm mb-0.5">/ {ctx?.habits_today.total ?? '—'}</span>
            </div>
            <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          {([
            { icon: Zap,       label: 'Best streak', value: ctx ? `${ctx.best_streak}d` : '—' },
            { icon: Sun,       label: 'Avg mood',    value: ctx?.avg_mood_7d ? `${ctx.avg_mood_7d}/5` : '—' },
            { icon: Clock,     label: 'Yesterday',   value: ctx ? `${ctx.yesterday_completion}%` : '—' },
            { icon: BarChart2, label: 'Habits',      value: ctx ? `${ctx.habit_patterns?.length ?? 0}` : '—' },
          ] as any[]).map((s: any) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="flex items-center gap-2.5 px-1">
                <Icon size={12} className="text-gray-500 shrink-0" />
                <span className="text-xs text-gray-500 flex-1">{s.label}</span>
                <span className="text-xs font-medium text-gray-300">{s.value}</span>
              </div>
            )
          })}
          <div className="mt-2 space-y-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Quick ask</p>
            {['Morning briefing','How am I doing?','What should I focus on?','Weekly review'].map(q => (
              <button key={q} onClick={() => sendMessage(q)} disabled={isThinking}
                className="w-full text-left text-[11px] text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5 disabled:opacity-40">
                <ChevronRight size={10} className="shrink-0" />{q}
              </button>
            ))}
          </div>
          {ctx?.habits_today.pending?.length > 0 && (
            <div className="mt-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Pending</p>
              {ctx.habits_today.pending.map((h: string) => (
                <div key={h} className="text-[11px] text-gray-600 px-2 py-0.5 flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />{h}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {messages.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                  <div className="w-6 h-6 rounded-full bg-blue-400 animate-pulse" />
                </div>
                <p className="text-gray-400 text-sm">Initializing Jarvis...</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <div className={cn('w-2.5 h-2.5 rounded-full bg-blue-400', streaming && i === messages.length - 1 && 'animate-pulse')} />
                  </div>
                )}
                <div className={cn('max-w-lg rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user' ? 'bg-gray-800 text-gray-200 rounded-tr-sm' : 'bg-gray-900 border border-gray-800 text-gray-100 rounded-tl-sm')}>
                  {msg.content}
                  {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                    <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse align-middle" />
                  )}
                  {msg.timestamp && <p className="text-[10px] text-gray-600 mt-1.5">{format(msg.timestamp, 'HH:mm')}</p>}
                </div>
              </div>
            ))}
            {loading && !streaming && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-5 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { label: '☀️ Briefing', mode: 'briefing' },
              { label: '🔍 Check-in', mode: 'checkin' },
              { label: '📊 Week review', mode: 'review' },
              { label: '💡 Tip', msg: 'Give me one habit tip' },
              { label: '🎯 Focus', msg: 'What should I focus on?' },
            ].map((p: any) => (
              <button key={p.label} onClick={() => p.mode ? sendMessage('', p.mode) : sendMessage(p.msg)}
                disabled={isThinking}
                className="text-[11px] px-3 py-1.5 rounded-full border border-gray-700 text-gray-400 hover:border-blue-500/50 hover:text-blue-400 transition-colors whitespace-nowrap disabled:opacity-40">
                {p.label}
              </button>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-gray-800">
            <div className="flex gap-2 items-center">
              <button onClick={listening ? () => { recognRef.current?.stop(); setListening(false) } : startListening}
                disabled={isThinking}
                className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0',
                  listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>
                {listening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && input.trim() && !isThinking && sendMessage(input)}
                placeholder={listening ? 'Listening...' : isThinking ? 'Jarvis is thinking...' : 'Ask Jarvis anything...'}
                disabled={isThinking}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 outline-none focus:border-blue-500/50 disabled:opacity-60" />
              {speaking && (
                <button onClick={() => { window.speechSynthesis?.cancel(); setSpeaking(false) }}
                  className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 animate-pulse">
                  <div className="w-3 h-3 bg-blue-400 rounded-sm" />
                </button>
              )}
              <button onClick={() => input.trim() && !isThinking && sendMessage(input)} disabled={isThinking || !input.trim()}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-xl flex items-center justify-center shrink-0 transition-colors">
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
