import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { stocks as staticStocks } from '../data/stocks';
import { getStocksWithLivePrices } from '../services/dseService';
import { loadStocksFromCSV, loadScraperStatus, loadResearch } from '../services/csvLoader';
import { generateRecommendations } from '../engine';
import { isHorizonValid } from '../utils/horizonUtils';

const DataContext = createContext(null);

export function DataProvider({ children, onAutoNavigate }) {
  // Base Data State
  const [baseStocks, setBaseStocks] = useState(staticStocks);
  const [scraperStatus, setScraperStatus] = useState(null);
  const [dataSource, setDataSource] = useState('static');
  const [research, setResearch] = useState({});

  // Live stock data state
  const [liveStocks, setLiveStocks] = useState(staticStocks);
  const [priceStatus, setPriceStatus] = useState({
    live: false,
    loading: true,
    error: null,
    timestamp: null,
    matchedCount: 0,
  });

  // Load base data from CSV on mount
  useEffect(() => {
    let mounted = true;
    async function initData() {
      const [{ stocks: loadedStocks, source }, status, researchData] = await Promise.all([
        loadStocksFromCSV(),
        loadScraperStatus(),
        loadResearch(),
      ]);

      if (mounted) {
        setBaseStocks(loadedStocks);
        setDataSource(source);
        setScraperStatus(status);
        setResearch(researchData);

        // Initial live price fetch
        setPriceStatus(prev => ({ ...prev, loading: true }));
        let finalStocks = loadedStocks;
        try {
          const result = await getStocksWithLivePrices(loadedStocks);
          finalStocks = result.stocks;
          setLiveStocks(result.stocks);
          setPriceStatus({
            live: result.live,
            loading: false,
            error: result.error || null,
            timestamp: result.timestamp,
            matchedCount: result.matchedCount,
          });
        } catch (err) {
          setPriceStatus({
            live: false,
            loading: false,
            error: err.message,
            timestamp: null,
            matchedCount: 0,
          });
        }

        // Auto-navigate: if user has all answers saved, go straight to results
        if (mounted && onAutoNavigate) {
          let navigated = false;
          try {
            const saved = localStorage.getItem('sf-answers');
            if (saved) {
              const parsed = JSON.parse(saved);
              const allFilled = parsed.experience && parsed.risk && isHorizonValid(parsed.horizon) && parsed.budget && parsed.goal;
              if (allFilled) {
                const autoResults = generateRecommendations(parsed, finalStocks, researchData);
                navigated = true;
                onAutoNavigate(autoResults);
              }
            }
          } catch (e) { /* ignore */ }
          if (!navigated) {
            onAutoNavigate(null); // Signal no auto-nav, fall back to landing
          }
        }

        // Dismiss HTML splash now that app is ready
        const splash = document.getElementById('splash');
        if (splash) {
          splash.classList.add('hide');
          setTimeout(() => splash.remove(), 500);
        }
      }
    }
    initData();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Expose a function to manually refresh prices
  const refreshPrices = useCallback(async () => {
    setPriceStatus((prev) => ({ ...prev, loading: true }));
    try {
      const result = await getStocksWithLivePrices(baseStocks);
      setLiveStocks(result.stocks);
      setPriceStatus({
        live: result.live,
        loading: false,
        error: result.error || null,
        timestamp: result.timestamp,
        matchedCount: result.matchedCount,
      });
    } catch (err) {
       setPriceStatus({
        live: false,
        loading: false,
        error: err.message,
        timestamp: null,
        matchedCount: 0,
      });
    }
  }, [baseStocks]);

  // Refresh live prices periodically
  useEffect(() => {
    const interval = setInterval(refreshPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshPrices]);

  const value = useMemo(() => ({
    stocks: liveStocks,
    priceStatus,
    refreshPrices,
    scraperStatus,
    dataSource,
    research,
  }), [liveStocks, priceStatus, refreshPrices, scraperStatus, dataSource, research]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

export default DataContext;
