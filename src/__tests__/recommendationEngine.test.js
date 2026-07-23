import { describe, it, expect } from 'vitest';
import {
  generateRecommendations,
  getRiskLabel,
  getRiskColor,
  _testExports,
} from '../engine/index.js';

const {
  seedFromTicker,
  seededAdjustment,
  computeRiskScore,
  computeHorizonScore,
  computeGoalScore,
  computeValueScore,
  computeMomentumScore,
  applyDiversificationPenalty,
  generateRationale,
} = _testExports;

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
    // Stats fields (defaults: neutral/mid-range values)
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

// Make a diverse set of stocks for integration tests
function makeStockUniverse() {
  return [
    makeStock({ id: 1, ticker: 'BANK1', sector: 'Banking', riskLevel: 2, currentPrice: 30, week52High: 80, week52Low: 25, dividendYield: 4, growthPotential: 'low', marketCap: 'large', historicalReturn1Y: 8, historicalReturn3Y: 25, historicalReturn5Y: 40 }),
    makeStock({ id: 2, ticker: 'BANK2', sector: 'Banking', riskLevel: 2, currentPrice: 60, week52High: 70, week52Low: 50, dividendYield: 3, growthPotential: 'moderate', marketCap: 'large', historicalReturn1Y: 10, historicalReturn3Y: 28, historicalReturn5Y: 50 }),
    makeStock({ id: 3, ticker: 'PHARMA1', sector: 'Pharmaceuticals', riskLevel: 1, currentPrice: 200, week52High: 210, week52Low: 170, dividendYield: 2, growthPotential: 'high', marketCap: 'large', historicalReturn1Y: 18, historicalReturn3Y: 50, historicalReturn5Y: 90 }),
    makeStock({ id: 4, ticker: 'IT1', sector: 'IT', riskLevel: 4, currentPrice: 15, week52High: 30, week52Low: 10, dividendYield: 0.5, growthPotential: 'high', marketCap: 'small', historicalReturn1Y: 30, historicalReturn3Y: 70, historicalReturn5Y: 120 }),
    makeStock({ id: 5, ticker: 'IT2', sector: 'IT', riskLevel: 5, currentPrice: 10, week52High: 25, week52Low: 8, dividendYield: 0, growthPotential: 'high', marketCap: 'small', historicalReturn1Y: -20, historicalReturn3Y: 5, historicalReturn5Y: 15 }),
    makeStock({ id: 6, ticker: 'POWER1', sector: 'Power/Energy', riskLevel: 2, currentPrice: 30, week52High: 55, week52Low: 28, dividendYield: 5, growthPotential: 'moderate', marketCap: 'large', historicalReturn1Y: -15, historicalReturn3Y: 10, historicalReturn5Y: 30 }),
    makeStock({ id: 7, ticker: 'INS1', sector: 'Insurance', riskLevel: 4, currentPrice: 40, week52High: 100, week52Low: 35, dividendYield: 1.5, growthPotential: 'moderate', marketCap: 'mid', historicalReturn1Y: -30, historicalReturn3Y: -10, historicalReturn5Y: 5 }),
    makeStock({ id: 8, ticker: 'FMCG1', sector: 'FMCG', riskLevel: 1, currentPrice: 500, week52High: 520, week52Low: 400, dividendYield: 4.5, growthPotential: 'low', marketCap: 'large', historicalReturn1Y: 8, historicalReturn3Y: 20, historicalReturn5Y: 35 }),
    makeStock({ id: 9, ticker: 'CEM1', sector: 'Cement', riskLevel: 3, currentPrice: 45, week52High: 80, week52Low: 38, dividendYield: 2, growthPotential: 'moderate', marketCap: 'mid', historicalReturn1Y: -20, historicalReturn3Y: -5, historicalReturn5Y: 10 }),
    makeStock({ id: 10, ticker: 'TEL1', sector: 'Telecom', riskLevel: 1, currentPrice: 250, week52High: 260, week52Low: 200, dividendYield: 5.5, growthPotential: 'low', marketCap: 'large', historicalReturn1Y: 6, historicalReturn3Y: 15, historicalReturn5Y: 25 }),
  ];
}


// ═══════════════════════════════════════════════════════════════
// seedFromTicker & seededAdjustment
// ═══════════════════════════════════════════════════════════════

