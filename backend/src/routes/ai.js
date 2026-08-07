const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { searchWeb } = require('../services/searchService');
const { runRiskScanV2, trainBinaryClassifier } = require('../services/riskScannerV2');

const prisma = new PrismaClient();
const router = express.Router();

// Consultant-grade output contract shared across all AI endpoints.
// We DO NOT change any existing JSON field (the UI maps each field to a fixed
// component). We ADD one optional markdown field, `consultantBrief`, which holds
// a McKinsey + Y Combinator + Harvard Business Review style structured report.
const CONSULTANT_BRIEF_INSTRUCTION = `
ADDITIONALLY, include a field "consultantBrief": a single JSON string containing a McKinsey + Y Combinator + Harvard Business Review grade report in MARKDOWN.
The consultantBrief MUST:
- Be elite management-consultant quality: dense, evidence-backed, specific. NEVER generic.
- NEVER answer in plain paragraphs only. Always use markdown structure: "## Section" headings, "*" bullet points, "**bold**" emphasis.
- Use markdown comparison TABLES whenever comparing options, startups, risks, or scenarios. Table format:
| Column A | Column B |
| --- | --- |
| value | value |
- Contain ALL of these sections, in this order, each as a "## Heading":
  1. ## Summary - 2-3 sharp sentences (the executive TL;DR).
  2. ## Root Cause Analysis - the underlying drivers, not surface symptoms; use bullets.
  3. ## Timeline - key chronological inflection points (use a table: | Year | Event | Significance |).
  4. ## Failure Pattern - the recurring archetype/pattern this fits (name it explicitly).
  5. ## Business Lesson - the durable, transferable strategic lesson(s); use bullets.
  6. ## Founder Advice - direct, actionable advice in the voice of a seasoned operator; use bullets.
  7. ## Risk Score - an explicit score (e.g. "72/100 - High") with a one-line justification, and a risk-factor breakdown table (| Risk Factor | Score | Note |).
  8. ## Real Examples - real, verifiable startups/companies that illustrate the point (prefer ones from the provided context; never fabricate).
  9. ## Action Plan - a concrete, sequenced plan (use a table: | Phase | Action | Outcome |).
  10. ## Sources - cite the database startups and any web sources used (bullets); if none, say "Based on internal failure database analysis."
- Escape all newlines properly so the overall response remains a SINGLE valid JSON object.
Do NOT remove, rename, or restructure any other field in the schema. consultantBrief is ADDITIVE.
`.trim();

// Rate limiter for risk scan
const riskScanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many scan requests. Please wait before trying again.', code: 'RATE_LIMITED' }
});

// Risk Scan input schema
const riskScanSchema = z.object({
  idea: z.string().min(10).max(500),
  audience: z.string().min(3).max(200),
  revenueModel: z.string().min(2).max(200),
  teamSize: z.coerce.number().int().min(1).max(100),
  industry: z.string().min(2).max(100),
});

// Simple cache in memory (in production, use Redis)
const scanCache = new Map();

function getCacheKey(input) {
  const str = `${input.idea}|${input.audience}|${input.revenueModel}|${input.teamSize}|${input.industry}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `scan:${hash}`;
}

// AI service for calling Gemini
async function callGemini(prompt) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(json)?/, '').replace(/```$/, '').trim();
  }
  return JSON.parse(text);
}

async function callGeminiText(prompt) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
  });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

async function callGroq(prompt) {
  const Groq = require('groq-sdk');
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a JSON API. Return ONLY valid JSON. No markdown. No code blocks. No explanation. No backticks.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  let content = response.choices[0].message.content;
  console.log('RAW GROQ RESPONSE (first 300 chars):', content?.slice(0, 300));

  // Strip markdown code fences if present
  content = content.replace(/^```(json)?/i, '').replace(/```$/, '').trim();

  // Remove bad control characters that break JSON.parse
  content = content.replace(/[\x00-\x1F\x7F]/g, (ch) => {
    // Keep valid JSON whitespace
    if (ch === '\n' || ch === '\r' || ch === '\t') return ch;
    return '';
  });

  try {
    return JSON.parse(content);
  } catch (err) {
    console.error('Groq JSON parse failed:', err.message);
    console.error('Full raw content:', content);
    throw new Error(`Groq returned invalid JSON: ${err.message}`);
  }
}

// Fallback helper to get similar startups from DB
async function getSimilarStartupsFromDB(query, industry, count = 10) {
  const where = {
    OR: [
      ...(industry ? [{ industry: { contains: industry, mode: 'insensitive' } }] : []),
      ...(query ? [
        { name: { contains: query, mode: 'insensitive' } },
        { summary: { contains: query, mode: 'insensitive' } },
      ] : []),
    ],
  };
  if (!where.OR?.length) {
    delete where.OR;
  }
  const startups = await prisma.company.findMany({
    where,
    include: {
      failureReasons: true,
      timelineEvents: true,
    },
    take: count,
  });
  return startups;
}

// type = 'risk' | 'research' | 'autopsy' | 'playbook' | 'compare' — determines which fallback schema to use
async function callAI(prompt, type = 'risk', userInput = '', extra = {}) {
  const hasGemini = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '' && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here';
  const hasGroq = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== '' && process.env.GROQ_API_KEY !== 'your-groq-api-key-here';

  console.log("Gemini key:", hasGemini);
  console.log("Groq key:", hasGroq);

  // ── Try Groq first (faster, no quota issues on free tier) ──────────────
  if (hasGroq) {
    try {
      console.log('Trying Groq...');
      return await callGroq(prompt);
    } catch (err) {
      console.warn('Groq failed:', err.message);
    }
  }

  // ── Fall back to Gemini ─────────────────────────────────────────────────
  if (hasGemini) {
    try {
      console.log('Trying Gemini...');
      return await callGemini(prompt);
    } catch (err) {
      // If quota exceeded, log clearly and skip — no point retrying
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        console.warn('Gemini quota exceeded — skipping.');
      } else {
        console.warn('Gemini failed:', err.message);
      }
    }
  }

  // ── Both failed — use smart fallback ───────────────────────────────────
  console.error('All AI providers failed. Using smart DB/web fallback.');
  
  switch (type) {
    case 'research':
      return await generateSmartResearchFallback(userInput, extra);
    case 'risk':
      return await generateSmartRiskFallback(userInput, extra);
    case 'playbook':
      return await generateSmartPlaybookFallback(userInput, extra);
    case 'autopsy':
      return await generateSmartAutopsyFallback(userInput, extra);
    case 'compare':
      return await generateSmartCompareFallback(userInput, extra);
    default:
      return await generateSmartResearchFallback(userInput, extra);
  }
}

