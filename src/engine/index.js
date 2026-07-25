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

export function generateRecommendations(answers, stocks, research = {}) {
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
    let baseScore = riskScore + horizonScore + goalScore + valueScore;

    // Research signal adjustments (risk-aware, not filtering)
    const r = research[stock.ticker];
    let researchAdj = 0;
    const researchWarnings = [];
    const researchWarningsBn = [];
    if (r && r.signals) {
      const isAggressive = answers.risk === 'aggressive';
      const isConservative = answers.risk === 'conservative';

      for (const sig of r.signals) {
        switch (sig) {
          case 'z_category':
            researchAdj += isAggressive ? -5 : isConservative ? -20 : -12;
            researchWarnings.push('⚠️ Z-category: no margin loans, restricted trading');
            researchWarningsBn.push('⚠️ Z-ক্যাটাগরি: মার্জিন লোন নেই');
            break;
          case 'b_category':
            researchAdj += isAggressive ? -3 : isConservative ? -15 : -8;
            researchWarnings.push('⚠️ B-category: high risk classification');
            researchWarningsBn.push('⚠️ B-ক্যাটাগরি: উচ্চ ঝুঁকি');
            break;
          case 'negative_eps':
            researchAdj += isAggressive ? -8 : isConservative ? -25 : -15;
            researchWarnings.push('⚠️ Negative EPS: company losing money');
            researchWarningsBn.push('⚠️ নেতিবাচক ইপিএস: কোম্পানি ক্ষতিতে');
            break;
          case 'crash':
            researchAdj += isAggressive ? -3 : isConservative ? -15 : -8;
            researchWarnings.push('⚠️ Crashed >50% in 6 months');
            researchWarningsBn.push('⚠️ ৬ মাসে >৫০% পতন');
            break;
          case 'cheap_pe':
            researchAdj += 8;
            break;
          case 'high_dividend':
            researchAdj += 6;
            break;
          case 'nav_discount':
            researchAdj += isAggressive ? 8 : 4;
            break;
          case 'undervalued_5y':
            researchAdj += 5;
            break;
          case 'overvalued_5y':
            researchAdj += -5;
            researchWarnings.push('📊 Trading above 5-year 80th percentile');
            researchWarningsBn.push('📊 ৫ বছরের ৮০তম পার্সেন্টাইলের উপরে');
            break;
          case 'strong_momentum':
            researchAdj += answers.horizon === 'short' ? 8 : 3;
            break;
          case 'weak_momentum':
            researchAdj += answers.horizon === 'short' ? -8 : -3;
            researchWarnings.push('📉 Weak recent momentum');
            researchWarningsBn.push('📉 সাম্প্রতিক গতি দুর্বল');
            break;
        }
      }
    }
    baseScore += researchAdj;

    // Merge pre-built warnings from analyzer with engine-generated ones
    const allWarnings = [...(r?.warnings || []), ...researchWarnings.filter(w => !(r?.warnings || []).some(rw => rw.includes(w.slice(3))))];
    const allWarningsBn = [...(r?.warningsBn || []), ...researchWarningsBn.filter(w => !(r?.warningsBn || []).some(rw => rw.includes(w.slice(3))))];

    return {
      stock,
      riskScore,
      horizonScore,
      goalScore,
      valueScore,
      baseScore: Math.max(0, baseScore),
      researchContext: r ? {
        action: r.action,
        label: r.label,
        labelBn: r.labelBn,
        reason: r.reason,
        reasonBn: r.reasonBn,
        signals: r.signals,
        warnings: allWarnings,
        warningsBn: allWarningsBn,
        adjustment: researchAdj,
      } : null,
    };
  });

  scored.sort((a, b) => b.baseScore - a.baseScore);

  // Diversification bonus adds up to 15 points
  const withDiversity = applyDiversificationPenalty(scored);

  withDiversity.sort((a, b) => b.totalScore - a.totalScore);

  const top = withDiversity.slice(0, 5);

  const recommendations = buildRecommendations(top, answers, research);

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
