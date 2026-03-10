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


class AlpacaClient:
    """Wrapper around Alpaca's StockHistoricalDataClient."""

    def __init__(self):
        load_dotenv()
        api_key = os.getenv("ALPAKA_API_KEY")
        api_secret = os.getenv("ALPAKA_API_SECRET")

        if not api_key or not api_secret:
            raise ValueError("ALPAKA_API_KEY and ALPAKA_API_SECRET must be set in .env")

        self._client = StockHistoricalDataClient(api_key, api_secret)

    def fetch_bars(self, symbol: str, timeframe=TimeFrame.Minute, days: int = 7):
        """Fetch bars for a symbol over the given lookback period."""
        end = datetime.now()
        start = end - timedelta(days=days)

        request = StockBarsRequest(
            symbol_or_symbols=symbol,
            timeframe=timeframe,
            start=start,
            end=end,
        )

        bars = self._client.get_stock_bars(request)
        return bars[symbol]


class DatabaseConnection:
    """Manages the PostgreSQL connection for market data storage."""

    BATCH_SIZE = 500

    def __init__(self):
        load_dotenv()
        url = os.getenv("DATABASE_URL")
        if not url:
            raise ValueError("DATABASE_URL must be set in .env")
        self._url = self._normalize_url(url)

    @staticmethod
    def _normalize_url(database_url: str) -> str:
        """Remove Prisma-specific query params unsupported by psycopg2."""
        parsed = urlparse(database_url)
        query = [(k, v) for (k, v) in parse_qsl(parsed.query, keep_blank_values=True) if k != "schema"]
        return urlunparse(parsed._replace(query=urlencode(query)))

    def upsert_bars(self, bars, symbol: str, timeframe: str = "1Min") -> int:
        """Upsert bars into market_prices_realtime. Returns number of rows upserted."""
        payload = [
            (
                f"rt_{uuid.uuid4().hex[:24]}",
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
        with psycopg2.connect(self._url) as conn:
            with conn.cursor() as cur:
                for i in range(0, len(payload), self.BATCH_SIZE):
                    batch = payload[i : i + self.BATCH_SIZE]
                    execute_values(cur, sql, batch)
                    upserted += len(batch)
        return upserted


class AlpacaPipeline:
    """Orchestrates fetching market data from Alpaca and storing it in Postgres."""

    def __init__(self):
        self._client = AlpacaClient()
        self._db = DatabaseConnection()

    def run(self, symbol: str = "AAPL", timeframe=TimeFrame.Minute, days: int = 7):
        """Fetch bars, print a sample, and store them in the database."""
        timeframe_label = "1Min"

        print("=" * 70)
        print(f"  {symbol} {timeframe_label} Bars — Last {days} Days")
        print("=" * 70)

        bars = self._client.fetch_bars(symbol, timeframe, days)

        print(f"\n  Total bars retrieved: {len(bars)}\n")

        # Print first 5 bars as a sample
        print("-" * 70)
        print("  Sample (first 5 bars):\n")
        for bar in bars[:5]:
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
        count = self._db.upsert_bars(bars, symbol=symbol, timeframe=timeframe_label)
        print(f"  ✅ Upserted {count} rows into market_prices_realtime")

        print("\n" + "=" * 70)
        print("  Pipeline complete.")
        print("=" * 70)


if __name__ == "__main__":
    pipeline = AlpacaPipeline()
    pipeline.run()
