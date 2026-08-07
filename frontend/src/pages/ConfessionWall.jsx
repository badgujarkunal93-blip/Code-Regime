import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Heart, Send, Ghost, Sparkles, Flame, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../components/Toast';
import api from '../lib/api';

const ConfessionWall = () => {
  const toast = useToast();
  const [confessions, setConfessions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sortOption, setSortOption] = React.useState('recent'); // recent | top

  const demoPresets = [
    "I spent 8 months building a multi-tenant enterprise RBAC system before we even had a single active user.",
    "We mistook 100k free tier signups for product-market fit. When we added a $15 paywall, 99.4% churned.",
    "I hired 4 senior enterprise sales reps before having a repeatable self-serve funnel. Burned $400k with 0 deals."
  ];

  const fetchConfessions = async (sort = sortOption) => {
    try {
      const response = await api.get('/confessions', { params: { sort } });
      const data = response.data?.data || response.data || [];
      setConfessions(Array.isArray(data) ? data : []);
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchConfessions(sortOption);
  }, [sortOption]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const submittedText = text.trim();

    // Optimistic local add
    const optimisticConfession = {
      id: `confession-${Date.now()}`,
      text: submittedText,
      upvotes: 1,
      createdAt: new Date().toISOString()
    };

    setConfessions(prev => [optimisticConfession, ...prev]);
    setText('');

    try {
      const response = await api.post('/confessions', { text: submittedText });
      if (response.data && response.data.id) {
        // replace local id with server id if returned
        setConfessions(prev => prev.map(c => c.id === optimisticConfession.id ? response.data : c));
      }
      toast({ title: 'Anonymous confession posted to the wall!', type: 'success' });
    } catch (err) {
      toast({ title: err.response?.data?.error || 'Confession added to wall locally.', type: 'info' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (id) => {
    setConfessions(prev => prev.map(c =>
      c.id === id ? { ...c, upvotes: c.upvotes + 1 } : c
    ));

    try {
      await api.post(`/confessions/${id}/upvote`);
    } catch (err) {
      // Optimistic UI state remains
    }
  };

  return (
    <div className="pv-content-container py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-bold uppercase tracking-widest mb-4">
          <Ghost className="w-4 h-4 animate-pulse" />
          Raw Unfiltered Postmortems
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold text-text-primary mb-4">
          Founder Confession Wall
        </h1>
        <p className="text-text-secondary text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Anonymous single-sentence regrets and lessons from those who lived through startup collapse. No accounts, no PR spin, just truth.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Sticky Input Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 pv-card p-6 space-y-5 border-accent/20">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent" />
                Confess Your Failure
              </h3>
              <span className="text-[10px] text-accent font-mono uppercase bg-accent/10 px-2 py-0.5 rounded-md">Anonymous</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                required
                placeholder="What is the single biggest mistake or regret from your startup journey? (max 280 chars)"
                className="pv-field w-full text-xs min-h-[130px] resize-none leading-relaxed"
                maxLength={280}
                value={text}
                onChange={e => setText(e.target.value)}
              />

              <div className="flex items-center justify-between pt-1">
                <span className={clsx(
                  "text-[10px] font-mono font-bold uppercase",
                  text.length > 250 ? "text-danger" : "text-text-muted"
                )}>
                  {text.length} / 280
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting || text.length < 10}
                  className="pv-btn-primary px-4 text-xs py-2 disabled:opacity-40"
                >
                  {isSubmitting ? 'Posting...' : 'Post Anonymously'}
                  <Send className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </form>

            {/* Quick Demo Presets */}
            <div className="pt-4 border-t border-border/50">
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-accent" /> One-Tap Demo Confessions
              </div>
              <div className="space-y-2">
                {demoPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setText(preset)}
                    className="w-full text-left text-[11px] p-2.5 rounded-lg border border-border bg-surface-2/40 hover:border-accent/40 hover:bg-accent/10 text-text-secondary hover:text-text-primary transition-all line-clamp-2"
                  >
                    "{preset}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Confession Wall Feed */}
        <div className="lg:col-span-3 space-y-6">
          {/* Filter Bar */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="text-xs font-bold text-text-muted uppercase tracking-widest">
              Live Confessions ({confessions.length})
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortOption('recent')}
                className={clsx(
                  "text-xs px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 border",
                  sortOption === 'recent'
                    ? "bg-accent text-accent-contrast border-accent shadow-sm"
                    : "bg-surface-2/50 text-text-muted border-border hover:text-text-primary"
                )}
              >
                <Clock className="w-3.5 h-3.5" /> Recent
              </button>
              <button
                onClick={() => setSortOption('top')}
                className={clsx(
                  "text-xs px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 border",
                  sortOption === 'top'
                    ? "bg-accent text-accent-contrast border-accent shadow-sm"
                    : "bg-surface-2/50 text-text-muted border-border hover:text-text-primary"
                )}
              >
                <Flame className="w-3.5 h-3.5" /> Most Upvoted
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-36 pv-card animate-pulse bg-surface-2/50 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="columns-1 md:columns-2 gap-6 space-y-6">
              <AnimatePresence initial={false}>
                {confessions.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="break-inside-avoid pv-card p-6 relative group hover:border-accent/40 transition-all space-y-4"
                  >
                    <p className="text-text-primary leading-relaxed text-sm font-medium italic">
                      "{c.text}"
                    </p>
                    <div className="flex items-center justify-between border-t border-border/40 pt-3">
                      <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Anonymous Founder'}
                      </div>
                      <button 
                        onClick={() => handleUpvote(c.id)}
                        aria-label={`Upvote confession (${c.upvotes || 0} upvotes)`}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 hover:bg-danger/10 text-text-secondary hover:text-danger border border-border hover:border-danger/30 transition-all group/btn"
                      >
                        <Heart className="w-3.5 h-3.5 group-hover/btn:fill-danger transition-transform group-hover/btn:scale-110" />
                        <span className="font-data text-xs font-bold">{c.upvotes || 0}</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!loading && confessions.length === 0 && (
            <div className="text-center py-16 pv-card p-8 bg-surface/30">
              <Ghost className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-30" />
              <p className="text-text-muted font-bold text-sm">No confessions posted yet.</p>
              <p className="text-xs text-text-secondary mt-1">Be the first founder to post an anonymous lesson to the wall!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfessionWall;