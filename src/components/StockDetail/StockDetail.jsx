import { useApp } from '../../context/AppContext';
import { useData } from '../../context/DataContext';
import StockSearch from './StockSearch';
import StockProfile from './StockProfile';
import './StockDetail.css';

const L = {
  en: { noStock: 'Search for a stock to view details' },
  bn: { noStock: 'বিস্তারিত দেখতে স্টক খুঁজুন' }
};

export default function StockDetail() {
  const { language, selectedStock } = useApp();
  const { stocks } = useData();
  const t = L[language] || L.en;

  const stock = selectedStock ? stocks?.find(s => s.ticker === selectedStock) : null;

  return (
    <div className="stock-detail">
      <StockSearch />
      {stock ? (
        <StockProfile stock={stock} />
      ) : (
        <div className="stock-detail__empty">
          <p>{t.noStock}</p>
        </div>
      )}
    </div>
  );
}
