# InvestEd Project Structure

```
InvestEd/
├── prisma/
│   └── schema.prisma              # Prisma schema with User, Trade, Position models
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (dashboard)/            # Route group for authenticated views
│   │   │   ├── layout.tsx          # Dashboard layout with nav + LiveMarketsStrip
│   │   │   ├── markets/
│   │   │   │   └── page.tsx        # Live markets table (real-time prices)
│   │   │   ├── portfolio/
│   │   │   │   └── page.tsx        # Portfolio page with P&L display
│   │   │   └── trade/
│   │   │       └── page.tsx        # Trade execution page
│   │   ├── api/                    # API routes
│   │   │   ├── trades/
│   │   │   │   └── route.ts        # POST /api/trades - Execute trade
│   │   │   ├── portfolio/
│   │   │   │   └── route.ts        # GET /api/portfolio - Get portfolio summary
│   │   │   ├── quote/
│   │   │   │   └── route.ts        # GET /api/quote - Get latest stored quote
│   │   │   ├── live-quote/
│   │   │   │   └── route.ts        # GET /api/live-quote?symbol= - Finnhub single quote
│   │   │   └── live-quotes/
│   │   │       └── route.ts        # GET /api/live-quotes?symbols= - Finnhub multi (graphs)
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home page
│   │   └── globals.css             # Global styles with Tailwind
│   ├── features/                   # Domain-driven feature modules
│   │   ├── trading/
│   │   │   └── TradeService.ts     # Atomic trade execution with transactions
│   │   ├── portfolio/
│   │   │   └── PortfolioService.ts # Portfolio valuation & P&L calculation
│   │   └── market-data/
│   │       ├── MarketDataProvider.ts # Stored quotes (Postgres)
│   │       ├── executionPrice.ts     # Trade fill price (Finnhub live + Postgres fallback)
│   │       └── finnhub/              # Finnhub WebSocket + REST (`getLiveQuote`, watchlist)
│   ├── components/                 # Reusable UI components
│   │   └── ui/
│   │       └── button.tsx          # Button component (Shadcn UI style)
│   ├── lib/                        # Utility libraries
│   │   ├── prisma.ts               # Prisma client singleton
│   │   └── utils.ts                # Utility functions (cn helper)
│   └── hooks/                      # Custom React hooks
│       ├── useLivePrice.ts         # Single-symbol live price (trade page, tickers)
│       └── useLiveQuotes.ts         # Multi-symbol (portfolio graphs, dashboards)
├── .env.example                    # Environment variables template
├── finnhub_data_pipeline/          # Finnhub real-time (WebSocket + REST)
│   ├── types.ts                    # Finnhub API types
│   ├── finnhubRestClient.ts        # REST Quote client
│   ├── finnhubWebSocketClient.ts   # WebSocket trade stream + cache
│   ├── finnhubLiveQuoteService.ts  # getLiveQuote / getLiveQuotes
│   ├── index.ts                    # Public API for app & graphs
│   ├── REQUIREMENTS.md             # API key, WebSocket vs REST, where data is stored, UI (strip, Markets)
│   └── README.md                   # Overview
├── candle_supabase_pipeline/       # Supabase load: Alpaca 1m bars + Finnhub /quote snapshots
├── supabase/migrations/            # SQL for market_candles + market_quote_snapshots
├── market_data_pipeline/           # S3 to Postgres ingestion scripts
│   ├── s3_to_postgres.py           # Loads OHLCV CSV from S3 into market_prices
│   ├── .env.s3.example             # Team template for local AWS/S3 env
│   └── README.md                   # Pipeline setup and run instructions
├── tests/
│   └── fetch-price-api.test.mjs    # API test for GET /api/quote
├── .gitignore                      # Git ignore rules
├── next.config.js                  # Next.js configuration
├── package.json                    # Dependencies and scripts
├── postcss.config.js               # PostCSS configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
├── README.md                       # Project documentation
└── FOLDER_STRUCTURE.md             # This file
```

## Key Files

### Core Services
- **TradeService.ts**: Handles atomic trade execution with database transactions
- **PortfolioService.ts**: Calculates portfolio value and P&L
- **MarketDataProvider.ts**: Market data provider reading latest prices from Postgres

### Database
- **schema.prisma**: Defines User, Trade, and Position models with relationships

### API Routes
- **/api/trades**: POST endpoint for executing trades
- **/api/portfolio**: GET endpoint for portfolio summary
- **/api/quote**: GET endpoint for latest stored quote by symbol
- **/api/live-quote**: GET ?symbol=AAPL – Finnhub real-time single quote
- **/api/live-quotes**: GET ?symbols=AAPL,MSFT – Finnhub real-time multi (for graphs)

### Pages
- **/**: Home page with navigation
- **/trade**: Trade execution interface
- **/portfolio**: Portfolio overview with positions and P&L
