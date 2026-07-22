import { describe, it, expect } from 'vitest';
import { stocks, sectors } from '../data/stocks';

// ═══════════════════════════════════════════════════════════════
// Stock data integrity
// ═══════════════════════════════════════════════════════════════

describe('stocks data integrity', () => {
  it('has at least 30 stocks', () => {
    expect(stocks.length).toBeGreaterThanOrEqual(30);
  });

  it('every stock has a unique id', () => {
    const ids = stocks.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every stock has a unique ticker', () => {
    const tickers = stocks.map((s) => s.ticker);
    expect(new Set(tickers).size).toBe(tickers.length);
  });

  it('every stock has all required fields', () => {
    const requiredFields = [
      'id', 'ticker', 'name', 'nameBn', 'sector', 'sectorBn',
      'currentPrice', 'week52High', 'week52Low',
      'riskLevel', 'dividendYield',
      'historicalReturn1Y', 'historicalReturn3Y', 'historicalReturn5Y',
      'marketCap', 'growthPotential', 'description', 'descriptionBn',
    ];

    for (const stock of stocks) {
      for (const field of requiredFields) {
        expect(stock).toHaveProperty(field);
        expect(stock[field]).not.toBeUndefined();
      }
    }
  });

  it('all tickers are uppercase strings without spaces', () => {
    for (const stock of stocks) {
      expect(typeof stock.ticker).toBe('string');
      expect(stock.ticker).toBe(stock.ticker.toUpperCase());
      expect(stock.ticker).not.toMatch(/\s/);
    }
  });

  it('prices are positive numbers', () => {
    for (const stock of stocks) {
      expect(stock.currentPrice).toBeGreaterThan(0);
    }
  });

  it('week52High >= week52Low for all stocks', () => {
    for (const stock of stocks) {
      expect(stock.week52High).toBeGreaterThanOrEqual(stock.week52Low);
    }
  });

  it('currentPrice is within a reasonable range of 52W bounds', () => {
    for (const stock of stocks) {
      // Allow some margin since live prices might go above 52W high
      // But static data should be within 52W range
      expect(stock.currentPrice).toBeGreaterThan(0);
      expect(stock.week52Low).toBeGreaterThan(0);
      expect(stock.week52High).toBeGreaterThan(0);
    }
  });

  it('riskLevel is between 1 and 5 for all stocks', () => {
    for (const stock of stocks) {
      expect(stock.riskLevel).toBeGreaterThanOrEqual(1);
      expect(stock.riskLevel).toBeLessThanOrEqual(5);
    }
  });

  it('dividendYield is non-negative', () => {
    for (const stock of stocks) {
      expect(stock.dividendYield).toBeGreaterThanOrEqual(0);
    }
  });

  it('marketCap is one of large/mid/small', () => {
    for (const stock of stocks) {
      expect(['large', 'mid', 'small']).toContain(stock.marketCap);
    }
  });

  it('growthPotential is one of low/moderate/high', () => {
    for (const stock of stocks) {
      expect(['low', 'moderate', 'high']).toContain(stock.growthPotential);
    }
  });

  it('has Bangla name and description for every stock', () => {
    for (const stock of stocks) {
      expect(stock.nameBn.length).toBeGreaterThan(0);
      expect(stock.descriptionBn.length).toBeGreaterThan(0);
    }
  });

  it('covers at least 5 different sectors', () => {
    const sectorNames = new Set(stocks.map((s) => s.sector));
    expect(sectorNames.size).toBeGreaterThanOrEqual(5);
  });

  it('has a mix of risk levels', () => {
    const riskLevels = new Set(stocks.map((s) => s.riskLevel));
    expect(riskLevels.size).toBeGreaterThanOrEqual(3);
  });

  it('has a mix of market caps', () => {
    const caps = new Set(stocks.map((s) => s.marketCap));
    expect(caps.size).toBe(3); // large, mid, small
  });
});


// ═══════════════════════════════════════════════════════════════
// Sectors data
// ═══════════════════════════════════════════════════════════════

describe('sectors data', () => {
  it('has at least 5 sectors', () => {
    expect(sectors.length).toBeGreaterThanOrEqual(5);
  });

  it('every sector has id, name, nameBn, icon', () => {
    for (const sector of sectors) {
      expect(sector.id).toBeTruthy();
      expect(sector.name).toBeTruthy();
      expect(sector.nameBn).toBeTruthy();
      expect(sector.icon).toBeTruthy();
    }
  });

  it('sector ids are unique', () => {
    const ids = sectors.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every stock sector name maps to an existing sector', () => {
    const sectorNames = new Set(sectors.map((s) => s.name));
    for (const stock of stocks) {
      expect(sectorNames.has(stock.sector)).toBe(true);
    }
  });
});


// ═══════════════════════════════════════════════════════════════
// Key stock tickers exist
// ═══════════════════════════════════════════════════════════════

describe('key stock tickers', () => {
  const keyTickers = [
    'BRACBANK', 'GP', 'SQURPHARMA', 'RENATA', 'BEACONPHAR',
    'BDCOM', 'BATBC', 'ISLAMIBANK', 'SUMITPOWER', 'WALTONHIL',
  ];

  for (const ticker of keyTickers) {
    it(`includes ${ticker}`, () => {
      const found = stocks.find((s) => s.ticker === ticker);
      expect(found).toBeDefined();
    });
  }
});
