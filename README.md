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

### Built With

* Next.js
* Node.js
* TypeScript
* Tailwind CSS
* Shadcn UI
* PostgreSQL with Prisma ORM
* PostgreSQL-backed historical price store
* Real-time data via Finnhub

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

    From the **app root** (the directory that contains `package.json` and this README—see [Project Structure](#project-structure); if your checkout nests the app in another folder, `cd` there first):

    ```bash
    npm install
    ```

3. Set up environment variables

    ```bash
    cp .env.example .env
    ```

    Edit `.env` and add your:
    - `DATABASE_URL`: PostgreSQL connection string (local Docker or hosted, e.g. Supabase)
    - If using Docker Compose for Postgres, ensure DB-related vars match: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `HOST`, `PORT`
    - Optional: `FINNHUB_API_KEY`, `ALPAKA_API_KEY`, `ALPAKA_API_SECRET`
    - Firebase (see `.env.example` for details): `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_SERVICE_ACCOUNT_KEY` (or PEM + related vars), etc.

4. Start Postgres **(local development only; skip if `DATABASE_URL` points to a hosted database)**

    From the **app root** (same directory as `docker-compose.yml` and `package.json`):

    ```bash
    docker compose up -d
    docker compose logs -f db
    ```

5. Apply SQL migrations and generate the Prisma client

    The database schema must match `prisma/schema.prisma`. If migrations are not applied, API routes may fail with errors like *column does not exist*.

    ```bash
    npm run db:generate
    ```

    Then run the SQL migration files against **the same database** as `DATABASE_URL`, in this order:

    1. `supabase/migrations/20260329120000_market_candles.sql`
    2. `supabase/migrations/20260329130000_market_quote_snapshots.sql`
    3. Each `migration.sql` under `prisma/migrations/` in chronological order (by folder name), e.g. `20260409120000_add_firebase_uid`, `20260410120000_add_portfolio_name`, etc.

    From the `OOPs` directory, you can apply a file with:
    
    ```bash
    npx prisma db execute --file supabase/migrations/20260329120000_market_candles.sql
    npx prisma db execute --file supabase/migrations/20260329130000_market_quote_snapshots.sql
    npx prisma db execute --file prisma/migrations/20260409120000_add_firebase_uid/migration.sql
    npx prisma db execute --file prisma/migrations/20260410120000_add_portfolio_name/migration.sql
    ```

    Alternatively, paste each file’s contents into your host’s SQL editor (e.g. Supabase). If `prisma migrate deploy` works for your environment, you can use that instead of running each file manually.

    On a **new empty** database, `npm run db:push` may sync the schema in one step; it can fail if the database already has incompatible rows—use the SQL files above in that case.

6. *(Optional)* Seed a demo user and portfolio for local testing:

    ```bash
    npx tsx seed.ts
    ```

    The dashboard uses **Firebase authentication** in the browser; the seed is only for legacy/demo IDs if needed.

7. Run the development server:

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) in your browser. 
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

See the [open issues]([REPO_URL]/issues) for a full list of proposed features (and known issues).

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

- Mischa Kumar - [mkumar40@jh.edu](mailto:your_email@example.com)
- Vicki Chen - [vchen30@jh.edu](mailto:your_email@example.com)
- Misha Zhernevskii - [mzhernevskii@gmail.com](mailto:mzhernevskii@gmail.com)
- Hanliang Xu - [hxu110@jh.edu](mailto:your_email@example.com)
- Vrinda Sehgal - [vsehgal2@jh.edu](mailto:your_email@example.com)

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
### Market Data Provider (`MarketDataProvider.ts`)

Reads latest stored prices per symbol from Postgres (`market_prices`).

### Portfolio Service (`PortfolioService.ts`)

Calculates portfolio valuation from latest stored prices:

- **Latest Stored Pricing**: Fetches latest stored market prices per symbol
- **P&L Calculation**: Unrealized profit/loss for each position
- **Portfolio Summary**: Total value, invested amount, and returns

### Real-time data (Finnhub)

Data flow: server keeps one WebSocket to Finnhub and an in-memory cache; when the UI requests a quote, the app returns from cache or the REST Quote API. Change and percent change come from REST (WebSocket stream does not include them). Default WebSocket watchlist: 35 symbols in `src/features/market-data/finnhub/watchlistSymbols.ts`.

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

### `POST /api/auth/session`
Exchange a Firebase ID token (request body `{ "idToken": "..." }`) for an HTTP-only session cookie.

### `GET /api/auth/me`
Return the signed-in user (from session cookie), or 401 if not authenticated.

### `POST /api/trades`
Execute a trade (BUY or SELL; requires auth).

Request body:
```json
{
  "symbol": "AAPL",
  "type": "BUY",
  "quantity": 10
}
```

### `GET /api/portfolios/[id]`
Portfolio summary (requires auth; id must belong to the signed-in user).

### `GET /api/portfolios/[id]/history`
Portfolio value history for that id.

### `POST /api/portfolios`
Create a paper-trading portfolio for the signed-in user.

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

1. **Shadcn UI Components**: Add more UI components from Shadcn UI library
2. **Testing**: Add unit and integration tests
3. **Error Boundaries**: Add React error boundaries for better error handling
4. **Type Safety**: Enhance TypeScript types and validation

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
