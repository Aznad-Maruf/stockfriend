def parse_week52_range(range_str: str) -> tuple[float, float]:
    """Splits '128.00 - 176.90' into (128.0, 176.9)."""
    if not range_str or not isinstance(range_str, str):
        return None, None
    parts = range_str.split('-')
    if len(parts) == 2:
        try:
            return float(parts[1].strip()), float(parts[0].strip())
        except ValueError:
            return None, None
    return None, None

def decode_stock_info(raw_data: dict) -> dict:
    if not raw_data:
        return {}
    
    week52_high, week52_low = parse_week52_range(raw_data.get('ah'))
    day_high, day_low = parse_week52_range(raw_data.get('ca'))
    
    ltp = raw_data.get('ac')
    total_shares = raw_data.get('ar')
    
    market_cap_mn = None
    if ltp is not None and total_shares is not None:
        try:
            market_cap_mn = (float(ltp) * float(total_shares)) / 1_000_000.0
        except ValueError:
            pass

    def get_float(key):
        val = raw_data.get(key)
        if val is None:
            return None
        try:
            return float(val)
        except ValueError:
            return None
            
    def get_int(key):
        val = raw_data.get(key)
        if val is None:
            return None
        try:
            return int(val)
        except ValueError:
            return None
            
    def get_str(key):
        val = raw_data.get(key)
        return str(val) if val is not None else None

    return {
        'ticker': get_str('aa'),
        'name': get_str('ab'),
        'sector': get_str('dp'),
        'category': get_str('av'),
        'ltp': get_float('ac'),
        'closing_price': get_float('ae'),
        'ycp': get_float('aj'),
        'open_price': get_float('ai'),
        'day_high': day_high,
        'day_low': day_low,
        'week52_high': week52_high,
        'week52_low': week52_low,
        'pe_ratio': get_float('cc'), # based on prompt analysis
        'eps': get_float('cb'), # based on prompt analysis
        'nav': get_float('ci'), # based on prompt analysis
        'dividend_yield': get_float('cm'),
        'volume': get_int('ad'),
        'trades': get_int('ao'),
        'market_cap_mn': market_cap_mn,
        'total_shares': get_int('ar'),
        'paid_up_capital_mn': get_float('aq'),
        'authorized_capital_mn': get_float('ap'),
        'change_pct': get_float('bz'),
        'listing_year': get_int('au'),
        'face_value': get_float('ck'),
        'status': get_str('bp'),
        'latest_dividend': get_str('dz'),
        'return_1d': get_float('ds'),
        'return_15d': get_float('dt'),
        'return_1m': get_float('du'),
        'return_6m': None, # will be populated later
        'return_1y': None, # will be populated later
        'beta': get_float('do')
    }
