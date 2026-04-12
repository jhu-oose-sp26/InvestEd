"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  attachLiveQuotesStream,
  liveQuotesStreamCacheKey,
} from "@/lib/liveQuotesStreamClient"
import { softenPublicErrorMessage } from "@/lib/userFacingMessages"
import type { LiveQuoteItem, LiveQuotesState } from "@/hooks/useLiveQuotes"

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
      const map = new Map(prev.map((q) => [q.symbol, q]))
      for (const q of incoming) map.set(q.symbol, q)
      return displayOrder.map((sym) => map.get(sym)).filter((q): q is LiveQuoteItem => q != null)
    },
    [displayOrder],
  )

  const refetch = useCallback(async () => {
    if (!streamKey) return
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
  }, [streamKey, mergeByOrder])

  useEffect(() => {
    if (!streamKey) {
      setQuotes([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const detach = attachLiveQuotesStream(streamKey, {
      onData: (incoming) => {
        setQuotes((prev) => mergeByOrder(prev, incoming))
        setError(null)
        setLoading(false)
      },
      onError: (msg) => {
        setError(msg)
        setLoading(false)
      },
    })

    // REST snapshot on subscribe so remounts (e.g. navigate away and back) don’t sit in
    // loading/… until the next SSE tick; shared EventSource may have already delivered.
    void refetch()

    return detach
  }, [streamKey, mergeByOrder, refetch])

  return { quotes, loading, error, refetch }
}
