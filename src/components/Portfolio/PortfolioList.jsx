import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import { createPortfolio, loadPortfolios, deletePortfolio, loadHoldings } from '../../services/userService';
import ConfirmDialog from '../common/ConfirmDialog';

const PortfolioList = ({ onSelect }) => {
  const { user } = useAuth();
  const { language } = useApp();
  const { stocks } = useData();
  const [portfolios, setPortfolios] = useState([]);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMaxHold, setNewMaxHold] = useState('');
  const [deletingPortfolio, setDeletingPortfolio] = useState(null);

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      const data = await loadPortfolios(user.uid);
      // Load holdings for each portfolio to compute totals
      const enriched = await Promise.all(data.map(async (p) => {
        try {
          const holdings = await loadHoldings(user.uid, p.id);
          const totalCost = holdings.reduce((sum, h) => sum + h.quantity * h.buyPrice, 0);
          const totalCurrent = holdings.reduce((sum, h) => {
            const live = stocks?.find(s => s.ticker === h.ticker);
            const price = live?.currentPrice || h.buyPrice;
            return sum + h.quantity * price;
          }, 0);
          return { ...p, holdingCount: holdings.length, totalCost, totalCurrent };
        } catch {
          return { ...p, holdingCount: 0, totalCost: 0, totalCurrent: 0 };
        }
      }));
      setPortfolios(enriched);
    } catch (err) {
      console.error(err);
      setError('Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchPortfolios();
    }
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) return;
    try {
      await createPortfolio(user.uid, newPortfolioName.trim(), newMaxHold ? parseInt(newMaxHold) : null);
      setNewPortfolioName('');
      setNewMaxHold('');
      await fetchPortfolios();
    } catch (err) {
      console.error(err);
      setError('Failed to create portfolio');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPortfolio) return;
    try {
      await deletePortfolio(user.uid, deletingPortfolio.id);
      await fetchPortfolios();
    } catch (err) {
      console.error(err);
      setError('Failed to delete portfolio');
    }
    setDeletingPortfolio(null);
  };

  if (loading) return <div className="portfolio__loading">Loading...</div>;

  return (
    <div className="portfolio__list-view" data-lang={language}>
      <div className="portfolio__header">
        <h2>Your Portfolios</h2>
      </div>

      {error && <div className="portfolio__error">{error}</div>}

      <form className="portfolio__create" onSubmit={handleCreate}>
        <input 
          type="text" 
          className="portfolio__create-input" 
          placeholder="New Portfolio Name" 
          value={newPortfolioName}
          onChange={(e) => setNewPortfolioName(e.target.value)}
        />
        <select
          className="portfolio__create-select"
          value={newMaxHold}
          onChange={(e) => setNewMaxHold(e.target.value)}
        >
          <option value="">No time limit</option>
          <option value="1">1 month</option>
          <option value="2">2 months</option>
          <option value="3">3 months</option>
          <option value="4">4 months</option>
          <option value="6">6 months</option>
          <option value="12">1 year</option>
          <option value="24">2 years</option>
        </select>
        <button type="submit" className="portfolio__create-btn">+ Create Portfolio</button>

      </form>

      {portfolios.length === 0 ? (
        <div className="portfolio__empty">
          <p>No portfolios yet. Create one to start tracking your investments.</p>
        </div>
      ) : (
        <div className="portfolio__grid">
          {portfolios.map(p => (
            <div 
              key={p.id} 
              className="portfolio__card" 
              onClick={() => onSelect(p.id, p.name, p.maxHoldMonths)}
            >
              <div className="portfolio__card-content">
                <h3 className="portfolio__card-name">{p.name}</h3>
                <p className="portfolio__card-meta">
                  {p.holdingCount || 0} stocks
                  {p.maxHoldMonths && ` • ⏱ ${p.maxHoldMonths}mo max`}
                </p>
                {p.totalCost > 0 && (() => {
                  const pnl = p.totalCurrent - p.totalCost;
                  const pnlPct = (pnl / p.totalCost) * 100;
                  const isProfit = pnl >= 0;
                  return (
                    <div className="portfolio__card-values">
                      <span className="portfolio__card-cost">Cost: ৳{p.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      <span className="portfolio__card-current">Now: ৳{p.totalCurrent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      <span className={isProfit ? 'portfolio__pnl--profit' : 'portfolio__pnl--loss'}>
                        {isProfit ? '+' : ''}৳{pnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({isProfit ? '+' : ''}{pnlPct.toFixed(1)}%)
                      </span>
                    </div>
                  );
                })()}
              </div>
              <button 
                className="portfolio__card-delete" 
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingPortfolio(p);
                }}
                title="Delete Portfolio"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {deletingPortfolio && (
        <ConfirmDialog
          title="Delete Portfolio?"
          message={`Are you sure you want to delete "${deletingPortfolio.name}"? All its holdings will be permanently lost.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingPortfolio(null)}
        />
      )}
    </div>
  );
};

export default PortfolioList;
