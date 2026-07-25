import { generateRationale } from './rationale.js';
import { ALLOCATION_TIERS } from './constants.js';

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
      meanReversionReturn = Math.min(100, Math.max(0, gapToMedian * reversionFactor));
    }

    const adjustment = seededAdjustment(item.stock.ticker);
    const rawReturn = baseReturn * (1 + adjustment) + meanReversionReturn;
    const tentativeReturnPercent =
      Math.round(Math.max(-99, Math.min(500, isFinite(rawReturn) ? rawReturn : 0)) * 10) / 10;
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
