export const SIGNAL = {
  Z_CATEGORY: 'z_category',
  B_CATEGORY: 'b_category',
  NEGATIVE_EPS: 'negative_eps',
  CRASH: 'crash',
  CHEAP_PE: 'cheap_pe',
  HIGH_DIVIDEND: 'high_dividend',
  NAV_DISCOUNT: 'nav_discount',
  UNDERVALUED_5Y: 'undervalued_5y',
  OVERVALUED_5Y: 'overvalued_5y',
  STRONG_MOMENTUM: 'strong_momentum',
  WEAK_MOMENTUM: 'weak_momentum'
};

export const SIGNAL_ADJUSTMENTS = {
  [SIGNAL.Z_CATEGORY]: { aggressive: -5, conservative: -20, default: -12 },
  [SIGNAL.B_CATEGORY]: { aggressive: -3, conservative: -15, default: -8 },
  [SIGNAL.NEGATIVE_EPS]: { aggressive: -8, conservative: -25, default: -15 },
  [SIGNAL.CRASH]: { aggressive: -3, conservative: -15, default: -8 },
  [SIGNAL.CHEAP_PE]: { default: 8 },
  [SIGNAL.HIGH_DIVIDEND]: { default: 6 },
  [SIGNAL.NAV_DISCOUNT]: { aggressive: 8, default: 4 },
  [SIGNAL.UNDERVALUED_5Y]: { default: 5 },
  [SIGNAL.OVERVALUED_5Y]: { default: -5 },
  [SIGNAL.STRONG_MOMENTUM]: { short: 8, default: 3 },
  [SIGNAL.WEAK_MOMENTUM]: { short: -8, default: -3 }
};

export const WARNING_TEMPLATES = {
  [SIGNAL.Z_CATEGORY]: {
    en: '⚠️ Z-category: no margin loans, restricted trading',
    bn: '⚠️ Z-ক্যাটাগরি: মার্জিন লোন নেই'
  },
  [SIGNAL.B_CATEGORY]: {
    en: '⚠️ B-category: high risk classification',
    bn: '⚠️ B-ক্যাটাগরি: উচ্চ ঝুঁকি'
  },
  [SIGNAL.NEGATIVE_EPS]: {
    en: '⚠️ Negative EPS: company losing money',
    bn: '⚠️ নেতিবাচক ইপিএস: কোম্পানি ক্ষতিতে'
  },
  [SIGNAL.CRASH]: {
    en: '⚠️ Crashed >50% in 6 months',
    bn: '⚠️ ৬ মাসে >৫০% পতন'
  },
  [SIGNAL.OVERVALUED_5Y]: {
    en: '📊 Trading above 5-year 80th percentile',
    bn: '📊 ৫ বছরের ৮০তম পার্সেন্টাইলের উপরে'
  },
  [SIGNAL.WEAK_MOMENTUM]: {
    en: '📉 Weak recent momentum',
    bn: '📉 সাম্প্রতিক গতি দুর্বল'
  }
};

export function computeResearchAdjustment(signals, riskLevel, horizon) {
  let adj = 0;
  if (!signals || !Array.isArray(signals)) return adj;

  for (const sig of signals) {
    const config = SIGNAL_ADJUSTMENTS[sig];
    if (!config) continue;

    if (sig === SIGNAL.STRONG_MOMENTUM || sig === SIGNAL.WEAK_MOMENTUM) {
      if (horizon === 'short' && config.short !== undefined) {
        adj += config.short;
      } else {
        adj += config.default;
      }
    } else {
      if (riskLevel === 'aggressive' && config.aggressive !== undefined) {
        adj += config.aggressive;
      } else if (riskLevel === 'conservative' && config.conservative !== undefined) {
        adj += config.conservative;
      } else {
        adj += config.default || 0;
      }
    }
  }
  return adj;
}

export function buildResearchWarnings(signals, language = 'en') {
  const warnings = [];
  if (!signals || !Array.isArray(signals)) return warnings;
  
  for (const sig of signals) {
    const tmpl = WARNING_TEMPLATES[sig];
    if (tmpl && tmpl[language]) {
      warnings.push(tmpl[language]);
    }
  }
  return warnings;
}

export function buildResearchContext(research, riskLevel, horizon) {
  if (!research) return null;

  const adj = computeResearchAdjustment(research.signals, riskLevel, horizon);
  
  const generatedEn = buildResearchWarnings(research.signals, 'en');
  const generatedBn = buildResearchWarnings(research.signals, 'bn');

  // Use signal-based deduplication
  const allWarnings = [...(research.warnings || [])];
  for (const w of generatedEn) {
    if (!allWarnings.includes(w)) {
      allWarnings.push(w);
    }
  }

  const allWarningsBn = [...(research.warningsBn || [])];
  for (const w of generatedBn) {
    if (!allWarningsBn.includes(w)) {
      allWarningsBn.push(w);
    }
  }

  return {
    action: research.action,
    label: research.label,
    labelBn: research.labelBn,
    reason: research.reason,
    reasonBn: research.reasonBn,
    signals: research.signals,
    warnings: allWarnings,
    warningsBn: allWarningsBn,
    adjustment: adj,
  };
}
