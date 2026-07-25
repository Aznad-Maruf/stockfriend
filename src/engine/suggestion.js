/**
 * Generates buy/hold/sell suggestions for portfolio holdings
 * based on live stock data, momentum, valuation, time constraints,
 * and research-backed overrides for specific stocks.
 */

/**
 * Research-backed overrides — updated July 25, 2026.
 * These override the algorithmic signals when real-world context
 * (news, earnings, regulatory actions) provides better insight.
 */
const RESEARCH_OVERRIDES = {
  GP: {
    action: 'hold',
    label: 'Hold for Dividend',
    labelBn: 'লভ্যাংশের জন্য ধরে রাখুন',
    reason: '৳10.50/share interim dividend declared. Record date Aug 12, 2026. ~8.34% yield.',
    reasonBn: 'শেয়ার প্রতি ৳১০.৫০ অন্তর্বর্তী লভ্যাংশ ঘোষিত। রেকর্ড তারিখ ১২ আগস্ট। ~৮.৩৪% ইয়েল্ড।',
    duration: 'Until Aug 12',
    durationBn: '১২ আগস্ট পর্যন্ত',
    researchDate: '2026-07-25',
  },
  SQURPHARMA: {
    action: 'buy',
    label: 'Buy More',
    labelBn: 'আরও কিনুন',
    reason: '#1 pharma at ~8x PE. 9M EPS ৳23.29 (+10% YoY). Annual dividend (120% cash) expected Oct/Nov.',
    reasonBn: 'শীর্ষ ফার্মা কোম্পানি ~৮x PE-তে। ৯ মাসে ইপিএস ৳২৩.২৯। বার্ষিক লভ্যাংশ অক্টো/নভে.',
    duration: 'Hold for dividend',
    durationBn: 'লভ্যাংশের জন্য ধরুন',
    researchDate: '2026-07-25',
  },
  BATBC: {
    action: 'hold',
    label: 'Hold',
    labelBn: 'ধরে রাখুন',
    reason: 'Q2 profit doubled YoY to ৳2.03B. EPS surged to ৳3.77. Strong earnings recovery.',
    reasonBn: 'Q2 মুনাফা দ্বিগুণ ৳২.০৩B। ইপিএস ৳৩.৭৭। শক্তিশালী আয় পুনরুদ্ধার।',
    duration: '3-6 months',
    durationBn: '৩-৬ মাস',
    researchDate: '2026-07-25',
  },
  TRUSTBANK: {
    action: 'hold',
    label: 'Hold',
    labelBn: 'ধরে রাখুন',
    reason: 'AA1 Stable rating. 13% dividend declared. Trades at 46% discount to NAV (৳29.19). AGM Jul 28.',
    reasonBn: 'AA1 স্থিতিশীল রেটিং। ১৩% লভ্যাংশ। NAV-র ৪৬% ছাড়ে ট্রেড হচ্ছে।',
    duration: 'Hold for dividend',
    durationBn: 'লভ্যাংশের জন্য ধরুন',
    researchDate: '2026-07-25',
  },
  WALTONHIL: {
    action: 'hold',
    label: 'Hold',
    labelBn: 'ধরে রাখুন',
    reason: 'Market leader. Cash flow recovered (NOCFPS ৳22.32). Annual dividend (175%) expected Sept/Oct.',
    reasonBn: 'বাজারে শীর্ষ। নগদ প্রবাহ পুনরুদ্ধার। বার্ষিক লভ্যাংশ (১৭৫%) সেপ্ট/অক্টো.',
    duration: '3-6 months',
    durationBn: '৩-৬ মাস',
    researchDate: '2026-07-25',
  },
  PREMIERBAN: {
    action: 'sell',
    label: 'Sell (Take Profit)',
    labelBn: 'বিক্রি করুন (মুনাফা নিন)',
    reason: 'H1 net loss ৳388cr (3x worse YoY). NAV halved to ৳10.44. Rally is speculative. Z-category.',
    reasonBn: 'H1 নিট ক্ষতি ৳৩৮৮কোটি। NAV অর্ধেক। র‍্যালি ফটকাবাজি। Z-ক্যাটাগরি।',
    researchDate: '2026-07-25',
  },
  MERCANBANK: {
    action: 'sell',
    label: 'Sell',
    labelBn: 'বিক্রি করুন',
    reason: 'Z-category since May 2026. No dividend for 2 years. No margin loans. No recovery catalyst.',
    reasonBn: 'মে ২০২৬ থেকে Z-ক্যাটাগরি। ২ বছর লভ্যাংশ নেই। কোনো পুনরুদ্ধার অনুঘটক নেই।',
    researchDate: '2026-07-25',
  },
  ABBANK: {
    action: 'sell',
    label: 'Sell',
    labelBn: 'বিক্রি করুন',
    reason: 'Negative EPS (-৳36.24). Z-category. Credit rating A- with Negative Outlook.',
    reasonBn: 'নেতিবাচক ইপিএস (-৳৩৬.২৪)। Z-ক্যাটাগরি। ক্রেডিট রেটিং নেতিবাচক।',
    researchDate: '2026-07-25',
  },
  BEXIMCO: {
    action: 'sell',
    label: 'Sell (Cut Losses)',
    labelBn: 'বিক্রি করুন (ক্ষতি কমান)',
    reason: 'Criminal charges, ৳25,000cr defaults, Sukuk default Dec 2026, no financials for 18 months.',
    reasonBn: 'ফৌজদারি মামলা, ৳২৫,০০০কোটি খেলাপি, সুকুক ডিফল্ট ডিসেম্বর, ১৮ মাস আর্থিক বিবরণী নেই।',
    researchDate: '2026-07-25',
  },
};

