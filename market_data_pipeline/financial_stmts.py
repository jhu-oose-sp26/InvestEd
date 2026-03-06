#!/usr/bin/env python3
import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests

MAG7 = ["AAPL", "MSFT", "AMZN", "GOOGL", "META", "NVDA", "TSLA"]
BASE = "https://financialmodelingprep.com/stable"
ENDPOINTS = {
    "income_statement": "income-statement",
    "balance_sheet": "balance-sheet-statement",
    "cash_flow": "cash-flow-statement",
}

PERIOD = "quarter"
LIMIT = 5
SLEEP = 0.2
OUT = Path("mag7_fmp_financials")
DATE_FMT = "%Y-%m-%d"


def get(session, endpoint, symbol, to=None):
    params = {"apikey": os.environ["FMP_API_KEY"], "symbol": symbol, "period": PERIOD, "limit": LIMIT}
    if to:
        params["to"] = to
    r = session.get(f"{BASE}/{endpoint}", params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def load(p):  # list[dict]
    return json.loads(p.read_text()) if p.exists() else []


def save(p, rows):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(rows, indent=2))
    pd.DataFrame(rows).sort_values("date").to_csv(p.with_suffix(".csv"), index=False)


def dedupe(rows):
    d = {(r.get("date"), r.get("calendarYear"), r.get("period")): r for r in rows}
    out = list(d.values())
    out.sort(key=lambda r: r.get("date") or "")
    return out


def oldest_date(rows):
    dates = [r["date"] for r in rows if r.get("date")]
    return min(dates) if dates else None


def main():
    if "FMP_API_KEY" not in os.environ:
        raise SystemExit("Set FMP_API_KEY first")

    s = requests.Session()
    s.headers.update({"Accept": "application/json", "User-Agent": "mag7-quarterly/1.0"})

    combined = {k: [] for k in ENDPOINTS}

    for sym in MAG7:
        print(f"\n{sym}")
        for name, ep in ENDPOINTS.items():
            jpath = OUT / sym / f"{name}.json"
            existing = load(jpath)

            od = oldest_date(existing)
            to = None
            if od:
                to = (datetime.strptime(od, DATE_FMT) - timedelta(days=1)).strftime(DATE_FMT)

            new = get(s, ep, sym, to=to)
            merged = dedupe(existing + (new if isinstance(new, list) else []))

            if len(merged) > len(existing):
                print(f"  {name}: +{len(merged)-len(existing)} (total {len(merged)})")
                save(jpath, merged)
            else:
                print(f"  {name}: no new rows")

            df = pd.DataFrame(merged)
            if not df.empty:
                df["symbol"] = sym
                df["period"] = PERIOD
                combined[name].append(df)

            time.sleep(SLEEP)

    (OUT / "_combined").mkdir(parents=True, exist_ok=True)
    for name, parts in combined.items():
        if parts:
            df = pd.concat(parts, ignore_index=True).sort_values(["symbol", "date"])
            df.to_csv(OUT / "_combined" / f"{name}.{PERIOD}.csv", index=False)

    print(f"\nDone -> {OUT.resolve()}")


if __name__ == "__main__":
    main()
