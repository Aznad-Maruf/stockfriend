import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { createPortfolio, loadPortfolios, deletePortfolio, addHolding } from '../../services/userService';

const PortfolioList = ({ onSelect }) => {
  const { user } = useAuth();
  const { language } = useApp();
  const [portfolios, setPortfolios] = useState([]);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [newMaxHold, setNewMaxHold] = useState('');

  const handleImportBrokerage = async () => {
    setImporting(true);
    try {
      const pid = await createPortfolio(user.uid, 'Brokerage Portfolio', 4);
      const holdings = [
        { ticker: 'ABBANK', name: 'AB Bank PLC.', quantity: 700, buyPrice: 4.62 },
        { ticker: 'BATBC', name: 'British American Tobacco Bangladesh', quantity: 30, buyPrice: 218.77 },
        { ticker: 'GP', name: 'Grameenphone Ltd.', quantity: 213, buyPrice: 251.18 },
        { ticker: 'MERCANBANK', name: 'Mercantile Bank PLC.', quantity: 13800, buyPrice: 7.23 },
        { ticker: 'PREMIERBAN', name: 'The Premier Bank PLC.', quantity: 11900, buyPrice: 4.52 },
        { ticker: 'SQURPHARMA', name: 'Square Pharmaceuticals PLC.', quantity: 100, buyPrice: 218.27 },
        { ticker: 'TRUSTBANK', name: 'Trust Bank PLC.', quantity: 1500, buyPrice: 16.16 },
        { ticker: 'WALTONHIL', name: 'Walton Hi-Tech Industries PLC', quantity: 2, buyPrice: 364.05 },
        { ticker: 'BEXIMCO', name: 'Bangladesh Export Import Company Ltd.', quantity: 380, buyPrice: 27.08 },
      ];
      for (const h of holdings) {
        await addHolding(user.uid, pid, h);
      }
      await fetchPortfolios();
    } catch (err) {
      console.error(err);
      setError('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      const data = await loadPortfolios(user.uid);
      setPortfolios(data);
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

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this portfolio?')) {
      try {
        await deletePortfolio(user.uid, id);
        await fetchPortfolios();
      } catch (err) {
        console.error(err);
        setError('Failed to delete portfolio');
      }
    }
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
        <button
          type="button"
          className="portfolio__create-btn"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          onClick={handleImportBrokerage}
          disabled={importing}
        >
          {importing ? 'Importing...' : '📥 Import Brokerage'}
        </button>
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
                  Created: {new Date(p.createdAt?.toDate ? p.createdAt.toDate() : p.createdAt).toLocaleDateString()}
                  {p.maxHoldMonths && ` • ⏱ ${p.maxHoldMonths}mo max`}
                  {p.holdingCount !== undefined && ` • ${p.holdingCount} Holdings`}
                </p>
              </div>
              <button 
                className="portfolio__card-delete" 
                onClick={(e) => handleDelete(e, p.id)}
                title="Delete Portfolio"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfolioList;