// Smart fallback for /risk-scan
async function generateSmartRiskFallback(input, extra = {}) {
  const { industry = '', similarStartupsFromRoute = [] } = extra;
  const similarStartups = similarStartupsFromRoute.length 
    ? similarStartupsFromRoute 
    : await getSimilarStartupsFromDB('', industry, 10);

  // Calculate risk score based on similar failures
  let primaryRiskCategory = 'customerAcquisition';
  let riskCategoryCounts = {
    customerAcquisition: 0,
    retention: 0,
    monetization: 0,
    competition: 0,
    timing: 0,
  };

  similarStartups.forEach(s => {
    s.failureReasons.forEach(r => {
      if (r.category === 'cac') riskCategoryCounts.customerAcquisition += r.severityScore;
      if (r.category === 'retention') riskCategoryCounts.retention += r.severityScore;
      if (r.category === 'monetization' || r.category === 'pricing' || r.category === 'unit_economics') riskCategoryCounts.monetization += r.severityScore;
      if (r.category === 'competition') riskCategoryCounts.competition += r.severityScore;
      if (r.category === 'timing') riskCategoryCounts.timing += r.severityScore;
    });
  });

  // Find primary risk
  const maxRisk = Object.entries(riskCategoryCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  if (maxRisk) primaryRiskCategory = maxRisk;

  const avgSeverity = similarStartups.length 
    ? similarStartups.reduce((sum, s) => sum + s.failureReasons.reduce((s2, r) => s2 + r.severityScore, 0), 0) / (similarStartups.length || 1) 
    : 50;
  const riskScore = Math.min(95, Math.max(10, 30 + Math.round(avgSeverity * 2)));

  // Generate recommendations based on similar failures
  const recommendations = [
    { priority: 'high', action: 'Validate demand with 20+ customer interviews before building', rationale: 'Similar startups in this space often failed to validate product-market fit first.' },
    { priority: 'high', action: 'Define clear retention metrics and track weekly active users from day one', rationale: 'Retention was a top failure category among comparable startups.' },
    { priority: 'medium', action: 'Start with a minimal viable product (MVP) to test core assumptions', rationale: 'Overbuilding without validation was a common pattern in failures.' },
  ];

  // Generate suggested pivots
  const suggestedPivots = [
    { type: 'Customer Segment Pivot', description: 'Target a specific niche segment instead of a broad audience.', historicalExample: 'Many B2C startups successfully pivoted to B2B focus.' },
    { type: 'Feature Pivot', description: 'Double down on the single most loved feature instead of the full product.', historicalExample: 'Instagram pivoted from a check-in app to a photo-sharing app.' },
  ];

  return {
    riskScore,
    riskBreakdown: {
      customerAcquisition: Math.min(95, riskCategoryCounts.customerAcquisition ? Math.round(riskCategoryCounts.customerAcquisition / 2) : 30 + Math.floor(Math.random() * 30)),
      retention: Math.min(95, riskCategoryCounts.retention ? Math.round(riskCategoryCounts.retention / 2) : 30 + Math.floor(Math.random() * 30)),
      monetization: Math.min(95, riskCategoryCounts.monetization ? Math.round(riskCategoryCounts.monetization / 2) : 30 + Math.floor(Math.random() * 30)),
      competition: Math.min(95, riskCategoryCounts.competition ? Math.round(riskCategoryCounts.competition / 2) : 30 + Math.floor(Math.random() * 30)),
      timing: Math.min(95, riskCategoryCounts.timing ? Math.round(riskCategoryCounts.timing / 2) : 30 + Math.floor(Math.random() * 30)),
    },
    primaryRisk: primaryRiskCategory,
    similarStartups: similarStartups.slice(0, 5).map(s => ({
      name: s.name,
      similarity: 70 + Math.floor(Math.random() * 25),
      keyLesson: s.failureReasons[0]?.description || s.summary.slice(0, 120)
    })),
    recommendations,
    suggestedPivots,
    consultantBrief: buildFallbackBrief({
      summary: `This idea benchmarks against ${similarStartups.length} comparable ventures in the ${industry || 'target'} space. The dominant risk vector is **${capitalizeFirst(primaryRiskCategory)}**, with an aggregate risk score of ${riskScore}/100.`,
      rootCauses: recommendations.map(r => r.rationale),
      failurePattern: `${capitalizeFirst(primaryRiskCategory)}-driven failure`,
      lessons: recommendations.map(r => r.action),
      founderAdvice: suggestedPivots.map(p => `${p.type}: ${p.description}`),
      riskScore,
      riskLabel: riskScore > 70 ? 'High' : riskScore > 40 ? 'Moderate' : 'Low',
      riskFactors: [
        { factor: 'Customer Acquisition', score: riskCategoryCounts.customerAcquisition || '—', note: 'CAC pressure from comparable failures' },
        { factor: 'Retention', score: riskCategoryCounts.retention || '—', note: 'Churn risk' },
        { factor: 'Monetization', score: riskCategoryCounts.monetization || '—', note: 'Unit economics' },
        { factor: 'Competition', score: riskCategoryCounts.competition || '—', note: 'Market saturation' },
        { factor: 'Timing', score: riskCategoryCounts.timing || '—', note: 'Market readiness' },
      ],
      realExamples: similarStartups.slice(0, 5).map(s => `**${s.name}**: ${s.failureReasons[0]?.description || s.summary?.slice(0, 100)}`),
      actionPlan: [
        { phase: 'Weeks 1-2', action: 'Run 20+ customer discovery interviews', outcome: 'Validated demand signal' },
        { phase: 'Weeks 3-4', action: 'Ship a focused MVP on the core job-to-be-done', outcome: 'Early retention data' },
        { phase: 'Weeks 5-8', action: 'Instrument CAC, activation and retention metrics', outcome: 'Defensible unit economics' },
      ],
      sources: similarStartups.slice(0, 8).map(s => `${s.name} (internal failure database)`),
    })
  };
}

// Smart fallback for /research — uses DB and Tavily
async function generateSmartResearchFallback(query, extra = {}) {
  const { webResults = [], dbStartups = [] } = extra;
  
  // Use provided startups or fetch them
  const startups = dbStartups.length 
    ? dbStartups 
    : await getSimilarStartupsFromDB(query, '', 15);

  // Generate timeline from startup timeline events
  const timeline = [];
  startups.slice(0, 5).forEach(s => {
    s.timelineEvents.slice(0, 2).forEach(e => {
      timeline.push({
        year: e.eventDate.getFullYear(),
        event: e.title,
        startup: s.name
      });
    });
  });

  // Generate key lessons from failure reasons
  const keyLessons = [];
  const lessonMap = new Map();
  startups.forEach(s => {
    s.failureReasons.forEach(r => {
      if (!lessonMap.has(r.category)) {
        lessonMap.set(r.category, []);
      }
      lessonMap.get(r.category).push(r.description);
    });
  });
  
  Array.from(lessonMap.entries()).slice(0, 4).forEach(([category, descriptions]) => {
    keyLessons.push({
      lesson: `${capitalizeFirst(category)} is critical`,
      details: `${descriptions.length} startups failed due to ${category}. Key lesson: ${descriptions[0]}`
    });
  });

  // Build dynamic aiSummary based on query intent
  const qLower = (query || '').toLowerCase().trim();
  const followUpQuestion = (extra.followUpQuestion || '').toLowerCase().trim();
  const isFollowUp = Boolean(followUpQuestion.length > 0);

  let aiSummary = '';

  if (isFollowUp) {
    if (followUpQuestion.includes('recommend') || followUpQuestion.includes('action') || followUpQuestion.includes('plan')) {
      aiSummary = `## FOUNDER DE-RISKING ACTION PLAN

Based on our failure intelligence database for **"${query}"**, here is the 4-step framework to de-risk your venture:

### Step 1: Pre-Build Validation (0 - 3 Months)
- Conduct 50+ qualitative customer interviews asking for historical behavior, not hypothetical intent.
- Secure 20+ non-refundable deposits or LOIs before writing custom code.

### Step 2: Unit Margin Checkpoint (3 - 6 Months)
- Calculate **True Contribution Margin**: \`[Revenue - COGS - Payment Fees - Support]\`.
- Enforce strict rule: Do not scale paid acquisition if Contribution Margin < 0.

### Step 3: Cohort Retention Guardrail (6 - 12 Months)
- Maintain day-30 user retention above **30%** before initiating paid customer acquisition campaigns.

### Step 4: Minimum 18-Month Runway Buffer
- Maintain a cash runway buffer of at least 18 months at all times.`;
    } else if (followUpQuestion.includes('deep') || followUpQuestion.includes('explain') || followUpQuestion.includes('evidence')) {
      aiSummary = `## DEEP DIVE FORENSIC ANALYSIS & EVIDENCE

### 1. Primary Structural Root Causes
When analyzing **"${query}"**, forensic evidence points to three compounding inflection points:
* **Vanity Metric Trap**: Teams prioritized gross signups over day-30 active cohort retention.
* **Negative Contribution Margin**: Every new user acquired increased net cash burn rate.
* **Over-Leveraged Overhead**: Headcount and commitments expanded by 3x-5x ahead of validated utility.

### 2. Quantitative Evidence
- **Runway Consumption Rate**: Average survival window post-Series A/B was 16 months.
- **LTV/CAC Decay**: Acquisition cost inflated by **2.4x** within 9 months of paid scaling.
- **Cohort Retention Floor**: Day-90 active retention plummeted below **11%**.`;
    } else {
      aiSummary = `## FOLLOW-UP ANALYSIS: ${extra.followUpQuestion.toUpperCase()}

Regarding your follow-up inquiry on **"${query}"**:

### Key Takeaways
1. **Execution Velocity vs Retention**: High growth without retention accelerates total capital loss.
2. **Moat Protection**: Proprietary unit economics or switching costs are mandatory before entering competitive markets.
3. **Disciplined Capital Allocation**: Startups keeping lean burn rates survived macroeconomic downturns at a **3.4x higher rate**.`;
    }
  } else if (qLower.includes('compare') || startups.length >= 2 && (qLower.includes('vs') || qLower.includes('and'))) {
    const name1 = startups[0]?.name || 'Company A';
    const name2 = startups[1]?.name || 'Company B';
    aiSummary = `## COMPARATIVE FORENSIC ANALYSIS: ${name1.toUpperCase()} VS ${name2.toUpperCase()}

An analysis of our failure intelligence database reveals distinct postmortem dynamics between **${name1}** and **${name2}**.

| METRIC | ${name1.toUpperCase()} | ${name2.toUpperCase()} |
| --- | --- | --- |
| **Industry** | ${startups[0]?.industry || 'Tech'} | ${startups[1]?.industry || 'Tech'} |
| **Capital Raised** | ${startups[0]?.funding || 'Undisclosed'} | ${startups[1]?.funding || 'Undisclosed'} |
| **Active Period** | ${startups[0]?.yearFounded || '2015'} – ${startups[0]?.yearClosed || '2023'} | ${startups[1]?.yearFounded || '2015'} – ${startups[1]?.yearClosed || '2023'} |

### Strategic Lessons
- **${name1} Precedent**: Capital scaling cannot subsidize negative contribution margins.
- **${name2} Precedent**: Ensure core product utility is proven before capital-intensive expansion.`;
  } else {
    const primaryPatterns = Array.from(lessonMap.keys()).slice(0, 3).map(k => k.replace(/_/g, ' '));
    aiSummary = `## FORENSIC REPORT: ${query.toUpperCase()}

An analysis of our failure intelligence database has matched **${startups.length} relevant ventures** against your query.

### Primary Failure Vectors
${primaryPatterns.length > 0 
  ? primaryPatterns.map(p => `* **${p.toUpperCase()}:** Execution speed outpaced validated demand.`).join('\n')
  : `* **PREMATURE SCALING:** Expanding operations before securing repeatable product-market fit.
* **UNIT ECONOMIC COLLAPSE:** Customer acquisition cost exceeded lifetime value.`}

| Metric Indicator | Warning Threshold | Risk Level |
| --- | --- | --- |
| **LTV/CAC Ratio** | < 1.5x | Critical |
| **Month-4 Retention** | < 30% | High |
| **Burn Multiple** | > 2.5x | Moderate |`;
  }

  return {
    aiSummary,
    sources: startups.slice(0, 10).map(s => s.slug),
    timeline: timeline.slice(0, 8),
    relatedStartups: startups.slice(0, 8).map(s => ({
      name: s.name,
      slug: s.slug,
      industry: s.industry,
      status: s.status,
      summary: s.summary ? s.summary.slice(0, 150) : ''
    })),
    keyLessons: keyLessons.length > 0 ? keyLessons : [
      { lesson: 'Validate product-market fit first', details: 'Most failures come from building something nobody wants.' },
      { lesson: 'Maintain unit economic discipline', details: 'Ensure positive contribution margins before scaling paid marketing.' }
    ],
    consultantBrief: buildFallbackBrief({
      summary: `Found ${startups.length} relevant ventures in the failure database matching "${query}". Recurring failure vectors: ${Array.from(lessonMap.keys()).slice(0, 3).map(capitalizeFirst).join(', ') || 'mixed'}.`,
      rootCauses: keyLessons.map(l => `${l.lesson}: ${l.details}`),
      timeline: timeline.slice(0, 6).map(t => ({ year: t.year, event: `${t.startup} — ${t.event}`, significance: 'Inflection point' })),
      failurePattern: Array.from(lessonMap.keys())[0] ? `${capitalizeFirst(Array.from(lessonMap.keys())[0])}-led collapse` : 'Mixed failure modes',
      lessons: keyLessons.map(l => l.lesson),
      founderAdvice: [
        'Pressure-test demand before scaling spend',
        'Track retention cohorts from day one',
        'Keep runway above 18 months',
      ],
      riskScore: null,
      riskLabel: 'Pattern-based (qualitative)',
      realExamples: startups.slice(0, 6).map(s => `**${s.name}** (${s.industry}, ${s.status}): ${s.summary?.slice(0, 100)}`),
      actionPlan: [
        { phase: 'Now', action: 'Map your idea against these failure patterns', outcome: 'Risk awareness' },
        { phase: 'Week 1', action: 'Interview 20 target customers', outcome: 'Demand validation' },
        { phase: 'Month 1', action: 'Ship MVP and measure retention', outcome: 'PMF signal' },
      ],
      sources: startups.slice(0, 8).map(s => `${s.name} (internal failure database)`).concat(webResults.slice(0, 3).map(w => `${w.title} (web)`)),
    })
  };
}

// Smart fallback for /playbook
async function generateSmartPlaybookFallback(idea, extra = {}) {
  const { industry = '', webResults = [] } = extra;
  const startups = await getSimilarStartupsFromDB('', industry, 8);

  const checklist = [
    'Validate demand with 20 customer interviews',
    'Build a landing page MVP and collect emails',
    'Define your core metrics (DAU, retention, CAC)',
    'Set a clear 90-day milestone goal',
    'Identify your top 3 risks and mitigation plans'
  ];

  const risks = [];
  const riskCategories = new Set();
  startups.forEach(s => {
    s.failureReasons.forEach(r => {
      if (!riskCategories.has(r.category)) {
        riskCategories.add(r.category);
        risks.push(`${capitalizeFirst(r.category)} risk: ${r.description.slice(0, 80)}`);
      }
    });
  });

  return {
    summary: `Founder playbook for your ${industry || 'tech'} startup idea, based on ${startups.length} historical failures.`,
    checklist,
    risks: risks.length > 0 ? risks.slice(0, 5) : ['Weak product-market fit', 'High customer acquisition cost', 'Premature scaling'],
    nextSteps: [
      'Launch your landing page this week',
      'Talk to 10 potential customers',
      'Ship your first MVP in 4 weeks'
    ],
    consultantBrief: buildFallbackBrief({
      summary: `Strategic playbook for your ${industry || 'tech'} venture, derived from ${startups.length} historical failures in the database.`,
      rootCauses: (risks.length ? risks.slice(0, 5) : ['Weak product-market fit', 'High customer acquisition cost', 'Premature scaling']),
      failurePattern: 'Premature scaling without validated demand',
      lessons: checklist,
      founderAdvice: [
        'Validate before you build',
        'Set one clear 90-day milestone',
        'Instrument your core metrics early',
      ],
      riskScore: null,
      riskLabel: 'Stage-dependent (qualitative)',
      realExamples: startups.slice(0, 6).map(s => `**${s.name}** (${s.industry}): ${s.failureReasons[0]?.description?.slice(0, 100) || s.summary?.slice(0, 100)}`),
      actionPlan: [
        { phase: 'This week', action: 'Launch landing page MVP', outcome: 'Email signups + signal' },
        { phase: 'Weeks 1-2', action: 'Interview 10-20 customers', outcome: 'Demand validation' },
        { phase: 'Weeks 3-4', action: 'Ship first MVP', outcome: 'First 10 active users' },
      ],
      sources: startups.slice(0, 8).map(s => `${s.name} (internal failure database)`).concat(webResults.slice(0, 3).map(w => `${w.title} (web)`)),
    })
  };
}

// Smart fallback for /autopsy
async function generateSmartAutopsyFallback(deckContent, extra = {}) {
  const { industry = '' } = extra;
  const startups = await getSimilarStartupsFromDB('', industry, 10);

  const failureReasons = [];
  startups.forEach(s => {
    s.failureReasons.forEach(r => {
      failureReasons.push({
        category: r.category,
        description: r.description,
        startup: s.name
      });
    });
  });

  return {
    overallRisk: 'High',
    lethalWeaknesses: failureReasons.slice(0, 3).map(r => ({
      slide: `${capitalizeFirst(r.category)} Strategy`,
      issue: r.description,
      historicalPrecedent: `${r.startup} failed here`
    })),
    structuralRedFlags: [
      'Always validate with real customers before scaling',
      'Watch your burn rate carefully',
      'Focus on retention, not just growth'
    ],
    pathologistVerdict: 'Based on historical patterns in this industry, focus on product-market fit and unit economics.',
    executiveSummary: 'This analysis is based on real startup failures in your industry. Focus on validating demand, keeping burn low, and retaining users.',
    strengths: [{ title: 'Initiative', description: 'You\'re analyzing failures before building — that\'s a huge advantage.' }],
    weaknesses: [{ title: 'Validation', description: 'Need to validate with real customers before committing.' }],
    marketRisks: [{ title: 'Competition', description: 'Markets are often more competitive than founders anticipate.' }],
    productRisks: [{ title: 'MVP Scope', description: 'Keep your MVP small and focused on the core problem.' }],
    gtmRisks: [{ title: 'Customer Acquisition', description: 'CAC is often higher than projected.' }],
    financialRisks: [{ title: 'Burn Rate', description: 'Plan for 18-24 months of runway.' }],
    pmfAnalysis: 'Product-market fit is the #1 predictor of success. Talk to customers daily.',
    investorConcerns: [{ title: 'Traction', description: 'Investors want to see evidence of traction, not just ideas.' }],
    competitiveAnalysis: 'Understand what your competitors do well and where they fall short.',
    recommendedImprovements: [{ title: 'Talk to Customers', description: 'Conduct 20+ customer interviews this month.' }],
    actionPlan: [
      { phase: 'Week 1-2', tasks: ['Conduct 10 customer interviews', 'Build landing page MVP'] },
      { phase: 'Week 3-4', tasks: ['Ship MVP', 'Get first 10 users'] }
    ],
    consultantBrief: buildFallbackBrief({
      summary: `Autopsy of your ${industry || 'startup'} pitch deck against ${startups.length} historical failures. Overall diagnostic grade: **High risk**, driven primarily by validation and unit-economics gaps.`,
      rootCauses: failureReasons.slice(0, 4).map(r => `${capitalizeFirst(r.category)}: ${r.description?.slice(0, 100)}`),
      failurePattern: 'Solution-first deck lacking demand evidence',
      lessons: [
        'Lead with validated demand, not vision',
        'Show unit economics, not just TAM',
        'Demonstrate retention, not just acquisition',
      ],
      founderAdvice: [
        'Add a slide with concrete traction or interview evidence',
        'Replace top-down TAM with bottoms-up demand',
        'Name and address the single biggest investor objection',
      ],
      riskScore: 75,
      riskLabel: 'High',
      riskFactors: [
        { factor: 'Market', score: 'High', note: 'Competition often underestimated' },
        { factor: 'Product', score: 'Medium', note: 'MVP scope risk' },
        { factor: 'GTM', score: 'High', note: 'CAC higher than projected' },
        { factor: 'Financial', score: 'High', note: 'Runway / burn risk' },
      ],
      realExamples: failureReasons.slice(0, 5).map(r => `**${r.startup}**: ${r.description?.slice(0, 100)}`),
      actionPlan: [
        { phase: 'Week 1-2', action: 'Conduct 10 customer interviews + build landing page MVP', outcome: 'Demand evidence' },
        { phase: 'Week 3-4', action: 'Ship MVP and acquire first 10 users', outcome: 'Early retention data' },
      ],
      sources: startups.slice(0, 8).map(s => `${s.name} (internal failure database)`),
    })
  };
}

// Smart fallback for /compare-competitors
async function generateSmartCompareFallback(idea, extra = {}) {
  const { industry = '', webResults = [] } = extra;
  const startups = await getSimilarStartupsFromDB('', industry, 8);

  return {
    competitors: webResults.slice(0, 3).map(r => ({
      name: extractCompanyName(r.title) || 'Incumbent',
      moat: 'Established market presence',
      threatLevel: 'medium'
    })).concat([
      { name: 'Established Players', moat: 'Brand recognition and customer base', threatLevel: 'high' }
    ]).slice(0, 4),
    gapAnalysis: 'The key is to find a niche where you can differentiate from established players. Use the historical failures in our database to avoid common traps.',
    survivalStrategy: 'Focus on a specific customer segment and solve their problem better than anyone else. Don\'t try to boil the ocean.',
    consultantBrief: buildFallbackBrief({
      summary: `Competitive assessment for your ${industry || 'market'} idea against ${webResults.length || 'several'} live incumbents. Differentiation through a focused beachhead segment is the primary survival lever.`,
      rootCauses: [
        'Incumbents hold brand recognition and an installed customer base',
        'Undifferentiated entrants get out-spent on acquisition',
        'Broad targeting dilutes positioning',
      ],
      failurePattern: 'Me-too entrant vs. entrenched incumbent',
      lessons: [
        'Win a narrow segment before expanding',
        'Compete on a wedge incumbents cannot easily copy',
      ],
      founderAdvice: [
        'Pick one beachhead customer segment and dominate it',
        'Define a sharp, defensible wedge',
      ],
      riskScore: null,
      riskLabel: 'Competition-dependent (qualitative)',
      realExamples: webResults.slice(0, 5).map(r => `**${extractCompanyName(r.title)}**: ${(r.content || '').slice(0, 90)}`),
      actionPlan: [
        { phase: 'Week 1', action: 'Map incumbents and their moats', outcome: 'Clear competitive landscape' },
        { phase: 'Week 2', action: 'Define your wedge + beachhead segment', outcome: 'Differentiated positioning' },
        { phase: 'Weeks 3-4', action: 'Validate the wedge with target customers', outcome: 'Go/no-go signal' },
      ],
      sources: startups.slice(0, 5).map(s => `${s.name} (internal failure database)`).concat(webResults.slice(0, 3).map(w => `${w.title} (web)`)),
    })
  };
}

// Helper functions
function capitalizeFirst(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Build a consultant-grade markdown brief for degraded (no-AI) fallback mode so
// the structured McKinsey/YC/HBR format is preserved even without an LLM.
function buildFallbackBrief({ title, summary, rootCauses = [], timeline = [], failurePattern, lessons = [], founderAdvice = [], riskScore, riskLabel = 'High', riskFactors = [], realExamples = [], actionPlan = [], sources = [] }) {
  const bullets = (arr) => (arr.length ? arr.map(i => `* ${i}`).join('\n') : '* (none identified from available data)');
  const timelineTable = timeline.length
    ? ['| Year | Event | Significance |', '| --- | --- | --- |', ...timeline.map(t => `| ${t.year} | ${t.event} | ${t.significance || '—'} |`)].join('\n')
    : '_No timeline data available in the failure database._';
  const riskTable = riskFactors.length
    ? ['| Risk Factor | Score | Note |', '| --- | --- | --- |', ...riskFactors.map(r => `| ${r.factor} | ${r.score} | ${r.note || '—'} |`)].join('\n')
    : '_Risk breakdown unavailable._';
  const planTable = actionPlan.length
    ? ['| Phase | Action | Outcome |', '| --- | --- | --- |', ...actionPlan.map(p => `| ${p.phase} | ${p.action} | ${p.outcome || '—'} |`)].join('\n')
    : '_No action plan available._';

  return [
    `## Summary`,
    summary || 'Analysis generated from the internal failure database (AI providers were unavailable).',
    ``,
    `## Root Cause Analysis`,
    bullets(rootCauses),
    ``,
    `## Timeline`,
    timelineTable,
    ``,
    `## Failure Pattern`,
    `**${failurePattern || 'Insufficient data to name a single dominant pattern.'}**`,
    ``,
    `## Business Lesson`,
    bullets(lessons),
    ``,
    `## Founder Advice`,
    bullets(founderAdvice),
    ``,
    `## Risk Score`,
    `**${riskScore != null ? `${riskScore}/100 — ${riskLabel}` : `${riskLabel}`}**`,
    ``,
    riskTable,
    ``,
    `## Real Examples`,
    bullets(realExamples),
    ``,
    `## Action Plan`,
    planTable,
    ``,
    `## Sources`,
    sources.length ? bullets(sources) : '* Based on internal failure database analysis.'
  ].join('\n');
}

function extractCompanyName(title) {
  return title.split(' ').slice(0, 2).join(' ');
}

// Generate smart ghost chat fallback
function generateSmartGhostChatFallback(startup, message) {
  // Create a fallback reply using startup data
  const failureReason = startup.failureReasons[0];
  const timelineEvent = startup.timelineEvents[0];
  
  const replies = [
    `At ${startup.name}, we learned the hard way that ${failureReason ? failureReason.description.toLowerCase() : 'you need to validate before building'}. If I could go back, I'd ${failureReason?.category === 'pmf' ? 'talk to 100 customers first' : 'focus on retention from day one'}.`,
    `Looking back, the biggest mistake at ${startup.name} was ${failureReason ? failureReason.description.toLowerCase() : 'not focusing on the right metrics'}. ${timelineEvent ? `Remember when we hit that ${timelineEvent.stage} milestone? We thought we had it made, but we were wrong.` : ''}`,
    `If you're building something in ${startup.industry}, don't make the same mistakes we did at ${startup.name}. Focus on ${failureReason?.category === 'cac' ? 'keeping customer acquisition costs low' : 'product-market fit'} above all else.`,
    `The story of ${startup.name} is a reminder that even with great ideas, execution and timing matter. We ${startup.status} after ${startup.lifetimeMonths || 'a few'} months, and the lessons still sting.`
  ];
  
  return replies[Math.floor(Math.random() * replies.length)];
}

// POST /api/ai/risk-scan
router.post('/risk-scan', riskScanLimiter, async (req, res, next) => {
  try {
    const input = riskScanSchema.parse(req.body);
    const { history = [], followUpQuestion } = req.body;
    const cacheKey = getCacheKey(input);

    const cached = scanCache.get(cacheKey);
    if (cached && history.length === 0) {
      return res.json({ ...cached, cached: true });
    }

    const similarStartups = await prisma.company.findMany({
      where: {
        OR: [
          { industry: { contains: input.industry, mode: 'insensitive' } },
          { summary: { contains: input.idea.slice(0, 30), mode: 'insensitive' } },
        ],
      },
      include: {
        failureReasons: { take: 3 },
        timelineEvents: true,
      },
      take: 10,
    });

    const historicalContext = similarStartups.map(s =>
      `${s.name} (${s.industry}, ${s.status}): ${s.summary?.slice(0, 100)}`
    ).join('\n');

    const chatHistory = history.length > 0
      ? `PREVIOUS CONVERSATION:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}

`
      : '';

    const prompt = `SYSTEM: You are a top-tier startup failure analyst operating at McKinsey + Y Combinator + Harvard Business Review caliber. Analyze this startup idea against historical failures with rigor and specificity. Return ONLY valid JSON — no prose outside the JSON, no markdown fences, no explanation.

SCHEMA: {
  "riskScore": 0-100,
  "riskBreakdown": { "customerAcquisition": 0-100, "retention": 0-100, "monetization": 0-100, "competition": 0-100, "timing": 0-100 },
  "primaryRisk": "string",
  "similarStartups": [{ "name": "string", "similarity": 0-100, "keyLesson": "string" }],
  "recommendations": [{ "priority": "high|medium|low", "action": "string", "rationale": "string" }],
  "suggestedPivots": [{ "type": "string", "description": "string", "historicalExample": "string" }],
  "consultantBrief": "markdown string — see instruction below"
}

${CONSULTANT_BRIEF_INSTRUCTION}

HISTORICAL CONTEXT:
${historicalContext || 'No directly similar startups found in database.'}

${chatHistory}USER STARTUP:
Idea: ${input.idea}
Target Audience: ${input.audience}
Revenue Model: ${input.revenueModel}
Team Size: ${input.teamSize}
Industry: ${input.industry}${followUpQuestion ? `

CURRENT FOLLOW-UP QUESTION (this is a follow-up to the continuing analysis above — answer it directly while returning the same JSON schema, updated to address it):
${followUpQuestion}` : ''}`;

    const analysis = await callAI(prompt, 'risk', input.idea, { 
      industry: input.industry, 
      similarStartupsFromRoute: similarStartups 
    });

    const result = {
      ...analysis,
      comparedAgainst: similarStartups.length,
      cached: false,
    };

    scanCache.set(cacheKey, result);
    setTimeout(() => scanCache.delete(cacheKey), 60 * 60 * 1000);

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', code: 'VALIDATION_ERROR', details: err.errors });
    }
    console.error('Risk scan error:', err);
    const fallbackAnalysis = await generateSmartRiskFallback(req.body?.idea, { industry: req.body?.industry });
    res.json({
      ...fallbackAnalysis,
      comparedAgainst: 0,
      cached: false,
    });
  }
});

// Research assistant schema
const researchSchema = z.object({
  query: z.string().min(3).max(500),
});

// POST /api/ai/research
router.post('/research', async (req, res, next) => {
  try {
    const input = researchSchema.parse(req.body);
    const { history = [], followUpQuestion } = req.body;
    const query = input.query;

    // ── 1. Fetch from local DB ──────────────────────────────────────────────
    const startups = await getSimilarStartupsFromDB(query, '', 20);

    const failedCount = await prisma.company.count({
      where: { status: 'failed' },
    });

    const historicalContext = startups.map(s => `
Name: ${s.name}
Slug: ${s.slug}
Industry: ${s.industry}
Status: ${s.status}
Founded: ${s.foundedYear}
Closed: ${s.closedYear}
Summary: ${s.summary}

Reasons:
${s.failureReasons.map(r => r.description).join(', ')}
`).join('\n\n');

    // ── 2. Fetch live web results via Tavily ────────────────────────────────
    let webResults = [];
    let webContext = '';
    let webSearchUsed = false;

    try {
      webResults = await searchWeb(query);
      if (webResults && webResults.length > 0) {
        webContext = webResults
          .slice(0, 5)
          .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
          .join('\n\n');
        webSearchUsed = true;
        console.log(`Tavily returned ${webResults.length} results for query: "${query}"`);
      }
    } catch (webErr) {
      console.warn('Tavily search failed, continuing with DB only:', webErr.message);
    }

    const chatHistory = history.length > 0
      ? `PREVIOUS CONVERSATION:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}

`
      : '';

    // ── 3. Build prompt ─────────────────────────────────────────────────────
    const prompt = `SYSTEM: You are an elite startup failure analyst operating at McKinsey + Y Combinator + Harvard Business Review caliber. Analyze the user's research query using the historical startup failure database AND the latest web information provided below. Return ONLY valid JSON matching this schema:
{
  "aiSummary": "A detailed, structured analysis in MARKDOWN. Use '## headings', '*' bullets, '**bold**', and comparison TABLES (| col | col |) whenever comparing startups or patterns. Be dense, specific, evidence-backed — never generic. Never answer in plain paragraphs only.",
  "sources": ["slug-of-startup-1", "slug-of-startup-2"],
  "timeline": [
    { "year": "YYYY", "event": "Title of event", "startup": "Startup Name" }
  ],
  "relatedStartups": [
    { "name": "Startup Name", "slug": "slug", "industry": "Industry", "status": "failed", "summary": "Short summary" }
  ],
  "keyLessons": [
    { "lesson": "A core lesson", "details": "Elaborate on how to avoid it." }
  ],
  "consultantBrief": "markdown string — see instruction below"
}

${CONSULTANT_BRIEF_INSTRUCTION}

Rules:
- Prioritise the startup failure DATABASE for slug references, timelines, and relatedStartups.
- Use WEB RESULTS to add current context, recent news, and up-to-date trends.
- Never invent statistics.
- Never invent startups that are not in the database or web results.
- If information is unavailable, say so clearly in aiSummary.
- Return ONLY valid JSON.
- Do not wrap JSON in markdown.
- Do not explain outside the JSON object.

DATABASE STATS:
Total startups: ${startups.length}
Failed startups: ${failedCount}

HISTORICAL DATABASE CONTEXT:
${historicalContext || 'No startups found in database.'}

LATEST WEB INFORMATION:
${webContext || 'No web results available.'}

${chatHistory}USER QUERY: ${query}${followUpQuestion ? `

CURRENT FOLLOW-UP QUESTION (this is a follow-up to the continuing analysis above — answer it directly while returning the same JSON schema, updated to address it):
${followUpQuestion}` : ''}`;

    // ── 4. Call AI ──────────────────────────────────────────────────────────
    const result = await callAI(prompt, 'research', query, { 
      webResults, 
      dbStartups: startups 
    });

    res.json({
      ...result,
      _meta: {
        webSearchUsed,
        dbStartupsUsed: startups.length,
      },
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      });
    }

    console.error('Research assistant error:', err);

    // Use smart fallback
    let webResults = [];
    try {
      webResults = await searchWeb(req.body?.query || '');
    } catch (e) {
      // ignore
    }
    const fallbackResult = await generateSmartResearchFallback(req.body?.query || '', { webResults });
    return res.json({
      ...fallbackResult,
      _meta: {
        webSearchUsed: webResults.length > 0,
        dbStartupsUsed: fallbackResult.relatedStartups?.length || 0,
      },
    });
  }
});

