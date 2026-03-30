#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
import yfinance as yf

MAG7 = ["AAPL", "MSFT", "AMZN", "GOOGL", "META", "NVDA", "TSLA"]
OUT_DIR = Path("market_data_pipeline/yfinance_daily")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download daily yfinance OHLCV CSVs.")
    parser.add_argument("--symbol", action="append", dest="symbols", help="Ticker to download.")
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR, help="Output directory.")
    return parser.parse_args()


def normalize_history(history: pd.DataFrame) -> pd.DataFrame:
    if history.empty:
        raise ValueError("No rows returned from yfinance")

    if isinstance(history.columns, pd.MultiIndex):
        history.columns = history.columns.get_level_values(0)

    history = history.reset_index()
    if "Adj Close" in history.columns and "Close" not in history.columns:
        history["Close"] = history["Adj Close"]

    columns = ["Date", "Open", "High", "Low", "Close", "Volume"]
    missing = [column for column in columns if column not in history.columns]
    if missing:
        raise ValueError(f"Missing expected columns: {missing}")

    history = history.loc[:, columns].copy()
    history["Date"] = pd.to_datetime(history["Date"]).dt.strftime("%Y-%m-%d")
    return history.sort_values("Date")


def download_symbol(symbol: str, out_dir: Path) -> Path:
    history = yf.download(
        symbol,
        period="max",
        interval="1d",
        auto_adjust=False,
        progress=False,
        actions=False,
    )
    normalized = normalize_history(history)

    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{symbol}.csv"
    normalized.to_csv(path, index=False)
    return path


def main() -> None:
    args = parse_args()
    symbols = args.symbols or MAG7

    for symbol in symbols:
        path = download_symbol(symbol.upper(), args.out_dir)
        print(f"Saved {symbol.upper()} -> {path}")


if __name__ == "__main__":
    main()
