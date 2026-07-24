/**
 * Generates buy/hold/sell suggestions for portfolio holdings
 * based on live stock data, momentum, and valuation signals.
 */

const SUGGESTIONS = {
  strongSell: {
    action: 'sell',
    en: 'Sell',
    bn: 'বিক্রি করুন',
  },
  sell: {
    action: 'sell',
    en: 'Consider Selling',
    bn: 'বিক্রির কথা ভাবুন',
  },
  holdShort: {
    action: 'hold',
    en: 'Hold',
    bn: 'ধরে রাখুন',
    durationEn: '1–3 months',
    durationBn: '১–৩ মাস',
  },
  holdMedium: {
    action: 'hold',
    en: 'Hold',
    bn: 'ধরে রাখুন',
    durationEn: '6–12 months',
    durationBn: '৬–১২ মাস',
  },
  holdLong: {
    action: 'hold',
    en: 'Hold',
    bn: 'ধরে রাখুন',
    durationEn: '1–2 years',
    durationBn: '১–২ বছর',
  },
  buyMore: {
    action: 'buy',
    en: 'Buy More',
    bn: 'আরও কিনুন',
  },
};

/**
 * @param {object} holding - enriched holding with pnl/pnlPct
 * @param {object|null} stock - live stock data from stocks array
 * @returns {{ action: 'buy'|'hold'|'sell', label: string, labelBn: string, duration?: string, durationBn?: string, reason: string, reasonBn: string }}
 */
