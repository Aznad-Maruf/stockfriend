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
  return Math.max(0, 25 * (1 - distance / maxDistance));
}

function computeHorizonScore(stock, horizon) {
  if (horizon === 'short') {
    const dividendPart = Math.min(stock.dividendYield / 10, 1) * 12;
    const stabilityPart = stock.riskLevel <= 2 ? 8 : stock.riskLevel <= 3 ? 5 : 2;
    return dividendPart + stabilityPart;
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

  // quick gains
  const returnPart = Math.min(stock.historicalReturn1Y / 30, 1) * 10;
  const capMap = { small: 6, mid: 4, large: 1.5 };
  const capPart = capMap[stock.marketCap] || 3;
  const growthMap = { high: 4, moderate: 2.5, low: 1 };
  const growthPart = growthMap[stock.growthPotential] || 2;
  return returnPart + capPart + growthPart;
}

/**
 * Computes a "value score" based on where the current price sits
 * within its 52-week range. Stocks near their 52-week LOW get
 * higher scores ("buy the dip"), stocks near their HIGH get lower
 * scores.
 *
 * Position = (52W High - Current) / (52W High - 52W Low)
 *   0% = at 52W high (overvalued, no bonus)
 *   100% = at 52W low (deep value, max bonus)
 *
 * Max score: 20 points
 */
function computeValueScore(stock) {
  if (!stock.week52High || !stock.week52Low || stock.week52High <= stock.week52Low) {
    return 0;
  }

  const range = stock.week52High - stock.week52Low;
  const distanceFromHigh = stock.week52High - stock.currentPrice;
  const position = Math.max(0, Math.min(1, distanceFromHigh / range));

  // position: 0 = at high (no value), 1 = at low (deep value)
  // Only reward stocks in the lower half of their range
  if (position < 0.3) {
    return 0; // Near 52W high — not undervalued
  }

  // Scale: 0.3-1.0 → 0-20 points with a curve
  const normalizedPosition = (position - 0.3) / 0.7;
  const score = 20 * Math.pow(normalizedPosition, 0.65);
  return Math.round(score * 10) / 10;
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

  // Value / undervalued rationale based on 52-week range position
  if (stock.week52High && stock.week52Low && stock.week52High > stock.week52Low) {
    const range = stock.week52High - stock.week52Low;
    const position = (stock.week52High - stock.currentPrice) / range; // 0=at high, 1=at low
    const dropFromHigh = Math.round(((stock.week52High - stock.currentPrice) / stock.week52High) * 100);
    if (position >= 0.75) {
      parts.push(
        `Near its 52-week low (৳${stock.week52Low}) — ${dropFromHigh}% below 52W high, a significant value opportunity.`
      );
      partsBn.push(
        `৫২-সপ্তাহের সর্বনিম্নের (৳${stock.week52Low}) কাছে — ৫২ সপ্তাহের সর্বোচ্চ থেকে ${dropFromHigh}% কম, একটি উল্লেখযোগ্য মূল্য সুযোগ।`
      );
    } else if (position >= 0.5) {
      parts.push(
        `Trading in the lower half of its 52-week range (৳${stock.week52Low}–৳${stock.week52High}) — positioned for potential recovery.`
      );
      partsBn.push(
        `৫২-সপ্তাহের পরিসীমার (৳${stock.week52Low}–৳${stock.week52High}) নিম্নার্ধে লেনদেন হচ্ছে — পুনরুদ্ধারের সম্ভাবনা রয়েছে।`
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
  } else if (answers.horizon === 'short' && stock.dividendYield >= 3) {
    parts.push('Regular dividends provide near-term cash flow.');
    partsBn.push('নিয়মিত লভ্যাংশ নিকটমেয়াদী নগদ প্রবাহ প্রদান করে।');
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

  // Score each stock: Risk(25) + Horizon(20) + Goal(20) + Value(20) = base (max 85)
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

    // For stocks near their 52W low, add a recovery bonus to tentative return
    let recoveryBonus = 0;
    if (item.stock.week52High && item.stock.week52Low) {
      const range = item.stock.week52High - item.stock.week52Low;
      if (range > 0) {
        const midpoint = (item.stock.week52High + item.stock.week52Low) / 2;
        // If current price is below the midpoint of the 52W range
        if (item.stock.currentPrice < midpoint) {
          const recoveryPotential = (midpoint - item.stock.currentPrice) / item.stock.currentPrice;
          // Assume partial recovery toward midpoint
          // Short-term: recover ~25% of the gap
          // Medium-term: recover ~50% of the gap
          // Long-term: recover ~80% of the gap
          const recoveryFactor =
            answers.horizon === 'short'
              ? 0.25
              : answers.horizon === 'medium'
                ? 0.5
                : 0.8;
          recoveryBonus = recoveryPotential * recoveryFactor * 100;
        }
      }
    }

    const adjustment = seededAdjustment(item.stock.ticker);
    const tentativeReturnPercent =
      Math.round((baseReturn * (1 + adjustment) + recoveryBonus) * 10) / 10;
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
  applyDiversificationPenalty,
  generateRationale,
};