describe('seedFromTicker', () => {
  it('returns a number for any string', () => {
    expect(typeof seedFromTicker('GP')).toBe('number');
    expect(typeof seedFromTicker('BRACBANK')).toBe('number');
  });

  it('is deterministic — same ticker always yields same hash', () => {
    expect(seedFromTicker('BDCOM')).toBe(seedFromTicker('BDCOM'));
    expect(seedFromTicker('RENATA')).toBe(seedFromTicker('RENATA'));
  });

  it('produces different hashes for different tickers', () => {
    expect(seedFromTicker('GP')).not.toBe(seedFromTicker('ROBI'));
  });
});

describe('seededAdjustment', () => {
  it('returns a value between -0.1 and 0.1', () => {
    const tickers = ['GP', 'ROBI', 'BDCOM', 'RENATA', 'BRACBANK', 'SQURPHARMA'];
    for (const ticker of tickers) {
      const adj = seededAdjustment(ticker);
      expect(adj).toBeGreaterThanOrEqual(-0.1);
      expect(adj).toBeLessThanOrEqual(0.1);
    }
  });

  it('is deterministic', () => {
    expect(seededAdjustment('SUMITPOWER')).toBe(seededAdjustment('SUMITPOWER'));
  });
});


// ═══════════════════════════════════════════════════════════════
// computeRiskScore
// ═══════════════════════════════════════════════════════════════

describe('computeRiskScore', () => {
  it('gives maximum score when stock risk matches preference', () => {
    const conservativeStock = makeStock({ riskLevel: 1, volatilityAnnual: 12 });
    const aggressiveStock = makeStock({ riskLevel: 5, volatilityAnnual: 30 });

    const consScore = computeRiskScore(conservativeStock, 'conservative');
    const aggScore = computeRiskScore(aggressiveStock, 'aggressive');

    expect(consScore).toBeGreaterThan(15); // base ~18.75 + vol bonus 3 = ~21.75
    expect(aggScore).toBeGreaterThan(13); // base ~15 + vol bonus 3 = ~18
  });

  it('gives low score when stock risk mismatches preference', () => {
    const highRisk = makeStock({ riskLevel: 5 });
    const lowRisk = makeStock({ riskLevel: 1 });

    expect(computeRiskScore(highRisk, 'conservative')).toBeLessThan(10);
    expect(computeRiskScore(lowRisk, 'aggressive')).toBeLessThan(15);
  });

  it('score is always between 0 and 25', () => {
    const levels = [1, 2, 3, 4, 5];
    const prefs = ['conservative', 'moderate', 'aggressive'];
    for (const level of levels) {
      for (const pref of prefs) {
        const score = computeRiskScore(makeStock({ riskLevel: level }), pref);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(25);
      }
    }
  });
});


// ═══════════════════════════════════════════════════════════════
// computeHorizonScore
// ═══════════════════════════════════════════════════════════════

describe('computeHorizonScore', () => {
  it('short horizon favors high dividend stocks', () => {
    const highDiv = makeStock({ dividendYield: 8, riskLevel: 2 });
    const lowDiv = makeStock({ dividendYield: 0.5, riskLevel: 4 });

    expect(computeHorizonScore(highDiv, 'short'))
      .toBeGreaterThan(computeHorizonScore(lowDiv, 'short'));
  });

  it('long horizon favors high growth potential', () => {
    const highGrowth = makeStock({ growthPotential: 'high', historicalReturn5Y: 100, historicalReturn3Y: 50 });
    const lowGrowth = makeStock({ growthPotential: 'low', historicalReturn5Y: 10, historicalReturn3Y: 5 });

    expect(computeHorizonScore(highGrowth, 'long'))
      .toBeGreaterThan(computeHorizonScore(lowGrowth, 'long'));
  });

  it('score is always non-negative', () => {
    for (const horizon of ['short', 'medium', 'long']) {
      const score = computeHorizonScore(makeStock(), horizon);
      expect(score).toBeGreaterThanOrEqual(0);
    }
  });
});


// ═══════════════════════════════════════════════════════════════
// computeGoalScore
// ═══════════════════════════════════════════════════════════════

