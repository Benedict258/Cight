import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Search, Link as LinkIcon, ArrowRight, Loader2, Info, AlertTriangle, ArrowLeft, Play, Plus, Trash2, ExternalLink, MessageSquareText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { identifyMovieFromMedia, identifyMovieFromText } from '../lib/gemini';
import { traceMoeIdentify } from '../lib/tracemoe';
import { searchAnime } from '../lib/anilist';
import { searchMulti, TMDB_IMAGE_BASE } from '../lib/tmdb';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '../lib/utils';
import SEO from '../components/SEO';

interface DetectedMatch {
  title: string;
  year?: number;
  confidence: number;
  reason: string;
  type: string;
  isAnime: boolean;
  actors?: string[];
  streamingSuggestions?: string[];
  seasons?: number;
  franchise?: string;
  tmdbMatch?: any;
  animeMatch?: any;
  platformLinks?: {
    spotify?: string;
    youtube?: string;
  };
}

interface BatchItem {
  id: string;
  type: 'file' | 'text';
  file?: File;
  preview?: string;
  text?: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  matches: DetectedMatch[];
}

export default function Scan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scanMode, setScanMode] = useState<'single' | 'batch'>('single');
  
  // Single Scan State
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'scanning' | 'results'>('upload');
  const [matches, setMatches] = useState<DetectedMatch[]>([]);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [batchItems, setBatchItems] = useState<BatchItem[]>(() => {
    const saved = sessionStorage.getItem('cight_batch_items');
    if (!saved) return [];
    try {
      const items = JSON.parse(saved);
      return items.map((item: any) => ({
        ...item,
        matches: item.matches || []
      }));
    } catch (e) {
      return [];
    }
  });
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (query) {
      handleQuerySearch(query);
    }
  }, [location.search]);

  const handleQuerySearch = async (query: string) => {
    setLoading(true);
    setStep('scanning');
    setError(null);
    try {
      const aiResponse = await identifyMovieFromText(query);
      if (!aiResponse.matches || aiResponse.matches.length === 0) {
        throw new Error("No matches found for your search.");
      }
      const enrichedMatches = await Promise.all(
        aiResponse.matches.map((m: any) => enrichMatch(m))
      );
      setMatches(enrichedMatches);
      setSelectedMatchIndex(0);
      setStep('results');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Search failed.");
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only save metadata, omit File objects which can't be stringified
    const itemsToSave = batchItems.map(({ file, ...rest }) => rest);
    sessionStorage.setItem('cight_batch_items', JSON.stringify(itemsToSave));
  }, [batchItems]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

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

  const enrichMatch = async (match: any, base64?: string) => {
    let tmdbMatch = null;
    let animeMatch = null;

    try {
      // 1. Specialized Anime Check
      if (match.isAnime) {
        if (base64) {
          const traceResponse = await traceMoeIdentify(base64);
          if (traceResponse?.result?.[0]) {
            const animeSearch = await searchAnime(traceResponse.result[0].filename || match.title);
            if (animeSearch?.Page?.media?.[0]) {
              animeMatch = animeSearch.Page.media[0];
            }
          }
        }
        
        if (!animeMatch) {
          const animeSearch = await searchAnime(match.title);
          if (animeSearch?.Page?.media?.[0]) {
            animeMatch = animeSearch.Page.media[0];
          }
        }
      }

      // 2. TMDB Check (for movies/tv/anime)
      if (['movie', 'tv', 'anime'].includes(match.type)) {
        const multiSearch = await searchMulti(match.title, match.year);
        if (multiSearch.results && multiSearch.results.length > 0) {
          tmdbMatch = multiSearch.results[0];
        }
      }
    } catch (e) {
      console.warn("Metadata enrichment failed for match:", match.title, e);
    }

    return { ...match, tmdbMatch, animeMatch };
  };

  const startScan = async () => {
    if (!preview || !mimeType) return;
    setLoading(true);
    setStep('scanning');
    setError(null);

    try {
      const base64 = preview.split(',')[1];
      const aiResponse = await identifyMovieFromMedia(base64, mimeType);
      
      if (!aiResponse.matches || aiResponse.matches.length === 0) {
        throw new Error("No matches found");
      }

      const enrichedMatches = await Promise.all(
        aiResponse.matches.map((m: any) => enrichMatch(m, base64))
      );

      setMatches(enrichedMatches);
      setSelectedMatchIndex(0);

      // Log to Firestore if user is logged in (log top match)
      const topMatch = enrichedMatches[0];
      if (user && topMatch.tmdbMatch) {
        const path = 'scans';
        try {
          await addDoc(collection(db, 'scans'), {
            userId: user.uid,
            mediaUrl: 'upload-placeholder',
            resultId: topMatch.tmdbMatch.id.toString(),
            movieTitle: topMatch.tmdbMatch.title || topMatch.tmdbMatch.name,
            mediaType: topMatch.tmdbMatch.media_type,
            confidence: topMatch.confidence,
            createdAt: serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, path);
        }
      }
      
      setStep('results');
    } catch (err: any) {
      console.error(err);
      setError(err.message?.includes('Forbidden') 
        ? "AI Service Access Denied (403). Check API key." 
        : "Recognition failed. Please try a clearer image.");
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
    setMatches([]);
    setSelectedMatchIndex(0);
    setError(null);
  };

  // Batch Handlers
  const addBatchFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBatchItems(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          type: 'file',
          file,
          preview: reader.result as string,
          status: 'idle',
          matches: []
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const addBatchText = () => {
    setBatchItems(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      text: '',
      status: 'idle',
      matches: []
    }]);
  };

  const removeBatchItem = (id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
  };

  const updateBatchText = (id: string, text: string) => {
    setBatchItems(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  };

  const processBatch = async () => {
    if (isBatchProcessing) return;
    setIsBatchProcessing(true);

    const updatedItems = [...batchItems];
    
    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      if (item.status === 'done' || item.status === 'processing') continue;

      try {
        setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'processing' } : it));

        let aiResponse;
        let base64;
        if (item.type === 'file' && item.preview) {
          base64 = item.preview.split(',')[1];
          const mime = item.file?.type || 'image/jpeg';
          aiResponse = await identifyMovieFromMedia(base64, mime);
        } else if (item.type === 'text' && item.text) {
          aiResponse = await identifyMovieFromText(item.text);
        }

        if (aiResponse && aiResponse.matches) {
          const enrichedMatches = await Promise.all(
            aiResponse.matches.map((m: any) => enrichMatch(m, base64))
          );

          setBatchItems(prev => prev.map(it => it.id === item.id ? { 
            ...it, 
            status: 'done', 
            matches: enrichedMatches
          } : it));
        }
      } catch (err: any) {
        console.error("Batch item failed:", err);
        setBatchItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'error' } : it));
      }
    }

    setIsBatchProcessing(false);
  };

  const handleBack = () => {
    if (step === 'results' || step === 'scanning') {
      reset();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <SEO 
        title="AI Scene Scanner" 
        description="Identify any movie, TV show, or anime scene instantly. Upload screenshots, video clips, or input text descriptions of scenes to identify them with precision." 
        keywords="cight, scene scanner, identify movie by screenshot, find anime from screenshot, trace.moe"
      />
      <button onClick={handleBack} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-[#FF4E00] transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back</span>
      </button>
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <img src="/cight_logo.png" alt="" className="w-16 h-16 md:w-20 md:h-20 object-contain" referrerPolicy="no-referrer" />
          <h1 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter">Scene Scanner</h1>
        </div>

        <div className="flex bg-white/5 p-1 rounded-sm border border-white/5">
          <button 
            onClick={() => setScanMode('single')}
            className={cn(
              "px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
              scanMode === 'single' ? "bg-white text-black" : "text-white/40 hover:text-white"
            )}
          >
            Single Scene
          </button>
          <button 
            onClick={() => setScanMode('batch')}
            className={cn(
              "px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
              scanMode === 'batch' ? "bg-white text-black" : "text-white/40 hover:text-white"
            )}
          >
            Batch Mode
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {scanMode === 'single' ? (
          <div key="single-mode">
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
                      {loading ? 'Processing...' : 'Start Recognition'}
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
                className="space-y-8"
              >
                {/* Match Selector - Moved to top for consistency and accessibility */}
                {matches.length > 1 && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 px-1">Multiple Matches Detected</p>
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory">
                      {matches.map((m, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedMatchIndex(idx)}
                          className={cn(
                            "px-5 py-3 text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap snap-start min-w-[140px]",
                            selectedMatchIndex === idx 
                              ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                              : "bg-white/5 text-white/40 border-white/10 hover:border-white/30"
                          )}
                        >
                          <span className="opacity-50 mr-2">#{idx + 1}</span> {m.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-12">
                  {/* Left: Info Widget */}
                  <div className="space-y-6">
                    <div className="bg-[#151515] border border-white/10 rounded-sm p-8 relative">
                      <div className="absolute -top-3 -right-3 bg-white text-black px-3 py-0.5 text-[9px] font-black uppercase tracking-tighter">
                        Match Result
                      </div>
                      
                      <div className="space-y-6">
                        <div className="space-y-1.5">
                          <h3 className="text-[10px] font-bold text-[#FF4E00] uppercase tracking-[0.2em]">Recognition Result</h3>
                          <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none italic">{matches[selectedMatchIndex]?.title}</h2>
                        </div>

                      <div className="flex flex-wrap gap-4 sm:gap-8 items-center border-y border-white/5 py-4">
                        <div className="space-y-0.5">
                          <p className="text-[9px] uppercase font-black tracking-widest text-white/40">Confidence</p>
                          <p className="text-2xl font-black tracking-tighter">{(matches[selectedMatchIndex]?.confidence * 100).toFixed(1)}%</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] uppercase font-black tracking-widest text-white/40">Type</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4E00]">
                            {matches[selectedMatchIndex]?.type === 'tv' ? 'Series' : matches[selectedMatchIndex]?.type || 'Media'}
                          </p>
                        </div>
                        {matches[selectedMatchIndex]?.seasons && (
                          <div className="space-y-0.5">
                            <p className="text-[9px] uppercase font-black tracking-widest text-white/40">Seasons</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">{matches[selectedMatchIndex].seasons} Seasons</p>
                          </div>
                        )}
                        {matches[selectedMatchIndex]?.franchise && (
                          <div className="space-y-0.5">
                            <p className="text-[9px] uppercase font-black tracking-widest text-white/40">Franchise</p>
                            <div className="inline-flex items-center gap-1.5 bg-[#FF4E00]/10 border border-[#FF4E00]/30 px-2 py-0.5">
                              <span className="text-[8px] font-black uppercase tracking-widest text-[#FF4E00]">{matches[selectedMatchIndex].franchise} Saga</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {matches[selectedMatchIndex]?.actors && matches[selectedMatchIndex].actors!.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Identified Talent</p>
                          <div className="flex flex-wrap gap-2">
                            {matches[selectedMatchIndex].actors!.map((actor: string) => (
                              <span key={actor} className="px-2 py-1 bg-white/5 border border-white/10 text-[10px] font-bold uppercase">{actor}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <p className="text-base font-black uppercase italic text-white/60">AI Intelligence Report</p>
                        <p className="opacity-60 text-xs leading-relaxed">{matches[selectedMatchIndex]?.reason}</p>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button onClick={reset} className="px-6 py-3 border-2 border-white/20 hover:border-white text-[10px] font-black uppercase tracking-widest transition-all">Reset</button>
                        {matches[selectedMatchIndex]?.tmdbMatch && (
                          <Link 
                            to={`/movie/${matches[selectedMatchIndex].tmdbMatch.id}?type=${matches[selectedMatchIndex].tmdbMatch.media_type || 'movie'}`}
                            className="flex-1 bg-white text-black px-6 py-3 text-[10px] font-black uppercase tracking-widest text-center hover:bg-[#FF4E00] transition-colors flex items-center justify-center gap-2"
                          >
                            Full Details <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {matches[selectedMatchIndex]?.platformLinks?.spotify && (
                          <a 
                            href={matches[selectedMatchIndex].platformLinks!.spotify}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-[#1DB954] text-black px-6 py-3 text-[10px] font-black uppercase tracking-widest text-center hover:bg-white transition-colors flex items-center justify-center gap-2"
                          >
                            Spotify <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {matches[selectedMatchIndex]?.platformLinks?.youtube && (
                          <a 
                            href={matches[selectedMatchIndex].platformLinks!.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-[#FF0000] text-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-center hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-2"
                          >
                            YouTube <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {['podcast', 'youtube', 'digital_series', 'digital_content'].includes(matches[selectedMatchIndex]?.type) && 
                         !matches[selectedMatchIndex]?.tmdbMatch && 
                         !matches[selectedMatchIndex]?.platformLinks?.spotify && 
                         !matches[selectedMatchIndex]?.platformLinks?.youtube && (
                          <div className="flex-1 bg-white/5 border border-white/10 text-white/60 px-6 py-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-center italic gap-2">
                             Digital Asset Recognized <Info className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Poster */}
                <div className="space-y-8">
                  {matches[selectedMatchIndex]?.tmdbMatch ? (
                    <div className="relative border-4 border-white/5 p-3 bg-white/5 group">
                      <img 
                        src={`${TMDB_IMAGE_BASE}${matches[selectedMatchIndex].tmdbMatch.poster_path}`} 
                        className="w-full h-auto rounded-sm grayscale group-hover:grayscale-0 transition-all duration-700" 
                        alt="Poster" 
                      />
                      <div className="absolute top-6 left-6 bg-[#FF4E00] text-black font-black uppercase px-3 py-1.5 text-xs tracking-tighter italic">
                        {matches[selectedMatchIndex].tmdbMatch.media_type || matches[selectedMatchIndex].type}
                      </div>
                    </div>
                  ) : matches[selectedMatchIndex]?.animeMatch ? (
                    <div className="relative border-4 border-white/5 p-3 bg-white/5 group">
                      <img 
                        src={matches[selectedMatchIndex].animeMatch.coverImage.large} 
                        className="w-full h-auto rounded-sm grayscale group-hover:grayscale-0 transition-all duration-700" 
                        alt="Poster" 
                      />
                      <div className="absolute top-6 left-6 bg-[#FF4E00] text-black font-black uppercase px-3 py-1.5 text-xs tracking-tighter italic">
                        Anime Result
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[2/3] bg-zinc-900 border-2 border-dashed border-white/10 flex items-center justify-center p-8 text-center italic font-black text-xl uppercase opacity-20">
                      Metadata Not Linked
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
        ) : (
          <div key="batch-mode" className="space-y-12">
            {/* Batch Input Zone - Replicating Single Scanner Aesthetic */}
            <div className="grid md:grid-cols-2 gap-8">
              <div 
                onClick={() => batchFileInputRef.current?.click()}
                className="group border-2 border-white/5 bg-white/5 aspect-video flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#FF4E00]/50 transition-all p-8 relative overflow-hidden"
              >
                <input 
                  type="file" 
                  ref={batchFileInputRef} 
                  onChange={addBatchFile} 
                  className="hidden" 
                  multiple
                  accept="image/*"
                />
                
                <div className="relative z-10 space-y-3">
                  <div className="w-12 h-12 bg-white text-black flex items-center justify-center mx-auto rounded-sm group-hover:bg-[#FF4E00] transition-colors">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xl font-black uppercase italic tracking-tighter">Add to Batch</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">Select multiple scene screenshots</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center space-y-8">
                <div className="space-y-3">
                  <h2 className="text-3xl font-black uppercase tracking-tighter leading-none italic">
                    MASS <br/>
                    <span className="text-[#FF4E00]">IDENTIFICATION.</span>
                  </h2>
                  <p className="opacity-60 font-medium text-sm">Add multiple frames or descriptions. Our system will process them in sequence using the Gemini model.</p>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={addBatchText}
                    className="px-6 py-4 border-2 border-white/10 hover:border-white text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Add Description
                  </button>
                  {batchItems.length > 0 && (
                    <button 
                      onClick={processBatch}
                      disabled={isBatchProcessing}
                      className="px-8 py-4 bg-[#FF4E00] text-black font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-2"
                    >
                      {isBatchProcessing ? (
                        <>Processing <Loader2 className="w-4 h-4 animate-spin" /></>
                      ) : (
                        <>Run Analysis ({batchItems.filter(i => i.status === 'idle').length})</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Batch Results Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Queue & Results</h3>
                {batchItems.length > 0 && (
                  <button 
                    onClick={() => setBatchItems([])}
                    className="text-[9px] font-black uppercase tracking-widest text-red-500/50 hover:text-red-500 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                <AnimatePresence mode="popLayout">
                  {batchItems.map((item) => (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="group relative bg-[#151515] border border-white/5 rounded-sm overflow-hidden flex flex-col"
                    >
                      <button 
                        onClick={() => removeBatchItem(item.id)}
                        className="absolute top-0.5 right-0.5 z-20 p-0.5 bg-black/60 text-white/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>

                      <div className="aspect-square bg-black relative shrink-0">
                        {item.type === 'file' ? (
                          <img src={item.preview} className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-opacity" alt="" />
                        ) : (
                          <div className="w-full h-full p-1 flex items-center justify-center bg-zinc-900/50">
                            <MessageSquareText className="w-3 h-3 text-[#FF4E00]/40" />
                          </div>
                        )}
                        
                        {item.status === 'processing' && (
                          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                            <Loader2 className="w-3 h-3 animate-spin text-[#FF4E00]" />
                          </div>
                        )}

                        {item.status === 'done' && (
                          <div className="absolute top-0.5 left-0.5">
                            <div className="px-1 py-0 bg-[#FF4E00] text-black text-[5px] font-black uppercase tracking-tighter italic">
                              {((item.matches?.[0]?.confidence || 0) * 100).toFixed(0)}%
                            </div>
                          </div>
                        )}

                        {item.status === 'error' && (
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                          </div>
                        )}
                      </div>

                      <div className="p-1 flex-1 flex flex-col min-h-0">
                        {item.status === 'done' ? (
                          <div className="flex-1 flex flex-col justify-between gap-1 overflow-hidden">
                            <p className="text-[7px] font-black uppercase tracking-tighter leading-none group-hover:text-[#FF4E00] transition-colors truncate">
                              {item.matches?.[0]?.title}
                            </p>
                            {item.matches && item.matches.length > 1 && (
                              <div className="flex items-center gap-1">
                                <span className="text-[5px] font-black uppercase bg-[#FF4E00]/20 text-[#FF4E00] px-1 py-0.5 rounded-[1px]">
                                  MULTI-MATCH
                                </span>
                                <span className="text-[5px] font-black uppercase text-white/40">
                                  +{item.matches.length - 1} MORE
                                </span>
                              </div>
                            )}
                            
                            {item.matches?.[0]?.tmdbMatch ? (
                              <Link 
                                to={`/movie/${item.matches[0].tmdbMatch.id}?type=${item.matches[0].tmdbMatch.media_type || 'movie'}`}
                                className="w-full flex items-center justify-center py-1 bg-white text-black text-[5px] font-black uppercase tracking-widest hover:bg-[#FF4E00] transition-colors"
                              >
                                VIEW
                              </Link>
                            ) : (
                              <div className="w-full py-1 bg-white/5 text-white/10 text-[5px] font-black uppercase text-center italic truncate">
                                {item.matches?.[0]?.type === 'tv' ? 'Series' : item.matches?.[0]?.type || 'N/A'}
                                {item.matches?.[0]?.seasons ? ` (${item.matches[0].seasons}S)` : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-1 bg-white/5 w-full rounded-full animate-pulse" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {batchItems.length === 0 && (
                  <div className="col-span-full py-32 border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-white/5 flex items-center justify-center rounded-full">
                      <Plus className="w-8 h-8 text-white/10" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-black uppercase italic tracking-tighter opacity-20">No Items Queued</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-10">Select images or add descriptions to begin scanning</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
