<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a name="readme-top"></a>

<!-- PROJECT SHIELDS -->

[![Issues][issues-shield]][issues-url]

<!-- PROJECT LOGO --> 
<br />
<div align="center">
  <a href="https://github.com/jhu-oose-sp26/InvestEd">
    <!-- <img src="[PATH_TO_LOGO_IMAGE]" alt="[LOGO_ALT_TEXT]" width="80" height="80"> -->
  </a>

  <h3 align="center">InvestEd</h3>
  <h4 align="center">Hopkins Quant Trading</h4>

  <p align="center">
    A scalable mock trading platform for JHU students to practice trading skills in a risk-free environment.
    <br />
    <a href="https://github.com/jhu-oose-sp26/InvestEd"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <!-- <a href="[DEMO_URL]">View Demo</a> .-->
    
  <a href="https://github.com/jhu-oose-sp26/InvestEd/issues">Report Bug</a> |
  <a href="https://github.com/jhu-oose-sp26/InvestEd/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project
A scalable mock trading platform for JHU students to practice trading skills in a risk-free environment.

## Live Demo: [InvestEd](https://invested-ivory.vercel.app/)

## Tech Stack

- **Frontend**: Next.js (App Router) with TypeScript, Tailwind CSS, and Shadcn UI
- **Backend**: Node.js with TypeScript, service-oriented architecture
- **Database**: PostgreSQL with Prisma ORM
- **Market Data**: PostgreSQL-backed historical price store; real-time via Finnhub

## Project Structure

