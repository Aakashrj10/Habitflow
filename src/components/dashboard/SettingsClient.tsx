'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/ui/Sidebar'
import { User, Lock, Bell, Trash2, Check, Send } from 'lucide-react'
import type { Profile } from '@/types'

export default function SettingsClient() {
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [newPassword, setNewPass] = useState('')
  const [confirmPass, setConfirm] = useState('')
  const [saving, setSaving]       = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [msg, setMsg]             = useState('')
  const [passMsg, setPassMsg]     = useState('')
  const [reminderMsg, setReminderMsg] = useState('')
  const [token, setToken]         = useState<string | null>(null)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)
      const u = session.user
      setProfile(u as unknown as Profile)
      setEmail(u.email ?? '')
      setFullName((u.user_metadata?.full_name as string) ?? '')
    })
  }, [router, supabase.auth])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg('')
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } })
    if (!error && token) {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName }),
      })
    }
    setSaving(false)
    setMsg(error ? error.message : 'Profile updated!')
    setTimeout(() => setMsg(''), 3000)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPass) { setPassMsg('Passwords do not match'); return }
    if (newPassword.length < 6) { setPassMsg('Password must be at least 6 characters'); return }
    setSavingPass(true); setPassMsg('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPass(false)
    setPassMsg(error ? error.message : 'Password updated!')
    setNewPass(''); setConfirm('')
    setTimeout(() => setPassMsg(''), 3000)
  }

  async function sendReminder() {
    if (!token) return
    setSendingReminder(true); setReminderMsg('')
    const res = await fetch('/api/reminders/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setSendingReminder(false)
    setReminderMsg(res.ok ? `Reminder sent to ${data.sent_to}!` : data.error)
    setTimeout(() => setReminderMsg(''), 4000)
  }

  async function deleteAccount() {
    if (!confirm('Are you sure? This will permanently delete your account and all your data.')) return
    if (!confirm('Last warning — are you absolutely sure?')) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile} />
      <main className="flex-1 p-6 mobile-pt max-w-xl">
        <div className="mb-6">
          <h1 className="text-lg font-medium text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400">Manage your account</p>
        </div>

        <div className="space-y-5">
          {/* Profile */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <User size={15} className="text-gray-400" />
              <h2 className="text-sm font-medium text-gray-900">Profile</h2>
            </div>
            <form onSubmit={saveProfile} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Full name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                <input value={email} disabled
                  className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
              </div>
              {msg && (
                <p className={`text-xs flex items-center gap-1 ${msg.includes('updated') ? 'text-emerald-600' : 'text-red-500'}`}>
                  {msg.includes('updated') && <Check size={12} />}{msg}
                </p>
              )}
              <button type="submit" disabled={saving}
                className="text-sm px-4 py-2 bg-brand-600 hover:bg-brand-800 text-white rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          </div>

          {/* Password */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={15} className="text-gray-400" />
              <h2 className="text-sm font-medium text-gray-900">Change password</h2>
            </div>
            <form onSubmit={changePassword} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">New password</label>
                <input type="password" value={newPassword} onChange={e => setNewPass(e.target.value)}
                  placeholder="••••••••" minLength={6}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Confirm new password</label>
                <input type="password" value={confirmPass} onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              {passMsg && (
                <p className={`text-xs flex items-center gap-1 ${passMsg.includes('updated') ? 'text-emerald-600' : 'text-red-500'}`}>
                  {passMsg.includes('updated') && <Check size={12} />}{passMsg}
                </p>
              )}
              <button type="submit" disabled={savingPass}
                className="text-sm px-4 py-2 bg-brand-600 hover:bg-brand-800 text-white rounded-lg transition-colors disabled:opacity-50">
                {savingPass ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>

          {/* Reminders */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell size={15} className="text-gray-400" />
              <h2 className="text-sm font-medium text-gray-900">Email reminders</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Send yourself an email summary of today&apos;s habits — what&apos;s done and what&apos;s left.
            </p>
            {reminderMsg && (
              <p className={`text-xs mb-3 flex items-center gap-1 ${reminderMsg.includes('sent') ? 'text-emerald-600' : 'text-red-500'}`}>
                {reminderMsg.includes('sent') && <Check size={12} />}{reminderMsg}
              </p>
            )}
            <button onClick={sendReminder} disabled={sendingReminder}
              className="flex items-center gap-2 text-sm px-4 py-2 bg-brand-600 hover:bg-brand-800 text-white rounded-lg transition-colors disabled:opacity-50">
              <Send size={13} />
              {sendingReminder ? 'Sending…' : 'Send reminder now'}
            </button>
            <p className="text-xs text-gray-400 mt-3">
              💡 Tip: Bookmark this page and click &quot;Send reminder now&quot; each evening, or set a browser bookmark reminder.
            </p>
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-xl border border-red-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 size={15} className="text-red-400" />
              <h2 className="text-sm font-medium text-red-600">Danger zone</h2>
            </div>
            <p className="text-xs text-gray-400 mb-3">Once you delete your account, all your data will be permanently removed.</p>
            <button onClick={deleteAccount}
              className="text-sm px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              Delete account
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