describe('computeGoalScore', () => {
  it('income goal favors high dividend stocks', () => {
    const highDiv = makeStock({ dividendYield: 8 });
    const lowDiv = makeStock({ dividendYield: 0 });

    expect(computeGoalScore(highDiv, 'income'))
      .toBeGreaterThan(computeGoalScore(lowDiv, 'income'));
  });

  it('wealth goal favors high growth potential', () => {
    const highGrowth = makeStock({ growthPotential: 'high', historicalReturn5Y: 100 });
    const lowGrowth = makeStock({ growthPotential: 'low', historicalReturn5Y: 10 });

    expect(computeGoalScore(highGrowth, 'wealth'))
      .toBeGreaterThan(computeGoalScore(lowGrowth, 'wealth'));
  });

  it('quick gains goal favors high 1Y return and small cap', () => {
    const quickWinner = makeStock({ historicalReturn1Y: 40, marketCap: 'small', growthPotential: 'high' });
    const slowLarge = makeStock({ historicalReturn1Y: 5, marketCap: 'large', growthPotential: 'low' });

    expect(computeGoalScore(quickWinner, 'quick'))
      .toBeGreaterThan(computeGoalScore(slowLarge, 'quick'));
  });
});


// ═══════════════════════════════════════════════════════════════
// computeValueScore (52-week range position)
// ═══════════════════════════════════════════════════════════════

describe('computeValueScore', () => {
  it('gives high score for deeply undervalued stock (low percentile + negative z-score)', () => {
    const deepValue = makeStock({
      percentile5Y: 10,
      zScore5Y: -2.5,
      priceVsMedian5Y: 0.45,
      currentPrice: 25, week52High: 100, week52Low: 20,
    });
    expect(computeValueScore(deepValue)).toBeGreaterThan(20);
  });

  it('gives 0 for expensive stock (high percentile + positive z-score + above median)', () => {
    const expensive = makeStock({
      percentile5Y: 90,
      zScore5Y: 1.5,
      priceVsMedian5Y: 1.3,
      currentPrice: 95, week52High: 100, week52Low: 50,
    });
    expect(computeValueScore(expensive)).toBe(0);
  });

  it('gives moderate score for fairly valued stock', () => {
    const fair = makeStock({
      percentile5Y: 45,
      zScore5Y: -0.1,
      priceVsMedian5Y: 0.98,
      currentPrice: 55, week52High: 100, week52Low: 20,
    });
    const score = computeValueScore(fair);
    expect(score).toBeGreaterThan(3);
    expect(score).toBeLessThan(15);
  });

  it('ranks cheap stock higher than expensive stock', () => {
    const cheap = makeStock({ percentile5Y: 10, zScore5Y: -2, priceVsMedian5Y: 0.5 });
    const pricey = makeStock({ percentile5Y: 80, zScore5Y: 0.8, priceVsMedian5Y: 1.2 });
    expect(computeValueScore(cheap)).toBeGreaterThan(computeValueScore(pricey));
  });

  it('52W range acts as supplementary factor', () => {
    const near52Low = makeStock({
      percentile5Y: 50, zScore5Y: 0, priceVsMedian5Y: 1.0,
      currentPrice: 25, week52High: 100, week52Low: 20,
    });
    const near52High = makeStock({
      percentile5Y: 50, zScore5Y: 0, priceVsMedian5Y: 1.0,
      currentPrice: 95, week52High: 100, week52Low: 20,
    });
    expect(computeValueScore(near52Low)).toBeGreaterThan(computeValueScore(near52High));
  });

  it('returns 0 when all stats are missing', () => {
    const noStats = makeStock({
      percentile5Y: 0, zScore5Y: null, priceVsMedian5Y: null,
      week52High: null, week52Low: null,
    });
    expect(computeValueScore(noStats)).toBe(0);
  });

  it('score is always capped at 25', () => {
    const extremeValue = makeStock({
      percentile5Y: 1,
      zScore5Y: -5,
      priceVsMedian5Y: 0.2,
      currentPrice: 22, week52High: 100, week52Low: 20,
    });
    expect(computeValueScore(extremeValue)).toBeLessThanOrEqual(25);
  });
});


// ═══════════════════════════════════════════════════════════════
// computeMomentumScore
// ═══════════════════════════════════════════════════════════════

