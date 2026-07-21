import { motion } from 'motion/react';
import { Play, Search, Zap, Shield, ArrowRight, Camera, MessageSquare, Bookmark } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';

export default function Landing() {
  const { user, setAuthModalOpen } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: <Camera className="w-6 h-6" />,
      title: "Instant Recognition",
      desc: "Upload a screenshot or photo. Our AI identifies movies, TV shows, and even specific anime scenes in seconds."
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Cight AI Assistant",
      desc: "Chat with an expert cinematic assistant. Get recommendations, trivia, and streaming info without leaving the platform."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Global Search",
      desc: "Search across TMDB, AniList, and Trace.moe simultaneously for the most accurate entertainment indexing."
    },
    {
      icon: <Bookmark className="w-6 h-6" />,
      title: "Personal Watchlist",
      desc: "Save your discoveries to a curated list. Synced across your account for easy access anytime."
    }
  ];

  return (
    <div className="min-h-screen">
      <SEO 
        title="AI Cinematic Recognition & Movie Discovery" 
        description="Identify movies, TV shows, and anime instantly from screenshots and clips. Power your cinematic curiosity with Gemini AI recognition, trailer streaming, and watchlist tracking."
        keywords="cight, movie finder, screenshot search, scene recognition, trace.moe, anime scanner, gemini ai"
      />
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-[#FF4E00]/10 to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="flex flex-col items-center text-center space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic text-[#FF4E00]"
            >
              The Future of Cinematic Discovery
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black uppercase italic tracking-tighter leading-[0.85] break-words"
            >
              CIGHT <span className="text-[#FF4E00]">AI.</span><br />
              SEE EVERYTHING.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="max-w-2xl text-white/50 text-sm md:text-base lg:text-lg font-medium leading-relaxed px-4 md:px-0"
            >
              Identify any movie or anime scene instantly from a screenshot. Powered by Gemini Pro Vision and deep cinematic indexing.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto px-4 sm:px-0"
            >
              <button 
                onClick={() => user ? navigate('/browse') : navigate('/scan')}
                className="group relative bg-[#FF4E00] text-black px-10 py-5 font-black uppercase italic text-sm tracking-widest flex items-center justify-center gap-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <span className="relative z-10">Enter Platform</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform relative z-10" />
              </button>
              
              {!user && (
                <button 
                  onClick={() => setAuthModalOpen(true)}
                  className="px-10 py-5 border-2 border-white/20 hover:border-[#FF4E00] font-black uppercase italic text-sm tracking-widest transition-all text-center"
                >
                  Join the Network
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-32 bg-white/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              <div className="inline-flex items-center gap-4">
                <div className="h-0.5 w-12 bg-[#FF4E00]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF4E00]">Technology</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
                How <span className="text-[#FF4E00]">Cight</span> Works
              </h2>
              
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-white text-black flex items-center justify-center font-black italic text-xl">01</div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Capture & Upload</h3>
                    <p className="text-white/40 text-sm font-medium">Take a screenshot of any movie, TV show, or anime. Upload it to our scan engine works with clips and static frames.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#FF4E00] text-black flex items-center justify-center font-black italic text-xl">02</div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">AI Neural Analysis</h3>
                    <p className="text-white/40 text-sm font-medium">Gemini Pro Vision analyzes visual cues, lighting, character features, and environment to hypothesize the source material.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-white text-black flex items-center justify-center font-black italic text-xl">03</div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Cross-Reference</h3>
                    <p className="text-white/40 text-sm font-medium">We ping TMDB, Anilist, and Trace.moe to confirm exactly what you're seeing, providing high-confidence matches.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-white text-black flex items-center justify-center font-black italic text-xl">04</div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Agentic Notifications</h3>
                    <p className="text-white/40 text-sm font-medium">Get automated updates about your watchlisted items and new discoveries via our integrated Substack notification agent.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-[#FF4E00]/20 to-transparent border border-white/10 rounded-sm overflow-hidden p-8 group">
                <div className="w-full h-full border border-white/20 border-dashed rounded-sm flex items-center justify-center group-hover:border-[#FF4E00]/50 transition-colors">
                  <Search className="w-32 h-32 text-white/5 group-hover:text-[#FF4E00]/10 transition-colors" />
                </div>
                {/* Simulated UI bits */}
                <div className="absolute top-12 left-12 p-4 bg-white text-black text-[10px] font-black uppercase tracking-widest -rotate-2">Recognition Active</div>
                <div className="absolute bottom-12 right-12 p-4 bg-[#FF4E00] text-black text-[10px] font-black uppercase tracking-widest rotate-3">100% Match</div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FF4E00] blur-[100px] opacity-20 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-8 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
              >
                <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center text-[#FF4E00] mb-6 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-lg font-black uppercase italic tracking-tighter mb-4">{f.title}</h3>
                <p className="text-white/40 text-sm font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 text-center relative z-10">
          <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-12">
            Ready to dive <span className="text-[#FF4E00]">Deeper?</span>
          </h2>
          <button 
            onClick={() => user ? navigate('/browse') : navigate('/scan')}
            className="inline-flex bg-white text-black px-12 py-6 font-black uppercase italic text-lg tracking-[0.2em] hover:bg-[#FF4E00] transition-colors"
          >
            Launch Browse Mode
          </button>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[800px] bg-[#FF4E00]/5 blur-[200px] pointer-events-none" />
      </section>
    </div>
  );
}
