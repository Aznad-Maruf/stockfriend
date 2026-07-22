import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseQuotes, applyLivePrices, getStocksWithLivePrices } from '../services/dseService';

// ─── Test fixture: realistic DSE quotes data ─────────────────

const SAMPLE_DSE_DATA = `Price & Index for the Date:22-07-2026        Time: 05:00:01

Instr. Code        Last Trade/Close Price

1JANATAMF \t 4
AAMRANET \t\t 20.8
BRACBANK \t\t 63.9
BDCOM \t\t 33.7
BEACONPHAR \t 109.7
GP \t\t 259
RENATA \t\t 473.4
SUMITPOWER \t 17
SQURPHARMA \t 220.8
ROBI \t\t 32.8
`;

function makeStaticStocks() {
  return [
    { id: 1, ticker: 'BRACBANK', currentPrice: 39.8, name: 'BRAC Bank', week52High: 48, week52Low: 30.5 },
    { id: 2, ticker: 'BDCOM', currentPrice: 33.5, name: 'BDCOM', week52High: 35.6, week52Low: 22 },
    { id: 3, ticker: 'GP', currentPrice: 395, name: 'Grameenphone', week52High: 420, week52Low: 350 },
    { id: 4, ticker: 'RENATA', currentPrice: 1420, name: 'Renata', week52High: 1500, week52Low: 1050 },
    { id: 5, ticker: 'SUMITPOWER', currentPrice: 36, name: 'Summit Power', week52High: 55, week52Low: 30 },
    { id: 6, ticker: 'NOTLISTED', currentPrice: 100, name: 'Not Listed Corp', week52High: 120, week52Low: 80 },
    { id: 7, ticker: 'OLYMPIC', currentPrice: 248, name: 'Olympic', week52High: 280, week52Low: 200 },
  ];
}


// ═══════════════════════════════════════════════════════════════
// parseQuotes
// ═══════════════════════════════════════════════════════════════

describe('parseQuotes', () => {
  it('parses valid DSE data into a Map of ticker → price', () => {
    const prices = parseQuotes(SAMPLE_DSE_DATA);
    expect(prices).toBeInstanceOf(Map);
    expect(prices.size).toBeGreaterThan(0);
  });

  it('correctly extracts known stock prices', () => {
    const prices = parseQuotes(SAMPLE_DSE_DATA);
    expect(prices.get('BRACBANK')).toBe(63.9);
    expect(prices.get('GP')).toBe(259);
    expect(prices.get('SUMITPOWER')).toBe(17);
    expect(prices.get('RENATA')).toBe(473.4);
    expect(prices.get('BDCOM')).toBe(33.7);
  });

  it('skips header lines (Price & Index, Instr. Code)', () => {
    const prices = parseQuotes(SAMPLE_DSE_DATA);
    expect(prices.has('Price')).toBe(false);
    expect(prices.has('Instr.')).toBe(false);
  });

  it('skips blank lines', () => {
    const prices = parseQuotes(SAMPLE_DSE_DATA);
    expect(prices.has('')).toBe(false);
  });

  it('handles single tab separator', () => {
    const data = 'TESTSTOCK\t42.5';
    const prices = parseQuotes(data);
    expect(prices.get('TESTSTOCK')).toBe(42.5);
  });

  it('handles multiple tab separators', () => {
    const data = 'TESTSTOCK\t\t\t42.5';
    const prices = parseQuotes(data);
    expect(prices.get('TESTSTOCK')).toBe(42.5);
  });

  it('returns empty Map for empty input', () => {
    expect(parseQuotes('').size).toBe(0);
    expect(parseQuotes('\n\n\n').size).toBe(0);
  });

  it('skips lines with invalid prices', () => {
    const data = 'GOOD\t50\nBAD\tnotanumber\nALSOBAD\t-5\nZERO\t0';
    const prices = parseQuotes(data);
    expect(prices.has('GOOD')).toBe(true);
    expect(prices.has('BAD')).toBe(false);
    expect(prices.has('ALSOBAD')).toBe(false);
    expect(prices.has('ZERO')).toBe(false);
  });

  it('handles real-world volume of ~400 stocks', () => {
    let bigData = 'Price & Index for the Date:22-07-2026\n\nInstr. Code        Last Trade/Close Price\n\n';
    for (let i = 0; i < 400; i++) {
      bigData += `STOCK${i}\t\t ${(10 + Math.random() * 1000).toFixed(1)}\n`;
    }
    const prices = parseQuotes(bigData);
    expect(prices.size).toBe(400);
  });
});


// ═══════════════════════════════════════════════════════════════
// applyLivePrices
// ═══════════════════════════════════════════════════════════════

