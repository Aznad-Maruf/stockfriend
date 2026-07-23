import unittest
from unittest.mock import patch, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers.amarstock import (
    fetch_all_tickers,
    fetch_stock_info,
    fetch_stock_history,
    fetch_stock_returns
)

class TestAmarstock(unittest.TestCase):
    @patch('scrapers.amarstock.session.get')
    def test_fetch_all_tickers(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = [
            {'Code': 'OLYMPIC', 'Name': 'Olympic', 'Group': 'A'},
            {'Code': '00DS30', 'Name': 'DS30', 'Group': None}
        ]
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp
        
        result = fetch_all_tickers()
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['Code'], 'OLYMPIC')
        
    @patch('scrapers.amarstock.session.get')
    def test_fetch_stock_info_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'aa': 'OLYMPIC'}
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp
        
        result = fetch_stock_info('OLYMPIC')
        self.assertIsNotNone(result)
        self.assertEqual(result['ticker'], 'OLYMPIC')
        
    @patch('scrapers.amarstock.session.get')
    def test_fetch_stock_info_error(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = Exception("HTTP Error")
        mock_get.return_value = mock_resp
        
        result = fetch_stock_info('INVALID')
        self.assertIsNone(result)

    @patch('scrapers.amarstock.session.get')
    def test_fetch_stock_history_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = [{
            "Date": "/Date(1719878400000)/", "Scrip": "OLYMPIC", "Open": 134.6, 
            "High": 134.6, "Low": 128.5, "Close": 129.8, "PreClose": 0, "AdjClose": 0, 
            "Volume": 29877, "Value": 0, "Trade": 0, "Change": 0, 
            "DateString": "02/07/2024 00:00:00", "DateEpoch": 1719878400000
        }]
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp
        
        result = fetch_stock_history('OLYMPIC', '2024-07-01')
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['date'], '2024-07-02') # might depend on timezone, let's assume it converts ok
        self.assertEqual(result[0]['close'], 129.8)

    @patch('scrapers.amarstock.session.get')
    def test_fetch_stock_history_empty(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = []
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp
        
        result = fetch_stock_history('OLYMPIC', '2024-07-01')
        self.assertEqual(result, [])

    @patch('scrapers.amarstock.session.get')
    def test_fetch_stock_returns_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {'6Month': 5.5, '1Year': -2.1}
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp
        
        result = fetch_stock_returns('OLYMPIC')
        self.assertEqual(result['return_6m'], 5.5)
        self.assertEqual(result['return_1y'], -2.1)

    @patch('scrapers.amarstock.session.get')
    def test_fetch_stock_returns_error(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = Exception("HTTP Error")
        mock_get.return_value = mock_resp
        
        result = fetch_stock_returns('OLYMPIC')
        self.assertIsNone(result)

if __name__ == '__main__':
    unittest.main()
