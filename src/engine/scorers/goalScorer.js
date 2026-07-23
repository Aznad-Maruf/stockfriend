import { computeMomentumScore } from './momentumScorer.js';

export function computeGoalScore(stock, goal) {
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