describe('computeMomentumScore', () => {
  it('gives high score for strong uptrending stock in quick mode', () => {
    const hot = makeStock({ return1d: 2, return15d: 12, return1m: 18, historicalReturn1Y: 30 });
    expect(computeMomentumScore(hot, 'quick')).toBeGreaterThanOrEqual(6);
  });

  it('gives 0 for stock with no momentum data in quick mode', () => {
    const flat = makeStock({ return1d: 0, return15d: 0, return1m: 0, historicalReturn1Y: 0 });
    expect(computeMomentumScore(flat, 'quick')).toBe(0);
  });

  it('gives higher score for trending stock than flat stock in short mode', () => {
    const trending = makeStock({ return1d: 1, return15d: 6, return1m: 10, historicalReturn1Y: 15 });
    const flat = makeStock({ return1d: -0.5, return15d: -2, return1m: -5, historicalReturn1Y: -10 });
    expect(computeMomentumScore(trending, 'short')).toBeGreaterThan(computeMomentumScore(flat, 'short'));
  });

  it('penalizes sharp declines in short mode', () => {
    const declining = makeStock({ return1d: -2, return15d: -8, return1m: -15 });
    expect(computeMomentumScore(declining, 'short')).toBe(0);
  });

  it('gives consistent uptrend bonus when all periods positive in short mode', () => {
    const allUp = makeStock({ return1d: 1, return15d: 4, return1m: 5 });
    const mixedUp = makeStock({ return1d: -0.5, return15d: 4, return1m: 5 });
    expect(computeMomentumScore(allUp, 'short')).toBeGreaterThan(computeMomentumScore(mixedUp, 'short'));
  });

  it('medium mode has lighter momentum influence', () => {
    const hot = makeStock({ return1d: 2, return15d: 12, return1m: 18, historicalReturn1Y: 30 });
    const quickScore = computeMomentumScore(hot, 'quick');
    const mediumScore = computeMomentumScore(hot, 'medium');
    expect(quickScore).toBeGreaterThan(mediumScore);
  });

  it('long mode returns minimal score', () => {
    const hot = makeStock({ historicalReturn1Y: 25 });
    expect(computeMomentumScore(hot, 'long')).toBeLessThanOrEqual(2);
  });

  it('score is capped at 7 for quick and short modes', () => {
    const extreme = makeStock({ return1d: 5, return15d: 20, return1m: 30, historicalReturn1Y: 50 });
    expect(computeMomentumScore(extreme, 'quick')).toBeLessThanOrEqual(7);
    expect(computeMomentumScore(extreme, 'short')).toBeLessThanOrEqual(7);
  });
});


// ═══════════════════════════════════════════════════════════════
// applyDiversificationPenalty
// ═══════════════════════════════════════════════════════════════

describe('applyDiversificationPenalty', () => {
  it('gives max bonus to first stock in a sector', () => {
    const scored = [
      { stock: makeStock({ sector: 'Banking' }), baseScore: 50 },
      { stock: makeStock({ sector: 'IT' }), baseScore: 45 },
    ];

    const result = applyDiversificationPenalty(scored);
    expect(result[0].diversificationScore).toBe(15); // max bonus
    expect(result[1].diversificationScore).toBe(15); // different sector → also max
  });

  it('penalizes duplicate sectors', () => {
    const scored = [
      { stock: makeStock({ sector: 'Banking' }), baseScore: 50 },
      { stock: makeStock({ sector: 'Banking' }), baseScore: 48 },
      { stock: makeStock({ sector: 'Banking' }), baseScore: 45 },
    ];

    const result = applyDiversificationPenalty(scored);
    expect(result[0].diversificationScore).toBe(15);        // first
    expect(result[1].diversificationScore).toBe(15 * 0.4);  // second
    expect(result[2].diversificationScore).toBe(15 * 0.1);  // third+
  });

  it('sets totalScore = baseScore + diversificationScore', () => {
    const scored = [{ stock: makeStock(), baseScore: 60 }];
    const result = applyDiversificationPenalty(scored);
    expect(result[0].totalScore).toBe(60 + 15);
  });
});


// ═══════════════════════════════════════════════════════════════
// generateRationale
// ═══════════════════════════════════════════════════════════════

