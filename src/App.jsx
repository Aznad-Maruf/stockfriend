import { AppProvider, useApp } from './context/AppContext';
import { DataProvider } from './context/DataContext';
import Header from './components/Header/Header';
import LandingPage from './components/LandingPage/LandingPage';
import Wizard from './components/Wizard/Wizard';
import Results from './components/Results/Results';
import LoadingScreen from './components/common/LoadingScreen/LoadingScreen';

function AppContent() {
  const { page, handleAutoNavigate } = useApp();

  return (
    <DataProvider onAutoNavigate={handleAutoNavigate}>
      <div className="app">
        <Header />
        <main className="app__main">
          {page === 'loading' && <LoadingScreen />}
          {page === 'landing' && <LandingPage />}
          {page === 'wizard' && <Wizard />}
          {page === 'results' && <Results />}
        </main>
      </div>
    </DataProvider>
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
