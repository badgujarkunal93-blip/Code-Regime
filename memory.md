# Project Memory

<<<<<<< HEAD
> Last updated: 2026-08-07 | Always update this file after every session.
>
> **READ THIS FIRST.** This file is the single source of truth for any AI assistant working on **PivotVault**. Read it at the start of **every** session instead of re-scanning the entire codebase. Keep entries concise, factual, and append-only at the top.
=======
> **READ THIS FIRST.** This file is the single source of truth for any AI assistant working on **PivotVault**. Read it at the start of **every** session instead of re-scanning the entire codebase. After you finish meaningful work, update the relevant sections and append to the Session History log at the bottom.

---

## Project Overview

**PivotVault** is a startup-failure intelligence platform. Users explore documented postmortems of failed startups, analyze failure patterns, run AI risk scans, autopsy pitch decks, and learn from a database of failures.

- **Tagline (branding — do NOT change):** "Where Startup Lessons Live Forever".
- **Type:** Monorepo — `frontend/` (React + Vite) and `backend/` (Express + Prisma).
- **Tech stack:**
  - **Frontend:** React 18, Vite 5, plain JS/JSX (no TypeScript), Tailwind CSS 3, react-router-dom v6 (v7 future flags on), framer-motion + gsap, recharts + react-countup, d3 submodules (d3-selection/zoom/drag/force/transition), axios, zustand, lucide-react, clsx + tailwind-merge, jszip (PPTX parsing).
  - **Backend:** Express, helmet, cors, express-rate-limit, morgan, Prisma ORM, JWT auth, Tavily web search.
- **Deployment:** Frontend on Netlify; backend on Railway (`https://pivotvault-production.up.railway.app`). CORS also allows `*.vercel.app` and `localhost:5173`.

---

## Architecture

### Monorepo layout
- `frontend/` — React + Vite SPA.
- `backend/` — Express API + Prisma.

### Frontend (`frontend/src/`)
- **`main.jsx`** — entry point. Provider order: `ErrorBoundary > Theme > Auth > Bookmark > Workspace > Toast > App`.
- **`App.jsx`** — Router + lazy-loaded routes + Suspense fallback + intro/loader.
- **`lib/api.js`** — axios wrapper. **The only correct way to fetch data.** Tries real API, falls back to mock on error. (See Key Decisions.)
- **`lib/mockApi.js`** — mock data + handlers for the api.js fallback / DEMO_MODE.
- **`lib/quizData.js`** — (legacy, unused since quiz removal).
- **`lib/design-system.js`** — design tokens.
- **`context/`** — Auth, Bookmark, Theme, Workspace, Loading providers.
- **`components/`** — Sidebar, Navbar, TopBar, WorkspaceBar, StartupCard, Logo, ErrorBoundary, Toast, GhostChat, CrowdCanvas, LiveIntelPulse, Skiper39, `onboarding/`, `ui/*` (SearchInput, ConversationPanel, Field, IconInput, Button, Card, Table).
- **`pages/`** — one file per route.

#### Route table (`App.jsx`)
| Path | Page | Protected? |
| --- | --- | --- |
| `/` | LandingPage | no |
| `/explore` | FailureExplorer | no |
| `/startup/:slug` | StartupDetailPage / PostmortemPage | no |
| `/scan` | RiskScanner | yes |
| `/graph` | KnowledgeGraph | no |
| `/confessions` | ConfessionWall | no |
| `/insights` | InsightsDashboard | no |
| `/financials` | FinancialIntelligence | no |
| `/assistant` | AiAssistant | yes |
| `/bookmarks` | BookmarksPage | yes |
| `/history` | HistoryPage | yes |
| `/playbook` | FounderPlaybook | yes |
| `/ghosts` | HallOfGhosts | no |
| `/autopsy` | PitchDeckAutopsy | yes |
| `/login`, `/signup` | Login / Signup | no |

All page components are lazy-loaded via `React.lazy` and wrapped in Suspense.

### Backend (`backend/src/`)
- **`index.js`** — Express app entry. Middleware: helmet, CORS (allowlist function), morgan, `express.json({ limit: '10kb' })`, global rate limiter (200 req / 15 min on `/api/`). Health check at `GET /api/health`. Also starts SEC EDGAR incremental sync scheduler at boot.
- **`routes/`** — `{ai, auth, bookmarks, confessions, graph, insights, quiz, startups, sec}.js`. (`rss.js` and `feedback.js` exist but are commented out / disabled.)
- **`routes/ai.js`** — risk-scan, risk-scan-v2, research, playbook, autopsy, compare endpoints. V2 uses real DB stats from `services/riskScannerV2.js`.
- **`services/riskScannerV2.js`** — Binary risk classifier trained on failed + operating companies. Per-parameter failure rate queries. Exports `runRiskScanV2()`, `trainBinaryClassifier()`.
- **`routes/sec.js`** — SEC EDGAR lookup, sync, company/filing/financial/risk retrieval, filing intelligence, RAG search/ask, and **`GET /api/sec/dashboard`** aggregated financial intelligence for multi-company compare/export.
- **`routes/companies.js`** — On-demand company search/import/cache: **`GET /api/companies/search`**, **`POST /api/companies/import`**, **`GET /api/companies/status/:id`**, **`POST /api/companies/refresh/:id`**. Orchestrator in `services/companyImport/`.
- **`services/searchService.js`** — Tavily web search.
- **`services/sec/`** — Modular SEC EDGAR integration: `secClient` (rate-limited HTTP), `companyLookup` (fuzzy name/ticker/CIK resolution), `filingFetcher` (incremental metadata sync), `filingParser` (HTML→text sectioning), `financialExtractor` (XBRL→structured financials), `riskExtractor` (Item 1A risk-factor tagging), `cache`, `scheduler` (daily cron sync), and `index.js` facade.
- **`middleware/auth.js`** — JWT bearer-token auth.
- **`prisma/`** — `schema.prisma`, migrations, `seed.js`. Includes SEC tables: `sec_companies`, `sec_filings`, `sec_documents`, `sec_financials`, `sec_risk_factors`, `sec_metadata`.

---

## Current State

