"""Generate compact price history JSON containing monthly closing prices for sparklines."""

import argparse
import csv
from datetime import datetime
import json
from pathlib import Path
from typing import Dict, List, Tuple, Union

DEFAULT_HISTORY_DIR = "public/data/history"
DEFAULT_OUTPUT_PATH = "public/data/price_history.json"
MAX_MONTHS = 12
MIN_MONTHS = 2
DECIMAL_PLACES = 1


def parse_csv_file(filepath: Path) -> List[Tuple[str, float]]:
    """Read a stock history CSV file and extract (date, close) tuples."""
    results = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if "date" in row and "close" in row:
                    try:
                        date_str = str(row["date"]).strip()
                        close_val = float(row["close"])
                        results.append((date_str, close_val))
                    except (ValueError, TypeError):
                        continue
    except Exception:
        pass
    return results


def extract_monthly_closes(data: List[Tuple[str, float]]) -> List[float]:
    """Pure function to extract last trading day close per month (chronological)."""
    if not data:
        return []

    sorted_data = sorted(data, key=lambda x: x[0])
    monthly_map: Dict[str, float] = {}

    for date_str, close_val in sorted_data:
        if len(date_str) >= 7:
            year_month = date_str[:7]
            monthly_map[year_month] = close_val

    sorted_months = sorted(monthly_map.keys())
    prices = [round(monthly_map[m], DECIMAL_PLACES) for m in sorted_months]

    if len(prices) > MAX_MONTHS:
        prices = prices[-MAX_MONTHS:]

    if len(prices) < MIN_MONTHS:
        return []

    return prices


def build_price_history_payload(
    raw_ticker_data: Dict[str, List[Tuple[str, float]]],
    timestamp: str,
) -> Dict[str, Union[List[float], str]]:
    """Pure function to compile price history payload for all tickers."""
    payload: Dict[str, Union[List[float], str]] = {"generated_at": timestamp}
    for ticker, rows in sorted(raw_ticker_data.items()):
        closes = extract_monthly_closes(rows)
        if closes:
            payload[ticker] = closes
    return payload


def load_history_files(history_dir: Path) -> Dict[str, List[Tuple[str, float]]]:
    """Read all CSV files from history_dir."""
    ticker_data = {}
    if not history_dir.is_dir():
        return ticker_data

    for filepath in history_dir.glob("*.csv"):
        ticker = filepath.stem
        rows = parse_csv_file(filepath)
        if rows:
            ticker_data[ticker] = rows
    return ticker_data


def save_json(payload: Dict, output_path: Path) -> None:
    """Write payload to JSON file in compact format."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))


def main() -> None:
    """CLI entrypoint for sparkline generator script."""
    parser = argparse.ArgumentParser(
        description="Generate sparklines price history JSON."
    )
    parser.add_argument(
        "--history-dir",
        type=Path,
        default=Path(DEFAULT_HISTORY_DIR),
        help="Path to directory containing history CSV files",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(DEFAULT_OUTPUT_PATH),
        help="Path to output JSON file",
    )
    args = parser.parse_args()

    raw_ticker_data = load_history_files(args.history_dir)
    timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    payload = build_price_history_payload(raw_ticker_data, timestamp)
    save_json(payload, args.output)
    print(f"Successfully generated {args.output} with {len(payload) - 1} stocks.")


if __name__ == "__main__":
    main()
