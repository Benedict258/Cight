/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from './lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Scan from './pages/Scan';
import Movie from './pages/Movie';
import Chat from './pages/Chat';
import Watchlist from './pages/Watchlist';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && user.email) {
      const syncSubscriber = async () => {
        try {
          // Automated sync to local storage for agentic notifications via Substack export/API
          await setDoc(doc(db, 'subscribers', user.uid), {
            email: user.email,
            userId: user.uid,
            subscribedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.error('Failed to sync subscriber:', e);
        }
      };
      syncSubscriber();
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <Router>
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#FF4E00] selection:text-black selection:font-black relative overflow-x-hidden">
          <Navbar />
          <main className="pt-20">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/browse" element={<Home />} />
              <Route path="/scan" element={<Scan />} />
              <Route path="/movie/:id" element={<Movie />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/watchlist" element={user ? <Watchlist /> : <Navigate to="/" />} />
            </Routes>
          </main>

          {/* Visual Flare Elements */}
          <div className="fixed -bottom-20 -left-20 w-96 h-96 bg-[#FF4E00] blur-[160px] opacity-10 rounded-full pointer-events-none z-0"></div>
          <div className="fixed top-1/4 left-1/2 -translate-x-1/2 text-[150px] md:text-[300px] font-black opacity-[0.02] pointer-events-none uppercase tracking-tighter z-0 select-none">
            CIGHT
          </div>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}
