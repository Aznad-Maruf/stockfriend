import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';

const L = {
  en: { search: 'Search stocks...', back: '← Back' },
  bn: { search: 'স্টক খুঁজুন...', back: '← পিছনে' }
};

export default function StockSearch() {
  const { language, viewStock, closeStock, selectedStock } = useApp();
  const { stocks } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const t = L[language] || L.en;

  const suggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();
    return stocks
      .filter(s => 
        (s.ticker && s.ticker.toLowerCase().includes(lower)) ||
        (s.name && s.name.toLowerCase().includes(lower)) ||
        (s.nameBn && s.nameBn.includes(lower))
      )
      .slice(0, 8);
  }, [searchTerm, stocks]);

  return (
    <div className="stock-detail__search-section">
      <div className="stock-detail__search">
        <span className="stock-detail__search-icon">🔍</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t.search}
          className="stock-detail__search-input"
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="stock-detail__suggestions">
          {suggestions.map((stock) => (
            <li
              key={stock.ticker}
              onClick={() => {
                viewStock(stock.ticker);
                setSearchTerm('');
              }}
              className="stock-detail__suggestion-item"
            >
              <span className="stock-detail__suggestion-ticker">{stock.ticker}</span>
              <span className="stock-detail__suggestion-name">
                {language === 'bn' && stock.nameBn ? stock.nameBn : stock.name}
              </span>
            </li>
          ))}
        </ul>
      )}
      {selectedStock && (
        <button className="stock-detail__back-btn" onClick={closeStock}>
          {t.back}
        </button>
      )}
    </div>
  );
}
