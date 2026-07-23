"""Tests for the stats module."""

import unittest
import os
import sys
import csv
import tempfile
import shutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.stats import (
    compute_stock_stats, load_history, _median, _mean, _std_dev,
    _percentile, _actual_return, _max_drawdown, _daily_return_volatility,
    _filter_by_years, STATS_COLUMNS
)


class TestStatHelpers(unittest.TestCase):
    """Test basic statistical helper functions."""

    def test_median_odd(self):
        self.assertEqual(_median([1, 2, 3, 4, 5]), 3)

    def test_median_even(self):
        self.assertEqual(_median([1, 2, 3, 4]), 2.5)

    def test_median_single(self):
        self.assertEqual(_median([42]), 42)

    def test_median_empty(self):
        self.assertIsNone(_median([]))

    def test_mean(self):
        self.assertAlmostEqual(_mean([10, 20, 30]), 20.0)

    def test_mean_empty(self):
        self.assertIsNone(_mean([]))

    def test_std_dev(self):
        # [2, 4, 4, 4, 5, 5, 7, 9] -> mean=5, variance=4, std=2
        result = _std_dev([2, 4, 4, 4, 5, 5, 7, 9])
        self.assertAlmostEqual(result, 2.0)

    def test_std_dev_too_few(self):
        self.assertIsNone(_std_dev([42]))

    def test_percentile(self):
        values = list(range(1, 101))  # 1 to 100
        # Current = 90 -> 89 values below it -> 89%
        self.assertAlmostEqual(_percentile(values, 90), 89.0)

    def test_percentile_at_bottom(self):
        self.assertAlmostEqual(_percentile([10, 20, 30], 5), 0.0)

    def test_percentile_at_top(self):
        self.assertAlmostEqual(_percentile([10, 20, 30], 35), 100.0)


class TestActualReturn(unittest.TestCase):
    """Test actual return calculation from historical rows."""

    def test_positive_return(self):
        rows = [
            {'date': '2025-01-01', 'close': 100.0},
            {'date': '2025-06-01', 'close': 110.0},
            {'date': '2026-01-01', 'close': 120.0},
        ]
        result = _actual_return(rows, 1)
        # Price 1 year ago ~ 100, now 120 -> 20%
        self.assertAlmostEqual(result, 20.0)

    def test_negative_return(self):
        rows = [
            {'date': '2025-01-01', 'close': 200.0},
            {'date': '2026-01-01', 'close': 150.0},
        ]
        result = _actual_return(rows, 1)
        self.assertAlmostEqual(result, -25.0)

    def test_empty_rows(self):
        self.assertIsNone(_actual_return([], 1))


class TestMaxDrawdown(unittest.TestCase):
    """Test max drawdown calculation."""

    def test_simple_drawdown(self):
        rows = [
            {'date': '2025-01-01', 'close': 100.0},
            {'date': '2025-02-01', 'close': 120.0},  # peak
            {'date': '2025-03-01', 'close': 90.0},   # trough: -25%
            {'date': '2025-04-01', 'close': 110.0},
        ]
        result = _max_drawdown(rows)
        self.assertAlmostEqual(result, -25.0)

    def test_no_drawdown(self):
        rows = [
            {'date': '2025-01-01', 'close': 100.0},
            {'date': '2025-02-01', 'close': 110.0},
            {'date': '2025-03-01', 'close': 120.0},
        ]
        result = _max_drawdown(rows)
        self.assertEqual(result, 0.0)


class TestComputeStockStats(unittest.TestCase):
    """Integration test: write a history CSV and compute stats from it."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        # Write a synthetic 2-year history for TEST ticker
        hist_file = os.path.join(self.tmpdir, 'TEST.csv')
        with open(hist_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['date', 'open', 'high', 'low', 'close', 'volume'])
            # 500 days of data: price goes from 100 to 150 linearly
            from datetime import datetime, timedelta
            base = datetime(2024, 1, 1)
            for i in range(500):
                dt = base + timedelta(days=i)
                price = 100 + (i / 500) * 50  # 100 -> 150
                writer.writerow([
                    dt.strftime('%Y-%m-%d'),
                    round(price, 2), round(price + 2, 2),
                    round(price - 2, 2), round(price, 2),
                    10000
                ])

    def tearDown(self):
        shutil.rmtree(self.tmpdir)

    def test_returns_all_keys(self):
        stats = compute_stock_stats(self.tmpdir, 'TEST', 150.0)
        for col in STATS_COLUMNS:
            self.assertIn(col, stats, f"Missing key: {col}")

    def test_median_is_reasonable(self):
        stats = compute_stock_stats(self.tmpdir, 'TEST', 150.0)
        # Median of linear 100->150 should be ~125
        self.assertIsNotNone(stats.get('median_1y'))
        self.assertGreater(stats['median_1y'], 100)
        self.assertLess(stats['median_1y'], 160)

    def test_percentile_at_top(self):
        stats = compute_stock_stats(self.tmpdir, 'TEST', 150.0)
        # Current price 150 is the highest, percentile should be ~100
        self.assertGreater(stats['percentile_5y'], 90)

    def test_z_score_positive(self):
        stats = compute_stock_stats(self.tmpdir, 'TEST', 150.0)
        # Price is above the mean, z-score should be positive
        self.assertGreater(stats['z_score_5y'], 0)

    def test_price_vs_median(self):
        stats = compute_stock_stats(self.tmpdir, 'TEST', 150.0)
        # 150 / ~125 = ~1.2
        self.assertGreater(stats['price_vs_median_5y'], 1.0)

    def test_missing_ticker(self):
        stats = compute_stock_stats(self.tmpdir, 'NONEXISTENT')
        self.assertEqual(stats, {})


if __name__ == '__main__':
    unittest.main()
