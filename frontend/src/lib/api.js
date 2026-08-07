import axios from 'axios';
import {
  mockStartups,
  mockRiskScan,
  mockAiResponse,
  mockPlaybook,
  mockPitchDeckAutopsy,
  getStartupBySlug,
  generateMockExternalSources,
  generateDynamicAiResearch,
  generateDynamicRiskScan,
  generateDynamicAutopsy
} from './mockApi';
import { getMockSecDashboard, mockSecLookup } from './secDashboardMock';
import { getRandomQuestions } from './quizData';

export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const TOKEN_KEY = 'pivotvault-token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

const realApi = axios.create({ baseURL: `${API_URL}/api` });

// Attach Bearer token on every request
realApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mock API handler
const mockApiHandler = async (config) => {
  const { method, url, data } = config;

  // Mock /auth endpoints — keeps login/signup working in DEMO_MODE or when the
  // backend is unreachable (e.g. a cold-started host). Without this, a failed
  // /auth/login falls through to the default { success: true } response, which
  // has no token/user, so the user is silently bounced back by ProtectedRoute.
  if (url.includes('/auth')) {
    const demoUser = {
      id: 'demo-user',
      name: 'Demo Founder',
      email: 'founder@pivotvault.demo',
    };
    if (url.includes('/auth/me')) {
      return { data: { user: demoUser } };
    }
    const body = data || {};
    const email = body.email || demoUser.email;
    const name = body.name || (email.includes('@') ? email.split('@')[0] : 'Founder');
    return {
      data: {
        token: 'demo-token',
        user: { ...demoUser, name, email },
      },
    };
  }

  // Mock /quiz endpoint
  if (url.includes('/quiz')) {
    // Parse query parameters
    const urlObj = new URL(url, 'http://localhost');
    const count = parseInt(urlObj.searchParams.get('count')) || 5;
    const difficulty = urlObj.searchParams.get('difficulty') || 'mixed';
    return {
      data: {
        questions: getRandomQuestions(count, difficulty)
      }
    };
  }

  // Mock /startups endpoint
  if (url.includes('/startups')) {
    // Check for external-research endpoint
    const researchMatch = url.match(/\/startups\/([^/?#]+)\/external-research/);
    if (researchMatch) {
      const slug = researchMatch[1];
      const startup = getStartupBySlug(slug);
      return {
        data: {
          sources: generateMockExternalSources(startup.name)
        }
      };
    }

    // Check if it's a single startup request (has slug)
    const match = url.match(/\/startups\/([^/?#]+)/);
    if (match) {
      const slug = match[1];
      return {
        data: getStartupBySlug(slug)
      };
    }

    return {
      data: {
        data: mockStartups,
        total: mockStartups.length,
        startups: mockStartups
      }
    };
  }

  // Mock /ai/risk-scan endpoint
  if (url.includes('/ai/risk-scan')) {
    let body = {};
    try {
      body = typeof data === 'string' ? JSON.parse(data) : (data || {});
    } catch {}
    return { data: generateDynamicRiskScan(body) };
  }

  // Mock /ai/research endpoint
  if (url.includes('/ai/research')) {
    return { data: mockAiResponse };
  }

  // Mock /ai/playbook endpoint
  if (url.includes('/ai/playbook')) {
    return { data: mockPlaybook };
  }

  // Mock /ai/autopsy endpoint
  if (url.includes('/ai/autopsy')) {
    let body = {};
    try {
      body = typeof data === 'string' ? JSON.parse(data) : (data || {});
    } catch {}
    return { data: generateDynamicAutopsy(body) };
  }

  // Mock /insights endpoint
  if (url.includes('/insights')) {
    return {
      data: {
        metrics: {
          totalFailed: 12437,
          totalFundingLost: '145250000000',
          mostCommonReason: 'pmf',
          fastestCollapse: 'Quibi (6 months)',
          industryRiskScore: 78
        },
        industryBreakdown: [
          { industry: 'E-Commerce', count: 2800 },
          { industry: 'FinTech', count: 2200 },
          { industry: 'Health Tech', count: 1800 },
          { industry: 'SaaS', count: 1500 }
        ],
        topFailureReasonsByIndustry: [
          { category: 'No PMF', count: 4500 },
          { category: 'Unit Economics', count: 2800 },
          { category: 'Cash Burn', count: 2100 },
          { category: 'Competition', count: 1500 }
        ],
        yearlyTrends: [
          { year: 2019, count: 1800 },
          { year: 2020, count: 2500 },
          { year: 2021, count: 2200 },
          { year: 2022, count: 1900 },
          { year: 2023, count: 1700 }
        ],
        topViewed: mockStartups,
        deathZones: [
          { industry: 'Grocery & Delivery', riskLevel: 'extreme', deathCount: 840, avgLifespan: 18, reason: 'High customer acquisition and delivery costs.' },
          { industry: 'FinTech', riskLevel: 'critical', deathCount: 710, avgLifespan: 24, reason: 'Regulatory hurdles and competition.' }
        ]
      }
    };
  }

  // Mock /graph/data endpoint
  if (url.includes('/graph/data')) {
    return {
      data: {
        nodes: [
          { id: 'juicero', label: 'Juicero', type: 'COMPANY', slug: 'juicero', industry: 'Consumer Hardware', status: 'failed', group: 1 },
          { id: 'theranos', label: 'Theranos', type: 'COMPANY', slug: 'theranos', industry: 'Health Tech', status: 'failed', group: 1 },
          { id: 'wework', label: 'WeWork', type: 'COMPANY', slug: 'wework', industry: 'Real Estate', status: 'failed', group: 1 },
          { id: 'quibi', label: 'Quibi', type: 'COMPANY', slug: 'quibi', industry: 'Media / Entertainment', status: 'failed', group: 1 },
          { id: 'hardware', label: 'Consumer Hardware', type: 'INDUSTRY', group: 2 },
          { id: 'healthtech', label: 'Health Tech', type: 'INDUSTRY', group: 2 },
          { id: 'realestate', label: 'Real Estate', type: 'INDUSTRY', group: 2 },
          { id: 'media', label: 'Media / Entertainment', type: 'INDUSTRY', group: 2 },
          { id: 'pmf', label: 'No PMF', type: 'FAILURE_PATTERN', group: 9 },
          { id: 'unit_economics', label: 'Unit Economics', type: 'FAILURE_PATTERN', group: 9 },
          { id: 'cash_burn', label: 'Fatal Cash Burn', type: 'FAILURE_PATTERN', group: 9 }
        ],
        links: [
          { source: 'juicero', target: 'hardware', value: 2 },
          { source: 'juicero', target: 'unit_economics', value: 3 },
          { source: 'theranos', target: 'healthtech', value: 2 },
          { source: 'theranos', target: 'pmf', value: 3 },
          { source: 'wework', target: 'realestate', value: 2 },
          { source: 'wework', target: 'cash_burn', value: 3 },
          { source: 'quibi', target: 'media', value: 2 },
          { source: 'quibi', target: 'pmf', value: 3 }
        ]
      }
    };
  }

  // Mock /sec endpoints (Financial Intelligence dashboard)
  if (url.includes('/sec/dashboard')) {
    const urlObj = new URL(url, 'http://localhost');
    const ciks = urlObj.searchParams.get('ciks') || urlObj.searchParams.get('compare') || 'AAPL,MSFT';
    const ids = ciks.split(',').map((s) => s.trim()).filter(Boolean);
    return { data: getMockSecDashboard(ids) };
  }
  if (url.includes('/sec/lookup')) {
    const urlObj = new URL(url, 'http://localhost');
    const q = urlObj.searchParams.get('q') || '';
    const matches = mockSecLookup(q);
    if (matches.length === 1) return { data: matches[0] };
    return { data: { matches } };
  }

  if (url.includes('/companies/search')) {
    const urlObj = new URL(url, 'http://localhost');
    const q = urlObj.searchParams.get('q') || 'Tesla';
    const dashboard = getMockSecDashboard([q, 'MSFT']);
    const primary = dashboard.companies[0];
    return {
      data: {
        found: true,
        cached: true,
        status: 'READY',
        companyId: primary.company.id,
        slug: primary.company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        profile: {
          company: primary.company,
          revenue: primary.keyMetrics?.revenue,
          cash: primary.keyMetrics?.cash,
          financialHealth: primary.intelligence?.scores,
          riskFactors: primary.riskFactors?.topRisks,
          timeline: primary.timeline,
          lessons: primary.founderInsights,
          cachedAt: new Date().toISOString(),
        },
        job: {
          id: 'demo-import-job',
          status: 'READY',
          progress: [
            { step: 'searching_sec', message: 'Searching SEC...', at: new Date().toISOString() },
            { step: 'complete', message: 'Complete.', at: new Date().toISOString() },
          ],
        },
      },
    };
  }

  if (url.includes('/companies/status/')) {
    return {
      data: {
        id: 'demo-import-job',
        status: 'READY',
        currentStep: 'complete',
        progress: [{ step: 'complete', message: 'Complete.', at: new Date().toISOString() }],
      },
    };
  }

  if (url.includes('/companies/import')) {
    return mockApiHandler({ method: 'get', url: '/companies/search?q=Tesla' });
  }

  // Default mock response
  return { data: { success: true } };
};

// Create a wrapper that tries real API first, falls back to mock
const api = {
  async get(url, config = {}) {
    if (DEMO_MODE) {
      return mockApiHandler({ method: 'get', url, ...config });
    }
    try {
      return await realApi.get(url, config);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Backend unavailable, using mock data:', err);
      return mockApiHandler({ method: 'get', url, ...config });
    }
  },
  async post(url, data, config = {}) {
    if (DEMO_MODE) {
      return mockApiHandler({ method: 'post', url, data, ...config });
    }
    try {
      return await realApi.post(url, data, config);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Backend unavailable, using mock data:', err);
      return mockApiHandler({ method: 'post', url, data, ...config });
    }
  },
  async put(url, data, config = {}) {
    if (DEMO_MODE) {
      return mockApiHandler({ method: 'put', url, data, ...config });
    }
    try {
      return await realApi.put(url, data, config);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Backend unavailable, using mock data:', err);
      return mockApiHandler({ method: 'put', url, data, ...config });
    }
  },
  async delete(url, config = {}) {
    if (DEMO_MODE) {
      return mockApiHandler({ method: 'delete', url, ...config });
    }
    try {
      return await realApi.delete(url, config);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Backend unavailable, using mock data:', err);
      return mockApiHandler({ method: 'delete', url, ...config });
    }
  }
};

// Broadcast 401s so AuthContext can log the user out
realApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('pv-unauthorized'));
    }
    return Promise.reject(err);
  }
);

export default api;
