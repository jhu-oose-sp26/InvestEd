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

interface CachedQuote {
  price: number
  timestamp: number | null
}

const CACHE_PREFIX = 'livePrice:'

/**
 * Per-symbol cache of the last good quote. Kept both in memory (survives remounts
 * within a session) and in localStorage (survives reloads). When the live-quote API
 * is rate limited or unreachable, the UI falls back to this cached price instead of
 * going blank, so the "current price" stays visible.
 */
const memoryCache = new Map<string, CachedQuote>()

function readCachedQuote(sym: string): CachedQuote | null {
  const cached = memoryCache.get(sym)
  if (cached) return cached
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + sym)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedQuote
    if (typeof parsed?.price !== 'number') return null
    memoryCache.set(sym, parsed)
    return parsed
  } catch {
    return null
  }
}

function writeCachedQuote(sym: string, quote: CachedQuote): void {
  memoryCache.set(sym, quote)
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CACHE_PREFIX + sym, JSON.stringify(quote))
  } catch {
    /* ignore quota / unavailable storage — in-memory cache still works */
  }
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
        } else {
          // Rate limited (503) or other transient failure: fall back to the cached
          // quote so the current price stays on screen instead of disappearing.
          const cached = readCachedQuote(sym)
          if (cached) {
            setPrice((prev) => (prev == null ? cached.price : prev))
            setTimestamp((prev) => (prev == null ? cached.timestamp : prev))
          }
        }
        return
      }
      setPrice(data.price)
      setTimestamp(data.timestamp ?? null)
      setError(null)
      if (typeof data?.price === 'number') {
        writeCachedQuote(sym, { price: data.price, timestamp: data.timestamp ?? null })
      }
    } catch (e) {
      setError(
        softenPublicErrorMessage(
          'We could not load that price. Check your connection and try again. (IE_CLT_002)',
        ),
      )
      // Keep last price on network/transient errors so the UI doesn’t go blank;
      // if we have nothing yet, fall back to the cached quote.
      const cached = readCachedQuote(sym)
      if (cached) {
        setPrice((prev) => (prev == null ? cached.price : prev))
        setTimestamp((prev) => (prev == null ? cached.timestamp : prev))
      }
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    const sym = symbol?.trim().toUpperCase()
    if (!sym) {
      setPrice(null)
      setTimestamp(null)
      setError(null)
      return
    }
    // Seed from cache immediately so a fresh lookup shows the last known price
    // right away (and survives a first request that is rate limited).
    const cached = readCachedQuote(sym)
    if (cached) {
      setPrice(cached.price)
      setTimestamp(cached.timestamp)
    } else {
      setPrice(null)
      setTimestamp(null)
    }
    fetchQuote()
    if (pollIntervalMs <= 0) return
    const id = setInterval(fetchQuote, pollIntervalMs)
    return () => clearInterval(id)
  }, [symbol, pollIntervalMs, fetchQuote])

  return { price, timestamp, loading, error, refetch: fetchQuote }
}
