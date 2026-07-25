import { useMemo } from 'react';
import { generateHoldingSuggestion } from '../engine/suggestion';

export function useEnrichedHoldings(holdings, stocks, maxHoldMonths, research) {
  return useMemo(() => {
    if (!holdings) return [];
    
    return holdings.map(h => {
      const liveStock = stocks?.find(s => s.ticker === h.ticker);
      const currentPrice = liveStock?.currentPrice || h.buyPrice || 0;
      const costBasis = h.quantity * h.buyPrice;
      const currentValue = h.quantity * currentPrice;
      const pnl = currentValue - costBasis;
      const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
      const suggestion = generateHoldingSuggestion({ ...h, pnlPct }, liveStock, maxHoldMonths, research);

      return {
        ...h,
        currentPrice,
        costBasis,
        currentValue,
        pnl,
        pnlPct,
        suggestion,
        name: liveStock?.name || h.name || h.ticker,
        category: liveStock?.category || research?.[h.ticker]?.category || 'A',
      };
    });
  }, [holdings, stocks, maxHoldMonths, research]);
}
