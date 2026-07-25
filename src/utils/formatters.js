export function formatBDT(amount) {
  if (amount == null || Number.isNaN(Number(amount)) || !isFinite(Number(amount))) return '৳0';
  
  const num = Number(amount);
  const hasDecimals = num % 1 !== 0;
  
  return '৳' + num.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });
}

export function formatPct(pct) {
  if (pct == null || Number.isNaN(Number(pct)) || !isFinite(Number(pct))) return '0.00%';
  return Number(pct).toFixed(2) + '%';
}

export function formatNumber(num) {
  if (num == null || Number.isNaN(Number(num)) || !isFinite(Number(num))) return '';
  return Number(num).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