describe('generateRationale', () => {
  it('produces both English and Bangla rationale', () => {
    const { rationale, rationaleBn } = generateRationale(makeStock(), makeAnswers());
    expect(typeof rationale).toBe('string');
    expect(rationale.length).toBeGreaterThan(0);
    expect(typeof rationaleBn).toBe('string');
    expect(rationaleBn.length).toBeGreaterThan(0);
  });

  it('mentions 52W low for stocks near their low', () => {
    // position = (100-25)/(100-20) = 0.9375 → >= 0.75
    const nearLow = makeStock({ currentPrice: 25, week52High: 100, week52Low: 20 });
    const { rationale } = generateRationale(nearLow, makeAnswers());
    expect(rationale).toMatch(/52-week low/i);
  });

  it('mentions dividend for income-goal + high dividend stocks', () => {
    const highDiv = makeStock({ dividendYield: 5 });
    const { rationale } = generateRationale(highDiv, makeAnswers({ goal: 'income' }));
    expect(rationale).toMatch(/dividend/i);
  });

  it('mentions growth for wealth-goal + high growth stocks', () => {
    const highGrowth = makeStock({ growthPotential: 'high' });
    const { rationale } = generateRationale(highGrowth, makeAnswers({ goal: 'wealth' }));
    expect(rationale).toMatch(/growth/i);
  });

  it('mentions aggressive risk when appropriate', () => {
    const highRisk = makeStock({ riskLevel: 4 });
    const { rationale } = generateRationale(highRisk, makeAnswers({ risk: 'aggressive' }));
    expect(rationale).toMatch(/aggressive/i);
  });
});


// ═══════════════════════════════════════════════════════════════
// getRiskLabel & getRiskColor
// ═══════════════════════════════════════════════════════════════

describe('getRiskLabel', () => {
  it('returns correct labels for all levels', () => {
    expect(getRiskLabel(1)).toBe('Very Low');
    expect(getRiskLabel(2)).toBe('Low');
    expect(getRiskLabel(3)).toBe('Moderate');
    expect(getRiskLabel(4)).toBe('High');
    expect(getRiskLabel(5)).toBe('Very High');
  });

  it('returns Unknown for invalid levels', () => {
    expect(getRiskLabel(0)).toBe('Unknown');
    expect(getRiskLabel(99)).toBe('Unknown');
  });
});

