'use client'

import { useEffect, useState, useCallback } from 'react'

// Generic API fetch hook with loading/error states
export function useApi<T>(url: string | null, options?: { refresh?: number }) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) {
      setData(null)
      setLoading(false)
      return
    }
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (mounted) {
          setData(json)
          setError(null)
          setLoading(false)
        }
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Unknown error')
          setLoading(false)
        }
      }
    }
    load()
    if (options?.refresh) {
      const interval = setInterval(load, options.refresh)
      return () => {
        mounted = false
        clearInterval(interval)
      }
    }
    return () => {
      mounted = false
    }
  }, [url, options?.refresh])

  return { data, loading, error, setData }
}

// POST helper
export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// PATCH helper
export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// Hook for mutations with optimistic update support
export function useMutation<TBody, TRes>(url: string, method: 'POST' | 'PATCH' = 'POST') {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (body: TBody): Promise<TRes | null> => {
      setLoading(true)
      setError(null)
      try {
        const fn = method === 'POST' ? apiPost : apiPatch
        const res = await fn<TRes>(url, body)
        setLoading(false)
        return res
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
        setLoading(false)
        return null
      }
    },
    [url, method]
  )

  return { mutate, loading, error }
}