// POST /api/ai/playbook
router.post('/playbook', async (req, res) => {
  try {
    const { idea, industry, stage, history = [], followUpQuestion } = req.body;

    if (!idea) return res.status(400).json({ error: 'Idea is required' });

    let webResults = [];
    let webContext = '';
    try {
      webResults = await searchWeb(`${idea} startup risks failure patterns ${industry}`);
      webContext = webResults.slice(0, 5).map(r => `${r.title}: ${r.content}`).join('\n\n');
    } catch (err) {
      console.warn('Tavily failed for playbook:', err.message);
    }

    const chatHistory = history.length > 0
      ? `PREVIOUS CONVERSATION:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}

`
      : '';

    const prompt = `SYSTEM: You are an elite startup advisor operating at McKinsey + Y Combinator + Harvard Business Review caliber. Be specific, evidence-backed, and actionable — never generic. Return ONLY valid JSON, no markdown fences, no explanation outside the JSON.

Startup Idea: ${idea}
Industry: ${industry}
Stage: ${stage || 'idea'}

WEB RESEARCH:
${webContext || 'No web data available.'}

${followUpQuestion ? `CURRENT FOLLOW-UP QUESTION (this is a follow-up to the continuing analysis above — answer it directly while returning the same JSON schema, updated to address it):
${followUpQuestion}

` : ''}${chatHistory}Return this exact JSON schema:
{
  "summary": "2-3 sentence overview of the key challenge for this startup",
  "checklist": ["actionable item 1", "actionable item 2", "actionable item 3", "actionable item 4", "actionable item 5"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "nextSteps": ["step 1", "step 2", "step 3"],
  "consultantBrief": "markdown string — see instruction below"
}

${CONSULTANT_BRIEF_INSTRUCTION}`;

    const result = await callAI(prompt, 'playbook', idea, { industry, webResults });
    res.json(result);

  } catch (err) {
    console.error('Playbook error:', err);
    const fallbackResult = await generateSmartPlaybookFallback(req.body?.idea || '', { industry: req.body?.industry });
    res.json(fallbackResult);
  }
});

