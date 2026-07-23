/**
 * Shared test fixtures for recommendation engine tests.
 * Provides factory functions with sensible defaults that can be overridden.
 */

export function makeStock(overrides = {}) {
  return {
    id: 1,
    ticker: 'TEST',
    name: 'Test Corp.',
    nameBn: 'টেস্ট কর্প.',
    sector: 'Banking',
    sectorBn: 'ব্যাংকিং',
    currentPrice: 50,
    week52High: 100,
    week52Low: 20,
    riskLevel: 3,
    dividendYield: 3.0,
    historicalReturn1Y: 10,
    historicalReturn3Y: 30,
    historicalReturn5Y: 60,
    marketCap: 'mid',
    growthPotential: 'moderate',
    description: 'Test',
    descriptionBn: 'টেস্ট',
    // Stats fields (defaults: neutral/mid-range values)
    percentile5Y: 50,
    zScore5Y: 0,
    priceVsMedian5Y: 1.0,
    median1Y: 50,
    median3Y: 50,
    median5Y: 50,
    mean5Y: 50,
    volatilityAnnual: 25,
    maxDrawdown5Y: -30,
    beta: 1.0,
    ...overrides,
  };
}

export function makeAnswers(overrides = {}) {
  return {
    experience: 'intermediate',
    risk: 'moderate',
    horizon: 'medium',
    budget: 200000,
    goal: 'wealth',
    sectors: [],
    ...overrides,
  };
}

/**
 * Creates a minimal stock universe suitable for integration tests.
 * Returns 8 stocks across 4 sectors with varied risk profiles.
 */
export function makeStockUniverse() {
  return [
    makeStock({ id: 1, ticker: 'BANK1', name: 'Bank One', sector: 'Banking', riskLevel: 2, currentPrice: 45, week52High: 60, week52Low: 30, dividendYield: 4.5, historicalReturn1Y: 8 }),
    makeStock({ id: 2, ticker: 'BANK2', name: 'Bank Two', sector: 'Banking', riskLevel: 3, currentPrice: 80, week52High: 120, week52Low: 50, dividendYield: 3.0, historicalReturn1Y: 12 }),
    makeStock({ id: 3, ticker: 'TECH1', name: 'Tech Alpha', sector: 'IT', riskLevel: 4, currentPrice: 200, week52High: 300, week52Low: 100, dividendYield: 0.5, historicalReturn1Y: 25 }),
    makeStock({ id: 4, ticker: 'TECH2', name: 'Tech Beta', sector: 'IT', riskLevel: 5, currentPrice: 150, week52High: 250, week52Low: 80, dividendYield: 0, historicalReturn1Y: 35 }),
    makeStock({ id: 5, ticker: 'FOOD1', name: 'Food Corp', sector: 'Food and Allied', riskLevel: 2, currentPrice: 100, week52High: 130, week52Low: 85, dividendYield: 5.0, historicalReturn1Y: 6 }),
    makeStock({ id: 6, ticker: 'PHARMA1', name: 'Pharma Inc', sector: 'Pharmaceuticals', riskLevel: 3, currentPrice: 300, week52High: 400, week52Low: 200, dividendYield: 2.0, historicalReturn1Y: 15 }),
    makeStock({ id: 7, ticker: 'ENG1', name: 'Eng Works', sector: 'Engineering', riskLevel: 3, currentPrice: 60, week52High: 90, week52Low: 40, dividendYield: 2.5, historicalReturn1Y: 10 }),
    makeStock({ id: 8, ticker: 'TEL1', name: 'Telecom Ltd', sector: 'Telecommunication', riskLevel: 2, currentPrice: 250, week52High: 280, week52Low: 220, dividendYield: 8.0, historicalReturn1Y: 5 }),
  ];
}
