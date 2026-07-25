import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useApp } from '../../context/AppContext';
import { loadHoldings, removeHolding } from '../../services/userService';
import { generateHoldingSuggestion } from '../../engine/suggestion';
import AddHoldingModal from './AddHoldingModal';

const PortfolioDetail = ({ portfolioId, portfolioName, maxHoldMonths, onBack }) => {
  const { user } = useAuth();
  const { stocks, research } = useData();
  const { language } = useApp();
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const isEn = language === 'en';

  const fetchHoldings = async () => {
    try {
      setLoading(true);
      const data = await loadHoldings(user.uid, portfolioId);
      setHoldings(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load holdings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoldings();
  }, [user, portfolioId]);

  const handleDelete = async (holdingId) => {
    if (window.confirm('Remove this holding?')) {
      try {
        await removeHolding(user.uid, portfolioId, holdingId);
        await fetchHoldings();
      } catch (err) {
        console.error(err);
        setError('Failed to remove holding');
      }
    }
  };

  const formatCurrency = (amount) => {
    return '৳' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPct = (pct) => {
    return Number(pct).toFixed(2) + '%';
  };

  // Compute live data + suggestions
  const enrichedHoldings = holdings.map(h => {
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
      name: liveStock?.name || h.name || h.ticker
    };
  });

  const totalInvested = enrichedHoldings.reduce((sum, h) => sum + h.costBasis, 0);
  const totalCurrent = enrichedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  if (loading) return <div className="portfolio__loading">Loading...</div>;

  return (
    <div className="portfolio__detail" data-lang={language}>
      <div className="portfolio__header">
        <button className="portfolio__back-btn" onClick={onBack}>← {isEn ? 'Back' : 'পেছনে'}</button>
        <h2>
          {portfolioName}
          {maxHoldMonths && (
            <span className="portfolio__time-badge">⏱ {maxHoldMonths}{isEn ? 'mo max' : ' মাস'}</span>
          )}
        </h2>
        <button className="portfolio__add-btn" onClick={() => setShowAddModal(true)}>+ {isEn ? 'Add Holding' : 'যোগ করুন'}</button>
      </div>

      {error && <div className="portfolio__error">{error}</div>}

      <div className="portfolio__summary">
        <div className="portfolio__summary-item">
          <span>{isEn ? 'Invested' : 'বিনিয়োগ'}</span>
          <strong>{formatCurrency(totalInvested)}</strong>
        </div>
        <div className="portfolio__summary-item">
          <span>{isEn ? 'Current Value' : 'বর্তমান মূল্য'}</span>
          <strong>{formatCurrency(totalCurrent)}</strong>
        </div>
        <div className="portfolio__summary-item">
          <span>{isEn ? 'Total P/L' : 'মোট লাভ/ক্ষতি'}</span>
          <strong className={totalPnl >= 0 ? 'portfolio__summary-value--profit' : 'portfolio__summary-value--loss'}>
            {totalPnl > 0 ? '+' : ''}{formatCurrency(totalPnl)}
          </strong>
        </div>
        <div className="portfolio__summary-item">
          <span>{isEn ? 'P/L %' : 'লাভ/ক্ষতি %'}</span>
          <strong className={totalPnlPct >= 0 ? 'portfolio__summary-value--profit' : 'portfolio__summary-value--loss'}>
            {totalPnlPct > 0 ? '+' : ''}{formatPct(totalPnlPct)}
          </strong>
        </div>
      </div>

      {enrichedHoldings.length === 0 ? (
        <div className="portfolio__empty">
          <p>{isEn ? 'No holdings yet. Add stocks to track your portfolio.' : 'এখনো কোনো হোল্ডিং নেই। আপনার পোর্টফোলিও ট্র্যাক করতে স্টক যোগ করুন।'}</p>
        </div>
      ) : (
        <>
          {/* Holdings Table */}
          <div className="portfolio__table-wrapper">
            <table className="portfolio__table">
              <thead>
                <tr>
                  <th>{isEn ? 'Ticker' : 'টিকার'}</th>
                  <th>{isEn ? 'Name' : 'নাম'}</th>
                  <th>{isEn ? 'Qty' : 'পরিমাণ'}</th>
                  <th>{isEn ? 'Avg Cost' : 'গড় মূল্য'} (৳)</th>
                  <th>{isEn ? 'Current' : 'বর্তমান'} (৳)</th>
                  <th>{isEn ? 'Invested' : 'বিনিয়োগ'}</th>
                  <th>{isEn ? 'Value' : 'মূল্য'}</th>
                  <th>{isEn ? 'P/L' : 'লাভ/ক্ষতি'} (৳)</th>
                  <th>{isEn ? 'P/L%' : '%'}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {enrichedHoldings.map(h => (
                  <tr key={h.id}>
                    <td><strong>{h.ticker}</strong></td>
                    <td>{h.name}</td>
                    <td>{h.quantity}</td>
                    <td>{formatCurrency(h.buyPrice)}</td>
                    <td>{formatCurrency(h.currentPrice)}</td>
                    <td>{formatCurrency(h.costBasis)}</td>
                    <td>{formatCurrency(h.currentValue)}</td>
                    <td className={h.pnl >= 0 ? 'portfolio__pnl--profit' : 'portfolio__pnl--loss'}>
                      {h.pnl > 0 ? '+' : ''}{formatCurrency(h.pnl)}
                    </td>
                    <td className={h.pnlPct >= 0 ? 'portfolio__pnl--profit' : 'portfolio__pnl--loss'}>
                      {h.pnlPct > 0 ? '+' : ''}{formatPct(h.pnlPct)}
                    </td>
                    <td>
                      <button className="portfolio__card-delete" onClick={() => handleDelete(h.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Suggestions Section */}
          <section className="portfolio__suggestions">
            <h3 className="portfolio__suggestions-title">
              {isEn ? '💡 Suggestions' : '💡 পরামর্শ'}
            </h3>
            <div className="portfolio__suggestions-grid">
              {enrichedHoldings.map(h => {
                const s = h.suggestion;
                const actionClass = `portfolio__suggestion-badge--${s.action}`;
                return (
                  <div key={h.id} className="portfolio__suggestion-card">
                    <div className="portfolio__suggestion-header">
                      <span className="portfolio__suggestion-ticker">{h.ticker}</span>
                      <span className={`portfolio__suggestion-badge ${actionClass}`}>
                        {isEn ? s.label : s.labelBn}
                      </span>
                    </div>
                    {(s.duration || s.durationBn) && (
                      <div className="portfolio__suggestion-duration">
                        ⏱ {isEn ? s.duration : s.durationBn}
                      </div>
                    )}
                    <p className="portfolio__suggestion-reason">
                      {isEn ? s.reason : s.reasonBn}
                    </p>
                    {s.researchBacked && (
                      <div className="portfolio__suggestion-research">
                        🔬 {isEn ? `Research-backed (${s.researchDate})` : `গবেষণা-ভিত্তিক (${s.researchDate})`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {showAddModal && (
        <AddHoldingModal 
          portfolioId={portfolioId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchHoldings();
          }}
        />
      )}
    </div>
  );
};

export default PortfolioDetail;
