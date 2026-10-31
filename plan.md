# Fix Incomplete Match Showing as "COMPLETED" in Developer Console

## Root Cause
In `DeveloperDashboard.jsx` (lines 435, 469, 1019, 1075), match status is evaluated as a strict binary:
`const isLive = m.status === 'live' || m.status === 'in_progress';`
`<span>{isLive ? 'LIVE' : 'COMPLETED'}</span>`
When a match is in `innings_break` (1st innings completed, 2nd innings pending), or in `setup`, or has undefined/un-synced status:
`isLive` evaluates to `false`. As a result, the Developer Dashboard falsely stamps the match as `COMPLETED` and counts it under "Completed" stats, even though it is still active and incomplete at the scorer and viewer ends.

## Chunks

- [x] **Chunk 1: Developer Console Status Logic & Chips**
  - Update `src/pages/DeveloperDashboard.jsx` to accurately identify match states (`isCompleted`, `isInningsBreak`, `isLive`).
  - Display appropriate status chips (`LIVE`, `INNINGS BREAK`, `COMPLETED`).
  - Update Developer Console stat counters and filter dropdown to properly include `innings_break` and active matches under "Live Now".

- [x] **Chunk 2: Home Screen Status Consistency**
  - Update `src/pages/Home.jsx` to use the same consistent status detection for search results and recent match cards.

- [x] **Chunk 3: Unit Tests, Build & Deployment**
  - Add unit tests in `src/tests/developer_console_and_scores.test.js` verifying that innings break and active matches are not marked `completed`.
  - Run full test suite with `npx vitest run`.
  - Build production bundle with `npm run build`.
  - Deploy update to Firebase Hosting.
