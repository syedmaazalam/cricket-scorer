# Implementation Plan: Turn Off OTP, Fix Match Streaming, and Admin Delete All Matches

## Overview
1. **Turn off OTP verification system (`src/components/AuthModal.jsx`)**:
   - Temporarily disable the 6-digit OTP code gate for both Registration and Forgot Password.
   - Allow direct manager registration (Firebase Auth + local manager fallback) so managers can register and immediately create/score matches.
   - Simplify Forgot Password flow to direct password reset without blocking on undelivered OTP emails.
2. **Fix Match Streaming (`src/App.jsx`, `src/store/useMatch.js`, `src/pages/Live.jsx`, `src/pages/Home.jsx`)**:
   - Fix code-to-ID resolution when streaming: prevent upper-casing raw match IDs which broke document retrieval.
   - In `useMatch.js`, resolve 6-character match codes to actual document IDs so spectator event streams connect to `matches/{matchId}/events` in real-time.
   - Allow watching streams directly from the match list.
3. **Admin Section: Delete All Previous Matches & Fix Duplicate Matches (`src/pages/DeveloperDashboard.jsx`, `src/store/localDb.js`, `src/firebase/matches.js`)**:
   - Add a prominent "Delete All Matches" button with confirmation modal in the Developer/Admin Console Matches tab.
   - Implement `deleteAllLocalMatches()` to wipe all local match snapshots and events from IndexedDB and localStorage.
   - Deduplicate matches by match code in `getAllLocalMatches()` so identical duplicate matches never clutter the list.
4. **Build, APK Compilation & Dual Deployment**:
   - Run Vitest suite & lint checks.
   - Rebuild web bundles, sync Capacitor Android, compile `SmartCricket.apk`.
   - Deploy to `smartcricket-c79b5.web.app` and `smartcricket-website.web.app`.

---

## Chunks

- [x] **Chunk 1: Turn Off OTP Verification System in `AuthModal.jsx`**
  - Added `ENABLE_OTP_VERIFICATION = false` toggle.
  - Implemented `executeDirectRegistration` to register and activate managers immediately on submit without requiring 6-digit OTP code entry.
  - Simplified Forgot Password to direct reset without blocking on OTP delivery.
  - Verified with Vitest `src/tests/auth_modal_flows.test.jsx` (3/3 tests passed, 0 oxlint errors).

- [x] **Chunk 2: Fix Match Streaming Flow**
  - In `src/App.jsx`, enhanced `handleWatchLive` to take `(targetIdOrCode, targetCode)` and preserve exact match ID casing while resolving 6-char codes from local snapshot and cloud.
  - In `src/store/useMatch.js`, dynamically resolved 6-char codes to actual document IDs so spectator event streams connect to `matches/{resolvedId}/events` in real time.
  - In `src/firebase/matches.js`, updated `findMatchByCode` to preserve case on direct match ID lookup.
  - In `src/pages/Home.jsx` and `src/pages/Live.jsx`, updated watch stream handlers to pass exact IDs.
  - Verified across all 165 test suites (165/165 passing).

- [x] **Chunk 3: Admin Section - Delete All Matches & Deduplicate**
  - Implemented `deleteAllMatchesLocally` to purge all local match records, events, snapshots, and action logs from IndexedDB and localStorage.
  - Connected `deleteAllMatchesFromCloud` and added the "Delete All Matches" action button with confirmation modal in `src/pages/DeveloperDashboard.jsx`.
  - Updated individual match delete to wipe local IndexedDB records immediately.
  - Added automatic match code & ID deduplication to `getAllLocalMatches()` and `Home.jsx` search, preventing duplicate matches sharing the same code.
  - Verified with Vitest (165/165 tests passing, 0 oxlint errors).

- [x] **Chunk 4: Verification, APK Build & Dual Deploy**
  - Ran Vitest suite (165/165 tests passing across 16 test files).
  - Built production bundles for `cricket-scorer` and `smartcricket-website` with 0 errors.
  - Synced Capacitor Android and compiled fresh debug APK via Gradle (`21.98 MB`).
  - Deployed `cricket-scorer` to `https://smartcricket-c79b5.web.app` and `smartcricket-website` to `https://smartcricket-website.web.app`.
  - Verified 200 OK responses and APK downloads on both production domains.
