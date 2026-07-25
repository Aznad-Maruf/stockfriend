"""
Stock Research Analyzer — generates per-ticker research signals
from fundamentals data (stocks.csv) and writes research.json.

Runs after the scraper as part of the data pipeline.
"""

import csv
import json
import os
from datetime import datetime

# Signal thresholds
NEGATIVE_EPS_THRESHOLD = 0
Z_CATEGORY = 'Z'
B_CATEGORY = 'B'
CHEAP_PE_THRESHOLD = 10
EXPENSIVE_PE_THRESHOLD = 40
HIGH_NAV_DISCOUNT = 0.5  # price < 50% of NAV
HIGH_DIV_YIELD = 4.0
LOW_PERCENTILE = 20
HIGH_PERCENTILE = 80
STRONG_MOMENTUM_1M = 10  # +10% in 1 month
WEAK_MOMENTUM_1M = -10
CRASH_THRESHOLD_6M = -50  # crashed >50% in 6 months


def safe_float(val, default=0.0):
    try:
        return float(val) if val not in (None, '', 'N/A') else default
    except (ValueError, TypeError):
        return default


def analyze_stock(row):
    """Analyze a single stock and generate research signals."""
    ticker = row.get('ticker', '')
    signals = []
    action = 'hold'
    label = 'Hold'
    label_bn = 'ধরে রাখুন'
    reasons = []
    reasons_bn = []
    duration = None
    duration_bn = None

    # Parse fields
    category = row.get('category', 'A')
    eps = safe_float(row.get('eps'))
    pe = safe_float(row.get('pe_ratio'))
    nav = safe_float(row.get('nav'))
    ltp = safe_float(row.get('ltp'))
    div_yield = safe_float(row.get('dividend_yield'))
    return_1m = safe_float(row.get('return_1m'))
    return_6m = safe_float(row.get('return_6m'))
    return_1y = safe_float(row.get('return_1y'))
    percentile = safe_float(row.get('percentile_5y'), 50)
    price_vs_median = safe_float(row.get('price_vs_median_5y'), 1.0)
    beta = safe_float(row.get('beta'), 1.0)
    volatility = safe_float(row.get('volatility_annual'))
    w52_high = safe_float(row.get('week52_high'), ltp)
    w52_low = safe_float(row.get('week52_low'), ltp)
    latest_dividend = row.get('latest_dividend', '')
    status = row.get('status', 'Active')
    name = row.get('name', ticker)

    # ── SELL SIGNALS ──

    # Z-category: no margin loans, restricted trading
    if category == Z_CATEGORY:
        signals.append('z_category')
        reasons.append(f'Z-category: no margin loans, restricted trading')
        reasons_bn.append('Z-ক্যাটাগরি: মার্জিন লোন নেই, সীমাবদ্ধ ট্রেডিং')

    # B-category: risky
    if category == B_CATEGORY:
        signals.append('b_category')
        reasons.append(f'B-category: high risk classification')
        reasons_bn.append('B-ক্যাটাগরি: উচ্চ ঝুঁকি শ্রেণী')

    # Negative EPS
    if eps < NEGATIVE_EPS_THRESHOLD:
        signals.append('negative_eps')
        reasons.append(f'Negative EPS (৳{eps:.2f}): company losing money')
        reasons_bn.append(f'নেতিবাচক ইপিএস (৳{eps:.2f}): কোম্পানি ক্ষতিতে')

    # Crash: dropped >50% in 6 months
    if return_6m < CRASH_THRESHOLD_6M:
        signals.append('crash')
        reasons.append(f'Crashed {return_6m:.0f}% in 6 months')
        reasons_bn.append(f'৬ মাসে {return_6m:.0f}% পতন')

    # ── BUY SIGNALS ──

    # Cheap PE with positive earnings
    if 0 < pe < CHEAP_PE_THRESHOLD and eps > 0:
        signals.append('cheap_pe')
        reasons.append(f'Low PE ratio ({pe:.1f}x) with positive earnings')
        reasons_bn.append(f'কম PE অনুপাত ({pe:.1f}x) ইতিবাচক আয়ের সাথে')

    # High dividend yield
    if div_yield > HIGH_DIV_YIELD:
        signals.append('high_dividend')
        reasons.append(f'Strong dividend yield ({div_yield:.1f}%)')
        reasons_bn.append(f'শক্তিশালী লভ্যাংশ ({div_yield:.1f}%)')

    # Deep NAV discount
    if nav > 0 and ltp > 0 and (ltp / nav) < HIGH_NAV_DISCOUNT:
        discount_pct = (1 - ltp / nav) * 100
        signals.append('nav_discount')
        reasons.append(f'Trading at {discount_pct:.0f}% discount to NAV (৳{nav:.1f})')
        reasons_bn.append(f'NAV-র {discount_pct:.0f}% ছাড়ে (৳{nav:.1f}) ট্রেড হচ্ছে')

    # Undervalued by 5Y percentile
    if percentile < LOW_PERCENTILE:
        signals.append('undervalued_5y')
        reasons.append(f'At {percentile:.0f}th percentile of 5-year range (historically cheap)')
        reasons_bn.append(f'৫ বছরের {percentile:.0f}তম পার্সেন্টাইলে (ঐতিহাসিকভাবে সস্তা)')

    # Overvalued by 5Y percentile
    if percentile > HIGH_PERCENTILE:
        signals.append('overvalued_5y')
        reasons.append(f'At {percentile:.0f}th percentile of 5-year range (historically expensive)')
        reasons_bn.append(f'৫ বছরের {percentile:.0f}তম পার্সেন্টাইলে (ঐতিহাসিকভাবে দামি)')

    # Strong short-term momentum
    if return_1m > STRONG_MOMENTUM_1M:
        signals.append('strong_momentum')
        reasons.append(f'Strong 1-month momentum (+{return_1m:.1f}%)')
        reasons_bn.append(f'শক্তিশালী ১-মাস গতি (+{return_1m:.1f}%)')

    # Weak momentum
    if return_1m < WEAK_MOMENTUM_1M:
        signals.append('weak_momentum')
        reasons.append(f'Weak 1-month momentum ({return_1m:.1f}%)')
        reasons_bn.append(f'দুর্বল ১-মাস গতি ({return_1m:.1f}%)')

    # ── DECISION LOGIC ──

    sell_signals = {'z_category', 'b_category', 'negative_eps', 'crash', 'weak_momentum', 'overvalued_5y'}
    buy_signals = {'cheap_pe', 'high_dividend', 'nav_discount', 'undervalued_5y', 'strong_momentum'}

    sell_count = len(set(signals) & sell_signals)
    buy_count = len(set(signals) & buy_signals)

    # Critical sell: Z/B category with negative EPS
    if ('z_category' in signals or 'b_category' in signals) and 'negative_eps' in signals:
        action = 'sell'
        label = 'Sell'
        label_bn = 'বিক্রি করুন'
    # Crash + negative EPS
    elif 'crash' in signals and 'negative_eps' in signals:
        action = 'sell'
        label = 'Sell (Cut Losses)'
        label_bn = 'বিক্রি করুন (ক্ষতি কমান)'
    # Z-category alone
    elif 'z_category' in signals and sell_count >= 2:
        action = 'sell'
        label = 'Sell'
        label_bn = 'বিক্রি করুন'
    # Strong buy signals
    elif buy_count >= 3:
        action = 'buy'
        label = 'Buy More'
        label_bn = 'আরও কিনুন'
    elif buy_count >= 2 and sell_count == 0:
        action = 'buy'
        label = 'Consider Buying'
        label_bn = 'কেনার কথা ভাবুন'
    # Mixed or weak
    elif sell_count > buy_count and sell_count >= 2:
        action = 'sell'
        label = 'Consider Selling'
        label_bn = 'বিক্রির কথা ভাবুন'
    elif buy_count > 0 and sell_count == 0:
        action = 'hold'
        label = 'Hold'
        label_bn = 'ধরে রাখুন'
        if 'high_dividend' in signals:
            duration = 'Hold for dividend'
            duration_bn = 'লভ্যাংশের জন্য ধরুন'
    else:
        action = 'hold'
        label = 'Hold'
        label_bn = 'ধরে রাখুন'

    # Build combined reason
    combined_reason = '. '.join(reasons) + '.' if reasons else 'Near fair value. Monitor for changes.'
    combined_reason_bn = '। '.join(reasons_bn) + '।' if reasons_bn else 'ন্যায্য মূল্যের কাছাকাছি। পরিবর্তনের জন্য নজর রাখুন।'

    result = {
        'ticker': ticker,
        'name': name,
        'action': action,
        'label': label,
        'labelBn': label_bn,
        'reason': combined_reason,
        'reasonBn': combined_reason_bn,
        'signals': signals,
        'category': category,
    }
    if duration:
        result['duration'] = duration
        result['durationBn'] = duration_bn

    return result


def run_analysis(csv_path, output_path):
    """Analyze all stocks and write research.json."""
    if not os.path.exists(csv_path):
        print(f'  [research] No CSV at {csv_path}, skipping')
        return

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    research = {}
    for row in rows:
        ticker = row.get('ticker', '').strip()
        if not ticker:
            continue
        analysis = analyze_stock(row)
        # Only include stocks with actionable signals
        if analysis['signals']:
            research[ticker] = analysis

    output = {
        'generated_at': datetime.now().isoformat(),
        'total_analyzed': len(rows),
        'stocks_with_signals': len(research),
        'overrides': research,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # Summary
    actions = {}
    for r in research.values():
        actions[r['action']] = actions.get(r['action'], 0) + 1
    print(f'  [research] Analyzed {len(rows)} stocks, {len(research)} with signals')
    for act, count in sorted(actions.items()):
        print(f'    {act}: {count}')

    return output


if __name__ == '__main__':
    # scripts/research/analyzer.py -> 3 levels up to project root
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    csv_path = os.path.join(base, 'public', 'data', 'stocks.csv')
    output_path = os.path.join(base, 'public', 'data', 'research.json')
    run_analysis(csv_path, output_path)
