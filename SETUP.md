# InvestEd Setup Guide

## Quick Start Checklist

### 1. Prerequisites Installation
- [ ] Node.js 18+ installed
- [ ] Python 3.9+ installed
- [ ] PostgreSQL database running
- [ ] Market data API key (Finnhub or Alpaca)

### 2. Database Setup
```bash
cd backend
# Create .env file with:
# DATABASE_URL="postgresql://user:password@localhost:5432/invested?schema=public"
npm install
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Backend Setup
```bash
cd backend
# Add to .env:
# PORT=3001
# HOST=0.0.0.0
# FRONTEND_URL=http://localhost:3000
# MARKET_DATA_PROVIDER=finnhub
# FINNHUB_API_KEY=your_key_here
npm install
npm run dev
```

### 4. Frontend Setup
```bash
cd frontend
# Create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:3001
npm install

# Initialize Shadcn UI (optional but recommended)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card

npm run dev
```

### 5. Data Science Backend Setup
```bash
cd data-science
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file with:
# API_HOST=0.0.0.0
# API_PORT=8000
# FRONTEND_URL=http://localhost:3000

uvicorn app.main:app --reload
```

## Verification

1. **Backend**: Visit http://localhost:3001 - Should see Fastify server running
2. **Frontend**: Visit http://localhost:3000 - Should see InvestEd landing page
3. **Data Science**: Visit http://localhost:8000 - Should see FastAPI docs at /docs

## Next Steps

1. Implement MarketService provider (Finnhub or Alpaca)
2. Implement TradeEngine atomic transactions
3. Implement PortfolioService calculations
4. Connect frontend to backend APIs
5. Add authentication/authorization
6. Implement WebSocket for real-time data (optional for MVP)

## Common Issues

### Prisma Connection Error
- Check DATABASE_URL in backend/.env
- Ensure PostgreSQL is running
- Verify database exists: `createdb invested`

### Port Already in Use
- Change PORT in .env files
- Kill process using port: `lsof -ti:3001 | xargs kill`

### Module Not Found
- Run `npm install` in respective directories
- Check Node.js version: `node --version`

