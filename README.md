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
* Python 3.10+ (for S3 ingestion script)

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
    - `FINNHUB_API_KEY` – [Finnhub Dashboard](https://finnhub.io/dashboard). See `finnhub_data_pipeline/REQUIREMENTS.md`.

4. Start Postgres
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
6. Seed the placeholder API user (current routes use `temp-user-id`):

```bash
psql "postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5432/<POSTGRES_DB>" \
  -c "INSERT INTO users (id,email,name,\"cashBalance\",\"createdAt\",\"updatedAt\") VALUES ('temp-user-id','temp-user@example.com','Temp User',100000.00,NOW(),NOW()) ON CONFLICT (id) DO NOTHING;"
```

7. Load market prices from S3:

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
8. Run the development server:

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

<!-- MARKDOWN LINKS & IMAGES -->
[issues-shield]: https://img.shields.io/github/issues/[USERNAME]/[REPO].svg?style=for-the-badge
[issues-url]: https://github.com/jhu-oose-sp26/InvestEd/issues
[Tech1-badge]: [TECH1_SHIELD_URL]
[Tech1-url]: [TECH1_WEBSITE_URL]
[Tech2-badge]: [TECH2_SHIELD_URL]
[Tech2-url]: [TECH2_WEBSITE_URL]
[Tech3-badge]: [TECH3_SHIELD_URL]
[Tech3-url]: [TECH3_WEBSITE_URL]
