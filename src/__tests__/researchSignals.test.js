import { describe, it, expect } from 'vitest';
import {
  computeResearchAdjustment,
  buildResearchWarnings,
  buildResearchContext,
  SIGNAL
} from '../engine/researchSignals.js';

describe('researchSignals', () => {
  describe('computeResearchAdjustment', () => {
    it('returns 0 if signals array is empty or missing', () => {
      expect(computeResearchAdjustment([], 'moderate', 'medium')).toBe(0);
      expect(computeResearchAdjustment(null, 'moderate', 'medium')).toBe(0);
    });

    it('calculates proper adjustment based on risk level', () => {
      expect(computeResearchAdjustment([SIGNAL.Z_CATEGORY], 'aggressive')).toBe(-5);
      expect(computeResearchAdjustment([SIGNAL.Z_CATEGORY], 'conservative')).toBe(-20);
      expect(computeResearchAdjustment([SIGNAL.Z_CATEGORY], 'moderate')).toBe(-12);
    });

    it('calculates proper momentum adjustment based on horizon', () => {
      expect(computeResearchAdjustment([SIGNAL.STRONG_MOMENTUM], 'moderate', 'short')).toBe(8);
      expect(computeResearchAdjustment([SIGNAL.STRONG_MOMENTUM], 'moderate', 'long')).toBe(3);
    });

    it('sums multiple signal adjustments', () => {
      const signals = [SIGNAL.Z_CATEGORY, SIGNAL.CHEAP_PE];
      expect(computeResearchAdjustment(signals, 'aggressive')).toBe(-5 + 8);
      expect(computeResearchAdjustment(signals, 'moderate')).toBe(-12 + 8);
    });
  });

  describe('buildResearchWarnings', () => {
    it('returns empty array if no signals or signals array is empty', () => {
      expect(buildResearchWarnings([])).toEqual([]);
      expect(buildResearchWarnings(null)).toEqual([]);
    });

    it('returns warnings in English by default', () => {
      const warnings = buildResearchWarnings([SIGNAL.Z_CATEGORY]);
      expect(warnings[0]).toContain('Z-category');
    });

    it('returns warnings in Bengali when specified', () => {
      const warnings = buildResearchWarnings([SIGNAL.Z_CATEGORY], 'bn');
      expect(warnings[0]).toContain('Z-ক্যাটাগরি');
    });

    it('skips signals without a template', () => {
      const warnings = buildResearchWarnings([SIGNAL.CHEAP_PE, SIGNAL.Z_CATEGORY]);
      expect(warnings.length).toBe(1);
    });
  });

  describe('buildResearchContext', () => {
    it('returns null if no research is provided', () => {
      expect(buildResearchContext(null, 'moderate', 'medium')).toBeNull();
    });

    it('merges deduplicated warnings and sets fields properly', () => {
      const research = {
        action: 'Hold',
        label: 'Wait',
        signals: [SIGNAL.Z_CATEGORY],
        warnings: ['Existing warning', '⚠️ Z-category: no margin loans, restricted trading'],
      };

      const ctx = buildResearchContext(research, 'aggressive', 'medium');
      expect(ctx.action).toBe('Hold');
      expect(ctx.adjustment).toBe(-5); // Z-category aggressive
      expect(ctx.warnings.length).toBe(2);
      expect(ctx.warnings).toContain('Existing warning');
    });
  });
});