export function generateHoldingSuggestion(holding, stock) {
  if (!stock) {
    return {
      action: 'hold',
      label: 'Hold',
      labelBn: 'ধরে রাখুন',
      reason: 'No live data available',
      reasonBn: 'লাইভ ডেটা পাওয়া যায়নি',
    };
  }

  const pnlPct = holding.pnlPct || 0;
  const price = stock.currentPrice || 0;
  const w52High = stock.week52High || price;
  const w52Low = stock.week52Low || price;
  const w52Range = w52High - w52Low;
  const w52Position = w52Range > 0 ? (price - w52Low) / w52Range : 0.5;

  // Stats-based signals
  const percentile = stock.percentile5Y ?? 50;
  const zScore = stock.zScore5Y ?? 0;
  const priceVsMedian = stock.priceVsMedian5Y ?? 1.0;

  // Momentum signals
  const mom1m = stock.historicalReturn1Y != null ? stock.historicalReturn1Y / 12 : 0; // rough monthly
  const return1d = stock.return_1d ?? 0;
  const return1m = stock.return_1m ?? 0;
  const return1y = stock.historicalReturn1Y ?? 0;

  // Dividend
  const divYield = stock.dividendYield ?? 0;

  // ── Decision Logic ──

  // STRONG SELL: Big profit + overvalued + near 52W high
  if (pnlPct > 30 && w52Position > 0.85 && (percentile > 75 || zScore > 1.5)) {
    return {
      ...SUGGESTIONS.strongSell,
      label: SUGGESTIONS.strongSell.en,
      labelBn: SUGGESTIONS.strongSell.bn,
      reason: `Up ${pnlPct.toFixed(0)}% and near 52-week high. Lock in profits.`,
      reasonBn: `${pnlPct.toFixed(0)}% লাভে এবং ৫২-সপ্তাহের সর্বোচ্চের কাছে। মুনাফা নিশ্চিত করুন।`,
    };
  }

  // SELL: Decent profit + overvalued
  if (pnlPct > 15 && (percentile > 70 || priceVsMedian > 1.3) && return1m < 0) {
    return {
      ...SUGGESTIONS.sell,
      label: SUGGESTIONS.sell.en,
      labelBn: SUGGESTIONS.sell.bn,
      reason: `Good profit locked in. Momentum slowing, price above fair value.`,
      reasonBn: `ভালো মুনাফা অর্জিত। গতি কমছে, দাম ন্যায্য মূল্যের উপরে।`,
    };
  }

  // SELL: Deep loss + negative momentum (cut losses)
  if (pnlPct < -25 && return1m < -5 && return1y < -10) {
    return {
      ...SUGGESTIONS.sell,
      label: SUGGESTIONS.sell.en,
      labelBn: SUGGESTIONS.sell.bn,
      reason: `Significant loss with continued decline. Consider cutting losses.`,
      reasonBn: `উল্লেখযোগ্য ক্ষতি এবং পতন অব্যাহত। ক্ষতি কমানোর কথা ভাবুন।`,
    };
  }

  // BUY MORE: Undervalued + positive momentum starting
  if ((percentile < 25 || zScore < -1) && priceVsMedian < 0.8 && return1m > 0) {
    return {
      ...SUGGESTIONS.buyMore,
      label: SUGGESTIONS.buyMore.en,
      labelBn: SUGGESTIONS.buyMore.bn,
      reason: `Undervalued with positive momentum building. Good entry point.`,
      reasonBn: `কম মূল্যায়িত এবং ইতিবাচক গতি তৈরি হচ্ছে। ভালো প্রবেশ বিন্দু।`,
    };
  }

  // HOLD LONG: Deeply undervalued, waiting for mean reversion
  if (percentile < 30 || (priceVsMedian < 0.85 && pnlPct < 0)) {
    return {
      ...SUGGESTIONS.holdLong,
      label: SUGGESTIONS.holdLong.en,
      labelBn: SUGGESTIONS.holdLong.bn,
      duration: SUGGESTIONS.holdLong.durationEn,
      durationBn: SUGGESTIONS.holdLong.durationBn,
      reason: `Below historical average. Mean reversion expected over time.`,
      reasonBn: `ঐতিহাসিক গড়ের নিচে। সময়ের সাথে গড়ে ফেরার সম্ভাবনা।`,
    };
  }

  // HOLD MEDIUM: Fair value, decent dividend, stable
  if (divYield > 3 && pnlPct > -10 && pnlPct < 20) {
    return {
      ...SUGGESTIONS.holdMedium,
      label: SUGGESTIONS.holdMedium.en,
      labelBn: SUGGESTIONS.holdMedium.bn,
      duration: SUGGESTIONS.holdMedium.durationEn,
      durationBn: SUGGESTIONS.holdMedium.durationBn,
      reason: `Fair value with ${divYield.toFixed(1)}% dividend yield. Hold for income.`,
      reasonBn: `ন্যায্য মূল্যে ${divYield.toFixed(1)}% লভ্যাংশ সহ। আয়ের জন্য ধরে রাখুন।`,
    };
  }

  // HOLD SHORT: Positive short-term momentum
  if (return1m > 3 && w52Position < 0.7) {
    return {
      ...SUGGESTIONS.holdShort,
      label: SUGGESTIONS.holdShort.en,
      labelBn: SUGGESTIONS.holdShort.bn,
      duration: SUGGESTIONS.holdShort.durationEn,
      durationBn: SUGGESTIONS.holdShort.durationBn,
      reason: `Positive short-term momentum with room to grow.`,
      reasonBn: `স্বল্পমেয়াদী ইতিবাচক গতি এবং বৃদ্ধির সুযোগ আছে।`,
    };
  }

  // DEFAULT: Hold medium
  return {
    ...SUGGESTIONS.holdMedium,
    label: SUGGESTIONS.holdMedium.en,
    labelBn: SUGGESTIONS.holdMedium.bn,
    duration: SUGGESTIONS.holdMedium.durationEn,
    durationBn: SUGGESTIONS.holdMedium.durationBn,
    reason: `Near fair value. Monitor for changes.`,
    reasonBn: `ন্যায্য মূল্যের কাছাকাছি। পরিবর্তনের জন্য নজর রাখুন।`,
  };
}
