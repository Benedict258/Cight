import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMovieDetails, TMDB_IMAGE_BASE } from '../lib/tmdb';
import { Star, Clock, Calendar, Bookmark, Share2, ArrowLeft, Play, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

export default function Movie() {
  const { id } = useParams();
  const { user } = useAuth();
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    getMovieDetails(id)
      .then(res => {
        setMovie(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    if (user) {
      const q = query(collection(db, 'watchlists'), where('userId', '==', user.uid), where('movieId', '==', id));
      getDocs(q).then(snap => setIsSaved(!snap.empty));
    }
  }, [id, user]);

  const toggleWatchlist = async () => {
    if (!user || !movie || saving) return;
    setSaving(true);
    
    try {
      const q = query(collection(db, 'watchlists'), where('userId', '==', user.uid), where('movieId', '==', id));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        await deleteDoc(doc(db, 'watchlists', snap.docs[0].id));
        setIsSaved(false);
      } else {
        await addDoc(collection(db, 'watchlists'), {
          userId: user.uid,
          movieId: movie.id.toString(),
          movieTitle: movie.title,
          posterPath: movie.poster_path,
          addedAt: new Date().toISOString()
        });
        setIsSaved(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!movie) return <div className="text-center py-20">Movie not found</div>;

  const trailer = movie.videos?.results?.find((v: any) => v.type === 'Trailer');

  return (
    <div className="min-h-screen pb-20">
      <div className="relative h-[60vh] w-full">
        <img 
          src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`} 
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0502] via-[#0a0502]/40 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-64 relative z-10 flex flex-col md:flex-row gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-72 hidden md:block shrink-0"
        >
          <img 
            src={`${TMDB_IMAGE_BASE}${movie.poster_path}`} 
            alt={movie.title}
            className="w-full rounded-3xl shadow-2xl border border-white/10"
          />
        </motion.div>

        <div className="flex-1 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap gap-2">
              {movie.genres?.map((g: any) => (
                <span key={g.id} className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-medium border border-white/5">
                  {g.name}
                </span>
              ))}
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
              {movie.title}
            </h1>

            <div className="flex items-center gap-6 text-zinc-400 text-sm font-medium">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-white">{movie.vote_average?.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{movie.runtime} min</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{movie.release_date}</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-4"
          >
            {trailer && (
              <a 
                href={`https://www.youtube.com/watch?v=${trailer.key}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-zinc-200 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" /> Watch Trailer
              </a>
            )}
            <button 
              onClick={toggleWatchlist}
              disabled={!user || saving}
              className={movie && `flex items-center gap-2 px-8 py-3 rounded-full font-bold border transition-all ${
                isSaved ? 'bg-orange-600/10 border-orange-600 text-orange-500' : 'bg-transparent border-white/20 hover:border-white/40'
              } disabled:opacity-50`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'In Watchlist' : 'Add to Watchlist'}
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-2">
              <Info className="w-5 h-5 text-zinc-400" /> Synopsis
            </h3>
            <p className="text-zinc-400 leading-relaxed text-lg">
              {movie.overview}
            </p>
          </motion.div>

          {/* Cast */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4 pt-4"
          >
            <h3 className="text-xl font-bold uppercase tracking-tight">Top Cast</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {movie.credits?.cast?.slice(0, 8).map((person: any) => (
                <div key={person.id} className="shrink-0 w-24">
                  <div className="w-24 h-24 rounded-full overflow-hidden border border-white/10 mb-2">
                    {person.profile_path ? (
                      <img 
                        src={`${TMDB_IMAGE_BASE}${person.profile_path}`} 
                        className="w-full h-full object-cover" 
                        alt={person.name}
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">No Image</div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-center line-clamp-1">{person.name}</p>
                  <p className="text-[9px] text-zinc-500 text-center line-clamp-1">{person.character}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
