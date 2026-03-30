/**
 * CLI: load normalized Alpaca bars + Finnhub /quote snapshot into Supabase.
 *
 * Usage (from repo root, with .env loaded):
 *   npm run candles:sync -- AAPL 2026-03-10T14:00:00Z 2026-03-10T16:00:00Z
 *   npm run candles:sync -- AAPL ... --alpaca-only
 *   npm run candles:sync -- AAPL ... --no-quote
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { syncCandlesToSupabase } from '../syncCandles'

config({ path: resolve(process.cwd(), '.env') })

function parseArgs(argv: string[]) {
  const positional: string[] = []
  let includeFinnhubQuote = true
  let includeAlpaca = true

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--no-quote') includeFinnhubQuote = false
    else if (a === '--alpaca-only') {
      includeAlpaca = true
      includeFinnhubQuote = false
    } else if (a === '--quote-only') {
      includeAlpaca = false
      includeFinnhubQuote = true
    } else if (!a.startsWith('-')) positional.push(a)
  }

  return { positional, includeFinnhubQuote, includeAlpaca }
}

async function main() {
  const { positional, includeFinnhubQuote, includeAlpaca } = parseArgs(process.argv)
  const [symbol, startRaw, endRaw] = positional
  if (!symbol || !startRaw || !endRaw) {
    console.error(
      'Usage: npm run candles:sync -- <SYMBOL> <start-ISO> <end-ISO> [--alpaca-only] [--quote-only] [--no-quote]',
    )
    process.exit(1)
  }
  const start = new Date(startRaw)
  const end = new Date(endRaw)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    console.error('Invalid start or end date')
    process.exit(1)
  }
  if (start >= end) {
    console.error('start must be before end')
    process.exit(1)
  }

  const result = await syncCandlesToSupabase({
    symbol,
    start,
    end,
    includeAlpaca,
    includeFinnhubQuote,
  })

  console.log(JSON.stringify(result, null, 2))
  if (result.errors.length) {
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
