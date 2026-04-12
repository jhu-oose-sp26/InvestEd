"use client"

import { useState, useEffect, useCallback } from 'react'
import { softenPublicErrorMessage } from '@/lib/userFacingMessages'

/** Optional flags for `refetch` on the SSE-based hook (`useLiveQuotesStream`). Ignored by the polling hook. */
export type LiveQuotesRefetchOptions = {
  /** Reopen the shared EventSource so the server sends a fresh snapshot; use for explicit user refresh. */
  reconnectSSE?: boolean
}

/** Shape returned by GET /api/live-quotes – use for graphs and multi-symbol UI. */
export interface LiveQuoteItem {
  symbol: string
  price: number
  timestamp: number
  /** Present when the price time came from streaming trades rather than a periodic update. */
  webSocketUpdatedAt?: number
  /** When this row was last refreshed for you (for clock and “how long ago”). */
  retrievedAtMs?: number
  volume?: number
  change?: number
  percentChange?: number
}

/** Multi-symbol live quotes from GET /api/live-quotes. Use for portfolio value charts, dashboards, comparison graphs. */
export interface LiveQuotesState {
  quotes: LiveQuoteItem[]
  loading: boolean
  error: string | null
  refetch: (options?: LiveQuotesRefetchOptions) => void | Promise<void>
}

export function useLiveQuotes(symbols: string[], pollIntervalMs: number = 5000): LiveQuotesState {
  const [quotes, setQuotes] = useState<LiveQuoteItem[]>([])
  /** True on first paint when we will fetch, so UIs don’t flash an empty-state message before the request starts. */
  const [loading, setLoading] = useState(() => symbols.length > 0)
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
          setError(
            softenPublicErrorMessage(
              typeof data?.error === 'string'
                ? data.error
                : 'Something went wrong on our side. Please try again in a moment. (IE_GEN_001)',
            ),
          )
          setQuotes([])
        }
        return
      }
      const next = Array.isArray(data) ? data : []
      /** Keep requested symbol order; merge so a partial poll does not wipe other rows. */
      const mergeBySymbolOrder = (
        prev: LiveQuoteItem[],
        incoming: LiveQuoteItem[],
        order: string[],
      ): LiveQuoteItem[] => {
        const map = new Map(prev.map((q) => [q.symbol, q]))
        for (const q of incoming) map.set(q.symbol, q)
        return order.map((sym) => map.get(sym)).filter((q): q is LiveQuoteItem => q != null)
      }
      if (isFirstLoad) {
        if (next.length > 0) setQuotes(mergeBySymbolOrder([], next, list))
        else setQuotes([])
      } else if (next.length > 0) {
        setQuotes((prev) => mergeBySymbolOrder(prev, next, list))
      }
    } catch (e) {
      if (isFirstLoad) {
        setError(
          softenPublicErrorMessage(
            'We could not load live prices. Check your connection and try again. (IE_CLT_001)',
          ),
        )
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
      setLoading(false)
      return
    }
    fetchQuotes(true) // initial load: show loading
    if (pollIntervalMs <= 0) return
    const id = setInterval(() => fetchQuotes(false), pollIntervalMs) // background refresh: no loading flash
    return () => clearInterval(id)
  }, [symbols.join(','), pollIntervalMs, fetchQuotes])

  const refetchPublic = useCallback(() => {
    void fetchQuotes()
  }, [fetchQuotes])

  return { quotes, loading, error, refetch: refetchPublic }
}
