import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import { Trash2, Film, Star, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TMDB_IMAGE_BASE } from '../lib/tmdb';

export default function Watchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'watchlists'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, [user]);

  const removeItem = async (firestoreId: string) => {
    try {
      await deleteDoc(doc(db, 'watchlists', firestoreId));
      setItems(prev => prev.filter(i => i.firestoreId !== firestoreId));
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-10 py-12 relative z-10">
      <div className="flex items-center gap-6 mb-16">
        <div className="h-12 w-3 bg-[#FF4E00]"></div>
        <div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter">WATCHLIST</h1>
          <p className="text-[#FF4E00] text-[10px] font-black uppercase tracking-[0.2em] mt-1">CURATED SELECTION</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-32 border-4 border-dashed border-white/5 bg-white/5 rounded-sm space-y-10 group">
          <Film className="w-24 h-24 text-white opacity-10 mx-auto group-hover:scale-110 group-hover:text-[#FF4E00] group-hover:opacity-100 transition-all duration-700" />
          <div className="space-y-4">
            <h3 className="text-4xl font-black uppercase italic tracking-tight opacity-20 group-hover:opacity-100 transition-opacity">Empty Collection</h3>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Explore or scan cinematic scenes to build your library.</p>
          </div>
          <Link to="/" className="inline-flex items-center gap-4 px-12 py-5 bg-white text-black text-sm font-black uppercase tracking-widest hover:bg-[#FF4E00] transition-colors">
            Start Discovering <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-12">
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div
                key={item.firestoreId}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative"
              >
                <Link to={`/movie/${item.movieId}`}>
                  <div className="aspect-[2/3] overflow-hidden rounded-sm border-2 border-white/5 group-hover:border-[#FF4E00] transition-all duration-500 bg-white/5 relative">
                    {item.posterPath ? (
                      <img 
                        src={`${TMDB_IMAGE_BASE}${item.posterPath}`} 
                        alt={item.movieTitle}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 uppercase font-black text-2xl italic tracking-tighter">No Poster</div>
                    )}
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity p-8 flex flex-col justify-end">
                      <p className="font-black text-2xl leading-none uppercase italic tracking-tighter">{item.movieTitle}</p>
                      <span className="text-[#FF4E00] text-[10px] font-black uppercase tracking-widest mt-4">View Film</span>
                    </div>
                  </div>
                </Link>
                
                <button 
                  onClick={() => removeItem(item.firestoreId)}
                  className="absolute -top-3 -right-3 w-10 h-10 bg-white text-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-black hover:text-white border-2 border-white z-20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
