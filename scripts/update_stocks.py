import os
import sys
import json
import csv
import argparse
import time
from datetime import datetime, timedelta

# Add parent directory to sys.path so we can import from scripts
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.scrapers.amarstock import (
    fetch_all_tickers,
    fetch_stock_info,
    fetch_stock_history,
    fetch_stock_returns
)
from scripts.scrapers.stats import compute_stock_stats, STATS_COLUMNS

def setup_directories():
    base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'data')
    history_dir = os.path.join(base_dir, 'history')
    os.makedirs(history_dir, exist_ok=True)
    return base_dir, history_dir

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--backfill', action='store_true', help='First run: full 5Y history')
    parser.add_argument('--ticker', type=str, help='Single ticker test')
    args = parser.parse_args()
    
    base_dir, history_dir = setup_directories()
    
    meta_file = os.path.join(history_dir, '_meta.json')
    meta = {}
    if os.path.exists(meta_file):
        with open(meta_file, 'r') as f:
            meta = json.load(f)
            
    if args.ticker:
        all_instruments = [{'Code': args.ticker, 'Name': args.ticker}]
    else:
        print("Fetching all tickers...")
        raw_tickers = fetch_all_tickers()
        all_instruments = [
            t for t in raw_tickers 
            if t.get('Group') is not None 
            and not t.get('Code', '').startswith(('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'))
            and t.get('Code') != '00DS30'
        ]
        print(f"Found {len(all_instruments)} valid stocks.")
        
    stocks_data = []
    succeeded_tickers = []
    failed_tickers = []
    
    start_time = time.time()
    now_iso = datetime.now().isoformat()
    
    for i, inst in enumerate(all_instruments):
        ticker = inst.get('Code')
        if not ticker:
            continue
            
        print(f"[{i+1}/{len(all_instruments)}] Processing {ticker}...")
        try:
            info = fetch_stock_info(ticker)
            if not info:
                failed_tickers.append(ticker)
                continue
                
            returns = fetch_stock_returns(ticker)
            if returns:
                info['return_6m'] = returns.get('return_6m')
                info['return_1y'] = returns.get('return_1y')
                
            info['updated_at'] = now_iso
            stocks_data.append(info)
            
            last_date_str = meta.get(ticker)
            if args.backfill or not last_date_str:
                from_date = (datetime.now() - timedelta(days=5*365)).strftime('%Y-%m-%d')
            else:
                last_dt = datetime.strptime(last_date_str, '%Y-%m-%d')
                from_date = (last_dt + timedelta(days=1)).strftime('%Y-%m-%d')
                
            history = fetch_stock_history(ticker, from_date)
            
            hist_file = os.path.join(history_dir, f'{ticker}.csv')
            file_exists = os.path.exists(hist_file)
            
            if history:
                with open(hist_file, 'a' if file_exists else 'w', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=['date', 'open', 'high', 'low', 'close', 'volume'])
                    if not file_exists:
                        writer.writeheader()
                    for row in history:
                        writer.writerow(row)
                
                meta[ticker] = max(h['date'] for h in history)
            elif not file_exists:
                # Create empty file
                with open(hist_file, 'w', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=['date', 'open', 'high', 'low', 'close', 'volume'])
                    writer.writeheader()
                if not meta.get(ticker):
                    meta[ticker] = datetime.now().strftime('%Y-%m-%d')
                
            succeeded_tickers.append(ticker)
            
        except Exception as e:
            print(f"Failed to process {ticker}: {e}")
            failed_tickers.append(ticker)
            
        if not args.ticker:
            time.sleep(0.5)
            
    # Phase: Compute statistics from historical data
    if stocks_data:
        print(f"\nComputing statistics from historical data...")
        for i, stock in enumerate(stocks_data):
            ticker = stock.get('ticker', '')
            ltp = stock.get('ltp')
            stats = compute_stock_stats(history_dir, ticker, ltp)
            stock.update(stats)
            if (i + 1) % 50 == 0:
                print(f"  Stats computed for {i + 1}/{len(stocks_data)} stocks")
        print(f"  Stats computed for {len(stocks_data)}/{len(stocks_data)} stocks")

        stocks_file = os.path.join(base_dir, 'stocks.csv')
        fieldnames = [
            'ticker', 'name', 'sector', 'category', 'ltp', 'closing_price', 
            'ycp', 'open_price', 'day_high', 'day_low', 'week52_high', 'week52_low',
            'pe_ratio', 'eps', 'nav', 'dividend_yield', 'market_cap_mn', 'volume',
            'trades', 'total_shares', 'paid_up_capital_mn', 'authorized_capital_mn',
            'change_pct', 'beta', 'return_1d', 'return_15d', 'return_1m', 'return_6m',
            'return_1y', 'listing_year', 'latest_dividend', 'status', 'updated_at',
            'face_value',
        ] + STATS_COLUMNS
        
        with open(stocks_file, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()
            for row in stocks_data:
                writer.writerow(row)
                
    with open(meta_file, 'w') as f:
        json.dump(meta, f, indent=2)
        
    # Write rich scraper status for frontend
    duration = round(time.time() - start_time, 1)
    scraper_status = {
        'last_run': now_iso,
        'last_successful_run': now_iso if succeeded_tickers else None,
        'status': 'success' if not failed_tickers else ('partial_failure' if succeeded_tickers else 'failure'),
        'stocks_total': len(all_instruments),
        'stocks_updated': len(succeeded_tickers),
        'stocks_failed': len(failed_tickers),
        'failed_tickers': failed_tickers,
        'history_updated': True,
        'duration_seconds': duration,
        'data_source': 'amarstock.com',
        'errors': [],
    }
    with open(os.path.join(base_dir, 'scraper_status.json'), 'w') as f:
        json.dump(scraper_status, f, indent=2)

    # Run research analyzer
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from research.analyzer import run_analysis
        print('\nRunning research analyzer...')
        run_analysis(
            os.path.join(base_dir, 'stocks.csv'),
            os.path.join(base_dir, 'research.json')
        )
    except Exception as e:
        print(f'  [research] Warning: analyzer failed: {e}')
        
    print(f"\nSummary: {len(succeeded_tickers)} succeeded, {len(failed_tickers)} failed. Duration: {duration}s")

if __name__ == '__main__':
    main()
