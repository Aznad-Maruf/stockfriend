import { stocks as staticStocks } from '../data/stocks';
import { transformCsvRow } from './stockTransformer';

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
      
      const stock = transformCsvRow(obj, staticData, idCounter);
      if (!staticData.id) idCounter++;
      
      return stock;
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
