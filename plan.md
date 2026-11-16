# Implementation Plan: Fix All 24 SmartCricket Bugs

## Scope & Ordering
Fix all 24 identified bugs in SmartCricket across 5 structured chunks ordered strictly by severity (Critical -> High -> Medium -> Low -> Finish), ensuring 0 regressions, full browser and automated verification, and clean build.

---

## Chunk 1: CRITICAL Severity
- [x] **Bug 1 & Bug 20: Developer Console Form Validation & Placeholders (Completed & Verified)**
  - **File:** `src/pages/DeveloperDashboard.jsx`
  - Removed personal email placeholder (`syedmaazalam2007@gmail.com`) and replaced with generic `developer@example.com`.
  - Removed 8-character password hint (`••••••••`) and replaced placeholder with generic `Password`.
  - Added `required` and `type="email"` to developer email inputs.
  - Verified with automated test `src/tests/developer_console_bug_fixes.test.jsx` (1/1 passed) and `developer_console_and_scores.test.js` (42/42 passed).

---

## Chunk 2: HIGH Severity
- [x] **Bug 2: Spectator Live Chat Role Derivation & Display Name (Completed & Verified)**
  - **Files:** `src/pages/Live.jsx`, `src/components/DeveloperScorerChatModal.jsx`
  - Derive real role from session in `Live.jsx` (check if developer, scorer/manager, or spectator).
  - Default logged-out spectator to role `"spectator"`, prompt/allow entering a display name (stored locally), and update chat header to "Live Match Chat" instead of "Talking to Scorer as Developer".
- [x] **Bug 3: Manager Registration Validation on Client and Cloud (Completed & Verified)**
  - **Files:** `src/components/AuthModal.jsx`, `src/firebase/matches.js`
  - Require non-empty name, valid email (regex), and password (min 6 characters) on client with visible inline error messages under each field.
  - Prevent offline registration bypassing empty field validation.
  - Validate name and email in `saveManagerProfileToCloud` before persisting.
- [x] **Bug 4: Worm Chart Legal Balls and CRR Calculation (Completed & Verified)**
  - **File:** `src/components/MatchCharts.jsx`
  - Ensure wides and no-balls are excluded from over count and CRR.
  - Compute overs as cricket format (`completedOvers.balls`) and CRR as `runs / ((completedOvers * 6 + balls) / 6)` matching scoreboard exactly (e.g. 5 runs in 0.2 ov -> CRR 15.00).
- [x] **Bug 5: Bowled Dismissal Confirmation (Completed & Verified)**
  - **Files:** `src/components/WicketModal.jsx`, `src/pages/Scoring.jsx`
  - Require explicit "Confirm Wicket" button click for Bowled and all dismissal types before recording the wicket.
- [x] **Bug 6: Custom Overs Input Validation (Completed & Verified)**
  - **File:** `src/pages/Setup.jsx`
  - Add validation for `overs >= 1` (reject -5, 0, non-numeric).
  - Display visible inline error below the custom overs input and prevent silent proceed.
- [x] **Bug 7: Striker and Non-Striker Duplicate Prevention (Completed & Verified)**
  - **File:** `src/pages/Setup.jsx`
  - Disable selected striker in non-striker dropdown, and vice versa.
  - Add visible inline error banner if duplicate players are selected and block proceeding.

---

## Chunk 3: MEDIUM Severity
- [x] **Bug 8: Edit Ball Score Delivery-Type Pill (Completed & Verified)**
  - **File:** `src/components/EditBallModal.jsx`
  - Display delivery-type pill reflecting true delivery type (`wide`, `noball`, `bye`, `legbye`, `legal`) rather than always defaulting to "Legal".
- [x] **Bug 9 & Bug 18: Back Arrow History Routing & Client-Side URL Routing (Completed & Verified)**
  - **Files:** `src/App.jsx`, `src/services/navigationManager.js`, `src/pages/Scoring.jsx`, `src/pages/Setup.jsx`, `src/pages/Live.jsx`
  - Synchronize URL with active route (`/scorer`, `/match/:id`, `/live/:id`, `/summary/:id`, `/developer`) using HTML5 History API.
  - Route Back arrows accurately: Live Scoring -> Match List, Match Config -> Scorer Portal, Spectator -> Stream List.
