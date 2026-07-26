import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import LanguageToggle from '../common/LanguageToggle';
import ThemeToggle from '../common/ThemeToggle';
import './Header.css';

export default function Header() {
  const { language, setPage, viewStock } = useApp();
  const { user, isLoggedIn, signInWithGoogle, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <header className="header">
      <div className="header__inner">
        <a className="header__logo" href="/" aria-label="StockFriend Home">
          <span className="header__logo-icon">📈</span>
          <span className="header__logo-text">
            {language === 'en' ? 'StockFriend' : 'বিনিয়োগবন্ধু'}
          </span>
        </a>
        <div className="header__controls">
          <button
            className="header__search-btn"
            onClick={() => viewStock(null)}
            aria-label="Search stocks"
            title={language === 'en' ? 'Search Stocks' : 'স্টক খুঁজুন'}
          >
            🔍
          </button>
          <LanguageToggle />
          <ThemeToggle />

          {isLoggedIn ? (
            <div className="header__user" ref={menuRef}>
              <button
                className="header__avatar-btn"
                onClick={() => setMenuOpen(prev => !prev)}
                aria-label="User menu"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className="header__avatar-img"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="header__avatar-fallback">
                    {(user.displayName || user.email || '?')[0].toUpperCase()}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div className="header__dropdown">
                  <div className="header__dropdown-name">
                    {user.displayName || user.email}
                  </div>
                  <button
                    className="header__dropdown-btn"
                    onClick={() => { setPage('portfolio'); setMenuOpen(false); }}
                  >
                    {language === 'en' ? '📊 My Portfolios' : '📊 আমার পোর্টফোলিও'}
                  </button>
                  <button
                    className="header__dropdown-btn header__dropdown-btn--danger"
                    onClick={() => { signOut(); setMenuOpen(false); }}
                  >
                    {language === 'en' ? 'Sign out' : 'সাইন আউট'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="header__sign-in"
              onClick={signInWithGoogle}
            >
              {language === 'en' ? 'Sign in' : 'সাইন ইন'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
