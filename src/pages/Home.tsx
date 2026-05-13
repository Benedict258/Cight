import { useState, useEffect } from 'react';
import { getTrendingMovies, TMDB_IMAGE_BASE, getGenres, discoverMoviesByGenre } from '../lib/tmdb';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Play, Star, TrendingUp, Info, ArrowRight, ChevronDown, ArrowLeft, Search } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [trending, setTrending] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [fetchingMovies, setFetchingMovies] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/scan?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getTrendingMovies(),
      getGenres()
    ])
      .then(([trendingRes, genresRes]) => {
        setTrending(trendingRes.results.slice(0, 10));
        setGenres(genresRes.genres);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message === 'MISSING_TMDB_KEY' ? 'CONFIG_REQUIRED' : 'Failed to load content');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedGenre === 'all') {
      if (genres.length > 0) { // Only refetch if it's not the initial mount
        setFetchingMovies(true);
        getTrendingMovies()
          .then(res => {
            setTrending(res.results.slice(0, 10));
            setFetchingMovies(false);
          })
          .catch(() => setFetchingMovies(false));
      }
      return;
    }

    setFetchingMovies(true);
    discoverMoviesByGenre(selectedGenre)
      .then(res => {
        setTrending(res.results.slice(0, 10));
        setFetchingMovies(false);
      })
      .catch((err) => {
        console.error(err);
        setFetchingMovies(false);
      });
  }, [selectedGenre]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-[#FF4E00] border-t-transparent animate-spin" />
    </div>
  );

  if (error === 'CONFIG_REQUIRED') return (
    <div className="max-w-7xl mx-auto px-10 py-32 text-center space-y-8">
      <div className="inline-block p-6 bg-[#FF4E00]/10 border-2 border-[#FF4E00] rounded-sm">
        <Info className="w-12 h-12 text-[#FF4E00] mx-auto mb-4" />
        <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-2">TMDB API Key Required</h2>
        <p className="text-zinc-400 font-medium max-w-md mx-auto">
          Please add your <code className="text-white bg-white/10 px-2 py-0.5">VITE_TMDB_API_KEY</code> to the <strong className="text-white">Secrets</strong> panel in AI Studio settings to enable movie discovery features.
        </p>
      </div>
      <div className="flex justify-center gap-4">
        <Link to="/scan" className="px-8 py-4 border-2 border-white font-black uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-all">Go to Scanner</Link>
        <Link to="/chat" className="px-8 py-4 border-2 border-white font-black uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-all">Open AI Chat</Link>
      </div>
    </div>
  );

  const heroMovie = trending[0];

  return (
    <div className="space-y-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-8 pt-6">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-[#FF4E00] transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Landing</span>
        </button>
      </div>
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row gap-8 items-center min-h-[70vh] relative pt-8">
        {/* Left: Typography */}
        <div className="w-full md:w-3/5 space-y-8 z-10">
          <motion.h1 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl sm:text-6xl md:text-[100px] lg:text-[130px] font-black leading-[0.85] md:leading-[0.8] tracking-tighter uppercase break-words"
          >
            SEE IT.<br/>
            <span className="text-[#FF4E00]">KNOW IT.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg font-medium opacity-70 max-w-md leading-relaxed"
          >
            The AI-powered entertainment recognition engine. Identify movies, TV shows, and actors from any screenshot or social clip instantly.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-6 pt-2"
          >
            <form onSubmit={handleSearch} className="group relative max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-[#FF4E00] transition-colors" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, podcasts, creators..."
                className="w-full bg-white/5 border-2 border-white/10 px-12 py-4 text-xs font-black uppercase tracking-widest outline-none focus:border-[#FF4E00] focus:bg-white/10 transition-all rounded-none"
              />
              <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white text-black hover:bg-[#FF4E00] transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="flex flex-wrap gap-3">
              <Link 
                to="/scan"
                className="px-8 py-3.5 bg-white text-black font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform"
              >
                Identify Scene
              </Link>
              <Link 
                to="/chat"
                className="px-8 py-3.5 border-2 border-white font-black uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-all"
              >
                AI Assistant
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Right: Widget Preview */}
        <div className="w-full md:w-2/5 flex items-center justify-center relative">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: -2 }}
            className="w-full bg-[#151515] border border-white/10 rounded-sm p-6 relative shadow-2xl"
          >
            <div className="absolute -top-3 -right-3 bg-[#FF4E00] text-black px-3 py-0.5 text-[9px] font-black uppercase tracking-tighter shadow-lg">
              Live Recognition
            </div>
            
            <div className="aspect-video w-full bg-[#000] rounded-sm border border-white/5 overflow-hidden relative group">
              <img 
                src={`https://image.tmdb.org/t/p/original${heroMovie?.backdrop_path}`} 
                className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000"
                alt="Demo"
              />
              <div className="absolute inset-0 flex items-center justify-center border-2 border-[#FF4E00]/50 m-2">
                 <div className="absolute top-1 left-1 text-[8px] bg-[#FF4E00] px-1.5 py-0.5 font-bold text-black uppercase tracking-widest">FACE DETECTED</div>
                 <div className="w-8 h-8 border-t border-l border-[#FF4E00] absolute top-0 left-0"></div>
                 <div className="w-8 h-8 border-t border-r border-[#FF4E00] absolute top-0 right-0"></div>
                 <div className="w-8 h-8 border-b border-l border-[#FF4E00] absolute bottom-0 left-0"></div>
                 <div className="w-8 h-8 border-b border-r border-[#FF4E00] absolute bottom-0 right-0"></div>
              </div>
              <div className="absolute bottom-2 left-2 right-2 h-1 bg-white/20">
                <div className="h-full bg-[#FF4E00] w-3/4"></div>
              </div>
            </div>

            <div className="mt-4 text-left">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter">{heroMovie?.title}</h3>
                  <p className="text-[#FF4E00] text-[10px] font-bold uppercase tracking-widest mt-0.5">Trending Pick</p>
                </div>
                <div className="text-right">
                  <div className="text-[8px] opacity-50 uppercase font-bold tracking-widest">Confidence</div>
                  <div className="text-lg font-black italic tracking-tighter">99.8%</div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-2 bg-white/5 rounded-sm border border-white/5">
                  <div className="text-[8px] opacity-50 uppercase font-bold tracking-widest">Release</div>
                  <div className="text-xs font-bold tracking-tighter">{heroMovie?.release_date?.split('-')[0] || '2024'}</div>
                </div>
                <div className="p-2 bg-white/5 rounded-sm border border-white/5">
                  <div className="text-[8px] opacity-50 uppercase font-bold tracking-widest">Rating</div>
                  <div className="text-xs font-bold tracking-tighter flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-[#FF4E00] text-[#FF4E00]" />
                    {heroMovie?.vote_average?.toFixed(1) || '8.5'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Background Visual Flare */}
        <div className="absolute -bottom-10 -left-10 w-[400px] h-[400px] bg-[#FF4E00] blur-[150px] opacity-5 rounded-full pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-[200px] font-black opacity-[0.02] pointer-events-none uppercase tracking-tighter font-sans">
          CIGHT
        </div>
      </section>

      {/* Popular Movies */}
      <section className="max-w-7xl mx-auto px-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src="/cight_logo.png" alt="" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Latest Trends</h2>
          </div>

          <div className="relative group">
            <select 
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="appearance-none bg-white/5 border-2 border-white/10 px-6 py-2.5 pr-12 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:border-[#FF4E00] focus:border-[#FF4E00] outline-none transition-all rounded-none"
            >
              <option value="all" className="bg-zinc-900">All Genres</option>
              {genres.map(genre => (
                <option key={genre.id} value={genre.id} className="bg-zinc-900">{genre.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white/40 group-hover:text-[#FF4E00] transition-colors" />
          </div>
        </div>

        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 transition-opacity duration-300 ${fetchingMovies ? 'opacity-30' : 'opacity-100'}`}>
          {trending.slice(1).map((movie, idx) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="relative group cursor-pointer"
            >
              <Link to={`/movie/${movie.id}`} className="block">
                <div className="aspect-[2/3] overflow-hidden rounded-sm border border-white/5 group-hover:border-[#FF4E00]/50 transition-all duration-500 relative">
                  <img 
                    src={`${TMDB_IMAGE_BASE}${movie.poster_path}`} 
                    alt={movie.title}
                    className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                     <p className="text-lg font-black leading-tight uppercase italic">{movie.title}</p>
                     <div className="mt-3 flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-widest text-[#FF4E00]">Details</span>
                       <ArrowRight className="w-3.5 h-3.5 text-[#FF4E00]" />
                     </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Marquee Footer */}
      <footer className="bg-white text-black py-2.5 overflow-hidden border-t-2 border-[#FF4E00]">
        <div className="flex gap-16 whitespace-nowrap px-10 animate-marquee text-[10px] font-black uppercase tracking-[0.2em]">
          <span>Trending: {trending.map(m => m.title).join(' • ')} • Identify Any Scene Instantly • Cight AI Recognition • {new Date().getFullYear()}</span>
          <span aria-hidden="true">Trending: {trending.map(m => m.title).join(' • ')} • Identify Any Scene Instantly • Cight AI Recognition • {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
