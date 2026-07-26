import { generateRationale } from './rationale.js';
import { ALLOCATION_TIERS, THRESHOLDS } from './constants.js';
import { horizonToDays, horizonToCategory } from '../utils/horizonUtils.js';

export function seedFromTicker(ticker) {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = (hash * 31 + ticker.charCodeAt(i)) | 0;
  }
  return hash;
}

export function seededAdjustment(ticker) {
  const hash = Math.abs(seedFromTicker(ticker));
  const normalized = (hash % 2001) / 1000 - 1;
  return normalized * 0.1;
}

export function buildRecommendations(top5, answers, research = {}) {
  const totalScore = top5.reduce((sum, item) => sum + item.totalScore, 0);

  const rawAllocations = top5.map((item) => ({
    ...item,
    rawPercent: totalScore > 0 ? (item.totalScore / totalScore) * 100 : ALLOCATION_TIERS.DEFAULT_PERCENT,
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

  return allocations.map((item) => {
    const allocationAmount = Math.round(
      (item.allocationPercent / 100) * answers.budget
    );

    const days = horizonToDays(answers.horizon);
    let baseReturn;
    if (days <= 365) {
      // Scale 1Y return proportionally to holding period
      baseReturn = item.stock.historicalReturn1Y * (days / 365);
    } else if (days <= 1095) {
      // Interpolate between 1Y and 3Y returns
      const t = (days - 365) / (1095 - 365);
      baseReturn = item.stock.historicalReturn1Y + t * (item.stock.historicalReturn3Y - item.stock.historicalReturn1Y);
    } else {
      // Interpolate between 3Y and 5Y returns
      const t = Math.min((days - 1095) / (1825 - 1095), 1);
      baseReturn = item.stock.historicalReturn3Y + t * (item.stock.historicalReturn5Y - item.stock.historicalReturn3Y);
    }

    // Mean-reversion based return estimate
    // If stock is below its 5Y median, estimate recovery toward median
    let meanReversionReturn = 0;
    if (item.stock.priceVsMedian5Y && item.stock.priceVsMedian5Y < 1.0 && item.stock.median5Y) {
      // How far below median (as % of current price)
      const gapToMedian = ((item.stock.median5Y - item.stock.currentPrice) / item.stock.currentPrice) * 100;
      // Assume partial reversion depending on horizon
      let reversionFactor;
      if (days <= 365) {
        reversionFactor = 0.15 * (days / 365);
      } else if (days <= 1095) {
        const t = (days - 365) / (1095 - 365);
        reversionFactor = 0.15 + t * (0.4 - 0.15);
      } else {
        const t = Math.min((days - 1095) / (1825 - 1095), 1);
        reversionFactor = 0.4 + t * (0.7 - 0.4);
      }
      meanReversionReturn = Math.min(THRESHOLDS.MAX_MEAN_REVERSION_PCT, Math.max(0, gapToMedian * reversionFactor));
    }

    const adjustment = seededAdjustment(item.stock.ticker);
    const rawReturn = baseReturn * (1 + adjustment) + meanReversionReturn;
    const tentativeReturnPercent =
      Math.round(Math.max(THRESHOLDS.MIN_RETURN_PCT, Math.min(THRESHOLDS.MAX_RETURN_PCT, isFinite(rawReturn) ? rawReturn : 0)) * 10) / 10;
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
      researchContext: item.researchContext || null,
    };
  });
}
