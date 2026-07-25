export const SCORING_WEIGHTS = {
  RISK: 25,
  VALUE: 25,
  MOMENTUM_QUICK: 7,
  MOMENTUM_SHORT: 7,
  MOMENTUM_MEDIUM: 4
};

export const VALUE_THRESHOLDS = {
  PERCENTILE: { DEEP: 15, GOOD: 30, FAIR: 50, NEUTRAL: 70 },
  Z_SCORE: { EXTREME: -2, GOOD: -1, SLIGHT: -0.3, FAIR: 0.3 },
  PRICE_VS_MEDIAN: { EXTREME: 0.5, GOOD: 0.7, FAIR: 0.85, SLIGHT: 0.95, NEAR: 1.05 },
  RANGE: { NEAR_LOW: 0.7, LOWER_HALF: 0.5, MIDDLE: 0.3 }
};

export const RISK_PREFERENCES = {
  conservative: [1, 2],
  moderate: [2, 3],
  aggressive: [3, 4, 5]
};

export const MOMENTUM_THRESHOLDS = {
  QUICK: { R15D_1: 10, R15D_2: 5, R15D_3: 2, R15D_4: 0, R1M_1: 15, R1M_2: 8, R1M_3: 3, R1M_4: 0, R1Y_1: 20, R1Y_2: 5, R1Y_3: 0 },
  SHORT: { R15D_1: 8, R15D_2: 3, R15D_3: 0, R1M_1: 10, R1M_2: 3, R1M_3: 0, R15D_PENALTY: -5, R1M_PENALTY: -10 },
  MEDIUM: { R1M_1: 5, R1M_2: 0, R1Y_1: 10, R1Y_2: 0, R1M_PENALTY: -10 },
  LONG: { R1Y_1: 20, R1Y_2: 10 }
};

export const ALLOCATION_TIERS = {
  DEFAULT_PERCENT: 20
};

export const RISK_LABELS = {
  1: 'Very Low',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Very High'
};

export const RISK_COLORS = {
  1: '#10b981',
  2: '#34d399',
  3: '#f59e0b',
  4: '#f97316',
  5: '#ef4444'
};

export const DIVERSIFICATION = {
  MAX_BONUS: 15,
  COUNT_1_MULT: 0.4,
  COUNT_MORE_MULT: 0.1
};

export const THRESHOLDS = {
  MIN_RETURN_PCT: -99,
  MAX_RETURN_PCT: 500,
  MAX_MEAN_REVERSION_PCT: 100
};

export const MEAN_REVERSION_FACTORS = {
  short: 0.15,
  medium: 0.4,
  long: 0.7
};
