import { AppProvider, useApp } from './context/AppContext';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header/Header';
import LandingPage from './components/LandingPage/LandingPage';
import Wizard from './components/Wizard/Wizard';
import Results from './components/Results/Results';
import Portfolio from './components/Portfolio/Portfolio';
import StockDetail from './components/StockDetail/StockDetail';
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
          {page === 'portfolio' && <Portfolio />}
          {page === 'stock-detail' && <StockDetail />}
        </main>
      </div>
    </DataProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
