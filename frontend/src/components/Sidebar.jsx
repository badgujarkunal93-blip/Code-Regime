import React, { useState } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Skull, Search, Zap, BarChart2, MessageSquare, Share2, X, Sparkles,
  Brain, GitCompare, ClipboardCheck, FileText, ChevronLeft, ChevronRight,
  ChevronDown, Ghost, LineChart, Sun, Moon, User, LogOut, Plus, Flame
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

// Tree-branch sub-item component for expanded menu
const TreeSubItem = ({ path, label, icon: Icon, onClick }) => {
  return (
    <div className="relative flex items-center pl-6 py-1 group">
      {/* Curved Tree Branch Connector Line */}
      <span className="absolute left-3.5 top-0 bottom-1/2 w-3 border-l-2 border-b-2 border-border/60 rounded-bl-lg pointer-events-none group-hover:border-accent/60 transition-colors" />
      
      <NavLink
        to={path}
        onClick={onClick}
        className={({ isActive }) => clsx(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 select-none",
          isActive
            ? "bg-accent/15 text-accent font-bold shadow-xs border border-accent/25"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-2/80"
        )}
      >
        {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />}
        <span className="truncate">{label}</span>
      </NavLink>
    </div>
  );
};

// Expandable Group item (e.g. Explore / AI Intelligence / Analysis)
const ExpandableNavGroup = ({ group, isCollapsed, onItemClick }) => {
  const location = useLocation();
  const Icon = group.icon;
  const isChildActive = group.items.some(sub => location.pathname === sub.path);
  const [isOpen, setIsOpen] = useState(isChildActive || group.defaultOpen);
  const [isHovered, setIsHovered] = useState(false);

  React.useEffect(() => {
    if (isChildActive) setIsOpen(true);
  }, [isChildActive]);

  if (isCollapsed) {
    return (
      <div 
        className="relative mx-auto my-1 select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          aria-label={group.name}
          className={clsx(
            "w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200",
            isChildActive 
              ? "bg-accent/20 text-accent border border-accent/40 shadow-xs" 
              : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
          )}
        >
          <Icon className="w-5 h-5 shrink-0" />
        </button>

        {/* Collapsed Right Floating Popover Sub-Menu */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-full top-0 ml-3 w-48 p-2 bg-surface/95 backdrop-blur-xl border border-border shadow-elevated rounded-2xl z-50 space-y-1"
            >
              <div className="px-2.5 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border/40 mb-1">
                {group.name}
              </div>
              {group.items.map(sub => (
                <NavLink
                  key={sub.path}
                  to={sub.path}
                  onClick={onItemClick}
                  className={({ isActive }) => clsx(
                    "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors",
                    isActive ? "bg-accent/20 text-accent font-bold" : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                  )}
                >
                  {sub.icon && <sub.icon className="w-3.5 h-3.5" />}
                  <span className="truncate">{sub.name}</span>
                </NavLink>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="mb-2 select-none">
      {/* Group Header Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200",
          isChildActive
            ? "bg-surface-2 text-text-primary border border-border/80 shadow-xs"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-2/60"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={clsx(
            "p-1.5 rounded-lg shrink-0 transition-colors",
            isChildActive ? "bg-accent/20 text-accent" : "bg-surface text-text-muted"
          )}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="truncate text-xs font-bold tracking-tight">{group.name}</span>
        </div>
        <ChevronDown className={clsx(
          "w-4 h-4 text-text-muted transition-transform duration-200 shrink-0",
          isOpen && "rotate-180 text-text-primary"
        )} />
      </button>

      {/* Accordion Branch Sub-List */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden relative pt-1"
          >
            {/* Vertical Guide Line */}
            <span className="absolute left-3.5 top-0 bottom-4 w-0.5 bg-border/40 pointer-events-none" />

            {group.items.map((sub) => (
              <TreeSubItem
                key={sub.path}
                path={sub.path}
                label={sub.name}
                icon={sub.icon}
                onClick={onItemClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthed, logout } = useAuth();

  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  React.useEffect(() => {
    if (!isMobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsMobileOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOpen, setIsMobileOpen]);

  // Expandable Navigation Groups
  const mainGroups = [
    {
      name: 'Dashboard Intel',
      icon: LayoutGridIcon,
      defaultOpen: true,
      items: [
        { name: 'Failure Explorer', path: '/explore', icon: Search },
        { name: 'Knowledge Graph', path: '/graph', icon: Share2 },
        { name: 'Hall of Ghosts', path: '/ghosts', icon: Ghost },
      ]
    },
    {
      name: 'AI Risk Engine',
      icon: Zap,
      defaultOpen: false,
      items: [
        { name: 'Risk Scanner', path: '/scan', icon: Flame },
        { name: 'Pitch Deck Autopsy', path: '/autopsy', icon: FileText },
      ]
    },
    {
      name: 'Playbook & Analytics',
      icon: LineChart,
      defaultOpen: false,
      items: [
        { name: 'Competitor Compare', path: '/compare', icon: GitCompare },
        { name: 'Founder Playbook', path: '/playbook', icon: ClipboardCheck },
        { name: 'Insights Dashboard', path: '/insights', icon: BarChart2 },
      ]
    }
  ];

  // Direct Learn Items
  const learnItems = [
    { name: 'Founder Confessions', path: '/confessions', icon: MessageSquare },
  ];

  // Featured / Recent Founder Case Studies
  const defaultVaults = [
    { name: 'Quibi Postmortem', slug: 'quibi', avatar: 'Q', status: 'bg-danger', industry: 'Media / Streaming' },
    { name: 'Theranos Autopsy', slug: 'theranos', avatar: 'T', status: 'bg-warning', industry: 'HealthTech' },
    { name: 'WeWork Collapse', slug: 'wework', avatar: 'W', status: 'bg-success', industry: 'Real Estate / Coworking' },
  ];

  const availableVaults = [
    { name: 'Quibi Postmortem', slug: 'quibi', avatar: 'Q', status: 'bg-danger', industry: 'Media / Streaming' },
    { name: 'Theranos Autopsy', slug: 'theranos', avatar: 'T', status: 'bg-warning', industry: 'HealthTech' },
    { name: 'WeWork Collapse', slug: 'wework', avatar: 'W', status: 'bg-success', industry: 'Real Estate / Coworking' },
    { name: 'Kite AI Dev Tools', slug: 'kite', avatar: 'K', status: 'bg-danger', industry: 'AI Dev Tools' },
    { name: 'Fast Checkout Crash', slug: 'fast', avatar: 'F', status: 'bg-danger', industry: 'FinTech / Payments' },
    { name: 'Byju\'s EdTech Deficit', slug: 'byjus', avatar: 'B', status: 'bg-warning', industry: 'EdTech' },
    { name: 'Parse Infrastructure', slug: 'parse', avatar: 'P', status: 'bg-success', industry: 'B2B SaaS / Infra' },
    { name: 'Webvan Dot-Com', slug: 'webvan', avatar: 'W', status: 'bg-danger', industry: 'E-Commerce Delivery' },
    { name: 'Juicero Connected Press', slug: 'juicero', avatar: 'J', status: 'bg-warning', industry: 'Consumer Hardware' },
    { name: 'Solyndra Solar Energy', slug: 'solyndra', avatar: 'S', status: 'bg-warning', industry: 'CleanTech' }
  ];

  const [vaults, setVaults] = useState(() => {
    try {
      const saved = localStorage.getItem('pivotvault_featured_vaults');
      return saved ? JSON.parse(saved) : defaultVaults;
    } catch {
      return defaultVaults;
    }
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [vaultSearch, setVaultSearch] = useState('');

  const addVault = (v) => {
    if (vaults.some(item => item.slug === v.slug)) return;
    const updated = [...vaults, v];
    setVaults(updated);
    try { localStorage.setItem('pivotvault_featured_vaults', JSON.stringify(updated)); } catch {}
  };

  const removeVault = (slug) => {
    const updated = vaults.filter(item => item.slug !== slug);
    setVaults(updated);
    try { localStorage.setItem('pivotvault_featured_vaults', JSON.stringify(updated)); } catch {}
  };

  const userInitials = (user?.name || 'Andrew Smith')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const renderSidebarContent = (collapsed, isDrawer = false) => (
    <div className="relative flex flex-col h-full bg-bg text-text-primary border-r border-border select-none overflow-visible font-body transition-colors duration-200">
      {/* Edge Floating Collapse Toggle Button */}
      {!isDrawer && (
        <button
          type="button"
          onClick={() => setIsCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex absolute -right-3.5 top-6 z-50 w-7 h-7 rounded-full bg-surface border border-border shadow-elevated items-center justify-center text-text-secondary hover:text-text-primary hover:scale-110 transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Top Section: User Profile Card (Matches Image Header) */}
      <div className={clsx(
        "shrink-0 transition-all duration-200 p-4 border-b border-border/60",
        collapsed ? "flex justify-center" : ""
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative shrink-0 w-11 h-11 rounded-2xl bg-accent/15 border border-accent/30 text-accent font-display font-black text-sm flex items-center justify-center shadow-xs">
              {userInitials}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-bg" />
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted truncate">FOUNDER / OPERATOR</span>
              <span className="text-sm font-bold text-text-primary truncate leading-tight">
                {user?.name || 'Andrew Smith'}
              </span>
            </div>
          </div>
        ) : (
          <div title={user?.name || 'Andrew Smith'} className="relative shrink-0 w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 text-accent font-display font-bold text-xs flex items-center justify-center">
            {userInitials}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-bg" />
          </div>
        )}
      </div>

      {/* Middle Navigation Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border/40 px-3 py-4 space-y-5">
        {/* MAIN Section */}
        <div>
          {!collapsed && (
            <div className="px-2 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-60">
              MAIN
            </div>
          )}
          <div className="space-y-1">
            {mainGroups.map((group) => (
              <ExpandableNavGroup
                key={group.name}
                group={group}
                isCollapsed={collapsed}
                onItemClick={() => setIsMobileOpen(false)}
              />
            ))}
          </div>
        </div>

        {/* LEARN & COMMUNITY Section */}
        <div>
          {!collapsed && (
            <div className="px-2 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-60">
              LEARN & CONFESSIONS
            </div>
          )}
          <div className="space-y-1">
            {learnItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                title={collapsed ? item.name : undefined}
                className={({ isActive }) => clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 select-none",
                  collapsed ? "justify-center h-11 w-11 mx-auto" : "w-full",
                  isActive
                    ? "bg-accent/15 text-accent font-bold border border-accent/25"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-2/80"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            ))}
          </div>
        </div>

        {/* FEATURED CASE STUDIES / MESSAGES LIST */}
        <div>
          {!collapsed && (
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-60">FEATURED VAULTS</span>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                aria-label="Add Featured Vault"
                className="p-1 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors group/btn"
                title="Add Featured Vault to Sidebar"
              >
                <Plus className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" />
              </button>
            </div>
          )}
          <div className="space-y-1.5">
            {vaults.map((f) => (
              <div key={f.slug} className="relative group/vault">
                <Link
                  to={`/startup/${f.slug}`}
                  onClick={() => setIsMobileOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-surface-2/80 group",
                    collapsed ? "justify-center" : ""
                  )}
                >
                  <div className="relative shrink-0 w-8 h-8 rounded-full bg-surface-2 border border-border text-accent font-bold text-xs flex items-center justify-center group-hover:scale-105 transition-transform">
                    {f.avatar}
                    <span className={clsx("absolute bottom-0 right-0 w-2 h-2 rounded-full border border-bg", f.status || 'bg-accent')} />
                  </div>
                  {!collapsed && (
                    <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary truncate flex-1 pr-6">
                      {f.name}
                    </span>
                  )}
                </Link>
                {!collapsed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      removeVault(f.slug);
                    }}
                    aria-label={`Remove ${f.name} from featured vaults`}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/vault:opacity-100 p-1 text-text-muted hover:text-danger hover:bg-danger/10 rounded-md transition-all"
                    title="Unpin from Sidebar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Floating CTA Card / Action Button (Matches Image Bottom Card) */}
      <div className="shrink-0 p-3 border-t border-border bg-bg">
        {!collapsed ? (
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card space-y-3">
            <div>
              <h4 className="text-sm font-bold text-text-primary leading-snug">Let's start!</h4>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Run an instant AI risk scan on your startup idea.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="w-full h-11 rounded-xl bg-accent text-accent-contrast hover:bg-accent-2 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Risk-Scan Idea</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/scan')}
            title="Risk-Scan Idea"
            className="w-11 h-11 mx-auto rounded-xl bg-accent text-accent-contrast hover:bg-accent-2 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Container */}
      <aside className="pv-desktop-sidebar hidden lg:flex">
        <div className="h-full w-full min-w-0 overflow-visible">
          {renderSidebarContent(isCollapsed)}
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-[70] w-[min(20rem,calc(100vw-3rem))] border-r border-border bg-bg shadow-elevated lg:hidden"
              aria-label="Primary navigation"
            >
              <div className="h-full w-full">
                {renderSidebarContent(false, true)}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ADD FEATURED VAULT MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="pv-card w-full max-w-md p-6 bg-surface border-accent/30 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-accent" />
                  <h3 className="font-display font-bold text-lg text-text-primary">Add Featured Vault</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-text-secondary">
                  Pin startup postmortems to your sidebar for instant 1-click access during analysis.
                </p>

                <div className="relative">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search startup postmortem (e.g. Fast, Kite, Solyndra...)"
                    className="pv-field pl-9 text-xs"
                    value={vaultSearch}
                    onChange={(e) => setVaultSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Available Vaults List */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-accent/20">
                {availableVaults
                  .filter(v => 
                    v.name.toLowerCase().includes(vaultSearch.toLowerCase()) || 
                    v.slug.toLowerCase().includes(vaultSearch.toLowerCase()) ||
                    v.industry.toLowerCase().includes(vaultSearch.toLowerCase())
                  )
                  .map((v) => {
                    const isAlreadyPinned = vaults.some(existing => existing.slug === v.slug);
                    return (
                      <div
                        key={v.slug}
                        className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-surface-2/40 hover:border-accent/40 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-surface border border-border text-accent font-bold text-xs flex items-center justify-center shrink-0">
                            {v.avatar}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-text-primary">{v.name}</div>
                            <div className="text-[10px] text-text-muted">{v.industry}</div>
                          </div>
                        </div>

                        {isAlreadyPinned ? (
                          <button
                            type="button"
                            onClick={() => removeVault(v.slug)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-danger/10 text-danger border border-danger/20 font-bold hover:bg-danger hover:text-white transition-all shrink-0"
                          >
                            Unpin
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addVault(v)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-accent/10 text-accent border border-accent/20 font-bold hover:bg-accent hover:text-accent-contrast transition-all flex items-center gap-1 shrink-0"
                          >
                            <Plus className="w-3 h-3" /> Pin
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Helper Grid icon for Main group header
function LayoutGridIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export default Sidebar;