describe('applyLivePrices', () => {
  it('updates prices for matched tickers', () => {
    const livePrices = new Map([
      ['BRACBANK', 63.9],
      ['GP', 259],
      ['SUMITPOWER', 17],
    ]);
    const stocks = makeStaticStocks();
    const result = applyLivePrices(stocks, livePrices);

    const bracbank = result.find((s) => s.ticker === 'BRACBANK');
    expect(bracbank.currentPrice).toBe(63.9);
    expect(bracbank.priceIsLive).toBe(true);
  });

  it('keeps static price for unmatched tickers', () => {
    const livePrices = new Map([['BRACBANK', 63.9]]);
    const stocks = makeStaticStocks();
    const result = applyLivePrices(stocks, livePrices);

    const notListed = result.find((s) => s.ticker === 'NOTLISTED');
    expect(notListed.currentPrice).toBe(100);
    expect(notListed.priceIsLive).toBe(false);
  });

  it('does not mutate original stock array', () => {
    const stocks = makeStaticStocks();
    const originalPrice = stocks[0].currentPrice;
    const livePrices = new Map([['BRACBANK', 999]]);

    applyLivePrices(stocks, livePrices);
    expect(stocks[0].currentPrice).toBe(originalPrice);
  });

  it('returns same length as input', () => {
    const stocks = makeStaticStocks();
    const livePrices = new Map([['GP', 259]]);
    const result = applyLivePrices(stocks, livePrices);
    expect(result).toHaveLength(stocks.length);
  });

  it('handles empty live prices Map', () => {
    const stocks = makeStaticStocks();
    const result = applyLivePrices(stocks, new Map());
    for (const s of result) {
      expect(s.priceIsLive).toBe(false);
    }
  });

  it('nullifies 52W range when live price is below static week52Low', () => {
    // OLYMPIC static: week52Low=200, but real price is 154.7 → below range → stale
    const livePrices = new Map([['OLYMPIC', 154.7]]);
    const stocks = makeStaticStocks();
    const result = applyLivePrices(stocks, livePrices);

    const olympic = result.find((s) => s.ticker === 'OLYMPIC');
    expect(olympic.currentPrice).toBe(154.7);
    expect(olympic.week52High).toBeNull();
    expect(olympic.week52Low).toBeNull();
    expect(olympic.week52Stale).toBe(true);
  });

  it('nullifies 52W range when live price is above static week52High', () => {
    const livePrices = new Map([['BRACBANK', 999]]);
    const stocks = makeStaticStocks();
    const result = applyLivePrices(stocks, livePrices);

    const bracbank = result.find((s) => s.ticker === 'BRACBANK');
    expect(bracbank.week52High).toBeNull();
    expect(bracbank.week52Low).toBeNull();
    expect(bracbank.week52Stale).toBe(true);
  });

  it('preserves 52W range when live price is within static range', () => {
    // GP static: week52Low=350, week52High=420. Live=259 → below range → stale
    // But BDCOM: week52Low=22, week52High=35.6. Live=33.7 → within range → OK
    const livePrices = new Map([['BDCOM', 33.7]]);
    const stocks = makeStaticStocks();
    const result = applyLivePrices(stocks, livePrices);

    const bdcom = result.find((s) => s.ticker === 'BDCOM');
    expect(bdcom.week52High).toBe(35.6);
    expect(bdcom.week52Low).toBe(22);
    expect(bdcom.week52Stale).toBeUndefined();
  });
});


// ═══════════════════════════════════════════════════════════════
// getStocksWithLivePrices
// ═══════════════════════════════════════════════════════════════

describe('getStocksWithLivePrices', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back gracefully when fetch fails', async () => {
    // Mock fetch to always fail
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const stocks = makeStaticStocks();
    const result = await getStocksWithLivePrices(stocks);

    expect(result.live).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.stocks).toHaveLength(stocks.length);
    // Prices should be unchanged (static fallback)
    expect(result.stocks[0].currentPrice).toBe(stocks[0].currentPrice);

    vi.unstubAllGlobals();
  });

  it('returns live=true and matchedCount when fetch succeeds', async () => {
    // Mock fetch to return sample data
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_DSE_DATA),
    }));

    const stocks = makeStaticStocks();
    const result = await getStocksWithLivePrices(stocks);

    expect(result.live).toBe(true);
    expect(result.matchedCount).toBeGreaterThan(0);
    expect(result.timestamp).toBeTruthy();

    // Verify actual prices were applied
    const gp = result.stocks.find((s) => s.ticker === 'GP');
    expect(gp.currentPrice).toBe(259);
    expect(gp.priceIsLive).toBe(true);

    vi.unstubAllGlobals();
  });

  it('correctly counts matched stocks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(SAMPLE_DSE_DATA),
    }));

    const stocks = makeStaticStocks();
    const result = await getStocksWithLivePrices(stocks);

    // 5 of 7 stocks should match (NOTLISTED and OLYMPIC aren't in sample data)
    expect(result.matchedCount).toBe(5);

    vi.unstubAllGlobals();
  });
});
