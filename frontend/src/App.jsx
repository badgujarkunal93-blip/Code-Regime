import React, { useState, useEffect, Suspense, lazy, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import PivotVaultIntro from './components/loaders/PivotVaultIntro';
import PivotVaultLoader from './components/loaders/PivotVaultLoader';
import WelcomeScreen from './components/onboarding/WelcomeScreen';
import AuthModal from './components/onboarding/AuthModal';
import ProductTour from './components/onboarding/ProductTour';
import { LoadingProvider, useLoading } from './context/LoadingContext';
import { useAuth } from './context/AuthContext';

const ONBOARDED_KEY = 'pivotvault_onboarded';

const ProductTourContext = createContext({
  showTour: false,
  setShowTour: () => {},
  sidebar: null,
  setSidebar: () => {}
});

export const useProductTour = () => useContext(ProductTourContext);

// Route-level code splitting keeps the initial bundle lean; heavy pages
// (charts, graph, autopsy parser) only load when navigated to.
const LandingPage = lazy(() => import('./pages/LandingPage'));
const NewLandingPage = lazy(() => import('./pages/NewLandingPage'));
const FailureExplorer = lazy(() => import('./pages/FailureExplorer'));
const PostmortemPage = lazy(() => import('./pages/PostmortemPage'));
const RiskScanner = lazy(() => import('./pages/RiskScanner'));
const KnowledgeGraph = lazy(() => import('./pages/KnowledgeGraph'));
const ConfessionWall = lazy(() => import('./pages/ConfessionWall'));
const InsightsDashboard = lazy(() => import('./pages/InsightsDashboard'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const FounderPlaybook = lazy(() => import('./pages/FounderPlaybook'));
const CompareStartups = lazy(() => import('./pages/CompareStartups'));
const HallOfGhosts = lazy(() => import('./pages/HallOfGhosts'));
const PitchDeckAutopsy = lazy(() => import('./pages/PitchDeckAutopsy.jsx'));

// Frictionless entry experience: shown once per device after the splash, only
// for un-authenticated, not-yet-onboarded visitors. Rendered inside <Router>
// (so navigation works) as an overlay above the already-mounted dashboard —
// routing is never interrupted.
function OnboardingGate() {
  const navigate = useNavigate();
  const { isAuthed, loading } = useAuth();
  const { showTour, setShowTour } = useProductTour();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!loading && !localStorage.getItem(ONBOARDED_KEY)) {
      setShowWelcome(true);
    } else {
      setShowWelcome(false);
      setShowAuth(false);
    }
  }, [isAuthed, loading]);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    setShowAuth(false);
    setShowWelcome(false);
    setShowTour(false);
  };

  const handleTakeTour = () => {
    setShowWelcome(false);
    setShowTour(true);
  };

  const handleSkipTour = () => {
    completeOnboarding();
  };

  return (
    <>
      <AnimatePresence>
        {showWelcome && (
          <WelcomeScreen
            onTakeTour={handleTakeTour}
            onSkipTour={handleSkipTour}
            onSignIn={() => setShowAuth(true)}
          />
        )}
      </AnimatePresence>
      <AuthModal
        open={showAuth && showWelcome}
        onClose={() => setShowAuth(false)}
        onGuest={completeOnboarding}
        onSignIn={() => { completeOnboarding(); navigate('/login'); }}
        onSignUp={() => { completeOnboarding(); navigate('/signup'); }}
      />
    </>
  );
}

const RouteFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  </div>
);

function AppContent() {
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : true;
  });
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [showTour, setShowTour] = useState(false);
  const { isLoading, loadingMessage } = useLoading();

  const sidebar = {
    isCollapsed,
    setIsCollapsed,
    isMobileOpen,
    setIsMobileOpen
  };

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Intro loading animation removed for instant app loading
  const showIntro = false;

  const handleTourComplete = () => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    setShowTour(false);
  };

  const handleTourSkip = () => {
    localStorage.setItem(ONBOARDED_KEY, '1');
    setShowTour(false);
  };

  return (
    <ProductTourContext.Provider value={{ showTour, setShowTour, sidebar }}>
      <>
        {isLoading && <PivotVaultLoader customMessage={loadingMessage} />}
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <OnboardingGate />
          <div
            className="pv-app-shell"
            data-sidebar={isCollapsed ? 'collapsed' : 'expanded'}
          >
            <ScrollToTop />
            <Sidebar 
              isCollapsed={isCollapsed} 
              setIsCollapsed={setIsCollapsed}
              isMobileOpen={isMobileOpen}
              setIsMobileOpen={setIsMobileOpen}
            />
            <div className="pv-app-column">
              <TopBar onOpenSidebar={() => setIsMobileOpen(true)} />
              <main className="pv-app-main">
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<NewLandingPage />} />
                    <Route path="/dashboard" element={<LandingPage />} />
                    <Route path="/explore" element={<FailureExplorer />} />
                    <Route path="/startup/:slug" element={<PostmortemPage />} />
                    <Route path="/scan" element={<ProtectedRoute><RiskScanner /></ProtectedRoute>} />
                    <Route path="/graph" element={<KnowledgeGraph />} />
                    <Route path="/confessions" element={<ConfessionWall />} />
                    <Route path="/insights" element={<InsightsDashboard />} />
                    <Route path="/assistant" element={<Navigate to="/scan" replace />} />
                    <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
                    <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                    <Route path="/playbook" element={<ProtectedRoute><FounderPlaybook /></ProtectedRoute>} />
                    <Route path="/compare" element={<CompareStartups />} />
                    <Route path="/ghosts" element={<HallOfGhosts />} />
                    <Route path="/autopsy" element={<ProtectedRoute><PitchDeckAutopsy /></ProtectedRoute>} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </div>
          <AnimatePresence>
            {showTour && (
              <ProductTour 
                onFinish={handleTourComplete}
                onSkip={handleTourSkip}
                sidebar={sidebar}
              />
            )}
          </AnimatePresence>
        </Router>
      </>
    </ProductTourContext.Provider>
  );
}

function App() {
  return (
    <LoadingProvider>
      <AppContent />
    </LoadingProvider>
  );
}


export default App;
