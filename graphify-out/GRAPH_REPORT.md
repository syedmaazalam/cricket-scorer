# Graph Report - cricket-scorer  (2026-11-01)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 265 nodes · 908 edges · 21 communities (18 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da767619`
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
- ActionLogsModal.jsx
- Developer Auth ("Silicon123@"), Abdullah Motivational Messages & Scorer Chat
- React + Vite

## God Nodes (most connected - your core abstractions)
1. `Scoring()` - 39 edges
2. `react` - 36 edges
3. `lucide-react` - 33 edges
4. `Live()` - 29 edges
5. `computeInningsStats()` - 28 edges
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
- `Scoring()` --calls--> `AddPreviousOverBallModal()`  [EXTRACTED]
  src/pages/Scoring.jsx → src/components/AddPreviousOverBallModal.jsx
- `Scoring()` --calls--> `EditBallModal()`  [EXTRACTED]
  src/pages/Scoring.jsx → src/components/EditBallModal.jsx

## Import Cycles
- None detected.

## Communities (21 total, 3 thin omitted)

### Community 0 - "Scoring.jsx"
Cohesion: 0.14
Nodes (31): vitest, AddPreviousOverBallModal(), EditBallModal(), OverthrowModal(), RunPad(), WicketModal(), EVENT_TYPES, EXTRA_TYPES (+23 more)

### Community 1 - "reducer.js"
Cohesion: 0.06
Nodes (34): dependencies, firebase, html2canvas, lucide-react, react, react-dom, vitest, devDependencies (+26 more)

### Community 2 - "package.json"
Cohesion: 0.22
Nodes (14): firebase, DeveloperScorerChatModal(), DeveloperWatchAndChatModal(), auth, firebaseConfig, createMatchInCloud(), deleteAllMatchesFromCloud(), deleteMatchFromCloud() (+6 more)

### Community 3 - "package.json"
Cohesion: 0.22
Nodes (19): App(), resolveLiveCode(), BatterDetailsModal(), BottomNavBar(), BowlerModal(), InningsBreakModal(), MatchCharts(), NewBatterModal() (+11 more)

### Community 4 - "useMatch.js"
Cohesion: 0.26
Nodes (15): ensureAnonymousAuth(), deleteAllMatchesLocally(), deleteMatchLocally(), getAllLocalManagers(), getEventsForMatch(), getMatchSnapshot(), getUnsyncedEvents(), markEventSynced() (+7 more)

### Community 5 - "ErrorBoundary"
Cohesion: 0.33
Nodes (3): lucide-react, react, ScoreAnimation()

### Community 6 - "QA Engineering & Cricket Rules Audit Report"
Cohesion: 0.36
Nodes (7): CelebrationModal(), PlayersHeadToHead(), calculateCRR(), calculateRRR(), checkBattingMilestone(), checkBowlerHatTrick(), formatOvers()

### Community 8 - "FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes"
Cohesion: 0.33
Nodes (9): setAbdullahMessagesEnabled(), generateMatchCode(), getAllManagersFromCloud(), getAllMatchesFromCloud(), checkIsDeveloper(), DeveloperDashboard(), sanitizeString(), Setup() (+1 more)

### Community 9 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (9): AuthModal(), deriveMatchDisplayScore(), getMatchStatusMeta(), saveManagerProfileToCloud(), searchMatches(), Home(), loadMatches(), getAllLocalMatches() (+1 more)

### Community 10 - "React + Vite"
Cohesion: 0.29
Nodes (9): AbdullahMotivationModal(), isAbdullah(), isAbdullahMessagesEnabled(), isBrother(), isBrotherMessagesEnabled, isHassan(), isHassanMessagesEnabled, setBrotherMessagesEnabled (+1 more)

### Community 11 - "tailwind.config.js"
Cohesion: 0.53
Nodes (8): doesBatterEarnRuns(), isBowlerWicket(), computeBatterDetails(), computeBowlerDetails(), computeInningsStats(), createBattingStat(), createBowlingStat(), MatchSummary()

### Community 12 - "postcss.config.js"
Cohesion: 0.40
Nodes (9): saveActionLogToCloud(), subscribeToMatchDoc(), subscribeToMatchEvents(), updateMatchHeartbeat(), saveActionLogLocally(), createEventId(), getDeviceId(), subscribeSyncStatus() (+1 more)

### Community 13 - "postcss.config.js"
Cohesion: 0.29
Nodes (6): 100-Match Randomized Simulation Verification, Cricket Rules Assumptions & Standards (MCC Laws of Cricket), Executive Summary, Pass / Fail Summary Table, Production Deployment, QA Engineering & Cricket Rules Audit Report

### Community 14 - "tailwind.config.js"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 15 - "FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes"
Cohesion: 0.40
Nodes (4): Deployment & Verification, FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes, Issue Resolution Table, Responsive Layout Matrix Verification

### Community 16 - "ActionLogsModal.jsx"
Cohesion: 0.80
Nodes (4): ActionLogsModal(), load(), getActionLogsFromCloud(), getActionLogsLocally()

### Community 17 - "Developer Auth ("Silicon123@"), Abdullah Motivational Messages & Scorer Chat"
Cohesion: 0.50
Nodes (3): Chunks, Developer Auth ("Silicon123@"), Abdullah Motivational Messages & Scorer Chat, Overview

### Community 18 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **6 isolated node(s):** `autoprefixer`, `oxlint`, `postcss`, `tailwindcss`, `@types/react` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 67 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `ErrorBoundary` to `Scoring.jsx`, `reducer.js`, `package.json`, `package.json`, `QA Engineering & Cricket Rules Audit Report`, `.oxlintrc.json`, `FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes`, `.oxlintrc.json`, `React + Vite`, `tailwind.config.js`, `postcss.config.js`, `ActionLogsModal.jsx`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **What connects `autoprefixer`, `oxlint`, `postcss` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Scoring.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1396854764107308 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `ErrorBoundary` to `Scoring.jsx`, `reducer.js`, `package.json`, `package.json`, `QA Engineering & Cricket Rules Audit Report`, `.oxlintrc.json`, `FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes`, `.oxlintrc.json`, `React + Vite`, `tailwind.config.js`, `ActionLogsModal.jsx`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Should `reducer.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Why does `Scoring()` connect `package.json` to `Scoring.jsx`, `package.json`, `ErrorBoundary`, `QA Engineering & Cricket Rules Audit Report`, `React + Vite`, `tailwind.config.js`, `ActionLogsModal.jsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._