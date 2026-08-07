import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Skull, Search, Zap, BarChart2, MessageSquare, Share2, Menu, X, Sparkles,
  Bookmark, Brain, GitCompare, ClipboardCheck, Sun, Moon, LogOut, User,
  FileText, LayoutGrid, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const NavLink = ({ item, isActive, mobile, onClick }) => {
  const Icon = item.icon;
  
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={clsx(
        "pv-nav-item relative group",
        mobile ? "w-full p-4 text-lg font-semibold" : "px-3 py-2 text-sm font-medium",
        isActive 
          ? "pv-nav-item-active"
          : ""
      )}
    >
      <Icon className={clsx("shrink-0", mobile ? "w-6 h-6" : "w-[18px] h-[18px]")} />
      <span>{item.name}</span>
      
      {!mobile && isActive && (
        <motion.div
          layoutId="nav-active-border"
          className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-accent shadow-[0_0_8px_rgba(175,155,115,0.6)]"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      
      {!mobile && !isActive && (
        <div className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-center" />
      )}

      {mobile && <ChevronRight className="ml-auto w-5 h-5 opacity-30" />}
    </Link>
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAuthed, user, logout } = useAuth();

  const primaryNav = [
    { name: 'Explore', path: '/explore', icon: Search },
    { name: 'Risk Scanner', path: '/scan', icon: Zap },
    { name: 'Playbook', path: '/playbook', icon: ClipboardCheck },
  ];

  const secondaryNav = [
    { name: 'Autopsy', path: '/autopsy', icon: FileText },
    { name: 'Compare', path: '/compare', icon: GitCompare },
    { name: 'Insights', path: '/insights', icon: BarChart2 },
    { name: 'Graph', path: '/graph', icon: Share2 },
    { name: 'Confessions', path: '/confessions', icon: MessageSquare },
  ];

  const allNavItems = [...primaryNav, ...secondaryNav];

  return (
    <nav className="sticky top-0 z-[60] border-b border-border/40 bg-bg/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Nav Group */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <div className="relative">
                <Skull className="w-9 h-9 text-accent transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-500" />
              </div>
              <span className="font-display font-black text-2xl tracking-tight text-text-primary">
                PIVOTVAULT
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden xl:flex items-center gap-1 border-l border-border/50 pl-8 h-10 ml-2">
              {primaryNav.map((item) => (
                <NavLink 
                  key={item.path} 
                  item={item} 
                  isActive={location.pathname === item.path} 
                />
              ))}
              
              <div className="w-px h-5 bg-border/40 mx-3" />
              
              <div className="flex items-center gap-1">
                {secondaryNav.slice(0, 3).map((item) => (
                  <NavLink 
                    key={item.path} 
                    item={item} 
                    isActive={location.pathname === item.path} 
                  />
                ))}
                
                {/* Desktop Dropdown/More (Optional, but keeping all visible for MVP breadth) */}
                {secondaryNav.slice(3).map((item) => (
                  <NavLink 
                    key={item.path} 
                    item={item} 
                    isActive={location.pathname === item.path} 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Utility Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-surface-2/50 p-1 rounded-full border border-border/50">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2.5 rounded-full text-text-secondary hover:text-accent hover:bg-surface-2 transition-all"
                title="Toggle Mode"
                aria-label="Toggle color theme"
              >
                {theme === 'blue' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
              </button>

              {isAuthed && (
                <Link 
                  to="/bookmarks" 
                  className="p-2.5 rounded-full text-text-secondary hover:text-accent hover:bg-surface-2 transition-all"
                  title="Bookmarks"
                >
                  <Bookmark className="w-[18px] h-[18px]" />
                </Link>
              )}
            </div>

            {isAuthed ? (
              <div className="flex items-center gap-3 ml-2">
                <Link 
                  to="/history" 
                  className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-full border border-border/50 bg-surface-2/50 text-sm font-semibold text-text-primary hover:border-accent/50 transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-accent" />
                  </div>
                  {user?.name?.split(' ')[0] || 'Founder'}
                </Link>
                <button 
                  type="button"
                  onClick={logout} 
                  className="p-2.5 rounded-full border border-border/50 bg-surface-2/50 text-text-secondary hover:text-danger transition-all"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="pv-btn-primary rounded-full px-7"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
              className="xl:hidden ml-2 p-2.5 rounded-full bg-surface-2 border border-border/50 text-text-primary hover:text-accent transition-all"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 top-[81px] z-[70] bg-bg flex flex-col xl:hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
              <section>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 pl-4">Primary Modules</div>
                <div className="grid gap-2">
                  {primaryNav.map((item) => (
                    <NavLink 
                      key={item.path} 
                      item={item} 
                      mobile 
                      isActive={location.pathname === item.path}
                      onClick={() => setIsOpen(false)}
                    />
                  ))}
                </div>
              </section>

              <section>
                <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 pl-4">Intelligence Tools</div>
                <div className="grid gap-2">
                  {secondaryNav.map((item) => (
                    <NavLink 
                      key={item.path} 
                      item={item} 
                      mobile 
                      isActive={location.pathname === item.path}
                      onClick={() => setIsOpen(false)}
                    />
                  ))}
                </div>
              </section>
            </div>

            <div className="p-8 border-t border-border/40 bg-surface-2/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button type="button" onClick={toggleTheme} aria-label="Toggle color theme" className="p-4 rounded-xl bg-bg border border-border/50">
                    {theme === 'blue' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                  </button>
                  {isAuthed && (
                    <Link to="/bookmarks" onClick={() => setIsOpen(false)} className="p-4 rounded-xl bg-bg border border-border/50">
                      <Bookmark className="w-6 h-6" />
                    </Link>
                  )}
                </div>
                {!isAuthed && (
                  <Link to="/login" onClick={() => setIsOpen(false)} className="pv-btn-primary rounded-xl px-8">
                    Get Started
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
