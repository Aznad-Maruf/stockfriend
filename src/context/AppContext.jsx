import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { stocks as staticStocks } from '../data/stocks';
import { getStocksWithLivePrices } from '../services/dseService';

const AppContext = createContext(null);

const STEPS = ['experience', 'risk', 'horizon', 'budget', 'goal', 'sectors'];

export function AppProvider({ children }) {
  const [page, setPage] = useState('landing'); // 'landing' | 'wizard' | 'results'
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    experience: null,
    risk: null,
    horizon: null,
    budget: null,
    goal: null,
    sectors: [],
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

  // Live stock data state
  const [liveStocks, setLiveStocks] = useState(staticStocks);
  const [priceStatus, setPriceStatus] = useState({
    live: false,
    loading: true,
    error: null,
    timestamp: null,
    matchedCount: 0,
  });

  // Fetch live prices on mount and refresh periodically
  useEffect(() => {
    let mounted = true;

    async function loadLivePrices() {
      setPriceStatus((prev) => ({ ...prev, loading: true }));
      try {
        const result = await getStocksWithLivePrices(staticStocks);
        if (mounted) {
          setLiveStocks(result.stocks);
          setPriceStatus({
            live: result.live,
            loading: false,
            error: result.error || null,
            timestamp: result.timestamp,
            matchedCount: result.matchedCount,
          });
        }
      } catch (err) {
        if (mounted) {
          setPriceStatus({
            live: false,
            loading: false,
            error: err.message,
            timestamp: null,
            matchedCount: 0,
          });
        }
      }
    }

    loadLivePrices();

    // Refresh live prices every 5 minutes
    const interval = setInterval(loadLivePrices, 5 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

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
    setAnswers(prev => ({ ...prev, [key]: value }));
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
    setAnswers({
      experience: null,
      risk: null,
      horizon: null,
      budget: null,
      goal: null,
      sectors: [],
    });
    setCurrentStep(0);
    setResults(null);
    setPage('landing');
  }, []);

  // Expose a function to manually refresh prices
  const refreshPrices = useCallback(async () => {
    setPriceStatus((prev) => ({ ...prev, loading: true }));
    const result = await getStocksWithLivePrices(staticStocks);
    setLiveStocks(result.stocks);
    setPriceStatus({
      live: result.live,
      loading: false,
      error: result.error || null,
      timestamp: result.timestamp,
      matchedCount: result.matchedCount,
    });
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
