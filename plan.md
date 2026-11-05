# Implementation Plan: Restore Choice Screen & Manager Login Flow

## Overview
Restore the exact 3-portal architecture in `src/pages/Home.jsx`:
1. **Screen A (`choose`)**:
   - Initial screen giving the user the two formal options:
     - **"Do you want to create a match?"** (Manager Portal - **strictly requires Manager Login**, opens `AuthModal` if not authenticated).
     - **"Do you want to stream a match?"** (Viewer Portal - **zero login required**, direct access to live streams).
2. **Screen B (`create`)**:
   - Only accessible with authenticated manager session.
   - Back button (`< Portals`) to return to `choose` screen.
   - Top glowing pill switch `[ 👁 View the Matches > ]` to toggle matches visibility.
   - Prominent green "Create New Match" CTA button.
   - Unified search card (`SEARCH ON THIS DEVICE`) with matches displayed directly **under the search bar** inside the search card (no separate external blocks).
3. **Screen C (`stream`)**:
   - Back button (`< Portals`) to return to `choose` screen.
   - Live stream search & match streaming without login.

---

## Chunks

- [x] **Chunk 1: Restore 3-Portal Flow & Mandatory Manager Login in `Home.jsx`**
  - Keep `activePortal` state defaulting to `'choose'`.
  - Wire `handleSelectCreateMatch` to check `managerUser` and trigger `setIsAuthModalOpen(true)` when unauthenticated.
  - Wire `handleSelectStreamMatch` to enter `stream` portal with zero login.
  - Implement Screen A (`choose`), Screen B (`create` with updated matches under search bar UI), and Screen C (`stream`).
  - Add back navigation button to return to `'choose'` from both `create` and `stream`.

- [x] **Chunk 2: Regression Testing & Verification**
  - Run `src/tests/qa_fixes_regression.test.js` and `src/tests/ui_home_and_search_flows.test.jsx`.
  - Run full Vitest suite (160+ tests).
  - Run `oxlint`.

- [x] **Chunk 3: Production Build & Web Deployment**
  - Run `npm run build` (`vite build`).
  - Sync Capacitor Android (`npx cap sync android`) and rebuild debug APK.
  - Deploy to Firebase Hosting.
