/**
 * Alpaca Market Data v2 stock bars REST client (shared by Prisma ingest and Supabase pipeline).
 */

const ALPACA_DATA_BASE = 'https://data.alpaca.markets/v2'

export interface AlpacaBar {
  t: string
  o: number
  h: number
  l: number
  c: number
  v: number
  vw: number
  n: number
}

export interface AlpacaBarsResponse {
  bars: AlpacaBar[]
  next_page_token: string | null
}

function getAlpacaHeaders(): Record<string, string> {
  const key = process.env.ALPAKA_API_KEY
  const secret = process.env.ALPAKA_API_SECRET
  if (!key || !secret) {
    throw new Error('ALPAKA_API_KEY and ALPAKA_API_SECRET must be set in environment')
  }
  return {
    'APCA-API-KEY-ID': key,
    'APCA-API-SECRET-KEY': secret,
    Accept: 'application/json',
  }
}

/**
 * Fetch 1-minute bars for [start, end] with pagination (IEX feed, raw adjustment).
 */
export async function fetchBarsFromAlpaca(
  symbol: string,
  start: Date,
  end: Date,
): Promise<AlpacaBar[]> {
  const headers = getAlpacaHeaders()
  const sym = symbol.trim().toUpperCase()
  const allBars: AlpacaBar[] = []
  let pageToken: string | null = null

  do {
    const url = new URL(`${ALPACA_DATA_BASE}/stocks/${encodeURIComponent(sym)}/bars`)
    url.searchParams.set('timeframe', '1Min')
    url.searchParams.set('start', start.toISOString())
    url.searchParams.set('end', end.toISOString())
    url.searchParams.set('limit', '10000')
    url.searchParams.set('adjustment', 'raw')
    url.searchParams.set('feed', 'iex')
    if (pageToken) url.searchParams.set('page_token', pageToken)

    const res = await fetch(url.toString(), { method: 'GET', headers })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Alpaca bars request failed (${res.status}): ${body}`)
    }

    const data = (await res.json()) as AlpacaBarsResponse
    if (data.bars) allBars.push(...data.bars)
    pageToken = data.next_page_token ?? null
  } while (pageToken)

  return allBars
}
