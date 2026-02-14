# Simulated Trading System — Project Planning

---

## 1. Market Data Setup

### Backend Tasks
- Select market data provider (e.g., Alpaca, Alpha Vantage, etc.)
- Implement price retrieval service:
  - Fetch latest price for ticker
  - Handle invalid ticker symbols
- Handle API failure or timeout
- Normalize returned price format
- Store recent price in database (optional caching)

### Acceptance Criteria
- System returns current (or delayed) price for valid ticker
- Invalid ticker returns structured error message
- No trade uses client-side price (must use backend-fetched price)

---

## 2. Database Design for Simulated Trading

### Tables

#### Portfolio Table
- user_id
- cash_balance

#### Holdings Table
- user_id
- ticker
- shares
- avg_cost

#### Transactions Table
- user_id
- ticker
- type (BUY / SELL)
- shares
- execution_price
- timestamp

### Additional Requirements
- Set default starting virtual cash (e.g., $100,000)

### Acceptance Criteria
- Each user starts with virtual balance
- Transactions are permanently recorded
- Holdings update correctly after trades

---

## 3. Buy Order Logic

### Backend
- Validate user authentication
- Validate ticker exists
- Fetch current price from backend
- Validate sufficient virtual cash
- Deduct cash
- Add/update holding
- Record transaction
- Return updated portfolio snapshot
- Add transaction locking in the database (in case of delayed transactions)

### Edge Cases
- Insufficient funds
- Buying fractional shares (decide yes/no)
- Going into "short" (decide yes/no)
- Extremely small orders
- API price delay

### Acceptance Criteria
- User cannot buy more than available cash allows
- Order executes at backend price
- Portfolio updates immediately

---

## 4. Sell Order Logic

### Backend
- Validate user authentication
- Validate user owns shares
- Validate sell quantity ≤ owned shares
- Fetch current price
- Add cash back
- Update or remove holding
- Record transaction

### Edge Cases
- Selling full position
- Selling partial position
- Attempting to sell nonexistent stock

### Acceptance Criteria
- User cannot sell more shares than owned
- Holding is removed if shares = 0
- Transaction history reflects sale

---

## 5. Trading API Endpoints

### Endpoints
- `POST /trade/buy`
- `POST /trade/sell`
- `GET /portfolio`
- `GET /transactions`

### Acceptance Criteria
- All endpoints require authentication
- Responses return updated portfolio data
- Proper error codes returned (400, 401, etc.)

---

## 6. Frontend Trading Interface

### Features
- Stock search input with ticker validation
- Display:
  - Current price
  - Daily change %

- Quantity input field
- Buy / Sell toggle buttons
- Confirmation modal before execution
- Display error messages clearly
- Refresh portfolio after trade

### Acceptance Criteria
- User can complete a trade in ≤ 3 steps
- UI reflects updated cash + holdings immediately
- Clear feedback for errors

---

## 7. Security & Integrity Controls

- Prevent price manipulation (price fetched server-side only)
- Validate all calculations server-side
- Log all trade execution events
- Prevent duplicate order submission (debounce or idempotency key)

---
