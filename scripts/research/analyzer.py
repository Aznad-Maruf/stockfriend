"""
Stock Research Analyzer — generates per-ticker research signals
from fundamentals data (stocks.csv) and writes research.json.

Philosophy: No risk, no gain. Category alone doesn't determine action.
Every stock is analyzed holistically across ALL dimensions.
"""

import csv
import json
import os
import re
from datetime import datetime

# ── Scoring weights ──
# Positive signals add points, negative signals subtract.
# The NET score determines action, not any single factor.

def safe_float(val, default=0.0):
    try:
        return float(val) if val not in (None, '', 'N/A') else default
    except (ValueError, TypeError):
        return default


def parse_dividend(latest_dividend):
    """Parse '215% 2025' or '30% 2025' into (pct, year)."""
    if not latest_dividend:
        return None, None
    m = re.match(r'([\d.]+)%?\s*(\d{4})', str(latest_dividend).strip())
    if m:
        return float(m.group(1)), int(m.group(2))
    return None, None


def analyze_stock(row):
    """Analyze a single stock using a multi-factor scoring approach."""
    ticker = row.get('ticker', '')
    name = row.get('name', ticker)

    # Parse all fields
    category = row.get('category', 'A')
    eps = safe_float(row.get('eps'))
    pe = safe_float(row.get('pe_ratio'))
    nav = safe_float(row.get('nav'))
    ltp = safe_float(row.get('ltp'))
    div_yield = safe_float(row.get('dividend_yield'))
    return_1m = safe_float(row.get('return_1m'))
    return_6m = safe_float(row.get('return_6m'))
    return_1y = safe_float(row.get('return_1y'))
    return_1d = safe_float(row.get('return_1d'))
    percentile = safe_float(row.get('percentile_5y'), 50)
    beta = safe_float(row.get('beta'), 1.0)
    w52_high = safe_float(row.get('week52_high'), ltp)
    w52_low = safe_float(row.get('week52_low'), ltp)
    latest_dividend = row.get('latest_dividend', '')
    status = row.get('status', 'Active')

    # Dividend info — use face_value for accurate calculation
    # Dividend % is declared on face value: dividend_per_share = div_pct% × face_value
    face_value = safe_float(row.get('face_value'), 10.0)  # default ৳10 for DSE
    div_pct, div_year = parse_dividend(latest_dividend)
    current_year = datetime.now().year
    has_recent_dividend = div_pct is not None and div_year is not None and (current_year - div_year) <= 1
    dividend_per_share = None
    if div_pct is not None:
        dividend_per_share = round(div_pct * face_value / 100, 2)

    # NAV discount/premium
    nav_discount_pct = 0
    if nav > 0 and ltp > 0:
        nav_discount_pct = round((1 - ltp / nav) * 100, 1)

    # 52W position
    w52_from_high_pct = 0
    if w52_high > 0:
        w52_from_high_pct = round((w52_high - ltp) / w52_high * 100, 1)

    # ── SCORING ──
    score = 0  # positive = bullish, negative = bearish
    signals = []
    reasons = []
    reasons_bn = []
    warnings = []
    warnings_bn = []

    # === RISK FACTORS (warnings, not auto-sells) ===

    if category == 'Z':
        score -= 8  # Penalty, but not a death sentence
        warnings.append(f'⚠️ Z-category: no margin loans, restricted trading')
        warnings_bn.append('⚠️ Z-ক্যাটাগরি: মার্জিন লোন নেই, সীমাবদ্ধ ট্রেডিং')
        signals.append('z_category')

    if category == 'B':
        score -= 5
        warnings.append('⚠️ B-category: elevated risk classification')
        warnings_bn.append('⚠️ B-ক্যাটাগরি: উচ্চ ঝুঁকি শ্রেণী')
        signals.append('b_category')

    if eps < 0:
        score -= 10
        warnings.append(f'⚠️ Negative EPS (৳{eps:.2f})')
        warnings_bn.append(f'⚠️ নেতিবাচক ইপিএস (৳{eps:.2f})')
        signals.append('negative_eps')

    if return_6m < -50:
        score -= 8
        warnings.append(f'⚠️ Crashed {return_6m:.0f}% in 6 months')
        warnings_bn.append(f'⚠️ ৬ মাসে {return_6m:.0f}% পতন')
        signals.append('crash')

    if return_1m < -10:
        score -= 3
        signals.append('weak_momentum')

    if percentile > 80:
        score -= 3
        warnings.append(f'📊 Near 5Y high ({percentile:.0f}th percentile)')
        warnings_bn.append(f'📊 ৫ বছরের সর্বোচ্চের কাছে ({percentile:.0f}তম পার্সেন্টাইল)')
        signals.append('overvalued_5y')

    # === VALUE FACTORS (positive) ===

    if 0 < pe < 10 and eps > 0:
        score += 12
        reasons.append(f'Low PE ({pe:.1f}x) with positive earnings')
        reasons_bn.append(f'কম PE ({pe:.1f}x) ইতিবাচক আয়ের সাথে')
        signals.append('cheap_pe')
    elif 0 < pe < 15 and eps > 0:
        score += 5
        reasons.append(f'Reasonable PE ({pe:.1f}x)')
        reasons_bn.append(f'যুক্তিসঙ্গত PE ({pe:.1f}x)')
        signals.append('fair_pe')

    if nav_discount_pct > 50 and nav > 0:
        score += 8
        reasons.append(f'{nav_discount_pct:.0f}% below NAV (৳{nav:.1f})')
        reasons_bn.append(f'NAV-র {nav_discount_pct:.0f}% নিচে (৳{nav:.1f})')
        signals.append('nav_discount')
    elif nav_discount_pct > 25 and nav > 0:
        score += 4
        reasons.append(f'{nav_discount_pct:.0f}% below NAV (৳{nav:.1f})')
        reasons_bn.append(f'NAV-র {nav_discount_pct:.0f}% নিচে (৳{nav:.1f})')
        signals.append('nav_discount')

    if percentile < 20:
        score += 6
        reasons.append(f'At {percentile:.0f}th percentile of 5Y range (historically cheap)')
        reasons_bn.append(f'৫ বছরের {percentile:.0f}তম পার্সেন্টাইলে (ঐতিহাসিকভাবে সস্তা)')
        signals.append('undervalued_5y')

    # === DIVIDEND FACTORS ===

    if has_recent_dividend and div_yield > 0:
        if div_yield > 5:
            score += 10
        elif div_yield > 3:
            score += 6
        elif div_yield > 1:
            score += 3

        div_desc = f'{div_pct:.0f}%'
        if dividend_per_share:
            div_desc += f' (≈৳{dividend_per_share}/share)'

        reasons.append(f'Dividend: {div_desc} ({div_year}). Yield: {div_yield:.1f}%')
        reasons_bn.append(f'লভ্যাংশ: {div_desc} ({div_year})। ইয়েল্ড: {div_yield:.1f}%')
        signals.append('high_dividend' if div_yield > 4 else 'has_dividend')
    elif div_pct and div_year and (current_year - div_year) > 1:
        score -= 3
        warnings.append(f'⚠️ Last dividend: {div_pct:.0f}% in {div_year} (over a year ago)')
        warnings_bn.append(f'⚠️ শেষ লভ্যাংশ: {div_pct:.0f}% ({div_year} সালে, ১ বছরেরও বেশি আগে)')
        signals.append('stale_dividend')

    # === MOMENTUM FACTORS ===

    if return_1m > 10:
        score += 5
        reasons.append(f'Strong 1M momentum (+{return_1m:.1f}%)')
        reasons_bn.append(f'শক্তিশালী ১-মাস গতি (+{return_1m:.1f}%)')
        signals.append('strong_momentum')
    elif return_1m > 5:
        score += 2
        signals.append('positive_momentum')

    if return_6m > 20:
        score += 3
        signals.append('strong_6m_momentum')

    # === RECOVERY PLAY DETECTION ===
    # A stock with heavy negatives BUT strong value can be a turnaround candidate
    if (category in ('Z', 'B') or eps < 0) and score < 0:
        # Check if there are compensating value factors
        value_signals = set(signals) & {'cheap_pe', 'fair_pe', 'nav_discount', 'undervalued_5y', 'high_dividend'}
        if len(value_signals) >= 2:
            score += 5  # Partial recovery bonus
            reasons.append('Potential recovery play: strong value despite risks')
            reasons_bn.append('সম্ভাব্য পুনরুদ্ধার: ঝুঁকি সত্ত্বেও শক্তিশালী মূল্যায়ন')
            signals.append('recovery_play')

    # ── DECISION from NET SCORE ──
    if score >= 12:
        action = 'buy'
        label = 'Strong Buy'
        label_bn = 'দৃঢ়ভাবে কিনুন'
    elif score >= 6:
        action = 'buy'
        label = 'Consider Buying'
        label_bn = 'কেনার কথা ভাবুন'
    elif score >= 0:
        action = 'hold'
        label = 'Hold'
        label_bn = 'ধরে রাখুন'
    elif score >= -8:
        action = 'hold'
        label = 'Hold with Caution'
        label_bn = 'সতর্কতার সাথে ধরুন'
    elif score >= -15:
        action = 'sell'
        label = 'Consider Selling'
        label_bn = 'বিক্রির কথা ভাবুন'
    else:
        action = 'sell'
        label = 'Sell'
        label_bn = 'বিক্রি করুন'

    # Duration guidance
    duration = None
    duration_bn = None
    if has_recent_dividend and div_yield > 3 and action != 'sell':
        duration = 'Hold for dividend'
        duration_bn = 'লভ্যাংশের জন্য ধরুন'
    elif action == 'buy' and percentile < 30:
        duration = '3-6 months (undervalued)'
        duration_bn = '৩-৬ মাস (অবমূল্যায়িত)'

    # Build combined reason
    combined_reason = '. '.join(reasons) + '.' if reasons else 'No strong signals detected.'
    combined_reason_bn = '। '.join(reasons_bn) + '।' if reasons_bn else 'কোনো শক্তিশালী সংকেত নেই।'

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
        'score': score,
        'generatedAt': datetime.now().strftime('%Y-%m-%d'),
    }

    if warnings:
        result['warnings'] = warnings
        result['warningsBn'] = warnings_bn
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
        # Include all analyzed stocks (even those with no signals provide a baseline)
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
