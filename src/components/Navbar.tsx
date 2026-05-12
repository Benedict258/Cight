import { Link, useLocation } from 'react-router-dom';
import { Camera, Home, MessageSquare, Bookmark, User as UserIcon, LogOut, Search, Menu, X } from 'lucide-react';
import { useAuth } from '../App';
import { logout } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useState } from 'react';

export default function Navbar() {
  const { user, openAuthModal } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Discover', path: '/browse', icon: Home },
    { name: 'Scanner', path: '/scan', icon: Camera },
    { name: 'AI Expert', path: '/chat', icon: MessageSquare },
  ];

  if (user) {
    navItems.push({ name: 'Library', path: '/watchlist', icon: Bookmark });
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-white/70 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link to="/" className="flex items-center gap-1.5 md:gap-2 group">
              <img 
                src="/cight_logo.png" 
                alt="CIGHT Logo" 
                className="w-10 h-10 md:w-12 md:h-12 object-contain group-hover:scale-110 transition-transform filter drop-shadow-[0_0_8px_rgba(255,78,0,0.2)]"
                referrerPolicy="no-referrer"
              />
              <span className="text-lg md:text-xl font-black tracking-tighter uppercase italic">Cight</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors",
                  location.pathname === item.path ? "text-[#FF4E00]" : "text-white/50 hover:text-white"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-2 md:gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] font-black uppercase tracking-wider text-white/90 truncate max-w-[120px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                  <button 
                    onClick={() => logout()}
                    className="text-[9px] text-white/40 hover:text-[#FF4E00] flex items-center gap-1 ml-auto uppercase font-bold tracking-tighter transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
                <div className="w-8 h-8 md:w-9 md:h-9 bg-zinc-800 rounded-sm overflow-hidden border border-white/10 filter grayscale hover:grayscale-0 transition-all">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#FF4E00] text-black font-black italic text-xs">
                      {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Mobile logout button */}
                <button onClick={() => logout()} className="sm:hidden text-white/40 hover:text-[#FF4E00]">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="text-[#FF4E00] text-[10px] font-black uppercase tracking-widest border border-[#FF4E00]/20 px-4 py-2 hover:bg-[#FF4E00] hover:text-black transition-all"
              >
                Login
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/10 bg-[#0A0A0A]/95 overflow-hidden"
            >
              <div className="px-6 py-8 space-y-6">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 text-xs font-black uppercase tracking-[0.2em] transition-colors",
                      location.pathname === item.path ? "text-[#FF4E00]" : "text-white/40 hover:text-white"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
