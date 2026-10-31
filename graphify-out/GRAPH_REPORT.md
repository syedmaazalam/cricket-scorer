# Graph Report - cricket-scorer  (2026-10-31)

## Corpus Check
- 56 files · ~59,221 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 3, .css 2, .example 1)

## Summary
- 242 nodes · 817 edges · 13 communities (10 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `328cc434`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Scoring.jsx
- reducer.js
- package.json
- matches.js
- QA Engineering & Cricket Rules Audit Report
- ErrorBoundary
- FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes
- Fix Incomplete Match Showing as "COMPLETED" in Developer Console
- React + Vite
- .oxlintrc.json
- matches.js

## God Nodes (most connected - your core abstractions)
1. `react` - 31 edges
2. `lucide-react` - 28 edges
3. `Scoring()` - 28 edges
4. `computeInningsStats()` - 27 edges
5. `applyEvent()` - 23 edges
6. `formatOvers()` - 23 edges
7. `Live()` - 22 edges
8. `useMatch()` - 22 edges
9. `DeveloperDashboard()` - 18 edges
10. `replayEvents()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Bug Table & Root Cause Fixes` --references--> `getTopPlayers()`  [INFERRED]
  TEST_REPORT.md → src/engine/potm.js
- `Bug Table & Root Cause Fixes` --references--> `isWicketValidOnNoBall()`  [INFERRED]
  TEST_REPORT.md → src/engine/rules.js
- `Bug Table & Root Cause Fixes` --references--> `isWicketValidOnWide()`  [INFERRED]
  TEST_REPORT.md → src/engine/rules.js
- `App()` --calls--> `Live()`  [EXTRACTED]
  src/App.jsx → src/pages/Live.jsx
- `App()` --calls--> `MatchSummary()`  [EXTRACTED]
  src/App.jsx → src/pages/MatchSummary.jsx

## Import Cycles
- None detected.

## Communities (13 total, 3 thin omitted)

### Community 0 - "Scoring.jsx"
Cohesion: 0.17
Nodes (30): lucide-react, react, AddPreviousOverBallModal(), BatterDetailsModal(), BottomNavBar(), BowlerModal(), CelebrationModal(), InningsBreakModal() (+22 more)

### Community 1 - "reducer.js"
Cohesion: 0.17
Nodes (29): vitest, WicketModal(), EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES, calculatePlayerPoints(), applyEvent() (+21 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (34): dependencies, firebase, html2canvas, lucide-react, react, react-dom, vitest, devDependencies (+26 more)

### Community 3 - "matches.js"
Cohesion: 0.13
Nodes (31): ActionLogsModal(), load(), auth, ensureAnonymousAuth(), firebaseConfig, getActionLogsFromCloud(), saveActionLogToCloud(), subscribeToMatchDoc() (+23 more)

### Community 4 - "QA Engineering & Cricket Rules Audit Report"
Cohesion: 0.29
Nodes (6): 100-Match Randomized Simulation Verification, Cricket Rules Assumptions & Standards (MCC Laws of Cricket), Executive Summary, Pass / Fail Summary Table, Production Deployment, QA Engineering & Cricket Rules Audit Report

### Community 6 - "FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes"
Cohesion: 0.40
Nodes (4): Deployment & Verification, FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes, Issue Resolution Table, Responsive Layout Matrix Verification

### Community 7 - "Fix Incomplete Match Showing as "COMPLETED" in Developer Console"
Cohesion: 0.50
Nodes (3): Chunks, Fix Incomplete Match Showing as "COMPLETED" in Developer Console, Root Cause

### Community 8 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

### Community 9 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 10 - "matches.js"
Cohesion: 0.16
Nodes (28): firebase, App(), resolveLiveCode(), AuthModal(), ThemeToggle(), createMatchInCloud(), deleteAllMatchesFromCloud(), deleteMatchFromCloud() (+20 more)

## Knowledge Gaps
- **6 isolated node(s):** `@types/react`, `@types/react-dom`, `autoprefixer`, `oxlint`, `postcss` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 64 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Scoring.jsx` to `reducer.js`, `package.json`, `matches.js`, `ErrorBoundary`, `matches.js`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `autoprefixer` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Scoring.jsx` to `matches.js`, `reducer.js`, `package.json`, `matches.js`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `matches.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13363363363363365 - nodes in this community are weakly interconnected._