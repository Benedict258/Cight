import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, User, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatAssistant } from '../lib/gemini';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function Chat() {
  const { user } = useAuth();
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
    <div className="max-w-7xl mx-auto px-10 h-[calc(100vh-10rem)] flex flex-col pt-8 relative z-10">
      <div className="flex items-center gap-6 mb-12">
        <div className="h-10 w-2 bg-[#FF4E00]"></div>
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tight">AI Assistant</h1>
          <p className="text-[#FF4E00] text-[10px] font-black uppercase tracking-[0.2em] mt-1">Specialized Entertainment Agent</p>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto mb-10 pr-6 space-y-10 scrollbar-thin scrollbar-thumb-white/10"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex gap-6 max-w-[80%]",
                m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-12 h-12 shrink-0 border-2 flex items-center justify-center font-black italic mt-1",
                m.role === 'user' ? "bg-white text-black border-white" : "bg-[#151515] text-[#FF4E00] border-white/10"
              )}>
                {m.role === 'user' ? 'U' : 'C'}
              </div>
              <div className={cn(
                "p-8 rounded-sm relative",
                m.role === 'user' ? "bg-white text-black" : "bg-[#151515] border border-white/5 text-zinc-300"
              )}>
                <div className="markdown-body prose prose-sm max-w-none prose-p:font-medium prose-headings:font-black prose-headings:uppercase prose-headings:italic">
                  <Markdown>{m.content}</Markdown>
                </div>
                {m.role === 'model' && (
                  <div className="absolute -top-3 -left-3 bg-[#FF4E00] text-black text-[8px] font-black uppercase px-2 py-0.5">
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
            className="flex gap-6 mr-auto"
          >
            <div className="w-12 h-12 bg-[#151515] border border-white/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[#FF4E00] animate-spin" />
            </div>
            <div className="p-8 bg-[#151515] border border-white/5 flex gap-2 items-center">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-[#FF4E00] animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <form onSubmit={handleSend} className="relative mb-10">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about movies, actors, or recommendations..." 
          className="w-full bg-[#151515] border-2 border-white/10 rounded-sm py-6 px-10 pr-20 text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-[#FF4E00] transition-all uppercase tracking-tight shadow-2xl"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || loading}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#FF4E00] hover:bg-white text-black rounded-sm flex items-center justify-center transition-all disabled:opacity-30 group"
        >
          <Send className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </form>
    </div>
  );
}
