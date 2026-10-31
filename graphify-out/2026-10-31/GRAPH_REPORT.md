# Graph Report - cricket-scorer  (2026-10-31)

## Corpus Check
- 56 files · ~58,770 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 3, .css 2, .example 1)

## Summary
- 241 nodes · 811 edges · 13 communities (10 shown, 3 thin omitted)
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
- Fix Cloud Sync, Public Match Search & Cross-Device Live Viewing
- React + Vite
- .oxlintrc.json
- ActionLogsModal.jsx

## God Nodes (most connected - your core abstractions)
1. `react` - 31 edges
2. `lucide-react` - 28 edges
3. `Scoring()` - 28 edges
4. `computeInningsStats()` - 27 edges
5. `applyEvent()` - 23 edges
6. `formatOvers()` - 23 edges
7. `Live()` - 22 edges
8. `useMatch()` - 22 edges
9. `replayEvents()` - 17 edges
10. `DeveloperDashboard()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Bug Table & Root Cause Fixes` --references--> `getTopPlayers()`  [INFERRED]
  TEST_REPORT.md → src/engine/potm.js
- `Bug Table & Root Cause Fixes` --references--> `isWicketValidOnNoBall()`  [INFERRED]
  TEST_REPORT.md → src/engine/rules.js
- `Bug Table & Root Cause Fixes` --references--> `isWicketValidOnWide()`  [INFERRED]
  TEST_REPORT.md → src/engine/rules.js
- `App()` --calls--> `createMatchInCloud()`  [EXTRACTED]
  src/App.jsx → src/firebase/matches.js
- `App()` --calls--> `DeveloperDashboard()`  [EXTRACTED]
  src/App.jsx → src/pages/DeveloperDashboard.jsx

## Import Cycles
- None detected.

## Communities (13 total, 3 thin omitted)

### Community 0 - "Scoring.jsx"
Cohesion: 0.14
Nodes (31): lucide-react, react, App(), resolveLiveCode(), AddPreviousOverBallModal(), BatterDetailsModal(), BottomNavBar(), BowlerModal() (+23 more)

### Community 1 - "reducer.js"
Cohesion: 0.16
Nodes (34): vitest, EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES, calculatePlayerPoints(), getTopPlayers(), POINTING_CRITERIA (+26 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (35): dependencies, firebase, html2canvas, lucide-react, react, react-dom, vitest, devDependencies (+27 more)

### Community 3 - "matches.js"
Cohesion: 0.10
Nodes (48): firebase, AuthModal(), auth, ensureAnonymousAuth(), firebaseConfig, createMatchInCloud(), deleteAllMatchesFromCloud(), deleteMatchFromCloud() (+40 more)

### Community 4 - "QA Engineering & Cricket Rules Audit Report"
Cohesion: 0.29
Nodes (6): 100-Match Randomized Simulation Verification, Cricket Rules Assumptions & Standards (MCC Laws of Cricket), Executive Summary, Pass / Fail Summary Table, Production Deployment, QA Engineering & Cricket Rules Audit Report

### Community 6 - "FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes"
Cohesion: 0.40
Nodes (4): Deployment & Verification, FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes, Issue Resolution Table, Responsive Layout Matrix Verification

### Community 7 - "Fix Cloud Sync, Public Match Search & Cross-Device Live Viewing"
Cohesion: 0.50
Nodes (3): Chunks, Fix Cloud Sync, Public Match Search & Cross-Device Live Viewing, Overview

### Community 8 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

### Community 9 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 10 - "ActionLogsModal.jsx"
Cohesion: 0.80
Nodes (4): ActionLogsModal(), load(), getActionLogsFromCloud(), getActionLogsLocally()

## Knowledge Gaps
- **6 isolated node(s):** `@types/react`, `@types/react-dom`, `autoprefixer`, `oxlint`, `postcss` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 64 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Scoring.jsx` to `matches.js`, `reducer.js`, `package.json`, `ActionLogsModal.jsx`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **What connects `@types/react`, `@types/react-dom`, `autoprefixer` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Scoring.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14415584415584415 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Scoring.jsx` to `matches.js`, `reducer.js`, `package.json`, `ActionLogsModal.jsx`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `matches.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10275689223057644 - nodes in this community are weakly interconnected._