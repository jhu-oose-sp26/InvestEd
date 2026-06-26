"use client"

import type { LiveQuoteItem } from "@/hooks/useLiveQuotes"
import { softenPublicErrorMessage } from "@/lib/userFacingMessages"
import { setStripPrice } from "@/lib/livePriceCache"

type StreamHandler = {
  onData: (quotes: LiveQuoteItem[]) => void
  onError: (message: string) => void
}

let eventSource: EventSource | null = null
let activeKey = ""
const handlers = new Set<StreamHandler>()
let refCount = 0

/** Last payload per stream key so subscribers that mount after the first SSE message still hydrate. */
const lastQuotesByStreamKey = new Map<string, LiveQuoteItem[]>()

function broadcastData(quotes: LiveQuoteItem[]) {
  if (activeKey) lastQuotesByStreamKey.set(activeKey, quotes)
  for (const q of quotes) {
    if (q.price > 0) setStripPrice(q.symbol, q.price, q.timestamp)
  }
  for (const h of handlers) h.onData(quotes)
}

function broadcastError(message: string) {
  const soft = softenPublicErrorMessage(message)
  for (const h of handlers) h.onError(soft)
}

function streamUrl(key: string): string {
  const parts = key.split(",").filter(Boolean)
  return `/api/live-quotes/stream?symbols=${parts.map(encodeURIComponent).join(",")}`
}

function openStream(key: string) {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
  if (activeKey) lastQuotesByStreamKey.delete(activeKey)
  activeKey = key
  lastQuotesByStreamKey.delete(key)
  const es = new EventSource(streamUrl(key))
  eventSource = es

  es.onmessage = (ev) => {
    try {
      const parsed = JSON.parse(ev.data) as unknown
      if (Array.isArray(parsed)) broadcastData(parsed as LiveQuoteItem[])
    } catch {
      broadcastError("Live prices couldn’t be read correctly. Please refresh the page.")
    }
  }

  es.onerror = () => {
    // Browsers fire this on transient drops (proxy buffering, dev HMR, tab sleep). Closing here
    // prevented native reconnect and we broadcast a hard error while REST was still loading—
    // users saw “not available” for 10s+ incorrectly. Let the EventSource retry; REST refetch still fills UI.
    if (process.env.NODE_ENV === "development") {
      console.warn("[live-quotes] EventSource error (will retry if browser allows), readyState=", es.readyState)
    }
  }
}

/**
 * Stable key: same symbol set shares one EventSource (e.g. strip + Markets page).
 * `key` must be sorted uppercase symbols joined by comma.
 */
export function attachLiveQuotesStream(key: string, handler: StreamHandler): () => void {
  handlers.add(handler)
  refCount += 1

  if (!key) {
    return () => {
      handlers.delete(handler)
      refCount -= 1
      if (refCount <= 0 && eventSource) {
        eventSource.close()
        eventSource = null
        activeKey = ""
      }
    }
  }

  if (!eventSource || activeKey !== key) {
    openStream(key)
  }

  // Deliver immediately so React can batch with the hook’s own updates in the same effect;
  // queueMicrotask deferred one frame and kept rows/strip empty until the next paint.
  const cached = lastQuotesByStreamKey.get(key)
  if (cached && cached.length > 0) {
    handler.onData(cached)
  }

  return () => {
    handlers.delete(handler)
    refCount -= 1
    if (refCount <= 0 && eventSource) {
      const k = activeKey
      eventSource.close()
      eventSource = null
      activeKey = ""
      if (k) lastQuotesByStreamKey.delete(k)
    }
  }
}

export function liveQuotesStreamCacheKey(symbols: readonly string[]): string {
  return [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort().join(",")
}

/**
 * Close and reopen the shared SSE for this key so the server runs a fresh `getLiveQuotes` snapshot.
 * All current subscribers keep receiving events. No-op if nothing is connected for `key`.
 */
export function reconnectSharedLiveQuotesStream(key: string): void {
  if (!key || activeKey !== key || !eventSource) return
  openStream(key)
}