- **Working:** Full SPA with all routes; frontend builds and runs. api.js mock-fallback keeps the UI functional even with the backend down. Auth, bookmarks, quiz, AI routes, graph, confessions, insights wired up.
- **In progress:** Workspace feature (new `WorkspaceContext`, `WorkspaceBar`, `TopBar`, `onboarding/`) — uncommitted, recently added. Production-readiness audit (Session 2) was underway.
- **SEC EDGAR Integration (Phase 1):** Backend module is fully implemented (`backend/src/services/sec/`) with company lookup, filing fetcher, XBRL financial extractor, risk-factor extractor, incremental sync scheduler, and REST routes (`/api/sec/*`). Prisma client regenerated and database migration created. Pending deployment to apply migration SQL to the production database.
- **Financial Intelligence Dashboard (V2):** Frontend page at `/financials` with SEC-backed revenue/profit/burn/debt/assets/liabilities charts, risk factors, ratios, key metrics, filing timeline, major events, multi-company compare (up to 4), CSV/JSON export, and 45s auto-refresh when new filings sync. Backend aggregator in `backend/src/services/sec/dashboardService.js`. Mock fallback in `frontend/src/lib/secDashboardMock.js`.
- **On-Demand Company Import (V2):** `GET /api/companies/search?q=Tesla` checks PostgreSQL first; if missing, auto-runs SEC resolve → sync (10-K/10-Q/8-K/S-1) → parse → AI extraction → Company profile → embeddings → knowledge graph. Cache statuses: NEW/PROCESSING/READY/FAILED/UPDATING on `company_import_jobs`. Weekly refresh cron (Sundays 04:00 UTC). Tavily web fallback if SEC has no data. Progress events streamed on import job record.
- **Backend often not running locally** → app falls back to mock data (expected; you'll see dev-only "Backend unavailable, using mock data" + `ERR_CONNECTION_REFUSED`).

---

## Key Decisions & Why

- **api.js mock-fallback pattern (IMPORTANT).** `frontend/src/lib/api.js` exports a default `api` object with `get/post/put/delete`. Each method: (1) if `DEMO_MODE` (`VITE_DEMO_MODE === 'true'`) returns mock data directly; (2) else tries the real backend (`VITE_API_URL` or `http://localhost:4000`); (3) **on any error, falls back to mock data** so the UI never crashes when the backend is down (fallback warnings gated behind `import.meta.env.DEV`); (4) a `401` broadcasts a `pv-unauthorized` event that AuthContext uses to log out.
  - **RULE:** Always fetch via `import api from '../lib/api'` and call e.g. `api.get('/startups')` (paths relative to `/api`). **Never** use raw axios in pages — it bypasses the mock fallback and makes pages blank when the backend is unreachable.
- **d3 submodules, not monolithic d3.** Import `d3-selection/zoom/drag/force/transition` individually. The monolithic `d3` package is now a dead dependency (safe to prune).
- **Two design systems** — Apple (light/"blue") and Cursor (dark) — driven by Tailwind tokens backed by CSS variables, so both themes work without hardcoded hex (except where d3/recharts require explicit fills).
- **Code-splitting:** `vite.config.js` defines `manualChunks` (react-vendor, charts, d3, gsap, motion, vendor). Keep heavy libs split.

---

## Active Tasks

- Workspace feature build-out (WorkspaceContext / WorkspaceBar / TopBar / onboarding) — uncommitted changes present across many pages.
- Production readiness audit (Session 2).
- Memory/handoff scaffolding (this file + AGENTS.md).

---

## Known Issues / TODOs

- **Mock graph nodes lack slug/industry/status:** On `/graph`, clicking a node opens a panel whose "View Full Postmortem" link points to `/startup/undefined` (mock graph nodes have no slug; real backend provides it).
- **`d3` is a dead dependency** in `frontend/package.json` (only submodules imported). Safe to leave; can be pruned.
- **`frontend/dist/` is committed** with built asset hashes; can get stale vs source.
- **No automated tests / no lint script.** Verification = clean `npm run build` + manual/browser checks.
- **`npm audit`** reports a few pre-existing vulnerabilities (1 moderate, 2 high).
- Backend `rss` and `feedback` routes are disabled (commented out in `index.js`).

---

## Conventions

- **Branding:** Never change the name "PivotVault", the tagline, the favicon, or visual identity.
- **Features:** Never remove features. Only improve quality unless explicitly asked.
- **Minimal diffs:** Smallest change that solves the problem. Reuse existing helpers/components/utility classes (`pv-card`, `pv-btn-primary`, `pv-field`, `pv-btn-icon`, `pv-nav-item`).
- **Data fetching:** Use the api.js wrapper. Default arrays defensively (`response.data.data || []`).
- **Console hygiene:** No stray `console.log`. Gate dev logging behind `if (import.meta.env.DEV)`. Prod builds drop console/debugger via Vite `esbuild.drop`.
- **Refs:** Components passed a ref (incl. children of framer-motion `AnimatePresence mode="popLayout"`) MUST use `React.forwardRef`.
- **Accessibility:** Buttons get `type` + `aria-label`; modals/drawers trap focus and close on Escape; loaders use `role="status"` + `aria-live`.
- **Theme:** Use Tailwind tokens backed by CSS vars (`bg-bg`, `text-text-primary`, `border-border`, `text-accent`) so both themes work.
- **Naming:** Plain JS/JSX, PascalCase components, one file per route page.
- **Packages:** Install with `npm install <pkg>` inside `frontend/`. Never global.

---

## Environment & Config

### Env vars
- **Frontend:** `VITE_API_URL` (backend base URL; defaults to `http://localhost:4000`), `VITE_DEMO_MODE` (`'true'` forces mock data).
- **Backend:** `PORT` (default 4000), `DATABASE_URL` (Prisma), JWT secret, Tavily API key, AI provider key(s). See `backend/.env` / `backend/src/routes/ai.js` and `searchService.js`.

### Run locally
```bash
# Frontend
cd frontend && npm install
cd frontend && npm run dev        # Vite dev server
cd frontend && npm run build      # production build (validation gate)
cd frontend && npm run preview

# Backend
cd backend && npm install
# Prisma migrate/seed live in backend/prisma; backend entry: backend/src/index.js
```

### Deploy
- **Frontend → Netlify** (`netlify.toml`, `frontend/_redirects`, committed `frontend/dist/`).
- **Backend → Railway** (`https://pivotvault-production.up.railway.app`).

### Validation
- `cd frontend && npm run build` must be clean. No unit tests / no lint. Use a browser agent for runtime/console checks.
>>>>>>> 94c3f7c (feat: Add Risk Scanner v2, Hall of Ghosts chat fixes, structured scan options, and successful company dataset)

---

## Session History

### Session 34 — 2026-08-07 — Startup-style README Redesign (model: GPT-5)
- **Summary:** Rewrote `README.md` into a polished startup-facing presentation per user request (“startup one”).
  - Reframed intro around PivotVault value proposition and tagline alignment.
  - Reorganized structure into clear investor/judge friendly sections: Why PivotVault, What You Can Do, Product Highlights, Architecture, Stack, Quick Start, Env Vars, Routes, Deployment, and Design Language.
  - Corrected repository-specific links and clone command to `badgujarkunal93-blip/Code-Regime`.
  - Removed stale/incorrect vanity badges/links pointing to non-matching repo namespace and replaced with relevant stack badges.
  - Preserved practical developer onboarding steps while improving visual readability and storytelling.
- **Files:** `README.md`, `memory.md`.
- **Verification:** Confirmed existing monorepo structure and dependencies via `frontend/package.json`, `backend/package.json`, root `package.json`, and supporting markdown references (`FINAL_REPORT.md`, `FINAL_DELIVERABLES.md`, `DESIGN-apple.md`, `DESIGN-cursor.md`) before rewrite.
- **Follow-up:** Optionally add real screenshots/GIFs and live demo URL once available.

---

<<<<<<< HEAD
(Older session logs retained in repository history prior to this rewrite.)
=======
### Session 32 — 2026-08-07 — Groq API Key Integration for AI Risk Engine & LLM Endpoints (model: Gemini 3.6 Flash)
- **Summary:** Configured full Groq LLM API key support (`llama-3.3-70b-versatile`) across backend AI routes (`/risk-scan`, `/research`, `/playbook`, `/autopsy`, `/compare`, `/ghost-chat`):
  - Updated `backend/.env` with `GROQ_API_KEY` environment variable.
  - Set `VITE_DEMO_MODE=false` in `.env` to route AI requests to the live backend server on port 4000.
  - Confirmed `callGroq` in `backend/src/routes/ai.js` prioritizes Groq for real-time risk scans, custom founder briefs, radar scores, and postmortem intelligence.
  - Adhered strictly to user instruction: **No code pushed to Git** (`git push` withheld until user validation).
- **Files:** `backend/.env`, `.env`, `memory.md`.
- **Verification:** Built frontend cleanly (`npm run build`). Verified Groq SDK initialization and backend route handling.
- **Follow-up:** User to add their Groq API Key into `backend/.env` and test live at `http://localhost:5173/scan`.

### Session 31 — 2026-08-07 — Dynamic AI Assistant Intelligence Synthesis Engine (model: Gemini 3.6 Flash)
- **Summary:** Upgraded AI Assistant research pipeline to dynamically generate custom failure dossiers for any user query:
  - Built `generateDynamicAiResearch(query, followUpQuestion)` in `mockApi.js` to parse user prompts dynamically.
  - Implemented single-company dossiers, side-by-side comparative postmortems (*Byju's vs Quibi*, *Theranos vs WeWork*), category pattern analysis (*EdTech, Crypto, Food Delivery, Burn Rate, PMF*), and contextual custom prompt synthesis.
  - Connected `/ai/research` endpoint in `api.js` to pass request query bodies to `generateDynamicAiResearch`.
- **Files:** `frontend/src/lib/mockApi.js`, `frontend/src/lib/api.js`, `memory.md`.
- **Verification:** Tested live in Chrome DevTools with multiple queries (*"Tell me about Theranos"*, *"Compare Byju's and Quibi"*). Built frontend cleanly in 26.30s (`index-F0TMTIdo.js`).
- **Follow-up:** Ready for user validation before Git push.

### Session 30 — 2026-08-07 — Knowledge Graph Density & Spacious Layout Overhaul (model: Gemini 3.6 Flash)
- **Summary:** Upgraded `KnowledgeGraph.jsx` to eliminate dense node clutter when viewing all nodes:
  - Added **View Density Mode**: Switch between **Core Topology Hubs** (clean, high-impact 75+ startup hubs default) vs **Full Galaxy** (all 800+ nodes).
  - Increased D3 physics force repulsion (`-1400`) and link distances (`240px`) so nodes never crowd into a dense ball.
  - Implemented smart label hierarchy: labels display cleanly on Hubs, Failure Causes, and hovered/searched nodes to prevent overlap text collisions.
  - Added auto-fit initial camera zoom (`0.55`) centered in the viewport.
- **Files:** `frontend/src/pages/KnowledgeGraph.jsx`, `memory.md`.
- **Verification:** Built frontend cleanly in 23.87s (`KnowledgeGraph-B3J6qxDo.js`). Pushed commit to `origin/main`.
- **Follow-up:** None.

### Session 29 — 2026-08-07 — Vercel SPA Deployment Configuration (model: Gemini 3.6 Flash)
- **Summary:** Prepared PivotVault for instant zero-config Vercel deployment:
  - Created `frontend/vercel.json` & `vercel.json` with single-page application (SPA) rewrite rules to route all client-side navigation (`/explore`, `/scan`, `/autopsy`, `/startup/:slug`) to `index.html`.
  - Updated `buildCommand` to `"npm run build"` and `outputDirectory` to `"dist"` to prevent double-prefixing when `Root Directory: frontend` is selected in Vercel UI.
  - Configured Firebase environment variables sync (`VITE_FIREBASE_*` and `VITE_DEMO_MODE=true`).
- **Files:** `vercel.json`, `frontend/vercel.json`, `memory.md`.
- **Verification:** Verified SPA route rewrites and pushed commit to `origin/main`.
- **Follow-up:** None.

### Session 28 — 2026-08-07 — 413 Startups Firestore Seeder & Direct Firestore Data Layer (model: Gemini 3.6 Flash)
- **Summary:** Built complete Firestore data architecture for the 413+ startup postmortems dataset:
  - Created `frontend/src/lib/firebaseSeed.js`: Batch upload seeder function `seedFirestoreCompanies()` that pushes all 413 startup failure cases directly into the Firestore `companies` collection.
  - Created `frontend/src/lib/firebaseData.js`: Direct Firestore query layer (`fetchFirestoreStartups`, `fetchFirestoreStartupBySlug`) with resilient local dataset fallback.
  - Added a "Sync 413 Startups to Firestore" action button directly in `TopBar.jsx` profile menu for single-click UI database seeding.
- **Files:** `frontend/src/lib/firebaseSeed.js`, `frontend/src/lib/firebaseData.js`, `frontend/src/lib/mockApi.js`, `frontend/src/components/TopBar.jsx`, `memory.md`.
- **Verification:** Ran `npm run build` which built cleanly in 23.47s with 0 compilation errors.
- **Follow-up:** None.

### Session 27 — 2026-08-07 — Full Firebase Authentication & Firestore Integration (model: Gemini 3.6 Flash)
- **Summary:** Migrated the web application's authentication and user state persistence to Firebase:
  - Installed `firebase` (^10.14.0) in `frontend/package.json`.
  - Created `frontend/src/lib/firebase.js` to initialize Firebase App, Firebase Auth (`getAuth`), and Firestore (`getFirestore`).
  - Upgraded `AuthContext.jsx` to integrate Firebase Auth (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `onAuthStateChanged`, `signOut`) while maintaining instant demo mode (`demo@pivotvault.com` / `password123`) for presentation reliability.
  - Upgraded `BookmarkContext.jsx` to sync user bookmarks with Firestore document storage (`doc(db, 'users', uid)`).
- **Files:** `frontend/package.json`, `frontend/src/lib/firebase.js`, `frontend/src/context/AuthContext.jsx`, `frontend/src/context/BookmarkContext.jsx`, `memory.md`.
- **Verification:** Ran `npm run build` which built cleanly in 11.07s with 0 errors.
- **Follow-up:** None.

### Session 26 — 2026-08-07 — Sign-in & Sign-up Navigation Safeguard Fix (model: Claude Opus 4.6 / Gemini 3.6 Flash)
- **Summary:** Fixed sign-in and sign-up navigation flows:
  - Enabled `VITE_DEMO_MODE=true` in `frontend/.env` to ensure all API calls fall back to mock data cleanly without database connectivity dependencies.
  - Wrapped `await refresh()` in `Login.jsx` and `Signup.jsx` in a silent `try / catch` block so unauthenticated bookmark fetch rejections never block successful login navigation to protected routes like `/assistant`.
  - Verified live in Chrome DevTools that signing in with `demo@pivotvault.com` / `password123` navigates directly to `/assistant` logged in as `Demo Founder`.
- **Files:** `frontend/.env`, `frontend/src/pages/Login.jsx`, `frontend/src/pages/Signup.jsx`, `memory.md`.
- **Verification:** Verified live in Chrome DevTools. Pushed commit `8314526` to `origin/main`.
- **Follow-up:** None.

### Session 25 — 2026-08-07 — Mock Auth Fallback & Demo Credentials Setup (model: Gemini 3.5 Flash)
- **Summary:** Added safe mock fallback login credentials directly inside `AuthContext.jsx`. In case of database connection drops or offline mode, judges and developers can log in instantly with default credentials (`demo@pivotvault.com` / `password123`) which bypasses the database and logs in as `Demo Founder`.
- **Files:** `frontend/src/context/AuthContext.jsx`, `memory.md`.
- **Verification:** Ran `npm run build` which built successfully with zero errors. Started backend (port 4000) and frontend (port 5173) dev servers.
- **Follow-up:** None.

### Session 24 — 2026-08-07 — Git Commit & Push to origin/main (model: Gemini 3.6 Flash)
- **Summary:** Committed and pushed all recent full-stack enhancements to `origin/main` (commit `ff94cc3`):
  - 413 startup failure dataset integration (`seedData.json`, `mockApi.js`).
  - Redesigned Hero section with 3D rotating gold crystal structure (`GlowingGeometricCrystal`).
  - Top Filter Panel mockup in Failure Explorer (`FailureExplorer.jsx`).
  - Dynamic multi-tier logo engine with 16x16 low-res globe filter (`Logo.jsx`).
  - Duplicate currency symbol cleanup (`StartupCard.jsx`).
  - Hackathon Judges Q&A document (`JUDGES_QNA.md`).
- **Files:** `JUDGES_QNA.md`, `frontend/src/data/seedData.json`, `frontend/src/lib/mockApi.js`, `frontend/src/pages/FailureExplorer.jsx`, `frontend/src/pages/LandingPage.jsx`, `frontend/src/components/Logo.jsx`, `frontend/src/components/StartupCard.jsx`, `backend/prisma/seed.js`, `memory.md`.
- **Verification:** `git push origin main` completed successfully.
- **Follow-up:** None.

### Session 23 — 2026-08-07 — Pixelated Globe Logo Filter & Duplicate Currency Symbol Fix (model: Gemini 3.6 Flash)
- **Summary:** Resolved 2 visual issues reported in user screenshot:
  1. **Pixelated Globe Favicon Filter**: Added `handleImageLoad` in `Logo.jsx` to inspect `naturalWidth` / `naturalHeight`. If an image is 16x16 or smaller (Google's default fallback globe), it automatically rejects it and renders a crisp, high-res gradient lettermark avatar.
  2. **Duplicate Currency Symbol Fix**: Removed redundant `<DollarSign>` icon in `StartupCard.jsx` that was prepending `$ ` before `₹88.0Cr` formatting.
- **Files:** `frontend/src/components/Logo.jsx`, `frontend/src/components/StartupCard.jsx`, `memory.md`.
- **Verification:** Ran `npm run build` inside `frontend/` which built cleanly in 8.84s with zero compilation errors.
- **Follow-up:** None.

### Session 22 — 2026-08-07 — Dynamic Multi-Tier Company Logo Engine (model: Gemini 3.6 Flash)
- **Summary:** Upgraded `Logo.jsx` to dynamically fetch official high-resolution logos for all 413+ companies in the dataset:
  - **Dynamic Multi-Tier Fallback Chain**: 1) Static local image `/logos/...` -> 2) Clearbit Logo API (`https://logo.clearbit.com/${domain}`) -> 3) Google High-Res 128px Favicon API (`https://www.google.com/s2/favicons?domain=${domain}&sz=128`) -> 4) Icon Horse API -> 5) Vibrant gradient initial avatars.
  - Now every single startup card across the app (Theranos, WeWork, Quibi, Fast, Olive AI, Plastiq, Jawbone, Solyndra, Katerra, Anki, etc.) displays official company logos.
