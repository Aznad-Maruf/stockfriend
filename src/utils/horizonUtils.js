/**
 * Convert flexible horizon { days, months, years } to total days.
 * @param {Object} horizon - { days: number, months: number, years: number }
 * @returns {number} Total days
 */
export function horizonToDays(horizon) {
  if (!horizon || typeof horizon === 'string') {
    // Legacy string format fallback
    const LEGACY_MAP = { short: 180, medium: 730, long: 1825 };
    return LEGACY_MAP[horizon] || 365;
  }
  const d = Number(horizon.days) || 0;
  const m = Number(horizon.months) || 0;
  const y = Number(horizon.years) || 0;
  return d + m * 30 + y * 365;
}

/**
 * Convert flexible horizon to engine category ('short'/'medium'/'long').
 * short:  < 365 days (< 1 year)
 * medium: 365–1095 days (1–3 years)
 * long:   > 1095 days (3+ years)
 * @param {Object|string} horizon
 * @returns {'short'|'medium'|'long'}
 */
export function horizonToCategory(horizon) {
  if (typeof horizon === 'string') return horizon; // legacy
  const days = horizonToDays(horizon);
  if (days < 365) return 'short';
  if (days <= 1095) return 'medium';
  return 'long';
}

/**
 * Check if a horizon object has at least one non-zero value.
 * @param {Object} horizon - { days, months, years }
 * @returns {boolean}
 */
export function isHorizonValid(horizon) {
  if (!horizon || typeof horizon !== 'object') return false;
  return horizonToDays(horizon) > 0;
}

/**
 * Format a horizon object into a human-readable string.
 * @param {Object|string} horizon
 * @param {'en'|'bn'} lang
 * @returns {string} e.g. "3 months" or "1 year 6 months"
 */
export function formatHorizonDuration(horizon, lang = 'en') {
  if (!horizon || typeof horizon === 'string') {
    const LEGACY_EN = { short: 'Short-term', medium: 'Medium-term', long: 'Long-term' };
    const LEGACY_BN = { short: 'স্বল্পমেয়াদি', medium: 'মধ্যমেয়াদি', long: 'দীর্ঘমেয়াদি' };
    return lang === 'bn' ? (LEGACY_BN[horizon] || '—') : (LEGACY_EN[horizon] || '—');
  }
  const d = Number(horizon.days) || 0;
  const m = Number(horizon.months) || 0;
  const y = Number(horizon.years) || 0;
  const parts = [];
  if (lang === 'bn') {
    if (y > 0) parts.push(`${y} বছর`);
    if (m > 0) parts.push(`${m} মাস`);
    if (d > 0) parts.push(`${d} দিন`);
  } else {
    if (y > 0) parts.push(`${y} year${y > 1 ? 's' : ''}`);
    if (m > 0) parts.push(`${m} month${m > 1 ? 's' : ''}`);
    if (d > 0) parts.push(`${d} day${d > 1 ? 's' : ''}`);
  }
  return parts.join(' ') || '—';
}