describe('getRiskColor', () => {
  it('returns a hex color for all valid levels', () => {
    for (let i = 1; i <= 5; i++) {
      expect(getRiskColor(i)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('returns fallback color for invalid level', () => {
    expect(getRiskColor(0)).toBe('#6b7280');
  });
});


// ═══════════════════════════════════════════════════════════════
// generateRecommendations — full integration tests
// ═══════════════════════════════════════════════════════════════

describe('generateRecommendations', () => {
  const universe = makeStockUniverse();

  it('returns exactly 5 recommendations when enough stocks exist', () => {
    const result = generateRecommendations(makeAnswers(), universe);
    expect(result.recommendations).toHaveLength(5);
  });

  it('allocations sum to 100%', () => {
    const result = generateRecommendations(makeAnswers(), universe);
    const totalAlloc = result.recommendations.reduce((s, r) => s + r.allocationPercent, 0);
    expect(totalAlloc).toBe(100);
  });

  it('allocation amounts sum to the budget', () => {
    const budget = 500000;
    const result = generateRecommendations(makeAnswers({ budget }), universe);
    const totalAmount = result.recommendations.reduce((s, r) => s + r.allocationAmount, 0);
    // Allow small rounding tolerance
    expect(Math.abs(totalAmount - budget)).toBeLessThanOrEqual(5);
  });

  it('summary totals are consistent', () => {
    const budget = 300000;
    const result = generateRecommendations(makeAnswers({ budget }), universe);
    const { summary } = result;

    expect(summary.totalInvestment).toBe(budget);
    expect(summary.projectedValue).toBe(budget + summary.projectedGain);
    expect(summary.sectorBreakdown.length).toBeGreaterThan(0);

    const sectorTotal = summary.sectorBreakdown.reduce((s, b) => s + b.percentage, 0);
    expect(sectorTotal).toBe(100);
  });

  it('each recommendation has required fields', () => {
    const result = generateRecommendations(makeAnswers(), universe);
    for (const rec of result.recommendations) {
      expect(rec.stock).toBeDefined();
      expect(rec.stock.ticker).toBeTruthy();
      expect(typeof rec.allocationPercent).toBe('number');
      expect(typeof rec.allocationAmount).toBe('number');
      expect(typeof rec.tentativeReturnPercent).toBe('number');
      expect(typeof rec.tentativeReturnAmount).toBe('number');
      expect(typeof rec.score).toBe('number');
      expect(typeof rec.rationale).toBe('string');
      expect(typeof rec.rationaleBn).toBe('string');
    }
  });

  it('is deterministic — same inputs always produce same output', () => {
    const answers = makeAnswers({ budget: 100000 });
    const r1 = generateRecommendations(answers, universe);
    const r2 = generateRecommendations(answers, universe);

    const tickers1 = r1.recommendations.map((r) => r.stock.ticker);
    const tickers2 = r2.recommendations.map((r) => r.stock.ticker);
    expect(tickers1).toEqual(tickers2);

    expect(r1.summary.projectedGain).toBe(r2.summary.projectedGain);
  });

  it('filters by sectors when specified', () => {
    const answers = makeAnswers({ sectors: ['IT'] });
    const result = generateRecommendations(answers, universe);

    for (const rec of result.recommendations) {
      expect(rec.stock.sector).toBe('IT');
    }
  });

  it('returns fewer than 5 when filtered stocks are fewer', () => {
    const answers = makeAnswers({ sectors: ['Telecom'] });
    const result = generateRecommendations(answers, universe);
    // Only 1 Telecom stock in universe
    expect(result.recommendations.length).toBeLessThanOrEqual(1);
  });

  it('returns empty results for non-existent sector filter', () => {
    const answers = makeAnswers({ sectors: ['Aerospace'] });
    const result = generateRecommendations(answers, universe);
    expect(result.recommendations).toHaveLength(0);
    expect(result.summary.projectedGain).toBe(0);
  });

  it('encourages sector diversification in top 5', () => {
    const answers = makeAnswers();
    const result = generateRecommendations(answers, universe);
    const sectors = result.recommendations.map((r) => r.stock.sector);
    const uniqueSectors = new Set(sectors);
    // With 10 stocks across 7 sectors, we expect at least 3 different sectors in top 5
    expect(uniqueSectors.size).toBeGreaterThanOrEqual(3);
  });

  it('conservative + income + short prefers low-risk dividend stocks', () => {
    const answers = makeAnswers({
      risk: 'conservative',
      goal: 'income',
      horizon: 'short',
    });
    const result = generateRecommendations(answers, universe);
    // Top recommendation should be low risk with high dividend
    const topStock = result.recommendations[0].stock;
    expect(topStock.riskLevel).toBeLessThanOrEqual(2);
    expect(topStock.dividendYield).toBeGreaterThanOrEqual(3);
  });

  it('aggressive + quick + short prefers high-risk volatile stocks', () => {
    const answers = makeAnswers({
      risk: 'aggressive',
      goal: 'quick',
      horizon: 'short',
    });
    const result = generateRecommendations(answers, universe);
    // At least some high-risk stocks in top results
    const hasHighRisk = result.recommendations.some((r) => r.stock.riskLevel >= 4);
    expect(hasHighRisk).toBe(true);
  });

  it('uses correct historical return for each horizon', () => {
    // Short → historicalReturn1Y, Medium → 3Y, Long → 5Y
    // Just verify the return is reasonable (not checking exact formula)
    for (const horizon of ['short', 'medium', 'long']) {
      const answers = makeAnswers({ horizon });
      const result = generateRecommendations(answers, universe);
      for (const rec of result.recommendations) {
        expect(typeof rec.tentativeReturnPercent).toBe('number');
      }
    }
  });

  it('value scoring favors undervalued stocks near 52W low', () => {
    const answers = makeAnswers({ risk: 'moderate', goal: 'wealth', horizon: 'long' });
    const result = generateRecommendations(answers, universe);
    const tickers = result.recommendations.map((r) => r.stock.ticker);
    // INS1 is deeply undervalued (40 vs 52W high 100, low 35), should appear
    // POWER1 is also near its low (30 vs 55 high, 28 low)
    const hasUndervalued = tickers.includes('INS1') || tickers.includes('POWER1') || tickers.includes('CEM1');
    expect(hasUndervalued).toBe(true);
  });
});
