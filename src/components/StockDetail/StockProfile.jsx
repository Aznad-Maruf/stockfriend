import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import Sparkline from './Sparkline';

const L = {
  en: {
    fundamentals: 'Fundamentals', returns: 'Historical Returns',
    valuation: 'Valuation Analysis', risk: 'Risk Profile',
    research: 'Research Signal', pe: 'P/E Ratio', eps: 'EPS', nav: 'NAV',
    divYield: 'Div. Yield', mktCap: 'Market Cap', beta: 'Beta',
    riskLevel: 'Risk Level', volatility: 'Volatility',
    maxDrawdown: 'Max Drawdown (5Y)', percentile: '5Y Price Percentile',
    priceVsMedian: 'Price vs 5Y Median', zScore: 'Z-Score',
    cheap: 'Cheap', fair: 'Fair', expensive: 'Expensive',
    signals: 'Signals', warnings: 'Warnings',
    duration: 'Recommended Duration', week52: '52-Week Range',
    na: 'N/A', price: 'Price', belowNav: 'below NAV', aboveNav: 'above NAV',
  },
  bn: {
    fundamentals: 'মৌলিক তথ্য', returns: 'ঐতিহাসিক রিটার্ন',
    valuation: 'মূল্যায়ন বিশ্লেষণ', risk: 'ঝুঁকি প্রোফাইল',
    research: 'গবেষণা সংকেত', pe: 'পি/ই অনুপাত', eps: 'ইপিএস',
    nav: 'এনএভি', divYield: 'ডিভিডেন্ড ইল্ড', mktCap: 'মার্কেট ক্যাপ',
    beta: 'বিটা', riskLevel: 'ঝুঁকি স্তর', volatility: 'ভোলাটিলিটি',
    maxDrawdown: 'সর্বোচ্চ পতন (৫বছর)',
    percentile: '৫ বছরের মূল্য পার্সেন্টাইল',
    priceVsMedian: '৫ বছরের মিডিয়ানের তুলনায়', zScore: 'জেড-স্কোর',
    cheap: 'সস্তা', fair: 'ন্যায্য', expensive: 'ব্যয়বহুল',
    signals: 'সংকেত', warnings: 'সতর্কতা',
    duration: 'প্রস্তাবিত সময়কাল', week52: '৫২-সপ্তাহ পরিসীমা',
    na: 'N/A', price: 'মূল্য', belowNav: 'NAV-এর নিচে', aboveNav: 'NAV-এর উপরে',
  },
};

function formatVal(v, suffix = '') {
  if (v == null || v === '' || isNaN(v)) return null;
  return `${v}${suffix}`;
}

function formatMarketCap(mn) {
  if (mn == null || isNaN(mn)) return 'N/A';
  if (mn >= 10000) return `৳${(mn / 10000).toFixed(1)}K Cr`;
  if (mn >= 100) return `৳${(mn / 100).toFixed(1)} Cr`;
  return `৳${Math.round(mn)} M`;
}

function ReturnBar({ label, value }) {
  if (value == null) return null;
  const cls = value > 0 ? 'pos' : value < 0 ? 'neg' : 'neu';
  const sign = value > 0 ? '+' : '';
  // Scale bar width: cap at 100% display for ±100% return
  const barWidth = Math.min(Math.abs(value), 100);
  return (
    <div className={`stock-detail__return-bar ${cls}`}>
      <span className="stock-detail__return-label">{label}</span>
      <div className="stock-detail__return-track">
        <div className={`stock-detail__return-fill ${cls}`} style={{ width: `${barWidth}%` }} />
      </div>
      <span className="stock-detail__return-val">{sign}{value.toFixed(1)}%</span>
    </div>
  );
}

function PriceNavGauge({ price, nav, t }) {
  if (!price || !nav) return null;
  const ratio = price / nav;
  const discount = ((1 - ratio) * 100).toFixed(0);
  const isBelow = ratio < 1;
  return (
    <div className="stock-detail__pnav">
      <div className="stock-detail__pnav-bars">
        <div className="stock-detail__pnav-item">
          <span className="stock-detail__pnav-label">{t.price}</span>
          <div className="stock-detail__pnav-bar-wrap">
            <div className="stock-detail__pnav-bar price" style={{ width: `${Math.min((price / Math.max(price, nav)) * 100, 100)}%` }} />
          </div>
          <span className="stock-detail__pnav-val">৳{price}</span>
        </div>
        <div className="stock-detail__pnav-item">
          <span className="stock-detail__pnav-label">{t.nav}</span>
          <div className="stock-detail__pnav-bar-wrap">
            <div className="stock-detail__pnav-bar nav" style={{ width: `${Math.min((nav / Math.max(price, nav)) * 100, 100)}%` }} />
          </div>
          <span className="stock-detail__pnav-val">৳{nav}</span>
        </div>
      </div>
      <div className={`stock-detail__pnav-verdict ${isBelow ? 'pos' : 'neg'}`}>
        {isBelow ? `${Math.abs(discount)}% ${t.belowNav}` : `${discount}% ${t.aboveNav}`}
      </div>
    </div>
  );
}

