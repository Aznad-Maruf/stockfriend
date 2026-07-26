"""Tests for generate_sparklines script."""

import unittest
from scripts.generate_sparklines import (
    extract_monthly_closes,
    build_price_history_payload,
)


class TestGenerateSparklines(unittest.TestCase):
    """Test pure functions in generate_sparklines script."""

    def test_extract_monthly_closes_empty(self):
        self.assertEqual(extract_monthly_closes([]), [])

    def test_extract_monthly_closes_less_than_two_months(self):
        data = [("2026-01-05", 100.0), ("2026-01-20", 105.0)]
        self.assertEqual(extract_monthly_closes(data), [])

    def test_extract_monthly_closes_two_months(self):
        data = [
            ("2026-01-05", 100.0),
            ("2026-01-20", 105.0),
            ("2026-02-01", 110.0),
            ("2026-02-28", 112.5),
        ]
        self.assertEqual(extract_monthly_closes(data), [105.0, 112.5])

    def test_extract_monthly_closes_truncates_to_twelve_months(self):
        data = []
        for year in [2025, 2026]:
            for month in range(1, 13):
                date_str = f"{year}-{month:02d}-15"
                data.append((date_str, float(year * 100 + month)))
        result = extract_monthly_closes(data)
        self.assertEqual(len(result), 12)
        # Should be last 12 months from 2026-01 to 2026-12
        self.assertEqual(result[0], 202601.0)
        self.assertEqual(result[-1], 202612.0)

    def test_build_price_history_payload(self):
        ticker_data = {
            "GP": [("2026-01-15", 100.0), ("2026-02-15", 105.0)],
            "FEW": [("2026-01-15", 10.0)],
        }
        timestamp = "2026-07-27T01:00:00"
        payload = build_price_history_payload(ticker_data, timestamp)
        self.assertEqual(payload["generated_at"], timestamp)
        self.assertIn("GP", payload)
        self.assertEqual(payload["GP"], [100.0, 105.0])
        self.assertNotIn("FEW", payload)


if __name__ == "__main__":
    unittest.main()
