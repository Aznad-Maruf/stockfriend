import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useApp } from '../../context/AppContext';
import { addHolding, updateHolding } from '../../services/userService';

const AddHoldingModal = ({ portfolioId, onClose, onAdded, editHolding = null }) => {
  const { user } = useAuth();
  const { stocks } = useData();
  const { language } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editHolding) {
      setSearchQuery(`${editHolding.ticker} - ${editHolding.name}`);
      setSelectedStock({ ticker: editHolding.ticker, name: editHolding.name });
      setQuantity(editHolding.quantity || '');
      setBuyPrice(editHolding.buyPrice || '');
      if (editHolding.buyDate) {
        const dateStr = typeof editHolding.buyDate === 'string' 
          ? editHolding.buyDate.split('T')[0] 
          : new Date(editHolding.buyDate).toISOString().split('T')[0];
        setBuyDate(dateStr);
      }
    }
  }, [editHolding]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const q = searchQuery.toLowerCase();
      const matches = (stocks || []).filter(s => 
        s.ticker.toLowerCase().includes(q) || 
        (s.name && s.name.toLowerCase().includes(q))
      ).slice(0, 5);
      setFilteredStocks(matches);
    } else {
      setFilteredStocks([]);
    }
  }, [searchQuery, stocks]);

  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setSearchQuery(`${stock.ticker} - ${stock.name}`);
    setFilteredStocks([]);
    if (stock.currentPrice) {
      setBuyPrice(stock.currentPrice);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStock) {
      setError('Please select a stock');
      return;
    }
    if (!quantity || quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    if (!buyPrice || buyPrice <= 0) {
      setError('Please enter a valid buy price');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const holdingData = {
        ticker: selectedStock.ticker,
        name: selectedStock.name,
        quantity: Number(quantity),
        buyPrice: Number(buyPrice),
        buyDate: buyDate ? new Date(buyDate).toISOString() : new Date().toISOString()
      };

      if (editHolding) {
        await updateHolding(user.uid, portfolioId, editHolding.id, holdingData);
      } else {
        await addHolding(user.uid, portfolioId, holdingData);
      }
      onAdded();
    } catch (err) {
      console.error(err);
      setError('Failed to add holding');
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} data-lang={language}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{editHolding ? 'Edit Holding' : 'Add Holding'}</h3>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        
        {error && <div className="portfolio__error">{error}</div>}
        
        <form className="modal__form" onSubmit={handleSubmit}>
          <div className="modal__field" style={{ position: 'relative' }}>
            <label>Stock Search</label>
            <input 
              type="text" 
              className="modal__input modal__search"
              placeholder="Search by ticker or name..."
              value={searchQuery}
              disabled={!!editHolding}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (selectedStock) setSelectedStock(null);
              }}
            />
            {!editHolding && filteredStocks.length > 0 && !selectedStock && (
              <ul className="modal__search-results">
                {filteredStocks.map(stock => (
                  <li 
                    key={stock.ticker} 
                    className="modal__search-item"
                    onClick={() => handleSelectStock(stock)}
                  >
                    <strong>{stock.ticker}</strong> - {stock.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="modal__field">
            <label>Quantity</label>
            <input 
              type="number" 
              className="modal__input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              required
            />
          </div>
          
          <div className="modal__field">
            <label>Buy Price (৳)</label>
            <input 
              type="number" 
              className="modal__input"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              step="0.01"
              min="0.01"
              required
            />
          </div>
          
          <div className="modal__field">
            <label>Buy Date (Optional)</label>
            <input 
              type="date" 
              className="modal__input"
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
            />
          </div>
          
          <button type="submit" className="modal__submit" disabled={submitting}>
            {submitting ? (editHolding ? 'Saving...' : 'Adding...') : (editHolding ? 'Save Changes' : 'Add Holding')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddHoldingModal;
