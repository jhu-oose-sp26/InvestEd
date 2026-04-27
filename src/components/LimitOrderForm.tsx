"use client"

import { useState } from 'react'

import type { OrderBookSnapshot } from '@/types'

interface Props {
  marketId: string
  onOrderPlaced?: () => void
  orderBook: OrderBookSnapshot | null
  mode: 'YES' | 'NO'
}

export function LimitOrderForm({ marketId, onOrderPlaced, orderBook, mode }: Props) {
  const [action, setAction] = useState<'Buy' | 'Sell'>('Buy')
  const [orderType, setOrderType] = useState<'LIMIT' | 'IOC'>('LIMIT')
  const [limitPrice, setLimitPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const actualSide = mode === 'YES' ? (action === 'Buy' ? 'YES' : 'NO') : (action === 'Buy' ? 'NO' : 'YES')
  const isIOC = orderType === 'IOC'
  const price = parseFloat(limitPrice) / 100
  const finalLimitPrice = isIOC ? (actualSide === 'YES' ? 0.99 : 0.01) : (mode === 'YES' ? price : 1 - price)
  
  // Cost logic: we need to display the cost based on the perspective of what we are buying
  const displayCostPrice = isIOC ? 0.99 : price;

  const valid = (isIOC ? true : (price > 0 && price <= 1)) && quantity && parseInt(quantity) > 0

  const handleSubmit = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/limit-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ marketId, side: actualSide, orderType, limitPrice: finalLimitPrice, quantity: parseInt(quantity) }),
      })
      const data = await res.json()
      if (res.ok) {
        const matchedMsg = data.filled > 0 ? ` ${data.filled} orders matched!` : orderType === 'IOC' ? ' No match — cancelled.' : ''
        setMessage({ type: 'success', text: `Order placed.${matchedMsg}` })
        setLimitPrice('')
        setQuantity('')
        onOrderPlaced?.()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to place order' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to place order' })
    } finally {
      setLoading(false)
    }
  }

  const buyColor = mode === 'YES' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
  const sellColor = mode === 'YES' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'

  let bestBuyPrice: number | null = null
  let bestSellPrice: number | null = null

  if (orderBook) {
    if (mode === 'YES') {
      bestBuyPrice = orderBook.noBids.length > 0 ? Math.min(...orderBook.noBids.map(b => b.price)) : null
      bestSellPrice = orderBook.yesBids.length > 0 ? Math.max(...orderBook.yesBids.map(b => b.price)) : null
    } else {
      bestBuyPrice = orderBook.yesBids.length > 0 ? Math.min(...orderBook.yesBids.map(b => 1 - b.price)) : null
      bestSellPrice = orderBook.noBids.length > 0 ? Math.max(...orderBook.noBids.map(b => 1 - b.price)) : null
    }
  }

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold">Place Order</h3>

      {/* Action */}
      <div className="flex gap-2">
        <button onClick={() => setAction('Buy')}
          className={`flex-1 py-1.5 rounded text-sm font-bold ${action === 'Buy' ? buyColor : 'border text-muted-foreground'}`}>
          Buy {mode} {bestBuyPrice !== null ? `${Math.round(bestBuyPrice * 100)}¢` : ''}
        </button>
        <button onClick={() => setAction('Sell')}
          className={`flex-1 py-1.5 rounded text-sm font-bold ${action === 'Sell' ? sellColor : 'border text-muted-foreground'}`}>
          Sell {mode} {bestSellPrice !== null ? `${Math.round(bestSellPrice * 100)}¢` : ''}
        </button>
      </div>

      {/* Order type */}
      <div className="flex gap-2">
        <button onClick={() => setOrderType('LIMIT')}
          className={`flex-1 py-1 rounded text-xs font-medium ${orderType === 'LIMIT' ? 'bg-primary text-primary-foreground' : 'border text-muted-foreground'}`}>
          Limit
        </button>
        <button onClick={() => setOrderType('IOC')}
          className={`flex-1 py-1 rounded text-xs font-medium ${orderType === 'IOC' ? 'bg-primary text-primary-foreground' : 'border text-muted-foreground'}`}>
          Immediate or Cancel
        </button>
      </div>
      {orderType === 'IOC' && (
        <p className="text-xs text-muted-foreground">Fills immediately if a matching order exists, otherwise cancelled.</p>
      )}

      {!isIOC && (
        <div>
          <label className="text-xs text-muted-foreground">
            Price ({mode}) (1 – 100¢)
          </label>
          <div className="relative">
            <input type="number" placeholder="e.g. 65" value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              className="w-full pl-3 pr-8 py-2 border rounded text-sm" min="1" max="100" step="1" />
            <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">¢</span>
          </div>
        </div>
      )}
      <div>
        <label className="text-xs text-muted-foreground">Quantity (shares)</label>
        <input type="number" placeholder="e.g. 10" value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm" min="1" />
      </div>

      {valid && (
        <p className="text-xs text-muted-foreground">
          {isIOC ? 'Max Cost' : 'Cost'}: ${(displayCostPrice * parseInt(quantity)).toFixed(2)}
        </p>
      )}
      {!isIOC && limitPrice && (price <= 0 || price > 1) && (
        <p className="text-xs text-red-600">Price must be between 1 and 100</p>
      )}

      <button onClick={handleSubmit} disabled={loading || !valid}
        className={`w-full py-2 rounded font-bold text-sm text-white disabled:bg-gray-300 disabled:cursor-not-allowed ${action === 'Buy' ? buyColor : sellColor}`}>
        {loading ? 'Placing...' : `${action} ${mode} ${isIOC ? 'Immediately' : `@ ${limitPrice ? `${limitPrice}¢` : '—'}`}`}
      </button>

      {message && (
        <p className={`text-xs ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</p>
      )}
    </div>
  )
}
