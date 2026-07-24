import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PortfolioList from './PortfolioList';
import PortfolioDetail from './PortfolioDetail';
import './Portfolio.css';

const Portfolio = () => {
  const { user, login } = useAuth();
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);

  if (!user) {
    return (
      <div className="portfolio portfolio__signin">
        <h2>Portfolio Management</h2>
        <p>Please sign in to manage your portfolios.</p>
        <button className="portfolio__create-btn" onClick={login}>Sign In</button>
      </div>
    );
  }

  return (
    <div className="portfolio">
      {selectedPortfolio ? (
        <PortfolioDetail 
          portfolioId={selectedPortfolio.id} 
          portfolioName={selectedPortfolio.name}
          maxHoldMonths={selectedPortfolio.maxHoldMonths || null}
          onBack={() => setSelectedPortfolio(null)} 
        />
      ) : (
        <PortfolioList onSelect={(id, name, maxHoldMonths) => setSelectedPortfolio({ id, name, maxHoldMonths })} />
      )}
    </div>
  );
};

export default Portfolio;
