# Finnhub data pipeline

Real-time quote data from [Finnhub](https://finnhub.io/docs/api) for the app: WebSocket trade stream + REST Quote fallback.

## Setup and requirements

See **REQUIREMENTS.md** for:

- API key (Finnhub Dashboard), `FINNHUB_API_KEY` in `.env`
- Rate limits (30 req/s, 1 WebSocket per key)
- TypeScript path alias `@finnhub-data-pipeline`
- **WebSocket vs REST**: when each is used and why (change / % from REST only)
- **Where data is stored**: in-memory cache only; no Postgres persistence for live quotes
- **UI**: Live markets strip, Markets page, Trade page live price

## Public API (for app, graphs, UI)

Import from `@finnhub-data-pipeline`:

- `getLiveQuote(symbol, apiKey, staleMs?)` → single quote
- `getLiveQuotes(symbols, apiKey, staleMs?)` → multiple quotes (strip, table, graphs)
- Types: `FinnhubLiveQuote` (includes optional `change`, `percentChange`), `FinnhubQuoteResponse`, `FinnhubTradeItem`, `FinnhubTradeMessage`

## App usage

| Use case | API | Hook | Notes |
|----------|-----|------|--------|
| Trade page (one symbol) | `GET /api/live-quote?symbol=X` | `useLivePrice(symbol)` | Price under symbol input |
| Live strip / Markets table | `GET /api/live-quotes?symbols=...` | `useLiveQuotes(symbols)` | Default symbols in `src/lib/live-markets-symbols.ts`; poll every 3s |
| Portfolio or custom charts | Same | `useLiveQuotes(portfolioSymbols)` | Pass your symbol list |

## Pipeline files

| File | Role |
|------|------|
| `types.ts` | `FinnhubLiveQuote` (price, timestamp, change, percentChange), REST/WS payload types |
| `finnhubRestClient.ts` | REST `GET /quote`; returns price + change + percentChange |
| `finnhubWebSocketClient.ts` | WebSocket to Finnhub; in-memory cache updated on each trade |
| `finnhubLiveQuoteService.ts` | `getLiveQuote` / `getLiveQuotes`; cache-first, REST fallback |
| `index.ts` | Re-exports for `@finnhub-data-pipeline` |

## Dependencies

- **ws** (and **@types/ws**): WebSocket client for Node. In root `package.json`.
