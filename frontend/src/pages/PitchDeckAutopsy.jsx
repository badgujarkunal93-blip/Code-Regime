import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, ShieldAlert, Target, Activity, Loader2, Sparkles, AlertTriangle, FileUp, CheckCircle2, Lightbulb, RefreshCcw } from 'lucide-react';
import api from '../lib/api';
import { clsx } from 'clsx';
import JSZip from 'jszip';
import ConversationPanel from '../components/ui/ConversationPanel';
import WorkspaceBar from '../components/WorkspaceBar';
import { useWorkspace } from '../context/WorkspaceContext';
import { useToast } from '../components/Toast';

const PitchDeckAutopsy = () => {
  const { profile, getSharedHistory, recordAnalysis } = useWorkspace();
  const toast = useToast();
  const [deckContent, setDeckContent] = React.useState('');
  const [industry, setIndustry] = React.useState(profile.industry || 'SaaS');
  const [loading, setLoading] = React.useState(false);
  const [parsing, setParsing] = React.useState(false);
  const [conversation, setConversation] = React.useState([]);
  const [query, setQuery] = React.useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.pptx')) {
      setParsing(true);
      try {
        const zip = await JSZip.loadAsync(file);
        const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
        
        let fullText = '';
        for (const slideFile of slideFiles) {
          const content = await zip.files[slideFile].async('string');
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');
          const textNodes = xmlDoc.getElementsByTagName('a:t');
          
          for (let i = 0; i < textNodes.length; i++) {
            fullText += textNodes[i].textContent + ' ';
          }
          fullText += '\n\n';
        }
        setDeckContent(fullText.trim());
      } catch (err) {
        console.error('Error parsing PPTX:', err);
        toast({ title: 'Failed to parse PPTX. Please paste the text manually.', type: 'error' });
      } finally {
        setParsing(false);
      }
    } else {
      toast({ title: 'Please upload a .pptx file.', type: 'error' });
    }
  };

  const handleAutopsy = async (e) => {
    e.preventDefault();
    if (!deckContent.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/ai/autopsy', {
        deckContent,
        industry,
        history: getSharedHistory([], 'Pitch Deck Autopsy'),
      });

      recordAnalysis({
        tool: 'Pitch Deck Autopsy',
        summary: response.data.pathologistVerdict
          || `Overall deck risk: ${response.data.overallRisk}. ${(response.data.executiveSummary || '').slice(0, 200)}`,
        profilePatch: { industry },
      });

      setConversation([
        {
          role: 'user',
          content: `Deck Content: ${deckContent.slice(0, 100)}...\nIndustry: ${industry}`
        },
        {
          role: 'assistant',
          content: response.data.consultantBrief || "Here's your pitch deck autopsy.",
          fullResult: response.data
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async (followUpText) => {
    const question = (followUpText ?? query).trim();
    if (!question) return;

    setLoading(true);
    const newHistory = conversation.map(msg => ({ role: msg.role, content: msg.content }));

    try {
      const response = await api.post('/ai/autopsy', { deckContent, industry, history: getSharedHistory(newHistory, 'Pitch Deck Autopsy'), followUpQuestion: question });
      setConversation(prev => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: response.data.consultantBrief || "Here's your updated analysis.", fullResult: response.data }
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

  const reset = () => {
    setConversation([]);
    setDeckContent('');
    setIndustry('SaaS');
    setQuery('');
  };

  const lastResult = conversation.length > 0 ? conversation[conversation.length - 1].fullResult : null;
  const suggestedFollowUps = [
    { label: "Explain more", prompt: "Explain the autopsy findings above in more depth, focusing on the lethal weaknesses." },
    { label: "Why is this risky?", prompt: "Explain in detail why the weaknesses identified above are risky, citing the historical precedents." },
    { label: "How can I improve this?", prompt: "Based on the autopsy above, give specific, actionable improvements to fix the lethal weaknesses in my deck." },
    { label: "Compare with successful startups", prompt: "Compare my pitch deck against successful startups in this industry and explain what they did differently." }
  ];

  const sampleDecks = [
    {
      label: '🚀 Sample 1: AI SaaS Pitch Deck',
      industry: 'SaaS',
      content: `PROBLEM: Engineering teams spend 40% of their bandwidth writing manual documentation and refactoring legacy code.\nSOLUTION: An AI assistant that scans repositories and auto-generates documentation and code optimization.\nMARKET SIZE (TAM): $45 Billion global software developer tools market.\nMONETIZATION: $29 per user per month SaaS subscription.\nCOMPETITION: GitHub Copilot, SonarQube, Tabnine.\nGO-TO-MARKET: Organic developer word of mouth and Google search ads.`
    },
    {
      label: '💳 Sample 2: FinTech Payment Pitch Deck',
      industry: 'FinTech',
      content: `PROBLEM: E-commerce merchants lose 3% of revenue to credit card processing fees and 5% to cart abandonment.\nSOLUTION: Sub-second 1-click crypto payment gateway for Shopify with zero merchant gas fees.\nMARKET SIZE (TAM): $10 Trillion global retail e-commerce payments.\nMONETIZATION: 0.5% merchant payout fee per transaction.\nCOMPETITION: Fast, Bolt, Stripe Checkout.\nGO-TO-MARKET: Direct Instagram & Meta ad campaigns targeting e-commerce store owners.`
    },
    {
      label: '🎓 Sample 3: EdTech Classroom Pitch Deck',
      industry: 'EdTech',
      content: `PROBLEM: K-12 school districts struggle with personalized student math & science tutoring.\nSOLUTION: An adaptive AI tutoring platform for public school classrooms.\nMARKET SIZE (TAM): $80 Billion US Public School Education Budget.\nMONETIZATION: $10,000 per school district annual licensing contract.\nCOMPETITION: Khan Academy, Byju's, Knewton.\nGO-TO-MARKET: Direct enterprise sales reps pitching school district superintendents.`
    }
  ];

  const applySampleDeck = (sample) => {
    setDeckContent(sample.content);
    setIndustry(sample.industry);
  };

  return (
    <div className="pv-content-container py-12">
      <WorkspaceBar />
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Activity className="w-16 h-16 text-accent" />
          {conversation.length > 0 && (
            <button
              onClick={reset}
              className="pv-btn-secondary flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              New Autopsy
            </button>
          )}
        </div>
        <h1 className="text-5xl font-display font-bold mb-4">Pitch Deck Autopsy</h1>
        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
          Our AI "Pathologist" scans your deck content for lethal weaknesses and cross-references them with historical failure patterns.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {conversation.length === 0 ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pv-card p-10"
          >
            {/* Demo Sample Deck Presets */}
            <div className="mb-8 p-4 rounded-xl border border-accent/20 bg-surface-2/40">
              <div className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-accent" /> One-Click Sample Pitch Decks for Judges
              </div>
              <div className="flex flex-wrap gap-2">
                {sampleDecks.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applySampleDeck(sample)}
                    className="text-xs px-3.5 py-2 rounded-lg border border-border bg-surface hover:border-accent/50 hover:bg-accent/10 transition-all font-medium text-text-primary flex items-center gap-1.5"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAutopsy} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-text-secondary uppercase tracking-widest">Startup Industry</label>
                  <select
                    className="pv-field"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    <option value="SaaS">SaaS</option>
                    <option value="FinTech">FinTech</option>
                    <option value="EdTech">EdTech</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Web3">Web3/Crypto</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-bold text-text-secondary uppercase tracking-widest block">Upload Pitch Deck (.pptx)</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept=".pptx"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={clsx(
                    "border-2 border-dashed rounded-2xl p-8 text-center transition-all",
                    parsing ? "border-accent bg-accent/5 animate-pulse" : "border-border group-hover:border-accent/50 group-hover:bg-surface-2"
                  )}>
                    {parsing ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-accent animate-spin" />
                        <div className="text-accent font-bold uppercase tracking-widest">Extracting Text from Slides...</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                          <FileUp className="w-6 h-6 text-text-secondary group-hover:text-accent" />
                        </div>
                        <div className="text-sm text-text-secondary">
                          <span className="text-accent font-bold">Click to upload</span> or drag and drop
                        </div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">PowerPoint (.pptx) only</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-text-secondary uppercase tracking-widest">Deck Content / Problem Statement</label>
                <textarea
                  required
                  placeholder="Paste the text from your pitch deck here. Include your Problem, Solution, Market Size, and Monetization slides..."
                  rows={10}
                  className="pv-field font-mono"
                  value={deckContent}
                  onChange={(e) => setDeckContent(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full pv-btn-primary justify-center text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    PERFORMING AUTOPSY...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Begin Autopsy
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            {/* Conversation Flow with Full Results */}
            <div className="space-y-6">
              {lastResult && (
                <>
                  {/* Risk Level Header */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={clsx(
                      "md:col-span-1 pv-card p-8 flex flex-col items-center justify-center text-center border-l-8",
                      lastResult.overallRisk === 'Lethal' ? "border-l-danger bg-danger/5" : "border-l-warning bg-warning/5"
                    )}>
                      <div className="text-sm font-bold text-text-muted uppercase tracking-[0.2em] mb-4">Overall Risk</div>
                      <div className={clsx(
                        "text-5xl font-data font-bold mb-2",
                        lastResult.overallRisk === 'Lethal' ? "text-danger" : "text-warning"
                      )}>{lastResult.overallRisk}</div>
                      <div className="flex items-center gap-2 text-text-secondary text-xs uppercase font-bold tracking-widest">
                        <ShieldAlert className="w-4 h-4" />
                        Diagnostic Grade
                      </div>
                    </div>

                    <div className="md:col-span-2 pv-card p-8 bg-accent/5 border-accent/20">
                      <div className="text-sm font-bold text-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Pathologist's Verdict
                      </div>
                      <p className="text-lg text-text-primary leading-relaxed italic">
                        "{lastResult.pathologistVerdict}"
                      </p>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="pv-card p-10">
                    <h3 className="text-2xl font-display font-bold mb-6 flex items-center gap-3">
                      <FileText className="text-accent w-7 h-7" />
                      Executive Summary
                    </h3>
                    <p className="text-text-primary leading-relaxed">{lastResult.executiveSummary}</p>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="pv-card p-8">
                      <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2 text-success">
                        <CheckCircle2 className="w-6 h-6" />
                        Strengths
                      </h3>
                      <div className="space-y-4">
                        {lastResult.strengths?.map((strength, i) => (
                          <div key={i} className="p-4 rounded-lg bg-surface-2 border border-border/50">
                            <div className="font-semibold text-text-primary mb-1">{strength.title}</div>
                            <div className="text-sm text-text-secondary">{strength.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pv-card p-8">
                      <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2 text-danger">
                        <AlertTriangle className="w-6 h-6" />
                        Weaknesses
                      </h3>
                      <div className="space-y-4">
                        {lastResult.weaknesses?.map((weakness, i) => (
                          <div key={i} className="p-4 rounded-lg bg-surface-2 border border-border/50">
                            <div className="font-semibold text-text-primary mb-1">{weakness.title}</div>
                            <div className="text-sm text-text-secondary">{weakness.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Risk Categories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { title: 'Market Risks', data: lastResult.marketRisks, icon: <Target className="w-6 h-6" /> },
                      { title: 'Product Risks', data: lastResult.productRisks, icon: <AlertTriangle className="w-6 h-6" /> },
                      { title: 'GTM Risks', data: lastResult.gtmRisks, icon: <Search className="w-6 h-6" /> },
                      { title: 'Financial Risks', data: lastResult.financialRisks, icon: <Activity className="w-6 h-6" /> }
                    ].map((category, i) => (
                      <div key={i} className="pv-card p-8">
                        <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2 text-accent">
                          {category.icon}
                          {category.title}
                        </h3>
                        <div className="space-y-4">
                          {category.data?.map((risk, j) => (
                            <div key={j} className="p-4 rounded-lg bg-surface-2 border border-border/50">
                              <div className="font-semibold text-text-primary mb-1">{risk.title}</div>
                              <div className="text-sm text-text-secondary">{risk.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* PMF Analysis */}
                  <div className="pv-card p-10 bg-surface/50">
                    <h3 className="text-2xl font-display font-bold mb-6 flex items-center gap-3">
                      <Target className="text-success w-7 h-7" />
                      Product-Market Fit Analysis
                    </h3>
                    <p className="text-text-primary leading-relaxed">{lastResult.pmfAnalysis}</p>
                  </div>

                  {/* Investor Concerns */}
                  <div className="pv-card p-10">
                    <h3 className="text-2xl font-display font-bold mb-6 flex items-center gap-3">
                      <ShieldAlert className="text-danger w-7 h-7" />
                      Investor Concerns
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {lastResult.investorConcerns?.map((concern, i) => (
                        <div key={i} className="p-5 rounded-lg bg-danger/5 border border-danger/20">
                          <div className="font-semibold text-text-primary mb-2">{concern.title}</div>
                          <div className="text-sm text-text-secondary">{concern.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Competitive Analysis */}
                  <div className="pv-card p-10">
                    <h3 className="text-2xl font-display font-bold mb-6 flex items-center gap-3">
                      <Activity className="text-accent w-7 h-7" />
                      Competitive Analysis
                    </h3>
                    <p className="text-text-primary leading-relaxed">{lastResult.competitiveAnalysis}</p>
                  </div>

                  {/* Recommended Improvements */}
                  <div className="pv-card p-10">
                    <h3 className="text-2xl font-display font-bold mb-6 flex items-center gap-3">
                      <Lightbulb className="text-accent w-7 h-7" />
                      Recommended Improvements
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {lastResult.recommendedImprovements?.map((improvement, i) => (
                        <div key={i} className="p-5 rounded-lg bg-accent/5 border border-accent/20">
                          <div className="font-semibold text-text-primary mb-2">{improvement.title}</div>
                          <div className="text-sm text-text-secondary">{improvement.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Plan */}
                  <div className="pv-card p-10 bg-surface/30">
                    <h3 className="text-2xl font-display font-bold mb-6 flex items-center gap-3">
                      <Search className="text-success w-7 h-7" />
                      Action Plan
                    </h3>
                    <div className="space-y-6">
                      {lastResult.actionPlan?.map((phase, i) => (
                        <div key={i} className="border-l-4 border-success pl-6">
                          <div className="font-semibold text-lg text-text-primary mb-3">{phase.phase}</div>
                          <ul className="list-disc list-inside space-y-2">
                            {phase.tasks.map((task, j) => (
                              <li key={j} className="text-text-secondary">{task}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lethal Weaknesses */}
                  <div className="pv-card p-10">
                    <h3 className="text-2xl font-display font-bold mb-8 flex items-center gap-3 text-danger">
                      <AlertTriangle className="w-8 h-8" />
                      Lethal Weaknesses Identified
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {lastResult.lethalWeaknesses.map((weakness, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-surface-2 border border-border/50 hover:border-danger/30 transition-all group">
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-xs font-bold text-danger uppercase tracking-wider px-2 py-1 bg-danger/10 rounded">{weakness.slide} Slide</div>
                          </div>
                          <div className="font-bold text-lg mb-3 text-text-primary group-hover:text-danger transition-colors">{weakness.issue}</div>
                          <div className="text-sm text-text-secondary leading-relaxed border-t border-border/20 pt-4">
                            <span className="font-bold text-text-muted uppercase text-[10px] block mb-1">Historical Precedent</span>
                            {weakness.historicalPrecedent}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Conversation Panel */}
            <ConversationPanel
              conversation={conversation}
              query={query}
              setQuery={setQuery}
              loading={loading}
              onSend={handleFollowUp}
              suggestedFollowUps={suggestedFollowUps}
              onSuggestedFollowUp={handleSuggestedFollowUp}
              placeholder="Ask a follow-up question..."
              title="Continue Analysis"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PitchDeckAutopsy;
