# Implementation Plan: New Logo, Header Polish & Light Theme Fix

## Overview
1. **New App Logo Integration**:
   - Source: `media_1793922056067_efcdb25b.jpg` (1024x1024 cricket player action graphic with "CRICKET SCORE LIVE").
   - Generate all Android launcher icon mipmap sizes (`ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png` for mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) in `cricket-scorer/android/app/src/main/res/`.
   - Update `ic_launcher_background.xml` color to `#081229` (matching dark stadium background).
   - Generate web icons (`logo.png`, `favicon.png`, `favicon.svg`) for `cricket-scorer` and `smartcricket-website`.
   - Update `Home.jsx` and website Navbar/Hero to display the new logo.
2. **Top Navigation Polish (Remove 'Create or Stream')**:
   - In `cricket-scorer/src/pages/Home.jsx`, remove the `[ Create | Stream ]` segmented control tab from the top header per user screenshot `media_1793922105566_c608f24f.jpg`.
3. **Light Theme Contrast Fix for 'View The Matches'**:
   - Update the glowing pill button in `Home.jsx` to have high contrast text in light mode (e.g., solid `#16A34A` background with `#FFFFFF` text or dark emerald `#14532D` text) and `#FFFFFF`/emerald in dark mode, ensuring 100% legibility.
4. **Build APK, Verification & Web Deployments**:
   - Re-sync Capacitor and compile fresh Android APK.
   - Copy fresh APK to `smartcricket-website/public/SmartCricket.apk`.
   - Run tests and oxlint.
   - Deploy `cricket-scorer` to Firebase Hosting (`https://smartcricket-c79b5.web.app`).
   - Deploy `smartcricket-website` to Firebase Hosting (`https://smartcricket-website.web.app`).

---

## Chunks

- [x] **Chunk 1: Generate & Replace App Logo Across Android & Web Projects**
  - Use Python PIL to resize `media_1793922056067_efcdb25b.jpg` into all Android mipmap dimensions:
    - mdpi (48x48, foreground 108x108)
    - hdpi (72x72, foreground 162x162)
    - xhdpi (96x96, foreground 216x216)
    - xxhdpi (144x144, foreground 324x324)
    - xxxhdpi (192x192, foreground 432x432)
  - Copy logo to `cricket-scorer/public/logo.png` and `smartcricket-website/public/logo.png`.
  - Update `Home.jsx` brand icon to display the new logo image.
  - Update `smartcricket-website/src/components/Navbar.jsx` to display the new logo.

- [x] **Chunk 2: Remove 'Create or Stream' Header Tabs & Fix Light Theme 'View The Matches'**
  - In `src/pages/Home.jsx`, remove `{activePortal !== 'choose' && (<div className="seg" role="group">...</div>)}`.
  - Fix button color styles so "View The Matches" text is crisp and readable in both light and dark themes.
  - Verify with Vitest tests and update assertions.

- [x] **Chunk 3: Android APK Build, Verification & Dual Web Deployments**
  - Sync Capacitor (`npx cap sync android`) and build `./gradlew assembleDebug`.
  - Copy APK to `smartcricket-website/public/SmartCricket.apk` and project root.
  - Run full test suite (`npx vitest run`) and `oxlint`.
  - Deploy `cricket-scorer` to Firebase Hosting.
  - Build and deploy `smartcricket-website` to Firebase Hosting.
