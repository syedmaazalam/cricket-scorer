# Graph Report - cricket-scorer  (2026-11-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 266 nodes · 917 edges · 18 communities (13 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c05d5c1`
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
- postcss.config.js
- tailwind.config.js
- FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes

## God Nodes (most connected - your core abstractions)
1. `Scoring()` - 39 edges
2. `react` - 36 edges
3. `lucide-react` - 33 edges
4. `Live()` - 29 edges
5. `computeInningsStats()` - 28 edges
6. `formatOvers()` - 25 edges
7. `applyEvent()` - 23 edges
8. `DeveloperDashboard()` - 23 edges
9. `useMatch()` - 22 edges
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
- `Scoring()` --calls--> `OverthrowModal()`  [EXTRACTED]
  src/pages/Scoring.jsx → src/components/OverthrowModal.jsx

## Import Cycles
- None detected.

## Communities (18 total, 5 thin omitted)

### Community 0 - "Scoring.jsx"
Cohesion: 0.16
Nodes (33): vitest, EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES, calculatePlayerPoints(), getTopPlayers(), POINTING_CRITERIA (+25 more)

### Community 1 - "reducer.js"
Cohesion: 0.12
Nodes (35): firebase, setAbdullahMessagesEnabled(), AuthModal(), DeveloperScorerChatModal(), DeveloperWatchAndChatModal(), ThemeToggle(), auth, ensureAnonymousAuth() (+27 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (34): dependencies, firebase, html2canvas, lucide-react, react, react-dom, vitest, devDependencies (+26 more)

### Community 3 - "package.json"
Cohesion: 0.17
Nodes (27): ActionLogsModal(), load(), getActionLogsFromCloud(), subscribeToMatchDoc(), subscribeToMatchEvents(), updateMatchHeartbeat(), deleteAllMatchesLocally(), deleteMatchLocally() (+19 more)

### Community 4 - "useMatch.js"
Cohesion: 0.15
Nodes (13): lucide-react, react, BatterDetailsModal(), BowlerModal(), InningsBreakModal(), NewBatterModal(), OverthrowModal(), PointingCriteriaModal() (+5 more)

### Community 5 - "ErrorBoundary"
Cohesion: 0.23
Nodes (14): App(), resolveLiveCode(), AbdullahMotivationModal(), isAbdullah(), isAbdullahMessagesEnabled(), isBrother(), isBrotherMessagesEnabled, isHassan() (+6 more)

### Community 6 - "QA Engineering & Cricket Rules Audit Report"
Cohesion: 0.42
Nodes (6): MatchCharts(), calculateCRR(), calculateRRR(), checkBattingMilestone(), checkBowlerHatTrick(), MatchSummary()

### Community 8 - "FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes"
Cohesion: 0.31
Nodes (8): AddPreviousOverBallModal(), CelebrationModal(), EditBallModal(), PlayersHeadToHead(), WicketModal(), formatOvers(), getScoreAtLegalBalls(), Scoring()

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
Cohesion: 0.50
Nodes (3): Chunks, Developer Auth ("Silicon123@"), Abdullah Motivational Messages & Scorer Chat, Overview

### Community 13 - "postcss.config.js"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **6 isolated node(s):** `autoprefixer`, `oxlint`, `postcss`, `tailwindcss`, `@types/react` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 67 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useMatch.js` to `Scoring.jsx`, `reducer.js`, `package.json`, `package.json`, `ErrorBoundary`, `QA Engineering & Cricket Rules Audit Report`, `.oxlintrc.json`, `FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes`, `tailwind.config.js`, `FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `oxlint`, `postcss` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `reducer.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12424242424242424 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `useMatch.js` to `Scoring.jsx`, `reducer.js`, `package.json`, `package.json`, `ErrorBoundary`, `QA Engineering & Cricket Rules Audit Report`, `FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes`, `tailwind.config.js`, `FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Why does `Scoring()` connect `FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes` to `Scoring.jsx`, `reducer.js`, `package.json`, `useMatch.js`, `ErrorBoundary`, `QA Engineering & Cricket Rules Audit Report`, `tailwind.config.js`, `FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `useMatch.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14666666666666667 - nodes in this community are weakly interconnected._