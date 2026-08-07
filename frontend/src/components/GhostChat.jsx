import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, X, Send, Terminal, Loader2, Sparkles } from 'lucide-react';
import api from '../lib/api';
import { clsx } from 'clsx';

const GhostChat = ({ startupSlug, startupName = 'Startup Founder', autoOpen = false, onClose }) => {
  const [isOpen, setIsOpen] = React.useState(autoOpen);
  const [messages, setMessages] = React.useState([
    { role: 'founder', content: `Hello. I am the founder of ${startupName || 'this startup'}. Ask me anything about our journey, why we failed, or what we burned. I have nothing left to hide.` }
  ]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef(null);

  const starterQuestions = [
    '💀 What was your single fatal mistake?',
    '💸 How did you run out of cash?',
    '💡 What should I do differently?'
  ];

  React.useEffect(() => {
    if (autoOpen) setIsOpen(true);
  }, [autoOpen, startupSlug]);

  React.useEffect(() => {
    setMessages([
      { role: 'founder', content: `Hello. I am the founder of ${startupName || 'this startup'}. Ask me anything about our journey, why we failed, or what we burned. I have nothing left to hide.` }
    ]);
  }, [startupSlug, startupName]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessageText = async (textToSend) => {
    const text = (textToSend || '').trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/ghost-chat', {
        slug: startupSlug,
        message: text,
        history: messages.slice(-5)
      });

      const replyContent = response.data?.content || "Looking back, we mistook user enthusiasm for willingness to pay. Audit your gross margins on day 1.";
      setMessages(prev => [...prev, { role: 'founder', content: replyContent }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'founder', content: "The connection to the afterlife flickered, but our lesson remains: validate Day-30 retention before scaling spend." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendMessageText(input);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        aria-label={`Chat with the ghost of ${startupName}`}
        className="fixed bottom-8 right-8 w-16 h-16 bg-accent rounded-full flex items-center justify-center shadow-2xl z-50 border-4 border-bg group"
      >
        <Ghost className="w-8 h-8 text-accent-contrast group-hover:animate-pulse" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full animate-ping" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-24 right-4 md:right-8 w-[92vw] sm:w-[420px] h-[520px] pv-card flex flex-col z-50 shadow-2xl overflow-hidden border-accent/30 bg-surface/95 backdrop-blur-md"
          >
            {/* Header */}
            <div className="p-4 bg-accent/10 border-b border-accent/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
                <div>
                  <div className="text-xs font-data font-bold text-accent uppercase tracking-widest flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Ghost of {startupName}
                  </div>
                  <div className="text-[10px] text-text-muted">Live Founder Séance</div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleClose} 
                aria-label="Close chat" 
                className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Container */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-[13px] scrollbar-thin scrollbar-thumb-accent/20"
            >
              {messages.map((msg, i) => (
                <div key={i} className={clsx(
                  "flex flex-col",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={clsx(
                    "max-w-[88%] p-3.5 rounded-2xl leading-relaxed shadow-sm",
                    msg.role === 'user' 
                      ? "bg-accent/20 text-text-primary rounded-br-none border border-accent/30" 
                      : "bg-surface-2/90 text-accent rounded-bl-none border border-border"
                  )}>
                    {msg.content}
                  </div>
                  <div className="text-[9px] uppercase font-bold text-text-muted mt-1 px-1 tracking-wider">
                    {msg.role === 'user' ? 'YOU' : `GHOST OF ${startupName.toUpperCase()}`}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-accent text-[11px] animate-pulse py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  COMMUNICATING WITH THE VOID...
                </div>
              )}
            </div>

            {/* Starter Prompt Pills */}
            {messages.length <= 2 && (
              <div className="px-4 py-2 border-t border-border/40 bg-surface-2/30 flex flex-wrap gap-1.5">
                {starterQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessageText(q.replace(/^[^\w\s]+/, '').trim())}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-accent/30 bg-accent/5 hover:bg-accent/20 text-accent font-mono transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-surface border-t border-border flex gap-2">
              <input 
                type="text"
                placeholder="Ask the founder ghost anything..."
                className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-accent font-mono text-text-primary"
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <button 
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="pv-btn-primary px-3.5 rounded-xl disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GhostChat;
