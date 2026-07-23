import { computeMomentumScore } from './momentumScorer.js';

export function computeHorizonScore(stock, horizon) {
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
