"use client"

import { useState, useEffect, useCallback } from 'react'

/** Shape returned by GET /api/live-quotes – use for graphs and multi-symbol UI. */
export interface LiveQuoteItem {
  symbol: string
  price: number
  timestamp: number
  volume?: number
  change?: number
  percentChange?: number
}

/** Multi-symbol live quotes from GET /api/live-quotes. Use for portfolio value charts, dashboards, comparison graphs. */
export interface LiveQuotesState {
  quotes: LiveQuoteItem[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useLiveQuotes(symbols: string[], pollIntervalMs: number = 5000): LiveQuotesState {
  const [quotes, setQuotes] = useState<LiveQuoteItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuotes = useCallback(async (isInitialLoad?: boolean) => {
    const list = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))]
    if (!list.length) {
      setQuotes([])
      setError(null)
      return
    }
    const isFirstLoad = isInitialLoad !== false
    if (isFirstLoad) setLoading(true)
    if (isFirstLoad) setError(null)
    try {
      const res = await fetch(`/api/live-quotes?symbols=${list.map(encodeURIComponent).join(',')}`)
      const data = await res.json()
      if (!res.ok) {
        if (isFirstLoad) {
          setError(data.error ?? `Request failed (${res.status})`)
          setQuotes([])
        }
        return
      }
      const next = Array.isArray(data) ? data : []
      if (next.length > 0) setQuotes(next)
      else if (isFirstLoad) setQuotes([])
      // On background poll: only update when we got a non-empty array; otherwise keep previous quotes
    } catch (e) {
      if (isFirstLoad) {
        setError(e instanceof Error ? e.message : 'Failed to fetch quotes')
        setQuotes([])
      }
    } finally {
      setLoading(false)
    }
  }, [symbols.join(',')])

  useEffect(() => {
    if (!symbols.length) {
      setQuotes([])
      setError(null)
      return
    }
    fetchQuotes(true) // initial load: show loading
    if (pollIntervalMs <= 0) return
    const id = setInterval(() => fetchQuotes(false), pollIntervalMs) // background refresh: no loading flash
    return () => clearInterval(id)
  }, [symbols.join(','), pollIntervalMs, fetchQuotes])

  return { quotes, loading, error, refetch: fetchQuotes }
}