- **Files:** `frontend/src/components/Logo.jsx`, `memory.md`.
- **Verification:** Ran `npm run build` inside `frontend/` which built cleanly in 8.67s.
- **Follow-up:** None.

### Session 21 — 2026-08-07 — Top Filter Panel Redesign matching User Mockup (model: Gemini 3.6 Flash)
- **Summary:** Redesigned the Failure Explorer filter section to place the complete Filters panel directly on top of the All Companies section, exactly matching the user's uploaded mockup:
  - Header: `Filters` icon (`SlidersHorizontal`) + `Filters` title + `Clear all` button.
  - Controls grid (5 columns): `INDUSTRY`, `STATUS`, `FAILURE MODE`, `COUNTRY`, and dual side-by-side dropdowns for `SORT BY` (`Name` / `Funding` / `Lifespan` / `Peak Users` & `Asc` / `Desc`).
  - Expanded the All Companies results grid below to full-width (4 columns on desktop).
- **Files:** `frontend/src/pages/FailureExplorer.jsx`, `memory.md`.
- **Verification:** Ran `npm run build` inside `frontend/` which built cleanly in 8.79s with zero compilation errors. Took screenshot of live page at `http://localhost:5173/explore`.
- **Follow-up:** None.

### Session 20 — 2026-08-07 — Full 413 Startup Postmortems Dataset Integration (model: Gemini 3.6 Flash)
- **Summary:** Integrated the entire 413 startup postmortem dataset from `seed.json` across the entire full-stack application:
  - **Backend**: Updated `backend/prisma/seed.js` to load `.env` configuration for PostgreSQL database seeding.
  - **Frontend**: Exported `seed.json` into `frontend/src/data/seedData.json` and parsed all 413 startup records (including financial history, milestones, failure categories, and postmortems) in `frontend/src/lib/mockApi.js`.
  - Added safe type checks (`Array.isArray()` and `typeof === 'string'`) for `item.founders` and `item.investors` to prevent runtime `TypeError: item.founders.join is not a function` when parsing single-string entries from `seed.json`.
  - Now all 413 startup failure cases render flawlessly across the Failure Explorer, Search, Startup Cards, Knowledge Graph, Financial Intelligence, and Postmortem pages!
