function seedFromTicker(ticker) {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = (hash * 31 + ticker.charCodeAt(i)) | 0;
  }
  return hash;
}

function seededAdjustment(ticker) {
  const hash = Math.abs(seedFromTicker(ticker));
  const normalized = (hash % 2001) / 1000 - 1;
  return normalized * 0.1;
}

function computeRiskScore(stock, riskPreference) {
  const preferred = {
    conservative: [1, 2],
    moderate: [2, 3],
    aggressive: [3, 4, 5],
  };

  const targets = preferred[riskPreference] || [3];
  const center = targets.reduce((a, b) => a + b, 0) / targets.length;
  const distance = Math.abs(stock.riskLevel - center);
  const maxDistance = 4;
  let score = Math.max(0, 20 * (1 - distance / maxDistance));

  // Volatility refinement: penalize high-volatility stocks for conservative,
  // reward them for aggressive (max ±5 points)
  if (stock.volatilityAnnual > 0) {
    const vol = stock.volatilityAnnual;
    if (riskPreference === 'conservative') {
      // Penalize: >40% vol gets -5, <15% vol gets +3
      score += vol < 15 ? 3 : vol < 25 ? 0 : vol < 40 ? -2 : -5;
    } else if (riskPreference === 'aggressive') {
      // Reward moderate volatility (sweet spot 25-45%), penalize extremes
      score += vol > 25 && vol < 45 ? 3 : vol >= 45 ? 1 : 0;
    }
  }

  // Max drawdown penalty for conservative investors
  if (riskPreference === 'conservative' && stock.maxDrawdown5Y < -60) {
    score -= 3; // Stocks that crashed >60% are too risky
  }

  return Math.max(0, Math.min(25, score));
}

function computeHorizonScore(stock, horizon) {
  if (horizon === 'short') {
    const dividendPart = Math.min(stock.dividendYield / 10, 1) * 8;
    const stabilityPart = stock.riskLevel <= 2 ? 5 : stock.riskLevel <= 3 ? 3 : 1;
    // Short-term: recent momentum matters most
    const momentumPart = computeMomentumScore(stock, 'short');
    return dividendPart + stabilityPart + momentumPart;
  }

  if (horizon === 'medium') {
    const growthMap = { high: 8, moderate: 6, low: 2 };
    const growthPart = growthMap[stock.growthPotential] || 4;
    const dividendPart = Math.min(stock.dividendYield / 10, 1) * 6;
    const returnPart = Math.min(stock.historicalReturn3Y / 30, 1) * 6;
    return growthPart + dividendPart + returnPart;
  }

  const growthMap = { high: 10, moderate: 6, low: 2 };
  const growthPart = growthMap[stock.growthPotential] || 4;
  const return5Part = Math.min(stock.historicalReturn5Y / 25, 1) * 6;
  const return3Part = Math.min(stock.historicalReturn3Y / 25, 1) * 4;
  return growthPart + return5Part + return3Part;
}

function computeGoalScore(stock, goal) {
  if (goal === 'wealth') {
    const growthMap = { high: 10, moderate: 6, low: 2 };
    const growthPart = growthMap[stock.growthPotential] || 4;
    const returnPart = Math.min(stock.historicalReturn5Y / 25, 1) * 8;
    const capMap = { large: 2, mid: 1.5, small: 1 };
    const capPart = capMap[stock.marketCap] || 1.5;
    return growthPart + returnPart + capPart;
  }

  if (goal === 'income') {
    const dividendPart = Math.min(stock.dividendYield / 10, 1) * 14;
    const stabilityPart = stock.riskLevel <= 2 ? 6 : stock.riskLevel <= 3 ? 3 : 1;
    return dividendPart + stabilityPart;
  }

  // quick gains — momentum is king
  const momentumPart = computeMomentumScore(stock, 'quick');
  const returnPart = Math.min(stock.historicalReturn1Y / 30, 1) * 6;
  const capMap = { small: 4, mid: 3, large: 1 };
  const capPart = capMap[stock.marketCap] || 2;
  const growthMap = { high: 3, moderate: 2, low: 1 };
  const growthPart = growthMap[stock.growthPotential] || 1.5;
  return momentumPart + returnPart + capPart + growthPart;
}

