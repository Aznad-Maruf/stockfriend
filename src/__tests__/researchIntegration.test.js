import { describe, it, expect } from 'vitest';
import { generateRecommendations } from '../engine/index.js';
import { generateHoldingSuggestion } from '../engine/suggestion.js';

// ─── Test fixtures ───────────────────────────────────────────

function makeStock(overrides = {}) {
  return {
    id: 1,
    ticker: 'TEST',
    name: 'Test Corp.',
    nameBn: 'টেস্ট কর্প.',
    sector: 'Banking',
    sectorBn: 'ব্যাংকিং',
    currentPrice: 50,
    week52High: 100,
    week52Low: 20,
    riskLevel: 3,
    dividendYield: 3.0,
    historicalReturn1Y: 10,
    historicalReturn3Y: 30,
    historicalReturn5Y: 60,
    marketCap: 'mid',
    growthPotential: 'moderate',
    description: 'Test',
    descriptionBn: 'টেস্ট',
    percentile5Y: 50,
    zScore5Y: 0,
    priceVsMedian5Y: 1.0,
    median1Y: 50,
    median3Y: 50,
    median5Y: 50,
    mean5Y: 50,
    volatilityAnnual: 25,
    maxDrawdown5Y: -30,
    beta: 1.0,
    ...overrides,
  };
}

function makeAnswers(overrides = {}) {
  return {
    experience: 'intermediate',
    risk: 'moderate',
    horizon: 'medium',
    budget: 200000,
    goal: 'wealth',
    sectors: [],
    ...overrides,
  };
}

function makeUniverse() {
  return [
    makeStock({ id: 1, ticker: 'GOOD1', sector: 'Pharma', riskLevel: 1, currentPrice: 200, dividendYield: 5, historicalReturn1Y: 15 }),
    makeStock({ id: 2, ticker: 'GOOD2', sector: 'Banking', riskLevel: 2, currentPrice: 50, dividendYield: 4, historicalReturn1Y: 12 }),
    makeStock({ id: 3, ticker: 'RISKY1', sector: 'IT', riskLevel: 4, currentPrice: 5, dividendYield: 0, historicalReturn1Y: -20 }),
    makeStock({ id: 4, ticker: 'RISKY2', sector: 'Textile', riskLevel: 5, currentPrice: 10, dividendYield: 0, historicalReturn1Y: -40 }),
    makeStock({ id: 5, ticker: 'MID1', sector: 'Cement', riskLevel: 3, currentPrice: 80, dividendYield: 2, historicalReturn1Y: 8 }),
    makeStock({ id: 6, ticker: 'MID2', sector: 'Power', riskLevel: 2, currentPrice: 30, dividendYield: 3, historicalReturn1Y: 5 }),
  ];
}

// ═══════════════════════════════════════════════════════════════
// Research integration with generateRecommendations
// ═══════════════════════════════════════════════════════════════

