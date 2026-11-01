# Wicket Undo Fix, Developer Error Message, Overthrow Runs & Ball Score Editing

## Overview
1. **Developer Login Error Message**:
   - Replaced password suggestions with clean generic error: `"Password or login is incorrect."` with zero disclosure.
2. **Undo Wicket Fix**:
   - Added an explicit "Undo Wicket / Cancel" button inside `NewBatterModal` so the user is never trapped.
   - Updated `undo` in `useMatch.js` so that undoing fall-of-wicket rolls back the wicket ball directly (restoring dismissed batsman to the crease) without dragging the scorer back into `NewBatterModal`.
3. **Overthrow Runs Management**:
   - Created `OverthrowModal.jsx` and added an Overthrow (`+OT Overthrow`) action to `RunPad.jsx`.
   - Supported adding runs ran before throw + overthrow runs (boundaries or singles) across normal and extra deliveries.
   - Maintained strike rotation and statistical attribution.
4. **Edit Particular Ball Score**:
   - Created `EditBallModal.jsx` with full controls (runs, extras, extra runs, wicket status, wicket type, dismissed batter).
   - Allowed tapping any ball chip in `currentOverBalls` in `Scoring.jsx` or picking any ball in the innings to edit.
   - Implemented `editBall` in `useMatch.js` with deterministic `replayEvents`, local snapshot update, and cloud sync.
5. **Verification & Deployment**:
   - Written automated unit and integration tests.
   - Verified `npx vitest run` (89/89 tests passing).
   - Verified `npm run build`, deployed to Firebase hosting (`https://smartcricket-c79b5.web.app`), and updated graphify.

## Chunks

- [x] **Chunk 1: Developer Login Error Message Fix**
  - Updated `src/pages/DeveloperDashboard.jsx` to replace suggestion message with `"Password or login is incorrect."`.
  - Ensured zero password hints or leaks.

- [x] **Chunk 2: Undo Wicket Fix (Prevent Dragging to Select Batter)**
  - Added `onUndoWicket` callback and "Undo Wicket / Cancel" button to `src/components/NewBatterModal.jsx`.
  - Passed `handleUndo` to `NewBatterModal` in `src/pages/Scoring.jsx`.
  - In `src/store/useMatch.js`, made `undo()` smartly rollback the wicket ball if `needsNewBatter` is active or if undoing `NEW_BATTER` after a wicket ball.

- [x] **Chunk 3: Overthrow Runs Management**
  - Created `src/components/OverthrowModal.jsx`.
  - Added `+OT Overthrow` button to `src/components/RunPad.jsx`.
  - Handled overthrow payload in `src/engine/reducer.js` and `src/engine/stats.js`.

- [x] **Chunk 4: Edit a Particular Ball Score**
  - Created `src/components/EditBallModal.jsx`.
  - Implemented `editBall(ballIdentifier, updatedPayload)` in `src/store/useMatch.js`.
  - Made ball chips in `currentOverBalls` clickable in `src/pages/Scoring.jsx` and added "Edit Ball Score" option in menu.

- [x] **Chunk 5: Automated Tests, Verification, Build & Deploy**
  - Added comprehensive unit tests in `src/tests/developer_console_and_scores.test.js`.
  - Ran `npx vitest run` (all 89 tests passing).
  - Ran `npm run build` and deployed to Firebase hosting (`https://smartcricket-c79b5.web.app`).
  - Ran `/graphify . --update`.
