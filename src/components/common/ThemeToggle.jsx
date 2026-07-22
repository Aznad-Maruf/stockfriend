import { useApp } from '../../context/AppContext';
import { FiSun, FiMoon } from 'react-icons/fi';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useApp();
  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      type="button"
    >
      <span className={`theme-toggle__icon ${isDark ? 'theme-toggle__icon--hidden' : ''}`}>
        <FiSun />
      </span>
      <span className={`theme-toggle__icon ${isDark ? '' : 'theme-toggle__icon--hidden'}`}>
        <FiMoon />
      </span>
    </button>
  );
}
