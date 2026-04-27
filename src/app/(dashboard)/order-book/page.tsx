"use client"

import { useState, useEffect, useCallback } from "react"
import { OrderBook } from "@/components/OrderBook"
import { LimitOrderForm } from "@/components/LimitOrderForm"
import { useOrderBook } from "@/hooks/useOrderBook"
import { useLimitOrders, type LimitOrder } from "@/hooks/useLimitOrders"
import { usePaperTradingAuth } from "@/contexts/PaperTradingAuthContext"

/* ─── Resolve Market (creator-only) ───────────────────────────── */

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
        credentials: 'include',
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

/* ─── My Prediction Positions (collapsible rolldown) ──────────── */

interface PositionData {
  id: string
  marketId: string
  yesQuantity: number
  noQuantity: number
  market: { id: string; title: string; status: string; outcome: boolean | null }
  costBasis: number
  currentValue: number
  pnl: number
  lastPrice: number
}

interface PositionsSummary {
  totalCostBasis: number
  totalCurrentValue: number
  totalPnl: number
  openOrdersValue: number
}

function MyPredictionPositions({ orders, onCancelOrder }: { orders: LimitOrder[]; onCancelOrder: () => void }) {
  const [open, setOpen] = useState(false)
  const [positions, setPositions] = useState<PositionData[]>([])
  const [summary, setSummary] = useState<PositionsSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const fetchPositions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/market-positions', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setPositions(data.positions ?? [])
        setSummary(data.summary ?? null)
      }
    } catch {
      // keep previous state
    } finally {
      setLoading(false)
      setFetched(true)
    }
  }, [])

  // Fetch on first expand
  useEffect(() => {
    if (open && !fetched) fetchPositions()
  }, [open, fetched, fetchPositions])

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)

  const pnlColor = (v: number) => v > 0 ? "text-emerald-600" : v < 0 ? "text-red-600" : "text-muted-foreground"
  const pnlSign = (v: number) => v > 0 ? "+" : ""

  const handleCancel = async (orderId: string) => {
    const res = await fetch('/api/limit-orders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ orderId }),
    })
    if (res.ok) onCancelOrder()
  }

  const openOrders = orders.filter(o => o.status === 'OPEN')
  const hasContent = positions.length > 0 || openOrders.length > 0

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-sm">My Prediction Positions</span>
        </div>
        {summary && (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">Value: <span className="font-semibold text-foreground">{fmt(summary.totalCurrentValue)}</span></span>
            <span className={`font-semibold ${pnlColor(summary.totalPnl)}`}>
              {pnlSign(summary.totalPnl)}{fmt(summary.totalPnl)}
            </span>
          </div>
        )}
      </button>

      {open && (
        <div className="border-t animate-in slide-in-from-top-2 duration-200">
          {loading && !fetched ? (
            <div className="p-6 text-sm text-muted-foreground animate-pulse text-center">Loading positions…</div>
          ) : !hasContent ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              No prediction positions or open orders yet. Trade some shares to get started.
            </div>
          ) : (
            <>
              {/* ── Summary cards (larger labels) ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-muted-foreground">Total Value</div>
                  <div className="text-2xl font-bold mt-1">{fmt(summary?.totalCurrentValue ?? 0)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-muted-foreground">Cost Basis</div>
                  <div className="text-2xl font-bold mt-1">{fmt(summary?.totalCostBasis ?? 0)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-muted-foreground">Open Orders</div>
                  <div className="text-2xl font-bold mt-1">{fmt(summary?.openOrdersValue ?? 0)}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-muted-foreground">Total P&L</div>
                  <div className={`text-2xl font-bold mt-1 ${pnlColor(summary?.totalPnl ?? 0)}`}>
                    {pnlSign(summary?.totalPnl ?? 0)}{fmt(summary?.totalPnl ?? 0)}
                  </div>
                </div>
              </div>

              {/* ── Open Positions (card grid, 3 per row) ── */}
              {positions.length > 0 && (
                <div className="px-4 pb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Open Positions</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {positions.map(pos => (
                      <div
                        key={pos.id}
                        className="border rounded-xl p-4 bg-card hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h5 className="text-sm font-semibold leading-tight line-clamp-2" title={pos.market.title}>
                            {pos.market.title}
                          </h5>
                          <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${pos.market.status === 'OPEN'
                            ? 'bg-emerald-100 text-emerald-700'
                            : pos.market.status === 'RESOLVED'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                            {pos.market.status}
                            {pos.market.outcome != null && ` — ${pos.market.outcome ? 'YES' : 'NO'}`}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                          <div>
                            <span className="text-muted-foreground">YES</span>
                            <span className={`ml-1.5 font-semibold ${pos.yesQuantity > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                              {pos.yesQuantity}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">NO</span>
                            <span className={`ml-1.5 font-semibold ${pos.noQuantity > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {pos.noQuantity}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cost</span>
                            <span className="ml-1.5 font-medium">{fmt(pos.costBasis)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Value</span>
                            <span className="ml-1.5 font-medium">{fmt(pos.currentValue)}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">P&L</span>
                          <span className={`text-sm font-bold ${pnlColor(pos.pnl)}`}>
                            {pnlSign(pos.pnl)}{fmt(pos.pnl)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Pending Orders (list style, visually distinct) ── */}
              {openOrders.length > 0 && (
                <div className="px-4 pb-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pending Orders</h4>
                  <div className="space-y-2">
                    {openOrders.map(o => (
                      <div key={o.id} className="flex items-center justify-between text-xs bg-muted/20 border border-dashed rounded-lg px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${o.side === 'YES' ? 'text-emerald-600' : 'text-red-600'}`}>{o.side}</span>
                          <span className="font-medium">{o.market.title}</span>
                          <span className="text-muted-foreground">{o.quantity} @ {(Number(o.limitPrice) * 100).toFixed(1)}&cent;</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">OPEN</span>
                          <button onClick={() => handleCancel(o.id)} className="text-red-500 hover:text-red-700 font-medium">Cancel</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Refresh */}
              <div className="flex justify-end p-3 border-t">
                <button
                  onClick={fetchPositions}
                  disabled={loading}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {loading ? "Refreshing…" : "↻ Refresh"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Market type ─────────────────────────────────────────────── */

interface Market {
  id: string
  title: string
  description: string | null
  resolutionDate: string
  status: string
  outcome: boolean | null
  creatorId: string
  creator: { id: string; name: string | null; email: string }
}

/* ─── Main Page ───────────────────────────────────────────────── */

export default function OrderBookPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = usePaperTradingAuth()
  const { orderBook, loading: obLoading, refetch: refetchOrderBook } = useOrderBook(selectedMarket?.id ?? "")
  const { orders, refetch: refetchOrders } = useLimitOrders()

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
        credentials: "include",
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
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 text-sm"
          >
            {showCreate ? "Cancel" : "Create Market"}
          </button>
        </div>
      </div>

      {/* My Positions rolldown (includes open positions + pending orders) */}
      <MyPredictionPositions orders={orders} onCancelOrder={refetchAll} />

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
              <LimitOrderForm 
                marketId={selectedMarket.id} 
                onOrderPlaced={refetchAll} 
                bestYesAsk={orderBook?.noBids?.length ? Math.min(...orderBook.noBids.map(b => b.price)) : null}
                bestNoAsk={orderBook?.yesBids?.length ? Math.min(...orderBook.yesBids.map(b => 1 - b.price)) : null}
              />
              {user && user.id === selectedMarket.creatorId && (
                <ResolveMarket marketId={selectedMarket.id} onResolved={() => { fetchMarkets(); refetchAll() }} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
