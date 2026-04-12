/**
 * Display helpers for quote observation time and how stale it is (client clock).
 */

export function formatQuoteLocalTime(timestampMs: number): string {
  if (!Number.isFinite(timestampMs)) return "—"
  return new Date(timestampMs).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}

/** How long ago the quote timestamp was, relative to `nowMs` (default: Date.now()). */
export function formatQuoteAge(timestampMs: number, nowMs: number = Date.now()): string {
  if (!Number.isFinite(timestampMs)) return "—"
  let deltaSec = Math.round((nowMs - timestampMs) / 1000)
  if (deltaSec < 0) deltaSec = 0
  if (deltaSec < 8) return "just now"
  if (deltaSec < 60) return `${deltaSec}s ago`
  const deltaMin = Math.floor(deltaSec / 60)
  if (deltaMin < 60) return `${deltaMin}m ago`
  const deltaHr = Math.floor(deltaMin / 60)
  if (deltaHr < 48) return `${deltaHr}h ago`
  const deltaDay = Math.floor(deltaHr / 24)
  return `${deltaDay}d ago`
}
