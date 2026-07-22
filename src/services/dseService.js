/**
 * DSE Live Data Service
 * Fetches real-time stock prices from DSE's public quotes endpoint.
 * Uses a CORS proxy since the DSE endpoint doesn't support CORS headers.
 */

const DSE_QUOTES_URL = 'https://www.dsebd.org/datafile/quotes_script.php';

// List of free CORS proxies to try in order
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?url=',
];

/**
 * Fetch raw text from DSE, trying CORS proxies in sequence.
 * Falls back to direct fetch (works server-side or if CORS is relaxed).
 */
async function fetchDSEData() {
  // Try direct fetch first (may work if no CORS issues)
  try {
    const res = await fetch(DSE_QUOTES_URL, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const text = await res.text();
      if (text.includes('\t')) return text;
    }
  } catch (_) {
    // Direct fetch failed, try proxies
  }

  // Try CORS proxies
  for (const proxy of CORS_PROXIES) {
    try {
      const url = proxy + encodeURIComponent(DSE_QUOTES_URL);
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const text = await res.text();
        if (text.includes('\t')) return text;
      }
    } catch (_) {
      continue;
    }
  }

  throw new Error('Failed to fetch live DSE data from all sources');
}

/**
 * Parse DSE quotes text into a Map of ticker → price.
 *
 * Format example:
 *   BRACBANK \t\t 63.9
 *   GP \t\t 259
 */
export function parseQuotes(rawText) {
  const prices = new Map();
  const lines = rawText.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Price') || trimmed.startsWith('Instr')) {
      continue;
    }

    // Split by tab(s) and/or whitespace
    const parts = trimmed.split(/\t+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const ticker = parts[0];
      const price = parseFloat(parts[1]);
      if (ticker && !isNaN(price) && price > 0) {
        prices.set(ticker, price);
      }
    }
  }

  return prices;
}

/**
 * Fetches live prices from DSE and returns a Map<ticker, price>.
 * Includes in-memory caching (5 min TTL) to avoid hammering the endpoint.
 */
let cachedPrices = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchLivePrices() {
  const now = Date.now();
  if (cachedPrices && now - cacheTimestamp < CACHE_TTL_MS) {
    return { prices: cachedPrices, fromCache: true, timestamp: cacheTimestamp };
  }

  const rawText = await fetchDSEData();
  const prices = parseQuotes(rawText);

  if (prices.size > 0) {
    cachedPrices = prices;
    cacheTimestamp = now;
  }

  return { prices, fromCache: false, timestamp: now };
}

/**
 * Update an array of stock objects with live prices from DSE.
 * Returns a new array (does not mutate the originals).
 *
 * IMPORTANT: If the live price falls outside the static week52High/week52Low
 * range, it means our static 52W data is stale/wrong. In that case, we
 * invalidate the 52W range to prevent the value score from producing
 * wildly incorrect "undervalued/overvalued" signals.
 */
export function applyLivePrices(stocks, livePrices) {
  return stocks.map((stock) => {
    const livePrice = livePrices.get(stock.ticker);
    if (livePrice != null) {
      const updated = {
        ...stock,
        currentPrice: livePrice,
        priceIsLive: true,
      };

      // If live price is outside our static 52W range, the range is stale.
      // Nullify it so the engine doesn't produce bogus value scores.
      if (stock.week52High && stock.week52Low) {
        if (livePrice > stock.week52High || livePrice < stock.week52Low) {
          updated.week52High = null;
          updated.week52Low = null;
          updated.week52Stale = true;
        }
      }

      return updated;
    }
    return { ...stock, priceIsLive: false };
  });
}

/**
 * Convenience: fetch live prices and apply them to stock array in one call.
 */
export async function getStocksWithLivePrices(stocks) {
  try {
    const { prices, fromCache, timestamp } = await fetchLivePrices();
    const updatedStocks = applyLivePrices(stocks, prices);
    return {
      stocks: updatedStocks,
      live: true,
      fromCache,
      timestamp,
      matchedCount: updatedStocks.filter((s) => s.priceIsLive).length,
    };
  } catch (error) {
    console.warn('Live price fetch failed, using static data:', error.message);
    return {
      stocks: stocks.map((s) => ({ ...s, priceIsLive: false })),
      live: false,
      fromCache: false,
      timestamp: null,
      matchedCount: 0,
      error: error.message,
    };
  }
}
