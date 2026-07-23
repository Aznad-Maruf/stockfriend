"""
Compute statistical measures from historical daily price data.

For each stock, given its history CSV (date, open, high, low, close, volume),
we calculate metrics that help assess whether the current price is unusual
relative to its historical norm.
"""

import csv
import os
import math
from datetime import datetime, timedelta


def load_history(history_dir: str, ticker: str) -> list[dict]:
    """Load a ticker's history CSV into a list of dicts."""
    path = os.path.join(history_dir, f'{ticker}.csv')
    if not os.path.exists(path):
        return []

    rows = []
    with open(path, 'r', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                rows.append({
                    'date': row['date'],
                    'close': float(row['close']),
                    'volume': int(row.get('volume', 0)),
                })
            except (ValueError, KeyError):
                continue
    return rows


def _filter_by_years(rows: list[dict], years: int) -> list[dict]:
    """Filter rows to only include the last N years from the most recent date."""
    if not rows:
        return []
    # Rows are chronological; last row is the most recent
    try:
        latest = datetime.strptime(rows[-1]['date'], '%Y-%m-%d')
    except ValueError:
        return rows
    cutoff = latest - timedelta(days=years * 365)
    cutoff_str = cutoff.strftime('%Y-%m-%d')
    return [r for r in rows if r['date'] >= cutoff_str]


def _median(values: list[float]) -> float | None:
    """Compute median of a list of floats."""
    if not values:
        return None
    s = sorted(values)
    n = len(s)
    if n % 2 == 1:
        return s[n // 2]
    return (s[n // 2 - 1] + s[n // 2]) / 2.0


def _mean(values: list[float]) -> float | None:
    """Compute mean of a list of floats."""
    if not values:
        return None
    return sum(values) / len(values)


def _std_dev(values: list[float], mean_val: float | None = None) -> float | None:
    """Compute population standard deviation."""
    if not values or len(values) < 2:
        return None
    if mean_val is None:
        mean_val = _mean(values)
    variance = sum((x - mean_val) ** 2 for x in values) / len(values)
    return math.sqrt(variance)


def _percentile(values: list[float], current: float) -> float | None:
    """
    What percentage of historical values are below the current price?
    Returns 0-100. If 90, the current price is higher than 90% of history.
    """
    if not values:
        return None
    count_below = sum(1 for v in values if v < current)
    return round((count_below / len(values)) * 100, 1)


def _actual_return(rows: list[dict], years: int) -> float | None:
    """
    Compute actual return over the last N years.
    Return = ((current_price - price_N_years_ago) / price_N_years_ago) * 100
    """
    if not rows or len(rows) < 2:
        return None
    try:
        latest = datetime.strptime(rows[-1]['date'], '%Y-%m-%d')
    except ValueError:
        return None

    target = latest - timedelta(days=years * 365)
    target_str = target.strftime('%Y-%m-%d')

    # Find the closest row to the target date
    closest = None
    for r in rows:
        if r['date'] <= target_str:
            closest = r
        else:
            break

    if closest is None:
        # All rows are after the target; use the earliest
        closest = rows[0]

    if closest['close'] == 0:
        return None

    current = rows[-1]['close']
    return round(((current - closest['close']) / closest['close']) * 100, 2)


def _max_drawdown(rows: list[dict]) -> float | None:
    """
    Maximum peak-to-trough decline (as a negative percentage).
    Measures worst-case loss if you bought at the peak and sold at the trough.
    """
    if not rows or len(rows) < 2:
        return None

    prices = [r['close'] for r in rows if r['close'] > 0]
    if len(prices) < 2:
        return None

    peak = prices[0]
    max_dd = 0.0
    for p in prices:
        if p > peak:
            peak = p
        dd = (p - peak) / peak
        if dd < max_dd:
            max_dd = dd

    return round(max_dd * 100, 2)


def _daily_return_volatility(rows: list[dict]) -> float | None:
    """
    Annualized volatility based on daily returns.
    Higher = more volatile/risky.
    """
    if not rows or len(rows) < 30:
        return None

    prices = [r['close'] for r in rows if r['close'] > 0]
    if len(prices) < 30:
        return None

    daily_returns = []
    for i in range(1, len(prices)):
        if prices[i - 1] > 0:
            daily_returns.append((prices[i] - prices[i - 1]) / prices[i - 1])

    if not daily_returns:
        return None

    mean_r = _mean(daily_returns)
    std_r = _std_dev(daily_returns, mean_r)
    if std_r is None:
        return None

    # Annualize: multiply by sqrt(trading days per year)
    annualized = std_r * math.sqrt(240)
    return round(annualized * 100, 2)


def compute_stock_stats(history_dir: str, ticker: str, current_price: float | None = None) -> dict:
    """
    Compute all statistical measures for a single stock.

    Returns a dict with keys like:
        mean_1y, mean_3y, mean_5y,
        median_1y, median_3y, median_5y,
        percentile_5y,
        z_score_5y,
        actual_return_1y, actual_return_3y, actual_return_5y,
        volatility_annual,
        max_drawdown_5y,
        price_vs_median_5y
    """
    rows = load_history(history_dir, ticker)
    if not rows:
        return {}

    # Use the latest close as current price if not provided
    if current_price is None or current_price == 0:
        current_price = rows[-1]['close'] if rows else None

    result = {}

    for years, suffix in [(1, '1y'), (3, '3y'), (5, '5y')]:
        filtered = _filter_by_years(rows, years)
        closes = [r['close'] for r in filtered if r['close'] > 0]

        mean_val = _mean(closes)
        median_val = _median(closes)

        result[f'mean_{suffix}'] = round(mean_val, 2) if mean_val else None
        result[f'median_{suffix}'] = round(median_val, 2) if median_val else None

        # Actual return over the period
        result[f'actual_return_{suffix}'] = _actual_return(rows, years)

    # Percentile: where does current price sit in 5Y history?
    closes_5y = [r['close'] for r in _filter_by_years(rows, 5) if r['close'] > 0]
    if current_price and closes_5y:
        result['percentile_5y'] = _percentile(closes_5y, current_price)
    else:
        result['percentile_5y'] = None

    # Z-score: how many standard deviations from the 5Y mean?
    if current_price and result.get('mean_5y') is not None:
        std_5y = _std_dev(closes_5y, result['mean_5y'])
        if std_5y and std_5y > 0:
            result['z_score_5y'] = round((current_price - result['mean_5y']) / std_5y, 2)
        else:
            result['z_score_5y'] = None
    else:
        result['z_score_5y'] = None

    # Price vs median ratio: >1 means above median, <1 means below
    if current_price and result.get('median_5y'):
        result['price_vs_median_5y'] = round(current_price / result['median_5y'], 3)
    else:
        result['price_vs_median_5y'] = None

    # Volatility (annualized, from 1Y data)
    rows_1y = _filter_by_years(rows, 1)
    result['volatility_annual'] = _daily_return_volatility(rows_1y)

    # Max drawdown over 5Y
    rows_5y = _filter_by_years(rows, 5)
    result['max_drawdown_5y'] = _max_drawdown(rows_5y)

    return result


# The columns this module adds to stocks.csv
STATS_COLUMNS = [
    'mean_1y', 'mean_3y', 'mean_5y',
    'median_1y', 'median_3y', 'median_5y',
    'percentile_5y', 'z_score_5y', 'price_vs_median_5y',
    'actual_return_1y', 'actual_return_3y', 'actual_return_5y',
    'volatility_annual', 'max_drawdown_5y',
]
