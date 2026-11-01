# Graph Report - cricket-scorer  (2026-11-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 263 nodes · 895 edges · 15 communities (12 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e7ec6a08`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Scoring.jsx
- reducer.js
- package.json
- package.json
- useMatch.js
- ErrorBoundary
- QA Engineering & Cricket Rules Audit Report
- .oxlintrc.json
- FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes
- .oxlintrc.json
- React + Vite
- tailwind.config.js
- postcss.config.js

## God Nodes (most connected - your core abstractions)
1. `Scoring()` - 37 edges
2. `react` - 36 edges
3. `lucide-react` - 33 edges
4. `computeInningsStats()` - 28 edges
5. `Live()` - 27 edges
6. `formatOvers()` - 25 edges
7. `applyEvent()` - 23 edges
8. `useMatch()` - 22 edges
9. `DeveloperDashboard()` - 22 edges
10. `replayEvents()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Bug Table & Root Cause Fixes` --references--> `getTopPlayers()`  [INFERRED]
  TEST_REPORT.md → src/engine/potm.js
- `Bug Table & Root Cause Fixes` --references--> `isWicketValidOnNoBall()`  [INFERRED]
  TEST_REPORT.md → src/engine/rules.js
- `Bug Table & Root Cause Fixes` --references--> `isWicketValidOnWide()`  [INFERRED]
  TEST_REPORT.md → src/engine/rules.js
- `DeveloperDashboard()` --indirect_call--> `isAbdullahMessagesEnabled()`  [INFERRED]
  src/pages/DeveloperDashboard.jsx → src/components/AbdullahMotivationModal.jsx
- `App()` --calls--> `Live()`  [EXTRACTED]
  src/App.jsx → src/pages/Live.jsx

## Import Cycles
- None detected.

## Communities (15 total, 3 thin omitted)

### Community 0 - "Scoring.jsx"
Cohesion: 0.09
Nodes (54): firebase, App(), resolveLiveCode(), AuthModal(), auth, ensureAnonymousAuth(), firebaseConfig, createMatchInCloud() (+46 more)

### Community 1 - "reducer.js"
Cohesion: 0.13
Nodes (35): lucide-react, react, AddPreviousOverBallModal(), BatterDetailsModal(), BottomNavBar(), BowlerModal(), CelebrationModal(), EditBallModal() (+27 more)

### Community 2 - "package.json"
Cohesion: 0.21
Nodes (26): vitest, EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES, calculatePlayerPoints(), getTopPlayers(), POINTING_CRITERIA (+18 more)

### Community 3 - "package.json"
Cohesion: 0.06
Nodes (34): dependencies, firebase, html2canvas, lucide-react, react, react-dom, vitest, devDependencies (+26 more)

### Community 4 - "useMatch.js"
Cohesion: 0.21
Nodes (11): AbdullahMotivationModal(), isAbdullah(), isAbdullahMessagesEnabled(), isBrother(), isBrotherMessagesEnabled, isHassan(), isHassanMessagesEnabled, setAbdullahMessagesEnabled() (+3 more)

### Community 6 - "QA Engineering & Cricket Rules Audit Report"
Cohesion: 0.54
Nodes (5): DeveloperScorerChatModal(), DeveloperWatchAndChatModal(), sendMatchMessage(), setMatchMessageInactive(), subscribeMatchMessages()

### Community 7 - ".oxlintrc.json"
Cohesion: 0.29
Nodes (6): 100-Match Randomized Simulation Verification, Cricket Rules Assumptions & Standards (MCC Laws of Cricket), Executive Summary, Pass / Fail Summary Table, Production Deployment, QA Engineering & Cricket Rules Audit Report

### Community 8 - "FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 9 - ".oxlintrc.json"
Cohesion: 0.40
Nodes (4): Deployment & Verification, FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes, Issue Resolution Table, Responsive Layout Matrix Verification

### Community 10 - "React + Vite"
Cohesion: 0.80
Nodes (4): ActionLogsModal(), load(), getActionLogsFromCloud(), getActionLogsLocally()

### Community 11 - "tailwind.config.js"
Cohesion: 0.50
Nodes (3): Chunks, Developer Auth ("Silicon123@"), Abdullah Motivational Messages & Scorer Chat, Overview

### Community 12 - "postcss.config.js"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **6 isolated node(s):** `autoprefixer`, `oxlint`, `postcss`, `tailwindcss`, `@types/react` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 67 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `reducer.js` to `Scoring.jsx`, `package.json`, `useMatch.js`, `ErrorBoundary`, `QA Engineering & Cricket Rules Audit Report`, `React + Vite`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `oxlint`, `postcss` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Scoring.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09474206349206349 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `reducer.js` to `Scoring.jsx`, `package.json`, `useMatch.js`, `QA Engineering & Cricket Rules Audit Report`, `React + Vite`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `reducer.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12768361581920903 - nodes in this community are weakly interconnected._
- **Why does `Scoring()` connect `reducer.js` to `Scoring.jsx`, `package.json`, `useMatch.js`, `QA Engineering & Cricket Rules Audit Report`, `React + Vite`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._