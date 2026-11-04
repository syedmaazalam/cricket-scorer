# Implementation Plan: Theme Default, Dev Delete Match & Dev Credential Fixes

## Overview
1. **Default Dark Theme & Synchronized Switch Button**:
   - Set dark theme as default system-wide (HTML root, CSS tokens, local storage, Settings).
   - Update theme switch button to reflect current active theme (Moon icon for Dark mode, Sun icon for Light mode) and synchronize dynamically across header and settings.
2. **Developer Mode Delete Match Button**:
   - Make the Delete Match button prominently visible with label and icon in both the Managers tab (dropdown-selected match) and Matches tab (every match card).
   - Wire up `deleteMatchFromCloud` to permanently remove deleted matches from Firestore and the UI.
3. **Developer Credentials Persistence & Login**:
   - Add Firestore rules for `config/{configId}` so developer credentials persist in Cloud.
   - Fix login authentication so updating developer email immediately enforces the new email and prevents logging in with old IDs.

---

## Chunks

- [x] **Chunk 1: Default Dark Theme & Synchronized Theme Switch Button**
  - Set default theme to `dark` in `index.html`, `src/index.css`, `src/main.jsx`, `src/components/ThemeToggle.jsx`, and `src/pages/Settings.jsx`.
  - Update `ThemeToggle.jsx` so the button icon and styling dynamically match the active theme (Moon for dark, Sun for light).
  - Add reactive event synchronization (`cricket_theme_changed`) so toggling theme anywhere instantly updates all toggle buttons and views.
  - Verified with 107/107 unit tests passing.

- [ ] **Chunk 2: Developer Mode Delete Match Button Visibility & Deletion Flow**
  - Update `DeveloperDashboard.jsx` to render prominent, labeled red "Delete Match" buttons in both the Managers tab (for dropdown-selected match) and the Matches tab.
  - Wire up delete action using `deleteMatchFromCloud` and remove from local matches state.
  - Update confirmation modal with clear permanent delete and cancel actions.
  - Verify with unit tests.

- [ ] **Chunk 3: Developer Credentials Cloud Persistence & Auth Enforcement**
  - Add Firestore security rule for `match /config/{configId}` in `firestore.rules`.
  - Update developer login logic in `DeveloperDashboard.jsx` to strictly authenticate against the current configured credentials, preventing bypassed login with outdated credentials.
  - Ensure cloud save and retrieval of developer credentials succeed in both development and production.
  - Run full test suite (all vitest suites), build web bundle, and deploy to Firebase.
