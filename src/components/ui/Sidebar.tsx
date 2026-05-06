'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ListChecks, BarChart2, BookOpen, Settings, LogOut, Menu, X, Sun, Moon, Bot, Trophy, Medal, Layers } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import type { Profile } from '@/types'
import { useState } from 'react'

const nav = [
  { href: '/dashboard', label: 'Today',       icon: LayoutDashboard },
  { href: '/habits',    label: 'All habits',  icon: ListChecks },
  { href: '/analytics', label: 'Analytics',   icon: BarChart2 },
  { href: '/coach',        label: 'AI Coach',    icon: Bot },
  { href: '/achievements', label: 'Achievements', icon: Trophy },
  { href: '/leaderboard',  label: 'Leaderboard', icon: Medal },
  { href: '/templates',    label: 'Templates',   icon: Layers },
  { href: '/journal',   label: 'Journal',     icon: BookOpen },
  { href: '/settings',  label: 'Settings',    icon: Settings },
]

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const { theme, toggle } = useTheme()
  const [open, setOpen]   = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const email   = (profile as unknown as { email?: string })?.email ?? ''
  const initial = (profile as unknown as { user_metadata?: { full_name?: string } })?.user_metadata?.full_name?.[0] ?? email[0]?.toUpperCase() ?? '?'

  const NavContent = () => (
    <>
      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map(item => {
          const Icon   = item.icon
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
                active ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
              )}>
              <Icon size={13} strokeWidth={active ? 2.5 : 2} />{item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-2 border-t border-gray-100 space-y-0.5">
        <button onClick={toggle}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors">
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-xs font-medium text-violet-700 shrink-0">
            {initial}
          </div>
          <span className="text-xs text-gray-400 truncate flex-1">{email}</span>
        </div>
        <button onClick={signOut}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors">
          <LogOut size={13} />Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-brand-600" />
          <span className="font-medium text-sm text-gray-900">Habitflow</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="text-gray-400 p-1">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button onClick={() => setOpen(!open)} className="text-gray-500">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {open && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/20" onClick={() => setOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-48 bg-white flex flex-col pt-14" onClick={e => e.stopPropagation()}>
            <NavContent />
          </div>
        </div>
      )}
      <aside className="hidden md:flex w-48 shrink-0 bg-white border-r border-gray-100 flex-col h-screen sticky top-0">
        <div className="px-3 py-3.5 border-b border-gray-100 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-brand-600" />
          <span className="font-medium text-sm text-gray-900">Habitflow</span>
        </div>
        <NavContent />
      </aside>
    </>
  )
}
