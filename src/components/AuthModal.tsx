import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        await register(email, password, displayName);
      } else {
        await login(email, password);
      }
      setAuthModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onClose = () => setAuthModalOpen(false);

  return (
    <AnimatePresence>
      {authModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-sm p-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4E00]/10 blur-3xl -mr-16 -mt-16" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div className="text-center">
                <img src="/cight_logo.png" alt="" className="w-12 h-12 mx-auto mb-4 filter drop-shadow-[0_0_10px_rgba(255,78,0,0.3)]" />
                <h2 className="text-2xl font-black italic tracking-tighter uppercase">{mode === 'login' ? 'Welcome Back' : 'Join the Collective'}</h2>
                <p className="text-[10px] uppercase font-black tracking-widest text-[#FF4E00] mt-1">{mode === 'login' ? 'Login to continue' : 'Create your account'}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="NAME"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-zinc-800 border border-white/5 rounded-sm py-3 pl-10 pr-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-[#FF4E00] transition-all"
                    />
                  </div>
                )}
                
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="email"
                    placeholder="EMAIL"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/5 rounded-sm py-3 pl-10 pr-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-[#FF4E00] transition-all"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="password"
                    placeholder="PASSWORD"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/5 rounded-sm py-3 pl-10 pr-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-[#FF4E00] transition-all"
                  />
                </div>

                {error && <p className="text-[10px] text-red-500 font-black uppercase tracking-tight text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#FF4E00] text-black text-xs font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : (mode === 'login' ? 'Login' : 'Signup')}
                </button>
              </form>

              <p className="text-center text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                <button 
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-white hover:text-[#FF4E00] transition-colors underline"
                >
                  {mode === 'login' ? 'Signup' : 'Login'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