/**
 * Computes a momentum score based on recent price trends.
 *
 * Uses return_1d, return_15d, return_1m, and historicalReturn1Y to assess
 * whether a stock has upward momentum (trending) or is stagnant/declining.
 *
 * For 'short' horizon: weighted toward 15d and 1m trends (0-7 pts)
 * For 'quick' gains: heavily weighted, rewards strong recent runs (0-7 pts)
 * For 'medium': light weight on 1m + 1Y trend (0-4 pts)
 * For 'long': minimal — momentum is noise for long-term (0-2 pts)
 */
function computeMomentumScore(stock, mode) {
  const r1d = stock.return1d || 0;
  const r15d = stock.return15d || 0;
  const r1m = stock.return1m || 0;
  const r1y = stock.historicalReturn1Y || 0;

  if (mode === 'quick') {
    // Quick gains: reward strong recent uptrend
    let score = 0;

    // 15-day momentum (0-3 pts) — most actionable window
    if (r15d > 10) score += 3;
    else if (r15d > 5) score += 2.5;
    else if (r15d > 2) score += 1.5;
    else if (r15d > 0) score += 0.5;

    // 1-month momentum (0-2 pts)
    if (r1m > 15) score += 2;
    else if (r1m > 8) score += 1.5;
    else if (r1m > 3) score += 1;
    else if (r1m > 0) score += 0.5;

    // 1-year trend direction (0-2 pts) — is the long trend supporting?
    if (r1y > 20) score += 2;
    else if (r1y > 5) score += 1;
    else if (r1y > 0) score += 0.5;
    // Negative 1Y with positive short-term = potential reversal, neutral

    return Math.min(7, score);
  }

  if (mode === 'short') {
    // Short horizon: balanced momentum check
    let score = 0;

    // 15-day trend (0-3 pts)
    if (r15d > 8) score += 3;
    else if (r15d > 3) score += 2;
    else if (r15d > 0) score += 1;

    // 1-month trend (0-2 pts)
    if (r1m > 10) score += 2;
    else if (r1m > 3) score += 1;
    else if (r1m > 0) score += 0.5;

    // Penalize sharp recent declines
    if (r15d < -5) score -= 1;
    if (r1m < -10) score -= 1;

    // Consistent uptrend bonus: all three positive = +1
    if (r1d > 0 && r15d > 0 && r1m > 0) score += 1;

    return Math.max(0, Math.min(7, score));
  }

  if (mode === 'medium') {
    // Medium horizon: light momentum influence
    let score = 0;
    if (r1m > 5) score += 1.5;
    else if (r1m > 0) score += 0.5;
    if (r1y > 10) score += 1.5;
    else if (r1y > 0) score += 0.5;
    if (r1m < -10) score -= 1;
    return Math.max(0, Math.min(4, score));
  }

  // Long horizon: momentum is mostly noise, but extreme trends get a nod
  if (r1y > 20) return 2;
  if (r1y > 10) return 1;
  return 0;
}

/**
 * Computes a "value score" using multiple signals from 5-year historical stats.
 * This replaces the naive 52W-only approach with a multi-factor assessment.
 *
 * Factors:
 *   1. Percentile position (0-8 pts): Lower percentile = cheaper vs history
 *   2. Z-score signal (0-6 pts): Negative z-score = below historical mean
 *   3. Price vs median ratio (0-6 pts): Below median = undervalued
 *   4. 52W range position (0-5 pts): Traditional range check (supplementary)
 *
 * Max score: 25 points
 */
