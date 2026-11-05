# Implementation Plan: Automated In-App Update Notification Banner in APK

## Overview
Add an automated in-app update notification banner to the SmartCricket Android APK. When a new version is published (via GitHub Releases or Firebase Firestore `config/latestRelease`), the banner automatically slides in from the top of the app, notifying the user to install the latest APK with an immediate "Update Now" action and dismiss option.

---

## Technical Architecture

```mermaid
flowchart TD
    AppLaunch["User opens SmartCricket APK (App.jsx)"]
    CheckUpdate{"Check Firestore config/latestRelease<br/>& GitHub Releases API"}
    CompareVersion{"Is server version > v1.0<br/>or broadcast active?"}
    
    ShowBanner["Slide in UpdateNotificationBanner<br/>(Top floating card with backdrop blur)"]
    UserAction{"User taps action"}
    UpdateClick["Tap 'Update Now'<br/>Directs to APK download"]
    DismissClick["Tap 'Later' / 'X'<br/>Stores dismissal in localStorage"]

    AppLaunch --> CheckUpdate
    CheckUpdate --> CompareVersion
    CompareVersion -- Yes (and not dismissed) --> ShowBanner
    CompareVersion -- No --> Idle["Stay idle"]
    ShowBanner --> UserAction
    UserAction -- Update --> UpdateClick
    UserAction -- Dismiss --> DismissClick
```

---

## Chunks

- [x] **Chunk 1: Create UpdateNotificationBanner Component in cricket-scorer**
  - Build `src/components/UpdateNotificationBanner.jsx`.
  - Implement real-time Firestore listener for `config/latestRelease` with fallback to GitHub Releases API.
  - Match dark navy/blue glassmorphism theme, smooth slide-down animation, "Update Now" button, and dismiss memory.
  - Verification: Unit test verification with Vitest (110/110 passing).

- [x] **Chunk 2: Mount Banner in App.jsx & Verify Layout Stability**
  - Mount `<UpdateNotificationBanner />` in `src/App.jsx` root layout.
  - Verify zero interference with existing navigation headers, modals, or scoring controls.
  - Verification: Run 110/110 Vitest tests and production Vite build.

- [ ] **Chunk 3: Sync Android, Compile APK, and Update GitHub**
  - Synchronize web assets via `npx cap sync android`.
  - Compile Android APK with `gradlew assembleDebug`.
  - Update `SmartCricket.apk` and upload to GitHub Release v1.0.
  - Push commit to GitHub `main` and run `graphify update .`.
