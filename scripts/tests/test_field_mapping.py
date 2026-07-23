import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.field_mapping import decode_stock_info, parse_week52_range

class TestFieldMapping(unittest.TestCase):
    def setUp(self):
        self.olympic_data = {
            "aa": "OLYMPIC", "ab": "Olympic Industries PLC.", "ac": 155.0, 
            "ad": 128699, "ae": 154.7, "af": 159.9, "ag": 166.8, 
            "ah": "128.00 - 176.90", "ai": 156.5, "aj": 156.4, "ak": 11146.783, 
            "al": 20.02, "am": "22/07/2026 02:00", "an": "-1.70", "ao": 1054, 
            "ap": 2000, "aq": 1999.39, "ar": 199938886, "as": "10/12/2025", 
            "at": 10466.8, "au": 1989, "av": "A", "aw": "Y", "ax": "Jun 30, 2026", 
            "ay": 37.38, "az": 0, "ba": 22.48, "bb": 27.62, "bc": 12.52, 
            "bp": "Active", "bz": -1.09, "ca": "154.10 - 157.10", "cb": 10.06, 
            "cc": 15.55, "ci": 62.35, "cl": "30  Jun", "cm": 1.95, "do": "1", 
            "dp": "Food and Allied", "ds": -1.28, "dt": 3.34, "du": 6.03, 
            "dv": 0.89, "dz": "30% 2025"
        }
        
    def test_parse_week52_range(self):
        high, low = parse_week52_range("128.00 - 176.90")
        self.assertEqual(low, 128.0)
        self.assertEqual(high, 176.9)
        
        self.assertEqual(parse_week52_range(None), (None, None))
        self.assertEqual(parse_week52_range(""), (None, None))
        self.assertEqual(parse_week52_range("invalid"), (None, None))
        
    def test_decode_stock_info_olympic(self):
        decoded = decode_stock_info(self.olympic_data)
        self.assertEqual(decoded['ticker'], 'OLYMPIC')
        self.assertEqual(decoded['name'], 'Olympic Industries PLC.')
        self.assertEqual(decoded['sector'], 'Food and Allied')
        self.assertEqual(decoded['category'], 'A')
        self.assertEqual(decoded['ltp'], 155.0)
        self.assertEqual(decoded['closing_price'], 154.7)
        self.assertEqual(decoded['ycp'], 156.4)
        self.assertEqual(decoded['open_price'], 156.5)
        self.assertEqual(decoded['day_high'], 157.1)
        self.assertEqual(decoded['day_low'], 154.1)
        self.assertEqual(decoded['week52_high'], 176.9)
        self.assertEqual(decoded['week52_low'], 128.0)
        self.assertEqual(decoded['pe_ratio'], 15.55)
        self.assertEqual(decoded['eps'], 10.06)
        self.assertEqual(decoded['nav'], 62.35)
        self.assertEqual(decoded['dividend_yield'], 1.95)
        self.assertEqual(decoded['volume'], 128699)
        self.assertEqual(decoded['trades'], 1054)
        self.assertEqual(decoded['total_shares'], 199938886)
        self.assertAlmostEqual(decoded['market_cap_mn'], (155.0 * 199938886) / 1000000.0)
        self.assertEqual(decoded['change_pct'], -1.09)
        self.assertEqual(decoded['listing_year'], 1989)
        self.assertEqual(decoded['status'], 'Active')
        self.assertEqual(decoded['latest_dividend'], '30% 2025')
        self.assertEqual(decoded['return_1d'], -1.28)
        self.assertEqual(decoded['beta'], 1.0)
        
    def test_types(self):
        decoded = decode_stock_info(self.olympic_data)
        self.assertIsInstance(decoded['ltp'], float)
        self.assertIsInstance(decoded['total_shares'], int)
        self.assertIsInstance(decoded['ticker'], str)
        self.assertIsInstance(decoded['market_cap_mn'], float)

if __name__ == '__main__':
    unittest.main()
