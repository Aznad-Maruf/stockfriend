import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { createPortfolio, loadPortfolios, deletePortfolio } from '../../services/userService';

const PortfolioList = ({ onSelect }) => {
  const { user } = useAuth();
  const { language } = useApp();
  const [portfolios, setPortfolios] = useState([]);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      await createPortfolio(user.uid, newPortfolioName.trim());
      setNewPortfolioName('');
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
              onClick={() => onSelect(p.id, p.name)}
            >
              <div className="portfolio__card-content">
                <h3 className="portfolio__card-name">{p.name}</h3>
                <p className="portfolio__card-meta">
                  Created: {new Date(p.createdAt?.toDate ? p.createdAt.toDate() : p.createdAt).toLocaleDateString()}
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
