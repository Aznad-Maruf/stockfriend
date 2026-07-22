import { useApp } from '../../context/AppContext';
import './LanguageToggle.css';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useApp();
  const isEn = language === 'en';

  return (
    <button
      className="lang-toggle"
      onClick={toggleLanguage}
      aria-label={isEn ? 'Switch to Bangla' : 'Switch to English'}
      type="button"
    >
      <span className="lang-toggle__slider" data-active={isEn ? 'left' : 'right'} />
      <span className={`lang-toggle__label ${isEn ? 'lang-toggle__label--active' : ''}`}>
        EN
      </span>
      <span className={`lang-toggle__label ${!isEn ? 'lang-toggle__label--active' : ''}`}>
        বাং
      </span>
    </button>
  );
}