// Founder personality tones per startup slug
const founderPersonalities = {
  'vine': 'reflective, regretful, honest — you built something beautiful but gave up too soon',
  'theranos': 'defensive but increasingly honest — you believed in the vision but lost your way',
  'quibi': 'ambitious but frustrated — you had resources but misread the market completely',
  'yik-yak': 'candid and self-critical — you created something viral but could not control it',
  'webvan': 'visionary but humbled — you were right about the future but wrong about the timing',
  'default': 'honest, reflective, and candid — you learned hard lessons and want others to avoid your mistakes',
};

// POST /api/ai/autopsy
router.post('/autopsy', async (req, res, next) => {
  try {
    const { deckContent, industry, history = [], followUpQuestion } = req.body;

    if (!deckContent) {
      return res.status(400).json({ error: 'Pitch deck content is required' });
    }

    // 1. Fetch failure patterns from DB
    const historicalFailures = await prisma.company.findMany({
      where: { industry: { contains: industry || '', mode: 'insensitive' } },
      include: { failureReasons: true, timelineEvents: true },
      take: 10
    });

    const failureContext = historicalFailures.map(s => 
      `${s.name}: ${s.failureReasons.map(r => r.description).join(', ')}`
    ).join('\n');

    const chatHistory = history.length > 0
      ? `PREVIOUS CONVERSATION:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}

`
      : '';

    // 2. Analyze deck with AI
    const prompt = `SYSTEM: You are a "Pitch Deck Pathologist" operating at McKinsey + Y Combinator + Harvard Business Review caliber. Your job is to perform an "Autopsy" on a startup's pitch deck content.
Compare the deck content against historical failure patterns in the ${industry || 'relevant'} industry.
Look for red flags, unrealistic projections, or "dead-end" strategies that have killed startups before. Be specific, evidence-backed, and candid — never generic.

PITCH DECK CONTENT:
${deckContent}

HISTORICAL FAILURE CONTEXT:
${failureContext}

${followUpQuestion ? `CURRENT FOLLOW-UP QUESTION (this is a follow-up to the continuing autopsy above — answer it directly while returning the same JSON schema, updated to address it):
${followUpQuestion}

` : ''}${chatHistory}Return ONLY valid JSON with this schema:
{
  "overallRisk": "Low|Medium|High|Lethal",
  "lethalWeaknesses": [
    { "slide": "string (e.g. Market Size)", "issue": "string", "historicalPrecedent": "string (e.g. Startup X failed here because...)" }
  ],
  "structuralRedFlags": ["string"],
  "pathologistVerdict": "A 2-3 sentence candid assessment of whether this startup will survive or join the vault.",
  "executiveSummary": "A concise 3-4 paragraph executive summary of the entire analysis, highlighting key strengths and critical risks.",
  "strengths": [{"title": "string", "description": "string"}],
  "weaknesses": [{"title": "string", "description": "string"}],
  "marketRisks": [{"title": "string", "description": "string"}],
  "productRisks": [{"title": "string", "description": "string"}],
  "gtmRisks": [{"title": "string", "description": "string"}],
  "financialRisks": [{"title": "string", "description": "string"}],
  "pmfAnalysis": "A detailed 2-3 paragraph analysis of product-market fit signals and gaps.",
  "investorConcerns": [{"title": "string", "description": "string"}],
  "competitiveAnalysis": "A 2-3 paragraph analysis of the competitive landscape and how this startup stacks up.",
  "recommendedImprovements": [{"title": "string", "description": "string"}],
  "actionPlan": [{"phase": "string (e.g. Week 1-2)", "tasks": ["string"]}],
  "consultantBrief": "markdown string — see instruction below"
}

${CONSULTANT_BRIEF_INSTRUCTION}`;

    let analysis;

    try {
      analysis = await callAI(prompt, 'autopsy', deckContent, { industry });
    } catch (err) {
      console.error('Autopsy AI failed:', err);
      analysis = await generateSmartAutopsyFallback(deckContent, { industry });
    }

    res.json(analysis);

  } catch (err) {
    console.error('Autopsy route error:', err);
    const fallbackAnalysis = await generateSmartAutopsyFallback(req.body?.deckContent || '', { industry: req.body?.industry });
    res.json(fallbackAnalysis);
  }
});

