import { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { LOADING_MESSAGES } from './loadingMessages';
import './LoadingScreen.css';

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

export default LoadingScreen;
