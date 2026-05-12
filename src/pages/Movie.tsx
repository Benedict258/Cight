import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { getDetails, TMDB_IMAGE_BASE } from '../lib/tmdb';
import { Star, Clock, Calendar, Bookmark, Share2, ArrowLeft, Play, Info, ThumbsUp, ThumbsDown, MessageSquare, Send, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, setDoc, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { cn } from '../lib/utils';

export default function Movie() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = (searchParams.get('type') || 'movie') as 'movie' | 'tv';
  const { user, openAuthModal } = useAuth();
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Ratings State
  const [userRating, setUserRating] = useState<'like' | 'dislike' | null>(null);
  const [ratingCounts, setRatingCounts] = useState({ likes: 0, dislikes: 0 });

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    getDetails(id, type)
      .then(res => {
        setMovie(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    if (user) {
      const path = 'watchlists';
      const q = query(collection(db, 'watchlists'), where('userId', '==', user.uid), where('movieId', '==', id));
      getDocs(q).then(snap => setIsSaved(!snap.empty)).catch(e => handleFirestoreError(e, OperationType.LIST, path));

      // Fetch user rating
      const ratingDocRef = doc(db, 'ratings', `${user.uid}_${id}`);
      getDocs(query(collection(db, 'ratings'), where('userId', '==', user.uid), where('movieId', '==', id)))
        .then(snap => {
          if (!snap.empty) {
            setUserRating(snap.docs[0].data().type);
          }
        });
    }

    // Subscribe to comments
    const commentsQuery = query(
      collection(db, 'comments'),
      where('movieId', '==', id),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'comments'));

    // Subscribe to ratings (to get counts)
    const ratingsQuery = query(collection(db, 'ratings'), where('movieId', '==', id));
    const unsubscribeRatings = onSnapshot(ratingsQuery, (snapshot) => {
      const likes = snapshot.docs.filter(d => d.data().type === 'like').length;
      const dislikes = snapshot.docs.filter(d => d.data().type === 'dislike').length;
      setRatingCounts({ likes, dislikes });
    });

    return () => {
      unsubscribeComments();
      unsubscribeRatings();
    };
  }, [id, user, type]);

  const toggleWatchlist = async () => {
    if (!user) {
      alert('Please sign in to add items to your watchlist');
      return;
    }
    if (!movie || saving) return;
    setSaving(true);
    
    try {
      const path = 'watchlists';
      const q = query(collection(db, 'watchlists'), where('userId', '==', user.uid), where('movieId', '==', id));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        await deleteDoc(doc(db, 'watchlists', snap.docs[0].id));
        setIsSaved(false);
      } else {
        await addDoc(collection(db, 'watchlists'), {
          userId: user.uid,
          movieId: movie.id.toString(),
          movieTitle: movie.title || movie.name,
          mediaType: type,
          posterPath: movie.poster_path,
          addedAt: serverTimestamp()
        });
        setIsSaved(true);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'watchlists');
    } finally {
      setSaving(false);
    }
  };

  const handleRating = async (newType: 'like' | 'dislike') => {
    if (!user) {
      alert('Please sign in to rate');
      return;
    }
    const ratingId = `${user.uid}_${id}`;
    const ratingRef = doc(db, 'ratings', ratingId);

    try {
      if (userRating === newType) {
        // Remove rating
        await deleteDoc(ratingRef);
        setUserRating(null);
      } else {
        // Set rating
        await setDoc(ratingRef, {
          userId: user.uid,
          movieId: id,
          type: newType,
          updatedAt: serverTimestamp()
        });
        setUserRating(newType);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `ratings/${ratingId}`);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || postingComment) return;

    setPostingComment(true);
    try {
      await addDoc(collection(db, 'comments'), {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        movieId: id,
        content: newComment.trim(),
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'comments');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `comments/${commentId}`);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!movie) return <div className="text-center py-20">Movie not found</div>;

  const trailer = movie.videos?.results?.find((v: any) => v.type === 'Trailer');
  const title = movie.title || movie.name;
  const rating = movie.vote_average?.toFixed(1);
  const year = (movie.release_date || movie.first_air_date || movie.air_date)?.split('-')[0];
  const runtime = movie.runtime || (movie.episode_run_time?.[0]);

  // Custom Providers Detection
  const isAnime = movie.genres?.some((g: any) => g.id === 16) && 
                  (movie.origin_country?.includes('JP') || movie.production_countries?.some((c: any) => c.iso_3166_1 === 'JP'));
  const isKDrama = movie.origin_country?.includes('KR') || movie.production_countries?.some((c: any) => c.iso_3166_1 === 'KR');

  const customProviders = [
    { 
      name: 'MOVIEBOX', 
      logo: '/moviebox.svg',
      url: `https://moviebox.site/search?q=${encodeURIComponent(title)}`
    },
    ...(isAnime ? [{ 
      name: 'AnimePahe', 
      logo: '/animepahe.svg',
      url: `https://animepahe.com/anime?q=${encodeURIComponent(title)}`
    }] : []),
    ...(isKDrama ? [{ 
      name: 'Nkiri', 
      logo: '/nkiri.png',
      url: `https://nkiri.com/?s=${encodeURIComponent(title)}`
    }] : []),
    {
      name: 'YouTube',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + (year || '') + ' full movie')}`
    }
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-8 pt-8 relative z-50">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors group bg-black/40 backdrop-blur-md px-4 py-2 rounded-full w-fit">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>
      </div>
      <div className="relative h-[60vh] w-full -mt-20">
        <img 
          src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`} 
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0502] via-[#0a0502]/40 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-48 relative z-10 flex flex-col md:flex-row gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-56 hidden md:block shrink-0"
        >
          <img 
            src={`${TMDB_IMAGE_BASE}${movie.poster_path}`} 
            alt={title}
            className="w-full rounded-sm shadow-2xl border-2 border-white/5 grayscale group-hover:grayscale-0 transition-all duration-700"
          />
        </motion.div>

        <div className="flex-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex flex-wrap gap-2">
              {movie.genres?.map((g: any) => (
                <span key={g.id} className="px-2 py-0.5 bg-zinc-800 rounded-sm text-[8px] md:text-[9px] font-black uppercase tracking-widest border border-white/5">
                  {g.name}
                </span>
              ))}
              <span className="px-2 py-0.5 bg-white text-black rounded-sm text-[8px] md:text-[9px] font-black uppercase tracking-widest leading-none">
                {type}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-tight md:leading-none">
              {title}
            </h1>

            <div className="flex items-center gap-4 text-white/50 text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-[#FF4E00] fill-[#FF4E00]" />
                <span className="text-white">{rating}</span>
              </div>
              {runtime && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{runtime} min</span>
                </div>
              )}
              {year && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{year}</span>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-3"
          >
            {trailer && (
              <a 
                href={`https://www.youtube.com/watch?v=${trailer.key}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-[#FF4E00] transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Watch Trailer
              </a>
            )}
            <button 
              onClick={toggleWatchlist}
              disabled={!user || saving}
              className={`flex items-center gap-2 px-8 py-3 text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                isSaved ? 'bg-[#FF4E00]/10 border-[#FF4E00] text-[#FF4E00]' : 'bg-transparent border-white/20 hover:border-white'
              } disabled:opacity-50`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              {isSaved ? 'In Watchlist' : 'Add to Watchlist'}
            </button>

            {/* Social Sentiment */}
            <div className="flex bg-zinc-900 border border-white/10 rounded-sm">
              <button 
                onClick={() => handleRating('like')}
                className={cn(
                  "px-4 border-r border-white/10 flex items-center gap-2 py-3 text-[10px] font-black uppercase transition-all",
                  userRating === 'like' ? "text-[#FF4E00]" : "text-white/50 hover:text-white"
                )}
              >
                <ThumbsUp className={cn("w-3.5 h-3.5", userRating === 'like' && "fill-current")} />
                <span>{ratingCounts.likes}</span>
              </button>
              <button 
                onClick={() => handleRating('dislike')}
                className={cn(
                  "px-4 flex items-center gap-2 py-3 text-[10px] font-black uppercase transition-all",
                  userRating === 'dislike' ? "text-zinc-400" : "text-white/50 hover:text-white"
                )}
              >
                <ThumbsDown className={cn("w-3.5 h-3.5", userRating === 'dislike' && "fill-current")} />
                <span>{ratingCounts.dislikes}</span>
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="text-lg font-black uppercase italic tracking-tight flex items-center gap-2">
              <Info className="w-4 h-4 text-[#FF4E00]" /> Synopsis
            </h3>
            <p className="text-white/70 leading-relaxed text-sm max-w-2xl font-medium">
              {movie.overview}
            </p>
          </motion.div>

          {/* Watch Providers */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 pt-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF4E00]">Where to Watch</p>
              {movie['watch/providers']?.results?.US?.link && (
                <a 
                  href={movie['watch/providers'].results.US.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[8px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                >
                  Powered by JustWatch
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              {/* Custom Site Providers */}
              {customProviders.map((provider) => (
                <a 
                  key={provider.name} 
                  href={provider.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative"
                >
                  <img 
                    src={provider.logo} 
                    alt={provider.name}
                    className="w-10 h-10 rounded-sm filter grayscale hover:grayscale-0 transition-all border border-white/10 bg-zinc-900 object-contain p-1"
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1 bg-white text-black text-[8px] font-black uppercase tracking-tighter whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100]">
                    {provider.name}
                  </div>
                </a>
              ))}

              {/* Official TMDB Providers */}
              {movie['watch/providers']?.results?.US?.flatrate?.map((provider: any) => (
                <a 
                  key={provider.provider_id} 
                  href={movie['watch/providers'].results.US.link}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative"
                >
                  <img 
                    src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} 
                    alt={provider.provider_name}
                    className="w-10 h-10 rounded-sm filter grayscale hover:grayscale-0 transition-all border border-white/10"
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1 bg-white text-black text-[8px] font-black uppercase tracking-tighter whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100]">
                    {provider.provider_name}
                  </div>
                </a>
              ))}
            </div>

            <div className="pt-4 flex flex-wrap gap-3">
              <a 
                href={`https://vidsrc.to/embed/${type}/${id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-[9px] font-black uppercase tracking-widest text-white/70 hover:text-white transition-all border border-white/5 rounded-sm"
              >
                <Play className="w-3 h-3 fill-current" /> Stream Server 1
              </a>
              <a 
                href={`https://embed.smashystream.com/playere.php?tmdb=${id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-[9px] font-black uppercase tracking-widest text-white/70 hover:text-white transition-all border border-white/5 rounded-sm"
              >
                <Play className="w-3 h-3 fill-current" /> Stream Server 2
              </a>
            </div>
          </motion.div>

          {/* Cast */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4 pt-4"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF4E00]">Top Cast</p>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {movie.credits?.cast?.slice(0, 8).map((person: any) => (
                <div key={person.id} className="shrink-0 w-20">
                  <div className="w-20 h-20 rounded-sm overflow-hidden border border-white/10 mb-2 grayscale hover:grayscale-0 transition-all">
                    {person.profile_path ? (
                      <img 
                        src={`${TMDB_IMAGE_BASE}${person.profile_path}`} 
                        className="w-full h-full object-cover" 
                        alt={person.name}
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[8px] text-zinc-500 font-bold uppercase">No Image</div>
                    )}
                  </div>
                  <p className="text-[9px] font-black text-center line-clamp-1 uppercase whitespace-nowrap">{person.name}</p>
                  <p className="text-[8px] text-white/40 text-center line-clamp-1 uppercase font-bold">{person.character}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Comments Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-8 pt-12 border-t border-white/5"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-[#FF4E00]" />
              <h3 className="text-xl font-black uppercase italic tracking-tight">Social feed</h3>
              <span className="text-zinc-500 text-[10px] font-black bg-zinc-900 px-2 py-0.5 border border-white/5">{comments.length}</span>
            </div>

            {user ? (
              <form onSubmit={handlePostComment} className="relative group">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Tell the community what you think..."
                  className="w-full bg-zinc-900 border border-white/10 p-4 min-h-[100px] text-sm focus:outline-none focus:border-[#FF4E00] transition-all resize-none font-medium pr-14"
                  maxLength={1000}
                />
                <button 
                  type="submit"
                  disabled={!newComment.trim() || postingComment}
                  className="absolute bottom-4 right-4 p-2 bg-[#FF4E00] text-black hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="bg-zinc-900/50 border border-dashed border-white/10 p-8 text-center space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Sign in to join the conversation</p>
                <div className="flex justify-center">
                  <button 
                    onClick={openAuthModal}
                    className="px-8 py-3 bg-[#FF4E00] text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                  >
                    Login / Sign Up
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {comments.map((comment) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={comment.id} 
                    className="group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-white text-black flex items-center justify-center text-[10px] font-black italic">
                          {comment.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tight">{comment.userName}</span>
                        <span className="text-[8px] text-zinc-500 font-bold uppercase">
                          {comment.createdAt?.toDate ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(comment.createdAt.toDate()) : 'Recent'}
                        </span>
                      </div>
                      {user?.uid === comment.userId && (
                        <button 
                          onClick={() => handleDeleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300 font-medium leading-relaxed pl-9">
                      {comment.content}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>

              {comments.length === 0 && (
                <div className="py-20 text-center opacity-20 filter grayscale">
                  <img src="/cight_logo.png" alt="" className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Silence is key. Start the noise.</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
