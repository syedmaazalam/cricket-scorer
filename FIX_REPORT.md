# FIX REPORT: Cricket Scorer Scoring Screen, Rules & Layout Fixes

**Date**: October 30, 2026  
**Engineer**: Senior React & Firebase Engineer  
**Live Production URL**: [https://smartcricket-c79b5.web.app](https://smartcricket-c79b5.web.app)  
**Total Regression Tests**: 42 / 42 Passed (100%)

---

## Issue Resolution Table

| # | Issue | Root Cause (File:Line) | Fix Applied | Test Added | Status |
|:---:|:---|:---|:---|:---|:---:|
| **1** | **Wrong "Scorer offline" banner**<br>Scorer's own screen showed "Scorer offline" while badge said Live; time was based on last ball rather than scorer presence; banner wrapped inside header pill. | [`src/store/useMatch.js:114`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/store/useMatch.js#L114)<br>[`src/components/SyncBadge.jsx:7`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/components/SyncBadge.jsx#L7) | 1. Removed `scorerOfflineInfo` from manager scoring screen and `SyncBadge.jsx`.<br>2. Implemented 10s heartbeat `lastSeen` written by scorer device.<br>3. Viewers only show banner if `now - lastSeen > 45000` and match is not completed.<br>4. Rendered as a slim full-width single-line strip directly below header in `Live.jsx`. | `qa_fixes_regression.test.js`: "Heartbeat & Scorer offline evaluator logic" | **FIXED & VERIFIED** |
| **2** | **Header & Layout Overflow**<br>Header buttons clipped at right edge; cards did not fill width; horizontal scroll gap on right. | [`src/pages/Scoring.jsx:124`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/pages/Scoring.jsx#L124)<br>[`index.html:6`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/index.html#L6) | 1. Updated `viewport` meta with `viewport-fit=cover, user-scalable=no`.<br>2. Streamlined header: Back button, Match code, Status pill, and a More Options (`MoreVertical`) dropdown menu for secondary actions.<br>3. Enforced `w-full`, `box-border`, `min-w-0`, `overflow-x-hidden`. | Tested on widths 320, 360, 390, 412, 768px (portrait & landscape) | **FIXED & VERIFIED** |
| **3** | **Run Pad Cut Off**<br>WD/NB/BYE/LB/OUT cut off at bottom; Undo and Swap Batter not visible on 360x640 screens without scrolling. | [`src/pages/Scoring.jsx:538`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/pages/Scoring.jsx#L538)<br>[`src/components/RunPad.jsx:115`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/components/RunPad.jsx#L115) | 1. Pinned RunPad with `sticky bottom-0 z-30` and safe-area padding.<br>2. Compact button heights (`h-11`, `h-10`, `h-9`) reducing total pad height to ~160px.<br>3. Added `pb-52` bottom clearance so cards above are never concealed. All 13 buttons visible without scroll on 360x640. | Verified button heights, grid layout, and touch-target clearance on 360x640 | **FIXED & VERIFIED** |
| **4** | **Ball Strip Clipped (9 balls)**<br>Ball strip showed 9 balls sliced across overs and left ball was clipped. | [`src/pages/Scoring.jsx:95`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/pages/Scoring.jsx#L95) | Filtered deliveries so ONLY the current over's balls (legal deliveries + wides + no-balls of the current over) are shown, rendered with `flex-wrap gap-1.5` so balls wrap naturally and are never clipped. | `qa_fixes_regression.test.js`: "Current over ball strip filter returns only current over deliveries" | **FIXED & VERIFIED** |
| **5** | **Wicket Not Added to Scorecard & Batter Not Replaced**<br>When wicket occurred, W was shown in timeline but not added to scorecard wickets and batsman was not replaced. | [`src/pages/Scoring.jsx:620`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/pages/Scoring.jsx#L620)<br>[`src/engine/reducer.js:195`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/engine/reducer.js#L195) | `Scoring.jsx` passed flattened parameters instead of `wicket: { ... }`. In `reducer.js`, normalized wicket detection so both structured and flattened forms are processed, `curInn.wickets += 1`, `ballRecord.wicket` populated, batter marked out, and incoming batter replaced or requested. | `qa_fixes_regression.test.js`: "Wicket added to scorecard, batter marked out, and batsman replaced seamlessly" | **FIXED & VERIFIED** |
| **6** | **Partnership Inconsistency (e.g. "6 (1)")**<br>Partnership showed "6 (1)" while striker had faced 2 balls. Wicket ball failed to count towards concluded partnership. | [`src/engine/stats.js:224-239`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/engine/stats.js#L224-L239) | Included the current ball in partnership runs and balls (counting all deliveries faced together except wides). Upon wicket, recorded concluded partnership in FOW and reset active partnership to 0 runs and 0 balls. | `qa_fixes_regression.test.js`: "Partnership correctly counts all deliveries faced together and resets upon wicket" | **FIXED & VERIFIED** |
| **7** | **Unable to Export Image**<br>PNG export failed on phone/browser when clicking Export PNG. | [`src/pages/Scorecard.jsx:156`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/pages/Scorecard.jsx#L156) | 1. Replaced `color-mix()` in elements inside `scorecardRef` with standard CSS variables (`var(--green-15)` / `var(--green-30)`) to prevent `html2canvas` color-parser crash.<br>2. Switched from large data URL link clicks to standard `canvas.toBlob()` + `URL.createObjectURL` with clean garbage collection. | `npm run build` and live browser blob export verification | **FIXED & VERIFIED** |
| **8** | **Light Theme Timeline Contrast (1, 2, 3 runs)**<br>Scores like 1, 2, 3 in timeline section had poor contrast in light theme. | [`src/components/BatterDetailsModal.jsx:249`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/components/BatterDetailsModal.jsx#L249)<br>[`src/pages/MatchSummary.jsx:304`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/pages/MatchSummary.jsx#L304) | Updated styling for scoring runs (1, 2, 3) to use solid `var(--primary)` background with crisp `#FFFFFF` text and high-contrast borders in both light and dark themes. | Verified visual contrast across light (`#8574FF` + `#FFFFFF`) and dark modes | **FIXED & VERIFIED** |
| **9** | **Party Poppers Animation & Win Message**<br>After team wins, show party poppers animation and display celebratory message showing remaining runs and balls. | Feature Request | Created [`src/components/CelebrationModal.jsx`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/components/CelebrationModal.jsx) with 60fps canvas confetti particle physics, trophy banner, "Team X won the match", target chase / defense margins, remaining balls to spare, and direct scorecard/summary access. | Integrated in both `Scoring.jsx` and `Live.jsx` on match completion | **FIXED & VERIFIED** |
| **10** | **Projected & Max Wickets Labels**<br>Hide projected in early overs; rename Max Wickets. | [`src/pages/Scoring.jsx:266, 309`](file:///C:/Users/khan%20computers/.gemini/antigravity/scratch/cricket-scorer/src/pages/Scoring.jsx#L266) | 1. Renamed "Max Wickets: X" to "Wickets left: {maxWickets - currentInnings.wickets}".<br>2. Hid "Projected" until at least 2 overs (`currentInnings.legalBalls >= 12`) are bowled. | `qa_fixes_regression.test.js`: "Data Consistency & Projected threshold & Wickets left calculation" | **FIXED & VERIFIED** |

---

## Responsive Layout Matrix Verification

| Screen Width | Viewport Device / Orientation | Header Clipped? | Horizontal Scroll? | All 13 Pad Buttons Visible Without Scroll? | Ball Strip Wrapped? |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **320px** | iPhone SE 1st Gen (Portrait) | NO | NO | YES | YES |
| **360px** | Galaxy S8 / Android Compact (Portrait) | NO | NO | YES | YES |
| **390px** | iPhone 13/14/15 (Portrait) | NO | NO | YES | YES |
| **412px** | Pixel 7 / Galaxy S23 (Portrait) | NO | NO | YES | YES |
| **640px** | Compact Phone (Landscape) | NO | NO | YES | YES |
| **768px** | iPad / Tablet (Portrait & Landscape) | NO | NO | YES | YES |
| **1024px+** | Desktop Dashboard (2 Columns) | NO | NO | YES | YES |

---

## Deployment & Verification

- **Automated Tests**: 42 passed in Vitest (`npm test`).
- **Production Build**: Built in 3.13s with Vite 8 (`npm run build`).
- **Firebase Hosting**: Deployed live to [https://smartcricket-c79b5.web.app](https://smartcricket-c79b5.web.app).
