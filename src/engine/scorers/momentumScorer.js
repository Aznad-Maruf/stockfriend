import { SCORING_WEIGHTS, MOMENTUM_THRESHOLDS } from '../constants.js';

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
export function computeMomentumScore(stock, mode) {
  const r1d = stock.return1d || 0;
  const r15d = stock.return15d || 0;
  const r1m = stock.return1m || 0;
  const r1y = stock.historicalReturn1Y || 0;

  if (mode === 'quick') {
    // Quick gains: reward strong recent uptrend
    let score = 0;

    // 15-day momentum (0-3 pts) — most actionable window
    if (r15d > MOMENTUM_THRESHOLDS.QUICK.R15D_1) score += 3;
    else if (r15d > MOMENTUM_THRESHOLDS.QUICK.R15D_2) score += 2.5;
    else if (r15d > MOMENTUM_THRESHOLDS.QUICK.R15D_3) score += 1.5;
    else if (r15d > MOMENTUM_THRESHOLDS.QUICK.R15D_4) score += 0.5;

    // 1-month momentum (0-2 pts)
    if (r1m > MOMENTUM_THRESHOLDS.QUICK.R1M_1) score += 2;
    else if (r1m > MOMENTUM_THRESHOLDS.QUICK.R1M_2) score += 1.5;
    else if (r1m > MOMENTUM_THRESHOLDS.QUICK.R1M_3) score += 1;
    else if (r1m > MOMENTUM_THRESHOLDS.QUICK.R1M_4) score += 0.5;

    // 1-year trend direction (0-2 pts) — is the long trend supporting?
    if (r1y > MOMENTUM_THRESHOLDS.QUICK.R1Y_1) score += 2;
    else if (r1y > MOMENTUM_THRESHOLDS.QUICK.R1Y_2) score += 1;
    else if (r1y > MOMENTUM_THRESHOLDS.QUICK.R1Y_3) score += 0.5;
    // Negative 1Y with positive short-term = potential reversal, neutral

    return Math.min(SCORING_WEIGHTS.MOMENTUM_QUICK, score);
  }

  if (mode === 'short') {
    // Short horizon: balanced momentum check
    let score = 0;

    // 15-day trend (0-3 pts)
    if (r15d > MOMENTUM_THRESHOLDS.SHORT.R15D_1) score += 3;
    else if (r15d > MOMENTUM_THRESHOLDS.SHORT.R15D_2) score += 2;
    else if (r15d > MOMENTUM_THRESHOLDS.SHORT.R15D_3) score += 1;

    // 1-month trend (0-2 pts)
    if (r1m > MOMENTUM_THRESHOLDS.SHORT.R1M_1) score += 2;
    else if (r1m > MOMENTUM_THRESHOLDS.SHORT.R1M_2) score += 1;
    else if (r1m > MOMENTUM_THRESHOLDS.SHORT.R1M_3) score += 0.5;

    // Penalize sharp recent declines
    if (r15d < MOMENTUM_THRESHOLDS.SHORT.R15D_PENALTY) score -= 1;
    if (r1m < MOMENTUM_THRESHOLDS.SHORT.R1M_PENALTY) score -= 1;

    // Consistent uptrend bonus: all three positive = +1
    if (r1d > 0 && r15d > 0 && r1m > 0) score += 1;

    return Math.max(0, Math.min(SCORING_WEIGHTS.MOMENTUM_SHORT, score));
  }

  if (mode === 'medium') {
    // Medium horizon: light momentum influence
    let score = 0;
    if (r1m > MOMENTUM_THRESHOLDS.MEDIUM.R1M_1) score += 1.5;
    else if (r1m > MOMENTUM_THRESHOLDS.MEDIUM.R1M_2) score += 0.5;
    if (r1y > MOMENTUM_THRESHOLDS.MEDIUM.R1Y_1) score += 1.5;
    else if (r1y > MOMENTUM_THRESHOLDS.MEDIUM.R1Y_2) score += 0.5;
    if (r1m < MOMENTUM_THRESHOLDS.MEDIUM.R1M_PENALTY) score -= 1;
    return Math.max(0, Math.min(SCORING_WEIGHTS.MOMENTUM_MEDIUM, score));
  }

  // Long horizon: momentum is mostly noise, but extreme trends get a nod
  if (r1y > MOMENTUM_THRESHOLDS.LONG.R1Y_1) return 2;
  if (r1y > MOMENTUM_THRESHOLDS.LONG.R1Y_2) return 1;
  return 0;
}
