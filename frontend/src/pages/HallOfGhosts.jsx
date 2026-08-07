import React from 'react';
import { motion } from 'framer-motion';
import { Ghost, MessageSquare, Terminal, Filter, Sparkles, AlertCircle } from 'lucide-react';
import GhostChat from '../components/GhostChat';
import Logo from '../components/Logo';
import SearchInput from '../components/ui/SearchInput';
import api from '../lib/api';

const HallOfGhosts = () => {
  const [startups, setStartups] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedGhost, setSelectedGhost] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedIndustry, setSelectedIndustry] = React.useState('All');

  const industries = ['All', 'SaaS', 'FinTech', 'EdTech', 'Media', 'E-commerce', 'Healthcare', 'Hardware'];

  React.useEffect(() => {
    const fetchStartups = async () => {
      try {
        const response = await api.get('/startups', { params: { limit: 50 } });
        const list = response.data?.startups || response.data?.data || response.data || [];
        setStartups(Array.isArray(list) ? list : []);
      } catch (err) {
        if (import.meta.env.DEV) console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStartups();
  }, []);

  const filteredStartups = startups.filter(s => {
    const matchesSearch = 
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.industry || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.summary || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesIndustry = 
      selectedIndustry === 'All' || 
      (s.industry || '').toLowerCase().includes(selectedIndustry.toLowerCase());

    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="pv-content-container py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-danger/30 bg-danger/10 text-danger text-xs font-bold uppercase tracking-widest mb-4">
          <Ghost className="w-4 h-4 animate-pulse" />
          The Afterlife Sanctuary
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold text-text-primary mb-4">
          Hall of Founder Ghosts
        </h1>
        <p className="text-text-secondary text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Converse live with the digital ghosts of failed startup founders. Ask about their fatal pivots, cash burn rate, and unspoken postmortem lessons.
        </p>
      </div>

      {/* Search & Sector Filters */}
      <div className="space-y-4 mb-10">
        <SearchInput
          placeholder="Search founder ghost by name, industry, or failure cause..."
          className="w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1 shrink-0 mr-2">
            <Filter className="w-3 h-3 text-accent" /> Filter:
          </span>
          {industries.map((ind, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndustry(ind)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-medium transition-all shrink-0 border ${
                selectedIndustry === ind
                  ? 'bg-accent text-accent-contrast border-accent font-bold shadow-md shadow-accent/20'
                  : 'bg-surface-2/60 text-text-secondary border-border hover:border-accent/40 hover:text-text-primary'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 pv-card animate-pulse bg-surface-2/40 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredStartups.map((startup) => (
            <motion.div
              key={startup.id || startup.slug}
              whileHover={{ y: -6 }}
              className="pv-card p-7 bg-surface/50 group hover:border-accent/50 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
              onClick={() => setSelectedGhost(startup)}
            >
              <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                <Ghost className="w-28 h-28 text-accent" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3.5 mb-5">
                  <Logo 
                    name={startup.name} 
                    domain={startup.domain}
                    size="md"
                    className="rounded-2xl shadow-sm"
                  />
                  <div>
                    <h3 className="font-display font-bold text-xl text-text-primary group-hover:text-accent transition-colors">{startup.name}</h3>
                    <div className="text-[10px] text-text-muted uppercase tracking-widest font-bold">{startup.industry || 'Technology'}</div>
                  </div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed mb-6 line-clamp-3 italic bg-surface-2/40 p-3 rounded-xl border border-border/40">
                  "{startup.summary}"
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-danger uppercase tracking-widest">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Failed {startup.shutdownYear || startup.closedYear || startup.deathYear || ''}
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGhost(startup);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20 hover:bg-accent hover:text-accent-contrast transition-all"
                  >
                    Start Séance
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedGhost && (
        <GhostChat 
          startupSlug={selectedGhost.slug || selectedGhost.id} 
          startupName={selectedGhost.name} 
          autoOpen={true}
          onClose={() => setSelectedGhost(null)}
        />
      )}

      {!loading && filteredStartups.length === 0 && (
        <div className="text-center py-20 pv-card p-12 bg-surface/30">
          <Ghost className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-20" />
          <p className="text-text-muted font-bold text-base mb-1">No founder ghosts found matching your search.</p>
          <p className="text-xs text-text-secondary">Try searching for a different industry like SaaS, FinTech, or EdTech.</p>
        </div>
      )}
    </div>
  );
};

export default HallOfGhosts;
