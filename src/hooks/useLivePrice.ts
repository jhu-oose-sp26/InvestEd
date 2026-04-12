"use client"

import { useState, useEffect, useCallback } from 'react'
import { softenPublicErrorMessage } from '@/lib/userFacingMessages'

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
        setError(
          softenPublicErrorMessage(
            typeof data?.error === 'string'
              ? data.error
              : 'Something went wrong on our side. Please try again in a moment. (IE_GEN_001)',
          ),
        )
        // Keep last price visible so user still sees it; only clear when symbol is wrong (e.g. 400)
        if (res.status === 400) {
          setPrice(null)
          setTimestamp(null)
        }
        return
      }
      setPrice(data.price)
      setTimestamp(data.timestamp ?? null)
      setError(null)
    } catch (e) {
      setError(
        softenPublicErrorMessage(
          'We could not load that price. Check your connection and try again. (IE_CLT_002)',
        ),
      )
      // Keep last price on network/transient errors so the UI doesn’t go blank
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
