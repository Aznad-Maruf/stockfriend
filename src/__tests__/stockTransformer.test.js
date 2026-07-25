import { describe, it, expect } from 'vitest';
import {
  classifyRisk,
  classifyMarketCap,
  classifyGrowth,
  clampReturn,
  transformCsvRow
} from '../services/stockTransformer';

describe('stockTransformer', () => {
  describe('classifyRisk', () => {
    it('classifies boundary values correctly', () => {
      expect(classifyRisk(0)).toBe(1);
      expect(classifyRisk(0.5)).toBe(1);
      expect(classifyRisk(0.51)).toBe(2);
      expect(classifyRisk(0.8)).toBe(2);
      expect(classifyRisk(0.81)).toBe(3);
      expect(classifyRisk(1.2)).toBe(3);
      expect(classifyRisk(1.21)).toBe(4);
      expect(classifyRisk(1.5)).toBe(4);
      expect(classifyRisk(1.51)).toBe(5);
      expect(classifyRisk(2.0)).toBe(5);
    });
  });

  describe('classifyMarketCap', () => {
    it('classifies boundary values correctly', () => {
      expect(classifyMarketCap(0)).toBe('small');
      expect(classifyMarketCap(5000)).toBe('small');
      expect(classifyMarketCap(10000)).toBe('small');
      expect(classifyMarketCap(10001)).toBe('mid');
      expect(classifyMarketCap(50000)).toBe('mid');
      expect(classifyMarketCap(50001)).toBe('large');
      expect(classifyMarketCap(100000)).toBe('large');
    });
  });

  describe('classifyGrowth', () => {
    it('classifies boundary values correctly', () => {
      expect(classifyGrowth(-10)).toBe('low');
      expect(classifyGrowth(0)).toBe('low');
      expect(classifyGrowth(5)).toBe('low');
      expect(classifyGrowth(5.1)).toBe('moderate');
      expect(classifyGrowth(20)).toBe('moderate');
      expect(classifyGrowth(20.1)).toBe('high');
      expect(classifyGrowth(50)).toBe('high');
    });
  });

  describe('clampReturn', () => {
    it('clamps values correctly', () => {
      expect(clampReturn(50)).toBe(50);
      expect(clampReturn(Infinity)).toBe(500);
      expect(clampReturn(-Infinity)).toBe(-99);
      expect(clampReturn(600)).toBe(500);
      expect(clampReturn(-150)).toBe(-99);
      expect(clampReturn(NaN)).toBe(0);
    });
  });

  describe('transformCsvRow', () => {
    it('transforms a full CSV row properly', () => {
      const csvObj = {
        ticker: 'ABC',
        name: 'ABC Corp',
        sector: 'Tech',
        ltp: '100',
        week52_high: '150',
        week52_low: '80',
        dividend_yield: '5',
        return_1y: '10',
        beta: '1',
        market_cap_mn: '20000',
        actual_return_3y: '30',
        actual_return_5y: '50'
      };
      
      const staticData = {
        id: 123,
        historicalReturn3Y: 25,
        historicalReturn5Y: 45
      };

      const result = transformCsvRow(csvObj, staticData, 1000);
      
      expect(result.id).toBe(123);
      expect(result.ticker).toBe('ABC');
      expect(result.currentPrice).toBe(100);
      expect(result.riskLevel).toBe(3); // beta 1 -> 3
      expect(result.marketCap).toBe('mid'); // 20k -> mid
      expect(result.growthPotential).toBe('moderate'); // return 10 -> moderate
      expect(result.historicalReturn3Y).toBe(30);
      expect(result.historicalReturn5Y).toBe(50);
    });

    it('transforms a partial CSV row using fallbacks properly', () => {
      const csvObj = {
        ticker: 'XYZ',
        return_1y: '10', // no actual 3y or 5y return
      };
      
      const staticData = {};
      const idCounter = 1005;

      const result = transformCsvRow(csvObj, staticData, idCounter);
      
      expect(result.id).toBe(1005);
      expect(result.ticker).toBe('XYZ');
      expect(result.currentPrice).toBe(0); // missing ltp defaults to 0
      expect(result.historicalReturn3Y).toBe(25); // 10 * 2.5
      expect(result.historicalReturn5Y).toBe(40); // 10 * 4
    });
  });
});
