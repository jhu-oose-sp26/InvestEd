"use client"

import { useState } from "react"
import { useLivePrice } from "@/hooks/useLivePrice"

export default function TradePage() {
  const [symbol, setSymbol] = useState("")
  const [symbolToLookup, setSymbolToLookup] = useState("")
  const [quantity, setQuantity] = useState("")
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const { price: livePrice, loading: livePriceLoading, error: livePriceError, refetch: refetchPrice } = useLivePrice(symbolToLookup, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          type: tradeType,
          quantity: parseInt(quantity),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: "success", text: `Trade executed successfully! Trade ID: ${data.tradeId}` })
        setSymbol("")
        setSymbolToLookup("")
        setQuantity("")
      } else {
        setMessage({ type: "error", text: data.error || "Failed to execute trade" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred while executing the trade" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Execute Trade</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="symbol" className="block text-sm font-medium mb-2">
            Symbol
          </label>
          <input
            id="symbol"
            type="text"
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value.toUpperCase())
              setSymbolToLookup("")
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                const sym = symbol.trim().toUpperCase()
                if (sym) setSymbolToLookup(sym)
              }
            }}
            placeholder="e.g., AAPL (press Enter to look up)"
            className="w-full px-4 py-2 border rounded-md"
            required
          />
          {symbol.trim() && !symbolToLookup && (
            <p className="mt-2 text-sm text-muted-foreground">
              Press Enter to check if the symbol exists and see live price.
            </p>
          )}
          {symbolToLookup && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {livePriceLoading && "Loading price…"}
                {!livePriceLoading && livePrice != null && (
                  <>Live price: ${livePrice.toFixed(2)}{livePriceError && " (stale)"}</>
                )}
                {!livePriceLoading && livePrice == null && livePriceError && (
                  <>Live price: {livePriceError.slice(0, 60)}{livePriceError.length > 60 ? "…" : ""}</>
                )}
                {!livePriceLoading && livePrice == null && !livePriceError && (
                  <>No price found for {symbolToLookup}.</>
                )}
              </p>
              {!livePriceLoading && (
                <button
                  type="button"
                  onClick={() => refetchPrice()}
                  className="text-sm text-primary underline hover:no-underline"
                >
                  Refresh price
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium mb-2">
            Trade Type
          </label>
          <select
            id="type"
            value={tradeType}
            onChange={(e) => setTradeType(e.target.value as "BUY" | "SELL")}
            className="w-full px-4 py-2 border rounded-md"
          >
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </div>

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium mb-2">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Number of shares"
            min="1"
            className="w-full px-4 py-2 border rounded-md"
            required
          />
        </div>

        {message && (
          <div
            className={`p-4 rounded-md ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Executing..." : `${tradeType} ${symbol || "Stock"}`}
        </button>
      </form>
    </div>
  )
}

