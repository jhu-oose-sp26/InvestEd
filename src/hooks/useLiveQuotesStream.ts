"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  attachLiveQuotesStream,
  liveQuotesStreamCacheKey,
  reconnectSharedLiveQuotesStream,
} from "@/lib/liveQuotesStreamClient"
import { softenPublicErrorMessage } from "@/lib/userFacingMessages"
import type { LiveQuoteItem, LiveQuotesRefetchOptions, LiveQuotesState } from "@/hooks/useLiveQuotes"

/** Live multi-symbol prices with push updates; strip and Markets share one connection when symbols match. */
export function useLiveQuotesStream(symbols: string[]): LiveQuotesState {
  const displayOrder = useMemo(
    () => [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))],
    [symbols.join(",")],
  )
  const streamKey = useMemo(() => liveQuotesStreamCacheKey(displayOrder), [displayOrder.join(",")])

  const [quotes, setQuotes] = useState<LiveQuoteItem[]>([])
  const [loading, setLoading] = useState(() => displayOrder.length > 0)
  const [error, setError] = useState<string | null>(null)

  const mergeByOrder = useCallback(
    (prev: LiveQuoteItem[], incoming: LiveQuoteItem[]): LiveQuoteItem[] => {
      const map = new Map<string, LiveQuoteItem>()
      for (const q of prev) {
        const sym = q.symbol.trim().toUpperCase()
        map.set(sym, { ...q, symbol: sym })
      }
      for (const q of incoming) {
        const sym = q.symbol.trim().toUpperCase()
        map.set(sym, { ...q, symbol: sym })
      }
      return displayOrder.map((sym) => map.get(sym)).filter((q): q is LiveQuoteItem => q != null)
    },
    [displayOrder],
  )

  const refetch = useCallback(
    async (options?: LiveQuotesRefetchOptions) => {
      if (!streamKey) return
      setError(null)
      if (options?.reconnectSSE) {
        reconnectSharedLiveQuotesStream(streamKey)
      }
      try {
        const parts = streamKey.split(",").filter(Boolean)
        const res = await fetch(`/api/live-quotes?symbols=${parts.map(encodeURIComponent).join(",")}`)
        const data = await res.json()
        if (!res.ok) {
          setError(
            softenPublicErrorMessage(
              typeof data?.error === "string"
                ? data.error
                : "Something went wrong on our side. Please try again in a moment. (IE_GEN_001)",
            ),
          )
          setLoading(false)
          return
        }
        const next = Array.isArray(data) ? data : []
        setQuotes((prev) => mergeByOrder(prev, next as LiveQuoteItem[]))
        setError(null)
        setLoading(false)
      } catch {
        setError(
          softenPublicErrorMessage(
            "We could not load live prices. Check your connection and try again. (IE_CLT_001)",
          ),
        )
        setLoading(false)
      }
    },
    [streamKey, mergeByOrder],
  )

  useEffect(() => {
    if (!streamKey) {
      setQuotes([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // REST snapshot ASAP in parallel with SSE attach (cold start has no cache yet).
    void refetch()

    const detach = attachLiveQuotesStream(streamKey, {
      onData: (incoming) => {
        let mergedLen = 0
        setQuotes((prev) => {
          const merged = mergeByOrder(prev, incoming)
          mergedLen = merged.length
          return merged
        })
        setError(null)
        // Empty SSE snapshots happen while WS warms (25 symbols). 
        // until REST refetch finishes or we actually have rows.
        if (mergedLen > 0) setLoading(false)
      },
      onError: (msg) => {
        setError(msg)
        setLoading(false)
      },
    })

    return detach
  }, [streamKey, mergeByOrder, refetch])

  return { quotes, loading, error, refetch }
}
