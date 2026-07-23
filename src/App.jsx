import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header/Header';
import LandingPage from './components/LandingPage/LandingPage';
import Wizard from './components/Wizard/Wizard';
import Results from './components/Results/Results';
import { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  { en: 'Waking up the stock hamsters...', bn: 'শেয়ার হ্যামস্টারদের জাগানো হচ্ছে...' },
  { en: 'Reading 400+ company reports (so you don\'t have to)...', bn: '৪০০+ কোম্পানির রিপোর্ট পড়া হচ্ছে (যাতে আপনার না লাগে)...' },
  { en: 'Crunching 5 years of price data...', bn: '৫ বছরের দামের ডেটা বিশ্লেষণ হচ্ছে...' },
  { en: 'Asking the stock market nicely...', bn: 'শেয়ার বাজারকে ভদ্রভাবে জিজ্ঞেস করা হচ্ছে...' },
  { en: 'Finding hidden gems just for you...', bn: 'আপনার জন্য লুকানো রত্ন খোঁজা হচ্ছে...' },
  { en: 'Teaching AI about Bangladesh stocks...', bn: 'AI-কে বাংলাদেশের শেয়ার শেখানো হচ্ছে...' },
  { en: 'Calculating the perfect portfolio mix...', bn: 'নিখুঁত পোর্টফোলিও মিশ্রণ গণনা হচ্ছে...' },
  { en: 'Almost there, polishing your recommendations...', bn: 'প্রায় শেষ, আপনার সুপারিশ পালিশ হচ্ছে...' },
];

function LoadingScreen() {
  const { language } = useApp();
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const msg = LOADING_MESSAGES[msgIndex];

  return (
    <div className="loading-screen">
      <div className="loading-screen__chart">
        <svg viewBox="0 0 300 100" className="loading-screen__svg">
          <defs>
            <linearGradient id="chartGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#5eead4" />
            </linearGradient>
            <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[25, 50, 75].map(y => (
            <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 4" />
          ))}
          {/* Area fill */}
          <path
            className="loading-screen__area"
            d="M0,70 Q30,65 60,55 T120,40 T180,50 T240,30 T300,25 L300,100 L0,100 Z"
            fill="url(#chartFill)"
          />
          {/* Chart line */}
          <path
            className="loading-screen__line"
            d="M0,70 Q30,65 60,55 T120,40 T180,50 T240,30 T300,25"
            fill="none"
            stroke="url(#chartGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Dot at end */}
          <circle className="loading-screen__dot" cx="300" cy="25" r="4" fill="#14b8a6" />
        </svg>
      </div>
      <p className="loading-screen__message" key={msgIndex}>
        {language === 'bn' ? msg.bn : msg.en}
      </p>
    </div>
  );
}

function AppContent() {
  const { page } = useApp();

  return (
    <div className="app">
      <Header />
      <main className="app__main">
        {page === 'loading' && <LoadingScreen />}
        {page === 'landing' && <LandingPage />}
        {page === 'wizard' && <Wizard />}
        {page === 'results' && <Results />}
      </main>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