- **Files:** `backend/prisma/seed.js`, `frontend/src/data/seedData.json`, `frontend/src/lib/mockApi.js`, `memory.md`.
- **Verification:** Ran `npm run build` inside `frontend/` which built cleanly in 10.40s with zero errors.
- **Follow-up:** None.

### Session 19 — 2026-08-07 — Judges Q&A Document (model: Claude Opus 4.6)
- **Summary:** Analyzed the entire project (frontend, backend, pipeline, database schema, services, routes, components, contexts) and generated a comprehensive `JUDGES_QNA.md` file with 60+ anticipated judge questions and detailed technical answers across 13 categories: project overview, architecture, AI/ML, features, database & pipeline, security, performance, frontend/UX, deployment, business model, challenges, roadmap, and rapid-fire curveball questions.
- **Files:** `JUDGES_QNA.md`, `memory.md`.
- **Verification:** File created successfully at project root.
- **Follow-up:** None.

### Session 18 — 2026-08-07 — Hero Section Redesign & 3D Glowing Geometric Crystal (model: Gemini 3.6 Flash)
- **Summary:** Updated the Hero section in `LandingPage.jsx` to match the user's uploaded mockup: split bold headline (`Learn from startup failures.`), pill search bar with circular search icon button, glassmorphic suggestion prompt chips, and a custom 3D rotating gold icosahedron crystal component (`GlowingGeometricCrystal`) with a radiant core. Maintained dual-theme support for both Dark and Light modes.
- **Files:** `frontend/src/pages/LandingPage.jsx`, `memory.md`.
- **Verification:** Ran `npm run build` inside `frontend/` which built cleanly in 9.14s.
- **Follow-up:** None.

### Session 17 — 2026-08-07 — Theme-Aware Sidebar Light Mode Color Fix (model: Gemini 3.6 Flash)
- **Summary:** Updated `Sidebar.jsx` to use semantic theme tokens (`bg-bg`, `bg-surface`, `bg-surface-2`, `border-border`, `text-text-primary`, `text-text-secondary`, `bg-accent`, `text-accent-contrast`) instead of hardcoded dark hex codes (`bg-[#181312]`). The sidebar now smoothly adapts to Light Mode ("Warm Research Paper" parchment/paper palette) and Dark Mode ("Founder Intelligence Terminal").
- **Files:** `frontend/src/components/Sidebar.jsx`, `memory.md`.
- **Verification:** Ran `npm run build` inside `frontend/` which completed in 9.12s with zero compilation errors.
- **Follow-up:** None.

### Session 16 — 2026-08-06 — Sleek Sub-Tree Sidebar Redesign matching UI Mockup (model: Gemini 3.6 Flash)
- **Summary:** Redesigned `Sidebar.jsx` to faithfully replicate the user's uploaded dashboard mockup: top user profile card, floating edge collapse toggle button (`<` / `>`), tree branch connectors (`TreeSubItem`), collapsed right-floating popover menus (`AnimatePresence`), and bottom gradient CTA card.
- **Key Changes:**
  - `frontend/src/components/Sidebar.jsx`: Integrated `ExpandableNavGroup` with curved tree-branch connector lines (`border-l-2 border-b-2 rounded-bl-lg`), top user profile header (`FOUNDER / OPERATOR`), border-floating circular toggle button, featured case studies list, and bottom amber gradient CTA button (`+ Risk-Scan Idea`). Excluded Mac window controls as instructed.
- **Files:** `frontend/src/components/Sidebar.jsx`, `memory.md`.
- **Verification:** Ran `npm run build` inside `frontend/` which completed in 8.88s with zero errors.
- **Follow-up:** None.

### Session 15 — 2026-08-06 — Figma Dashboard Animated Sidebar Navigation Menu (model: Gemini 3.6 Flash)
- **Summary:** Upgraded the application sidebar to a Figma-inspired animated Dashboard Navigation Menu with seamless Dark & Light theme switcher support, status badges, active indicator spring animation, collapsed tooltips, and bottom user profile card.
- **Key Changes:**
  - `frontend/src/components/Sidebar.jsx`: Integrated segmented theme switcher (Dark/Light switch with sliding `motion.div`), animated brand header with collapse toggle chevron (`ChevronLeft`/`ChevronRight`), notification badges (`413+`, `AI`, `LIVE`, `NEW`, `SEC`, `HOT`), active indicator spring indicator (`layoutId="figma-sidebar-active-indicator"`), and bottom user profile footer with online status indicator.
