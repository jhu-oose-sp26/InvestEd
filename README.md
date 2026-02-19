# InvestEd - Mock Trading Platform

A scalable full-stack mock trading platform designed to grow from simple manual trading to AI-driven strategy execution.



The project is organized into three main components:

1. **Frontend** (`/frontend`) - Next.js application with Tailwind CSS and Shadcn UI
2. **Backend** (`/backend`) - Node.js/TypeScript API server with Fastify
3. **Data Science** (`/data-science`) - Python FastAPI service for analytics and strategy processing


## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Icons**: Lucide React
- **Language**: TypeScript

### Backend (API & WebSocket)
- **Runtime**: Node.js with TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL with Prisma ORM
- **WebSocket**: @fastify/websocket for real-time market data

### Backend (Data Science)
- **Framework**: FastAPI (Python)
- **Analytics**: Pandas, NumPy, Scikit-learn
- **Purpose**: Strategy processing, backtesting, and analytics

### Database
- **PostgreSQL** - Manages complex relationships between users, groups, and trades
- **Prisma** - Type-safe database access and migrations

## Project Structure

```
OOPs/
├── frontend/                 # Next.js frontend application
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # React components
│   │   ├── ui/              # Shadcn UI components
│   │   └── features/        # Feature-specific components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities and services
│   │   ├── services/        # API client and business logic
│   │   └── utils/           # Helper functions
│   └── public/              # Static assets
│
├── backend/                  # Node.js API server
│   ├── src/
│   │   ├── services/        # Business logic
│   │   │   ├── MarketService.ts      # Market data abstraction
│   │   │   ├── TradeEngine.ts        # Atomic trade execution
│   │   │   └── PortfolioService.ts   # Portfolio calculations
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # Route definitions
│   │   ├── middleware/      # Express/Fastify middleware
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   └── prisma/              # Database schema and migrations
│       └── schema.prisma    # Prisma schema definition
│
└── data-science/             # Python FastAPI service
    ├── app/
    │   ├── services/        # Strategy and analytics services
    │   ├── models/          # Pydantic models
    │   └── utils/           # Utility functions
    └── tests/               # Test files
```

## Database Schema

### Core Models

- **User**: Stores user accounts with email and virtual balance
- **Position**: Tracks owned assets (ticker, quantity, average entry price)
- **Trade**: Immutable log of every BUY/SELL transaction (includes nullable `strategyId` for future AI strategies)
- **Group**: For private friend-based leaderboards
- **GroupMember**: Many-to-many relationship between users and groups

See `backend/prisma/schema.prisma` for full schema definition.

## Core Services

### MarketService
Abstracted market data provider supporting multiple APIs (Finnhub/Alpaca):
- `fetchCurrentPrice(ticker)` - Get current price with caching
- `subscribeToPriceTicks(ticker, callback)` - WebSocket subscription for real-time updates
- Data staleness validation (prices must not be older than 60 seconds)

### TradeEngine
Atomic trade execution engine:
- Ensures data integrity with database transactions
- Validates sufficient balance/shares before execution
- Updates user balance, positions, and trade log atomically

### PortfolioService
Portfolio performance calculations:
- **Portfolio Value** = Cash + Σ(Holdings × CurrentPrice)
- **Total Return** = (PortfolioValue - InitialBalance) / InitialBalance × 100
- Leaderboard rankings based on percentage return (fair for different starting balances)




## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and npm/yarn
- **Python 3.9+**
- **PostgreSQL database** (running locally or remote)
- **Market data API key** (Finnhub or Alpaca)

### Quick Start Checklist

- [ ] Node.js 18+ installed
- [ ] Python 3.9+ installed
- [ ] PostgreSQL database running
- [ ] Market data API key obtained (Finnhub or Alpaca)

### Setup Instructions

#### 1. Database Setup

First, set up the PostgreSQL database and run migrations:

```bash
cd backend

# Create .env file (copy from .env.example if available)
# Add your database connection string:
# DATABASE_URL="postgresql://user:password@localhost:5432/invested?schema=public"

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init
```

