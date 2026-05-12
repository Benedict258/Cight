import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { chatAssistant } from '../lib/gemini';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, Sparkles, User, Loader2, Info } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hi! I'm CIGHT Assistant. Ask me anything about movies, actors, or show recommendations!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatAssistant([...messages, userMsg]);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', content: "I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex flex-col pt-4 md:pt-6 relative z-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-[#FF4E00] transition-colors mb-4 md:mb-6 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back</span>
      </button>
      <div className="flex items-center gap-4 mb-6 md:mb-10">
        <img src="/cight_logo.png" alt="" className="w-12 h-12 md:w-16 md:h-16 object-contain" referrerPolicy="no-referrer" />
        <div>
          <h1 className="text-xl md:text-3xl font-black uppercase italic tracking-tight">AI Assistant</h1>
          <p className="text-[#FF4E00] text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Specialized Entertainment Agent</p>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto mb-8 pr-4 space-y-8 scrollbar-thin scrollbar-thumb-white/10"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex gap-4 max-w-[85%]",
                m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-10 h-10 shrink-0 border flex items-center justify-center font-black italic mt-1",
                m.role === 'user' ? "bg-white text-black border-white" : "bg-[#151515] border-white/10"
              )}>
                {m.role === 'user' ? 'U' : <img src="/cight_logo.png" alt="CIGHT" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />}
              </div>
              <div className={cn(
                "p-6 rounded-sm relative",
                m.role === 'user' ? "bg-white text-black" : "bg-[#151515] border border-white/5 text-zinc-300"
              )}>
                <div className="markdown-body prose prose-sm max-w-none prose-p:font-medium prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-p:text-xs">
                  <Markdown>{m.content}</Markdown>
                </div>
                {m.role === 'model' && (
                  <div className="absolute -top-2.5 -left-2.5 bg-[#FF4E00] text-black text-[7px] font-black uppercase px-2 py-0.5">
                    Response
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4 mr-auto"
          >
            <div className="w-10 h-10 bg-[#151515] border border-white/10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[#FF4E00] animate-spin" />
            </div>
            <div className="p-6 bg-[#151515] border border-white/5 flex gap-2 items-center">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 bg-[#FF4E00] animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <form onSubmit={handleSend} className="relative mb-8">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about movies, actors, or recommendations..." 
          className="w-full bg-[#151515] border border-white/10 rounded-sm py-4 px-8 pr-16 text-xs font-bold placeholder:text-white/20 focus:outline-none focus:border-[#FF4E00] transition-all uppercase tracking-tight shadow-2xl"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || loading}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#FF4E00] hover:bg-white text-black rounded-sm flex items-center justify-center transition-all disabled:opacity-30 group"
        >
          <Send className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      </form>
    </div>
  );
}
