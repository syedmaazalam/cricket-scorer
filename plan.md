# Brother Motivation & Success Messages for Hassan & Abdullah

## Overview
Add identical 4-second unskippable brother motivation messages for player "Hassan" (or "hasan") from his brother Maaz, exactly as done for Abdullah:
- Takes a wicket: `"You can take another wicket"`
- Comes to bat: `"Shabash Hassan You Can Do It!"`
- Hits a six: `"Shabash Hassan You Can Hit Another Six Proud of You! Maaz.."`
- Hits a four: `"You Can Do It!"`
- Gets out: `"Good! Your Brother Maaz is always Proud of You! Love You Hassan"` (with score)
- 4-second countdown lock before dismissal
- Active across Scoring screen, Live spectator screen, and toggleable in Developer Console.

## Chunks

- [x] **Chunk 1: Core Helper & Modal Support for Hassan**
  - Added `isHassan(name)` helper in `src/components/AbdullahMotivationModal.jsx` (supporting both "hassan" and "hasan" case-insensitively).
  - Enhanced message and badge resolution to display personalized brother messages for Hassan.

- [x] **Chunk 2: Scoring, Live & Developer Dashboard Integration**
  - Integrated Hassan detection in `src/pages/Scoring.jsx` for batting entry, wickets taken, boundaries, and fall of wicket.
  - Integrated Hassan detection in `src/pages/Live.jsx` for real-time live spectator viewing.
  - Updated `src/pages/DeveloperDashboard.jsx` toggle label and description.

- [x] **Chunk 3: Automated Tests, Verification, Build & Deploy**
  - Added unit tests for `isHassan` and all Hassan brother events in `src/tests/developer_console_and_scores.test.js`.
  - Verified all 92 vitest tests pass, ran `npm run build`, deployed to Firebase hosting, and updated graphify.
