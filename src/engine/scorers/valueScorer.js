import { VALUE_THRESHOLDS, SCORING_WEIGHTS } from '../constants.js';

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
export function computeValueScore(stock) {
  let score = 0;

  // Factor 1: Percentile position in 5Y history (0-8 pts)
  // percentile5Y: 0 = at 5Y low (cheapest ever), 100 = at 5Y high (most expensive)
  if (stock.percentile5Y != null && stock.percentile5Y > 0) {
    if (stock.percentile5Y <= VALUE_THRESHOLDS.PERCENTILE.DEEP) {
      score += 8;  // Bottom 15% of 5Y — deep value
    } else if (stock.percentile5Y <= VALUE_THRESHOLDS.PERCENTILE.GOOD) {
      score += 6;  // Bottom 30% — good value
    } else if (stock.percentile5Y <= VALUE_THRESHOLDS.PERCENTILE.FAIR) {
      score += 4;  // Below median — fair value
    } else if (stock.percentile5Y <= VALUE_THRESHOLDS.PERCENTILE.NEUTRAL) {
      score += 1;  // Slightly above median — neutral
    }
    // >70 percentile: 0 points — historically expensive
  }

  // Factor 2: Z-score from 5Y mean (0-6 pts)
  // Negative z-score means price is below the historical mean
  if (stock.zScore5Y != null) {
    if (stock.zScore5Y <= VALUE_THRESHOLDS.Z_SCORE.EXTREME) {
      score += 6;  // >2 std devs below mean — extreme value
    } else if (stock.zScore5Y <= VALUE_THRESHOLDS.Z_SCORE.GOOD) {
      score += 4;  // 1-2 std devs below — good value
    } else if (stock.zScore5Y <= VALUE_THRESHOLDS.Z_SCORE.SLIGHT) {
      score += 2;  // Slightly below mean
    } else if (stock.zScore5Y <= VALUE_THRESHOLDS.Z_SCORE.FAIR) {
      score += 1;  // Near the mean — fair
    }
    // >0.3: 0 points — above mean, not cheap
  }

  // Factor 3: Price vs 5Y median ratio (0-6 pts)
  if (stock.priceVsMedian5Y != null && stock.priceVsMedian5Y > 0) {
    if (stock.priceVsMedian5Y <= VALUE_THRESHOLDS.PRICE_VS_MEDIAN.EXTREME) {
      score += 6;  // Trading at <50% of 5Y median — extreme discount
    } else if (stock.priceVsMedian5Y <= VALUE_THRESHOLDS.PRICE_VS_MEDIAN.GOOD) {
      score += 5;  // 30%+ below median
    } else if (stock.priceVsMedian5Y <= VALUE_THRESHOLDS.PRICE_VS_MEDIAN.FAIR) {
      score += 3;  // 15-30% below median
    } else if (stock.priceVsMedian5Y <= VALUE_THRESHOLDS.PRICE_VS_MEDIAN.SLIGHT) {
      score += 2;  // 5-15% below median
    } else if (stock.priceVsMedian5Y <= VALUE_THRESHOLDS.PRICE_VS_MEDIAN.NEAR) {
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
    if (position >= VALUE_THRESHOLDS.RANGE.NEAR_LOW) {
      score += 5;  // Near 52W low
    } else if (position >= VALUE_THRESHOLDS.RANGE.LOWER_HALF) {
      score += 3;  // Lower half of 52W range
    } else if (position >= VALUE_THRESHOLDS.RANGE.MIDDLE) {
      score += 1;  // Middle of range
    }
  }

  return Math.min(SCORING_WEIGHTS.VALUE, score);
}
