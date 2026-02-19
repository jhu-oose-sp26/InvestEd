# InvestEd - Mock Trading Platform

A scalable mock trading platform for JHU students to practice trading skills in a risk-free environment.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) with TypeScript, Tailwind CSS, and Shadcn UI
- **Backend**: Node.js with TypeScript, service-oriented architecture
- **Database**: PostgreSQL with Prisma ORM
- **Market Data**: Finnhub API (easily swappable for other providers)

## Project Structure

```
InvestEd/
├── prisma/                  # Database schema & migrations
│   └── schema.prisma        # User, Trade, and Position models
├── src/
│   ├── app/                 # Next.js App Router (Routing & Layouts)
│   │   ├── (dashboard)/     # Route group for authenticated user view
│   │   │   ├── portfolio/   # Page to track total value and returns
│   │   │   └── trade/       # Page for buying and selling assets
│   │   └── api/             # Backend API routes (REST endpoints)
│   ├── features/            # Domain-driven modules (Core Logic)
│   │   ├── trading/         # Trade validation & execution engine
│   │   ├── portfolio/       # P&L calculation & valuation logic
│   │   └── market-data/     # API wrappers for Finnhub/Alpaca
│   ├── components/          # Reusable UI primitives (Buttons, Inputs)
│   ├── lib/                 # Utility toolkits (Prisma client, Axios config)
│   └── hooks/               # Custom React hooks (e.g., useLivePrice)
├── .env                     # Environment variables (API Keys, DB URL)
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Finnhub API key (free tier available at [finnhub.io](https://finnhub.io))

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your:
- `DATABASE_URL`: PostgreSQL connection string
- `FINNHUB_API_KEY`: Your Finnhub API key

3. Set up the database:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (or use migrations for production)
npm run db:push
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Core Features

### Trading Engine (`TradeService.ts`)

The `TradeService` implements atomic trade execution using Prisma transactions:

- **Atomic Operations**: All trades are executed within database transactions to ensure data consistency
- **Validation**: Checks for sufficient cash (BUY) or shares (SELL) before execution
- **Position Management**: Automatically calculates weighted average buy price for positions
- **Error Handling**: Comprehensive error messages for failed trades

Example usage:

```typescript
import { tradeService } from '@/features/trading/TradeService'

const result = await tradeService.executeTrade({
  userId: 'user-123',
  symbol: 'AAPL',
  type: 'BUY',
  quantity: 10,
  price: 150.00
})
```

### Market Data Provider (`MarketDataProvider.ts`)

Abstract provider pattern allows easy swapping of market data sources:

- **Finnhub Implementation**: Currently uses Finnhub REST API
- **Extensible**: Easy to add Alpaca, Alpha Vantage, or other providers
- **Error Handling**: Graceful handling of API failures

### Portfolio Service (`PortfolioService.ts`)

Calculates real-time portfolio valuation:

- **Real-time Pricing**: Fetches current market prices
- **P&L Calculation**: Unrealized profit/loss for each position
- **Portfolio Summary**: Total value, invested amount, and returns

## Database Schema

### User
- `id`: Unique identifier
- `email`: User email (unique)
- `cashBalance`: Available cash (Decimal, default $100,000)
- `createdAt`, `updatedAt`: Timestamps

### Trade
- `id`: Unique identifier
- `userId`: Foreign key to User
- `symbol`: Stock ticker (e.g., "AAPL")
- `type`: BUY or SELL
- `quantity`: Number of shares
- `price`: Price per share at execution
- `totalValue`: Total trade value
- `executedAt`: Timestamp

### Position
- `id`: Unique identifier
- `userId`: Foreign key to User
- `symbol`: Stock ticker
- `quantity`: Current number of shares owned
- `averageBuyPrice`: Weighted average purchase price
- `updatedAt`: Last update timestamp

## API Routes

### POST `/api/trades`
Execute a trade (BUY or SELL)

Request body:
```json
{
  "symbol": "AAPL",
  "type": "BUY",
  "quantity": 10
}
```

### GET `/api/portfolio`
Get portfolio summary with current valuations

## Development

### Database Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Push schema changes to database
npm run db:push

# Create and run migrations (for production)
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Code Structure

- **Features**: Domain-specific logic organized by feature (trading, portfolio, market-data)
- **Services**: Business logic with database operations
- **API Routes**: Next.js API endpoints that use services
- **Components**: Reusable UI components (to be extended with Shadcn UI)

## Next Steps

1. **Authentication**: Implement user authentication (NextAuth.js recommended)
2. **Shadcn UI Components**: Add more UI components from Shadcn UI library
3. **Real-time Updates**: Add WebSocket support for live price updates
4. **Testing**: Add unit and integration tests
5. **Error Boundaries**: Add React error boundaries for better error handling
6. **Type Safety**: Enhance TypeScript types and validation

## License

MIT

