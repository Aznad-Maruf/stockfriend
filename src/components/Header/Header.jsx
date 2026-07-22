import { useApp } from '../../context/AppContext';
import LanguageToggle from '../common/LanguageToggle';
import ThemeToggle from '../common/ThemeToggle';
import './Header.css';

export default function Header() {
  const { language } = useApp();

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
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
