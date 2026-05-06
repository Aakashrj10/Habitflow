'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'

// Simple in-memory cache
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 30_000 // 30 seconds

export function useSession() {
  const [token, setToken]   = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail]   = useState<string | null>(null)
  const [name, setName]     = useState<string | null>(null)
  const [ready, setReady]   = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setToken(session.access_token)
        setUserId(session.user.id)
        setEmail(session.user.email ?? null)
        setName(session.user.user_metadata?.full_name ?? null)
      }
      setReady(true)
    })
  }, [supabase.auth])

  return { token, userId, email, name, ready }
}

export function useApi<T>(url: string, token: string | null, options?: { skip?: boolean }) {
  const [data, setData]     = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const fetch_ = useCallback(async (tok: string, bustCache = false) => {
    const key = url + tok.slice(-8)
    if (!bustCache) {
      const cached = cache.get(key)
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setData(cached.data as T)
        setLoading(false)
        return
      }
    }
    setLoading(true)
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      cache.set(key, { data: json, ts: Date.now() })
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    if (token && !options?.skip) fetch_(token)
  }, [token, options?.skip, fetch_])

  const refetch = useCallback((bustCache = true) => {
    if (token) fetch_(token, bustCache)
  }, [token, fetch_])

  return { data, loading, error, refetch }
}

// Invalidate cache for a URL
export function invalidateCache(urlPrefix: string) {
  cache.forEach((_, key) => {
  if (key.startsWith(urlPrefix)) cache.delete(key)
})
}
