import { describe, it, expect } from 'vitest';
import { formatBDT, formatPct, formatNumber } from '../utils/formatters';

describe('formatters', () => {
  describe('formatBDT', () => {
    it('formats normal amounts correctly', () => {
      expect(formatBDT(1000)).toBe('৳1,000');
      expect(formatBDT(100000)).toBe('৳1,00,000');
    });
    
    it('formats decimals up to 2 places', () => {
      expect(formatBDT(1000.5)).toBe('৳1,000.50');
      expect(formatBDT(1000.123)).toBe('৳1,000.12');
    });

    it('handles zero', () => {
      expect(formatBDT(0)).toBe('৳0');
    });

    it('handles negative numbers', () => {
      expect(formatBDT(-1500)).toBe('৳-1,500');
    });

    it('handles edge cases', () => {
      expect(formatBDT(null)).toBe('৳0');
      expect(formatBDT(undefined)).toBe('৳0');
      expect(formatBDT(NaN)).toBe('৳0');
      expect(formatBDT(Infinity)).toBe('৳0');
      expect(formatBDT('12345')).toBe('৳12,345');
    });
  });

  describe('formatPct', () => {
    it('formats percentages correctly', () => {
      expect(formatPct(15)).toBe('15.00%');
      expect(formatPct(15.123)).toBe('15.12%');
      expect(formatPct(0)).toBe('0.00%');
      expect(formatPct(-5.5)).toBe('-5.50%');
    });

    it('handles edge cases', () => {
      expect(formatPct(null)).toBe('0.00%');
      expect(formatPct(undefined)).toBe('0.00%');
      expect(formatPct(NaN)).toBe('0.00%');
      expect(formatPct(Infinity)).toBe('0.00%');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers correctly', () => {
      expect(formatNumber(1234567)).toBe('12,34,567');
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(-1234)).toBe('-1,234');
    });

    it('handles edge cases', () => {
      expect(formatNumber(null)).toBe('');
      expect(formatNumber(undefined)).toBe('');
      expect(formatNumber(NaN)).toBe('');
      expect(formatNumber(Infinity)).toBe('');
    });
  });
});