function computeValueScore(stock) {
  let score = 0;

  // Factor 1: Percentile position in 5Y history (0-8 pts)
  // percentile5Y: 0 = at 5Y low (cheapest ever), 100 = at 5Y high (most expensive)
  if (stock.percentile5Y != null && stock.percentile5Y > 0) {
    if (stock.percentile5Y <= 15) {
      score += 8;  // Bottom 15% of 5Y — deep value
    } else if (stock.percentile5Y <= 30) {
      score += 6;  // Bottom 30% — good value
    } else if (stock.percentile5Y <= 50) {
      score += 4;  // Below median — fair value
    } else if (stock.percentile5Y <= 70) {
      score += 1;  // Slightly above median — neutral
    }
    // >70 percentile: 0 points — historically expensive
  }

  // Factor 2: Z-score from 5Y mean (0-6 pts)
  // Negative z-score means price is below the historical mean
  if (stock.zScore5Y != null) {
    if (stock.zScore5Y <= -2) {
      score += 6;  // >2 std devs below mean — extreme value
    } else if (stock.zScore5Y <= -1) {
      score += 4;  // 1-2 std devs below — good value
    } else if (stock.zScore5Y <= -0.3) {
      score += 2;  // Slightly below mean
    } else if (stock.zScore5Y <= 0.3) {
      score += 1;  // Near the mean — fair
    }
    // >0.3: 0 points — above mean, not cheap
  }

  // Factor 3: Price vs 5Y median ratio (0-6 pts)
  if (stock.priceVsMedian5Y != null && stock.priceVsMedian5Y > 0) {
    if (stock.priceVsMedian5Y <= 0.5) {
      score += 6;  // Trading at <50% of 5Y median — extreme discount
    } else if (stock.priceVsMedian5Y <= 0.7) {
      score += 5;  // 30%+ below median
    } else if (stock.priceVsMedian5Y <= 0.85) {
      score += 3;  // 15-30% below median
    } else if (stock.priceVsMedian5Y <= 0.95) {
      score += 2;  // 5-15% below median
    } else if (stock.priceVsMedian5Y <= 1.05) {
      score += 1;  // Near median (±5%)
    }
    // >1.05: 0 points — above median
  }

  // Factor 4: 52W range position — supplementary (0-5 pts)
  // Only contributes when stats are missing or as a recency signal
  if (stock.week52High && stock.week52Low && stock.week52High > stock.week52Low) {
    const range = stock.week52High - stock.week52Low;
    const distFromHigh = stock.week52High - stock.currentPrice;
    const position = Math.max(0, Math.min(1, distFromHigh / range));
    if (position >= 0.7) {
      score += 5;  // Near 52W low
    } else if (position >= 0.5) {
      score += 3;  // Lower half of 52W range
    } else if (position >= 0.3) {
      score += 1;  // Middle of range
    }
  }

  return Math.min(25, score);
}

function applyDiversificationPenalty(scoredStocks) {
  const sectorCounts = {};
  const maxBonus = 15;

  return scoredStocks.map((item) => {
    const sector = item.stock.sector;
    const count = sectorCounts[sector] || 0;
    sectorCounts[sector] = count + 1;

    let bonus;
    if (count === 0) {
      bonus = maxBonus;
    } else if (count === 1) {
      bonus = maxBonus * 0.4;
    } else {
      bonus = maxBonus * 0.1;
    }

    return {
      ...item,
      diversificationScore: bonus,
      totalScore: item.baseScore + bonus,
    };
  });
}

