"""
Fetch AAPL 1-minute bar data for the past week from Alpaca Markets API,
pretty-print a sample, and store all bars into market_prices_realtime.
"""

import os
import uuid
from datetime import datetime, timedelta
from pprint import pprint
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame


def get_client() -> StockHistoricalDataClient:
    """Create and return an Alpaca StockHistoricalDataClient."""
    load_dotenv()
    api_key = os.getenv("ALPAKA_API_KEY")
    api_secret = os.getenv("ALPAKA_API_SECRET")

    if not api_key or not api_secret:
        raise ValueError("ALPAKA_API_KEY and ALPAKA_API_SECRET must be set in .env")

    return StockHistoricalDataClient(api_key, api_secret)


def normalize_database_url(database_url: str) -> str:
    """Remove Prisma-specific query params unsupported by psycopg2."""
    parsed = urlparse(database_url)
    query = [(k, v) for (k, v) in parse_qsl(parsed.query, keep_blank_values=True) if k != "schema"]
    return urlunparse(parsed._replace(query=urlencode(query)))


def get_database_url() -> str:
    load_dotenv()
    url = os.getenv("DATABASE_URL")
    if not url:
        raise ValueError("DATABASE_URL must be set in .env")
    return normalize_database_url(url)


def fetch_aapl_minute_bars(client: StockHistoricalDataClient):
    """Fetch 1-minute bars for AAPL for the past 7 days."""
    end = datetime.now()
    start = end - timedelta(days=7)

    request = StockBarsRequest(
        symbol_or_symbols="AAPL",
        timeframe=TimeFrame.Minute,
        start=start,
        end=end,
    )

    bars = client.get_stock_bars(request)
    return bars


def store_bars(bars, symbol: str, timeframe: str = "1Min") -> int:
    """Upsert bars into market_prices_realtime. Returns number of rows upserted."""
    db_url = get_database_url()

    payload = [
        (
            f"rt_{uuid.uuid4().hex[:24]}",  # cuid-like id
            symbol,
            bar.timestamp,
            timeframe,
            float(bar.open),
            float(bar.high),
            float(bar.low),
            float(bar.close),
            bar.volume,
            float(bar.vwap) if bar.vwap else None,
            int(bar.trade_count) if bar.trade_count else None,
        )
        for bar in bars
    ]

    sql = """
        INSERT INTO market_prices_realtime
          (id, symbol, timestamp, timeframe, open, high, low, close, volume, vwap, trade_count)
        VALUES %s
        ON CONFLICT (symbol, timestamp, timeframe)
        DO UPDATE SET
          open = EXCLUDED.open,
          high = EXCLUDED.high,
          low = EXCLUDED.low,
          close = EXCLUDED.close,
          volume = EXCLUDED.volume,
          vwap = EXCLUDED.vwap,
          trade_count = EXCLUDED.trade_count
    """

    upserted = 0
    batch_size = 500
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            for i in range(0, len(payload), batch_size):
                batch = payload[i : i + batch_size]
                execute_values(cur, sql, batch)
                upserted += len(batch)
    return upserted


def main():
    client = get_client()

    print("=" * 70)
    print("  AAPL 1-Minute Bars — Last 7 Days")
    print("=" * 70)

    bars = fetch_aapl_minute_bars(client)
    aapl_bars = bars["AAPL"]

    print(f"\n  Total bars retrieved: {len(aapl_bars)}\n")

    # Print first 5 bars as a sample
    print("-" * 70)
    print("  Sample (first 5 bars):\n")
    for bar in aapl_bars[:5]:
        pprint({
            "timestamp": bar.timestamp,
            "open": float(bar.open),
            "high": float(bar.high),
            "low": float(bar.low),
            "close": float(bar.close),
            "volume": bar.volume,
            "vwap": float(bar.vwap) if bar.vwap else None,
            "trade_count": bar.trade_count,
        })

    # Store to database
    print("\n" + "-" * 70)
    print("  Storing to market_prices_realtime...")
    count = store_bars(aapl_bars, symbol="AAPL", timeframe="1Min")
    print(f"  ✅ Upserted {count} rows into market_prices_realtime")

    print("\n" + "=" * 70)
    print("  Pipeline complete.")
    print("=" * 70)


if __name__ == "__main__":
    main()
