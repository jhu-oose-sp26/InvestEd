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
