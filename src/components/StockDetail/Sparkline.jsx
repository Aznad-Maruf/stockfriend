import { useMemo } from 'react';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PAD_LEFT = 50;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

/**
 * Pure SVG sparkline chart for monthly stock prices.
 * X-axis: month labels, Y-axis: price range with min/max annotations.
 */
export default function Sparkline({ data, width = 400, height = 120 }) {
  if (!data || data.length < 2) return null;

  const chart = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const chartW = width - PAD_LEFT - PAD_RIGHT;
    const chartH = height - PAD_TOP - PAD_BOTTOM;

    const points = data.map((val, i) => ({
      x: PAD_LEFT + (i / (data.length - 1)) * chartW,
      y: PAD_TOP + chartH - ((val - min) / range) * chartH,
    }));

    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const cpx = (points[i - 1].x + points[i].x) / 2;
      pathD += ` C ${cpx},${points[i - 1].y} ${cpx},${points[i].y} ${points[i].x},${points[i].y}`;
    }

    const last = points[points.length - 1];
    const first = points[0];
    const areaD = `${pathD} L ${last.x},${PAD_TOP + chartH} L ${first.x},${PAD_TOP + chartH} Z`;
    const color = data[data.length - 1] >= data[0] ? '#22c55e' : '#ef4444';

    // Month labels for X-axis
    const now = new Date();
    const months = data.map((_, i) => {
      const monthIdx = (now.getMonth() - (data.length - 1 - i) + 12) % 12;
      return MONTH_LABELS[monthIdx];
    });

    // Y-axis gridlines (min, mid, max)
    const mid = (min + max) / 2;
    const yLabels = [
      { val: max, y: PAD_TOP, label: `৳${max.toFixed(0)}` },
      { val: mid, y: PAD_TOP + chartH / 2, label: `৳${mid.toFixed(0)}` },
      { val: min, y: PAD_TOP + chartH, label: `৳${min.toFixed(0)}` },
    ];

    return { pathD, areaD, color, points, months, yLabels, chartH };
  }, [data, width, height]);

  return (
    <div className="stock-detail__sparkline">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chart.color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={chart.color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Y-axis gridlines */}
        {chart.yLabels.map((yl) => (
          <g key={yl.val}>
            <line x1={PAD_LEFT} y1={yl.y} x2={width - PAD_RIGHT} y2={yl.y}
              stroke="var(--border-color, #334155)" strokeWidth="0.5" strokeDasharray="4,4" />
            <text x={PAD_LEFT - 6} y={yl.y + 4} textAnchor="end"
              fill="var(--text-secondary, #94a3b8)" fontSize="10" fontFamily="inherit">
              {yl.label}
            </text>
          </g>
        ))}

        {/* Area fill and line */}
        <path d={chart.areaD} fill="url(#sparkFill)" />
        <path d={chart.pathD} fill="none" stroke={chart.color} strokeWidth="2" strokeLinecap="round" />

        {/* Last point dot with glow */}
        <circle cx={chart.points.at(-1).x} cy={chart.points.at(-1).y}
          r="4" fill={chart.color} />
        <circle cx={chart.points.at(-1).x} cy={chart.points.at(-1).y}
          r="6" fill={chart.color} opacity="0.3" />

        {/* X-axis month labels (show every 2-3 to avoid overlap) */}
        {chart.months.map((label, i) => {
          const step = data.length > 8 ? 3 : data.length > 5 ? 2 : 1;
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text key={i} x={chart.points[i].x} y={height - 4}
              textAnchor="middle" fill="var(--text-secondary, #94a3b8)"
              fontSize="9" fontFamily="inherit">
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
