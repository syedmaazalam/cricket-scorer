# QA Remediation: Scorer Chat, Developer Soft-Delete & Spectator UI Polish

## Overview
Remediate the two defects and two UI observations discovered in the automated Argon QA audit:
- **DEF-01 (High)**: Add soft-delete ("Delete" button with confirmation) on Developer Dashboard match cards to set match status to `'inactive'`.
- **DEF-02 (High)**: Wire the chat button in the Scorer header to open `DeveloperScorerChatModal` with unread badge counter.
- **OBS-01 (Polish)**: In `Live.jsx`, house Share and Theme Toggle inside the three-dots (More) menu.
- **OBS-02 (Polish)**: Embed `MatchCharts` into `MatchSummary.jsx` for post-match visual progression.
- **Graph Polish**: In `OversGraph.jsx`, ensure overs with 10+ runs that also have wickets preserve the prominent royal blue bar with red W badge.

## Chunks

- [x] **Chunk 1: Scorer Header Chat Binding & Unread Counter (DEF-02)**
  - Ensure the chat icon in `src/pages/Scoring.jsx` header is interactive and toggles `DeveloperScorerChatModal`.
  - Display unread indicator on the chat icon when developer messages arrive.
  - Verify chat drawer opens and permits two-way reply.

- [x] **Chunk 2: Developer Console Soft Delete Action (DEF-01)**
  - Add a "Delete" button on each match card/row in `src/pages/DeveloperDashboard.jsx`.
  - Wire to a confirmation dialog that soft-deletes the match by setting `status = 'inactive'`.
  - Exclude inactive matches from active live lists while preserving full audit record.

- [x] **Chunk 3: Spectator Three-Dots Menu & Summary Charts (OBS-01, OBS-02, Polish)**
  - Move Share and Theme toggle into a three-dots popover menu in `src/pages/Live.jsx`.
  - Embed Manhattan & Worm charts in `src/pages/MatchSummary.jsx`.
  - Retain blue `#2563EB` fill on 10+ run overs that also contain wickets in `src/components/OversGraph.jsx`.

- [x] **Chunk 4: Automated Tests, Full Verification, Build & Deploy**
  - Add unit tests for Scorer chat toggle, soft-delete action, and three-dots menu.
  - Run `npx vitest run` (all tests passing) and `npm run build`.
  - Deploy to Firebase Hosting (`https://smartcricket-c79b5.web.app`) and update Graphify.