/**
 * @param {object} holding - enriched holding with pnlPct
 * @param {object|null} stock - live stock data from stocks array
 * @param {number|null} maxHoldMonths - max months the user can hold (null = no limit)
 * @param {object} research - dynamic research data from research.json (ticker -> override)
 * @returns {{ action: 'buy'|'hold'|'sell', label: string, labelBn: string, duration?: string, durationBn?: string, reason: string, reasonBn: string }}
 */
export function generateHoldingSuggestion(holding, stock, maxHoldMonths = null, research = {}) {
  // 1. Check dynamic research data (from research.json, auto-generated)
  const dynamicOverride = research[holding.ticker];
  if (dynamicOverride) {
    return {
      action: dynamicOverride.action,
      label: dynamicOverride.label,
      labelBn: dynamicOverride.labelBn,
      reason: dynamicOverride.reason,
      reasonBn: dynamicOverride.reasonBn,
      ...(dynamicOverride.duration && { duration: dynamicOverride.duration, durationBn: dynamicOverride.durationBn }),
      researchBacked: true,
      signals: dynamicOverride.signals || [],
    };
  }

  // 2. Check hardcoded research overrides (manually curated)
  const override = RESEARCH_OVERRIDES[holding.ticker];
  if (override) {
    return {
      action: override.action,
      label: override.label,
      labelBn: override.labelBn,
      reason: override.reason,
      reasonBn: override.reasonBn,
      ...(override.duration && { duration: override.duration, durationBn: override.durationBn }),
      researchBacked: true,
      researchDate: override.researchDate,
    };
  }

  // 3. Algorithmic analysis
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
  const return1m = stock.return_1m ?? 0;
  const return1y = stock.historicalReturn1Y ?? 0;

  // Dividend
  const divYield = stock.dividendYield ?? 0;

  // Time constraint
  const hasTimeLimit = maxHoldMonths != null && maxHoldMonths > 0;
  const isShortWindow = hasTimeLimit && maxHoldMonths <= 4;
  const isTightWindow = hasTimeLimit && maxHoldMonths <= 2;

  // ── Time-constrained logic (when maxHoldMonths is set) ──

  if (isTightWindow) {
    // Very short window (≤2 months): aggressive exit strategy
    if (pnlPct > 5) {
      return makeSuggestion('sell', 'Sell Now', 'এখনই বিক্রি করুন',
        `Only ${maxHoldMonths} month(s) left. Secure your ${pnlPct.toFixed(1)}% profit now.`,
        `মাত্র ${maxHoldMonths} মাস বাকি। ${pnlPct.toFixed(1)}% মুনাফা এখনই নিশ্চিত করুন।`,
        `⚡ ${maxHoldMonths}mo left`, `⚡ ${maxHoldMonths} মাস বাকি`
      );
    }
    if (pnlPct > -5) {
      return makeSuggestion('sell', 'Exit at Break-even', 'ব্রেক-ইভেনে বের হন',
        `Time running out. Exit near break-even to avoid risk.`,
        `সময় শেষ হয়ে আসছে। ঝুঁকি এড়াতে ব্রেক-ইভেনে বের হন।`,
        `⚡ ${maxHoldMonths}mo left`, `⚡ ${maxHoldMonths} মাস বাকি`
      );
    }
    return makeSuggestion('sell', 'Cut Losses', 'ক্ষতি কমান',
      `${maxHoldMonths} month(s) left with ${pnlPct.toFixed(1)}% loss. Cut losses to limit damage.`,
      `${maxHoldMonths} মাস বাকি এবং ${pnlPct.toFixed(1)}% ক্ষতি। ক্ষতি সীমিত করুন।`,
      `⚡ ${maxHoldMonths}mo left`, `⚡ ${maxHoldMonths} মাস বাকি`
    );
  }

  if (isShortWindow) {
    // Short window (≤4 months): prioritize exit planning

    // Strong profit — sell
    if (pnlPct > 15) {
      return makeSuggestion('sell', 'Sell', 'বিক্রি করুন',
        `Strong ${pnlPct.toFixed(1)}% profit. With ${maxHoldMonths}mo window, lock in gains.`,
        `শক্তিশালী ${pnlPct.toFixed(1)}% মুনাফা। ${maxHoldMonths} মাসের মধ্যে লাভ নিশ্চিত করুন।`,
        `${maxHoldMonths}mo window`, `${maxHoldMonths} মাস বাকি`
      );
    }

    // Moderate profit + weak momentum — sell soon
    if (pnlPct > 5 && return1m < 0) {
      return makeSuggestion('sell', 'Sell Soon', 'শীঘ্রই বিক্রি করুন',
        `${pnlPct.toFixed(1)}% profit but momentum fading. Sell within ${Math.ceil(maxHoldMonths / 2)} months.`,
        `${pnlPct.toFixed(1)}% মুনাফা কিন্তু গতি কমছে। ${Math.ceil(maxHoldMonths / 2)} মাসের মধ্যে বিক্রি করুন।`,
        `${maxHoldMonths}mo window`, `${maxHoldMonths} মাস বাকি`
      );
    }

    // Moderate profit + good momentum — hold briefly
    if (pnlPct > 0 && return1m > 0) {
      return makeSuggestion('hold', 'Hold Briefly', 'কিছুদিন ধরে রাখুন',
        `Positive momentum. Hold for 1–2 months, then exit before deadline.`,
        `ইতিবাচক গতি। ১–২ মাস ধরে রাখুন, তারপর সময়সীমার আগে বের হন।`,
        `Exit by ${maxHoldMonths}mo`, `${maxHoldMonths} মাসের মধ্যে বের হন`
      );
    }

    // Loss + positive momentum — wait for recovery
    if (pnlPct < 0 && pnlPct > -15 && return1m > 2) {
      return makeSuggestion('hold', 'Wait for Recovery', 'রিকভারির জন্য অপেক্ষা করুন',
        `Down ${Math.abs(pnlPct).toFixed(1)}% but recovering. Monitor weekly, exit if momentum stalls.`,
        `${Math.abs(pnlPct).toFixed(1)}% নিচে কিন্তু ফিরছে। সাপ্তাহিক পর্যবেক্ষণ করুন।`,
        `${maxHoldMonths}mo window`, `${maxHoldMonths} মাস বাকি`
      );
    }

    // Loss + no recovery — consider selling
    if (pnlPct < 0) {
      return makeSuggestion('sell', 'Consider Selling', 'বিক্রির কথা ভাবুন',
        `Down ${Math.abs(pnlPct).toFixed(1)}% with limited time. Recovery unlikely within ${maxHoldMonths} months.`,
        `${Math.abs(pnlPct).toFixed(1)}% নিচে এবং সময় সীমিত। ${maxHoldMonths} মাসে রিকভারি কঠিন।`,
        `${maxHoldMonths}mo window`, `${maxHoldMonths} মাস বাকি`
      );
    }

    // Break-even — hold briefly if momentum positive
    return makeSuggestion('hold', 'Hold Briefly', 'কিছুদিন ধরে রাখুন',
      `Near break-even. Hold if momentum stays positive, exit within ${maxHoldMonths} months.`,
      `ব্রেক-ইভেনের কাছে। গতি ভালো থাকলে ধরে রাখুন, ${maxHoldMonths} মাসের মধ্যে বের হন।`,
      `${maxHoldMonths}mo window`, `${maxHoldMonths} মাস বাকি`
    );
  }

  // ── Standard logic (no time constraint or long window) ──

  // STRONG SELL: Big profit + overvalued + near 52W high
  if (pnlPct > 30 && w52Position > 0.85 && (percentile > 75 || zScore > 1.5)) {
    return makeSuggestion('sell', 'Sell', 'বিক্রি করুন',
      `Up ${pnlPct.toFixed(0)}% and near 52-week high. Lock in profits.`,
      `${pnlPct.toFixed(0)}% লাভে এবং ৫২-সপ্তাহের সর্বোচ্চের কাছে। মুনাফা নিশ্চিত করুন।`
    );
  }

  // SELL: Decent profit + overvalued
  if (pnlPct > 15 && (percentile > 70 || priceVsMedian > 1.3) && return1m < 0) {
    return makeSuggestion('sell', 'Consider Selling', 'বিক্রির কথা ভাবুন',
      `Good profit locked in. Momentum slowing, price above fair value.`,
      `ভালো মুনাফা অর্জিত। গতি কমছে, দাম ন্যায্য মূল্যের উপরে।`
    );
  }

  // SELL: Deep loss + negative momentum (cut losses)
  if (pnlPct < -25 && return1m < -5 && return1y < -10) {
    return makeSuggestion('sell', 'Consider Selling', 'বিক্রির কথা ভাবুন',
      `Significant loss with continued decline. Consider cutting losses.`,
      `উল্লেখযোগ্য ক্ষতি এবং পতন অব্যাহত। ক্ষতি কমানোর কথা ভাবুন।`
    );
  }

  // BUY MORE: Undervalued + positive momentum starting
  if ((percentile < 25 || zScore < -1) && priceVsMedian < 0.8 && return1m > 0 && !hasTimeLimit) {
    return makeSuggestion('buy', 'Buy More', 'আরও কিনুন',
      `Undervalued with positive momentum building. Good entry point.`,
      `কম মূল্যায়িত এবং ইতিবাচক গতি তৈরি হচ্ছে। ভালো প্রবেশ বিন্দু।`
    );
  }

  // HOLD LONG: Deeply undervalued, waiting for mean reversion
  if ((percentile < 30 || (priceVsMedian < 0.85 && pnlPct < 0)) && !hasTimeLimit) {
    return makeSuggestion('hold', 'Hold', 'ধরে রাখুন',
      `Below historical average. Mean reversion expected over time.`,
      `ঐতিহাসিক গড়ের নিচে। সময়ের সাথে গড়ে ফেরার সম্ভাবনা।`,
      '1–2 years', '১–২ বছর'
    );
  }

  // HOLD MEDIUM: Fair value, decent dividend, stable
  if (divYield > 3 && pnlPct > -10 && pnlPct < 20) {
    const dur = hasTimeLimit ? `${maxHoldMonths} months` : '6–12 months';
    const durBn = hasTimeLimit ? `${maxHoldMonths} মাস` : '৬–১২ মাস';
    return makeSuggestion('hold', 'Hold', 'ধরে রাখুন',
      `Fair value with ${divYield.toFixed(1)}% dividend yield. Hold for income.`,
      `ন্যায্য মূল্যে ${divYield.toFixed(1)}% লভ্যাংশ সহ। আয়ের জন্য ধরে রাখুন।`,
      dur, durBn
    );
  }

  // HOLD SHORT: Positive short-term momentum
  if (return1m > 3 && w52Position < 0.7) {
    return makeSuggestion('hold', 'Hold', 'ধরে রাখুন',
      `Positive short-term momentum with room to grow.`,
      `স্বল্পমেয়াদী ইতিবাচক গতি এবং বৃদ্ধির সুযোগ আছে।`,
      '1–3 months', '১–৩ মাস'
    );
  }

  // DEFAULT
  const defDur = hasTimeLimit ? `up to ${maxHoldMonths}mo` : '6–12 months';
  const defDurBn = hasTimeLimit ? `${maxHoldMonths} মাস পর্যন্ত` : '৬–১২ মাস';
  return makeSuggestion('hold', 'Hold', 'ধরে রাখুন',
    `Near fair value. Monitor for changes.`,
    `ন্যায্য মূল্যের কাছাকাছি। পরিবর্তনের জন্য নজর রাখুন।`,
    defDur, defDurBn
  );
}

// ── Helper ──

function makeSuggestion(action, label, labelBn, reason, reasonBn, duration, durationBn) {
  const result = { action, label, labelBn, reason, reasonBn };
  if (duration) {
    result.duration = duration;
    result.durationBn = durationBn;
  }
  return result;
}
