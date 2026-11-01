# Top Bar Responsive Redesign, Blue 10+ Over Bars & Blue Singles/Doubles Balls

## Overview
1. Completely responsive top bar in `Scoring.jsx` and `Live.jsx`:
   - Remove team names pill from the top bar.
   - Keep a single Live badge on the top (the dynamic sync badge).
   - Move Share and Light/Dark Theme toggle inside the three-dots dropdown menu.
2. Update `MatchCharts.jsx` so 10+ runs over bars are colored Blue (`#2563EB` / `#3B82F6`).
3. In current over deliveries, change background of singles and doubles (1 & 2 runs) to Blue with white text.

## Chunks

- [x] **Chunk 1: Top Bar Responsiveness & Decluttering**
  - Remove team names pill and duplicate static live pill from `Scoring.jsx` top bar (keep only single `SyncBadge`).
  - Move Share and ThemeToggle buttons inside the three-dots dropdown menu.
  - Ensure top bar never overflows or clips buttons on any screen size.
  - Apply matching responsive layout to `Live.jsx`.

- [x] **Chunk 2: Blue 10+ Over Bars & Blue Singles/Doubles Balls**
  - Update `src/index.css` to set `--chart-high` to blue (`#2563EB` / `#3B82F6`) and `--ball-run-bg` to blue.
  - Update `src/components/MatchCharts.jsx` so 10+ runs overs and legend show Blue.
  - Update `src/pages/Scoring.jsx` and `src/pages/Live.jsx` current over deliveries to render singles and doubles in blue.

- [x] **Chunk 3: Verification, Automated Tests, Build & Deploy**
  - Update tests in `src/tests/developer_console_and_scores.test.js`.
  - Run `npx vitest run` (all 84 tests passing).
  - Run `npm run build` and deploy to Firebase Hosting (`npx firebase-tools deploy --only hosting`).
  - Run `/graphify . --update`.
