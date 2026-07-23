import { RISK_PREFERENCES, SCORING_WEIGHTS } from '../constants.js';

export function computeRiskScore(stock, riskPreference) {
  const targets = RISK_PREFERENCES[riskPreference] || [3];
  const center = targets.reduce((a, b) => a + b, 0) / targets.length;
  const distance = Math.abs(stock.riskLevel - center);
  const maxDistance = 4;
  let score = Math.max(0, 20 * (1 - distance / maxDistance));

  // Volatility refinement: penalize high-volatility stocks for conservative,
  // reward them for aggressive (max ±5 points)
  if (stock.volatilityAnnual > 0) {
    const vol = stock.volatilityAnnual;
    if (riskPreference === 'conservative') {
      // Penalize: >40% vol gets -5, <15% vol gets +3
      score += vol < 15 ? 3 : vol < 25 ? 0 : vol < 40 ? -2 : -5;
    } else if (riskPreference === 'aggressive') {
      // Reward moderate volatility (sweet spot 25-45%), penalize extremes
      score += vol > 25 && vol < 45 ? 3 : vol >= 45 ? 1 : 0;
    }
  }

  // Max drawdown penalty for conservative investors
  if (riskPreference === 'conservative' && stock.maxDrawdown5Y < -60) {
    score -= 3; // Stocks that crashed >60% are too risky
  }

  return Math.max(0, Math.min(SCORING_WEIGHTS.RISK, score));
}
