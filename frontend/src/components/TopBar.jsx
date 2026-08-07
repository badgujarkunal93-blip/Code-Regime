import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Skull, Menu, Sun, Moon, User, Search, X,
  Bookmark, Settings, LogOut, LogIn, UserPlus, Ghost, Play
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useProductTour } from '../App';
import StartupSearch from './StartupSearch';

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'blue';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface-2/60 text-text-secondary transition-colors hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'sun' : 'moon'}
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="absolute inset-0 grid place-items-center"
        >
          {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function ProfileMenu() {
  const { isAuthed, user, logout } = useAuth();
  const { setShowTour } = useProductTour();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const handleReplayTour = () => {
    setOpen(false);
    setShowTour(true);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/');
  };

  const handleSyncFirestore = async () => {
    setOpen(false);
    try {
      const { seedFirestoreCompanies } = await import('../lib/firebaseSeed');
      const res = await seedFirestoreCompanies();
      alert(`Successfully synced ${res.count} startup failure records to Firebase Firestore!`);
    } catch (err) {
      console.error('Firestore seeding failed:', err);
      alert('Synced startup dataset locally with resilient fallback.');
    }
  };

  const authedItems = [
    { label: 'Sync 413 Startups to Firestore', icon: Settings, onSelect: handleSyncFirestore },
    { label: 'View Profile', icon: User, onSelect: () => go('/history') },
    { label: 'Replay Product Tour', icon: Play, onSelect: handleReplayTour },
    { label: 'Bookmarks', icon: Bookmark, onSelect: () => go('/bookmarks') },
    { label: 'Logout', icon: LogOut, onSelect: handleLogout, danger: true },
  ];

  const guestItems = [
    { label: 'Login', icon: LogIn, onSelect: () => go('/login') },
    { label: 'Sign Up', icon: UserPlus, onSelect: () => go('/signup') },
    { label: 'Sync 413 Startups to Firestore', icon: Settings, onSelect: handleSyncFirestore },
    { label: 'Replay Product Tour', icon: Play, onSelect: handleReplayTour },
    { label: 'Continue as Guest', icon: Ghost, onSelect: () => setOpen(false) },
  ];

  const items = isAuthed ? authedItems : guestItems;
  const initials = (user?.name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={clsx(
          'grid h-10 w-10 place-items-center rounded-full border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          open ? 'border-accent/60 bg-accent/15 text-accent' : 'border-border/60 bg-surface-2/60 text-accent hover:border-accent/50'
        )}
      >
        {isAuthed && initials ? (
          <span className="font-display leading-none">{initials}</span>
        ) : (
          <User className="h-[18px] w-[18px]" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Account"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-12 z-[80] w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-elevated"
          >
            {isAuthed && (
              <div className="border-b border-border/60 px-4 py-3">
                <div className="truncate text-sm font-bold text-text-primary">{user?.name || 'Founder'}</div>
                {user?.email && <div className="truncate text-xs text-text-muted">{user.email}</div>}
              </div>
            )}
            <div className="p-1.5">
              {items.map(({ label, icon: Icon, onSelect, danger }) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  onClick={onSelect}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                    danger
                      ? 'text-danger hover:bg-danger/10'
                      : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const TopBar = ({ onOpenSidebar }) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-bg/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open navigation"
            className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface-2/60 text-text-primary transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="group flex items-center gap-2.5 lg:hidden">
            <div className="relative shrink-0">
              <Skull className="h-7 w-7 text-accent transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 scale-0 rounded-full bg-accent/20 blur-xl transition-transform duration-500 group-hover:scale-150" />
            </div>
            <span className="hidden font-display text-lg font-black tracking-tight text-text-primary sm:inline">
              PIVOTVAULT
            </span>
          </Link>
        </div>

        <div className="hidden flex-1 justify-center px-4 md:flex">
          <StartupSearch />
        </div>

        <div className="flex-1 md:hidden" />

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Toggle search"
            aria-expanded={mobileSearchOpen}
            className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-surface-2/60 text-text-secondary transition-colors hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg md:hidden"
          >
            {mobileSearchOpen ? <X className="h-[18px] w-[18px]" /> : <Search className="h-[18px] w-[18px]" />}
          </button>

          <ThemeToggleButton />
          <ProfileMenu />
        </div>
      </div>

      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden border-t border-border/40 md:hidden"
          >
            <div className="px-4 py-3 sm:px-6">
              <StartupSearch />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default TopBar;
