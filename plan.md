# Implementation Plan: Update Latest Version on smartcricket-website.web.app

## Context & User Goal
The user requested to update the latest version on https://smartcricket-website.web.app/.
Currently, the live website was serving an old 21.5 MB binary because `SmartCricket.bin` in `smartcricket-website/public/` was not updated with the newly compiled 5.4 MB APK (v1.3.3, code 6), and Firestore lacked a public read rule on `config/latestRelease`.

---

## Chunks

- [x] **Chunk 1: Update Website APK Binaries, Version Config & Firestore Rules**
  - Copy latest 5,655,668 byte APK to `smartcricket-website/public/SmartCricket.bin` and `smartcricket-website/public/SmartCricket.apk`.
  - Create `smartcricket-website/public/version.json` with version 1.3.3, code 6, and 5.4 MB size.
  - Update `smartcricket-website/src/hooks/useRelease.js` to reliably fetch `/version.json`.
  - Add public read rule for `config/{configId}` in `firestore.rules` and deploy firestore rules.
  - Update `config/latestRelease` document in Firestore with v1.3.3 (code 6).

- [x] **Chunk 2: Build & Deploy Website to Firebase Hosting & Verify Live Endpoints**
  - Build `smartcricket-website` (`npm run build`).
  - Deploy `smartcricket-website` to Firebase Hosting.
  - Verify live HTTP headers (`curl -I https://smartcricket-website.web.app/SmartCricket.apk`) confirm 5,655,668 bytes and v1.3.3 is active.
  - Run `graphify update .`.
