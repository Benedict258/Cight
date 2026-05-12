import { useState, useRef } from 'react';
import { Camera, Upload, Search, Link as LinkIcon, ArrowRight, Loader2, Info, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { identifyMovieFromMedia } from '../lib/gemini';
import { traceMoeIdentify } from '../lib/tracemoe';
import { searchAnime } from '../lib/anilist';
import { searchMulti, TMDB_IMAGE_BASE } from '../lib/tmdb';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function Scan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'scanning' | 'results'>('upload');
  const [result, setResult] = useState<any>(null);
  const [tmdbMatch, setTmdbMatch] = useState<any>(null);
  const [animeMatch, setAnimeMatch] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setMimeType(selected.type);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
      setError(null);
    }
  };

  const startScan = async () => {
    if (!preview || !mimeType) return;
    setLoading(true);
    setStep('scanning');
    setError(null);

    try {
      // 1. Identify with Gemini
      const base64 = preview.split(',')[1];
      const aiResponse = await identifyMovieFromMedia(base64, mimeType);
      setResult(aiResponse);

      // 2. Specialized Anime Check
      if (aiResponse.isAnime) {
        const traceResponse = await traceMoeIdentify(base64);
        if (traceResponse?.result?.[0]) {
          const animeSearch = await searchAnime(traceResponse.result[0].filename || aiResponse.title);
          if (animeSearch?.Page?.media?.[0]) {
             setAnimeMatch(animeSearch.Page.media[0]);
          }
        } else {
          try {
            const animeSearch = await searchAnime(aiResponse.title);
            if (animeSearch?.Page?.media?.[0]) {
               setAnimeMatch(animeSearch.Page.media[0]);
            }
          } catch(e) { console.warn("Anime search failed", e); }
        }
      }

      // 3. Movie/TV Check (if not anime or as fallback)
      if (!aiResponse.isAnime) {
        const multiSearch = await searchMulti(aiResponse.title, aiResponse.year);
        if (multiSearch.results && multiSearch.results.length > 0) {
          setTmdbMatch(multiSearch.results[0]);
          
          if (user) {
            await addDoc(collection(db, 'scans'), {
              userId: user.uid,
              mediaUrl: 'upload-placeholder',
              resultId: multiSearch.results[0].id.toString(),
              movieTitle: multiSearch.results[0].title || multiSearch.results[0].name,
              mediaType: multiSearch.results[0].media_type,
              confidence: aiResponse.confidence,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
      
      setStep('results');
    } catch (err: any) {
      console.error(err);
      setError("Recognition failed. Please try a clearer image.");
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setMimeType(null);
    setResult(null);
    setTmdbMatch(null);
    setAnimeMatch(null);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-[#FF4E00] transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back</span>
      </button>
      <div className="flex items-center gap-4 mb-12">
        <img src="/cight_logo.png" alt="" className="w-20 h-20 object-contain" referrerPolicy="no-referrer" />
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Scene Scanner</h1>
      </div>

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-2 gap-8"
          >
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-white/5 bg-white/5 aspect-video flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#FF4E00]/50 transition-all p-8 relative overflow-hidden"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,video/*"
              />
              {preview ? (
                mimeType?.startsWith('video/') ? (
                  <video 
                    src={preview} 
                    className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-500"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-500" />
                )
              ) : null}
              
              <div className="relative z-10 space-y-3">
                <div className="w-12 h-12 bg-white text-black flex items-center justify-center mx-auto rounded-sm group-hover:bg-[#FF4E00] transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xl font-black uppercase italic tracking-tighter">Upload Content</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">Select scene screenshot or short clip</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-8">
              <div className="space-y-3">
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none italic">
                  IDENTIFY <br/>
                  <span className="text-[#FF4E00]">EVERY FRAME.</span>
                </h2>
                <p className="opacity-60 font-medium text-sm">Our AI analyzes embeddings from movie frames and clips to pinpoint the exact title and metadata in seconds.</p>
              </div>

              {preview && (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={startScan}
                  className="w-fit px-10 py-4 bg-[#FF4E00] text-black font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform"
                >
                  Start Recognition
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {step === 'scanning' && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-32 space-y-10"
          >
            <div className="relative w-48 h-48 border-4 border-white/10 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-[#FF4E00] animate-[spin_3s_linear_infinite] m-[-4px]" />
              <Search className="w-16 h-16 text-[#FF4E00] animate-pulse" />
              <div className="absolute top-2 left-2 bg-[#FF4E00] text-black text-[8px] font-black uppercase px-2 py-0.5 animate-bounce">Scanning...</div>
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter italic">AI Search Active</h2>
              <div className="inline-flex gap-2">
                {[...Array(3)].map((_, i) => (
                   <div key={i} className="w-3 h-3 bg-[#FF4E00] animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-12"
          >
            {/* Left: Info Widget */}
            <div className="bg-[#151515] border border-white/10 rounded-sm p-8 relative">
              <div className="absolute -top-3 -right-3 bg-white text-black px-3 py-0.5 text-[9px] font-black uppercase tracking-tighter">
                Match Result
              </div>
              
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-bold text-[#FF4E00] uppercase tracking-[0.2em]">Recognition Result</h3>
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none italic">{result?.title}</h2>
                </div>

                <div className="flex gap-8 items-center border-y border-white/5 py-4">
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-black tracking-widest text-white/40">Confidence</p>
                    <p className="text-2xl font-black tracking-tighter">{(result?.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-black tracking-widest text-white/40">Type</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4E00]">{result?.type || 'Media'}</p>
                  </div>
                </div>

                {result?.actors && result.actors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Identified Talent</p>
                    <div className="flex flex-wrap gap-2">
                      {result.actors.map((actor: string) => (
                        <span key={actor} className="px-2 py-1 bg-white/5 border border-white/10 text-[10px] font-bold uppercase">{actor}</span>
                      ))}
                    </div>
                  </div>
                )}

                {result?.streamingSuggestions && result.streamingSuggestions.length > 0 && (
                  <div className="space-y-2 text-left">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Where to Watch (suggested)</p>
                    <div className="flex flex-wrap gap-2">
                      {result.streamingSuggestions.slice(0, 3).map((platform: string) => (
                        <span key={platform} className="px-2 py-1 bg-[#FF4E00]/10 border border-[#FF4E00]/20 text-[#FF4E00] text-[10px] font-black uppercase tracking-tighter">{platform}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                   <p className="text-base font-black uppercase italic text-white/60">AI Intelligence Report</p>
                   <p className="opacity-60 text-xs leading-relaxed">{result?.reason}</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={reset} className="px-6 py-3 border-2 border-white/20 hover:border-white text-[10px] font-black uppercase tracking-widest transition-all">Reset</button>
                  {tmdbMatch && (
                    <Link to={`/movie/${tmdbMatch.id}?type=${tmdbMatch.media_type || 'movie'}`} className="flex-1 bg-white text-black px-6 py-3 text-[10px] font-black uppercase tracking-widest text-center hover:bg-[#FF4E00] transition-colors">
                      Full Details
                    </Link>
                  )}
                  {animeMatch && (
                    <a href={`https://anilist.co/anime/${animeMatch.id}`} target="_blank" rel="noreferrer" className="flex-1 bg-white text-black px-6 py-3 text-[10px] font-black uppercase tracking-widest text-center hover:bg-[#FF4E00] transition-colors">
                      AniList Info
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Poster/Metadata */}
            <div className="space-y-8">
              {tmdbMatch ? (
                <div className="relative border-4 border-white/5 p-3 bg-white/5 group">
                  <img src={`${TMDB_IMAGE_BASE}${tmdbMatch.poster_path}`} className="w-full h-auto rounded-sm grayscale group-hover:grayscale-0 transition-all duration-700" alt="Poster" />
                  <div className="absolute top-6 left-6 bg-[#FF4E00] text-black font-black uppercase px-3 py-1.5 text-xs tracking-tighter italic">
                    {tmdbMatch.media_type || 'Media'}
                  </div>
                  <div className="absolute top-16 left-6 bg-white text-black font-black uppercase px-3 py-1.5 text-xs tracking-tighter italic">
                    {(tmdbMatch.release_date || tmdbMatch.first_air_date)?.split('-')[0]}
                  </div>
                </div>
              ) : animeMatch ? (
                <div className="relative border-4 border-white/5 p-3 bg-white/5 group">
                  <img src={animeMatch.coverImage.extraLarge} className="w-full h-auto rounded-sm grayscale group-hover:grayscale-0 transition-all duration-700" alt="Anime Poster" />
                  <div className="absolute top-6 left-6 bg-[#FF4E00] text-black font-black uppercase px-3 py-1.5 text-xs tracking-tighter italic">
                    {animeMatch.startDate.year}
                  </div>
                  <div className="mt-4 p-4 bg-black/40 border border-white/5 text-[10px] uppercase font-bold text-white/60">
                    {animeMatch.genres.slice(0, 3).join(' • ')}
                  </div>
                </div>
              ) : (
                <div className="aspect-[2/3] bg-zinc-900 border-2 border-dashed border-white/10 flex items-center justify-center p-8 text-center italic font-black text-xl uppercase opacity-20">
                  Metadata Missing
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
