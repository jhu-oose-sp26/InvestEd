"use client"

import { useState, useEffect, useCallback } from 'react'

export interface LimitOrder {
  id: string
  marketId: string
  side: 'YES' | 'NO'
  orderType: string
  limitPrice: number
  quantity: number
  status: string
  createdAt: string
  filledAt: string | null
  market: { title: string }
}

export function useLimitOrders(userId = 'temp-user-id', pollIntervalMs = 3000) {
  const [orders, setOrders] = useState<LimitOrder[]>([])
  const [loading, setLoading] = useState(false)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/limit-orders?userId=${encodeURIComponent(userId)}`)
      const data = await res.json()
      if (res.ok) setOrders(data.orders ?? [])
    } catch {
      // keep previous state
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetch_()
    if (pollIntervalMs <= 0) return
    const id = setInterval(fetch_, pollIntervalMs)
    return () => clearInterval(id)
  }, [pollIntervalMs, fetch_])

  return { orders, loading, refetch: fetch_ }
}