**Environment Variables for Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/invested?schema=public"
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=http://localhost:3000
MARKET_DATA_PROVIDER=finnhub
FINNHUB_API_KEY=your_finnhub_api_key_here
# OR for Alpaca:
# MARKET_DATA_PROVIDER=alpaca
# ALPACA_API_KEY=your_alpaca_api_key_here
# ALPACA_API_SECRET=your_alpaca_api_secret_here
```

#### 2. Backend Setup

Start the Node.js/TypeScript API server:

```bash
cd backend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The backend will run on `http://localhost:3001`

#### 3. Frontend Setup

Set up the Next.js frontend application:

```bash
cd frontend

# Create .env.local file with:
# NEXT_PUBLIC_API_URL=http://localhost:3001
# NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Install dependencies
npm install

# Initialize Shadcn UI (optional but recommended)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card

# Start development server
npm run dev
```

The frontend will run on `http://localhost:3000`

**Environment Variables for Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

#### 4. Data Science Backend Setup

Set up the Python FastAPI service for analytics:

```bash
cd data-science

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with:
# API_HOST=0.0.0.0
# API_PORT=8000
# FRONTEND_URL=http://localhost:3000

# Start FastAPI server
uvicorn app.main:app --reload
```

The data science API will run on `http://localhost:8000`

**Environment Variables for Data Science** (`data-science/.env`):
```env
API_HOST=0.0.0.0
API_PORT=8000
FRONTEND_URL=http://localhost:3000
```

### Verification

After setting up all services, verify they're running correctly:

1. **Backend API**: Visit `http://localhost:3001` - Should see Fastify server running
2. **Frontend**: Visit `http://localhost:3000` - Should see InvestEd landing page
3. **Data Science API**: Visit `http://localhost:8000/docs` - Should see FastAPI interactive documentation

### Troubleshooting

#### Prisma Connection Error
- Check `DATABASE_URL` in `backend/.env`
- Ensure PostgreSQL is running: `pg_isready` or check service status
- Verify database exists: `createdb invested` (if using local PostgreSQL)
- Test connection: `psql $DATABASE_URL`

#### Port Already in Use
- Change `PORT` in respective `.env` files
- Kill process using port:
  ```bash
  # macOS/Linux
  lsof -ti:3001 | xargs kill
  # Windows
  netstat -ano | findstr :3001
  taskkill /PID <PID> /F
  ```

#### Module Not Found Errors
- Run `npm install` in the respective directory
- Check Node.js version: `node --version` (should be 18+)
- For Python: Ensure virtual environment is activated and run `pip install -r requirements.txt`

#### Shadcn UI Initialization Issues
- Ensure you're in the `frontend` directory
- Run `npx shadcn-ui@latest init` to set up configuration
- Check `tailwind.config.ts` and `components.json` are created

### Next Steps After Setup

1. **Implement MarketService provider** (Finnhub or Alpaca)
2. **Implement TradeEngine atomic transactions**
3. **Implement PortfolioService calculations**
4. **Connect frontend to backend APIs**
5. **Add authentication/authorization**
6. **Implement WebSocket for real-time data** (optional for MVP)

## Key Design Decisions

### Scalability Considerations

1. **Data Refresh Strategy**: For MVP, REST polling every 10-30 seconds is recommended over managing many WebSocket connections. WebSocket support is built but can be enabled incrementally.

2. **Database Integrity**: The schema includes `strategyId` in the Trade table (nullable) to track manual vs. AI-generated trades without future schema changes.

3. **Leaderboard Fairness**: Rankings are based on **percentage return** rather than total equity, ensuring fairness for users with different starting balances or join dates.

4. **Market Data Abstraction**: The `MarketService` uses a strategy pattern, allowing easy switching between providers (Finnhub/Alpaca) without changing business logic.

5. **Atomic Transactions**: All trade operations use database transactions to ensure consistency between balance, positions, and trade logs.

## Non-Functional Requirements

- **Data Staleness**: Market prices must not be older than 60 seconds
- **API-First Approach**: Use official APIs (Finnhub/Alpaca) - avoid web scraping
- **Transaction Integrity**: All trades must be atomic (all-or-nothing)

## Future Enhancements

- AI strategy processing (convert plain English to executable code)
- Advanced backtesting engine
- Real-time WebSocket market data (when needed)
- Risk analysis and position sizing
- Paper trading with real market data

## Development Status

⚠️ **This is a skeleton project** - Most implementation is marked with TODO comments. The structure, schema, and service interfaces are defined, but business logic needs to be implemented.

## License

[Add your license here]

