"use client"

import { useState, useEffect, useCallback } from "react"
import { OrderBook } from "@/components/OrderBook"
import { LimitOrderForm } from "@/components/LimitOrderForm"
import { OpenOrders } from "@/components/OpenOrders"
import { useOrderBook } from "@/hooks/useOrderBook"
import { useLimitOrders } from "@/hooks/useLimitOrders"

function ResolveMarket({ marketId, onResolved }: { marketId: string; onResolved: () => void }) {
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolve = async (outcome: boolean) => {
    setResolving(true)
    setError(null)
    try {
      const res = await fetch('/api/markets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId, outcome }),
      })
      const data = await res.json()
      if (res.ok) onResolved()
      else setError(data.error || 'Failed to resolve')
    } catch {
      setError('Failed to resolve')
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="border rounded-xl p-4 space-y-2">
      <h3 className="text-sm font-semibold">Resolve Market</h3>
      <p className="text-xs text-muted-foreground">Paying $1/share to winning side. Cancels open orders.</p>
      <div className="flex gap-2">
        <button onClick={() => resolve(true)} disabled={resolving}
          className="flex-1 py-1.5 rounded text-sm font-bold bg-emerald-600 text-white disabled:opacity-50">
          Resolve YES
        </button>
        <button onClick={() => resolve(false)} disabled={resolving}
          className="flex-1 py-1.5 rounded text-sm font-bold bg-red-600 text-white disabled:opacity-50">
          Resolve NO
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

const TEST_USERS = [
  { id: 'temp-user-id', label: 'Dev User' },
  { id: 'user-a', label: 'Test User A' },
  { id: 'user-b', label: 'Test User B' },
]

interface Market {
  id: string
  title: string
  description: string | null
  resolutionDate: string
  status: string
  outcome: boolean | null
  creator: { name: string | null; email: string }
}

export default function OrderBookPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeUserId, setActiveUserId] = useState('temp-user-id')

  const { orderBook, loading: obLoading, refetch: refetchOrderBook } = useOrderBook(selectedMarket?.id ?? "")
  const { orders, refetch: refetchOrders } = useLimitOrders(activeUserId)

  const refetchAll = useCallback(() => {
    refetchOrderBook()
    refetchOrders()
  }, [refetchOrderBook, refetchOrders])

  // Create market form
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [resolutionDate, setResolutionDate] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch("/api/markets")
      const data = await res.json()
      if (res.ok) setMarkets(data.markets ?? [])
    } catch {
      // keep previous state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMarkets() }, [fetchMarkets])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch("/api/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: description || undefined, resolutionDate }),
      })
      if (res.ok) {
        setTitle("")
        setDescription("")
        setResolutionDate("")
        setShowCreate(false)
        fetchMarkets()
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Prediction Markets</h1>
          <p className="text-muted-foreground text-sm">
            Create events, trade YES/NO shares, and see the order book.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={activeUserId}
            onChange={e => setActiveUserId(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            {TEST_USERS.map(u => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 text-sm"
          >
            {showCreate ? "Cancel" : "Create Market"}
          </button>
        </div>
      </div>

      {/* Create market form */}
      {showCreate && (
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">New Market</h2>
          <input
            type="text" placeholder="Will X happen by Y?" value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-2 border rounded-md" maxLength={200}
          />
          <textarea
            placeholder="Description (optional)" value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-4 py-2 border rounded-md h-20 resize-none" maxLength={2000}
          />
          <div>
            <label className="text-sm text-muted-foreground">Resolution date</label>
            <input
              type="date" value={resolutionDate}
              onChange={e => setResolutionDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !title.trim() || !resolutionDate}
            className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 disabled:opacity-50 text-sm"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      )}

      {/* Markets list */}
      {loading ? (
        <p className="text-muted-foreground animate-pulse">Loading markets...</p>
      ) : markets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No markets yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {markets.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMarket(selectedMarket?.id === m.id ? null : m)}
              className={`w-full text-left border rounded-xl p-4 transition-colors ${selectedMarket?.id === m.id ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{m.title}</h3>
                  {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0 ml-4">
                  <span className={`inline-block px-2 py-0.5 rounded font-medium ${m.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : m.status === "RESOLVED" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                    {m.status}{m.outcome != null && ` — ${m.outcome ? "YES" : "NO"}`}
                  </span>
                  <p className="mt-1">Resolves {new Date(m.resolutionDate).toLocaleDateString()}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected market: order book + trading */}
      {selectedMarket && selectedMarket.status === "OPEN" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="lg:col-span-2">
              <OrderBook orderBook={orderBook} loading={obLoading} />
            </div>
            <div className="space-y-4">
              <LimitOrderForm marketId={selectedMarket.id} userId={activeUserId} onOrderPlaced={refetchAll} />
              <ResolveMarket marketId={selectedMarket.id} onResolved={() => { fetchMarkets(); refetchAll() }} />
            </div>
          </div>
        </>
      )}

      <OpenOrders orders={orders} userId={activeUserId} onCancel={refetchAll} />
    </div>
  )
}
