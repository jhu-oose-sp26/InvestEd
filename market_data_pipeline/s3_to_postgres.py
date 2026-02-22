#!/usr/bin/env python3
"""Ingest OHLCV CSV files from S3 (or local files) into Postgres market_prices."""

from __future__ import annotations

import argparse
import csv
import glob
import io
import os
import re
import sys
import uuid
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Iterable, List, Sequence


@dataclass
class OhlcvRow:
    symbol: str
    as_of_date: date
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: int | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Load OHLCV CSV files from S3 (or local files) into Postgres market_prices."
    )
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--bucket", help="S3 bucket containing CSV files")
    source.add_argument("--local-glob", help='Local file glob, e.g. "./*_daily_full.csv"')
    parser.add_argument("--prefix", default="", help="S3 prefix to scan for CSV files")
    parser.add_argument("--region", default=None, help="AWS region (optional)")
    parser.add_argument("--symbol", action="append", help="Only ingest these symbols (repeatable)")
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL"),
        help="Postgres URL (defaults to DATABASE_URL env var)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Parse only, do not write to Postgres")
    parser.add_argument("--batch-size", type=int, default=1000, help="Batch size for DB upserts")
    return parser.parse_args()


def infer_symbol(filename: str, lines: Sequence[list[str]]) -> str:
    if len(lines) > 1 and lines[1] and lines[1][0].strip().lower() == "ticker":
        for cell in lines[1][1:]:
            candidate = cell.strip().upper()
            if candidate:
                return candidate

    basename = os.path.basename(filename)
    match = re.match(r"([A-Za-z0-9._-]+)", basename)
    if match:
        return match.group(1).split("_")[0].upper()
    raise ValueError(f"Could not infer symbol from {filename}")


def to_decimal(value: str, field_name: str, row_num: int, source_name: str) -> Decimal:
    raw = (value or "").strip()
    if not raw:
        raise ValueError(f"{source_name} row {row_num}: missing {field_name}")
    try:
        return Decimal(raw)
    except Exception as exc:  # pragma: no cover
        raise ValueError(f"{source_name} row {row_num}: invalid {field_name} '{raw}'") from exc


def to_volume(value: str) -> int | None:
    raw = (value or "").strip()
    if not raw or raw.lower() == "nan":
        return None
    return int(float(raw))


def parse_csv_text(source_name: str, text: str, requested_symbols: set[str] | None) -> List[OhlcvRow]:
    reader = csv.reader(io.StringIO(text))
    lines = list(reader)
    if len(lines) < 4:
        raise ValueError(f"{source_name}: not enough rows to parse")

    header = [h.strip().lower() for h in lines[0]]
    column_index = {name: idx for idx, name in enumerate(header)}
    required = ["open", "high", "low", "close", "volume"]
    missing = [name for name in required if name not in column_index]
    if missing:
        raise ValueError(f"{source_name}: missing columns {missing} in header {lines[0]}")

    symbol = infer_symbol(source_name, lines)
    if requested_symbols and symbol not in requested_symbols:
        return []

    rows: List[OhlcvRow] = []
    for row_num, row in enumerate(lines[3:], start=4):
        if not row or not row[0].strip():
            continue
        date_text = row[0].strip()
        try:
            as_of_date = date.fromisoformat(date_text)
        except ValueError:
            continue

        rows.append(
            OhlcvRow(
                symbol=symbol,
                as_of_date=as_of_date,
                open=to_decimal(row[column_index["open"]], "open", row_num, source_name),
                high=to_decimal(row[column_index["high"]], "high", row_num, source_name),
                low=to_decimal(row[column_index["low"]], "low", row_num, source_name),
                close=to_decimal(row[column_index["close"]], "close", row_num, source_name),
                volume=to_volume(row[column_index["volume"]]),
            )
        )

    return rows


def iter_s3_objects(bucket: str, prefix: str, region: str | None) -> Iterable[tuple[str, str]]:
    import boto3

    session = boto3.session.Session(region_name=region)
    s3 = session.client("s3")
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for item in page.get("Contents", []):
            key = item["Key"]
            if key.endswith(".csv"):
                obj = s3.get_object(Bucket=bucket, Key=key)
                body = obj["Body"].read().decode("utf-8")
                yield key, body


def iter_local_files(pattern: str) -> Iterable[tuple[str, str]]:
    for path in sorted(glob.glob(pattern)):
        with open(path, "r", encoding="utf-8") as handle:
            yield path, handle.read()


def normalize_database_url(database_url: str) -> str:
    """Remove Prisma-specific query params unsupported by psycopg2."""
    parsed = urlparse(database_url)
    query = [(k, v) for (k, v) in parse_qsl(parsed.query, keep_blank_values=True) if k != "schema"]
    return urlunparse(parsed._replace(query=urlencode(query)))


def insert_rows(database_url: str, rows: Sequence[OhlcvRow], batch_size: int) -> int:
    import psycopg2
    from psycopg2.extras import execute_values

    payload = [
        (
            f"mp_{uuid.uuid4().hex}",
            row.symbol,
            row.as_of_date,
            row.open,
            row.high,
            row.low,
            row.close,
            row.volume,
        )
        for row in rows
    ]

    sql = """
        INSERT INTO market_prices
          (id, symbol, as_of_date, open, high, low, close, volume)
        VALUES %s
    """

    inserted = 0
    with psycopg2.connect(normalize_database_url(database_url)) as conn:
        with conn.cursor() as cur:
            for i in range(0, len(payload), batch_size):
                batch = payload[i : i + batch_size]
                execute_values(cur, sql, batch)
                inserted += len(batch)
    return inserted


def main() -> int:
    args = parse_args()
    if not args.database_url and not args.dry_run:
        print("DATABASE_URL is required (or pass --database-url)", file=sys.stderr)
        return 2

    requested_symbols = {s.upper() for s in args.symbol} if args.symbol else None
    sources = (
        iter_s3_objects(args.bucket, args.prefix, args.region)
        if args.bucket
        else iter_local_files(args.local_glob)
    )

    total_files = 0
    total_rows = 0
    for source_name, text in sources:
        total_files += 1
        rows = parse_csv_text(source_name, text, requested_symbols)
        if not rows:
            print(f"[skip] {source_name}: no matching rows")
            continue

        if args.dry_run:
            print(f"[dry-run] {source_name}: parsed {len(rows)} rows for {rows[0].symbol}")
        else:
            written = insert_rows(args.database_url, rows, args.batch_size)
            print(f"[ok] {source_name}: inserted {written} rows for {rows[0].symbol}")

        total_rows += len(rows)

    if total_files == 0:
        print("No CSV files found.")
        return 1

    print(f"Done. Processed files={total_files}, rows={total_rows}, dry_run={args.dry_run}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