- [x] **Bug 10: Online vs Offline Sync Status & Firestore Permission Failure Fix (Completed & Verified)**
  - **Files:** `src/components/SyncBadge.jsx`, `src/store/sync.js`, `firestore.rules`
  - Check `navigator.onLine` before displaying offline status; display sync/permission error when online with failed sync (`Sync Pending (N)`).
  - Fix underlying Firestore rule evaluation by guarding with `!exists(...)` so uncommitted matches allow initial batch events.
- [x] **Bug 11: Team Name Deduplication & Toss Won By Keyed by Index (Completed & Verified)**
  - **File:** `src/pages/Setup.jsx`
  - Trim and reject identical team names (case-insensitive) with inline error. Key toss winner by team index (`0` or `1`) instead of raw name string.
- [x] **Bug 12: Caught Dismissal Fielder Selection Guard (Completed & Verified)**
  - **File:** `src/components/WicketModal.jsx`
  - When dismissal is Caught and no fielder is selected, disable Confirm Wicket and show inline hint "Please select the fielder".
- [x] **Bug 13: Logo Rendering Reliability (Completed & Verified)**
  - **Files:** `index.html`, `src/pages/Home.jsx`, `src/components/SmartCricketLogo.jsx`
  - Preload `/logo.png` in `index.html` and provide inline SVG logo fallback so logo never renders blank across themes and view switches.
- [x] **Bug 14: Scorer Portal Desktop Container Width (Completed & Verified)**
  - **File:** `src/pages/Home.jsx`
  - Widen container on desktop (`lg:max-w-5xl xl:max-w-6xl`) matching Live Stream layout so cards are never truncated.
- [x] **Bug 15: Dot-Ball Toast Positioning Outside Scoreboard (Completed & Verified)**
  - **File:** `src/components/ScoreAnimation.jsx`
  - Move toast container outside scoreboard area with high z-index (`z-[100]`) so toasts never overlap "vs INDIA" or team names.
- [x] **Bug 16: Bowler Table ECON Column Header (Completed & Verified)**
  - **Files:** `src/pages/Scoring.jsx`, `src/pages/Live.jsx`
  - Add `ECON` column header and display formatted economy in Bowler cards.
- [x] **Bug 17: Chart Legend Color Dots (Completed & Verified)**
  - **Files:** `src/components/MatchCharts.jsx`, `src/index.css`
  - Add visible colored dots (`w-2.5 h-2.5 rounded-full`) matching series color swatches in Bar Chart and Worm Chart legends.
- [x] **Bug 19: Bottom Row Clipping in Boxes Mode & Player Breakdown Modal (Completed & Verified)**
  - **Files:** `src/pages/Setup.jsx`, `src/components/BatterDetailsModal.jsx`
  - Fix padding and max-height so bottom rows of inputs and cards are never clipped.

---

## Chunk 4: LOW Severity
- [x] **Bug 21: Record Wicket Modal Light Theme Styling (Completed & Verified)**
  - **File:** `src/components/WicketModal.jsx`
  - Replace hardcoded dark slate classes with theme CSS variables (`var(--card)`, `var(--card-alt)`, `var(--border)`, `var(--text)`).
- [x] **Bug 22: Missing Spacing in JSX Text (Completed & Verified)**
  - **Files:** `src/pages/Scoring.jsx`, `src/components/MatchCharts.jsx`, `src/pages/Live.jsx`
  - Ensure explicit spaces in "Inn 1 vs Team", "+1 WIDE", and "CRR 15.0 Proj 75".
- [x] **Bug 23: Squad Text Copy & APK Update Platform Check (Completed & Verified)**
  - **Files:** `src/pages/Setup.jsx`, `src/components/UpdateNotificationBanner.jsx`, `src/pages/Settings.jsx`
  - Replace "Line-by-line (\n)" with "One player per line".
  - Show APK update copy only when running in Capacitor/native build (`Capacitor.isNativePlatform()`).
- [x] **Bug 24: Inline Clear (X) Button in Match Search (Completed & Verified)**
  - **File:** `src/pages/Home.jsx`
  - Add inline clear (X) button when `searchInput` is non-empty.

---

## Chunk 5: Verification & Full Build
- [x] Full build (`npm run build`) and fix all warnings.
- [x] Automated regression tests & full match scoring simulation (wide, no-ball, wicket, over end).
- [x] Final verification summary table with all 24 bugs.
