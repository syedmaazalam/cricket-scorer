# Graph Report - cricket-scorer  (2026-11-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 253 nodes · 869 edges · 17 communities (15 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a8a27d3c`
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
- Developer Auth ("Silicon123@"), Abdullah Motivational Messages & Scorer Chat
- React + Vite

## God Nodes (most connected - your core abstractions)
1. `Scoring()` - 34 edges
2. `react` - 34 edges
3. `lucide-react` - 31 edges
4. `computeInningsStats()` - 27 edges
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
- `Scoring()` --calls--> `AddPreviousOverBallModal()`  [EXTRACTED]
  src/pages/Scoring.jsx → src/components/AddPreviousOverBallModal.jsx

## Import Cycles
- None detected.

## Communities (17 total, 2 thin omitted)

### Community 0 - "Scoring.jsx"
Cohesion: 0.15
Nodes (36): lucide-react, react, AbdullahMotivationModal(), isAbdullah(), isAbdullahMessagesEnabled(), BatterDetailsModal(), BottomNavBar(), BowlerModal() (+28 more)

### Community 1 - "reducer.js"
Cohesion: 0.17
Nodes (27): vitest, AddPreviousOverBallModal(), WicketModal(), EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES, calculatePlayerPoints() (+19 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (34): dependencies, firebase, html2canvas, lucide-react, react, react-dom, vitest, devDependencies (+26 more)

### Community 3 - "package.json"
Cohesion: 0.22
Nodes (21): subscribeToMatchDoc(), subscribeToMatchEvents(), updateMatchHeartbeat(), deleteAllMatchesLocally(), deleteMatchLocally(), getEventsForMatch(), getMatchSnapshot(), getUnsyncedEvents() (+13 more)

### Community 4 - "useMatch.js"
Cohesion: 0.14
Nodes (9): react-dom, App(), resolveLiveCode(), ErrorBoundary, createMatchInCloud(), findMatchByCode(), generateMatchCode(), resolve() (+1 more)

### Community 5 - "ErrorBoundary"
Cohesion: 0.22
Nodes (13): firebase, AuthModal(), auth, ensureAnonymousAuth(), firebaseConfig, deleteAllMatchesFromCloud(), deleteMatchFromCloud(), sanitizeForFirestore() (+5 more)

### Community 6 - "QA Engineering & Cricket Rules Audit Report"
Cohesion: 0.42
Nodes (8): setAbdullahMessagesEnabled(), getAllManagersFromCloud(), getAllMatchesFromCloud(), checkIsDeveloper(), DeveloperDashboard(), sanitizeString(), getAllLocalManagers(), saveEventLocally()

### Community 7 - ".oxlintrc.json"
Cohesion: 0.67
Nodes (5): DeveloperScorerChatModal(), DeveloperWatchAndChatModal(), sendMatchMessage(), setMatchMessageInactive(), subscribeMatchMessages()

### Community 8 - "FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes"
Cohesion: 0.52
Nodes (6): deriveMatchDisplayScore(), getMatchStatusMeta(), searchMatches(), Home(), loadMatches(), getAllLocalMatches()

### Community 9 - ".oxlintrc.json"
Cohesion: 0.29
Nodes (6): 100-Match Randomized Simulation Verification, Cricket Rules Assumptions & Standards (MCC Laws of Cricket), Executive Summary, Pass / Fail Summary Table, Production Deployment, QA Engineering & Cricket Rules Audit Report

### Community 10 - "React + Vite"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 11 - "tailwind.config.js"
Cohesion: 0.40
Nodes (4): Deployment & Verification, FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes, Issue Resolution Table, Responsive Layout Matrix Verification

### Community 12 - "postcss.config.js"
Cohesion: 0.80
Nodes (4): ActionLogsModal(), load(), getActionLogsFromCloud(), getActionLogsLocally()

### Community 13 - "Developer Auth ("Silicon123@"), Abdullah Motivational Messages & Scorer Chat"
Cohesion: 0.50
Nodes (3): Chunks, Developer Auth ("Silicon123@"), Abdullah Motivational Messages & Scorer Chat, Overview

### Community 14 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **6 isolated node(s):** `autoprefixer`, `oxlint`, `postcss`, `tailwindcss`, `@types/react` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 63 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Scoring.jsx` to `reducer.js`, `package.json`, `package.json`, `useMatch.js`, `ErrorBoundary`, `QA Engineering & Cricket Rules Audit Report`, `.oxlintrc.json`, `FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes`, `postcss.config.js`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `oxlint`, `postcss` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Scoring.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1455289304500292 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Scoring.jsx` to `reducer.js`, `package.json`, `useMatch.js`, `ErrorBoundary`, `QA Engineering & Cricket Rules Audit Report`, `.oxlintrc.json`, `FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes`, `postcss.config.js`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `useMatch.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._