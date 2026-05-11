import { Link, useLocation } from 'react-router-dom';
import { Camera, Home, MessageSquare, Bookmark, User as UserIcon, LogOut, Search } from 'lucide-react';
import { useAuth } from '../App';
import { login, logout } from '../lib/firebase';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Discover', path: '/', icon: Home },
    { name: 'Scan', path: '/scan', icon: Camera },
    { name: 'AI Chat', path: '/chat', icon: MessageSquare },
  ];

  if (user) {
    navItems.push({ name: 'Watchlist', path: '/watchlist', icon: Bookmark });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-10 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-[#FF4E00] rounded-sm flex items-center justify-center font-black text-xl group-hover:scale-105 transition-transform text-black uppercase">
            C
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase italic">Cight</span>
        </Link>

        <div className="hidden md:flex items-center gap-10">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors",
                location.pathname === item.path ? "text-[#FF4E00]" : "text-white/50 hover:text-white"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/90">{user.displayName}</p>
                <button 
                  onClick={logout}
                  className="text-[10px] text-white/40 hover:text-[#FF4E00] flex items-center gap-1 ml-auto uppercase font-bold tracking-tighter"
                >
                  Sign Out
                </button>
              </div>
              <img 
                src={user.photoURL || ''} 
                alt="profile" 
                className="w-10 h-10 rounded-sm border-2 border-white/10 filter grayscale hover:grayscale-0 transition-all"
              />
            </div>
          ) : (
            <button
              onClick={login}
              className="text-[#FF4E00] text-xs font-bold uppercase tracking-widest hover:underline px-2 py-1"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
