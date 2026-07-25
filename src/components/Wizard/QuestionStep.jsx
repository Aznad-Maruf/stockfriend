import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../data/i18n';
import { sectors } from '../../data/stocks';
import { formatNumber } from '../../utils/formatters';
import './QuestionStep.css';

const ICONS = {
  experience: { beginner: '🌱', intermediate: '📊', advanced: '🚀' },
  risk: { conservative: '🛡️', moderate: '⚖️', aggressive: '🔥' },
  horizon: { short: '⏱️', medium: '📅', long: '🏔️' },
  goal: { wealth: '📈', income: '💰', quick: '⚡' },
};

const SINGLE_SELECT_KEYS = ['experience', 'risk', 'horizon', 'goal'];
const PRESET_VALUES = [50000, 100000, 500000, 1000000];

function parseBDT(str) {
  const cleaned = str.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : null;
}

export default function QuestionStep({ questionKey }) {
  const { answers, setAnswer, nextStep, language } = useApp();
  const t = translations[language].wizard.questions[questionKey];
  const currentAnswer = answers[questionKey];
  const autoAdvanceTimer = useRef(null);
  const inputRef = useRef(null);
  const [budgetDisplay, setBudgetDisplay] = useState('');

  useEffect(() => {
    if (questionKey === 'budget' && currentAnswer) {
      setBudgetDisplay(formatNumber(currentAnswer));
    } else if (questionKey === 'budget') {
      setBudgetDisplay('');
    }
  }, [questionKey, currentAnswer]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const handleSingleSelect = useCallback((value) => {
    setAnswer(questionKey, value);
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      nextStep();
    }, 400);
  }, [questionKey, setAnswer, nextStep]);

  const handleBudgetChange = useCallback((e) => {
    const raw = parseBDT(e.target.value);
    if (raw === null) {
      setBudgetDisplay('');
      setAnswer('budget', null);
    } else {
      setBudgetDisplay(formatNumber(raw));
      setAnswer('budget', raw);
    }
  }, [setAnswer]);

  const handlePresetClick = useCallback((value) => {
    setBudgetDisplay(formatNumber(value));
    setAnswer('budget', value);
    if (inputRef.current) inputRef.current.focus();
  }, [setAnswer]);

  const handleSectorToggle = useCallback((sectorId) => {
    const current = answers.sectors || [];
    const allSectorIds = sectors.map(s => s.id);
    if (sectorId === '__all__') {
      if (current.length === allSectorIds.length) {
        setAnswer('sectors', []);
      } else {
        setAnswer('sectors', [...allSectorIds]);
      }
      return;
    }
    if (current.includes(sectorId)) {
      setAnswer('sectors', current.filter(id => id !== sectorId));
    } else {
      setAnswer('sectors', [...current, sectorId]);
    }
  }, [answers.sectors, setAnswer]);

  const isSingleSelect = SINGLE_SELECT_KEYS.includes(questionKey);

  return (
    <div className="question-step">
      <div className="question-step__header">
        <h2 className="question-step__title">{t.title}</h2>
        <p className="question-step__subtitle">{t.subtitle}</p>
      </div>

      <div className="question-step__content">
        {isSingleSelect && (
          <div className="question-step__options">
            {Object.entries(t.options).map(([key, opt]) => (
              <button
                key={key}
                type="button"
                className={`option-card${currentAnswer === key ? ' option-card--selected' : ''}`}
                onClick={() => handleSingleSelect(key)}
              >
                <span className="option-card__icon">{ICONS[questionKey][key]}</span>
                <div className="option-card__text">
                  <span className="option-card__label">{opt.label}</span>
                  <span className="option-card__desc">{opt.desc}</span>
                </div>
                <div className="option-card__check">
                  {currentAnswer === key && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="10" fill="var(--color-primary)" />
                      <path d="M6 10.5L8.5 13L14 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {questionKey === 'budget' && (
          <div className="question-step__budget">
            <div className="budget-input-wrapper">
              <span className="budget-input__currency">{t.currency}</span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                className="budget-input"
                placeholder={t.placeholder}
                value={budgetDisplay}
                onChange={handleBudgetChange}
                autoComplete="off"
              />
            </div>
            <div className="budget-presets">
              {PRESET_VALUES.map((value, i) => (
                <button
                  key={value}
                  type="button"
                  className={`budget-preset${currentAnswer === value ? ' budget-preset--active' : ''}`}
                  onClick={() => handlePresetClick(value)}
                >
                  {t.currency}{t.presets[i]}
                </button>
              ))}
            </div>
          </div>
        )}

        {questionKey === 'sectors' && (
          <div className="question-step__sectors">
            <button
              type="button"
              className={`sector-chip sector-chip--all${
                (answers.sectors || []).length === sectors.length ? ' sector-chip--selected' : ''
              }`}
              onClick={() => handleSectorToggle('__all__')}
            >
              <span className="sector-chip__icon">🌐</span>
              <span className="sector-chip__name">{t.selectAll}</span>
            </button>
            {sectors.map((sector) => (
              <button
                key={sector.id}
                type="button"
                className={`sector-chip${
                  (answers.sectors || []).includes(sector.id) ? ' sector-chip--selected' : ''
                }`}
                onClick={() => handleSectorToggle(sector.id)}
              >
                <span className="sector-chip__icon">{sector.icon}</span>
                <span className="sector-chip__name">
                  {language === 'bn' ? sector.nameBn : sector.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
