import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { chatAssistant } from '../lib/groq';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { searchMulti, TMDB_IMAGE_BASE } from '../lib/tmdb';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2, Plus, Trash2, MessageSquare, Bookmark, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';

interface MovieMatch {
  title: string;
  year?: number;
  tmdbId: number;
  posterPath?: string;
  mediaType: string;
  voteAverage?: number;
}

interface Message {
  role: 'user' | 'model';
  content: string;
  movies?: MovieMatch[];
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
  createdAt: string;
}

const MAX_MESSAGES = 30;

function extractMovieTitles(text: string): string[] {
  const boldPattern = /\*\*(.+?)\*\*\s*\((\d{4})\)/g;
  const titles: string[] = [];
  let match;
  while ((match = boldPattern.exec(text)) !== null) {
    titles.push(`${match[1]} ${match[2]}`);
  }
  const quotedPattern = /"([^"]+)"\s*\((\d{4})\)/g;
  while ((match = quotedPattern.exec(text)) !== null) {
    titles.push(`${match[1]} ${match[2]}`);
  }
  return [...new Set(titles)].slice(0, 5);
}

async function findMovies(titles: string[]): Promise<MovieMatch[]> {
  const results: MovieMatch[] = [];
  for (const title of titles) {
    try {
      const data = await searchMulti(title);
      if (data.results?.[0]) {
        const r = data.results[0];
        results.push({
          title: r.title || r.name,
          year: r.release_date ? parseInt(r.release_date.split('-')[0]) : undefined,
          tmdbId: r.id,
          posterPath: r.poster_path,
          mediaType: r.media_type || 'movie',
          voteAverage: r.vote_average,
        });
      }
    } catch {}
  }
  return results;
}

