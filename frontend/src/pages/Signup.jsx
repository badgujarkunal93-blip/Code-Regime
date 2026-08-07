import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Skull, User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBookmarks } from '../context/BookmarkContext';
import { IconInput } from '../components/ui/IconInput';

const Signup = () => {
  const { register } = useAuth();
  const { refresh } = useBookmarks();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/scan';

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      try { await refresh(); } catch {}
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Skull className="w-12 h-12 text-accent mx-auto mb-3" />
          <h1 className="text-3xl font-display font-extrabold text-text-primary">Create your account</h1>
          <p className="text-text-secondary text-sm mt-2">Unlock the AI Assistant, Risk Scanner, Playbook & bookmarks.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Name</label>
            <IconInput
              icon={User}
              type="text" 
              required 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ada Lovelace"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Email</label>
            <IconInput
              icon={Mail}
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Password</label>
            <IconInput
              icon={Lock}
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="At least 6 characters"
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full pv-btn-primary">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
          </button>
          <p className="text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" state={{ from }} className="text-accent font-semibold hover:underline">Sign in</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default Signup;
