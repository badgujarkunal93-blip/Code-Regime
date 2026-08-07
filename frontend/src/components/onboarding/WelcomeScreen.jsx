import React from 'react';
import { motion } from 'framer-motion';
import { Skull, Search, Sparkles, Zap, ArrowRight, Sun, Moon, Play } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: Search,
    title: 'Explore Startup Archive',
    subtitle: 'Browse 100s of documented postmortems.',
  },
  {
    icon: Sparkles,
    title: 'AI Analysis',
    subtitle: 'Get failure-backed insights for your idea.',
  },
  {
    icon: Zap,
    title: 'Risk Scanner',
    subtitle: 'Stress-test your startup before building.',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0, 0, 1] } },
};

const WelcomeScreen = ({ onTakeTour, onSkipTour, onSignIn }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'blue';
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-bg"
      role="dialog"
      aria-label="Welcome to PivotVault"
    >
      {/* Subtle background texture + accent glow */}
      <div className="pointer-events-none absolute inset-0 bg-theme-grid opacity-[0.25]" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]"
        aria-hidden="true"
      />

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="pv-btn-ghost pv-btn-icon absolute right-5 top-5 z-10"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-16 text-center"
      >
        {/* Brand lockup */}
        <motion.div variants={item} className="mb-8 flex items-center gap-3">
          <div className="relative">
            <Skull className="w-9 h-9 text-accent" />
            <div className="absolute inset-0 rounded-full bg-accent/20 blur-lg" aria-hidden="true" />
          </div>
          <span className="font-display font-black text-2xl tracking-tight text-text-primary">PIVOTVAULT</span>
        </motion.div>

        {/* Hero title */}
        <motion.h1
          variants={item}
          className="font-display text-3xl sm:text-4xl font-bold leading-tight tracking-tight text-text-primary mb-4"
        >
          Welcome to PivotVault
        </motion.h1>

        {/* Subtitle */}
        <motion.p variants={item} className="text-lg text-text-secondary max-w-xl mb-10">
          Learn from startup failures before making your own.
        </motion.p>

        {/* Feature highlights */}
        <motion.div variants={item} className="grid w-full grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {features.map(({ icon: Icon, title, subtitle }) => (
            <motion.div
              key={title}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="pv-card p-5 text-left"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="w-5 h-5" />
              </div>
              <div className="font-bold text-text-primary">{title}</div>
              <div className="mt-1 text-sm text-text-secondary leading-relaxed">{subtitle}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Three primary actions */}
        <motion.div variants={item} className="grid w-full grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <button type="button" onClick={() => navigate('/explore')} className="pv-btn-secondary w-full justify-center">
            <Search className="w-4 h-4" />
            Explore Archive
          </button>
          <button type="button" onClick={() => navigate('/scan')} className="pv-btn-secondary w-full justify-center">
            <Zap className="w-4 h-4" />
            Risk Scanner
          </button>
          <button type="button" onClick={onTakeTour} className="pv-btn-primary w-full justify-center">
            <Play className="w-4 h-4" />
            Take Product Tour
          </button>
        </motion.div>

        {/* Skip tour button */}
        <motion.div variants={item}>
          <button type="button" onClick={onSkipTour} className="text-sm text-text-secondary transition-colors hover:text-text-primary">
            Skip Tour
          </button>
        </motion.div>

        {/* Fine print */}
        <motion.p variants={item} className="mt-4 text-xs text-text-muted">
          Takes 30 seconds. You can replay it anytime from your profile.
        </motion.p>

        {/* Sign in link */}
        <motion.button
          variants={item}
          type="button"
          onClick={onSignIn}
          className="mt-6 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          Already have an account? <span className="text-accent font-semibold">Sign in</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeScreen;
