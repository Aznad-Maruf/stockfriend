export function classifyRisk(beta) {
  if (beta > 1.5) return 5;
  if (beta > 1.2) return 4;
  if (beta > 0.8) return 3;
  if (beta > 0.5) return 2;
  return 1;
}

export function classifyMarketCap(marketCapMn) {
  if (marketCapMn > 50000) return 'large';
  if (marketCapMn > 10000) return 'mid';
  return 'small';
}

export function classifyGrowth(return1Y) {
  if (return1Y > 20) return 'high';
  if (return1Y > 5) return 'moderate';
  return 'low';
}

export function clampReturn(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  if (num === Infinity) return 500;
  if (num === -Infinity) return -99;
  return Math.max(-99, Math.min(500, num));
}

const parseNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

export function transformCsvRow(csvObj, staticData = {}, idCounter) {
  const currentPrice = parseNum(csvObj.ltp);
  const week52High = parseNum(csvObj.week52_high);
  const week52Low = parseNum(csvObj.week52_low);
  const dividendYield = parseNum(csvObj.dividend_yield);
  const return1Y = parseNum(csvObj.return_1y);
  const beta = parseNum(csvObj.beta);
  const marketCapMn = parseNum(csvObj.market_cap_mn);

  const percentile5Y = parseNum(csvObj.percentile_5y);
  const zScore5Y = parseNum(csvObj.z_score_5y);
  const priceVsMedian5Y = parseNum(csvObj.price_vs_median_5y);
  const median1Y = parseNum(csvObj.median_1y);
  const median3Y = parseNum(csvObj.median_3y);
  const median5Y = parseNum(csvObj.median_5y);
  const mean5Y = parseNum(csvObj.mean_5y);
  const volatilityAnnual = parseNum(csvObj.volatility_annual);
  const maxDrawdown5Y = parseNum(csvObj.max_drawdown_5y);
  const actualReturn1Y = parseNum(csvObj.actual_return_1y);
  const actualReturn3Y = parseNum(csvObj.actual_return_3y);
  const actualReturn5Y = parseNum(csvObj.actual_return_5y);

  const riskLevel = classifyRisk(beta);
  const marketCap = classifyMarketCap(marketCapMn);
  const growthPotential = classifyGrowth(return1Y);

  let return3Y = actualReturn3Y || staticData.historicalReturn3Y;
  let return5Y = actualReturn5Y || staticData.historicalReturn5Y;
  
  if (!return3Y && return3Y !== 0) return3Y = return1Y * 2.5;
  if (!return5Y && return5Y !== 0) return5Y = return1Y * 4;
  
  return3Y = clampReturn(return3Y);
  return5Y = clampReturn(return5Y);

  return {
    id: staticData.id || idCounter,
    ticker: csvObj.ticker,
    name: staticData.name || csvObj.name,
    nameBn: staticData.nameBn || '',
    sector: staticData.sector || csvObj.sector,
    sectorBn: staticData.sectorBn || '',
    currentPrice,
    week52High,
    week52Low,
    riskLevel,
    dividendYield,
    historicalReturn1Y: actualReturn1Y || return1Y,
    historicalReturn3Y: return3Y,
    historicalReturn5Y: return5Y,
    marketCap,
    growthPotential,
    description: staticData.description || '',
    descriptionBn: staticData.descriptionBn || '',
    percentile5Y,
    zScore5Y,
    priceVsMedian5Y,
    median1Y,
    median3Y,
    median5Y,
    mean5Y,
    volatilityAnnual,
    maxDrawdown5Y,
    beta,
    marketCapMn,
    peRatio: parseNum(csvObj.pe_ratio),
    eps: parseNum(csvObj.eps),
    nav: parseNum(csvObj.nav),
    return1d: parseNum(csvObj.return_1d),
    return15d: parseNum(csvObj.return_15d),
    return1m: parseNum(csvObj.return_1m),
    changePct: parseNum(csvObj.change_pct),
    category: csvObj.category || 'A',
  };
}