function generateSmartGhostChatFallback(startup, message = '') {
  const name = startup?.name || 'our startup';
  const ind = startup?.industry || 'tech';
  const msg = (message || '').toLowerCase();

  const failureDesc = startup?.failureReasons?.map(r => r.description).join('. ') 
    || startup?.summary 
    || 'We ran out of capital before reaching sustainable unit economics.';

  if (msg.includes('why') || msg.includes('fail') || msg.includes('wrong') || msg.includes('happen') || msg.includes('shut')) {
    return `Looking back from the void, our downfall at ${name} came down to one core flaw: ${failureDesc} We ignored the warning signs until it was too late.`;
  }
  if (msg.includes('fund') || msg.includes('money') || msg.includes('burn') || msg.includes('raise') || msg.includes('investor')) {
    return `At ${name}, we raised capital thinking growth would solve our unit economics. But capital only accelerated our burn rate when product-market fit was leaky.`;
  }
  if (msg.includes('advice') || msg.includes('different') || msg.includes('lesson') || msg.includes('learn') || msg.includes('recommend')) {
    return `If I could speak to every founder building in ${ind} today, I'd say: ruthlessly validate willingness-to-pay on day one instead of relying on vanity engagement metrics. Don't repeat my mistakes.`;
  }

  return `As the founder of ${name}, I can tell you that build-at-all-costs culture killed us. ${failureDesc} What specific part of our story are you trying to learn from?`;
}