function generateRationale(stock, answers) {
  const parts = [];
  const partsBn = [];

  // Stats-based value rationale
  if (stock.percentile5Y != null && stock.percentile5Y > 0) {
    if (stock.percentile5Y <= 15) {
      parts.push(
        `Currently at the ${Math.round(stock.percentile5Y)}th percentile of its 5-year price range — historically very cheap.`
      );
      partsBn.push(
        `বর্তমানে ৫ বছরের মূল্য পরিসরের ${Math.round(stock.percentile5Y)}তম পার্সেন্টাইলে — ঐতিহাসিকভাবে অনেক সস্তা।`
      );
    } else if (stock.percentile5Y <= 35) {
      parts.push(
        `Trading below its 5-year median price — good entry point at the ${Math.round(stock.percentile5Y)}th percentile.`
      );
      partsBn.push(
        `৫ বছরের মধ্যমূল্যের নিচে লেনদেন হচ্ছে — ${Math.round(stock.percentile5Y)}তম পার্সেন্টাইলে ভালো প্রবেশ সুযোগ।`
      );
    } else if (stock.percentile5Y >= 85) {
      parts.push(
        `Trading near its 5-year high (${Math.round(stock.percentile5Y)}th percentile) — limited upside, but momentum is strong.`
      );
      partsBn.push(
        `৫ বছরের সর্বোচ্চের কাছে (${Math.round(stock.percentile5Y)}তম পার্সেন্টাইল) লেনদেন — সীমিত ঊর্ধ্বগতি, তবে গতি শক্তিশালী।`
      );
    }
  }

  // Price vs median insight
  if (stock.priceVsMedian5Y && stock.priceVsMedian5Y < 0.7) {
    const discount = Math.round((1 - stock.priceVsMedian5Y) * 100);
    parts.push(`${discount}% below its 5-year median — potential mean-reversion upside.`);
    partsBn.push(`৫ বছরের মধ্যমূল্য থেকে ${discount}% কম — গড়ে ফেরত আসার সম্ভাবনা।`);
  }

  // Volatility warning
  if (stock.volatilityAnnual > 45) {
    parts.push('High volatility stock — expect significant price swings.');
    partsBn.push('উচ্চ অস্থিরতার শেয়ার — উল্লেখযোগ্য দাম ওঠানামা আশা করুন।');
  }

  // 52-week range (kept as supplementary)
  if (stock.week52High && stock.week52Low && stock.week52High > stock.week52Low) {
    const range = stock.week52High - stock.week52Low;
    const position = (stock.week52High - stock.currentPrice) / range;
    const dropFromHigh = Math.round(((stock.week52High - stock.currentPrice) / stock.week52High) * 100);
    if (position >= 0.75) {
      parts.push(
        `Near its 52-week low (৳${stock.week52Low}) — ${dropFromHigh}% below 52W high.`
      );
      partsBn.push(
        `৫২-সপ্তাহের সর্বনিম্নের (৳${stock.week52Low}) কাছে — ৫২ সপ্তাহের সর্বোচ্চ থেকে ${dropFromHigh}% কম।`
      );
    }
  }

  if (answers.goal === 'income' && stock.dividendYield >= 4) {
    parts.push('Strong dividend yield aligns with your income goal.');
    partsBn.push('শক্তিশালী লভ্যাংশ প্রদান আপনার আয়ের লক্ষ্যের সাথে সামঞ্জস্যপূর্ণ।');
  } else if (answers.goal === 'income' && stock.dividendYield >= 2) {
    parts.push('Decent dividend yield supports your income objective.');
    partsBn.push('ভালো লভ্যাংশ প্রদান আপনার আয়ের উদ্দেশ্যকে সমর্থন করে।');
  } else if (answers.goal === 'wealth' && stock.growthPotential === 'high') {
    parts.push('High growth potential supports long-term wealth building.');
    partsBn.push('উচ্চ প্রবৃদ্ধির সম্ভাবনা দীর্ঘমেয়াদী সম্পদ গঠনে সহায়ক।');
  } else if (answers.goal === 'wealth') {
    parts.push('Solid historical returns make it a good candidate for wealth growth.');
    partsBn.push('শক্তিশালী ঐতিহাসিক রিটার্ন সম্পদ বৃদ্ধির জন্য উপযুক্ত।');
  } else if (answers.goal === 'quick' && stock.historicalReturn1Y >= 15) {
    parts.push('Strong recent performance suits your short-term gain strategy.');
    partsBn.push(
      'সাম্প্রতিক শক্তিশালী পারফরম্যান্স আপনার স্বল্পমেয়াদী লাভের কৌশলের জন্য উপযুক্ত।'
    );
  } else if (answers.goal === 'quick') {
    parts.push('Potential for quick returns based on recent market activity.');
    partsBn.push('সাম্প্রতিক বাজার কার্যক্রমের ভিত্তিতে দ্রুত রিটার্নের সম্ভাবনা।');
  }

  if (answers.risk === 'conservative' && stock.riskLevel <= 2) {
    parts.push('Low risk profile suits conservative investors.');
    partsBn.push('কম ঝুঁকির প্রোফাইল রক্ষণশীল বিনিয়োগকারীদের জন্য উপযুক্ত।');
  } else if (
    answers.risk === 'moderate' &&
    stock.riskLevel >= 2 &&
    stock.riskLevel <= 3
  ) {
    parts.push('Balanced risk level matches your moderate risk appetite.');
    partsBn.push(
      'সুষম ঝুঁকির মাত্রা আপনার মধ্যম ঝুঁকি গ্রহণের ক্ষমতার সাথে মানানসই।'
    );
  } else if (answers.risk === 'aggressive' && stock.riskLevel >= 4) {
    parts.push('Higher risk aligns with your aggressive investment style.');
    partsBn.push(
      'উচ্চ ঝুঁকি আপনার আক্রমণাত্মক বিনিয়োগ শৈলীর সাথে সামঞ্জস্যপূর্ণ।'
    );
  }

  if (answers.horizon === 'long' && stock.historicalReturn5Y >= 12) {
    parts.push('Proven long-term track record strengthens this pick.');
    partsBn.push(
      'প্রমাণিত দীর্ঘমেয়াদী ট্র্যাক রেকর্ড এই নির্বাচনকে শক্তিশালী করে।'
    );
  } else if (answers.horizon === 'short' || answers.goal === 'quick') {
    // Momentum-based rationale for short-term seekers
    const r15d = stock.return15d || 0;
    const r1m = stock.return1m || 0;
    const r1y = stock.historicalReturn1Y || 0;

    if (r15d > 5 && r1m > 8) {
      parts.push(`Strong upward momentum: +${r15d.toFixed(1)}% in 15 days, +${r1m.toFixed(1)}% this month.`);
      partsBn.push(`শক্তিশালী গতি: ১৫ দিনে +${r15d.toFixed(1)}%, এই মাসে +${r1m.toFixed(1)}%।`);
    } else if (r15d > 2 && r1m > 3) {
      parts.push(`Positive recent trend: +${r15d.toFixed(1)}% in 15 days, +${r1m.toFixed(1)}% this month.`);
      partsBn.push(`সাম্প্রতিক ইতিবাচক প্রবণতা: ১৫ দিনে +${r15d.toFixed(1)}%, এই মাসে +${r1m.toFixed(1)}%।`);
    } else if (r1y > 15 && r1m > 0) {
      parts.push(`Strong yearly trend (+${r1y.toFixed(1)}%) with continued positive movement.`);
      partsBn.push(`শক্তিশালী বার্ষিক প্রবণতা (+${r1y.toFixed(1)}%) এবং ধারাবাহিক গতি।`);
    }

    if (stock.dividendYield >= 3 && answers.horizon === 'short') {
      parts.push('Regular dividends provide near-term cash flow.');
      partsBn.push('নিয়মিত লভ্যাংশ নিকটমেয়াদী নগদ প্রবাহ প্রদান করে।');
    }
  } else if (answers.horizon === 'medium') {
    parts.push('Good balance of growth and stability for medium-term holding.');
    partsBn.push(
      'মধ্যমেয়াদী ধারণের জন্য প্রবৃদ্ধি ও স্থিতিশীলতার ভালো ভারসাম্য।'
    );
  }

  if (stock.marketCap === 'large') {
    parts.push('Large-cap stability adds portfolio resilience.');
    partsBn.push('লার্জ-ক্যাপ স্থিতিশীলতা পোর্টফোলিওতে সহনশীলতা যোগ করে।');
  }

  if (parts.length === 0) {
    parts.push(
      'Well-rounded stock with good overall characteristics for your profile.'
    );
    partsBn.push(
      'আপনার প্রোফাইলের জন্য ভালো সামগ্রিক বৈশিষ্ট্যসম্পন্ন শেয়ার।'
    );
  }

  return {
    rationale: parts.join(' '),
    rationaleBn: partsBn.join(' '),
  };
}

