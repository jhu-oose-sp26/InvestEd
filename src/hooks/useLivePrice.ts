"use client"

import { useState, useEffect, useCallback } from 'react'

/** Single-symbol live quote from GET /api/live-quote. Use for trade form, ticker header, single-asset charts. */
export interface LiveQuoteState {
  price: number | null
  timestamp: number | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useLivePrice(symbol: string, pollIntervalMs: number = 5000): LiveQuoteState {
  const [price, setPrice] = useState<number | null>(null)
  const [timestamp, setTimestamp] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuote = useCallback(async () => {
    const sym = symbol?.trim().toUpperCase()
    if (!sym) {
      setPrice(null)
      setTimestamp(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/live-quote?symbol=${encodeURIComponent(sym)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`)
        if (res.status === 404) { setPrice(null); setTimestamp(null) }
        return
      }
      setPrice(data.price)
      setTimestamp(data.timestamp ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch quote')
      setPrice(null)
      setTimestamp(null)
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    if (!symbol?.trim()) {
      setPrice(null)
      setTimestamp(null)
      setError(null)
      return
    }
    fetchQuote()
    if (pollIntervalMs <= 0) return
    const id = setInterval(fetchQuote, pollIntervalMs)
    return () => clearInterval(id)
  }, [symbol, pollIntervalMs, fetchQuote])

  return { price, timestamp, loading, error, refetch: fetchQuote }
}