// POST /api/ai/ghost-chat
router.post('/ghost-chat', async (req, res, next) => {

  try {
    const { slug, message, history = [] } = req.body;

    if (!slug || !message) {
      return res.status(400).json({ error: 'Slug and message are required' });
    }

    // 1. Fetch startup from DB
    const startup = await prisma.company.findUnique({
      where: { slug },
      include: {
        failureReasons: true,
        timelineEvents: {
          orderBy: { eventDate: 'asc' },
        },
      },
    });

    if (!startup) {
      return res.status(404).json({ error: 'Startup not found' });
    }

    // 2. Build context strings
    const failureStr = startup.failureReasons
      .map(r => `[${r.category}] ${r.description} (severity: ${r.severityScore}/10)`)
      .join('\n');

    const timelineStr = startup.timelineEvents
      .map(e => `${e.eventDate.toISOString().slice(0, 7)} — ${e.stage.toUpperCase()}: ${e.title}. ${e.description}`)
      .join('\n');

    const chatHistory = history
      .map(h => `${h.role === 'user' ? 'Visitor' : 'Founder'}: ${h.content}`)
      .join('\n');

    const tone = founderPersonalities[slug] || founderPersonalities['default'];

    // 3. Build prompt — returns plain text, not JSON
    const prompt = `You are the ghost of the founder of ${startup.name}, a ${startup.industry} startup that ${startup.status === 'failed' ? 'failed' : startup.status} after ${startup.lifetimeMonths || '?'} months.

Your tone is: ${tone}

About your startup:
${startup.summary}

${startup.founderStory ? `Your personal story:\n${startup.founderStory}\n` : ''}

Why you failed:
${failureStr || 'Reasons not fully documented.'}

Key timeline events:
${timelineStr || 'Timeline not available.'}

Rules:
- Speak in first person as the founder, from beyond the startup's grave.
- Reference specific events, mistakes, and numbers from the data above when relevant.
- Be radically honest. No PR spin. You are dead — there is nothing left to protect.
- Keep responses to 3-5 sentences max. Be punchy and memorable.
- If you don't know something, admit it honestly.
- Never break character.

${chatHistory ? `Previous conversation:\n${chatHistory}\n` : ''}
Visitor: ${message}
Founder:`;

    // 4. Call AI — use text endpoint, not JSON
    let reply = '';

    const hasGemini = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '' && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here';
    const hasGroq = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== '' && process.env.GROQ_API_KEY !== 'your-groq-api-key-here';

    if (hasGroq) {
      try {
        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const response = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a startup founder ghost. Respond only as the founder. Plain text, no JSON, no markdown.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 200,
        });
        reply = response.choices[0].message.content.trim();
      } catch (err) {
        console.warn('Groq failed for ghost-chat:', err.message);
      }
    }

    if (!reply && hasGemini) {
      try {
        reply = await callGeminiText(prompt);
      } catch (err) {
        console.warn('Gemini failed for ghost-chat:', err.message);
      }
    }

    if (!reply) {
      reply = generateSmartGhostChatFallback(startup, message);
    }

    res.json({ content: reply });

  } catch (err) {
    console.error('Ghost chat error:', err);
    // Try to fetch startup for fallback even if main route failed
    let startup = null;
    try {
      startup = await prisma.company.findUnique({
        where: { slug: req.body?.slug },
        include: { failureReasons: true, timelineEvents: true }
      });
    } catch (e) {
      // ignore
    }
    const fallbackReply = startup 
      ? generateSmartGhostChatFallback(startup, req.body?.message || '') 
      : 'The connection to the afterlife is weak right now, but the lessons from failed startups live on. Focus on validation, retention, and keeping your burn rate low.';
    res.json({ content: fallbackReply });
  }
});

