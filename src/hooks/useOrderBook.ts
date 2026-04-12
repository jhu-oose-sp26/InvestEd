"use client"

import { useState, useEffect, useCallback } from 'react'
import type { OrderBookSnapshot } from '@/types'

export function useOrderBook(marketId: string, pollIntervalMs = 3000) {
  const [orderBook, setOrderBook] = useState<OrderBookSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    if (!marketId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/order-book?marketId=${encodeURIComponent(marketId)}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setOrderBook(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch order book')
    } finally {
      setLoading(false)
    }
  }, [marketId])

  useEffect(() => {
    if (!marketId) return
    fetch_()
    if (pollIntervalMs <= 0) return
    const id = setInterval(fetch_, pollIntervalMs)
    return () => clearInterval(id)
  }, [marketId, pollIntervalMs, fetch_])

  return { orderBook, loading, error, refetch: fetch_ }
}
