import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Search, ArrowRight, ShieldAlert, RefreshCw } from 'lucide-react';
import StartupCard from '../components/StartupCard';
import api from '../lib/api';
import ConversationPanel from '../components/ui/ConversationPanel';
import ErrorDisplay from '../components/ui/ErrorDisplay';
import WorkspaceBar from '../components/WorkspaceBar';
import { useLoading } from '../context/LoadingContext';
import { useWorkspace } from '../context/WorkspaceContext';

const AiAssistant = () => {
  const { getSharedHistory, recordAnalysis } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [originalQuery, setOriginalQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [conversation, setConversation] = React.useState([]);
  const [error, setError] = React.useState(null);
  const { showLoader, hideLoader } = useLoading();

  const urlQuery = searchParams.get('q') || '';

  const executeResearch = async (searchQuery, isFollowUp = false) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    if (!isFollowUp) {
      setOriginalQuery(searchQuery);
      setConversation([]);
      showLoader('Researching startup intelligence...');
    }
    setError(null);

    const newHistory = isFollowUp
      ? conversation.map(msg => ({ role: msg.role, content: msg.content }))
      : [];

    try {
      const response = await api.post('/ai/research', {
        query: isFollowUp ? originalQuery : searchQuery,
        followUpQuestion: isFollowUp ? searchQuery : undefined,
        history: getSharedHistory(newHistory, 'AI Research')
      });

      recordAnalysis({
        tool: 'AI Research',
        summary: `Researched: "${searchQuery}". ${(response.data.aiSummary || '').replace(/[#*`>]/g, '').slice(0, 240)}`,
      });

      setConversation(prev => [
        ...prev,
        { role: 'user', content: searchQuery },
        { role: 'assistant', content: response.data.consultantBrief || response.data.aiSummary, fullResult: response.data }
      ]);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch research analytics. Check backend status.');
    } finally {
      setLoading(false);
      if (!isFollowUp) {
        hideLoader();
      }
    }
  };

  React.useEffect(() => {
    if (urlQuery) {
      setQuery(urlQuery);
      setConversation([]);
      executeResearch(urlQuery, false);
    }
  }, [urlQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setConversation([]);
    setSearchParams({ q: query });
    executeResearch(query, false);
    setQuery('');
  };

  const handleSendFollowUp = (followUpText) => {
    const textToSend = followUpText || query;
    if (!textToSend.trim()) return;
    executeResearch(textToSend, true);
    setQuery('');
  };

  const handleSuggestedFollowUp = (followUpQuery) => {
    executeResearch(followUpQuery, true);
  };

  const resetConversation = () => {
    setConversation([]);
    setQuery('');
    setOriginalQuery('');
    setSearchParams({});
    setError(null);
  };

  const sampleQuestions = [
    "Compare Byju's and Quibi.",
    "Show startups that failed because of poor PMF.",
    "What patterns exist among food delivery startups?",
    "Find startups with broken unit economics."
  ];

  const suggestedFollowUps = [
    { label: "Explain deeper", prompt: "Explain the analysis above in more depth, with specific reasoning and evidence." },
    { label: "Show examples", prompt: "Show concrete examples of startups from the analysis above that illustrate these patterns." },
    { label: "Compare startups", prompt: "Compare the startups mentioned in the analysis above and highlight the key differences in why they failed." },
    { label: "Give recommendations", prompt: "Based on the analysis above, give specific, actionable recommendations." },
    { label: "Generate action plan", prompt: "Based on the analysis above, generate a concrete step-by-step action plan." }
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="pv-content-container py-12">
        <WorkspaceBar />
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-[10px] font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            AI Research Assistant
          </div>
          <div className="flex items-center justify-center gap-4 mb-3">
            <h1 className="text-4xl font-display font-bold text-text-primary">AI Research Assistant</h1>
            {conversation.length > 0 && (
              <button
                onClick={resetConversation}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-accent/40 hover:bg-surface-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-medium">New Chat</span>
              </button>
            )}
          </div>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">Query our failure database, extract insights, and compare strategies semantically.</p>
        </div>

        {/* Search Section */}
        {conversation.length === 0 && (
          <div className="max-w-3xl mx-auto mb-10">
            <form onSubmit={handleSubmit} className="relative pv-card p-3 flex items-center gap-3">
              <Search className="w-5 h-5 text-text-muted shrink-0 ml-2" />
              <input
                type="text"
                placeholder="Ask anything about startup failures..."
                className="flex-1 bg-transparent border-0 min-h-control px-2 py-2 text-text-primary placeholder:text-text-muted focus:ring-0 text-base"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="submit"
                className="pv-btn-primary shrink-0"
              >
                Send
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </form>

            {/* Example Suggestions */}
            <div className="mt-8">
              <h3 className="text-xs font-bold uppercase text-text-muted tracking-widest mb-4 flex items-center justify-center gap-2">
                <Search className="w-4 h-4 text-accent" />
                Suggested Research Directions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setConversation([]);
                      setOriginalQuery(q);
                      setQuery('');
                      setSearchParams({ q });
                      executeResearch(q, false);
                    }}
                    className="text-left p-5 pv-card-interactive"
                  >
                    <div className="text-xs font-bold uppercase text-accent mb-1">Topic {idx + 1}</div>
                    <div className="text-text-primary font-medium">{q}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
      {error && (
        <div className="max-w-md mx-auto mt-12">
          <ErrorDisplay 
            message={error} 
            onRetry={() => executeResearch(query)} 
          />
        </div>
      )}

        {/* Result Presentation */}
        {conversation.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto space-y-8"
          >
            {/* Conversation Flow with Full Results */}
            <div className="space-y-6">
              {conversation.map((msg, idx) => (
                <div key={idx} className="space-y-6">
                  {/* Show full results only for the last assistant message */}
                  {msg.role === 'assistant' && idx === conversation.length - 1 && msg.fullResult && (
                    <div className="space-y-6">
                      {/* Timeline Comparison */}
                      {msg.fullResult.timeline && msg.fullResult.timeline.length > 0 && (
                        <div className="pv-card p-8">
                          <h3 className="text-xl font-display font-bold text-text-primary mb-6 flex items-center gap-2">
                            <span className="w-1 h-6 bg-accent rounded-full" />
                            Comparative Timeline
                          </h3>
                          <div className="relative pl-8 border-l border-border space-y-6 ml-2">
                            {msg.fullResult.timeline.map((evt, evtIdx) => (
                              <div key={evtIdx} className="relative">
                                <span className="absolute -left-10 top-1.5 w-4 h-4 rounded-full bg-accent border-4 border-bg" />
                                <div>
                                  <span className="text-xs font-data font-bold text-accent uppercase tracking-widest">{evt.year} — {evt.startup}</span>
                                  <h4 className="text-base font-semibold text-text-primary mt-1">{evt.event}</h4>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Insights and Sources */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Key Lessons */}
                        {msg.fullResult.keyLessons && msg.fullResult.keyLessons.length > 0 && (
                          <div className="lg:col-span-1">
                            <div className="pv-card p-6 border-accent/20 bg-surface/20 h-full">
                              <h3 className="text-sm font-display font-bold text-text-primary mb-5 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-accent" />
                                Key Lessons
                              </h3>
                              <div className="space-y-4">
                                {msg.fullResult.keyLessons.map((les, lesIdx) => (
                                  <div key={lesIdx} className="text-sm">
                                    <div className="font-semibold text-text-primary mb-1 border-b border-border/40 pb-1 flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                      {les.lesson}
                                    </div>
                                    <p className="text-text-secondary leading-relaxed pl-3">{les.details}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Cited References */}
                        {msg.fullResult.sources && msg.fullResult.sources.length > 0 && (
                          <div className="lg:col-span-2">
                            <div className="pv-card p-6 h-full">
                              <h3 className="text-xs font-bold uppercase text-text-muted tracking-widest mb-5">
                                Cited References
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {msg.fullResult.sources.map((src, srcIdx) => (
                                  <Link
                                    key={srcIdx}
                                    to={`/startup/${src}`}
                                    className="p-4 border border-border rounded-lg bg-surface hover:border-accent/40 hover:bg-surface-2 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-text-primary capitalize">{src.replace(/-/g, ' ')}</span>
                                      <ArrowRight className="w-4 h-4 text-accent" />
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Related Startups */}
                      {msg.fullResult.relatedStartups && msg.fullResult.relatedStartups.length > 0 && (
                        <div>
                          <h3 className="text-xl font-display font-bold text-text-primary mb-6 flex items-center gap-2">
                            <span className="w-1 h-6 bg-accent rounded-full" />
                            Related Failures
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {msg.fullResult.relatedStartups.map((rs, rsIdx) => (
                              <StartupCard key={rsIdx} {...rs} topFailureReason={null} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Conversation Panel */}
            <ConversationPanel
              conversation={conversation}
              query={query}
              setQuery={setQuery}
              loading={loading}
              onSend={handleSendFollowUp}
              suggestedFollowUps={suggestedFollowUps}
              onSuggestedFollowUp={handleSuggestedFollowUp}
              placeholder="Ask a follow-up question..."
              title="Continue Analysis"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AiAssistant;
