# Finnhub real-time data – requirements and setup

## Purpose

- **Real-time data fetching**: Current price for one or many symbols via WebSocket trade stream + REST Quote fallback.
- **Real-time updates**: Server holds one WebSocket connection to Finnhub; trades update an in-memory cache; UI polls the app API, which serves from cache or REST.
- **Trading-style UI**: Live markets strip (ticker) and Markets table show symbol, price, change, and % change (green/red). Change and % come from REST; price can come from WebSocket cache or REST.
- **Future use**: Ready for graphs, portfolio value over time, and dashboards.

## Requirements

### 1. API key

- **Source**: [Finnhub Dashboard](https://finnhub.io/dashboard) (free tier available).
- **Env**: Set `FINNHUB_API_KEY` in `.env` at project root.
- **Usage**: Required for `/api/live-quote` and `/api/live-quotes`. If unset, endpoints return 503; app can fall back to Postgres-backed `/api/quote`.

### 2. Node / npm

- **Node 18+** (for Next.js and `ws` package).
- **Dependencies**: `ws` and `@types/ws` in root `package.json` (already added).

### 3. Rate limits (Finnhub)

- **30 API calls/second** (across all endpoints).
- **1 WebSocket connection per API key** – this pipeline uses a single shared connection and subscribes to symbols on demand.
- On 429, REST client throws; service returns cached quote if available.

### 4. TypeScript

- **Path alias**: `@finnhub-data-pipeline` and `@finnhub-data-pipeline/*` must point to `./finnhub_data_pipeline` in `tsconfig.json`.
- **Include**: `finnhub_data_pipeline/**/*.ts` in `include` so the pipeline is compiled.

## Public API (for app, graphs, UI)

Import from `@finnhub-data-pipeline`:

- **`getLiveQuote(symbol, apiKey, staleMs?)`** – single symbol; returns `FinnhubLiveQuote | null`.
- **`getLiveQuotes(symbols, apiKey, staleMs?)`** – multiple symbols; returns `FinnhubLiveQuote[]` (for portfolio graphs, dashboards).
- **Types**: `FinnhubLiveQuote`, `FinnhubQuoteResponse`, `FinnhubTradeItem`, `FinnhubTradeMessage`.

## App API routes

- **GET `/api/live-quote?symbol=AAPL`** – single quote.
- **GET `/api/live-quotes?symbols=AAPL,MSFT,GOOGL`** – multiple quotes.

**Response shape** (per quote): `{ symbol, price, timestamp, volume?, change?, percentChange? }`.  
`change` and `percentChange` (from previous close) are set when the quote is from the REST API; when served from the WebSocket cache only, they are omitted. Both routes require `FINNHUB_API_KEY`; return 503 with a hint if missing.

## Frontend hooks (for UI and future graphs)

- **`useLivePrice(symbol, pollIntervalMs?)`** – one symbol; returns `{ price, timestamp, loading, error, refetch }`. Use on trade page, detail views, single-asset charts.
- **`useLiveQuotes(symbols, pollIntervalMs?)`** – multiple symbols; returns `{ quotes, loading, error, refetch }`. Use for portfolio value charts, multi-symbol dashboards, comparison graphs.

## WebSocket vs REST (why both)

- **WebSocket (server ↔ Finnhub)**  
  One connection to `wss://ws.finnhub.io`. Trade messages stream in real time; each message has symbol, price, timestamp, volume. The pipeline updates an **in-memory cache** (symbol → latest price) on every trade. Used for fast, live price updates.

- **REST (server → Finnhub)**  
  `GET /quote?symbol=X` returns current price **and** change from previous close (`d`) and percent change (`dp`). The WebSocket trade stream does **not** include change or %; those fields exist only in the REST response. REST is also used when the cache is empty or stale (e.g. symbol just added, or no trades in 60s).

- **Summary**: WebSocket = real-time price into cache. REST = fallback and source of change/percentChange for the UI (strip, Markets table, etc.).

## Where data is stored

- **In-memory only**: The pipeline stores the latest quote per symbol in a `Map` inside `finnhubWebSocketClient.ts`. Nothing is written to Postgres or disk. Cache is lost on server restart.
- **Postgres**: Used for users, trades, positions, and historical `market_prices` (S3 pipeline). Finnhub live quotes are not persisted.

## Data flow

1. **Browser** polls `GET /api/live-quote?symbol=X` or `GET /api/live-quotes?symbols=X,Y` (e.g. every 3s from the live strip or Markets page).
2. **API route** reads `FINNHUB_API_KEY`, calls `getLiveQuote` / `getLiveQuotes` from the pipeline.
3. **Pipeline** subscribes symbols to the Finnhub WebSocket (if not already), checks the cache. If cache has a fresh quote (< 60s), return it (price only; no change/% from WS). Otherwise call REST Quote, return full quote (price, change, percentChange), and cache is updated by WebSocket as trades arrive.

## UI: Live strip and Markets page

- **Live markets strip** (`LiveMarketsStrip`): Renders below the dashboard nav on Trade, Portfolio, and Markets. Shows a horizontal ticker of default symbols (see `src/lib/live-markets-symbols.ts`) with price and change/% in green or red. Polls `/api/live-quotes` every 3s.
- **Markets page** (`/markets`): Full table of the same symbols with columns Symbol, Price, Change, % Change; same polling. Link in nav: “Markets”.
- **Trade page**: Single-symbol live price under the symbol input via `useLivePrice(symbol)` and `/api/live-quote`.

## Future use (graphs and UI)

- **Charts**: Use `useLiveQuotes(portfolioSymbols)` to drive portfolio value over time (e.g. recharts with current prices).
- **Multi-symbol UI**: Same hook or direct fetch to `/api/live-quotes?symbols=...`.
- **Single-asset pages**: Use `useLivePrice(symbol)` for ticker header, order form, or mini sparkline.
- All numeric values use the same `FinnhubLiveQuote` shape (`symbol`, `price`, `timestamp`, optional `volume`, `change`, `percentChange`) for consistency.
