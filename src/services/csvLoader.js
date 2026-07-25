import { stocks as staticStocks } from '../data/stocks';

export function parseCSV(csvText) {
  const result = [];
  let row = [];
  let inQuotes = false;
  let currentVal = '';
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < csvText.length && csvText[i + 1] === '"') {
          currentVal += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currentVal);
        currentVal = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && i + 1 < csvText.length && csvText[i + 1] === '\n') {
          i++; // Skip \n
        }
        row.push(currentVal);
        result.push(row);
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }
  
  if (currentVal || row.length > 0) {
    row.push(currentVal);
    if (row.length > 0) {
      result.push(row);
    }
  }
  
  return result;
}

export async function loadScraperStatus() {
  try {
    const response = await fetch('/data/scraper_status.json');
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to load scraper status:', error);
    return null;
  }
}

export async function loadStocksFromCSV() {
  try {
    const response = await fetch('/data/stocks.csv');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const csvText = await response.text();
    const rows = parseCSV(csvText);
    if (rows.length < 2) throw new Error('CSV is empty or only headers');
    
    const headers = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1).filter(r => r.length === headers.length || (r.length > 1 && r[0]));

    const staticMap = new Map();
    for (const st of staticStocks) {
      staticMap.set(st.ticker, st);
    }

    const parseNum = (val) => {
      const n = parseFloat(val);
      return isNaN(n) ? 0 : n;
    };

    let idCounter = 1000;
    
    const stocks = dataRows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] ? row[index].trim() : '';
      });
      
      const ticker = obj.ticker;
      const staticData = staticMap.get(ticker) || {};
      
      const currentPrice = parseNum(obj.ltp);
      const week52High = parseNum(obj.week52_high);
      const week52Low = parseNum(obj.week52_low);
      const dividendYield = parseNum(obj.dividend_yield);
      const return1Y = parseNum(obj.return_1y);
      const beta = parseNum(obj.beta);
      const marketCapMn = parseNum(obj.market_cap_mn);

      // Stats fields (from 5Y history analysis)
      const percentile5Y = parseNum(obj.percentile_5y);
      const zScore5Y = parseNum(obj.z_score_5y);
      const priceVsMedian5Y = parseNum(obj.price_vs_median_5y);
      const median1Y = parseNum(obj.median_1y);
      const median3Y = parseNum(obj.median_3y);
      const median5Y = parseNum(obj.median_5y);
      const mean5Y = parseNum(obj.mean_5y);
      const volatilityAnnual = parseNum(obj.volatility_annual);
      const maxDrawdown5Y = parseNum(obj.max_drawdown_5y);
      const actualReturn1Y = parseNum(obj.actual_return_1y);
      const actualReturn3Y = parseNum(obj.actual_return_3y);
      const actualReturn5Y = parseNum(obj.actual_return_5y);
      
      let riskLevel = 1;
      if (beta > 1.5) riskLevel = 5;
      else if (beta > 1.2) riskLevel = 4;
      else if (beta > 0.8) riskLevel = 3;
      else if (beta > 0.5) riskLevel = 2;
      
      let marketCap = 'small';
      if (marketCapMn > 50000) marketCap = 'large';
      else if (marketCapMn > 10000) marketCap = 'mid';
      
      let growthPotential = 'low';
      if (return1Y > 20) growthPotential = 'high';
      else if (return1Y > 5) growthPotential = 'moderate';
      
      // Use actual computed returns from history, fall back to estimates
      let return3Y = actualReturn3Y || staticData.historicalReturn3Y;
      let return5Y = actualReturn5Y || staticData.historicalReturn5Y;
      // Only estimate if we have no data at all
      if (!return3Y && return3Y !== 0) return3Y = return1Y * 2.5;
      if (!return5Y && return5Y !== 0) return5Y = return1Y * 4;
      // Clamp returns to prevent Infinity in projections
      const clamp = (v) => Math.max(-99, Math.min(500, isFinite(v) ? v : 0));
      return3Y = clamp(return3Y);
      return5Y = clamp(return5Y);

      return {
        id: staticData.id || idCounter++,
        ticker: ticker,
        name: staticData.name || obj.name,
        nameBn: staticData.nameBn || '',
        sector: staticData.sector || obj.sector,
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
        // New statistical fields
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
        peRatio: parseNum(obj.pe_ratio),
        eps: parseNum(obj.eps),
        nav: parseNum(obj.nav),
        // Short-term momentum fields
        return1d: parseNum(obj.return_1d),
        return15d: parseNum(obj.return_15d),
        return1m: parseNum(obj.return_1m),
        changePct: parseNum(obj.change_pct),
      };
    });
    
    return { stocks, source: 'csv' };
  } catch (error) {
    console.error('Error loading stocks from CSV:', error);
    return { stocks: staticStocks, source: 'static' };
  }
}

/**
 * Load research data asynchronously (non-blocking).
 * Returns a map of ticker -> research override, or empty object on failure.
 */
export async function loadResearch() {
  try {
    const response = await fetch('/data/research.json');
    if (!response.ok) return {};
    const data = await response.json();
    return data.overrides || {};
  } catch (error) {
    console.warn('Research data not available:', error.message);
    return {};
  }
}
