import { DIVERSIFICATION } from './constants.js';

export function applyDiversificationPenalty(scoredStocks) {
  const sectorCounts = {};

  return scoredStocks.map((item) => {
    const sector = item.stock.sector;
    const count = sectorCounts[sector] || 0;
    sectorCounts[sector] = count + 1;

    let bonus;
    if (count === 0) {
      bonus = DIVERSIFICATION.MAX_BONUS;
    } else if (count === 1) {
      bonus = DIVERSIFICATION.MAX_BONUS * DIVERSIFICATION.COUNT_1_MULT;
    } else {
      bonus = DIVERSIFICATION.MAX_BONUS * DIVERSIFICATION.COUNT_MORE_MULT;
    }

    return {
      ...item,
      diversificationScore: bonus,
      totalScore: item.baseScore + bonus,
    };
  });
}
