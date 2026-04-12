/**
 * Finnhub WebSocket client for real-time trades.
 * wss://ws.finnhub.io – subscribe by symbol; cache updated on each trade message.
 * One connection per API key. Uses "ws" package (Node).
 */

import WebSocket from 'ws'
import type { FinnhubTradeMessage, FinnhubLiveQuote, FinnhubWsControlMessage } from './types'
import { FINNHUB_WATCHLIST_SYMBOLS } from './watchlistSymbols'

const WS_URL = 'wss://ws.finnhub.io'

/** Notify SSE / stream clients when trade messages update the cache (same Node process only). */
type QuoteCacheListener = (updatedSymbols: readonly string[]) => void
const quoteCacheListeners = new Set<QuoteCacheListener>()

export function subscribeToQuoteCacheUpdates(listener: QuoteCacheListener): () => void {
  quoteCacheListeners.add(listener)
  return () => quoteCacheListeners.delete(listener)
}

function notifyQuoteCacheUpdated(symbols: readonly string[]): void {
  if (!quoteCacheListeners.size || symbols.length === 0) return
  for (const l of quoteCacheListeners) {
    try {
      l(symbols)
    } catch {
      /* ignore subscriber errors */
    }
  }
}

const quoteCache = new Map<string, FinnhubLiveQuote>()
const subscribedSymbols = new Set<string>()
let ws: WebSocket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT = 5
const RECONNECT_MS = 2000
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function send(socket: WebSocket, payload: { type: string; symbol?: string }) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload))
}

function isPingMessage(msg: unknown): msg is FinnhubWsControlMessage {
  return typeof msg === 'object' && msg !== null && (msg as FinnhubWsControlMessage).type === 'ping'
}

function subscribe(socket: WebSocket, symbol: string) {
  const sym = symbol.toUpperCase()
  if (subscribedSymbols.has(sym)) return
  subscribedSymbols.add(sym)
  send(socket, { type: 'subscribe', symbol: sym })
}

function onMessage(socket: WebSocket, data: Buffer | ArrayBuffer | Buffer[]) {
  try {
    const raw = Buffer.isBuffer(data) ? data.toString('utf8') : Array.isArray(data) ? Buffer.concat(data).toString('utf8') : String(data)
    const msg = JSON.parse(raw) as FinnhubTradeMessage | FinnhubWsControlMessage | Record<string, unknown>
    if (isPingMessage(msg)) {
      send(socket, { type: 'pong' })
      return
    }
    if (msg.type !== 'trade' || !Array.isArray((msg as FinnhubTradeMessage).data)) return
    const trade = msg as FinnhubTradeMessage
    const touched: string[] = []
    for (const item of trade.data) {
      const sym = (item.s ?? '').toUpperCase()
      if (!sym) continue
      quoteCache.set(sym, {
        symbol: sym,
        price: item.p,
        timestamp: item.t,
        volume: item.v,
        webSocketUpdatedAt: item.t,
      })
      touched.push(sym)
    }
    if (touched.length) notifyQuoteCacheUpdated([...new Set(touched)])
  } catch { /* ignore */ }
}

function safeClose(socket: WebSocket | null): void {
  if (!socket) return
  try {
    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING ||
      socket.readyState === WebSocket.CLOSING
    ) {
      socket.close()
    }
  } catch {
    /* ignore: e.g. "closed before connection was established" */
  }
}

function connect(apiKey: string): WebSocket {
  const socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(apiKey)}`)
  socket.on('open', () => {
    reconnectAttempts = 0
    subscribedSymbols.forEach((sym) => send(socket, { type: 'subscribe', symbol: sym }))
  })
  socket.on('message', (data) => onMessage(socket, data))
  socket.on('error', (err) => {
    console.error('Live prices WebSocket error:', err)
  })
  socket.on('close', () => {
    // If we already replaced this socket (e.g. ensureSubscribed closed an old one), do not null `ws`.
    if (ws !== socket) return
    ws = null
    if (reconnectAttempts < MAX_RECONNECT)
      reconnectTimer = setTimeout(() => {
        reconnectAttempts++
        reconnectTimer = null
        ws = connect(apiKey)
      }, RECONNECT_MS)
  })
  return socket
}

/**
 * Register one symbol: add to subscription set and open socket if needed.
 * Does not close a CONNECTING socket (avoids breaking batch subscribe).
 */
export function ensureSubscribed(symbol: string, apiKey: string): void {
  if (!apiKey?.trim()) return
  const state = ws?.readyState
  const needNewSocket =
    !ws || state === WebSocket.CLOSED || state === WebSocket.CLOSING
  if (needNewSocket) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    safeClose(ws)
    reconnectAttempts = 0
    ws = connect(apiKey)
  }
  subscribe(ws!, symbol)
}

/** Subscribe the full watchlist (idempotent). Call when serving live quotes so WS receives trades for all symbols. */
export function ensureWatchlistSubscribed(apiKey: string): void {
  if (!apiKey?.trim()) return
  for (const sym of FINNHUB_WATCHLIST_SYMBOLS) {
    ensureSubscribed(sym, apiKey)
  }
}

/** Current subscription set (for debugging / admin tools). */
export function getSubscribedSymbols(): string[] {
  return [...subscribedSymbols].sort()
}

export function getCachedQuote(symbol: string): FinnhubLiveQuote | null {
  return quoteCache.get(symbol.toUpperCase()) ?? null
}

export function closeWebSocket(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = null
  safeClose(ws)
  ws = null
  subscribedSymbols.clear()
  quoteCache.clear()
  reconnectAttempts = MAX_RECONNECT
}