```
InvestEd/
├── prisma/                  # Database schema & migrations
│   └── schema.prisma        # User, Trade, and Position models
├── market_data_pipeline/    # S3 → Postgres historical loader (Python)
├── src/
│   ├── app/                 # Next.js App Router (Routing & Layouts)
│   │   ├── (dashboard)/     # Route group for authenticated user view
│   │   │   ├── markets/     # Live markets table (real-time prices)
│   │   │   ├── portfolio/   # Page to track total value and returns
│   │   │   └── trade/       # Page for buying and selling assets
│   │   └── api/             # Backend API routes (REST endpoints)
│   ├── features/            # Domain-driven modules (Core Logic)
│   │   ├── trading/         # Trade validation & execution engine
│   │   ├── portfolio/       # P&L calculation & valuation logic
│   │   └── market-data/     # Postgres quotes + Finnhub live (WebSocket + REST)
│   ├── components/          # Reusable UI primitives (Buttons, Inputs)
│   ├── lib/                 # Utility toolkits (Prisma client, Axios config)
│   └── hooks/               # Custom React hooks (e.g., useLivePrice)
├── .env                     # Environment variables (API Keys, DB URL)
└── package.json
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

* Node.js 18+ and npm/yarn
* Docker Desktop (recommended for local Postgres)

### Installation


1. Clone the repository 

```sh
   git clone https://github.com/jhu-oose-sp26/InvestEd.git 
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables
    ```bash
    cp .env.example .env
    ```

    Edit `.env` and add your:
    - `DATABASE_URL`: PostgreSQL connection string
    and ensure DB credentials match:
    - `POSTGRES_USER`
    - `POSTGRES_PASSWORD`
    - `POSTGRES_DB`

    Optional (real-time quotes, live strip, Markets page):
    - `FINNHUB_API_KEY` – [Finnhub Dashboard](https://finnhub.io/dashboard). See `src/features/market-data/finnhub/REQUIREMENTS.md`.

4. Start Postgres (from the **project root** — same folder as `docker-compose.yml`):

```bash
docker compose up -d
docker compose logs -f db
```

5. Set up the database schema:

```bash
  # Generate Prisma client
  npm run db:generate

  # Push schema to database (or use migrations for production)
  npm run db:push
```

    - P3005 on migrate deploy: Baseline by marking migrations that already match your DB as applied (prisma migrate resolve --applied <folder>), then migrate deploy; see Prisma’s baseline production DB docs.

6. Seed the development users (optional, helps with local testing):

```bash
npx prisma db seed
```

7. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Automated Market Maker (AMM) Bot

The AMM Bot ensures that all open prediction markets have consistent liquidity and reasonable bid-ask spreads, allowing users to trade even when there are no other human participants on the other side of the order book.

#### What It Does

1. **Continuous Quoting**: The bot scans all `OPEN` prediction markets and automatically places paired `YES` (Bid) and `NO` (Ask) limit orders of 100 shares each.
2. **Spread Tightening**: It analyzes existing user orders in the book. If there is a wide gap between user bids and asks, the bot will step in and quote a tighter spread (providing a minimum 20% price improvement) to encourage trading.
3. **Inventory Risk Management (Skewing)**: The bot tracks its own net inventory. If it buys too many `YES` shares (meaning users are selling `YES` heavily), it will mathematically "skew" its mid-price downwards to attract `NO` buyers and balance its risk. It uses a sensitivity factor where each net share shifts the quoted price by a fraction of a cent.
4. **Boundary Enforcement**: The bot enforces a maximum price of `0.95` (95¢) and a minimum price of `0.05` (5¢), ensuring it never prices itself into an automatic loss and always respects the 1–100¢ boundary.

#### How to Start the Bot

The bot is written in TypeScript and can be executed using `tsx` .

##### Single Execution (One-time Pass)
To run the bot through a single cycle where it assesses all markets, places new quotes, and then exits:
```bash
npx tsx bots/amm.ts
```

##### Continuous Execution (Loop)
To run the bot persistently so it acts as an automated market maker (running every 10 seconds):
```bash
node run-bot.js --loop
```

### Error codes (JSON)

When something goes wrong, many handlers return JSON in this shape:

```json
{ "error": "<short message for people using the app> (<CODE>)", "code": "<CODE>" }
```

The `error` string is meant for UI or support (wording avoids naming external data vendors or internal routes). The `code` is the same token repeated for easy search. **Developer reference** (what to check in logs or code) is defined once in [`src/lib/api/httpErrors.ts`](src/lib/api/httpErrors.ts). The table below mirrors the `dev` field for each code.

| Code | Developer reference |
|------|----------------------|
| IE_GEN_001 | Unhandled exception in an API route; inspect server logs for the stack trace. |
| IE_VAL_001 | Request query or body failed schema validation (e.g. Zod). Details logged server-side. |
| IE_VAL_002 | Date parsing failed for start/end parameters. |
| IE_VAL_003 | `start >= end` after parsing dates. |
| IE_VAL_004 | `GET /api/live-quote` without a non-empty `symbol` query param. |
| IE_VAL_005 | `GET /api/live-quotes` with empty or missing symbols list. |
| IE_VAL_006 | `GET /api/bars` missing symbol, start, or end. |
| IE_VAL_007 | `POST /api/trades` missing symbol, type, or quantity. |
| IE_VAL_008 | `POST /api/trades` type not BUY or SELL. |
| IE_VAL_009 | `GET /api/quote` missing symbol query param. |
| IE_CFG_001 | `FINNHUB_API_KEY` missing or blank in server environment. |
| IE_CFG_002 | Supabase not configured (HOST / POSTGRES_PASSWORD for candle pipeline). |
| IE_MKT_001 | Finnhub rate limit (429) or equivalent from quote service. |
| IE_MKT_002 | `getLiveQuote` returned null after REST/WebSocket attempts. |
| IE_MKT_003 | Unexpected error from Finnhub client or live quote path (non-rate-limit). |
| IE_MKT_004 | `GET /api/quote` provider threw or returned unusable data. |
| IE_TRD_001 | `tradeService.executeTrade` returned `success: false` (business rule failure). |
| IE_TRD_002 | Unhandled exception in `POST /api/trades`. |
| IE_PFO_001 | Exception in `GET /api/portfolio`. |
| IE_PFO_002 | Exception in `GET /api/portfolio/history`. |
| IE_BAR_001 | Exception in `GET /api/bars` (ensureBars, Prisma, or bucketing). |
| IE_CAN_001 | Supabase query error on `market_candles`. |
| IE_CAN_002 | Unhandled exception in `GET /api/candles`. |
| IE_QSN_001 | Supabase query error on `market_quote_snapshots`. |
| IE_QSN_002 | Unhandled exception in `GET /api/quote-snapshots`. |
| IE_QZ_404 | Custom quiz or question id not found. |
| IE_QZ_403 | User does not own private quiz or lacks permission. |
| IE_QZ_V01 | `POST /api/custom-quizzes`: title missing or blank. |
| IE_QZ_V02 | Quiz title length > 200. |
| IE_QZ_V03 | PATCH `isPublic: true` with zero questions. |
| IE_QZ_V04 | PATCH quiz: title provided but empty string. |
| IE_QZ_V05 | PATCH quiz: title too long. |
| IE_QZ_V06 | POST question: prompt missing or blank. |
| IE_QZ_V07 | POST question: `options` length not in [2, 6]. |
| IE_QZ_V08 | POST question: an option string was blank. |
| IE_QZ_V09 | `correctAnswer` not in `options`. |
| IE_QZ_V10 | PATCH question: `options` length invalid. |
| IE_QZ_V11 | PATCH question: empty option string. |
| IE_QZ_V12 | PATCH question: `correctAnswer` not in new options set. |
| IE_QZ_SRV | Unhandled Prisma or server error in custom-quiz routes. |
| IE_QDAILY_001 | Quiz dataset missing (ENOENT) or not deployed. |
| IE_QDAILY_002 | `getDailyQuestions` threw a non-ENOENT error. |
| IE_QTR_001 | `GET /api/quarterly-reports` database or server error. |
| IE_REP_001 | No rows in `quarterlyReport` table (pipeline not run). |
| IE_REP_002 | Missing or invalid `left` / `right` query params after normalization. |
| IE_REP_003 | `left` and `right` symbols are identical. |
| IE_REP_004 | Symbol not present in loaded quarterly reports. |
| IE_REP_005 | No common quarters between the two symbols. |
| IE_REP_006 | Requested quarter not in common set for both symbols. |
| IE_REP_007 | Unhandled error in report matchup/options handlers. |
| IE_CLT_001 | Client `fetch` failed in `useLiveQuotes` (network or bad response). |
| IE_CLT_002 | Client `fetch` failed in `useLivePrice` (network or bad response). |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

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

<!-- _For more examples, please refer to the [Documentation]([DOCS_URL])_ -->

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

### Must-have 

- [ ] Buy and sell stocks using real market data with virtual money (practice trading without financial risk)
- [x] Stock prices automatically update from a live market data source (trades reflect real market conditions)
- [x] Historical stock prices stored and consistently updated (portfolio valuation and price history charts accurate over time)
- [x] Real-time quote display 
- [ ] Basic price history visualization (understand recent market trends before placing trades)
- [ ] Total portfolio value based on simulated trades (monitor performance and see how decisions affect outcomes over time)
- [x] Financial statement multiple-choice quiz rounds (improve financial analysis skills through structured competition)

### Nice-to-have 

- [ ] Create an account and log in securely (trades, progress, and strategies saved and tied to user across sessions)
- [ ] Invite friends and engage in educational competition
- [ ] Create or join private friend groups with separate leaderboards (compete directly with people you know)
- [ ] Global leaderboard ranking users by performance metrics (e.g. total return %, annualized return, portfolio growth rate)
- [ ] Daily trading challenges with predefined constraints (e.g. tech stocks only, long-only, low-volatility strategy)
- [ ] Historical charts and transaction logs (reflect on trading behavior and identify patterns)
- [ ] “Stocks Wrapped” summary (semester/year highlights, performance trends, growth)
- [ ] Swipe through stocks or options with brief insights (quickly discover and shortlist assets)
- [ ] Describe trading strategies in plain English (test ideas without learning to code)
- [ ] Plain-English strategy automatically converted into executable code for testing

See the [open issues](https://github.com/jhu-oose-sp26/InvestEd/issues) for a full list of proposed features (and known issues).

### Finnhub real-time data flow

The server keeps one WebSocket to Finnhub and an in-memory trade cache. Previous close is cached from an occasional REST `/quote` response; change and percent change are derived from the latest WebSocket price vs that previous close (reducing repeated `/quote` calls). The default WebSocket watchlist is defined in `src/features/market-data/finnhub/watchlistSymbols.ts`.

<!-- CONTRIBUTING
## Contributing

[CONTRIBUTING_INTRO]

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/[FeatureName]`)
3. Commit your Changes (`git commit -m 'Add some [FeatureName]'`)
4. Push to the Branch (`git push origin feature/[FeatureName]`)
5. Open a Pull Request -->
<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

- Mischa Kumar - [mkumar40@jh.edu](mailto:mkumar40@jh.edu)
- Vicki Chen - [vchen30@jh.edu](mailto:vchen30@jh.edu)
- Misha Zhernevskii - [mzherne1@jh.edu](mailto:mzherne1@jh.edu)
- Hanliang Xu - [hxu110@jh.edu](mailto:hxu110@jh.edu)
- Vrinda Sehgal - [vsehgal2@jh.edu](mailto:vsehgal2@jh.edu)

Project Link: [InvestEd](https://github.com/jhu-oose-sp26/InvestEd)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

<!-- [ACKNOWLEDGMENTS_INTRO] -->

* [Resource 1]([RESOURCE_1_URL])
* [Resource 2]([RESOURCE_2_URL])
* [Resource 3]([RESOURCE_3_URL])
<!-- Add more resources as needed -->

<p align="right">(<a href="#readme-top">back to top</a>)</p>


---

## Quiz Features (Hanliang)

This section covers the quiz-related features: the Daily Challenge, statement-reading questions, and user-created custom quizzes. These are maintained separately from the core trading features above.

### How it works

- **Daily Challenge** (`/quiz`): generates 5 questions per day from MAG7 quarterly financial data stored in the `quarterly_reports` DB table. Falls back to conceptual-only questions if the table is empty.
- **Statement Reading**: a subset of Daily Challenge questions that show real financial statement tables (income, cash flow) and ask users to read/compute values directly.
- **Custom Quizzes** (`/quiz/custom`): users can create, edit, share, and take their own multiple-choice quizzes via a form builder.

### Prerequisites

In addition to the base setup (Postgres running, schema pushed, temp user seeded), you need a Financial Modeling Prep API key to populate the quarterly report data.

Get one free at [financialmodelingprep.com](https://financialmodelingprep.com/developer/docs/).

### 1. Set up Python environment

```bash
python3 -m venv market_data_pipeline/.venv
market_data_pipeline/.venv/bin/pip install -r market_data_pipeline/requirements.txt
```

### 2. Fetch financial statements and price history

```bash
source market_data_pipeline/.venv/bin/activate

export FMP_API_KEY=your_fmp_key
python3 market_data_pipeline/financial_stmts.py
python3 market_data_pipeline/download_yfinance_prices.py
```

This downloads MAG7 (AAPL, MSFT, AMZN, GOOGL, META, NVDA, TSLA) quarterly financials and daily closing prices into local files under `mag7_fmp_financials/` and `market_data_pipeline/yfinance_daily/`.

### 3. Build the dataset and load into the database

```bash
python3 market_data_pipeline/build_report_matchup_data.py --database-url "$DATABASE_URL"
```

This merges the financials and price data into quarterly report records and upserts them into the `quarterly_reports` table. Re-running is safe (idempotent).

To also write the JSON file (useful for inspection):
```bash
python3 market_data_pipeline/build_report_matchup_data.py --database-url "$DATABASE_URL" --output mag7_fmp_financials/_derived/quarterly_report_matchups.json
```

### 4. Verify

| Page | URL | What to check |
|------|-----|---------------|
| Daily Challenge | `/quiz` | 5 questions load; some show a financial table in the context box |
| Custom Quizzes | `/quiz/custom` | Listing page loads |
| Create a quiz | `/quiz/custom/new` | Add a title + questions, save → redirects to take page |
| Take a quiz | `/quiz/custom/[id]` | Options shuffle, score shows at the end |
| Edit a quiz | `/quiz/custom/[id]/edit` | Changes persist after save |
| Report Matchup API | `/api/report-matchup?left=AAPL&right=MSFT&quarter=2024-Q2` | Returns JSON from DB |

> **Custom Quizzes work without step 2–3.** Only the Daily Challenge and Report Matchup APIs require the quarterly data to be loaded.

---

## Market Making Bot (Prediction Markets)

InvestEd includes a built-in automated market maker (AMM) bot that provides liquidity to open prediction markets. It runs as a standalone daemon process and uses an **Order Book Imbalance (Microstructure)** strategy.

### How the AMM Works
- The bot constantly monitors the user-driven order book for open markets.
- It calculates a `mid_price` based on the highest user bid and lowest user ask.
- It then places its own bids and asks inside the user spread to provide a tighter, liquid market (e.g., if users are bidding 0.40 and asking 0.60, the bot might bid 0.45 and ask 0.55).
- **Inventory Skew:** To prevent the bot from going bankrupt by taking only one side of the trades, it skews its prices based on its current inventory (net position). For example, if it accumulates too many NO shares, it shifts its entire spread upwards to encourage users to sell YES to it.

### Running the Bot Locally

To start the bot, simply run the following command from the root directory:

```bash
node run-bot.js
```

Or run it in a continuous loop using the provided argument:

```bash
node run-bot.js --loop
```

*(Note: Ensure your database is running and `DATABASE_URL` is set in your `.env` before starting the bot).*

---
### Market Data Provider (`MarketDataProvider.ts`)

Reads latest stored prices per symbol from Postgres (`market_prices`).

### Portfolio Service (`PortfolioService.ts`)

Calculates portfolio valuation from latest stored prices:

- **Latest Stored Pricing**: Fetches latest stored market prices per symbol
- **P&L Calculation**: Unrealized profit/loss for each position
- **Portfolio Summary**: Total value, invested amount, and returns

### Real-time data (Finnhub)

Data flow: WebSocket trade stream for price updates; previous close is seeded from REST and reused so change / % move vs prior close stay accurate without polling `/quote` every request. Default WebSocket watchlist: `src/features/market-data/finnhub/watchlistSymbols.ts`.

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

### Code Structure

- **Features**: Domain-specific logic organized by feature (trading, portfolio, market-data)
- **Services**: Business logic with database operations
- **API Routes**: Next.js API endpoints that use services
- **Components**: Reusable UI components (to be extended with Shadcn UI)

## Next Steps

1. **Authentication**: Implement user authentication (NextAuth.js recommended)
2. **Shadcn UI Components**: Add more UI components from Shadcn UI library
3. **Testing**: Add unit and integration tests
5. **Error Boundaries**: Add React error boundaries for better error handling
6. **Type Safety**: Enhance TypeScript types and validation

## License

MIT

<!-- MARKDOWN LINKS & IMAGES -->
[issues-shield]: https://img.shields.io/github/issues/[USERNAME]/[REPO].svg?style=for-the-badge
[issues-url]: https://github.com/jhu-oose-sp26/InvestEd/issues
[Tech1-badge]: [TECH1_SHIELD_URL]
[Tech1-url]: [TECH1_WEBSITE_URL]
[Tech2-badge]: [TECH2_SHIELD_URL]
[Tech2-url]: [TECH2_WEBSITE_URL]
[Tech3-badge]: [TECH3_SHIELD_URL]
[Tech3-url]: [TECH3_WEBSITE_URL]
