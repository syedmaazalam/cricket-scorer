# Implementation Plan: Luxury Back-Button Navigation Stack & Exit Protection

## Problem Statement
Currently, pressing the back button (either UI back buttons, browser back, or Android hardware/gesture back) either forces the user straight to the Home screen (`handleGoHome`) or exits the app entirely. There is no hierarchical navigation history stack, modal back handling, or double-tap exit prevention as found in luxury mobile apps.

## Target Architecture
1. **Hierarchical Navigation History Stack (`src/services/navigationManager.js`)**:
   - Manage screen history stack `[{ page, activeMatchId, liveCodeOrId, isManager, viewedMatchState }]`.
   - Support `push(state)`, `pop()`, `canGoBack()`.
   - Provide a priority modal/overlay back-handler registry (`registerModalHandler(fn)`) so active modals (e.g., bowler selection, auth, action logs, match celebration) close on back press instead of navigating away.
   - Luxury double-tap exit protection: when on the root screen (`home`) with no open modals, pressing back displays a sleek *"Press back again to exit"* floating toast. Pressing again within 2000ms safely exits the app; otherwise it resets.
2. **Android Hardware & Browser Integration**:
   - Listen to `@capacitor/app` `App.addListener('backButton')`.
   - Sync with `window.history` (`popstate`) for mobile browsers so swipe-back or browser back navigates the app stack instead of leaving the domain.
   - Enhance `MainActivity.java` with `ScorecardBridge.exitApp()` and bridge coordination.
3. **App Route Integration (`src/App.jsx`)**:
   - Replace direct `handleGoHome` resets in `Setup`, `DeveloperDashboard`, `Live`, `Scorecard`, `MatchSummary`, and `Scoring` with unified `handleBack()`.
   - Render the luxury exit toast banner.

---

## Chunks

- [x] **Chunk 1: Centralized Navigation History & Modal Back Registry (`src/services/navigationManager.js` & tests)**
  - Created `src/services/navigationManager.js` with deep stack management, duplicate prevention, LIFO modal handler registry, and 2-second double-back exit confirmation.
  - Created `src/tests/navigation_manager.test.js` covering 9 comprehensive test cases (all passing).
  - Verified 174/174 vitest tests pass and oxlint reports 0 errors.

- [x] **Chunk 2: Native Android & Web PopState Integration (`MainActivity.java`, Capacitor & web bridge)**
  - Enhanced `MainActivity.java` with `@JavascriptInterface public void exitApp()` on `ScorecardNativeBridge` and overridden `onBackPressed()` evaluating JS back events.
  - Implemented lazy-loaded `@capacitor/app` `App.addListener('backButton')` with automatic fallback to native bridge.
  - Integrated `popstate` browser history listener so web users don't exit to blank page on swipe-back or browser back.
  - Verified with Vitest (10/10 tests passed).

- [x] **Chunk 3: Screen Navigation Flow & Luxury Exit Toast in `App.jsx`**
  - Integrated `navigationManager` into `src/App.jsx` with full reactive subscriber updates.
  - Replaced hardcoded `handleGoHome` resets in `Setup.jsx`, `DeveloperDashboard.jsx`, `Live.jsx`, `Scorecard.jsx`, `MatchSummary.jsx`, and `Scoring.jsx` with unified `handleBack()` popping the screen stack.
  - Added modal back-handler hooks in `Home.jsx`, `Scoring.jsx`, and `DeveloperDashboard.jsx` so open modals close on back button press.
  - Rendered a luxury glassmorphism floating bottom pill for *"Press back again to exit"* with pulse glow.
  - Verified with Vitest (175/175 tests passed, 0 oxlint errors).

- [ ] **Chunk 4: Android Build, APK Compilation & Dual Deployment**
  - Build web bundle (`vite build`).
  - Sync Capacitor Android (`npx cap sync android`).
  - Compile Android debug APK via Gradle (`gradlew assembleDebug`).
  - Deploy to Firebase Hosting (`smartcricket-c79b5.web.app` and `smartcricket-website.web.app`).
  - Run `graphify update .`.
