import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getDetails, TMDB_IMAGE_BASE } from '../lib/tmdb';
import { Star, Clock, Calendar, Bookmark, ArrowLeft, Play, Info, ThumbsUp, ThumbsDown, MessageSquare, Send, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { cn } from '../lib/utils';
import SEO from '../components/SEO';

function formatDate(date: any, includeYear?: boolean) {
  if (!date) return 'Recent';
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return 'Recent';
  const opts: Intl.DateTimeFormatOptions = includeYear
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', opts).format(d);
}

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
  const [showTrailer, setShowTrailer] = useState(false);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyComment, setReplyComment] = useState('');

  // Ratings State
  const [userRating, setUserRating] = useState<'like' | 'dislike' | null>(null);
  const [ratingCounts, setRatingCounts] = useState({ likes: 0, dislikes: 0 });

  const fetchComments = useCallback(() => {
    apiGet('/comments/' + id)
      .then(data => setComments(data))
      .catch(err => console.error('Comments fetch failed:', err));
  }, [id]);

  const fetchRatings = useCallback(() => {
    apiGet('/ratings/' + id)
      .then(data => {
        const likes = data?.filter?.((r: any) => r.type === 'like')?.length || 0;
        const dislikes = data?.filter?.((r: any) => r.type === 'dislike')?.length || 0;
        setRatingCounts({ likes, dislikes });
      })
      .catch(err => console.error('Ratings fetch failed:', err));
  }, [id]);

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

    fetchComments();
    fetchRatings();

    if (user) {
      apiGet('/watchlist/check/' + id)
        .then(data => setIsSaved(data?.saved || false))
        .catch(err => console.error('Watchlist check failed:', err));

      apiGet('/ratings/' + id + '/mine')
        .then(data => {
          if (data?.type) {
            setUserRating(data.type);
          }
        })
        .catch(err => console.warn('Rating fetch failed:', err));
    }
  }, [id, user, type]);

  const toggleWatchlist = async () => {
    if (!user) {
      alert('Please sign in to add items to your watchlist');
      return;
    }
    if (!movie || saving) return;
    setSaving(true);

    try {
      if (isSaved) {
        const items = await apiGet('/watchlist');
        const item = items?.find((w: any) => w.movieId === id);
        if (item) {
          await apiDelete('/watchlist/' + item.id);
        }
        setIsSaved(false);
      } else {
        await apiPost('/watchlist', {
          movieId: id,
          movieTitle: movie.title || movie.name,
          mediaType: type,
          posterPath: movie.poster_path
        });
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Watchlist toggle failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRating = async (newType: 'like' | 'dislike') => {
    if (!user) {
      alert('Please sign in to rate');
      return;
    }

    try {
      await apiPost('/ratings', { movieId: id, type: newType });

      if (userRating === newType) {
        setUserRating(null);
      } else {
        setUserRating(newType);
      }

      fetchRatings();
    } catch (e) {
      console.error('Rating failed:', e);
    }
  };

  const handlePostComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    const content = parentId ? replyComment : newComment;
    if (!user || !content.trim() || postingComment) return;

    setPostingComment(true);
    try {
      await apiPost('/comments', {
        movieId: id,
        content: content.trim(),
        parentId: parentId || null
      });
      if (parentId) {
        setReplyComment('');
        setReplyTo(null);
      } else {
        setNewComment('');
      }
      fetchComments();
    } catch (e) {
      console.error('Comment post failed:', e);
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await apiDelete('/comments/' + commentId);
      fetchComments();
    } catch (e) {
      console.error('Comment delete failed:', e);
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
  const customProviders = [
    { 
      name: 'MOVIEBOX', 
      logo: '/moviebox.svg',
      url: `https://moviebox.site/search?q=${encodeURIComponent(title)}`
    },
    {
      name: 'YouTube',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Youtube_logo.png',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + (year || '') + ' full movie')}`
    }
  ];

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/scan');
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <SEO 
        title={`${title} (${year || 'N/A'})`} 
        description={movie.overview || `View details, streaming providers, trailers, cast, and discussion for ${title}.`}
        image={movie.backdrop_path ? `${TMDB_IMAGE_BASE}/w1280${movie.backdrop_path}` : undefined}
        keywords={`cight, ${title}, movie trailer, watch ${title}, streaming providers, cast, ${movie.genres?.map((g: any) => g.name).join(', ') || ''}`}
      />
      <AnimatePresence>
        {showTrailer && trailer && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTrailer(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl aspect-video bg-black shadow-2xl border border-white/10"
            >
              <button 
                onClick={() => setShowTrailer(false)}
                className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                Close Trailer <Trash2 className="w-4 h-4 rotate-45" />
              </button>
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
                title="Trailer"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-8 pt-8 relative z-50">
        <button onClick={handleBack} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors group bg-black/40 backdrop-blur-md px-4 py-2 rounded-full w-fit">
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
              <button 
                onClick={() => setShowTrailer(true)}
                className="flex items-center gap-2 px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-[#FF4E00] transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Watch Trailer
              </button>
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
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (provider.name === 'YouTube') {
                        target.src = 'https://www.youtube.com/favicon.ico';
                      } else {
                        target.src = 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/play-circle.svg';
                        target.classList.add('invert', 'p-2');
                      }
                    }}
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

            <div className="space-y-8">
              <AnimatePresence mode="popLayout">
                {comments.filter(c => !c.parentId).map((comment) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={comment.id} 
                    className="group space-y-4"
                  >
                    <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white text-black flex items-center justify-center text-[10px] font-black italic">
                            {comment.userName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-tight">{comment.userName}</span>
                            <span className="text-[8px] text-zinc-500 font-bold uppercase">
                              {formatDate(comment.createdAt, true)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {user && (
                            <button 
                              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                              className={cn(
                                "text-[9px] font-black uppercase tracking-widest transition-colors",
                                replyTo === comment.id ? "text-[#FF4E00]" : "text-white/40 hover:text-[#FF4E00]"
                              )}
                            >
                              Reply
                            </button>
                          )}
                          {user?.uid === comment.userId && (
                            <button 
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-zinc-500 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                        {comment.content}
                      </p>
                    </div>

                    {/* Reply Form */}
                    <AnimatePresence>
                      {replyTo === comment.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden pl-12"
                        >
                          <form onSubmit={(e) => handlePostComment(e, comment.id)} className="relative">
                            <textarea
                              value={replyComment}
                              onChange={(e) => setReplyComment(e.target.value)}
                              placeholder={`Reply to ${comment.userName}...`}
                              className="w-full bg-zinc-900 border border-white/10 p-3 min-h-[80px] text-xs focus:outline-none focus:border-[#FF4E00] transition-all resize-none font-medium pr-12"
                              maxLength={1000}
                              autoFocus
                            />
                            <button 
                              type="submit"
                              disabled={!replyComment.trim() || postingComment}
                              className="absolute bottom-3 right-3 p-1.5 bg-[#FF4E00] text-black hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Replies List */}
                    <div className="space-y-4 pl-12">
                      {comments.filter(c => c.parentId === comment.id).map((reply) => (
                        <motion.div 
                          key={reply.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="group/reply"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-zinc-800 text-white flex items-center justify-center text-[8px] font-black italic">
                                {reply.userName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-tight opacity-70">{reply.userName}</span>
                              <span className="text-[7px] text-zinc-600 font-bold uppercase">
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>
                            {user?.uid === reply.userId && (
                              <button 
                                onClick={() => handleDeleteComment(reply.id)}
                                className="opacity-0 group-hover/reply:opacity-100 text-zinc-700 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                            {reply.content}
                          </p>
                        </motion.div>
                      ))}
                    </div>
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
