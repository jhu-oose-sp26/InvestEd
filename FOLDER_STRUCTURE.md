# InvestEd Project Structure

```
InvestEd/
├── prisma/
│   └── schema.prisma              # Prisma schema with User, Trade, Position models
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (dashboard)/            # Route group for authenticated views
│   │   │   ├── layout.tsx          # Dashboard layout with navigation
│   │   │   ├── portfolio/
│   │   │   │   └── page.tsx        # Portfolio page with P&L display
│   │   │   └── trade/
│   │   │       └── page.tsx        # Trade execution page
│   │   ├── api/                    # API routes
│   │   │   ├── trades/
│   │   │   │   └── route.ts        # POST /api/trades - Execute trade
│   │   │   ├── portfolio/
│   │   │   │   └── route.ts        # GET /api/portfolio - Get portfolio summary
│   │   │   └── quote/
│   │   │       └── route.ts        # GET /api/quote - Get latest stored quote
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home page
│   │   └── globals.css             # Global styles with Tailwind
│   ├── features/                   # Domain-driven feature modules
│   │   ├── trading/
│   │   │   └── TradeService.ts     # Atomic trade execution with transactions
│   │   ├── portfolio/
│   │   │   └── PortfolioService.ts # Portfolio valuation & P&L calculation
│   │   └── market-data/
│   │       └── MarketDataProvider.ts # Market data provider (Postgres source)
│   ├── components/                 # Reusable UI components
│   │   └── ui/
│   │       └── button.tsx          # Button component (Shadcn UI style)
│   ├── lib/                        # Utility libraries
│   │   ├── prisma.ts               # Prisma client singleton
│   │   └── utils.ts                # Utility functions (cn helper)
│   └── hooks/                      # Custom React hooks
│       └── (placeholder for future hooks like useLivePrice)
├── .env.example                    # Environment variables template
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

### Pages
- **/**: Home page with navigation
- **/trade**: Trade execution interface
- **/portfolio**: Portfolio overview with positions and P&L
