import Link from 'next/link'
import { ArrowRight, BarChart2, Brain, Flame, Check } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 max-w-5xl mx-auto">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-brand-600" />
          <span className="font-medium text-sm text-gray-900">Habitflow</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Sign in</Link>
          <Link href="/login" className="text-sm bg-brand-600 hover:bg-brand-800 text-white px-4 py-1.5 rounded-lg transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs px-3 py-1 rounded-full mb-6 border border-brand-100">
          <Flame size={11} /> Build habits that stick
        </div>
        <h1 className="text-5xl font-semibold text-gray-900 mb-4 leading-tight tracking-tight">
          Track habits.<br />Build streaks.<br />
          <span className="text-brand-600">Get smarter with AI.</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-md mx-auto mb-8">
          Habitflow helps you build lasting habits with streaks, analytics, and a personal AI coach that actually knows your patterns.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/login"
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-800 text-white px-6 py-3 rounded-xl font-medium transition-colors">
            Start for free <ArrowRight size={15} />
          </Link>
          <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Already have an account →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Flame,
              color: 'text-amber-500',
              bg: 'bg-amber-50',
              title: 'Streaks & tracking',
              desc: 'Check off habits daily, build streaks, and see your progress at a glance.',
            },
            {
              icon: BarChart2,
              color: 'text-brand-600',
              bg: 'bg-brand-50',
              title: 'Deep analytics',
              desc: '90-day heatmap, weekly charts, and per-habit breakdown to see what\'s working.',
            },
            {
              icon: Brain,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
              title: 'AI habit coach',
              desc: 'Chat with an AI that knows your habits and gives personalized advice.',
            },
          ].map(f => {
            const Icon = f.icon
            return (
              <div key={f.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className={`w-9 h-9 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon size={16} className={f.color} />
                </div>
                <h3 className="font-medium text-gray-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-10">Everything you need to build better habits</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            {[
              'Daily check-ins', 'Streak tracking', 'AI insights', 'Analytics heatmap',
              'Mood journal', 'Email reminders', 'Dark mode', 'Mobile friendly',
            ].map(feature => (
              <div key={feature} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <Check size={9} className="text-brand-600" strokeWidth={3} />
                </div>
                <span className="text-sm text-gray-600">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold text-gray-900 mb-4">Ready to build better habits?</h2>
        <p className="text-gray-500 mb-8">Free to use. No credit card required.</p>
        <Link href="/login"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-800 text-white px-8 py-3 rounded-xl font-medium transition-colors">
          Get started free <ArrowRight size={15} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-600" />
            <span className="text-xs text-gray-400">Habitflow</span>
          </div>
          <span className="text-xs text-gray-400">Built with Next.js + Supabase + Claude AI</span>
        </div>
      </footer>
    </div>
  )
}
