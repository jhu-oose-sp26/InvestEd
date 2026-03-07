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

  const fetchQuotes = useCallback(async () => {
    const list = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))]
    if (!list.length) {
      setQuotes([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/live-quotes?symbols=${list.map(encodeURIComponent).join(',')}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`)
        setQuotes([])
        return
      }
      setQuotes(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch quotes')
      setQuotes([])
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
    fetchQuotes()
    if (pollIntervalMs <= 0) return
    const id = setInterval(fetchQuotes, pollIntervalMs)
    return () => clearInterval(id)
  }, [symbols.join(','), pollIntervalMs, fetchQuotes])

  return { quotes, loading, error, refetch: fetchQuotes }
}
