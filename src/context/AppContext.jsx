import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { saveUserAnswers, loadUserAnswers, clearUserAnswers } from '../services/userService';
import { isHorizonValid } from '../utils/horizonUtils';

const AppContext = createContext(null);

const STEPS = ['experience', 'risk', 'horizon', 'budget', 'stockCount', 'goal', 'sectors'];

// Hash routing helpers
function getPageFromHash() {
  const hash = window.location.hash.replace('#/', '') || '';
  if (hash === '' || hash === 'landing') return { page: 'landing' };
  if (hash === 'wizard') return { page: 'wizard' };
  if (hash === 'results') return { page: 'results' };
  if (hash.startsWith('portfolio/')) {
    const id = hash.replace('portfolio/', '');
    return { page: 'portfolio', portfolioId: id };
  }
  if (hash === 'portfolio') return { page: 'portfolio' };
  return { page: 'landing' };
}

function setHash(page, extra) {
  let hash = '#/' + page;
  if (page === 'landing') hash = '#/';
  if (extra) hash += '/' + extra;
  if (window.location.hash !== hash) {
    window.history.pushState(null, '', hash);
  }
}

export function AppProvider({ children }) {
  const [page, setPageState] = useState(() => {
    if (typeof window !== 'undefined') {
      const hashRoute = getPageFromHash();
      // If URL has a specific page, use it
      if (hashRoute.page !== 'landing' && window.location.hash) {
        return hashRoute.page;
      }
      // Otherwise check for saved answers -> auto-load results
      try {
        const saved = localStorage.getItem('sf-answers');
        if (saved) {
          const p = JSON.parse(saved);
          if (p.experience && p.risk && isHorizonValid(p.horizon) && p.budget && p.goal) {
            return 'loading';
          }
        }
      } catch (e) { /* ignore */ }
    }
    return 'landing';
  });
  const [portfolioRoute, setPortfolioRoute] = useState(() => {
    if (typeof window !== 'undefined') {
      const hashRoute = getPageFromHash();
      return hashRoute.portfolioId || null;
    }
    return null;
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
            stockCount: parsed.stockCount || 5,
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
      stockCount: 5,
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

  // Sync answers from Firestore on login
  const didSyncRef = useRef(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || didSyncRef.current) return;
    didSyncRef.current = true;

    loadUserAnswers(user.uid).then(cloudAnswers => {
      if (cloudAnswers && cloudAnswers.experience) {
        setAnswers(cloudAnswers);
        localStorage.setItem('sf-answers', JSON.stringify(cloudAnswers));
      }
    }).catch(e => console.warn('Failed to load cloud answers:', e));
  }, [user]);

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

  // URL-aware setPage
  const setPage = useCallback((newPage, extra) => {
    setPageState(newPage);
    if (newPage === 'portfolio' && extra) {
      setPortfolioRoute(extra);
      setHash(newPage, extra);
    } else {
      if (newPage !== 'loading') setHash(newPage);
      if (newPage !== 'portfolio') setPortfolioRoute(null);
    }
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const route = getPageFromHash();
      setPageState(route.page);
      setPortfolioRoute(route.portfolioId || null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => (prev === 'en' ? 'bn' : 'en'));
  }, []);

  const setAnswer = useCallback((key, val) => {
    setAnswers(prev => {
      const next = { ...prev, [key]: val };
      localStorage.setItem('sf-answers', JSON.stringify(next));
      // Fire-and-forget Firestore sync
      if (user) {
        saveUserAnswers(user.uid, next).catch(() => {});
      }
      return next;
    });
  }, [user]);

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
  }, [setPage]);

  const showResults = useCallback((resultData) => {
    setResults(resultData);
    setPage('results');
  }, [setPage]);

  const resetAssessment = useCallback(() => {
    const blank = {
      experience: null,
      risk: null,
      horizon: null,
      budget: null,
      stockCount: 5,
      goal: null,
      sectors: [],
    };
    setAnswers(blank);
    localStorage.removeItem('sf-answers');
    if (user) {
      clearUserAnswers(user.uid).catch(() => {});
    }
    setCurrentStep(0);
    setResults(null);
    setPage('landing');
  }, [user, setPage]);

  // Called by DataProvider after data loads
  const handleAutoNavigate = useCallback((autoResults) => {
    if (autoResults) {
      setResults(autoResults);
      setPage('results');
    } else {
      setPageState(prev => prev === 'loading' ? 'landing' : prev);
    }
  }, [setPage]);

  const value = {
    page,
    setPage,
    portfolioRoute,
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
    handleAutoNavigate,
    results,
    theme,
    toggleTheme,
    language,
    toggleLanguage,
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
