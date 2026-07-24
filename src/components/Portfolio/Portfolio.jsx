import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PortfolioList from './PortfolioList';
import PortfolioDetail from './PortfolioDetail';
import './Portfolio.css';

const Portfolio = () => {
  const { user, login } = useAuth();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);
  const [selectedPortfolioName, setSelectedPortfolioName] = useState('');

  if (!user) {
    return (
      <div className="portfolio portfolio__signin">
        <h2>Portfolio Management</h2>
        <p>Please sign in to manage your portfolios.</p>
        <button className="portfolio__create-btn" onClick={login}>Sign In</button>
      </div>
    );
  }

  const handleSelect = (id, name) => {
    setSelectedPortfolioId(id);
    setSelectedPortfolioName(name);
  };

  const handleBack = () => {
    setSelectedPortfolioId(null);
    setSelectedPortfolioName('');
  };

  return (
    <div className="portfolio">
      {selectedPortfolioId ? (
        <PortfolioDetail 
          portfolioId={selectedPortfolioId} 
          portfolioName={selectedPortfolioName} 
          onBack={handleBack} 
        />
      ) : (
        <PortfolioList onSelect={handleSelect} />
      )}
    </div>
  );
};

export default Portfolio;
