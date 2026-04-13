/** Best-effort user-facing string from `{ error: string | Zod-like object }` API bodies. */
export function jsonErrorMessage(j: unknown, fallback: string): string {
  if (!j || typeof j !== 'object') return fallback
  const err = (j as { error?: unknown }).error
  if (typeof err === 'string' && err.trim()) return err
  if (err && typeof err === 'object' && !Array.isArray(err)) {
    const parts: string[] = []
    for (const v of Object.values(err as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === 'string' && item.trim()) parts.push(item)
        }
      }
    }
    if (parts.length) return parts.join(' ')
  }
  return fallback
}
