import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { translations } from '../../data/i18n';
import { getRiskColor } from '../../engine';
import { savePortfolio } from '../../services/userService';
import { formatBDT } from '../../utils/formatters';
import { horizonToCategory, formatHorizonDuration } from '../../utils/horizonUtils';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ScraperStatus from '../ScraperStatus/ScraperStatus';
import './Results.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const CHART_COLORS = [
  '#0d9488', '#f97316', '#6366f1', '#ec4899',
  '#8b5cf6', '#14b8a6', '#f59e0b', '#06b6d4', '#22c55e',
];

export default function Results() {
  const { results, answers, language, resetAssessment, editAssessment } = useApp();
  const { priceStatus } = useData();
  const { user, isLoggedIn, signInWithGoogle } = useAuth();
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const t = translations[language];

  if (!results) return null;

  const { recommendations, summary } = results;

  const riskOption = answers.risk
    ? t.wizard.questions.risk.options[answers.risk]?.label
    : '—';
  const horizonOption = answers.horizon
    ? formatHorizonDuration(answers.horizon, language)
    : '—';
  const goalOption = answers.goal
    ? t.wizard.questions.goal.options[answers.goal]?.label
    : '—';

  const chartData = {
    labels: summary.sectorBreakdown.map((s) =>
      language === 'bn' ? s.sectorBn : s.sector
    ),
    datasets: [
      {
        data: summary.sectorBreakdown.map((s) => s.percentage),
        backgroundColor: CHART_COLORS.slice(0, summary.sectorBreakdown.length),
        borderWidth: 0,
        hoverBorderWidth: 2,
        hoverBorderColor: '#ffffff',
        spacing: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '62%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${ctx.parsed}%`,
        },
      },
    },
  };

  return (
    <div className="results">
      <header className="results__header">
        <h1 className="results__title">{t.results.title}</h1>
        <p className="results__subtitle">{t.results.subtitle}</p>
        <div className="results__price-status">
          <span className={`results__status-dot ${priceStatus.live ? 'results__status-dot--live' : 'results__status-dot--static'}`} />
          <span className="results__status-text">
            {priceStatus.live
              ? (language === 'bn' ? 'ডিএসই লাইভ মূল্য' : 'Live DSE Prices')
              : (language === 'bn' ? 'স্ট্যাটিক মূল্য' : 'Static Prices')}
          </span>
          {priceStatus.timestamp && (
            <span className="results__status-time">
              {new Date(priceStatus.timestamp).toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div style={{ marginTop: 'var(--space-4)' }}>
          <ScraperStatus />
        </div>
      </header>

      {/* Profile Summary */}
      <section className="results__profile">
        <h3 className="results__profile-heading">{t.results.profileSummary}</h3>
        <div className="results__profile-grid">
          <div className="results__profile-item">
            <span className="results__profile-label">{t.results.riskLabel}</span>
            <span className="results__profile-value">{riskOption}</span>
          </div>
          <div className="results__profile-item">
            <span className="results__profile-label">{t.results.horizonLabel}</span>
            <span className="results__profile-value">{horizonOption}</span>
          </div>
          <div className="results__profile-item">
            <span className="results__profile-label">{t.results.budgetLabel}</span>
            <span className="results__profile-value">{formatBDT(answers.budget)}</span>
          </div>
          <div className="results__profile-item">
            <span className="results__profile-label">{t.results.goalLabel}</span>
            <span className="results__profile-value">{goalOption}</span>
          </div>
        </div>
      </section>

      {/* Portfolio Overview */}
      <section className="results__portfolio">
        <h2 className="results__section-title">{t.results.portfolio.title}</h2>
        <div className="results__portfolio-grid">
          <div className="results__stat-card">
            <span className="results__stat-label">{t.results.portfolio.totalInvestment}</span>
            <span className="results__stat-value">{formatBDT(summary.totalInvestment)}</span>
          </div>
          <div className="results__stat-card results__stat-card--gain">
            <span className="results__stat-label">{t.results.portfolio.projectedValue}</span>
            <span className="results__stat-value results__stat-value--gain">
              {formatBDT(summary.projectedValue)}
            </span>
          </div>
          <div className="results__stat-card results__stat-card--gain">
            <span className="results__stat-label">{t.results.portfolio.projectedGain}</span>
            <span className="results__stat-value results__stat-value--gain">
              {formatBDT(summary.projectedGain)}
              <span className="results__stat-percent">+{summary.projectedReturnPercent}%</span>
            </span>
          </div>
        </div>
      </section>

      {/* Sector Diversification */}
      {summary.sectorBreakdown.length > 0 && (
        <section className="results__diversification">
          <h2 className="results__section-title">
            {t.results.portfolio.sectorDiversification}
          </h2>
          <div className="results__chart-wrapper">
            <div className="results__chart-container">
              <Doughnut data={chartData} options={chartOptions} />
            </div>
            <ul className="results__chart-legend">
              {summary.sectorBreakdown.map((s, i) => (
                <li key={s.sector} className="results__legend-item">
                  <span
                    className="results__legend-dot"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="results__legend-label">
                    {language === 'bn' ? s.sectorBn : s.sector}
                  </span>
                  <span className="results__legend-pct">{s.percentage}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Stock Recommendation Cards */}
      <section className="results__recommendations">
        {recommendations.map((rec, index) => {
          const stock = rec.stock;
          const stockName = language === 'bn' ? stock.nameBn : stock.name;
          const sectorName = language === 'bn' ? stock.sectorBn : stock.sector;
          const rationale = language === 'bn' ? rec.rationaleBn : rec.rationale;
          const riskLabel = t.results.riskLevels[stock.riskLevel] || '—';
          const riskColor = getRiskColor(stock.riskLevel);

          // Calculate position in 52-week range (0 = at high, 1 = at low)
          const w52Range = stock.week52High && stock.week52Low && stock.week52High > stock.week52Low;
          const w52Position = w52Range
            ? (stock.week52High - stock.currentPrice) / (stock.week52High - stock.week52Low)
            : 0;
          const nearLow = w52Position >= 0.6;
          const dropPct = w52Range
            ? Math.round(((stock.week52High - stock.currentPrice) / stock.week52High) * 100)
            : 0;

          return (
            <article
              key={stock.ticker}
              className="results__stock-card"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="results__stock-header">
                <span className="results__stock-rank">#{index + 1}</span>
                <div className="results__stock-identity">
                  <h3 className="results__stock-name">{stockName}</h3>
                  <div className="results__stock-badges">
                    <span className="results__stock-ticker">{stock.ticker}</span>
                    <span className={`results__cat-badge results__cat-badge--${(stock.category || 'a').toLowerCase()}`}>{stock.category || 'A'}</span>
                    {nearLow && dropPct >= 15 && (
                      <span className="results__discount-badge">
                        ↓{dropPct}% {language === 'bn' ? '৫২W সর্বোচ্চ থেকে' : 'from 52W high'}
                      </span>
                    )}
                  </div>
                </div>
                <span className="results__stock-sector">{sectorName}</span>
              </div>

              <div className="results__stock-metrics">
                <div className="results__metric">
                  <span className="results__metric-label">
                    {t.results.stockCard.currentPrice}
                  </span>
                  <span className="results__metric-value">
                    {formatBDT(stock.currentPrice)}
                    {w52Range && (
                      <span className="results__metric-sub results__metric-sub--avg">
                        52W: {formatBDT(stock.week52Low)} – {formatBDT(stock.week52High)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="results__metric">
                  <span className="results__metric-label">
                    {t.results.stockCard.allocation}
                  </span>
                  <span className="results__metric-value">
                    {rec.allocationPercent}%
                    <span className="results__metric-sub">
                      ({formatBDT(rec.allocationAmount)})
                    </span>
                  </span>
                </div>
                <div className="results__metric">
                  <span className="results__metric-label">
                    {t.results.stockCard.tentativeReturn}
                  </span>
                  <span className="results__metric-value results__metric-value--gain">
                    +{rec.tentativeReturnPercent}%
                    <span className="results__metric-sub">
                      ({formatBDT(rec.tentativeReturnAmount)})
                    </span>
                  </span>
                </div>
                <div className="results__metric">
                  <span className="results__metric-label">
                    {t.results.stockCard.riskLevel}
                  </span>
                  <span
                    className="results__risk-badge"
                    style={{
                      backgroundColor: riskColor + '18',
                      color: riskColor,
                      borderColor: riskColor + '30',
                    }}
                  >
                    {riskLabel}
                  </span>
                </div>
              </div>

              <div className="results__stock-rationale">
                <span className="results__rationale-label">
                  {t.results.stockCard.rationale}
                </span>
                <p className="results__rationale-text">{rationale}</p>
                {rec.researchContext && (
                  <div className="results__research-context">
                    <div className="results__research-badge">
                      🔬 {language === 'bn' ? 'গবেষণা-ভিত্তিক' : 'Research-backed'}
                    </div>
                    <p className="results__research-reason">
                      {language === 'bn' ? rec.researchContext.reasonBn : rec.researchContext.reason}
                    </p>
                    {(language === 'bn' ? rec.researchContext.warningsBn : rec.researchContext.warnings)?.length > 0 && (
                      <div className="results__research-warnings">
                        {(language === 'bn' ? rec.researchContext.warningsBn : rec.researchContext.warnings).map((w, i) => (
                          <span key={i} className="results__research-warning">{w}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {/* Actions */}
      <div className="results__actions">
        {isLoggedIn ? (
          <button
            className={`results__save-btn ${saveStatus === 'saved' ? 'results__save-btn--saved' : ''}`}
            disabled={saveStatus === 'saving' || saveStatus === 'saved'}
            onClick={async () => {
              setSaveStatus('saving');
              try {
                await savePortfolio(user.uid, {
                  name: new Date().toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                  answers,
                  recommendations: recommendations.map(r => ({
                    ticker: r.stock.ticker, name: r.stock.name, sector: r.stock.sector,
                    allocationPercent: r.allocationPercent, score: r.score,
                    tentativeReturnPercent: r.tentativeReturnPercent,
                  })),
                  summary,
                });
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(null), 3000);
              } catch (e) {
                console.error('Save failed:', e);
                setSaveStatus('error');
                setTimeout(() => setSaveStatus(null), 3000);
              }
            }}
          >
            {saveStatus === 'saving' ? (language === 'en' ? 'Saving...' : 'সেভ হচ্ছে...') :
             saveStatus === 'saved' ? (language === 'en' ? '✓ Portfolio Saved' : '✓ পোর্টফোলিও সেভ হয়েছে') :
             saveStatus === 'error' ? (language === 'en' ? 'Save failed' : 'সেভ ব্যর্থ') :
             (language === 'en' ? '💾 Save Portfolio' : '💾 পোর্টফোলিও সেভ করুন')}
          </button>
        ) : (
          <button className="results__save-btn results__save-btn--signin" onClick={signInWithGoogle}>
            {language === 'en' ? '🔒 Sign in to Save Portfolio' : '🔒 পোর্টফোলিও সেভ করতে সাইন ইন করুন'}
          </button>
        )}
        <button className="results__edit-btn" onClick={editAssessment}>
          {language === 'en' ? '✏️ Edit Assessment' : '✏️ মূল্যায়ন সম্পাদনা'}
        </button>
        <button className="results__retake-btn" onClick={resetAssessment}>
          {t.results.retake}
        </button>
      </div>

      {/* Disclaimer */}
      <footer className="results__disclaimer">
        <p>{t.results.disclaimer}</p>
      </footer>
    </div>
  );
}
