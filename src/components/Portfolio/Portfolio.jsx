import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import PortfolioList from './PortfolioList';
import PortfolioDetail from './PortfolioDetail';
import { loadPortfolios } from '../../services/userService';
import './Portfolio.css';

const Portfolio = () => {
  const { user, login } = useAuth();
  const { portfolioRoute, setPage } = useApp();
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);

  // Deep-link: if URL has portfolio ID, load it
  useEffect(() => {
    if (portfolioRoute && user && !selectedPortfolio) {
      loadPortfolios(user.uid).then(portfolios => {
        const found = portfolios.find(p => p.id === portfolioRoute);
        if (found) {
          setSelectedPortfolio({ id: found.id, name: found.name, maxHoldMonths: found.maxHoldMonths });
        }
      }).catch(() => {});
    }
    if (!portfolioRoute) {
      setSelectedPortfolio(null);
    }
  }, [portfolioRoute, user]);

  if (!user) {
    return (
      <div className="portfolio portfolio__signin">
        <h2>Portfolio Management</h2>
        <p>Please sign in to manage your portfolios.</p>
        <button className="portfolio__create-btn" onClick={login}>Sign In</button>
      </div>
    );
  }

  const handleSelect = (id, name, maxHoldMonths) => {
    setSelectedPortfolio({ id, name, maxHoldMonths });
    setPage('portfolio', id);
  };

  const handleBack = () => {
    setSelectedPortfolio(null);
    setPage('portfolio');
  };

  return (
    <div className="portfolio">
      {selectedPortfolio ? (
        <PortfolioDetail 
          portfolioId={selectedPortfolio.id} 
          portfolioName={selectedPortfolio.name}
          maxHoldMonths={selectedPortfolio.maxHoldMonths || null}
          onBack={handleBack} 
        />
      ) : (
        <PortfolioList onSelect={handleSelect} />
      )}
    </div>
  );
};

export default Portfolio;
