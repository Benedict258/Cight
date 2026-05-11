import { useState, useRef } from 'react';
import { Camera, Upload, Search, Link as LinkIcon, ArrowRight, Loader2, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { identifyMovieFromImage } from '../lib/gemini';
import { searchMovie, TMDB_IMAGE_BASE } from '../lib/tmdb';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function Scan() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'scanning' | 'results'>('upload');
  const [result, setResult] = useState<any>(null);
  const [tmdbMatch, setTmdbMatch] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
      setError(null);
    }
  };

  const startScan = async () => {
    if (!preview) return;
    setLoading(true);
    setStep('scanning');
    setError(null);

    try {
      // 1. Identify with Gemini
      const base64 = preview.split(',')[1];
      const aiResponse = await identifyMovieFromImage(base64);
      setResult(aiResponse);

      // 2. Cross-reference with TMDB
      const tmdbSearch = await searchMovie(aiResponse.title, aiResponse.year);
      if (tmdbSearch.results && tmdbSearch.results.length > 0) {
        setTmdbMatch(tmdbSearch.results[0]);
        
        // 3. Save to history if logged in
        if (user) {
          await addDoc(collection(db, 'scans'), {
            userId: user.uid,
            mediaUrl: 'upload-placeholder', // In a real app, upload to storage first
            resultId: tmdbSearch.results[0].id.toString(),
            movieTitle: tmdbSearch.results[0].title,
            confidence: aiResponse.confidence,
            createdAt: new Date().toISOString()
          });
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
    setResult(null);
    setTmdbMatch(null);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-10 py-12">
      <div className="flex items-center gap-6 mb-16">
        <div className="h-12 w-3 bg-[#FF4E00]"></div>
        <h1 className="text-6xl font-black italic uppercase tracking-tighter">Scene Scanner</h1>
      </div>

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-2 gap-10"
          >
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group border-4 border-white/5 bg-white/5 aspect-video flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#FF4E00]/50 transition-all p-10 relative overflow-hidden"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
              {preview ? (
                <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-500" />
              ) : null}
              
              <div className="relative z-10 space-y-4">
                <div className="w-16 h-16 bg-white text-black flex items-center justify-center mx-auto rounded-sm group-hover:bg-[#FF4E00] transition-colors">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-black uppercase italic tracking-tighter">Upload Content</p>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">Select scene screenshot</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-10">
              <div className="space-y-4">
                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
                  IDENTIFY <br/>
                  <span className="text-[#FF4E00]">EVERY FRAME.</span>
                </h2>
                <p className="opacity-60 font-medium">Our AI analyzes embeddings from movie clips to pinpoint the exact title and metadata in seconds.</p>
              </div>

              {preview && (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={startScan}
                  className="w-fit px-12 py-5 bg-[#FF4E00] text-black font-black uppercase text-sm tracking-widest hover:scale-105 transition-transform"
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
            <div className="bg-[#151515] border border-white/10 rounded-sm p-10 relative">
              <div className="absolute -top-4 -right-4 bg-white text-black px-4 py-1 text-[10px] font-black uppercase tracking-tighter">
                Match Result
              </div>
              
              <div className="space-y-8">
                <div className="space-y-2">
                  <h3 className="text-12px] font-bold text-[#FF4E00] uppercase tracking-[0.2em]">Recognition Result</h3>
                  <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none italic">{result?.title}</h2>
                </div>

                <div className="flex gap-10 items-center border-y border-white/5 py-6">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black tracking-widest text-white/40">Confidence</p>
                    <p className="text-3xl font-black tracking-tighter">{(result?.confidence * 100).toFixed(1)}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-black tracking-widest text-white/40">Status</p>
                    <p className="text-xs font-black uppercase tracking-widest text-[#FF4E00]">Verified</p>
                  </div>
                </div>

                <div className="space-y-4">
                   <p className="text-lg font-black uppercase italic text-white/60">AI Intelligence Report</p>
                   <p className="opacity-60 text-sm leading-relaxed">{result?.reason}</p>
                </div>

                <div className="flex gap-4 pt-6">
                  <button onClick={reset} className="px-8 py-4 border-2 border-white/20 hover:border-white text-xs font-black uppercase tracking-widest transition-all">Reset</button>
                  {tmdbMatch && (
                    <Link to={`/movie/${tmdbMatch.id}`} className="flex-1 bg-white text-black px-8 py-4 text-xs font-black uppercase tracking-widest text-center hover:bg-[#FF4E00] transition-colors">
                      Full Details
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Poster/Metadata */}
            <div className="space-y-10">
              {tmdbMatch ? (
                <div className="relative border-4 border-white/5 p-4 bg-white/5 group">
                  <img src={`${TMDB_IMAGE_BASE}${tmdbMatch.poster_path}`} className="w-full h-auto rounded-sm grayscale group-hover:grayscale-0 transition-all duration-700" alt="Poster" />
                  <div className="absolute top-8 left-8 bg-[#FF4E00] text-black font-black uppercase px-4 py-2 text-sm tracking-tighter italic">
                    {tmdbMatch.release_date?.split('-')[0]}
                  </div>
                </div>
              ) : (
                <div className="aspect-[2/3] bg-zinc-900 border-4 border-dashed border-white/10 flex items-center justify-center p-12 text-center italic font-black text-2xl uppercase opacity-20">
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
