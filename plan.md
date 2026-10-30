# SmartCricket UI Redesign & Developer Console Upgrade Plan

## 1. Files to Change or Add

| File Path | Purpose / Changes |
| :--- | :--- |
| **`firestore.rules`** | Firestore security rules: developer can read `managers` collection and list all matches; managers can write only their own profile and matches; public read on individual match documents & events for live viewers. |
| **`src/index.css`** | Configure Inter font only, 8px grid spacing, 12px/8px radii, `#0F172A` dark / `#F8FAFC` light CSS variables, single `#22C55E` green accent (remove red/blue/orange label colors), and `prefers-reduced-motion` support. |
| **`src/pages/Home.jsx`** | Complete Home screen redesign: Top bar with ghost manager sign-in & 40px circular theme toggle, 64px rounded-square logo with green glow and radial background glow (`rgba(34,197,94,0.12)`), green gradient CTA ("New Match (Manager)"), real-time search card with pulsing dot, recent matches cards with copy code and outlined Play resume button, and zero-emoji footer. |
| **`src/pages/DeveloperDashboard.jsx`** | Full Developer Console rebuild: Firebase Auth with developer claims/allowlisted UID (no hardcoded credentials), 3-tab architecture (**Managers**, **Matches**, **Import**), 4 top summary cards, manager listing with match count & detail expansion, real-time match cards with accurate scores and "Open in App" action, drag-and-drop JSON import with string sanitization, event replay validation, duplicate conflict modal, and fallback to "Unknown manager" when `managerId` is missing. |
| **`src/components/AuthModal.jsx`** | Persist manager profiles to Firestore collection `managers/{uid}` and IndexedDB on registration/login; apply Inter + green accent styling; remove all emojis. |
| **`src/firebase/matches.js`** | Add `getAllManagersFromCloud()`, `saveManagerProfileToCloud()`, enrich `createMatchInCloud()` and `syncPendingEvents()` to store `managerId`, `managerName`, `managerEmail` and derived scores on the root match document. |
| **`src/store/localDb.js`** | Add `managers` IndexedDB object store with `saveManagerLocally()` and `getAllLocalManagers()` for offline-first support. |
| **`src/store/sync.js`** | Ensure batch sync updates the match document with both innings scores, overs, and manager metadata. |
| **`src/engine/potm.js`** | Remove all emoji characters from pointing system description strings; replace with clean typography. |
| **`src/components/ScoreAnimation.jsx`** | Replace emoji badges with Lucide vector icons (`Zap`, `Award`, `Flame`, `Sparkles`). |
| **`src/components/CelebrationModal.jsx`** | Replace emojis with Lucide icons (`Trophy`, `Sparkles`). |
| **`src/components/BatterDetailsModal.jsx`** | Replace emojis with Lucide icons (`Target`, `Activity`, `User`). |
| **`src/components/PointingCriteriaModal.jsx`** | Replace emojis with Lucide icons (`Trophy`, `CheckCircle2`). |
| **`src/pages/Scoring.jsx`** | Replace emojis in header, batters table, bowler table, keypad, and partnership strip with Lucide icons; enforce single `#22C55E` accent; ensure strike rate is integer only. |
| **`src/pages/Live.jsx`** | Replace emojis in spectator view with Lucide icons. |
| **`src/pages/Scorecard.jsx`** | Replace emojis in scorecard header and breakdown with Lucide icons. |
| **`src/pages/MatchSummary.jsx`** | Replace emojis in match summary and POTM cards with Lucide icons. |
| **`src/pages/Setup.jsx`** | Replace emojis in toss and squad wizard with Lucide icons. |
| **`src/store/useMatch.js`** | Remove emojis from action audit log titles. |
| **`src/tests/developer_console_and_scores.test.js`** | Unit test suite: validates derived score calculation for 3 sample matches, JSON import schema validation, duplicate conflict handling, event replay verification, and zero-emoji codebase integrity. |

---

## 2. Root Cause of the Developer Console Showing 0/0 Scores

1. **Schema Discrepancy on Root Match Documents**:
   - When matches are created in `App.jsx` (`createMatchInCloud`), the document is created with match metadata (`code`, `overs`, `teams`, `status`), but **without** an `innings` array or score summary.
   - When events sync in `src/store/sync.js`, it only updates a partial `summary: { score, wickets, legalBalls, battingTeam }` object reflecting the *current* batting innings only, and does not store the full `innings` array.
2. **Developer Console Attempting to Read Undefined Field**:
   - `DeveloperDashboard.jsx` (lines 475–476) previously executed:
     ```javascript
     const inn1 = m.innings?.[0] || { score: 0, wickets: 0 };
     const inn2 = m.innings?.[1] || { score: 0, wickets: 0 };
     ```
     Because cloud matches do not store `m.innings` on the root document, `m.innings` was always `undefined`, causing every match to fall back to `{ score: 0, wickets: 0 }` and display `0/0`.
3. **Absence of Event-Sourced Score Derivation**:
   - The scorer engine computes scores deterministically by replaying event logs (`replayEvents` in `reducer.js`). The Developer Console previously bypassed this engine and read unpopulated fields directly.

### The Solution
- Implement helper `deriveMatchDisplayScore(match, events)`:
  - If `match.innings` with score data exists (e.g. from local snapshot), format directly.
  - If `match.summary` has scores, use as immediate fallback.
  - If event log is present (or fetched), run `replayEvents(events)` to derive the exact scores, overs, and match result matching the scorer engine.
  - Format: `"runs/wickets (overs)"` per innings (e.g., `"94/0 (2.4 ov)"`). For completed matches, show both innings and outcome. Show `"Not started"` only if total legal balls faced is 0.
  - Matches without `managerId` will show `"Unknown manager"` rather than a fallback name.