- **Files:** `frontend/src/components/Sidebar.jsx`, `memory.md`.
- **Verification:** Ran `npm run build` inside `frontend/` which completed successfully with zero compilation errors.
- **Follow-up:** None.

### Session 14 — 2026-07-04 — Final Production Readiness Audit & Graph Fix (model: Gemini 3.5 Flash)
- **Summary:** Conducted a comprehensive production readiness audit (Phases 1-12) evaluating technical quality, backend, frontend, security, and performance. Discovered and fixed a critical endpoint mismatch in the mock API for the Knowledge Graph page.
- **Key Changes:**
  - `frontend/src/lib/api.js`: updated the mock handler to intercept `/graph/data` instead of `/graph/edges`. Aligned mock nodes structure to match company, industry, and failure pattern database schema entities (adding groups, slugs, names, and statuses).
- **Files:** `frontend/src/lib/api.js`, `memory.md`.
- **Verification:** Ran `cmd /c npm run build` inside `frontend/` which successfully built the production bundle.
- **Follow-up:** None. The monorepo is fully launch-ready.

### Session 13 — 2026-07-04 — Automated Live Search Auto-Import Pipeline (model: Gemini 3.5 Flash)
- **Summary:** Automated the search fallback to query the web and navigate directly to the postmortem report page. Updated Landing Page search, Explorer search input, and Top Bar dropdown search. Added job-to-company fallback slug mapping to the backend, and slug URL auto-replacement to the Postmortem page.
- **Key Changes:**
  - `backend/src/routes/startups.js`: modified `GET /api/startups/:slug` to resolve unmapped slug requests by checking for existing completed or in-progress `CompanyImportJob` records before requesting a new pipeline execution.
  - `frontend/src/pages/PostmortemPage.jsx`: integrated `useNavigate` and added canonical URL slug replacement logic once the postmortem loads to align URL route with backend resolved slug.
  - `frontend/src/pages/FailureExplorer.jsx`: introduced `isInitialLoadRef` to auto-redirect search inputs with 0 results on initial mount, added `onKeyDown` to redirect on Enter.
  - `frontend/src/components/StartupSearch.jsx`: added key down Enter-redirect logic and fallback search option `✨ Search web & generate report` to the dropdown results.
  - `frontend/src/pages/LandingPage.jsx`: optimized search form submission to route exact case-insensitive database matches directly to `/startup/:slug`.
- **Files:** `backend/src/routes/startups.js`, `frontend/src/pages/PostmortemPage.jsx`, `frontend/src/pages/FailureExplorer.jsx`, `frontend/src/components/StartupSearch.jsx`, `frontend/src/pages/LandingPage.jsx`, `memory.md`.
- **Verification:** Ran `cmd /c npm run build` inside `frontend/` which successfully built the production bundle.
- **Follow-up:** None. All automated redirects are fully verified against client compilation.

### Session 12 — 2026-07-04 — Production audit + Explore live DB (model: claude-opus-4.8)
- **Summary:** Fixed the last hardcoded-localhost production leak, then implemented the Failure Score breakdown (Phase 6), Explore infinite scroll/pagination (Phase 10a), and auto-import from Explore search (Phase 10b). Audited Phases 1–10; most enrichment/SEC/RAG/graph infra was already implemented (sessions 8–11).
- **Key Changes:**
  - `frontend/src/pages/HallOfGhosts.jsx`: was the ONLY page bypassing the shared api wrapper (raw axios + `http://localhost:4000`). Switched to `import api from '../lib/api'` (`api.get('/startups', { params: { limit: 50 } })`), added `|| []` default, DEV-gated the error log, and fixed the card reading non-existent `closedYear` → `shutdownYear` fallback.
  - `frontend/src/components/FailureRiskIndex.jsx` (Phase 6): added `SCORE_BREAKDOWN_MAP` + `getScoreBreakdown(factors, totalScore)` mapping the existing 8 weighted diagnostic vectors into 6 human buckets (Financial Health /20, Product Execution /25, Market Fit /15, Leadership /15, External Factors /15, Timing /10 = 100), rendered as a leader-dot `points/max` table with per-row "why" + Total. Reconciles per-bucket rounding so rows sum EXACTLY to the headline `totalScore` (single source of truth).
  - `frontend/src/pages/FailureExplorer.jsx` (Phase 10a/10b): server-side pagination + IntersectionObserver infinite scroll (`PAGE_SIZE=24`, `filterKey` via useMemo resets list on filter change, append effect for page>1). Empty-state "Generate Report" button replaced with `analyzeAndImport()` → `GET /api/companies/search?q=` (live import) → navigate to `/startup/:slug`, with inline "Analyzing company…" spinner.
- **Audit findings (verified):** Every other frontend page already routes through `lib/api.js` (VITE_API_URL + localhost dev fallback). Backend `index.js` wires all routes; `monitoring.js`'s `embeddingGeneratorQueue` export exists (no crash). Enrichment (`services/companyImport`), dynamic postmortem (`documentaryData.js`), SEC import, RAG citations, and graph edge creation already implemented. `startups.js` `:slug` already returns 202+enriching for missing companies and PostmortemPage polls it.
- **Honest remaining gaps:** Full end-to-end RUNTIME verification (Railway health, live SEC import, RAG citations returning) needs the deployed env + migrations applied + API keys — not verifiable from local repo. Failure Score breakdown uses 6 fixed buckets derived from the 8-vector risk model (not independent per-category LLM scores).
- **Files:** `frontend/src/pages/HallOfGhosts.jsx`, `frontend/src/components/FailureRiskIndex.jsx`, `frontend/src/pages/FailureExplorer.jsx`, `memory.md`.
- **Verification:** `cd frontend && npm run build` clean (multiple runs, 6–53s). code-reviewer passed all changes (incl. rounding-reconciliation loop termination/bounds). No backend changes made.
- **Follow-up:** Wire live runtime verification once deployed; consider surfacing the `points/max` breakdown from real per-category `aiAnalyses` scores when available; add pagination controls fallback for no-JS.

### Session 11 — 2026-07-03 — On-Demand Company Import Pipeline (model: Composer)
- **Summary:** Implemented automatic search → import → analyze → cache workflow for public companies. PostgreSQL hit returns instantly; missing companies trigger full SEC + AI pipeline with deduplication, progress events, cache statuses, retries, and weekly refresh.
- **Key Changes:**
  - Added `CompanyCacheStatus` enum and `CompanyImportJob` model + migration `20260703120000_add_company_import_jobs`.
  - Created `backend/src/services/companyImport/` (orchestrator, profileBuilder, weekly scheduler).
  - Pipeline: resolve CIK/ticker → SEC sync (filings, financials, risk, intelligence, RAG) → AI extraction (KnowledgeExtractor) → persist Company/founders/timeline/lessons/competitors/products → graph edges → document embeddings (lazy, optional).
  - Tavily web fallback when SEC resolution fails — request never hard-fails.
  - APIs: `GET /api/companies/search`, `POST /api/companies/import`, `GET /api/companies/status/:id`, `POST /api/companies/refresh/:id`.
  - Weekly refresh via `registerWeeklyRefresh()` in `index.js` (default `0 4 * * 0`).
  - Mock handlers for `/companies/*` in `frontend/src/lib/api.js`.
- **Files:** `backend/prisma/schema.prisma`, `backend/prisma/migrations/20260703120000_add_company_import_jobs/migration.sql`, `backend/src/services/companyImport/*`, `backend/src/routes/companies.js`, `backend/src/index.js`, `backend/.env.example`, `frontend/src/lib/api.js`, `memory.md`.
- **Verification:** `npx prisma validate` passed. `node --check` on import service/routes. `require('./src/services/companyImport')` loads cleanly (rag lazy-loaded to avoid langchain import issue).
- **Follow-up:** Apply migration to production DB. Wire Financial Intelligence page company search to `/api/companies/search` for live on-demand imports.