async function addToWatchlist(movie: MovieMatch) {
  try {
    await apiPost('/watchlist', {
      movieId: movie.tmdbId.toString(),
      movieTitle: movie.title,
      mediaType: movie.mediaType,
      posterPath: movie.posterPath || '',
    });
    return true;
  } catch {
    return false;
  }
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hi! I'm CIGHT Assistant. Ask me anything about movies, actors, or show recommendations!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [addedWatchlist, setAddedWatchlist] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await apiGet('/conversations');
      setConversations(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const loadConversation = async (id: string) => {
    try {
      const data = await apiGet('/conversations/' + id);
      setActiveId(id);
      setMessages(data.messages || [data]);
    } catch {}
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([{ role: 'model', content: "Hi! I'm CIGHT Assistant. Ask me anything about movies, actors, or show recommendations!" }]);
    setSaveStatus('saved');
  };

  const saveConversation = async (msgs: Message[], id?: string | null, title?: string) => {
    setSaveStatus('saving');
    try {
      if (id) {
        await apiPut('/conversations/' + id, { messages: msgs, title: title || conversations.find(c => c.id === id)?.title || 'New Chat' });
      } else {
        const created = await apiPost('/conversations', {
          title: title || 'New Chat',
          messages: msgs,
        });
        setActiveId(created.id);
        fetchConversations();
      }
      setSaveStatus('saved');
    } catch {
      setSaveStatus('unsaved');
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiDelete('/conversations/' + id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeId === id) newChat();
    } catch {}
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const conversation = updatedMessages.slice(-MAX_MESSAGES);
      const response = await chatAssistant(conversation.map(m => ({ role: m.role === 'model' ? 'model' as const : 'user' as const, content: m.content })));
      const aiMsg: Message = { role: 'model', content: response || "I couldn't process that. Please try again." };
      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);

      const title = activeId ? undefined : (input.slice(0, 50) + (input.length > 50 ? '...' : ''));
      await saveConversation(finalMessages, activeId, title);

      setIsExtracting(true);
      const titles = extractMovieTitles(response || '');
      if (titles.length > 0) {
        const movies = await findMovies(titles);
        if (movies.length > 0) {
          const enrichedMsg = { ...aiMsg, movies };
          const enrichedMessages = [...updatedMessages, enrichedMsg];
          setMessages(enrichedMessages);
          await saveConversation(enrichedMessages, activeId || null);
        }
      }
      setIsExtracting(false);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', content: "I encountered an error. Please try again." }]);
      setSaveStatus('unsaved');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async (movie: MovieMatch) => {
    const key = movie.tmdbId.toString();
    const success = await addToWatchlist(movie);
    if (success) {
      setAddedWatchlist(prev => new Set([...prev, key]));
      setTimeout(() => {
        setAddedWatchlist(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 2000);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] pt-20 relative z-10">
      <SEO
        title="AI Cinematic Assistant"
        description="Discuss movies, get direct streaming links, ask trivia questions, and find the perfect film matching your mood with the CIGHT AI Assistant."
      />

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="shrink-0 border-r overflow-hidden"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="w-[280px] h-full flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
              <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={newChat}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-all"
                  style={{ background: 'var(--chat-user-bg)', color: 'var(--chat-user-text)' }}
                >
                  <Plus className="w-3.5 h-3.5" /> New Chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2.5 rounded-sm cursor-pointer transition-colors text-xs",
                      activeId === conv.id
                        ? "font-bold"
                        : ""
                    )}
                    style={{
                      background: activeId === conv.id ? 'var(--surface-hover)' : 'transparent',
                      color: activeId === conv.id ? 'var(--text)' : 'var(--text-secondary)',
                    }}
                  >
                    <MessageSquare className="w-3 h-3 shrink-0" />
                    <span className="truncate flex-1">{conv.title}</span>
                    <span className="text-[9px] shrink-0" style={{ color: 'var(--text-muted)' }}>{formatDate(conv.updatedAt)}</span>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {conversations.length === 0 && (
                  <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest">No conversations yet</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-24 z-20 p-1.5 rounded-r-sm transition-colors"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderLeft: 'none' }}
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 md:px-8 pt-4 md:pt-6 flex items-center gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-[#FF4E00] transition-colors group" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-3">
            <img src="/cight_logo.png" alt="" className="w-8 h-8 md:w-10 md:h-10 object-contain" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-sm md:text-lg font-black uppercase italic tracking-tight">AI Assistant</h1>
              <p className="text-[#FF4E00] text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em]">Specialized Agent</p>
            </div>
          </div>
          {saveStatus === 'saving' && (
            <span className="text-[9px] font-bold ml-auto" style={{ color: 'var(--text-muted)' }}>Saving...</span>
          )}
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto mb-8 px-4 md:px-8 py-6 space-y-8"
        >
          <AnimatePresence initial={false}>
            {messages.map((m, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex gap-4",
                  m.role === 'user' ? "ml-auto flex-row-reverse max-w-[85%]" : "mr-auto max-w-[90%]"
                )}
              >
                <div className="w-10 h-10 shrink-0 border flex items-center justify-center font-black italic mt-1"
                  style={m.role === 'user'
                    ? { background: 'var(--chat-user-bg)', color: 'var(--chat-user-text)', borderColor: 'var(--chat-user-text)' }
                    : { background: 'var(--chat-ai-bg)', borderColor: 'var(--border)', color: 'var(--chat-ai-text)' }
                  }
                >
                  {m.role === 'user' ? 'U' : <img src="/cight_logo.png" alt="" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />}
                </div>
                <div className={cn("p-6 rounded-sm relative", m.role !== 'user' && "border")}
                  style={m.role === 'user'
                    ? { background: 'var(--chat-user-bg)', color: 'var(--chat-user-text)' }
                    : { background: 'var(--chat-ai-bg)', borderColor: 'var(--border)', color: 'var(--chat-ai-text)' }
                  }
                >
                  <div className="markdown-body">
                    <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                  </div>
                  {m.movies && m.movies.length > 0 && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ borderColor: 'var(--border)' }}>
                      {m.movies.map(movie => (
                        <Link
                          key={movie.tmdbId}
                          to={`/movie/${movie.tmdbId}?type=${movie.mediaType}`}
                          className="flex items-center gap-3 p-3 rounded-sm border transition-all hover:scale-[1.02] group/card"
                          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                        >
                          <div className="w-12 h-16 shrink-0 rounded-sm overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                            {movie.posterPath ? (
                              <img src={`${TMDB_IMAGE_BASE}${movie.posterPath}`} alt={movie.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--surface-hover)' }}>
                                <Bookmark className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-tight leading-tight truncate group-hover/card:text-[#FF4E00] transition-colors">{movie.title}</p>
                            {movie.year && <p className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--text-muted)' }}>{movie.year}</p>}
                            {movie.voteAverage && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="w-2.5 h-2.5 fill-[#FF4E00] text-[#FF4E00]" />
                                <span className="text-[9px] font-bold">{movie.voteAverage.toFixed(1)}</span>
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddToWatchlist(movie);
                              }}
                              className={cn(
                                "mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-sm border transition-all",
                                addedWatchlist.has(movie.tmdbId.toString())
                                  ? "border-[#FF4E00] bg-[#FF4E00] text-black"
                                  : "hover:bg-[#FF4E00] hover:text-black hover:border-[#FF4E00]"
                              )}
                              style={{
                                borderColor: addedWatchlist.has(movie.tmdbId.toString()) ? '#FF4E00' : 'var(--border)',
                                color: addedWatchlist.has(movie.tmdbId.toString()) ? 'black' : 'var(--text-secondary)',
                              }}
                            >
                              {addedWatchlist.has(movie.tmdbId.toString()) ? 'Added' : 'Watchlist'}
                            </button>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {m.role === 'model' && (
                    <div className="absolute -top-2.5 -left-2.5 bg-[#FF4E00] text-black text-[7px] font-black uppercase px-2 py-0.5">Response</div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 mr-auto">
              <div className="w-10 h-10 border flex items-center justify-center" style={{ background: 'var(--chat-ai-bg)', borderColor: 'var(--border)' }}>
                <Loader2 className="w-5 h-5 text-[#FF4E00] animate-spin" />
              </div>
              <div className="p-6 border flex gap-2 items-center" style={{ background: 'var(--chat-ai-bg)', borderColor: 'var(--border)' }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-[#FF4E00] animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </motion.div>
          )}
          {isExtracting && (
            <div className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>Finding matching movies...</div>
          )}
        </div>

        <form onSubmit={handleSend} className="relative mx-4 md:mx-8 mb-8">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about movies, actors, or recommendations..."
            className="w-full rounded-sm py-4 px-8 pr-16 text-xs font-bold focus:outline-none focus:border-[#FF4E00] transition-all uppercase tracking-tight shadow-2xl border"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
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
    </div>
  );
}