function PercentileGauge({ value, t }) {
  if (value == null) return <span className="stock-detail__na">{t.na}</span>;
  const zone = value <= 30 ? 'cheap' : value <= 70 ? 'fair' : 'expensive';
  return (
    <div className="stock-detail__gauge">
      <div className="stock-detail__gauge-bar">
        <div className="stock-detail__gauge-marker" style={{ left: `${Math.min(value, 100)}%` }} />
      </div>
      <div className="stock-detail__gauge-labels">
        <span className="stock-detail__gauge-val">{Math.round(value)}th</span>
        <span className={`stock-detail__gauge-zone zone-${zone}`}>{t[zone]}</span>
      </div>
    </div>
  );
}

function RiskDots({ level }) {
  const dots = [];
  for (let i = 1; i <= 5; i++) {
    dots.push(
      <span key={i} className={`stock-detail__risk-dot ${i <= level ? 'active' : ''}`} />
    );
  }
  return <div className="stock-detail__risk-dots">{dots}</div>;
}

export default function StockProfile({ stock }) {
  const { language } = useApp();
  const { research, priceHistory } = useData();
  const t = L[language] || L.en;

  const stockResearch = useMemo(() => {
    if (!research || !stock) return null;
    // research can be an object keyed by ticker (overrides map)
    if (research[stock.ticker]) return research[stock.ticker];
    // or an array
    if (Array.isArray(research)) return research.find(r => r.ticker === stock.ticker);
    return null;
  }, [research, stock]);

  const week52Pct = useMemo(() => {
    if (!stock.week52Low || !stock.week52High || stock.week52High === stock.week52Low) return 50;
    return ((stock.currentPrice - stock.week52Low) / (stock.week52High - stock.week52Low)) * 100;
  }, [stock]);

  const changePct = stock.changePct ?? stock.return1d;
  const displayName = language === 'bn' && stock.nameBn ? stock.nameBn : stock.name;
  const displaySector = language === 'bn' && stock.sectorBn ? stock.sectorBn : stock.sector;

  return (
    <div className="stock-detail__profile">
      {/* Header Card */}
      <div className="stock-detail__card stock-detail__header" style={{ animationDelay: '0s' }}>
        <div className="stock-detail__header-top">
          <h2>{displayName}</h2>
          <div className="stock-detail__badges">
            <span className="stock-detail__badge-ticker">{stock.ticker}</span>
            <span className={`stock-detail__badge-cat cat-${stock.category}`}>{stock.category}</span>
          </div>
        </div>
        <p className="stock-detail__sector">{displaySector}</p>
        <div className="stock-detail__price-row">
          <span className="stock-detail__price">৳{stock.currentPrice}</span>
          {changePct != null && (
            <span className={`stock-detail__change ${changePct >= 0 ? 'pos' : 'neg'}`}>
              {changePct >= 0 ? '▲' : '▼'} {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          )}
        </div>
        {stock.week52Low != null && stock.week52High != null && (
          <div className="stock-detail__52w">
            <div className="stock-detail__52w-ends">
              <span>৳{stock.week52Low}</span>
              <span className="stock-detail__52w-label">{t.week52}</span>
              <span>৳{stock.week52High}</span>
            </div>
            <div className="stock-detail__52w-bar">
              <div className="stock-detail__52w-fill" style={{ width: `${Math.max(2, Math.min(98, week52Pct))}%` }} />
            </div>
          </div>
        )}
        {priceHistory[stock.ticker]?.length >= 2 && (
          <Sparkline data={priceHistory[stock.ticker]} />
        )}
      </div>

      <div className="stock-detail__grid">
        {/* Fundamentals */}
        <div className="stock-detail__card" style={{ animationDelay: '0.05s' }}>
          <h3>📊 {t.fundamentals}</h3>
          <div className="stock-detail__metrics">
            <div className="stock-detail__metric"><span>{t.pe}</span> <strong>{formatVal(stock.peRatio, 'x') || t.na}</strong></div>
            <div className="stock-detail__metric"><span>{t.eps}</span> <strong>৳{formatVal(stock.eps) || t.na}</strong></div>
            <div className="stock-detail__metric"><span>{t.nav}</span> <strong>৳{formatVal(stock.nav) || t.na}</strong></div>
            <div className="stock-detail__metric"><span>{t.divYield}</span> <strong>{formatVal(stock.dividendYield, '%') || t.na}</strong></div>
            <div className="stock-detail__metric"><span>{t.mktCap}</span> <strong>{formatMarketCap(stock.marketCapMn)}</strong></div>
            <div className="stock-detail__metric"><span>{t.beta}</span> <strong>{formatVal(stock.beta) || t.na}</strong></div>
          </div>
          <PriceNavGauge price={stock.currentPrice} nav={stock.nav} t={t} />
        </div>

        {/* Returns */}
        <div className="stock-detail__card" style={{ animationDelay: '0.1s' }}>
          <h3>📈 {t.returns}</h3>
          <div className="stock-detail__returns">
            <ReturnBar label="1D" value={stock.return1d} />
            <ReturnBar label="15D" value={stock.return15d} />
            <ReturnBar label="1M" value={stock.return1m} />
            <ReturnBar label="1Y" value={stock.historicalReturn1Y} />
            <ReturnBar label="3Y" value={stock.historicalReturn3Y} />
            <ReturnBar label="5Y" value={stock.historicalReturn5Y} />
          </div>
        </div>

        {/* Valuation */}
        <div className="stock-detail__card" style={{ animationDelay: '0.15s' }}>
          <h3>🎯 {t.valuation}</h3>
          <div className="stock-detail__valuation">
            <div className="stock-detail__val-row">
              <span>{t.percentile}</span>
              <PercentileGauge value={stock.percentile5Y} t={t} />
            </div>
            <div className="stock-detail__val-row">
              <span>{t.priceVsMedian}</span>
              <strong className={stock.priceVsMedian5Y < 1 ? 'pos' : stock.priceVsMedian5Y > 1.1 ? 'neg' : ''}>
                {formatVal(stock.priceVsMedian5Y, 'x') || t.na}
              </strong>
            </div>
            <div className="stock-detail__val-row">
              <span>{t.zScore}</span>
              <strong>{formatVal(stock.zScore5Y) || t.na}</strong>
            </div>
          </div>
        </div>

        {/* Risk */}
        <div className="stock-detail__card" style={{ animationDelay: '0.2s' }}>
          <h3>⚡ {t.risk}</h3>
          <div className="stock-detail__risk-section">
            <div className="stock-detail__val-row">
              <span>{t.riskLevel}</span>
              <RiskDots level={stock.riskLevel} />
            </div>
            <div className="stock-detail__val-row">
              <span>{t.volatility}</span>
              <strong>{formatVal(stock.volatilityAnnual, '%') || t.na}</strong>
            </div>
            <div className="stock-detail__val-row">
              <span>{t.maxDrawdown}</span>
              <strong className="neg">{formatVal(stock.maxDrawdown5Y, '%') || t.na}</strong>
            </div>
          </div>
        </div>

        {/* Research */}
        {stockResearch && (
          <div className="stock-detail__card stock-detail__card--full" style={{ animationDelay: '0.25s' }}>
            <h3>🔬 {t.research}</h3>
            <div className={`stock-detail__action-badge action-${stockResearch.action?.toLowerCase()}`}>
              {language === 'bn' && stockResearch.labelBn ? stockResearch.labelBn : stockResearch.label}
            </div>
            <p className="stock-detail__reason">
              {language === 'bn' && stockResearch.reasonBn ? stockResearch.reasonBn : stockResearch.reason}
            </p>
            {stockResearch.duration && (
              <p className="stock-detail__duration">
                {t.duration}: {language === 'bn' && stockResearch.durationBn ? stockResearch.durationBn : stockResearch.duration}
              </p>
            )}
            {stockResearch.warnings?.length > 0 && (
              <div className="stock-detail__warnings">
                {(language === 'bn' && stockResearch.warningsBn ? stockResearch.warningsBn : stockResearch.warnings).map((w, i) => (
                  <div key={i} className="stock-detail__warning">{w}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
