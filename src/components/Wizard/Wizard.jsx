import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { translations } from '../../data/translations';
import { generateRecommendations } from '../../engine/recommendationEngine';
import QuestionStep from './QuestionStep';
import './Wizard.css';

export default function Wizard() {
  const { currentStep, totalSteps, stepKeys, answers, nextStep, prevStep, showResults, language, stocks, priceStatus } = useApp();
  const t = translations[language].wizard;
  const [slideDir, setSlideDir] = useState('next');
  const [animating, setAnimating] = useState(false);
  const prevStepRef = useRef(currentStep);

  useEffect(() => {
    if (currentStep !== prevStepRef.current) {
      setSlideDir(currentStep > prevStepRef.current ? 'next' : 'prev');
      setAnimating(true);
      prevStepRef.current = currentStep;
      const timer = setTimeout(() => setAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  const currentKey = stepKeys[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  const isCurrentAnswered = useCallback(() => {
    const val = answers[currentKey];
    if (currentKey === 'sectors') return true;
    if (currentKey === 'budget') return val !== null && val > 0;
    return val !== null;
  }, [answers, currentKey]);

  const handleNext = useCallback(() => {
    if (!isCurrentAnswered()) return;
    if (isLastStep) {
      const results = generateRecommendations(answers, stocks);
      showResults(results);
    } else {
      nextStep();
    }
  }, [isCurrentAnswered, isLastStep, answers, stocks, showResults, nextStep]);

  const handleBack = useCallback(() => {
    prevStep();
  }, [prevStep]);

  const progressLabel = t.progress
    .replace('{current}', currentStep + 1)
    .replace('{total}', totalSteps);

  return (
    <div className="wizard">
      <div className="wizard__progress-section">
        <span className="wizard__progress-label">{progressLabel}</span>
        <div className="wizard__progress-track">
          <div
            className="wizard__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="wizard__dots">
          {stepKeys.map((key, i) => (
            <span
              key={key}
              className={`wizard__dot${
                i < currentStep ? ' wizard__dot--complete' : ''
              }${i === currentStep ? ' wizard__dot--current' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="wizard__body">
        <div
          className={`wizard__slide${animating ? ` wizard__slide--${slideDir}` : ''}`}
          key={currentStep}
        >
          <QuestionStep questionKey={currentKey} />
        </div>
      </div>

      <div className="wizard__nav">
        <button
          type="button"
          className={`wizard__btn wizard__btn--back${isFirstStep ? ' wizard__btn--hidden' : ''}`}
          onClick={handleBack}
          disabled={isFirstStep}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.back}
        </button>

        <button
          type="button"
          className={`wizard__btn wizard__btn--next${isLastStep ? ' wizard__btn--submit' : ''}`}
          onClick={handleNext}
          disabled={!isCurrentAnswered()}
        >
          {isLastStep ? t.submit : t.next}
          {!isLastStep && (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
