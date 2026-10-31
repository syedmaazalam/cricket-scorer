# Developer Watch & Chat, Chart Colors, Light Theme Contrast, Default Route & Soft Deletion

## Overview
Implement:
1. Always open directly to the main page (`home`) when opening the web without query parameters.
2. Fix contrast in light theme for current over score 1 and 2 balls (high-contrast background and text).
3. Fix graph colors in `MatchCharts.jsx` so Normal Over (<10 runs) and 10+ Runs Over have distinct colors.
4. Soft delete for developer messages: set `status: 'inactive'` without hard deleting from Firestore.
5. Allow developer to watch match and chat simultaneously in the same developer section, plus chat while watching in Live view.

## Chunks

- [x] **Chunk 1: Default to Main Page on Web Open & Light Theme Ball Contrast**
  - Update `src/App.jsx` to default directly to `page: 'home'` when no query parameters are present.
  - Update `src/index.css`, `src/pages/Scoring.jsx`, and `src/pages/Live.jsx` to provide high-contrast background and text for scores 1 and 2 in light and dark themes.

- [x] **Chunk 2: Graph Colors for Normal Over vs 10+ Over**
  - Update `src/index.css` and `src/components/MatchCharts.jsx` so Normal Over (<10 runs) uses `--chart-normal` (#2563EB / #3B82F6) and 10+ Runs Over uses `--chart-high` (#16A34A / #22C55E).
  - Update graph bars, tooltip, and legend items.

- [x] **Chunk 3: Message Soft Deletion (Status Inactive)**
  - Add `setMatchMessageInactive` in `src/firebase/matches.js` updating message `status: 'inactive'`.
  - In `src/components/DeveloperScorerChatModal.jsx`, add trash/delete button for developer role that sets `status: 'inactive'`.
  - Filter or mark inactive messages so deleted messages are handled gracefully without removing documents.

- [x] **Chunk 4: Developer Watch & Chat in Same Section & Live Screen Chat**
  - In `src/pages/DeveloperDashboard.jsx`, add "Watch & Chat" modal/section displaying live match score, overs, batters, bowler, ball strip, alongside live chat with scorer.
  - In `src/pages/Live.jsx`, allow developer to chat with scorer while watching live by showing the Chat button when developer is logged in.

- [x] **Chunk 5: Full Test Suite, Build & Firebase Deployment**
  - Add tests in `src/tests/developer_console_and_scores.test.js`.
  - Run `npx vitest run` to ensure all tests pass (83/83 passed).
  - Run `npm run build` and deploy to Firebase Hosting (`npx firebase-tools deploy`).
  - Run `/graphify . --update`.
