import requests
import logging
import time
from datetime import datetime

from .field_mapping import decode_stock_info

BASE_URL = 'https://www.amarstock.com'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'X-Requested-With': 'XMLHttpRequest',
}

ENDPOINTS = {
    'stock_info': '/data/11bfa580-3cc4a8b9e57d/',
    'chart_data': '/data/5ee4d332a90e/',
    'returns': '/info/getreturn',
    'all_stocks': '/info/Stocks',
}

def get_session():
    session = requests.Session()
    session.headers.update(HEADERS)
    return session

session = get_session()

def fetch_all_tickers() -> list[dict]:
    try:
        response = session.get(BASE_URL + ENDPOINTS['all_stocks'])
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logging.error(f"Error fetching all tickers: {e}")
        return []

def fetch_stock_info(ticker: str) -> dict | None:
    try:
        response = session.get(BASE_URL + ENDPOINTS['stock_info'] + ticker)
        response.raise_for_status()
        data = response.json()
        return decode_stock_info(data)
    except Exception as e:
        logging.error(f"Error fetching info for {ticker}: {e}")
        return None

def fetch_stock_history(ticker: str, from_date: str) -> list[dict]:
    try:
        url = f"{BASE_URL}{ENDPOINTS['chart_data']}?scrip={ticker}&cycle=Day1&dtFrom={from_date}"
        response = session.get(url)
        response.raise_for_status()
        data = response.json()
        if not data:
            return []
        
        history = []
        for row in data:
            date_str = row.get('Date', '')
            ts_str = date_str.replace('/Date(', '').replace(')/', '')
            try:
                dt = datetime.fromtimestamp(int(ts_str) / 1000.0)
                formatted_date = dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
                
            history.append({
                'date': formatted_date,
                'open': float(row.get('Open', 0)),
                'high': float(row.get('High', 0)),
                'low': float(row.get('Low', 0)),
                'close': float(row.get('Close', 0)),
                'volume': int(row.get('Volume', 0))
            })
        return history
    except Exception as e:
        logging.error(f"Error fetching history for {ticker}: {e}")
        return []

def fetch_stock_returns(ticker: str) -> dict | None:
    try:
        response = session.get(f"{BASE_URL}{ENDPOINTS['returns']}?symbol={ticker}")
        response.raise_for_status()
        try:
            data = response.json()
        except:
            return {'return_6m': 0.0, 'return_1y': 0.0}
            
        if isinstance(data, list) and len(data) > 0:
            data = data[0]
            
        return {
            'return_6m': float(data.get('6Month', 0)) if isinstance(data, dict) else 0.0,
            'return_1y': float(data.get('1Year', 0)) if isinstance(data, dict) else 0.0
        }
    except Exception as e:
        logging.error(f"Error fetching returns for {ticker}: {e}")
        return None

def fetch_all_stocks_info(tickers: list[str], delay: float = 0.5) -> list[dict]:
    results = []
    import sys
    for i, ticker in enumerate(tickers):
        print(f"[{i+1}/{len(tickers)}] Fetching {ticker}...", file=sys.stderr)
        info = fetch_stock_info(ticker)
        if info:
            results.append(info)
        time.sleep(delay)
    return results