---

## 3. Data Model, Security Rules & Queries for Managers & Matches

### A. Firestore Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function isDeveloper() {
      return isAuthenticated() && (
        request.auth.token.developer == true ||
        request.auth.uid in ['DEV_UID_ALLOWLIST'] ||
        (request.auth.token.email != null && request.auth.token.email.matches('.*@smartcricket\\.app'))
      );
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /managers/{managerId} {
      allow read: if isDeveloper() || isOwner(managerId);
      allow write: if isDeveloper() || isOwner(managerId);
    }

    match /matches/{matchId} {
      allow get: if true;
      allow list: if isDeveloper();
      allow create: if isAuthenticated() && (isDeveloper() || request.resource.data.managerId == request.auth.uid);
      allow update, delete: if isDeveloper() || (isAuthenticated() && resource.data.managerId == request.auth.uid);

      match /events/{eventId} {
        allow read: if true;
        allow write: if isDeveloper() || (
          isAuthenticated() && (
            get(/databases/$(database)/documents/matches/$(matchId)).data.managerId == request.auth.uid
            || !('managerId' in get(/databases/$(database)/documents/matches/$(matchId)).data)
          )
        );
      }
    }
  }
}
```

### B. Developer Authentication
- Authenticate via Firebase Auth (`signInWithEmailAndPassword` or custom claim).
- Checks custom claim `token.developer === true` or allowlisted UID / email domain.
- Zero hardcoded passwords or usernames.

### C. Match Document Manager Association
```typescript
{
  matchId: string;
  code: string;
  managerId?: string;     // Manager uid
  managerName?: string;   // Manager name
  managerEmail?: string;  // Manager email
  updatedAt: number;
}
```
If `managerId` is missing or undefined, display `"Unknown manager"`.

---

## 4. JSON Import Format, Validation Rules, and Conflict Handling

### A. Standard Import / Export Schema (Version 2.0.0)
```json
{
  "app": "SmartCricket",
  "version": "2.0.0",
  "exportedAt": "2026-10-31T03:25:00.000Z",
  "matchId": "match_1730345000000_abc123",
  "code": "93RG2A",
  "matchState": {
    "overs": 20,
    "playersPerTeam": 11,
    "teams": [
      { "id": "t1", "name": "Team Alpha", "players": ["P1", "P2"] },
      { "id": "t2", "name": "Team Bravo", "players": ["P3", "P4"] }
    ],
    "toss": { "winner": "Team Alpha", "decision": "bat" },
    "status": "completed",
    "innings": [...]
  },
  "events": [
    { "id": "ev_1", "seq": 1, "type": "MATCH_INIT", "payload": {}, "ts": 1730345000000 },
    { "id": "ev_2", "seq": 2, "type": "BALL", "payload": {}, "ts": 1730345001000 }
  ]
}
```

### B. Validation & Security Rules
1. Max file size: 5 MB. Allowed extension: `.json` only.
2. Client-side parsing using `JSON.parse` with comprehensive error boundary.
3. **Manager identity override**: The file's `manager` field is ignored; the match is assigned to the current active developer/manager identity (`auth.currentUser`).
4. **String Sanitization**: Sanitize all text fields (trim whitespace, remove script/HTML tags, enforce max length limits).
5. **Event Replay Verification**: Replay `events` using `replayEvents(events)` from `src/engine/reducer.js`. If replay throws an error, encounters corrupted event data, or yields an invalid state, REJECT the file and show a descriptive error.
6. Preview card shown before final commit: Teams, Overs, Computed Score (replayed from events), Ball count, Export date.

### C. Conflict Handling (Duplicate matchId or code)
If match ID or 6-char code already exists, prompt user:
1. **Overwrite**: Replace existing match record and event stream with imported data.
2. **Import as Copy**: Generate fresh unique `matchId` and new 6-char `code`.
3. **Skip / Cancel**: Abort import.

---

## 5. Step-by-Step Implementation Order & Test Checklist

### Implementation Order
1. **Firestore Security Rules** (`firestore.rules`):
   - Secure rules for developer listing, manager-scoped writes, and public viewer reads.
2. **Design System & Global Styling** (`src/index.css`):
   - Inter font, dark palette (`#0F172A`, `#1E293B`, `#243247`, `#334155`, `#F8FAFC`, `#94A3B8`), single green accent `#22C55E`, light theme variables, 8px grid, 12px/8px radii, `prefers-reduced-motion`.
3. **Codebase Emoji Purge**:
   - Replace all emoji characters with Lucide React icons across all components.
4. **Manager Registration & Data Model** (`src/components/AuthModal.jsx`, `src/firebase/matches.js`, `src/store/localDb.js`):
   - Persist manager profiles to Firestore `managers/{uid}` and IndexedDB on registration/login; enrich match documents with manager metadata.
5. **Developer Console Redesign** (`src/pages/DeveloperDashboard.jsx`):
   - Firebase Auth developer authentication, 3-tab layout (**Managers**, **Matches**, **Import**), 4 top summary cards, skeleton loading states, manager detail view, real-time match cards with "Open in App", "Unknown manager" fallback.
6. **Score Derivation & Unit Tests**:
   - Implement `deriveMatchDisplayScore` and unit tests in `src/tests/developer_console_and_scores.test.js`.
7. **JSON Import Engine**:
   - Drag-and-drop zone, file validation, manager identity override, string sanitization, event replay verification, duplicate conflict modal, round-trip test with Export.
8. **Verification & Deployment**:
   - Run Vitest suite (`npx vitest run`).
   - Run production build (`npm run build`).
   - If ANY test or build step fails, abort deployment and report error.
   - If all pass, deploy to Firebase Hosting and deploy Firestore rules (`npx firebase-tools deploy --only hosting,firestore:rules`).
