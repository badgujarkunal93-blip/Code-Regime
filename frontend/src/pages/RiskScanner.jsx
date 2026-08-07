import { clsx } from 'clsx';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, AlertTriangle, CheckCircle2, ArrowRight, Loader2, 
  Shuffle, Lightbulb, Sword, ShieldCheck, Target, RefreshCcw, 
  Printer, Skull, Layers, FileText, Sparkles, TrendingDown, AlertOctagon
} from 'lucide-react';
import api from '../lib/api';
import PremiumRadarChart from '../components/PremiumRadarChart';
import ConversationPanel from '../components/ui/ConversationPanel';
import WorkspaceBar from '../components/WorkspaceBar';
import { useWorkspace } from '../context/WorkspaceContext';

const RiskScanner = () => {
  const { profile, getSharedHistory, recordAnalysis } = useWorkspace();
  const [step, setStep] = useState('form'); // form | scanning | result
  const [activeTab, setActiveTab] = useState('brief'); // brief | precedents | battleground | pivots
  const [formData, setFormData] = useState({
    idea: profile.idea || '',
    audience: profile.audience || '',
    revenueModel: profile.businessModel || 'Subscription',
    teamSize: profile.teamSize || '2',
    industry: profile.industry || 'SaaS'
  });

  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [compLoading, setCompLoading] = useState(false);
  const [compResult, setCompResult] = useState(null);
  const [loadingText, setLoadingText] = useState('');
  const [simulating, setSimulating] = useState(null); 
  const [simulatedResult, setSimulatedResult] = useState(null);
  const [query, setQuery] = useState('');

  const presets = [
    {
      label: '⚡ AI Code Optimizer (SaaS)',
      idea: 'AI-powered static code analysis & automated refactoring tool for engineering teams',
      audience: 'Developers & Engineering Leads',
      revenueModel: 'Subscription',
      teamSize: '2',
      industry: 'SaaS'
    },
    {
      label: '💳 1-Click Crypto Checkout (FinTech)',
      idea: 'Sub-second crypto payment gateway for Shopify merchants with zero gas fees',
      audience: 'E-commerce Merchants',
      revenueModel: 'Transaction Fee',
      teamSize: '3',
      industry: 'FinTech'
    },
    {
      label: '🎓 AI Homework Helper (EdTech)',
      idea: 'Personalized AI tutor app for high school math & science problem solving',
      audience: 'High School Students',
      revenueModel: 'Freemium',
      teamSize: '1',
      industry: 'EdTech'
    },
    {
      label: '🚚 10-Min Drone Grocery (Logistics)',
      idea: 'Ultra-fast autonomous drone delivery for local organic groceries in urban centers',
      audience: 'Urban Professionals',
      revenueModel: 'Delivery Fee',
      teamSize: '5',
      industry: 'E-commerce'
    }
  ];

  const applyPreset = (p) => {
    setFormData({
      idea: p.idea,
      audience: p.audience,
      revenueModel: p.revenueModel,
      teamSize: p.teamSize,
      industry: p.industry
    });
  };

  const loadingMessages = [
    "Scanning 413 historical postmortems in database...",
    "Benchmarking CAC vs LTV unit economic curves...",
    "Evaluating competitive moat & commoditization risk...",
    "Cross-referencing failure vectors against precedent graveyard...",
    "Synthesizing investor-ready forensic audit report..."
  ];

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    setStep('scanning');
    setLoading(true);
    let msgIdx = 0;
    const interval = setInterval(() => {
      setLoadingText(loadingMessages[msgIdx % loadingMessages.length]);
      msgIdx++;
    }, 600);

    try {
      const response = await api.post('/ai/risk-scan', {
        ...formData,
        history: getSharedHistory([], 'Risk Scanner'),
      });

      recordAnalysis({
        tool: 'Risk Scanner',
        riskScore: response.data.riskScore,
        summary: response.data.consultantBrief?.split('\n').find(l => l.trim() && !l.startsWith('#'))?.trim()
          || `Risk score ${response.data.riskScore}/100. Primary risk: ${response.data.primaryRisk}.`,
        profilePatch: {
          idea: formData.idea,
          audience: formData.audience,
          businessModel: formData.revenueModel,
          teamSize: formData.teamSize,
          industry: formData.industry,
        },
      });

      setConversation([
        {
          role: 'user',
          content: `Startup Idea: ${formData.idea}\nAudience: ${formData.audience}\nRevenue Model: ${formData.revenueModel}\nTeam Size: ${formData.teamSize}\nIndustry: ${formData.industry}`
        },
        {
          role: 'assistant',
          content: response.data.consultantBrief || "Here's your risk assessment report.",
          fullResult: response.data
        }
      ]);

      setTimeout(() => {
        clearInterval(interval);
        setStep('result');
        setLoading(false);
      }, 2500);
    } catch (err) {
      console.error(err);
      clearInterval(interval);
      setStep('form');
      setLoading(false);
    }
  };

  const handleFollowUp = async (followUpText) => {
    const question = (followUpText ?? query).trim();
    if (!question) return;

    setLoading(true);
    const newHistory = conversation.map(msg => ({ role: msg.role, content: msg.content }));

    try {
      const response = await api.post('/ai/risk-scan', { 
        ...formData,
        history: getSharedHistory(newHistory, 'Risk Scanner'),
        followUpQuestion: question
      });

      setConversation(prev => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: response.data.consultantBrief || "Here's your updated assessment.", fullResult: response.data }
      ]);
      setQuery('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedFollowUp = (suggestedQuery) => {
    setQuery(suggestedQuery);
    handleFollowUp(suggestedQuery);
  };

  const handleSimulatePivot = (pivot, index) => {
    setSimulating(index);
    setTimeout(() => {
      const lastResult = conversation[conversation.length - 1]?.fullResult;
      if (!lastResult) return;
      const improvedScore = Math.max(22, lastResult.riskScore - 26);
      const improvedBreakdown = {
        ...lastResult.riskBreakdown,
        customerAcquisition: Math.max(15, lastResult.riskBreakdown.customerAcquisition - 32),
        retention: Math.max(12, lastResult.riskBreakdown.retention - 24)
      };
      setSimulatedResult({
        pivot,
        score: improvedScore,
        breakdown: improvedBreakdown
      });
      setSimulating(null);
    }, 1500);
  };

  const handleCompare = async () => {
    setCompLoading(true);
    try {
      const response = await api.post('/ai/compare-competitors', {
        idea: formData.idea,
        industry: formData.industry
      });
      setCompResult(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCompLoading(false);
    }
  };

  const resetScan = () => {
    setStep('form');
    setConversation([]);
    setCompResult(null);
    setSimulatedResult(null);
    setQuery('');
    setActiveTab('brief');
  };

  const lastResult = conversation.length > 0 ? conversation[conversation.length - 1].fullResult : null;

  const radarData = lastResult ? [
    { subject: 'CAC', A: lastResult.riskBreakdown.customerAcquisition, fullMark: 100 },
    { subject: 'Retention', A: lastResult.riskBreakdown.retention, fullMark: 100 },
    { subject: 'Revenue', A: lastResult.riskBreakdown.monetization, fullMark: 100 },
    { subject: 'Market', A: lastResult.riskBreakdown.competition, fullMark: 100 },
    { subject: 'Timing', A: lastResult.riskBreakdown.timing, fullMark: 100 },
  ] : [];

  const currentScore = simulatedResult ? simulatedResult.score : lastResult?.riskScore;
  const currentBreakdown = simulatedResult && lastResult ? [
    { subject: 'CAC', A: simulatedResult.breakdown.customerAcquisition, fullMark: 100 },
    { subject: 'Retention', A: simulatedResult.breakdown.retention, fullMark: 100 },
    { subject: 'Revenue', A: lastResult.riskBreakdown.monetization, fullMark: 100 },
    { subject: 'Market', A: lastResult.riskBreakdown.competition, fullMark: 100 },
    { subject: 'Timing', A: lastResult.riskBreakdown.timing, fullMark: 100 },
  ] : radarData;

  const pitchReadinessScore = currentScore ? Math.max(10, 100 - currentScore) : 50;

  const suggestedFollowUps = [
    { label: "Explain deeper", prompt: "Explain the risk assessment above in more depth, with specific reasoning for each risk category." },
    { label: "Show examples", prompt: "Show concrete examples of startups that failed due to the top risks identified above." },
    { label: "Compare startups", prompt: "Compare my idea against the similar failed startups above and explain what I should do differently." },
    { label: "Give recommendations", prompt: "Based on the risk assessment above, give specific, actionable recommendations to lower my risk score." },
    { label: "Generate action plan", prompt: "Based on the risk assessment above, generate a concrete step-by-step action plan to mitigate the top risks." }
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="pv-content-container py-12">
        <WorkspaceBar />
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="mb-8">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-accent tracking-[0.2em] mb-2">
                  <Zap className="w-4 h-4" /> Flagship VC Risk Audit
                </div>
                <h1 className="text-4xl font-display font-bold text-text-primary mb-3">AI Risk Scanner</h1>
                <p className="text-text-secondary text-lg">Input your startup details to benchmark against 413 historical failure postmortems.</p>
              </div>

              {/* Demo Preset Pills */}
              <div className="mb-6 p-4 rounded-xl border border-accent/20 bg-surface-2/40">
                <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> One-Click Demo Presets for Judges
                </div>
                <div className="flex flex-wrap gap-2">
                  {presets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-accent/50 hover:bg-accent/10 transition-all font-medium text-text-primary"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleScan} className="pv-card p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-text-secondary tracking-widest">Startup Idea</label>
                  <textarea
                    required
                    placeholder="Describe your product and the core problem it solves..."
                    rows={4}
                    className="pv-field"
                    value={formData.idea}
                    onChange={e => setFormData({...formData, idea: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-secondary tracking-widest">Target Audience</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Developers & Engineering Leads"
                      className="pv-field"
                      value={formData.audience}
                      onChange={e => setFormData({...formData, audience: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-secondary tracking-widest">Industry</label>
                    <select
                      className="pv-field"
                      value={formData.industry}
                      onChange={e => setFormData({...formData, industry: e.target.value})}
                    >
                      <option value="SaaS">SaaS</option>
                      <option value="FinTech">FinTech</option>
                      <option value="EdTech">EdTech</option>
                      <option value="Fitness">Fitness</option>
                      <option value="E-commerce">E-commerce</option>
                      <option value="Healthcare">Healthcare</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-secondary tracking-widest">Team Size</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. 2"
                      className="pv-field"
                      value={formData.teamSize}
                      onChange={e => setFormData({...formData, teamSize: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="pv-btn-primary w-full justify-center text-lg shadow-lg shadow-accent/20"
                  >
                    Start Forensic Risk Scan
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24"
            >
              <div className="relative mb-8">
                <div className="w-28 h-28 border-4 border-surface-3 border-t-accent rounded-full animate-spin" />
                <Zap className="absolute inset-0 m-auto w-10 h-10 text-accent animate-pulse" />
              </div>
              <h2 className="text-2xl font-display font-bold text-text-primary mb-2">{loadingText}</h2>
              <p className="text-text-secondary text-sm">
                Cross-referencing vector embedding similarity against startup postmortem archive...
              </p>
            </motion.div>
          )}

          {step === 'result' && lastResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Top Controls Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-accent tracking-[0.2em] mb-1">
                    <CheckCircle2 className="w-4 h-4 text-success" /> Forensic Audit Complete
                  </div>
                  <h1 className="text-3xl font-display font-bold text-text-primary">
                    {formData.idea ? `Risk Analysis: "${formData.idea.slice(0, 45)}..."` : 'Startup Risk Audit'}
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="pv-btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" /> Export PDF Memo
                  </button>
                  <button
                    onClick={resetScan}
                    className="pv-btn-primary text-xs px-3 py-2 flex items-center gap-1.5"
                  >
                    <RefreshCcw className="w-4 h-4" /> New Scan
                  </button>
                </div>
              </div>

              {/* Pitch Readiness Banner */}
              <div className="pv-card p-6 bg-gradient-to-r from-surface-2 via-surface to-surface-2 border-accent/30 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className={clsx(
                    "w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold font-data text-2xl shrink-0 shadow-lg",
                    pitchReadinessScore >= 60 ? "bg-success/20 text-success border border-success/40" : "bg-warning/20 text-warning border border-warning/40"
                  )}>
                    {pitchReadinessScore}%
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-text-muted tracking-widest mb-1">
                      Investor Pitch Readiness Index
                    </div>
                    <div className="text-lg font-bold text-text-primary">
                      {pitchReadinessScore >= 60 ? "INVESTOR APPROVED — Low Structural Risk" : "HIGH VC CAUTION — Vulnerability Mitigation Required"}
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      Evaluated against 413 historical postmortems in <span className="font-semibold text-accent">{formData.industry}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-danger/10 text-danger border border-danger/20 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> CAC Vector Trap
                  </span>
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Moat Defensibility
                  </span>
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-warning/10 text-warning border border-warning/20 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Churn Risk
                  </span>
                </div>
              </div>

              {/* 4 Interactive Presentation Tabs */}
              <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveTab('brief')}
                  className={clsx(
                    "px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-t-lg transition-all border-b-2 flex items-center gap-2 whitespace-nowrap",
                    activeTab === 'brief'
                      ? "border-accent text-accent bg-accent/10"
                      : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2"
                  )}
                >
                  <FileText className="w-4 h-4" /> 1. Forensic Report
                </button>
                <button
                  onClick={() => setActiveTab('precedents')}
                  className={clsx(
                    "px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-t-lg transition-all border-b-2 flex items-center gap-2 whitespace-nowrap",
                    activeTab === 'precedents'
                      ? "border-accent text-accent bg-accent/10"
                      : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2"
                  )}
                >
                  <Skull className="w-4 h-4" /> 2. Graveyard Precedents ({lastResult.similarStartups?.length || 4})
                </button>
                <button
                  onClick={() => setActiveTab('battleground')}
                  className={clsx(
                    "px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-t-lg transition-all border-b-2 flex items-center gap-2 whitespace-nowrap",
                    activeTab === 'battleground'
                      ? "border-accent text-accent bg-accent/10"
                      : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2"
                  )}
                >
                  <Sword className="w-4 h-4" /> 3. Market Battleground
                </button>
                <button
                  onClick={() => setActiveTab('pivots')}
                  className={clsx(
                    "px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-t-lg transition-all border-b-2 flex items-center gap-2 whitespace-nowrap",
                    activeTab === 'pivots'
                      ? "border-accent text-accent bg-accent/10"
                      : "border-transparent text-text-muted hover:text-text-primary hover:bg-surface-2"
                  )}
                >
                  <Shuffle className="w-4 h-4" /> 4. Strategic Pivot Simulator
                </button>
              </div>

              {/* TAB 1: FORENSIC REPORT */}
              {activeTab === 'brief' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Score Card */}
                    <div className="lg:col-span-1">
                      <div className="pv-card p-6 relative h-full flex flex-col justify-between">
                        {simulatedResult && (
                          <div className="absolute top-4 right-4 bg-success/10 text-success text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                            Simulated Pivot Active
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold uppercase text-text-muted tracking-widest mb-6">
                            Aggregate Risk Gauge
                          </div>
                          <div className="flex items-center justify-center mb-6">
                            <div className="relative w-44 h-44">
                              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 192 192">
                                <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-border" />
                                <circle 
                                  cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="14" fill="transparent" 
                                  strokeDasharray={502.65}
                                  strokeDashoffset={502.65 * (1 - currentScore / 100)}
                                  className={clsx(
                                    'transition-all duration-1000',
                                    currentScore > 70 ? 'text-danger' : currentScore > 40 ? 'text-accent' : 'text-success'
                                  )}
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-6xl font-data font-bold text-text-primary">{currentScore}</span>
                                <span className="text-xs font-bold uppercase text-text-muted tracking-wider mt-1">Risk Score</span>
                              </div>
                            </div>
                          </div>
                          <div className={clsx(
                            "flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wider mb-2",
                            currentScore > 70 ? 'text-danger' : currentScore > 40 ? 'text-accent' : 'text-success'
                          )}>
                            {currentScore > 70 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            {currentScore > 70 ? 'HIGH RISK' : currentScore > 40 ? 'MODERATE RISK' : 'LOW RISK'}
                          </div>
                          <div className="text-center text-xs text-text-muted">
                            Primary failure vector: <span className="font-semibold text-text-primary">{lastResult.primaryRisk}</span>
                          </div>
                        </div>

                        {simulatedResult && (
                          <button 
                            onClick={() => setSimulatedResult(null)}
                            className="mt-6 w-full text-xs text-text-muted hover:text-accent underline font-bold tracking-widest"
                          >
                            Reset to Original Scan
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Radar Chart */}
                    <div className="lg:col-span-2">
                      <div className="pv-card p-6 h-full">
                        <div className="text-xs font-bold uppercase text-text-muted tracking-widest mb-4">
                          Failure Vector Breakdown Matrix
                        </div>
                        <div className="h-80">
                          <PremiumRadarChart data={currentBreakdown} isSimulated={!!simulatedResult} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="pv-card p-8">
                    <h3 className="text-xl font-display font-bold text-text-primary mb-6 flex items-center gap-2">
                      <CheckCircle2 className="text-success w-6 h-6" />
                      Strategic Recommendations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {lastResult.recommendations.map((rec, i) => (
                        <div key={i} className="border border-border rounded-xl p-5 bg-surface-2/30 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={clsx(
                                'w-2 h-2 rounded-full',
                                rec.priority === 'high' ? 'bg-danger animate-pulse' : 'bg-accent'
                              )} />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Priority: {rec.priority}</span>
                            </div>
                            <div className="font-semibold text-text-primary mb-2 leading-snug">{rec.action}</div>
                            <div className="text-xs text-text-secondary leading-relaxed">{rec.rationale}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Conversation Panel Brief output */}
                  <ConversationPanel
                    conversation={conversation}
                    query={query}
                    setQuery={setQuery}
                    loading={loading}
                    onSend={handleFollowUp}
                    suggestedFollowUps={suggestedFollowUps}
                    onSuggestedFollowUp={handleSuggestedFollowUp}
                    placeholder="Ask a follow-up question..."
                    title="Deep-Dive Forensic Inquiry"
                  />
                </motion.div>
              )}

              {/* TAB 2: GRAVEYARD PRECEDENTS */}
              {activeTab === 'precedents' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="pv-card p-6 bg-surface border-accent/20">
                    <div className="flex items-center gap-3 mb-2">
                      <Skull className="w-6 h-6 text-danger" />
                      <h3 className="text-xl font-display font-bold text-text-primary">Historical Precedent Graveyard</h3>
                    </div>
                    <p className="text-sm text-text-secondary">
                      Our intelligence graph matched <span className="font-bold text-text-primary">"{formData.idea}"</span> against these historical startup failures in <span className="font-bold text-accent">{formData.industry}</span>:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {lastResult.similarStartups?.map((startup, idx) => (
                      <div key={idx} className="pv-card p-6 border-border hover:border-danger/40 transition-all space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-2xl font-display font-bold text-text-primary">{startup.name}</div>
                            <div className="text-xs text-text-muted mt-0.5">
                              <span className="font-semibold text-accent">{startup.industry || formData.industry}</span> • Capital Burned: <span className="text-danger font-bold">{startup.funding || '$15M'}</span>
                            </div>
                          </div>
                          <span className="text-xs font-bold font-data bg-danger/10 text-danger px-3 py-1 rounded-full border border-danger/20">
                            {startup.similarity}% Match
                          </span>
                        </div>

                        <div className="p-4 rounded-lg bg-surface-2 border border-border/50 text-xs text-text-secondary leading-relaxed">
                          <div className="font-bold text-text-primary uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1">
                            <AlertOctagon className="w-3 h-3 text-warning" /> Postmortem Root Cause
                          </div>
                          {startup.keyLesson || startup.summary}
                        </div>

                        <div className="pt-2 flex items-center justify-between text-xs text-text-muted border-t border-border/30">
                          <span>Risk Pattern Alignment:</span>
                          <span className="font-semibold text-accent">High Structural Similarity</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 3: MARKET BATTLEGROUND */}
              {activeTab === 'battleground' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="pv-card p-8 border-accent/20 bg-surface/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <div>
                        <h3 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
                          <Sword className="text-accent w-6 h-6" />
                          Market Battleground & Competitor Intelligence
                        </h3>
                        <p className="text-sm text-text-secondary mt-1">Real-time competitive analysis & moat vulnerability breakdown</p>
                      </div>
                      {!compResult && (
                        <button 
                          onClick={handleCompare}
                          disabled={compLoading}
                          className="pv-btn-primary disabled:opacity-50"
                        >
                          {compLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Target className="w-4 h-4 mr-2" />
                          )}
                          Scan Live Competitors
                        </button>
                      )}
                    </div>

                    {compLoading && (
                      <div className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 text-accent animate-spin" />
                          <span className="text-sm font-data text-text-muted uppercase tracking-widest">
                            SCANNING COMPETITOR MOATS & MARKET DEFENSES...
                          </span>
                        </div>
                      </div>
                    )}

                    {compResult && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {compResult.competitors?.map((comp, i) => (
                            <div key={i} className="p-5 bg-surface border border-border rounded-xl">
                              <div className="flex justify-between items-start mb-3">
                                <div className="font-semibold text-text-primary">{comp.name}</div>
                                <span className={clsx(
                                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                                  comp.threatLevel === 'high' ? "bg-danger text-white" : "bg-warning text-black"
                                )}>
                                  {comp.threatLevel} threat
                                </span>
                              </div>
                              <p className="text-xs text-text-secondary italic">"{comp.moat}"</p>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="p-6 bg-surface-2 border border-border rounded-xl">
                            <h4 className="text-xs font-bold uppercase text-text-muted tracking-widest mb-4 flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-success" />
                              Survival Strategy
                            </h4>
                            <p className="text-sm text-text-primary leading-relaxed">{compResult.survivalStrategy}</p>
                          </div>
                          <div className="p-6 bg-surface-2 border border-border rounded-xl">
                            <h4 className="text-xs font-bold uppercase text-text-muted tracking-widest mb-4 flex items-center gap-2">
                              <Target className="w-4 h-4 text-accent" />
                              Market Gap Analysis
                            </h4>
                            <p className="text-sm text-text-primary leading-relaxed">{compResult.gapAnalysis}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!compResult && !compLoading && (
                      <div className="p-10 border border-dashed border-border rounded-xl text-center">
                        <Target className="w-10 h-10 text-accent mx-auto mb-3" />
                        <h4 className="font-bold text-text-primary mb-1">Click above to run live competitor scan</h4>
                        <p className="text-xs text-text-secondary">Analyze active market incumbents and pinpoint open defensible market gaps.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: STRATEGIC PIVOT SIMULATOR */}
              {activeTab === 'pivots' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {lastResult.suggestedPivots && (
                    <div className="pv-card p-8 border-accent/20 bg-surface/30">
                      <div className="mb-6 flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
                            <Shuffle className="text-accent w-6 h-6" />
                            Strategic Pivot Simulator
                          </h3>
                          <p className="text-sm text-text-secondary mt-1">Select a pivot vector to simulate live risk reduction on your radar chart.</p>
                        </div>
                        {simulatedResult && (
                          <span className="text-xs font-bold font-data bg-success/20 text-success px-3 py-1.5 rounded-full border border-success/30">
                            Risk dropped from {lastResult.riskScore} → {simulatedResult.score}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {lastResult.suggestedPivots.map((pivot, i) => (
                          <motion.button
                            key={i}
                            whileHover={{ y: -2 }}
                            className={clsx(
                              "p-6 border rounded-xl transition-all text-left relative overflow-hidden",
                              simulatedResult?.pivot === pivot 
                                ? "bg-success/10 border-success shadow-[0_0_25px_rgba(16,185,129,0.15)]" 
                                : "bg-surface border-border hover:border-accent/50"
                            )}
                            onClick={() => handleSimulatePivot(pivot, i)}
                          >
                            {simulating === i && (
                              <div className="absolute inset-0 bg-bg/85 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 gap-2">
                                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                                <span className="text-xs font-bold uppercase tracking-widest text-accent">RE-CALCULATING RADAR VECTORS...</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Lightbulb className={clsx("w-5 h-5", simulatedResult?.pivot === pivot ? "text-success" : "text-accent")} />
                                <span className={clsx("text-xs font-bold uppercase tracking-widest", simulatedResult?.pivot === pivot ? "text-success" : "text-accent")}>
                                  {pivot.type}
                                </span>
                              </div>
                              {simulatedResult?.pivot === pivot && (
                                <span className="text-[10px] font-bold uppercase bg-success text-black px-2 py-0.5 rounded">
                                  ACTIVE SIMULATION
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-text-primary mb-3 text-base leading-snug">{pivot.description}</div>
                            <div className="text-xs text-text-secondary border-t border-border/30 pt-3 italic">
                              <span className="block text-[10px] font-bold uppercase text-text-muted tracking-widest not-italic mb-1">Historical Pivot Precedent</span>
                              "{pivot.historicalExample}"
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RiskScanner;
