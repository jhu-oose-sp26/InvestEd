# InvestEd Project Structure

## Complete File Listing

### Frontend (`/frontend`)
```
frontend/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Landing page
│   └── globals.css         # Tailwind CSS + Shadcn variables
├── components/
│   ├── ui/
│   │   └── button.tsx      # Shadcn UI button component (placeholder)
│   └── features/
│       ├── TradeForm.tsx   # Trade execution form
│       ├── PortfolioView.tsx # Portfolio display
│       └── Leaderboard.tsx # Leaderboard display
├── hooks/
│   ├── usePortfolio.ts     # Portfolio data hook
│   └── useMarketData.ts    # Market data subscription hook
├── lib/
│   ├── services/
│   │   ├── api.ts          # API client wrapper
│   │   └── portfolio.ts    # Portfolio API calls
│   └── utils.ts            # Utility functions (cn)
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── tailwind.config.ts      # Tailwind + Shadcn config
├── next.config.js          # Next.js config
└── postcss.config.js       # PostCSS config
```

### Backend (`/backend`)
```
backend/
├── src/
│   ├── index.ts            # Fastify server entry point
│   ├── services/
│   │   ├── MarketService.ts      # Market data abstraction
│   │   ├── TradeEngine.ts        # Atomic trade execution
│   │   └── PortfolioService.ts   # Portfolio calculations
│   ├── controllers/
│   │   ├── tradeController.ts     # Trade request handlers
│   │   └── portfolioController.ts # Portfolio request handlers
│   ├── routes/
│   │   ├── tradeRoutes.ts         # Trade endpoints
│   │   ├── portfolioRoutes.ts     # Portfolio endpoints
│   │   └── marketDataRoutes.ts    # Market data endpoints + WebSocket
│   ├── types/
│   │   └── index.ts               # Shared TypeScript types
│   └── utils/
│       └── db.ts                  # Prisma client initialization
├── prisma/
│   └── schema.prisma       # Database schema (User, Position, Trade, Group)
├── package.json            # Dependencies
└── tsconfig.json           # TypeScript config
```

### Data Science (`/data-science`)
```
data-science/
├── app/
│   ├── main.py             # FastAPI application
│   ├── services/
│   │   └── strategy_service.py # Strategy processing service
│   ├── models/
│   │   └── strategy.py     # Pydantic models for strategies
│   └── utils/
│       └── data_loader.py  # Historical data loading utility
├── requirements.txt        # Python dependencies
└── tests/                  # Test directory (empty)
```

### Documentation
```
├── README.md               # Main project documentation
├── ARCHITECTURE.md         # Architecture details and diagrams
├── SETUP.md                # Setup instructions
└── PROJECT_STRUCTURE.md    # This file
```

## Key Implementation Files

### Core Business Logic (Backend)
1. **`backend/src/services/MarketService.ts`**
   - Abstracted market data provider
   - Supports Finnhub and Alpaca
   - Price caching with staleness validation

2. **`backend/src/services/TradeEngine.ts`**
   - Atomic trade execution
   - BUY/SELL transaction handling
   - Validation and error handling

3. **`backend/src/services/PortfolioService.ts`**
   - Portfolio value calculation
   - Total return calculation
   - Leaderboard ranking

### Database Schema
**`backend/prisma/schema.prisma`**
- User model (id, email, balance)
- Position model (ticker, quantity, avgEntryPrice)
- Trade model (immutable log with strategyId)
- Group and GroupMember models (leaderboards)

### Frontend Services
1. **`frontend/lib/services/api.ts`**
   - API client wrapper
   - WebSocket connection helper

2. **`frontend/lib/services/portfolio.ts`**
   - Portfolio API calls
   - Portfolio calculation utilities

3. **`frontend/hooks/usePortfolio.ts`**
   - React hook for portfolio data
   - Real-time subscription support

## Implementation Status

⚠️ **All files are skeleton implementations with TODO comments**

### Completed
- ✅ Project structure
- ✅ Database schema (Prisma)
- ✅ Service interfaces and class structures
- ✅ Component placeholders
- ✅ Configuration files
- ✅ Type definitions

### Pending Implementation
- ⏳ Market data provider integration (Finnhub/Alpaca)
- ⏳ Trade execution atomic transactions
- ⏳ Portfolio calculation logic
- ⏳ API endpoint implementations
- ⏳ Frontend-backend integration
- ⏳ Authentication/authorization
- ⏳ WebSocket real-time updates
- ⏳ Strategy processing (data science)

## Next Implementation Steps

1. **Start with MarketService**
   - Implement FinnhubProvider.fetchCurrentPrice()
   - Add price caching
   - Test with real API

2. **Implement TradeEngine**
   - Set up Prisma client
   - Implement executeBuy() transaction
   - Implement executeSell() transaction
   - Add validation

3. **Implement PortfolioService**
   - Calculate portfolio value
   - Calculate total return
   - Implement leaderboard

4. **Connect Frontend**
   - Implement API client
   - Connect TradeForm to backend
   - Connect PortfolioView to backend
   - Add error handling

5. **Add Authentication**
   - JWT token system
   - Protected routes
   - User context