export function generateRecommendations(answers, stocks) {
  let filtered = stocks;
  if (answers.sectors && answers.sectors.length > 0) {
    const sectorSet = new Set(answers.sectors.map((s) => s.toLowerCase()));
    filtered = stocks.filter((s) => sectorSet.has(s.sector.toLowerCase()));
  }

  if (filtered.length === 0) {
    return {
      recommendations: [],
      summary: {
        totalInvestment: answers.budget,
        projectedValue: answers.budget,
        projectedGain: 0,
        projectedReturnPercent: 0,
        sectorBreakdown: [],
      },
    };
  }

  // Score each stock: Risk(25) + Horizon(20) + Goal(20) + Value(25) = base (max 90)
  // Note: Horizon and Goal now include momentum internally for short/quick
  const scored = filtered.map((stock) => {
    const riskScore = computeRiskScore(stock, answers.risk);
    const horizonScore = computeHorizonScore(stock, answers.horizon);
    const goalScore = computeGoalScore(stock, answers.goal);
    const valueScore = computeValueScore(stock);
    const baseScore = riskScore + horizonScore + goalScore + valueScore;

    return { stock, riskScore, horizonScore, goalScore, valueScore, baseScore };
  });

  scored.sort((a, b) => b.baseScore - a.baseScore);

  // Diversification bonus adds up to 15 points
  const withDiversity = applyDiversificationPenalty(scored);

  withDiversity.sort((a, b) => b.totalScore - a.totalScore);

  const top = withDiversity.slice(0, 5);

  const totalScore = top.reduce((sum, item) => sum + item.totalScore, 0);

  const rawAllocations = top.map((item) => ({
    ...item,
    rawPercent: totalScore > 0 ? (item.totalScore / totalScore) * 100 : 20,
  }));

  let allocations = rawAllocations.map((item) => ({
    ...item,
    allocationPercent: Math.round(item.rawPercent),
  }));

  const allocSum = allocations.reduce((s, a) => s + a.allocationPercent, 0);
  if (allocSum !== 100 && allocations.length > 0) {
    const diff = 100 - allocSum;
    allocations[0].allocationPercent += diff;
  }

  const recommendations = allocations.map((item) => {
    const allocationAmount = Math.round(
      (item.allocationPercent / 100) * answers.budget
    );

    let baseReturn;
    if (answers.horizon === 'short') {
      baseReturn = item.stock.historicalReturn1Y;
    } else if (answers.horizon === 'medium') {
      baseReturn = item.stock.historicalReturn3Y;
    } else {
      baseReturn = item.stock.historicalReturn5Y;
    }

    // Mean-reversion based return estimate
    // If stock is below its 5Y median, estimate recovery toward median
    let meanReversionReturn = 0;
    if (item.stock.priceVsMedian5Y && item.stock.priceVsMedian5Y < 1.0 && item.stock.median5Y) {
      // How far below median (as % of current price)
      const gapToMedian = ((item.stock.median5Y - item.stock.currentPrice) / item.stock.currentPrice) * 100;
      // Assume partial reversion depending on horizon
      const reversionFactor =
        answers.horizon === 'short' ? 0.15 : answers.horizon === 'medium' ? 0.4 : 0.7;
      meanReversionReturn = Math.max(0, gapToMedian * reversionFactor);
    }

    const adjustment = seededAdjustment(item.stock.ticker);
    const tentativeReturnPercent =
      Math.round((baseReturn * (1 + adjustment) + meanReversionReturn) * 10) / 10;
    const tentativeReturnAmount = Math.round(
      (tentativeReturnPercent / 100) * allocationAmount
    );

    const { rationale, rationaleBn } = generateRationale(
      item.stock,
      answers
    );

    return {
      stock: item.stock,
      allocationPercent: item.allocationPercent,
      allocationAmount,
      tentativeReturnPercent,
      tentativeReturnAmount,
      score: Math.round(item.totalScore),
      rationale,
      rationaleBn,
    };
  });

  const projectedGain = recommendations.reduce(
    (sum, r) => sum + r.tentativeReturnAmount,
    0
  );
  const projectedValue = answers.budget + projectedGain;
  const projectedReturnPercent =
    answers.budget > 0
      ? Math.round((projectedGain / answers.budget) * 1000) / 10
      : 0;

  const sectorMap = {};
  for (const rec of recommendations) {
    const key = rec.stock.sector;
    if (!sectorMap[key]) {
      sectorMap[key] = {
        sector: rec.stock.sector,
        sectorBn: rec.stock.sectorBn,
        percentage: 0,
      };
    }
    sectorMap[key].percentage += rec.allocationPercent;
  }
  const sectorBreakdown = Object.values(sectorMap).sort(
    (a, b) => b.percentage - a.percentage
  );

  return {
    recommendations,
    summary: {
      totalInvestment: answers.budget,
      projectedValue,
      projectedGain,
      projectedReturnPercent,
      sectorBreakdown,
    },
  };
}

export function getRiskLabel(level) {
  const labels = {
    1: 'Very Low',
    2: 'Low',
    3: 'Moderate',
    4: 'High',
    5: 'Very High',
  };
  return labels[level] || 'Unknown';
}

export function getRiskColor(level) {
  const colors = {
    1: '#10b981',
    2: '#34d399',
    3: '#f59e0b',
    4: '#f97316',
    5: '#ef4444',
  };
  return colors[level] || '#6b7280';
}

// Export internals for testing
export const _testExports = {
  seedFromTicker,
  seededAdjustment,
  computeRiskScore,
  computeHorizonScore,
  computeGoalScore,
  computeValueScore,
  computeMomentumScore,
  applyDiversificationPenalty,
  generateRationale,
};