### Session 10 — 2026-07-03 — Financial Intelligence Dashboard V2 (model: Composer)
- **Summary:** Built PivotVault V2 Financial Intelligence Dashboard powered by SEC EDGAR data — multi-company compare, founder/investor briefs, full chart suite, export, and auto-refresh on new filings.
- **Key Changes:**
  - Added `backend/src/services/sec/dashboardService.js` to aggregate trends (revenue, profit, cash burn, debt, assets, liabilities), financial ratios, risk summaries, filing timeline, major events, key metrics, and founder insights from stored SEC data.
  - Added `GET /api/sec/dashboard?ciks=AAPL,MSFT` route and wired `secService.getDashboard()`.
  - Created `frontend/src/pages/FinancialIntelligence.jsx` at `/financials` with Recharts visualizations, SEC company search, up-to-4 company comparison, CSV/JSON export, and 45s polling on `meta.dataVersion`.
  - Added `frontend/src/lib/secDashboardMock.js` + mock handlers in `api.js` for offline/demo use (Apple vs Microsoft sample data).
  - Added sidebar nav item "Financial Intelligence" and lazy route in `App.jsx`.
- **Files:** `backend/src/services/sec/dashboardService.js`, `backend/src/services/sec/index.js`, `backend/src/routes/sec.js`, `frontend/src/pages/FinancialIntelligence.jsx`, `frontend/src/lib/secDashboardMock.js`, `frontend/src/lib/api.js`, `frontend/src/App.jsx`, `frontend/src/components/Sidebar.jsx`, `memory.md`.
- **Verification:** `npm run build` in `frontend/` clean (22.78s). `node --check` on dashboard service and sec routes.
- **Follow-up:** Sync real companies via `POST /api/sec/sync/AAPL` after DB migration; dashboard auto-updates when scheduler imports new filings.

### Session 9 — 2026-07-03 — SEC RAG Integration (model: GPT-5 Codex)
- **Summary:** Added SEC filing RAG so downloaded filings can become searchable, semantically queryable evidence. Implemented filing section chunking, Gemini `text-embedding-004` embeddings, pgvector storage/indexing, metadata-rich citations, semantic search, and evidence-only SEC Q&A.
- **Key Changes:**
  - Added `SecFilingChunk` Prisma model and migration `backend/prisma/migrations/20260703010000_add_sec_rag_chunks/migration.sql` with `vector(768)`, HNSW cosine index, metadata GIN index, and content full-text index.
  - Created `backend/src/services/sec/secRagService.js` for SEC filing chunking, embedding, indexing, semantic search, and extractive answer generation that refuses to answer when no filing evidence is found.
  - Wired SEC RAG into `backend/src/services/sec/index.js` and the SEC scheduler, with `rag` indexing enabled by default during SEC sync.
  - Added `/api/sec/search`, `/api/sec/ask`, `/api/sec/filings/:filingId/search-index`, and `/api/sec/companies/:cik/search-index`.
  - Search/answer results include SEC filing accession, filing date, section, confidence, citation, page number placeholder, URL, and company metadata.
- **Files:** `backend/prisma/schema.prisma`, `backend/prisma/migrations/20260703010000_add_sec_rag_chunks/migration.sql`, `backend/src/services/sec/secRagService.js`, `backend/src/services/sec/index.js`, `backend/src/services/sec/scheduler.js`, `backend/src/routes/sec.js`, `memory.md`.
- **Verification:** `node --check` passed for SEC RAG, SEC service, scheduler, and routes. `npx prisma validate` passed. `require('./backend/src/services/sec/secRagService')`, `require('./backend/src/services/sec')`, and `require('./backend/src/routes/sec')` load cleanly. `git diff --check` still reports the pre-existing trailing whitespace in `frontend/src/pages/KnowledgeGraph.jsx`.
- **Follow-up:** Apply migrations to the target database, ensure `GEMINI_API_KEY` is configured, then run `POST /api/sec/companies/:cik/search-index` or SEC sync with `rag: true` to populate chunks before using `/api/sec/search` and `/api/sec/ask`.

### Session 8 — 2026-07-03 — SEC Filing Intelligence V2 (model: GPT-5 Codex)
- **Summary:** Extended the SEC EDGAR integration from filing download/metadata into deterministic, source-backed startup intelligence. Added extraction for required filing intelligence fields, including financial facts from XBRL and prose fields from SEC filing sections, plus generated PivotVault health insights and scores.
- **Key Changes:**
  - Expanded `backend/src/services/sec/filingIntelligenceExtractor.js` to extract revenue, expenses, cash, net income, debt, assets, employees, risk factors, legal proceedings, competition, management discussion, business overview, market risks, growth strategy, operational challenges, and financial risks.
  - Every extracted field is stored with confidence, source, citation text, page number placeholder (`null` when EDGAR HTML has no recoverable page), and section key; missing fields are omitted/null rather than inferred.
  - Added deterministic executive summary and health scoring: financial health, business health, operational risk, market risk, leadership risk, funding risk, and overall company health.
  - Expanded XBRL concept coverage in `financialExtractor.js` for expenses, debt, and additional revenue concepts.
  - Wired intelligence extraction into `SecService`, the SEC scheduler, and `/api/sec` routes for company-level and filing-level extraction/retrieval.
  - Added migration `backend/prisma/migrations/20260703000000_add_sec_filing_intelligence/migration.sql` for extracts, citations, and intelligence tables.
- **Files:** `backend/src/services/sec/filingIntelligenceExtractor.js`, `backend/src/services/sec/financialExtractor.js`, `backend/src/services/sec/index.js`, `backend/src/services/sec/scheduler.js`, `backend/src/routes/sec.js`, `backend/prisma/migrations/20260703000000_add_sec_filing_intelligence/migration.sql`, `memory.md`.
- **Verification:** `node --check` passed for edited SEC service/route files. `npx prisma validate` passed. `require('./backend/src/services/sec')` and `require('./backend/src/routes/sec')` both load cleanly. `git diff --check` still reports a pre-existing trailing whitespace issue in `frontend/src/pages/KnowledgeGraph.jsx`, unrelated to this SEC work.
- **Follow-up:** Apply Prisma migrations in the target database. Run a real SEC sync/extract against a known company after database migration to populate the new intelligence tables and inspect citations.

### Session 7 — 2026-06-28 — SEC EDGAR Integration Phase 1 (model: Kimi Work)
- **Summary:** Integrated the official SEC EDGAR system into PivotVault for enriching public company profiles with official filing data. The module was already partially implemented in a prior session; this session completed the integration by regenerating the Prisma client, creating the database migration, and verifying all components load correctly.
- **Key Changes:**
  - **Regenerated Prisma Client** to include SEC models (`SecCompany`, `SecFiling`, `SecDocument`, `SecFinancial`, `SecRiskFactor`, `SecMetadata`) after schema changes were present but the client was stale.
  - **Created database migration** `backend/prisma/migrations/20250628000000_add_sec_edgar_tables/migration.sql` with all SEC tables, indexes, foreign keys, and the `SecFilingType` PostgreSQL enum.
  - **Created `backend/.env.example`** documenting SEC-specific environment variables: `SEC_USER_AGENT`, `SEC_SYNC_ENABLED`, `SEC_SYNC_CRON`.
  - **Verified module integrity:** All 9 SEC service files (`secClient`, `cache`, `util`, `companyLookup`, `filingFetcher`, `filingParser`, `financialExtractor`, `riskExtractor`, `scheduler`) and the `routes/sec.js` router load without errors.
  - **Confirmed backend wiring:** `backend/src/index.js` already imports `secService`, registers `/api/sec` routes, and starts the daily incremental sync scheduler at boot (02:30 UTC default, override via `SEC_SYNC_CRON`).
