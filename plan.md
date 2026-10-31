# Developer Auth ("Silicon123@"), Abdullah Motivational Messages & Scorer Chat

## Overview
Implement direct developer authentication using password "Silicon123@", special unskippable 4-second motivational brother messages for player "Abdullah", 2-second event popups (wides, no balls, fours, sixes, wickets), developer toggles for messages, and real-time developer-to-scorer chat.

## Chunks

- [x] **Chunk 1: Developer Console Password & Instant Login**
  - Update `src/pages/DeveloperDashboard.jsx` to accept password `"Silicon123@"`.
  - Instantly authenticate and grant developer access upon entering `"Silicon123@"`.

- [x] **Chunk 2: Abdullah Motivational Messages & 2-Second Event Pop-ups**
  - Update `src/components/ScoreAnimation.jsx` to display all scoring and extra events (wide, no ball, 4, 6, wicket) with a 2-second duration.
  - Create `src/components/AbdullahMotivationModal.jsx` displaying customized brother messages for Abdullah (wicket, entering crease, four, six, out) with 4-second unskippable countdown lock.
  - Connect to `Scoring.jsx` and `Live.jsx`.
  - Add toggle in `DeveloperDashboard.jsx` to enable/disable Abdullah messages.

- [x] **Chunk 3: Real-Time Developer-to-Scorer Chat**
  - Update `firestore.rules` for `/matches/{matchId}/messages/{messageId}`.
  - Add messaging helpers in `src/firebase/matches.js`.
  - Add chat panel in `DeveloperDashboard.jsx` and real-time message drawer/toast in `Scoring.jsx`.

- [x] **Chunk 4: Verification, Automated Tests & Deployment**
  - Add unit tests in `src/tests/developer_console_and_scores.test.js`.
  - Run full test suite (`npx vitest run` - 78/78 tests passing).
  - Build production bundle (`npm run build`).
  - Deploy to Firebase Hosting & Firestore rules.
