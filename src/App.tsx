/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';

const Landing = lazy(() => import('./pages/Landing'));
const Home = lazy(() => import('./pages/Home'));
const Scan = lazy(() => import('./pages/Scan'));
const Movie = lazy(() => import('./pages/Movie'));
const Chat = lazy(() => import('./pages/Chat'));
const Watchlist = lazy(() => import('./pages/Watchlist'));

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-white/10 border-t-[#FF4E00] rounded-full animate-spin" />
  </div>
);

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans selection:bg-[#FF4E00] selection:text-black selection:font-black relative overflow-x-hidden transition-colors">
      <Navbar />
      <main className="pt-20">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={user ? <Navigate to="/browse" /> : <Landing />} />
            <Route path="/browse" element={<Home />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/movie/:id" element={<Movie />} />
            <Route path="/chat" element={user ? <Chat /> : <Navigate to="/" />} />
            <Route path="/watchlist" element={user ? <Watchlist /> : <Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>
      <AuthModal />
      <div className="fixed -bottom-20 -left-20 w-64 md:w-96 h-64 md:h-96 bg-[#FF4E00] blur-[100px] md:blur-[160px] opacity-10 rounded-full pointer-events-none z-0"></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[100px] md:text-[200px] lg:text-[300px] font-black opacity-[0.02] pointer-events-none uppercase tracking-tighter z-0 select-none">
        CIGHT
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
