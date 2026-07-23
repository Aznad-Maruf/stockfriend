import { useApp } from '../../context/AppContext';
import { translations } from '../../data/i18n';
import './LandingPage.css';

function LandingPage() {
  const { language, startAssessment, answers, resetAssessment } = useApp();

  const t = translations[language];
  const landing = t.landing;
  const features = landing.features;

  // Check if user has saved answers (at least one non-null answer)
  const hasSavedAnswers = answers.experience || answers.risk || answers.horizon || answers.budget || answers.goal;

  const handleStartFresh = () => {
    resetAssessment();
    // resetAssessment goes to landing, so we need to start after clearing
    setTimeout(() => startAssessment(), 0);
  };

  const featureItems = [
    { key: 'personalized', icon: '🎯' },
    { key: 'bilingual', icon: '🌐' },
    { key: 'free', icon: '💎' },
  ];

  return (
    <div className="landing">
      <section className="landing__hero">
        <div className="landing__hero-bg" aria-hidden="true">
          <div className="landing__orb landing__orb--1" />
          <div className="landing__orb landing__orb--2" />
          <div className="landing__orb landing__orb--3" />
          <svg className="landing__grid-lines" viewBox="0 0 800 400" preserveAspectRatio="none">
            <polyline points="0,300 100,260 200,280 300,220 400,240 500,180 600,200 700,160 800,180" />
            <polyline points="0,350 100,320 200,340 300,290 400,310 500,260 600,270 700,230 800,250" />
            <polyline points="0,250 100,210 200,230 300,170 400,190 500,140 600,160 700,120 800,130" />
          </svg>
          <div className="landing__particles" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className="landing__particle"
                style={{
                  '--x': `${10 + Math.random() * 80}%`,
                  '--y': `${10 + Math.random() * 80}%`,
                  '--delay': `${Math.random() * 6}s`,
                  '--duration': `${4 + Math.random() * 4}s`,
                  '--size': `${3 + Math.random() * 5}px`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="landing__hero-content">
          <span className="landing__badge">{t.app.tagline}</span>
          <h1 className="landing__title">{landing.heroTitle}</h1>
          <p className="landing__subtitle">{landing.heroSubtitle}</p>

          {hasSavedAnswers ? (
            <div className="landing__cta-group">
              <button className="landing__cta" onClick={startAssessment}>
                <span className="landing__cta-text">{landing.continueCta}</span>
                <span className="landing__cta-arrow" aria-hidden="true">→</span>
              </button>
              <button className="landing__cta landing__cta--secondary" onClick={handleStartFresh}>
                <span className="landing__cta-text">{landing.freshCta}</span>
              </button>
            </div>
          ) : (
            <button className="landing__cta" onClick={startAssessment}>
              <span className="landing__cta-text">{landing.ctaButton}</span>
              <span className="landing__cta-arrow" aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </section>

      <section className="landing__features">
        <div className="landing__features-grid">
          {featureItems.map(({ key, icon }) => (
            <article key={key} className="landing__feature-card">
              <div className="landing__feature-icon-wrap">
                <span className="landing__feature-icon" role="img" aria-hidden="true">{icon}</span>
              </div>
              <h3 className="landing__feature-title">{features[key].title}</h3>
              <p className="landing__feature-desc">{features[key].desc}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing__disclaimer">
        <p>{landing.disclaimer}</p>
      </footer>
    </div>
  );
}

export default LandingPage;