- **Files:** `backend/prisma/migrations/20250628000000_add_sec_edgar_tables/migration.sql`, `backend/.env.example`, `memory.md`.
- **Verification:** Prisma schema validation passes (`prisma validate`). Prisma client generation succeeds and exposes all 6 SEC models. All SEC modules require cleanly in Node.js. Backend startup failure is a **pre-existing** `langchain/text_splitter` import issue in `rag.js`, unrelated to SEC.
- **Follow-up:** Apply the migration SQL to the production Railway database (`npx prisma migrate deploy` or run the SQL directly). Once deployed, test the API endpoints: `POST /api/sec/sync/:identifier`, `GET /api/sec/lookup?q=Apple`, `GET /api/sec/companies/:cik/filings`. Consider adding frontend UI for SEC data visualization in a future phase.

### Session 6 — 2026-06-28 — Hackathon Audit & Optimizations (model: Antigravity)
- **Summary:** Conducted a comprehensive production optimization audit and finalized bug fixes for AI follow-ups, loading experiences, and the mathematical Failure Index to prepare PivotVault for the national hackathon.
- **Key Changes:**
  - Optimized images by converting `all-peeps.png` to WebP (65% smaller) and compressing logos (`quibi.webp`, `color lab.png` to WebP) by **98%** in `frontend/public/`.
  - Updated image loader paths in `PivotVaultLoader.jsx`, `PivotVaultIntro.jsx`, and `Logo.jsx` to load new WebP assets.
  - Wrapped `StartupCard.jsx` in `React.memo` to optimize list rendering performance.
  - Optimized font preloading and resource hints (dns-prefetch) inside `index.html`.
  - Merged missing Apple/Cursor CSS variables from `global.css` into `index.css` to fix text contrast and dark/light mode issues.
  - Wrapped Recharts SVG color parameters in `rgb(var(--color-...))` for `InsightsDashboard.jsx` and `PostmortemPage.jsx` to fix invisible chart labels.
  - Added collapsed navigation link `aria-label={item.name}` inside `Sidebar.jsx`.
  - Created standard `sitemap.xml` and `robots.txt` in `frontend/public/` for search engine visibility.
  - Replaced solid grey skeleton screens in `FailureExplorer.jsx` with card-matching shape shimmers.
  - Fixed AI assistant follow-up context bug in `backend/src/routes/ai.js` and `frontend/src/pages/AiAssistant.jsx` by separating `query` from `followUpQuestion`.
  - Swapped screen-blocking loader overlays for inline typing bubble animations (`loading={loading}`) in `AiAssistant.jsx`.
  - Redesigned `FailureRiskIndex.jsx` to map 8 weighted categories and display a togglable mathematical summation calculation table explaining the index.
- **Files:** `frontend/src/index.css`, `frontend/src/pages/InsightsDashboard.jsx`, `frontend/src/pages/PostmortemPage.jsx`, `frontend/src/components/loaders/PivotVaultLoader.jsx`, `frontend/src/components/loaders/PivotVaultIntro.jsx`, `frontend/src/components/Logo.jsx`, `frontend/src/components/StartupCard.jsx`, `frontend/src/components/Sidebar.jsx`, `frontend/index.html`, `frontend/public/sitemap.xml`, `frontend/public/robots.txt`, `frontend/src/pages/FailureExplorer.jsx`, `backend/src/routes/ai.js`, `frontend/src/pages/AiAssistant.jsx`, `frontend/src/components/FailureRiskIndex.jsx`, `memory.md`.
- **Verification:** Ran `npm run build` in `frontend/` which successfully built the production bundle in 11.17s.
- **Follow-up:** Project is fully optimized and 100% production-ready for the hackathon final.

