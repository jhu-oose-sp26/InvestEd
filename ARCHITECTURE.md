# InvestEd Architecture Documentation

## System Architecture

```
┌─────────────────┐
│   Frontend       │  Next.js + React + Tailwind CSS
│   (Port 3000)    │  Shadcn UI Components
└────────┬─────────┘
         │ HTTP/REST + WebSocket
         │
┌────────▼─────────┐
│   Backend API    │  Node.js + Fastify + TypeScript
│   (Port 3001)    │  PostgreSQL + Prisma
└────────┬─────────┘
         │
         ├──────────────┐
         │              │
┌────────▼─────────┐  ┌─▼──────────────┐
│   PostgreSQL     │  │ Data Science   │  Python + FastAPI
│   Database       │  │ (Port 8000)    │  Strategy Processing
└──────────────────┘  └────────────────┘
```

## Core Services Architecture

### 1. MarketService (Backend)
**Purpose**: Abstract market data provider interface

```
MarketService (Strategy Pattern)
    ├── FinnhubProvider
    │   ├── fetchCurrentPrice()
    │   └── subscribeToPriceTicks()
    └── AlpacaProvider
        ├── fetchCurrentPrice()
        └── subscribeToPriceTicks()
```

**Features**:
- Provider abstraction (easy to switch APIs)
- Price caching with staleness validation (60s max)
- WebSocket support for real-time updates

### 2. TradeEngine (Backend)
**Purpose**: Atomic trade execution

```
TradeEngine
    ├── executeBuy()
    │   └── Atomic Transaction:
    │       ├── Validate balance
    │       ├── Deduct cash
    │       ├── Update/create position
    │       └── Log trade
    │
    └── executeSell()
        └── Atomic Transaction:
            ├── Validate shares
            ├── Add cash
            ├── Update/delete position
            └── Log trade
```

**Key Design**:
- All operations in single database transaction
- Rollback on any failure
- Immutable trade log

### 3. PortfolioService (Backend)
**Purpose**: Portfolio calculations and leaderboards

```
PortfolioService
    ├── calculatePortfolioValue()
    │   └── Formula: Cash + Σ(Holdings × CurrentPrice)
    │
    └── calculateLeaderboard()
        └── Rank by: TotalReturnPercent (fair ranking)
```

## Database Schema Relationships

```
User (1) ────< (N) Position
  │
  ├───< (N) Trade
  │
  └───< (N) GroupMember >─── (N) Group
```

**Key Fields**:
- `User.balance`: Decimal(15,2) - Virtual cash balance
- `Position.quantity`: Decimal(15,4) - Supports fractional shares
- `Trade.strategyId`: Nullable - Tracks AI vs manual trades
- `Trade.createdAt`: Immutable timestamp

## Data Flow

### Trade Execution Flow
```
1. Frontend: User submits trade form
2. Backend: TradeController receives request
3. TradeEngine: Validates trade
4. MarketService: Fetches current price
5. TradeEngine: Executes atomic transaction
6. Database: Updates User, Position, Trade
7. Backend: Returns result to frontend
8. Frontend: Updates UI
```

### Market Data Flow
```
Option A (REST Polling - MVP):
  Frontend → Backend API → MarketService → Provider API
  (Poll every 10-30 seconds)

Option B (WebSocket - Future):
  Frontend ←→ Backend WebSocket ←→ MarketService ←→ Provider WebSocket
  (Real-time updates)
```

### Portfolio Calculation Flow
```
1. Frontend: Requests portfolio data
2. Backend: PortfolioService.calculatePortfolioValue()
3. MarketService: Fetches current prices for all positions
4. PortfolioService: Calculates metrics
5. Backend: Returns portfolio data
6. Frontend: Displays portfolio view
```

## Scalability Considerations

### Current Design (MVP)
- REST polling for market data (10-30s intervals)
- Single database connection pool
- Stateless API server

### Future Enhancements
- WebSocket for real-time data (when needed)
- Redis caching for market prices
- Message queue for strategy execution
- Horizontal scaling with load balancer

## Security Considerations

### TODO: Implement
- Authentication (JWT tokens)
- Authorization (user can only access own data)
- Rate limiting on API endpoints
- Input validation (Zod schemas)
- SQL injection prevention (Prisma handles this)
- XSS prevention (React escapes by default)

## Error Handling Strategy

### Backend
- Try-catch blocks in all async operations
- Database transaction rollback on errors
- Structured error responses
- Logging for debugging

### Frontend
- Error boundaries for React components
- User-friendly error messages
- Retry logic for failed API calls

## Testing Strategy (Future)

### Unit Tests
- Service layer logic
- Calculation functions
- Validation functions

### Integration Tests
- API endpoints
- Database transactions
- WebSocket connections

### E2E Tests
- Complete trade flow
- Portfolio updates
- Leaderboard calculations

