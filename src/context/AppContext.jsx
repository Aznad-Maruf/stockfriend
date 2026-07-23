import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { stocks as staticStocks } from '../data/stocks';
import { getStocksWithLivePrices } from '../services/dseService';
import { loadStocksFromCSV, loadScraperStatus } from '../services/csvLoader';
import { generateRecommendations } from '../engine/recommendationEngine';

const AppContext = createContext(null);

const STEPS = ['experience', 'risk', 'horizon', 'budget', 'goal', 'sectors'];

export function AppProvider({ children }) {
  const [page, setPage] = useState(() => {
    // If user has all answers saved, start in 'loading' to avoid landing page flash
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sf-answers');
        if (saved) {
          const p = JSON.parse(saved);
          if (p.experience && p.risk && p.horizon && p.budget && p.goal) {
            return 'loading';
          }
        }
      } catch (e) { /* ignore */ }
    }
    return 'landing';
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sf-answers');
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            experience: parsed.experience || null,
            risk: parsed.risk || null,
            horizon: parsed.horizon || null,
            budget: parsed.budget || null,
            goal: parsed.goal || null,
            sectors: parsed.sectors || [],
          };
        }
      } catch (e) { /* ignore corrupt data */ }
    }
    return {
      experience: null,
      risk: null,
      horizon: null,
      budget: null,
      goal: null,
      sectors: [],
    };
  });
  const [results, setResults] = useState(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sf-theme') || 'light';
    }
    return 'light';
  });
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sf-lang') || 'en';
    }
    return 'en';
  });

  // Base Data State
  const [baseStocks, setBaseStocks] = useState(staticStocks);
  const [scraperStatus, setScraperStatus] = useState(null);
  const [dataSource, setDataSource] = useState('static'); // 'csv' or 'static'

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
      const [{ stocks: loadedStocks, source }, status] = await Promise.all([
        loadStocksFromCSV(),
        loadScraperStatus()
      ]);
      
      if (mounted) {
        setBaseStocks(loadedStocks);
        setDataSource(source);
        setScraperStatus(status);
        
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
        if (mounted) {
          let navigated = false;
          try {
            const saved = localStorage.getItem('sf-answers');
            if (saved) {
              const parsed = JSON.parse(saved);
              const allFilled = parsed.experience && parsed.risk && parsed.horizon && parsed.budget && parsed.goal;
              if (allFilled) {
                const autoResults = generateRecommendations(parsed, finalStocks);
                setResults(autoResults);
                setPage('results');
                navigated = true;
              }
            }
          } catch (e) { /* ignore */ }
          // Fallback: if we started in 'loading' but couldn't auto-navigate, show landing
          if (!navigated) {
            setPage(prev => prev === 'loading' ? 'landing' : prev);
          }
        }
      }
    }
    initData();
    return () => { mounted = false; };
  }, []);

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sf-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-lang', language);
    localStorage.setItem('sf-lang', language);
  }, [language]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => (prev === 'en' ? 'bn' : 'en'));
  }, []);

  const setAnswer = useCallback((key, value) => {
    setAnswers(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('sf-answers', JSON.stringify(next));
      return next;
    });
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const startAssessment = useCallback(() => {
    setPage('wizard');
    setCurrentStep(0);
  }, []);

  const showResults = useCallback((resultData) => {
    setResults(resultData);
    setPage('results');
  }, []);

  const resetAssessment = useCallback(() => {
    const blank = {
      experience: null,
      risk: null,
      horizon: null,
      budget: null,
      goal: null,
      sectors: [],
    };
    setAnswers(blank);
    localStorage.removeItem('sf-answers');
    setCurrentStep(0);
    setResults(null);
    setPage('landing');
  }, []);



  const value = {
    page,
    setPage,
    currentStep,
    setCurrentStep,
    totalSteps: STEPS.length,
    stepKeys: STEPS,
    currentStepKey: STEPS[currentStep],
    answers,
    setAnswer,
    nextStep,
    prevStep,
    startAssessment,
    showResults,
    resetAssessment,
    results,
    theme,
    toggleTheme,
    language,
    toggleLanguage,
    // Live stock data
    stocks: liveStocks,
    priceStatus,
    refreshPrices,
    scraperStatus,
    dataSource,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