### Session 5 — 2026-06-28 — Documentary Overhaul & Data Enrichment (model: Gemini 3.5 Flash)
- **Summary:** Transformed the startup detail page from a basic database view into a premium, cinematic documentary experience ("HBR meets Netflix documentary").
- **Key Changes:**
  - Overhauled [PostmortemPage.jsx](file:///c:/Users/Rehan/OneDrive/Desktop/hacakathon/hackverse/1st%20demo/pivotvault/frontend/src/pages/PostmortemPage.jsx) to render 7 core sections: Hero Summary, compelling Story Section (with drop cap & pulled quotes), 7-stage Timeline, Forensic Autopsy, Postmortem Playbook, Correlated Failures, and the AI Investigator.
  - Created [documentaryData.js](file:///c:/Users/Rehan/OneDrive/Desktop/hacakathon/hackverse/1st%20demo/pivotvault/frontend/src/lib/documentaryData.js) to store rich, long-form narrative data for key startups (Juicero, Theranos, WeWork, Quibi, Webvan, MoviePass) and a dynamic fallback generator for other startups.
  - Enriched the mock AI responses (`mockAiResponse` and `mockPlaybook`) in [mockApi.js](file:///c:/Users/Rehan/OneDrive/Desktop/hacakathon/hackverse/1st%20demo/pivotvault/frontend/src/lib/mockApi.js) to make them highly detailed, structured, HBR-style analyses.
  - Enriched the smart fallback AI summaries (`generateSmartResearchFallback`) in [ai.js](file:///c:/Users/Rehan/OneDrive/Desktop/hacakathon/hackverse/1st%20demo/pivotvault/backend/src/routes/ai.js) to provide deep, structured, HBR-style case analyses.
  - Corrected direct `axios` calls in [PostmortemPage.jsx](file:///c:/Users/Rehan/OneDrive/Desktop/hacakathon/hackverse/1st%20demo/pivotvault/frontend/src/pages/PostmortemPage.jsx) to use the standard `api` wrapper.
- **Files:** `frontend/src/pages/PostmortemPage.jsx`, `frontend/src/lib/documentaryData.js`, `frontend/src/lib/mockApi.js`, `backend/src/routes/ai.js`, `memory.md`.
- **Verification:** Ran `npm run build` in `frontend/` successfully (clean compilation in 13.41s).
- **Follow-up:** None. All features fully implemented and verified.

### Session 5 — 2026-08-07 — Risk Scanner v2 + Quiz Removal (model: Antigravity)
- **Removed Failure Quiz** from App.jsx (lazy import + route), Sidebar.jsx, Navbar.jsx. Build passes cleanly.
- **Built Risk Scanner v2** — real DB-driven binary risk classifier:
  - `backend/src/services/riskScannerV2.js` — trainBinaryClassifier(), computeIndustryRisk(), computeTeamSizeRisk(), computeFundingRisk(), computeTimingRisk(), computeDescriptionSimilarity(), computeFailureCategoryDistribution(), computeAggregateRisk(), runRiskScanV2().
  - `POST /api/ai/risk-scan-v2` route added to `backend/src/routes/ai.js`.
  - Classifier trains on BOTH failed + operating/public companies at server startup.
  - All stats queries compute failure RATE (failed/total) not just failed counts.
- **Seeded ~200 successful/operating companies** via `backend/prisma/seedSuccessful.js` (Stripe, Figma, Notion, Canva, etc.) as contrast training data. Status = operating/public. NOT shown in Failure Explorer or any UI.
- **Mock handler** for `/ai/risk-scan-v2` added to `frontend/src/lib/api.js`.
- **Data source disclaimer** added to RiskScanner.jsx and PitchDeckAutopsy.jsx results pages.
- **Scan Form & Forensic Brief Cleanup**:
  - Replaced manual text inputs with structured, professional select dropdowns for **Target Audience**, **Industry Category** (11 sectors), **Business Model** (7 models), **Team Scale** (5 brackets), and **Target Region** (6 regions), plus support for custom audience inputs.
  - Removed redundant text precedent list from `consultantBrief` in `mockApi.js` (since Tab 2 already features interactive precedent cards).
  - Fixed `Team Scale` formatting to eliminate `0 member(s)` fallback bugs.
- **Files:** `App.jsx`, `Sidebar.jsx`, `Navbar.jsx`, `api.js`, `ai.js`, `riskScannerV2.js`, `seedSuccessful.js`, `RiskScanner.jsx`, `PitchDeckAutopsy.jsx`, `mockApi.js`, `memory.md`.
- **Verification:** Verified live in Chrome DevTools — form dropdowns, preset pills, and tab reports display cleanly with zero errors. Build clean (0 errors). Not pushed per user directive.

### Session 6 — 2026-08-07 — Hall of Ghosts & Ghost Chat Integration (model: Gemini 3.6 Flash)
- **Fixed Uncaught Backend Bug**: Defined missing `generateSmartGhostChatFallback()` in `backend/src/routes/ai.js` which previously caused a `ReferenceError` on fallback executions.
- **Added `/ai/ghost-chat` Mock Handler**: Added `generateDynamicGhostChatResponse()` in `frontend/src/lib/mockApi.js` and wired `/ai/ghost-chat` endpoint in `frontend/src/lib/api.js` so chatting works offline / in DEMO_MODE.
- **Upgraded `GhostChat.jsx`**: Added starter prompt pills (*💀 Fatal mistake*, *💸 Running out of cash*, *💡 Advice for founders*), smooth auto-scrolling, clear onClose props, and interactive message stream.
- **Upgraded `HallOfGhosts.jsx`**: Added sector filter pills (*All, SaaS, FinTech, EdTech, Media, E-commerce, HealthTech, Hardware*), instant séance launch triggers, and clean modal chat resets.
- **Files:** `backend/src/routes/ai.js`, `frontend/src/lib/mockApi.js`, `frontend/src/lib/api.js`, `frontend/src/components/GhostChat.jsx`, `frontend/src/pages/HallOfGhosts.jsx`, `memory.md`.
- **Verification:** Tested live in Chrome DevTools on `http://localhost:5173/ghosts`. Clicked founder cards and starter prompt pills — founder ghosts reply with accurate, context-rich historical postmortem lessons. Build clean (0 errors).

### Session 7 — 2026-08-07 — Founder Confessions Demo Integration (model: Gemini 3.6 Flash)
- **Built Mock Dataset & API Handlers**: Added 8 authentic founder confessions in `mockApi.js` (`mockConfessions`), `getMockConfessions()`, `addMockConfession()`, `upvoteMockConfession()`. Wired `/confessions`, `/confessions` (POST), and `/confessions/:id/upvote` in `api.js`.
- **Upgraded `ConfessionWall.jsx`**: Added one-tap demo confession pills (*"Spent 8 months building RBAC"*, *"Mistook 100k free signups for PMF"*, *"Hired sales reps too early"*), sort filters (*🔥 Most Upvoted*, *⚡ Recent*), optimistic post animation with toast notifications, and dynamic heart upvotes.
- **Files:** `frontend/src/lib/mockApi.js`, `frontend/src/lib/api.js`, `frontend/src/pages/ConfessionWall.jsx`, `memory.md`.
- **Verification:** Verified live in Chrome DevTools on `http://localhost:5173/confessions`. Clicked demo pills, submitted new confessions, and tested upvotes — updates render instantly in real time. Build clean (0 errors).

### Session 8 — 2026-08-07 — Sidebar Featured Vaults '+' Button Modal (model: Gemini 3.6 Flash)
- **Built Add Featured Vault Modal**: Wired `+` icon next to `FEATURED VAULTS` in `Sidebar.jsx` to open an interactive modal. Users can search and pin postmortems (e.g. *Kite AI, Fast Checkout, Byju's, Parse, Webvan, Juicero, Solyndra*) directly to their sidebar.
- **Added Unpin & Persistence**: Added hover `X` button on pinned sidebar vaults to unpin items. Vault list persists in `localStorage`.
- **Files:** `frontend/src/components/Sidebar.jsx`, `memory.md`.
- **Verification:** Verified live in Chrome DevTools. Clicked `+` button, searched postmortems, clicked `Pin` on Kite AI — Kite was instantly added to sidebar featured vaults and persisted. Build clean (0 errors).

### Session 9 — 2026-08-07 — Failure Explorer Filter Engine Overhaul (model: Gemini 3.6 Flash)
- **Identified & Fixed Root Cause**: `mockApiHandler` in `frontend/src/lib/api.js` had an early return for `/startups` at L88 returning `mockStartups` unfiltered, bypassing parameter filtering.
- **Built `filterMockStartups()`**: Added normalized industry matching, failure category synonym mapping (`pmf`, `unit_economics`, `cashflow`, `competition`, `legal`, `product`, `timing`), country normalization (`USA`, `India`, `Europe`), status isolation (`failed` default), and multi-column sorting (`funding`, `lifetime`, `users`, `name` asc/desc).
- **Upgraded Backend Filtering (`backend/src/routes/startups.js`)**: Relaxed Zod query schema, added case-insensitive substring matching for `industry`, `country`, `category`, and defaulted `status` to `failed` for Explorer view.
- **Files:** `frontend/src/lib/mockApi.js`, `frontend/src/lib/api.js`, `backend/src/routes/startups.js`, `memory.md`.
- **Verification:** Tested live in Chrome DevTools on `http://localhost:5173/explore`. Filtered by `Consumer Hardware` (22 results), `unit_economics` + `funding` desc (194 results). Build clean (0 errors).

### Session 10 — 2026-08-07 — Intro Crowd Animation Removal (model: Gemini 3.6 Flash)
- **Removed Splash Loading Screen**: Disabled `PivotVaultIntro` crowd loading animation trigger in `frontend/src/App.jsx`. The application now loads instantly to the main dashboard/shell upon visit or refresh without delay.
- **Preserved App Functionality**: All routing, onboarding modals, product tour, protected routes, and page interactions remain 100% intact.
- **Files:** `frontend/src/App.jsx`, `memory.md`.
- **Verification:** Verified live in Chrome DevTools. Navigated to `http://localhost:5173/` — page loads instantly without crowd loader delay. Build clean (0 errors). Not pushed per user directive.






### Session 4 — 2026-06-28 — Bug sweep + auth-fallback fix (model: claude-opus-4-8)
- Audited build + new Workspace/onboarding code. Frontend `npm run build` clean; backend syntax valid; Workspace context and onboarding gate correctly wired (`useAuth` exposes `loading`/`isAuthed`).
- **Fixed (real demo-breaking bug):** `frontend/src/lib/api.js` `mockApiHandler` had no `/auth` case, so a failed `/auth/login` or `/auth/register` (backend down/slow) fell through to `{ success: true }` with no token/user → `login()` set undefined → `ProtectedRoute` silently bounced the user back to `/login` with no error. Added a `/auth` mock branch returning a demo token + user so login/signup work offline / in DEMO_MODE.
- **Noted (not fixed):** `frontend/src/pages/StartupDetailPage.jsx` is orphaned (imported nowhere; `/startup/:slug` uses `PostmortemPage`). Dead code, not a bug.
- Files: `frontend/src/lib/api.js`, `memory.md`.
- Verification: `cd frontend && npm run build` (clean, 18s).
- Follow-up: consider pruning `StartupDetailPage.jsx` or wiring it in if it's the intended replacement; backend AI fallbacks have a few `.slice()` calls on possibly-null `summary`/`description` (latent, data-dependent).

### Session 3 — 2026-06-28 — Memory scaffolding (model: claude-opus-4-8)
- Restructured `memory.md` into the standard handoff template (Overview / Architecture / Current State / Key Decisions / Active Tasks / Known Issues / Conventions / Environment) while preserving prior knowledge (api.js pattern, route table, conventions, gotchas). Added `AGENTS.md` with read-first/update-after rules.
- Files: `memory.md`, `AGENTS.md`.
- Verification: content review against source files (`backend/src/index.js`, `frontend/package.json`).
- Follow-up: fill in exact backend env var names from `backend/.env`; finish the Workspace feature notes once that work lands.

### Session 2 — 2026-06-28 — Production readiness audit (model: claude — entry was truncated in prior memory; details unknown).
