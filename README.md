# InvestEd - Mock Trading Platform

A scalable mock trading platform for JHU students to practice trading skills in a risk-free environment.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) with TypeScript, Tailwind CSS, and Shadcn UI
- **Backend**: Node.js with TypeScript, service-oriented architecture
- **Database**: PostgreSQL with Prisma ORM
- **Market Data**: PostgreSQL-backed historical price store (single source)

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
│   │   └── market-data/     # Market data access layer (Postgres)
│   ├── components/          # Reusable UI primitives (Buttons, Inputs)
│   ├── lib/                 # Utility toolkits (Prisma client, Axios config)
│   └── hooks/               # Custom React hooks (e.g., useLivePrice)
├── .env                     # Environment variables (API Keys, DB URL)
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Docker Desktop (recommended for local Postgres)
- Python 3.10+ (for S3 ingestion script)

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
and ensure DB credentials match:
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

3. Start Postgres:

```bash
docker compose up -d
docker compose logs -f db
```

4. Set up the database schema:

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (or use migrations for production)
npm run db:push
```

5. Seed the placeholder API user (current routes use `temp-user-id`):

```bash
psql "postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5432/<POSTGRES_DB>" \
  -c "INSERT INTO users (id,email,name,\"cashBalance\",\"createdAt\",\"updatedAt\") VALUES ('temp-user-id','temp-user@example.com','Temp User',100000.00,NOW(),NOW()) ON CONFLICT (id) DO NOTHING;"
```

6. Load market prices from S3:

```bash
cp market_data_pipeline/.env.s3.example market_data_pipeline/.env.s3
# Edit .env with your DB values (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DATABASE_URL)
# Edit market_data_pipeline/.env.s3 with your AWS values (AWS_PROFILE or keys, AWS_REGION, S3_BUCKET, S3_PREFIX)
set -a
source .env
source market_data_pipeline/.env.s3
set +a
python3 market_data_pipeline/s3_to_postgres.py --bucket "$S3_BUCKET" --prefix "$S3_PREFIX" --region "$AWS_REGION"
```

7. Run the development server:

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

Reads latest stored prices per symbol from Postgres (`market_prices`).

### Portfolio Service (`PortfolioService.ts`)

Calculates portfolio valuation from latest stored prices:

- **Latest Stored Pricing**: Fetches latest stored market prices per symbol
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

### MarketPrice
- `symbol`: Stock ticker
- `asOfDate`: Trading date
- `open`: Stored open price from your historical pipeline
- `high`: Stored high price from your historical pipeline
- `low`: Stored low price from your historical pipeline
- `close`: Stored close price from your historical pipeline
- `volume`: Optional volume

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

### GET `/api/quote?symbol=AAPL`
Get latest stored quote (mapped from latest close in `market_prices`)

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

### Market Data Ingestion

Use the S3-to-Postgres loader to populate `market_prices`:

```bash
python3 market_data_pipeline/s3_to_postgres.py \
  --bucket your-bucket-name \
  --prefix historical/daily/ \
  --region us-east-2
```

For details and dry-run examples, see `market_data_pipeline/README.md`.

### Code Structure

- **Features**: Domain-specific logic organized by feature (trading, portfolio, market-data)
- **Services**: Business logic with database operations
- **API Routes**: Next.js API endpoints that use services
- **Components**: Reusable UI components (to be extended with Shadcn UI)

## Next Steps

1. **Authentication**: Implement user authentication (NextAuth.js recommended)
2. **Shadcn UI Components**: Add more UI components from Shadcn UI library
3. **Historical Data Pipeline**: Automate ingest from S3 into `market_prices`
4. **Testing**: Add unit and integration tests
5. **Error Boundaries**: Add React error boundaries for better error handling
6. **Type Safety**: Enhance TypeScript types and validation

## License

MIT
