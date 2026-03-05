"""
Real-time market data pipeline for AAPL using Alpaca Markets API.
Fetches the current snapshot (latest trade, quote, minute bar, daily bar)
and pretty-prints it.
"""

import os
from pprint import pprint

from dotenv import load_dotenv
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockLatestQuoteRequest, StockLatestTradeRequest, StockSnapshotRequest


def get_client() -> StockHistoricalDataClient:
    """Create and return an Alpaca StockHistoricalDataClient."""
    load_dotenv()
    api_key = os.getenv("ALPAKA_API_KEY")
    api_secret = os.getenv("ALPAKA_API_SECRET")

    if not api_key or not api_secret:
        raise ValueError("ALPAKA_API_KEY and ALPAKA_API_SECRET must be set in .env")

    return StockHistoricalDataClient(api_key, api_secret)


def fetch_aapl_snapshot(client: StockHistoricalDataClient) -> dict:
    """Fetch the full snapshot for AAPL and return it as a dict."""
    request = StockSnapshotRequest(symbol_or_symbols="AAPL")
    snapshot = client.get_stock_snapshot(request)
    return snapshot


def fetch_aapl_latest_quote(client: StockHistoricalDataClient) -> dict:
    """Fetch the latest quote for AAPL."""
    request = StockLatestQuoteRequest(symbol_or_symbols="AAPL")
    return client.get_stock_latest_quote(request)


def fetch_aapl_latest_trade(client: StockHistoricalDataClient) -> dict:
    """Fetch the latest trade for AAPL."""
    request = StockLatestTradeRequest(symbol_or_symbols="AAPL")
    return client.get_stock_latest_trade(request)


def main():
    client = get_client()

    print("=" * 60)
    print("  AAPL Real-Time Market Data Pipeline")
    print("=" * 60)

    # --- Snapshot (latest trade + quote + minute bar + daily bar) ---
    print("\n📊 AAPL Snapshot:")
    print("-" * 40)
    snapshot = fetch_aapl_snapshot(client)
    pprint(snapshot)

    # --- Latest Quote ---
    print("\n💬 AAPL Latest Quote:")
    print("-" * 40)
    latest_quote = fetch_aapl_latest_quote(client)
    pprint(latest_quote)

    # --- Latest Trade ---
    print("\n💰 AAPL Latest Trade:")
    print("-" * 40)
    latest_trade = fetch_aapl_latest_trade(client)
    pprint(latest_trade)

    print("\n" + "=" * 60)
    print("  Pipeline complete.")
    print("=" * 60)


if __name__ == "__main__":
    main()
