# Market Data Pipeline

Loads OHLCV daily CSV files into Postgres table `market_prices` from S3.

## Prerequisites

- Python 3.10+
- Dependencies:
  - `pip install -r market_data_pipeline/requirements.txt`
- Database schema already pushed (`npm run db:push`)
- `DATABASE_URL` set to your project Postgres

## CSV format expected

The loader supports yfinance-style CSV files like:

```csv
Price,Close,High,Low,Open,Volume
Ticker,AAPL,AAPL,AAPL,AAPL,AAPL
Date,,,,,
1980-12-12,0.09,0.10,0.09,0.09,469033600
```

## Load from S3

Create your local S3 env file from template:

```bash
cp market_data_pipeline/.env.s3.example market_data_pipeline/.env.s3
```

Edit both files before running:
- `.env` (database values and `DATABASE_URL`)
- `market_data_pipeline/.env.s3` (AWS/S3 values)

Then load them in your shell and run ingestion:

```bash
set -a
source market_data_pipeline/.env.s3
set +a

python3 market_data_pipeline/s3_to_postgres.py \
  --bucket "$S3_BUCKET" \
  --prefix "$S3_PREFIX" \
  --region "$AWS_REGION"
```

`DATABASE_URL` is read from your project root `.env`. The loader strips Prisma's `schema=...` URL param automatically for psycopg2 compatibility.

## Local dry-run (no DB writes)

```bash
python3 market_data_pipeline/s3_to_postgres.py \
  --local-glob 'market_data_pipeline/*_daily_full.csv' \
  --dry-run
```

## Load only selected symbols

```bash
python3 market_data_pipeline/s3_to_postgres.py \
  --bucket your-bucket-name \
  --prefix historical/daily/ \
  --symbol AAPL \
  --symbol MSFT
```

## Generate local report matchup data

The quarterly report matchup APIs rely on locally generated files and these artifacts are intentionally not committed.

If you do not already have the Python dependencies installed, create a local virtual environment and install them:

```bash
python3 -m venv market_data_pipeline/.venv
market_data_pipeline/.venv/bin/pip install -r market_data_pipeline/requirements.txt
```

If your active Python environment already has the required packages, you can skip that setup and run the scripts with `python3`.

From the repo root, run:

```bash
export FMP_API_KEY=your_fmp_key
python3 market_data_pipeline/financial_stmts.py
python3 market_data_pipeline/download_yfinance_prices.py
python3 market_data_pipeline/build_report_matchup_data.py
```

This will create:
- `mag7_fmp_financials/` with quarterly FMP statement files and the derived matchup JSON
- `market_data_pipeline/yfinance_daily/` with downloaded daily price CSVs

The APIs expect the derived dataset at `mag7_fmp_financials/_derived/quarterly_report_matchups.json`.
