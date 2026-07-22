import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header/Header';
import LandingPage from './components/LandingPage/LandingPage';
import Wizard from './components/Wizard/Wizard';
import Results from './components/Results/Results';

function AppContent() {
  const { page } = useApp();

  return (
    <div className="app">
      <Header />
      <main className="app__main">
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
