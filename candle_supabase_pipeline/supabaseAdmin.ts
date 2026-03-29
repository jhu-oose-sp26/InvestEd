import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

function getProjectUrl(): string | undefined {
  const h = process.env.HOST?.trim()
  if (!h) return undefined
  if (h.startsWith('http://') || h.startsWith('https://')) return h
  return `https://${h.replace(/\/$/, '')}`
}

function getServiceRoleKey(): string | undefined {
  return process.env.POSTGRES_PASSWORD?.trim()
}

/**
 * Server-side Supabase client (service role). Do not expose to the browser.
 */
export function getSupabaseServiceClient(): SupabaseClient {
  if (cached) return cached
  const url = getProjectUrl()
  const key = getServiceRoleKey()
  if (!url || !key) {
    throw new Error('HOST and POSTGRES_PASSWORD must be set for the candle Supabase client')
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getProjectUrl() && getServiceRoleKey())
}
