import {
  computeRiskScore,
  computeHorizonScore,
  computeGoalScore,
  computeValueScore,
  computeMomentumScore,
} from './scorers/index.js';
import { applyDiversificationPenalty } from './diversification.js';
import { buildRecommendations, seedFromTicker, seededAdjustment } from './projection.js';
import { generateRationale } from './rationale.js';
import { RISK_LABELS, RISK_COLORS } from './constants.js';

export function getRiskLabel(level) {
  return RISK_LABELS[level] || 'Unknown';
}

export function getRiskColor(level) {
  return RISK_COLORS[level] || '#6b7280';
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

  // Score each stock: Risk(25) + Horizon(20) + Goal(20) + Value(25) = base (max 90)
  // Note: Horizon and Goal now include momentum internally for short/quick
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

  const recommendations = buildRecommendations(top, answers);

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

// Export internals for testing
export const _testExports = {
  seedFromTicker,
  seededAdjustment,
  computeRiskScore,
  computeHorizonScore,
  computeGoalScore,
  computeValueScore,
  computeMomentumScore,
  applyDiversificationPenalty,
  generateRationale,
};
