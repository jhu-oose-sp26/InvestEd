#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import pandas as pd

DEFAULT_COMBINED_DIR = Path("mag7_fmp_financials/_combined")
DEFAULT_PRICE_DIR = Path("market_data_pipeline/yfinance_daily")
DEFAULT_OUTPUT_PATH = Path("mag7_fmp_financials/_derived/quarterly_report_matchups.json")
STATEMENT_FILES = {
    "income": "income_statement.quarter.csv",
    "balance": "balance_sheet.quarter.csv",
    "cashflow": "cash_flow.quarter.csv",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a quarterly report and next-week performance dataset."
    )
    parser.add_argument(
        "--combined-dir",
        type=Path,
        default=DEFAULT_COMBINED_DIR,
        help="Directory containing combined quarterly FMP CSVs.",
    )
    parser.add_argument(
        "--price-dir",
        type=Path,
        default=DEFAULT_PRICE_DIR,
        help="Directory containing yfinance daily OHLCV CSVs.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="Output JSON path (default: writes JSON file).",
    )
    parser.add_argument(
        "--no-json",
        action="store_true",
        help="Skip writing the JSON output file (useful when --database-url is set).",
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL"),
        help="Postgres connection URL. When provided, upserts reports into the quarterly_reports table.",
    )
    return parser.parse_args()


def normalize_database_url(database_url: str) -> str:
    """Remove Prisma-specific query params unsupported by psycopg2."""
    parsed = urlparse(database_url)
    query = [(k, v) for (k, v) in parse_qsl(parsed.query, keep_blank_values=True) if k != "schema"]
    return urlunparse(parsed._replace(query=urlencode(query)))


def clean_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")
    return value


def clean_row(row: dict[str, Any]) -> dict[str, Any]:
    return {key: clean_value(value) for key, value in row.items()}


def quarter_key(statement_date: str) -> str:
    dt = pd.Timestamp(statement_date)
    quarter = ((dt.month - 1) // 3) + 1
    return f"{dt.year}-Q{quarter}"


def release_date_for(row: dict[str, Any]) -> str | None:
    accepted_date = row.get("acceptedDate")
    if accepted_date:
        return str(accepted_date).split(" ")[0]

    filing_date = row.get("filingDate")
    if filing_date:
        return str(filing_date)

    return None


def load_statement_rows(combined_dir: Path) -> dict[tuple[str, str], dict[str, dict[str, Any]]]:
    rows_by_statement: dict[str, dict[tuple[str, str], dict[str, Any]]] = {}

    for statement_name, filename in STATEMENT_FILES.items():
        path = combined_dir / filename
        frame = pd.read_csv(path)
        rows_by_statement[statement_name] = {
            (str(row["symbol"]), str(row["date"])): clean_row(row.to_dict())
            for _, row in frame.iterrows()
        }

    common_keys = set.intersection(*(set(rows.keys()) for rows in rows_by_statement.values()))
    merged: dict[tuple[str, str], dict[str, dict[str, Any]]] = {}
    for key in sorted(common_keys):
        merged[key] = {
            statement_name: rows_by_statement[statement_name][key]
            for statement_name in STATEMENT_FILES
        }
    return merged


def load_price_history(price_dir: Path, symbol: str) -> pd.DataFrame | None:
    path = price_dir / f"{symbol}.csv"
    if not path.exists():
        return None

    frame = pd.read_csv(path)
    if frame.empty or "Date" not in frame.columns or "Close" not in frame.columns:
        return None

    frame["Date"] = pd.to_datetime(frame["Date"])
    frame["Close"] = pd.to_numeric(frame["Close"], errors="coerce")
    frame = frame.dropna(subset=["Date", "Close"]).sort_values("Date")
    return frame.loc[:, ["Date", "Close"]]


def build_performance(history: pd.DataFrame, release_date: str) -> dict[str, Any] | None:
    release_day = pd.Timestamp(release_date)
    window = history.loc[history["Date"] > release_day].head(5).copy()
    if len(window) != 5:
        return None

    start_close = float(window.iloc[0]["Close"])
    end_close = float(window.iloc[-1]["Close"])
    absolute_change = end_close - start_close
    percent_return = 0.0 if start_close == 0 else (absolute_change / start_close) * 100.0

    daily_closes = [
        {
            "date": row["Date"].strftime("%Y-%m-%d"),
            "close": round(float(row["Close"]), 6),
        }
        for _, row in window.iterrows()
    ]

    return {
        "startDate": daily_closes[0]["date"],
        "endDate": daily_closes[-1]["date"],
        "startClose": round(start_close, 6),
        "endClose": round(end_close, 6),
        "absoluteChange": round(absolute_change, 6),
        "percentReturn": round(percent_return, 6),
        "dailyCloses": daily_closes,
    }


def build_reports(
    combined_dir: Path,
    price_dir: Path,
) -> list[dict[str, Any]]:
    merged_rows = load_statement_rows(combined_dir)
    price_cache: dict[str, pd.DataFrame | None] = {}
    reports: list[dict[str, Any]] = []

    for (symbol, statement_date), statements in merged_rows.items():
        release_date = release_date_for(statements["income"])
        if not release_date:
            continue

        if symbol not in price_cache:
            price_cache[symbol] = load_price_history(price_dir, symbol)
        history = price_cache[symbol]
        if history is None:
            continue

        performance = build_performance(history, release_date)
        if performance is None:
            continue

        reports.append(
            {
                "symbol": symbol,
                "quarter": quarter_key(statement_date),
                "statementDate": statement_date,
                "releaseDate": release_date,
                "statements": statements,
                "performance": performance,
            }
        )

    reports.sort(key=lambda report: (report["quarter"], report["symbol"], report["statementDate"]))
    return reports


def upsert_reports(database_url: str, reports: list[dict[str, Any]]) -> int:
    import psycopg2
    from psycopg2.extras import Json, execute_values

    now = datetime.now(timezone.utc)
    payload = [
        (
            f"qr_{uuid.uuid4().hex}",
            r["symbol"],
            r["quarter"],
            r["statementDate"],
            r["releaseDate"],
            Json(r["statements"]),
            Json(r["performance"]),
            now,
            now,
        )
        for r in reports
    ]

    sql = """
        INSERT INTO quarterly_reports
          (id, symbol, quarter, "statementDate", "releaseDate", statements, performance, "createdAt", "updatedAt")
        VALUES %s
        ON CONFLICT (symbol, quarter) DO UPDATE SET
          "statementDate" = EXCLUDED."statementDate",
          "releaseDate"   = EXCLUDED."releaseDate",
          statements      = EXCLUDED.statements,
          performance     = EXCLUDED.performance,
          "updatedAt"     = NOW()
    """

    with psycopg2.connect(normalize_database_url(database_url)) as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, payload)

    return len(payload)


def main() -> None:
    args = parse_args()
    reports = build_reports(args.combined_dir, args.price_dir)

    if not args.no_json:
        payload = {
            "generatedAt": pd.Timestamp.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "reports": reports,
        }
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(payload, indent=2))
        print(f"Wrote {len(reports)} reports -> {args.output}")

    if args.database_url:
        count = upsert_reports(args.database_url, reports)
        print(f"Upserted {count} reports -> Postgres")
    elif args.no_json:
        print("Warning: --no-json set but --database-url not provided. No output written.")


if __name__ == "__main__":
    main()
