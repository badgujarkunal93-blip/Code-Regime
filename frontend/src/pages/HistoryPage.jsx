import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Search, ArrowRight } from 'lucide-react';
import api from '../lib/api';

const HistoryPage = () => {
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    const loadHistory = async () => {
      try {
        const { data } = await api.get('/ai/history');
        setHistory(data.history || []);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  return (
    <div className="pv-content-container py-12">
      <div className="mb-10">
        <div className="text-xs text-accent font-bold uppercase tracking-widest mb-2">Research Trail</div>
        <h1 className="text-4xl font-display font-extrabold">Search History</h1>
        <p className="text-text-secondary mt-2">Recent AI research prompts from your account.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 pv-card animate-pulse" />)}
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-3">
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate('/scan')}
              className="w-full pv-card p-5 text-left flex items-center justify-between gap-4 hover:border-accent/40"
            >
              <div className="flex items-start gap-4">
                <Search className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <div className="font-semibold text-text-primary">{item.query}</div>
                  <div className="text-xs text-text-muted mt-1">{new Date(item.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-accent shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <div className="pv-card p-10 text-center">
          <Clock className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold mb-2">No research history yet</h2>
          <p className="text-text-secondary text-sm mb-6">Run a scan in the AI Risk Scanner and it will appear here.</p>
          <Link to="/scan" className="pv-btn-primary">
            Open Risk Scanner <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