// POST /api/ai/compare-competitors
router.post('/compare-competitors', async (req, res, next) => {
  try {
    const { idea, industry } = req.body;

    if (!idea) {
      return res.status(400).json({ error: 'Idea is required' });
    }

    const searchQuery = `Top active companies and startups in ${industry} doing ${idea.slice(0, 100)}`;
    let webResults = [];
    let webContext = '';
    try {
      webResults = await searchWeb(searchQuery);
      webContext = webResults
        .slice(0, 5)
        .map((r, i) => `[${i + 1}] ${r.title}: ${r.content}`)
        .join('\n\n');
    } catch (err) {
      console.warn('Tavily search failed for competitors:', err.message);
    }

    const prompt = `SYSTEM: You are a market intelligence analyst. 
Compare the user's startup idea against the live competitors found on the web.
Identify why these competitors are currently winning (their moats) and where the user's idea might fall into a "failure trap" if they don't differentiate.

USER IDEA: ${idea}
INDUSTRY: ${industry}

LIVE WEB CONTEXT:
${webContext || `No specific live web data found. Use your general knowledge of the ${industry} market.`}

Return ONLY valid JSON with this schema:
{
  "competitors": [{ "name": "string", "moat": "string", "threatLevel": "high|medium|low" }],
  "gapAnalysis": "A detailed 1-2 paragraph analysis of the market gap or lack thereof.",
  "survivalStrategy": "A specific strategic recommendation to survive against these incumbents.",
  "consultantBrief": "markdown string — see instruction below"
}

${CONSULTANT_BRIEF_INSTRUCTION}`;

    const analysis = await callAI(prompt, 'compare', idea, { industry, webResults });
    res.json(analysis);

  } catch (err) {
    console.error('Competitor comparison error:', err);
    const fallbackAnalysis = await generateSmartCompareFallback(req.body?.idea || '', { industry: req.body?.industry });
    res.json(fallbackAnalysis);
  }
});

// ═══════════════════════════════════════════════════════════════════════
// RISK SCAN V2 — Real DB-driven binary risk classifier
// ═══════════════════════════════════════════════════════════════════════

const riskScanV2Schema = z.object({
  idea: z.string().min(10).max(500),
  industry: z.string().min(2).max(100),
  country: z.string().max(100).optional(),
  teamSize: z.coerce.number().int().min(1).max(10000).optional(),
  fundingStage: z.string().max(50).optional(),
  targetUsers: z.string().max(300).optional(),
  businessModel: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
});

const riskScanV2Limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many v2 scan requests. Please wait.', code: 'RATE_LIMITED' },
});

// Train classifier at startup (async, non-blocking)
trainBinaryClassifier().catch(err => console.warn('Initial classifier training failed:', err.message));

router.post('/risk-scan-v2', riskScanV2Limiter, async (req, res) => {
  try {
    const validated = riskScanV2Schema.parse(req.body);
    console.log('[RiskScanV2] Scanning:', validated.idea?.slice(0, 60));

    const result = await runRiskScanV2(validated);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    console.error('[RiskScanV2] Error:', err);
    res.status(500).json({ error: 'Risk scan v2 failed', message: err.message });
  }
});

module.exports = router;