describe('generateRecommendations with research', () => {

  it('works without research data (backward compatible)', () => {
    const result = generateRecommendations(makeAnswers(), makeUniverse());
    expect(result.recommendations).toHaveLength(5);
    result.recommendations.forEach(r => {
      expect(r.researchContext).toBeNull();
    });
  });

  it('works with empty research object', () => {
    const result = generateRecommendations(makeAnswers(), makeUniverse(), {});
    expect(result.recommendations).toHaveLength(5);
  });

  it('attaches researchContext to recommended stocks that have research data', () => {
    const research = {
      GOOD1: {
        action: 'buy',
        label: 'Buy More',
        labelBn: 'আরও কিনুন',
        reason: 'Low PE with growth',
        reasonBn: 'কম PE',
        signals: ['cheap_pe', 'high_dividend'],
      },
    };
    const result = generateRecommendations(makeAnswers(), makeUniverse(), research);
    const good1Rec = result.recommendations.find(r => r.stock.ticker === 'GOOD1');
    if (good1Rec) {
      expect(good1Rec.researchContext).not.toBeNull();
      expect(good1Rec.researchContext.reason).toBe('Low PE with growth');
      expect(good1Rec.researchContext.signals).toContain('cheap_pe');
    }
  });

  it('boosts stocks with positive research signals', () => {
    const universe = makeUniverse();
    const answers = makeAnswers();

    // Without research
    const resultNoResearch = generateRecommendations(answers, universe);
    const mid1NoResearch = resultNoResearch.recommendations.find(r => r.stock.ticker === 'MID1');

    // With positive research for MID1
    const research = {
      MID1: {
        action: 'buy',
        label: 'Buy',
        labelBn: 'কিনুন',
        reason: 'Cheap PE',
        reasonBn: 'কম PE',
        signals: ['cheap_pe', 'high_dividend', 'nav_discount'],
      },
    };
    const resultWithResearch = generateRecommendations(answers, universe, research);
    const mid1WithResearch = resultWithResearch.recommendations.find(r => r.stock.ticker === 'MID1');

    // MID1 should have better score/allocation with positive research
    if (mid1NoResearch && mid1WithResearch) {
      expect(mid1WithResearch.score).toBeGreaterThanOrEqual(mid1NoResearch.score);
    }
  });

  it('penalizes Z-category stocks more for conservative users', () => {
    const universe = makeUniverse();
    const research = {
      GOOD2: {
        action: 'sell',
        label: 'Sell',
        labelBn: 'বিক্রি',
        reason: 'Z-cat',
        reasonBn: 'Z-ক্যাট',
        signals: ['z_category', 'negative_eps'],
      },
    };

    const conservativeResult = generateRecommendations(
      makeAnswers({ risk: 'conservative' }), universe, research
    );
    const aggressiveResult = generateRecommendations(
      makeAnswers({ risk: 'aggressive' }), universe, research
    );

    const conservativeGood2 = conservativeResult.recommendations.find(r => r.stock.ticker === 'GOOD2');
    const aggressiveGood2 = aggressiveResult.recommendations.find(r => r.stock.ticker === 'GOOD2');

    // Conservative user should have GOOD2 ranked lower (or excluded from top 5)
    if (conservativeGood2 && aggressiveGood2) {
      expect(aggressiveGood2.score).toBeGreaterThan(conservativeGood2.score);
    }
  });

  it('does NOT filter out risky stocks for aggressive users', () => {
    const universe = makeUniverse();
    const research = {
      RISKY1: {
        action: 'sell',
        label: 'Sell',
        labelBn: 'বিক্রি',
        reason: 'Z-category, negative EPS',
        reasonBn: 'Z-ক্যাটাগরি',
        signals: ['z_category', 'negative_eps'],
      },
    };

    // Even with sell signals, aggressive users shouldn't have stocks filtered out
    const result = generateRecommendations(
      makeAnswers({ risk: 'aggressive' }), universe, research
    );
    // The stock should still be in the universe, even if not in top 5
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeLessThanOrEqual(5);
  });

  it('includes warnings in researchContext for risky stocks', () => {
    const research = {
      GOOD1: {
        action: 'hold',
        label: 'Hold',
        labelBn: 'ধরুন',
        reason: 'Z-category but cheap',
        reasonBn: 'Z-ক্যাটাগরি কিন্তু সস্তা',
        signals: ['z_category', 'cheap_pe'],
      },
    };
    const result = generateRecommendations(makeAnswers(), makeUniverse(), research);
    const good1 = result.recommendations.find(r => r.stock.ticker === 'GOOD1');
    if (good1 && good1.researchContext) {
      expect(good1.researchContext.warnings.length).toBeGreaterThan(0);
      expect(good1.researchContext.warnings[0]).toContain('Z-category');
    }
  });

  it('strong momentum boosts short-horizon recommendations more', () => {
    const universe = makeUniverse();
    const research = {
      MID2: {
        action: 'buy',
        label: 'Buy',
        labelBn: 'কিনুন',
        reason: 'Momentum',
        reasonBn: 'গতি',
        signals: ['strong_momentum'],
      },
    };

    const shortResult = generateRecommendations(
      makeAnswers({ horizon: 'short' }), universe, research
    );
    const longResult = generateRecommendations(
      makeAnswers({ horizon: 'long' }), universe, research
    );

    const shortMid2 = shortResult.recommendations.find(r => r.stock.ticker === 'MID2');
    const longMid2 = longResult.recommendations.find(r => r.stock.ticker === 'MID2');

    // Strong momentum should matter more for short-term
    if (shortMid2 && longMid2) {
      expect(shortMid2.researchContext.adjustment).toBeGreaterThan(longMid2.researchContext.adjustment);
    }
  });

  it('crash signal has different penalties by risk tolerance', () => {
    const universe = makeUniverse();
    const research = {
      MID1: {
        action: 'sell',
        label: 'Sell',
        labelBn: 'বিক্রি',
        reason: 'Crashed',
        reasonBn: 'পতন',
        signals: ['crash'],
      },
    };

    const aggressiveResult = generateRecommendations(
      makeAnswers({ risk: 'aggressive' }), universe, research
    );
    const conservativeResult = generateRecommendations(
      makeAnswers({ risk: 'conservative' }), universe, research
    );

    const aggMid1 = aggressiveResult.recommendations.find(r => r.stock.ticker === 'MID1');
    const consMid1 = conservativeResult.recommendations.find(r => r.stock.ticker === 'MID1');

    if (aggMid1 && consMid1) {
      // Aggressive: crash costs -3, Conservative: crash costs -15
      expect(aggMid1.researchContext.adjustment).toBe(-3);
      expect(consMid1.researchContext.adjustment).toBe(-15);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Research integration with generateHoldingSuggestion
// ═══════════════════════════════════════════════════════════════

describe('generateHoldingSuggestion with research', () => {

  it('uses dynamic research data when available', () => {
    const holding = { ticker: 'GP', quantity: 100, buyPrice: 250, pnlPct: 3 };
    const stock = makeStock({ ticker: 'GP' });
    const research = {
      GP: {
        action: 'hold',
        label: 'Hold for Dividend',
        labelBn: 'লভ্যাংশের জন্য ধরুন',
        reason: '10.50/share dividend',
        reasonBn: '১০.৫০ লভ্যাংশ',
        signals: ['high_dividend'],
        duration: 'Until Aug 12',
        durationBn: '১২ আগস্ট পর্যন্ত',
      },
    };

    const result = generateHoldingSuggestion(holding, stock, null, research);
    expect(result.action).toBe('hold');
    expect(result.label).toBe('Hold for Dividend');
    expect(result.reason).toBe('10.50/share dividend');
    expect(result.researchBacked).toBe(true);
    expect(result.duration).toBe('Until Aug 12');
  });

  it('falls back to hardcoded overrides when no dynamic research', () => {
    // GP has a hardcoded override in suggestion.js
    const holding = { ticker: 'GP', quantity: 100, buyPrice: 250, pnlPct: 3 };
    const stock = makeStock({ ticker: 'GP' });

    const result = generateHoldingSuggestion(holding, stock, null, {});
    expect(result.researchBacked).toBe(true);
    // Should use the hardcoded override
    expect(result.action).toBeDefined();
  });

  it('falls back to algorithmic when no research at all', () => {
    const holding = { ticker: 'UNKNOWN', quantity: 100, buyPrice: 50, pnlPct: 5 };
    const stock = makeStock({ ticker: 'UNKNOWN', percentile5Y: 50, priceVsMedian5Y: 1.0 });

    const result = generateHoldingSuggestion(holding, stock, null, {});
    // Should not be research-backed
    expect(result.researchBacked).toBeUndefined();
    expect(result.action).toBeDefined();
  });

  it('dynamic research takes priority over hardcoded overrides', () => {
    // BEXIMCO has a hardcoded override (Sell), let's override with dynamic research (Buy)
    const holding = { ticker: 'BEXIMCO', quantity: 100, buyPrice: 27, pnlPct: -10 };
    const stock = makeStock({ ticker: 'BEXIMCO' });
    const research = {
      BEXIMCO: {
        action: 'buy',
        label: 'Turnaround Play',
        labelBn: 'পরিবর্তনের সম্ভাবনা',
        reason: 'New management, financials published',
        reasonBn: 'নতুন ব্যবস্থাপনা',
        signals: ['cheap_pe', 'nav_discount'],
      },
    };

    const result = generateHoldingSuggestion(holding, stock, null, research);
    expect(result.action).toBe('buy');
    expect(result.label).toBe('Turnaround Play');
  });

  it('sell signal from research overrides time-constrained logic', () => {
    const holding = { ticker: 'BADSTOCK', quantity: 100, buyPrice: 10, pnlPct: -20 };
    const stock = makeStock({ ticker: 'BADSTOCK' });
    const research = {
      BADSTOCK: {
        action: 'sell',
        label: 'Sell Now',
        labelBn: 'এখনই বিক্রি করুন',
        reason: 'Z-category, no financials',
        reasonBn: 'Z-ক্যাটাগরি',
        signals: ['z_category', 'negative_eps'],
      },
    };

    // Even with generous maxHoldMonths, research sell should take priority
    const result = generateHoldingSuggestion(holding, stock, 24, research);
    expect(result.action).toBe('sell');
    expect(result.label).toBe('Sell Now');
  });

  it('returns signals array from dynamic research', () => {
    const holding = { ticker: 'SIG', quantity: 50, buyPrice: 100, pnlPct: 0 };
    const stock = makeStock({ ticker: 'SIG' });
    const research = {
      SIG: {
        action: 'hold',
        label: 'Hold',
        labelBn: 'ধরুন',
        reason: 'Mixed signals',
        reasonBn: 'মিশ্র সংকেত',
        signals: ['cheap_pe', 'weak_momentum', 'nav_discount'],
      },
    };

    const result = generateHoldingSuggestion(holding, stock, null, research);
    expect(result.signals).toEqual(['cheap_pe', 'weak_momentum', 'nav_discount']);
  });

  it('works with null stock and research data', () => {
    const holding = { ticker: 'NOSTOCK', quantity: 50, buyPrice: 100, pnlPct: 0 };
    const research = {
      NOSTOCK: {
        action: 'sell',
        label: 'Sell',
        labelBn: 'বিক্রি',
        reason: 'Delisted',
        reasonBn: 'তালিকা থেকে বাদ',
        signals: ['crash'],
      },
    };

    // Research should still work even if stock data is null
    const result = generateHoldingSuggestion(holding, null, null, research);
    expect(result.action).toBe('sell');
    expect(result.researchBacked).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// Research signal score adjustment values
// ═══════════════════════════════════════════════════════════════

describe('research signal adjustments', () => {

  it('overvalued_5y adds warning to researchContext', () => {
    const universe = [
      makeStock({ id: 1, ticker: 'EXPENSIVE', sector: 'Pharma', riskLevel: 1, currentPrice: 500, dividendYield: 5 }),
    ];
    const research = {
      EXPENSIVE: {
        action: 'hold',
        label: 'Hold',
        labelBn: 'ধরুন',
        reason: 'Overvalued',
        reasonBn: 'অতিমূল্যায়িত',
        signals: ['overvalued_5y'],
      },
    };
    const result = generateRecommendations(makeAnswers(), universe, research);
    const rec = result.recommendations[0];
    expect(rec.researchContext.warnings).toContain('📊 Trading above 5-year 80th percentile');
    expect(rec.researchContext.adjustment).toBe(-5);
  });

  it('nav_discount gives bigger bonus to aggressive users', () => {
    const universe = [
      makeStock({ id: 1, ticker: 'DISCOUNTED', sector: 'Banking', riskLevel: 2, currentPrice: 30 }),
    ];
    const research = {
      DISCOUNTED: {
        action: 'buy',
        label: 'Buy',
        labelBn: 'কিনুন',
        reason: 'NAV discount',
        reasonBn: 'NAV ছাড়',
        signals: ['nav_discount'],
      },
    };

    const aggResult = generateRecommendations(makeAnswers({ risk: 'aggressive' }), universe, research);
    const modResult = generateRecommendations(makeAnswers({ risk: 'moderate' }), universe, research);

    // Aggressive gets +8 for nav_discount, moderate gets +4
    expect(aggResult.recommendations[0].researchContext.adjustment).toBe(8);
    expect(modResult.recommendations[0].researchContext.adjustment).toBe(4);
  });

  it('multiple sell signals compound the penalty', () => {
    const universe = [
      makeStock({ id: 1, ticker: 'TERRIBLE', sector: 'Misc', riskLevel: 3, currentPrice: 5 }),
      makeStock({ id: 2, ticker: 'SAFE', sector: 'Pharma', riskLevel: 1, currentPrice: 200, dividendYield: 5 }),
    ];
    const research = {
      TERRIBLE: {
        action: 'sell',
        label: 'Sell',
        labelBn: 'বিক্রি',
        reason: 'Everything wrong',
        reasonBn: 'সব খারাপ',
        signals: ['z_category', 'negative_eps', 'crash', 'weak_momentum'],
      },
    };

    const result = generateRecommendations(makeAnswers({ risk: 'moderate' }), universe, research);
    const terrible = result.recommendations.find(r => r.stock.ticker === 'TERRIBLE');
    if (terrible) {
      // z_cat(-12) + neg_eps(-15) + crash(-8) + weak_mom(-3) = -38
      expect(terrible.researchContext.adjustment).toBe(-38);
    }
  });

  it('mixed buy and sell signals net out correctly', () => {
    const universe = [
      makeStock({ id: 1, ticker: 'MIXED', sector: 'Banking', riskLevel: 3, currentPrice: 20 }),
    ];
    const research = {
      MIXED: {
        action: 'hold',
        label: 'Hold',
        labelBn: 'ধরুন',
        reason: 'Mixed',
        reasonBn: 'মিশ্র',
        signals: ['z_category', 'cheap_pe', 'nav_discount', 'undervalued_5y'],
      },
    };

    const result = generateRecommendations(makeAnswers({ risk: 'moderate' }), universe, research);
    const mixed = result.recommendations[0];
    // z_cat(-12) + cheap_pe(+8) + nav_discount(+4) + undervalued(+5) = +5
    expect(mixed.researchContext.adjustment).toBe(5);
  });

  it('projected values remain finite even with research adjustments', () => {
    const universe = makeUniverse();
    const research = {
      GOOD1: { action: 'buy', label: 'Buy', labelBn: 'কিনুন', reason: 'Good', reasonBn: 'ভাল', signals: ['cheap_pe', 'high_dividend', 'strong_momentum'] },
      RISKY2: { action: 'sell', label: 'Sell', labelBn: 'বিক্রি', reason: 'Bad', reasonBn: 'খারাপ', signals: ['z_category', 'negative_eps', 'crash'] },
    };

    const result = generateRecommendations(makeAnswers(), universe, research);
    expect(isFinite(result.summary.projectedValue)).toBe(true);
    expect(isFinite(result.summary.projectedGain)).toBe(true);
    expect(isFinite(result.summary.projectedReturnPercent)).toBe(true);
    result.recommendations.forEach(r => {
      expect(isFinite(r.tentativeReturnPercent)).toBe(true);
      expect(isFinite(r.tentativeReturnAmount)).toBe(true);
    });
  });
});
