import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, ensureAnonymousAuth } from './config.js';
import { replayEvents } from '../engine/reducer.js';
import { formatOvers } from '../engine/rules.js';
import { getDeviceId } from '../store/sync.js';

function sanitizeForFirestore(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned;
}

/**
 * Generates an easy-to-share 6-character uppercase alphanumeric match code.
 */
export function generateMatchCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Derives the exact scores for a match from event log or match state.
 * Never defaults to 0/0; returns 'Not started' if no legal deliveries were bowled.
 */
export function deriveMatchDisplayScore(match, events = null) {
  if (!match) {
    return { inn1Text: 'Not started', inn2Text: '', resultText: '', isStarted: false };
  }

  let state = null;
  if (Array.isArray(events) && events.length > 0) {
    try {
      state = replayEvents(events);
    } catch {}
  }

  const innings = state?.innings || match.innings || [];
  const inn1 = innings[0];
  const inn2 = innings[1];
  const summary = state?.summary || match.summary;

  const t1Name = inn1?.battingTeam || match.teams?.[0]?.name || 'Team 1';
  const t2Name = inn2?.battingTeam || inn1?.bowlingTeam || match.teams?.[1]?.name || 'Team 2';

  const formatInn = (inn, fallbackName) => {
    if (!inn) return null;
    const legalBalls = inn.legalBalls || 0;
    const score = inn.score || 0;
    const wickets = inn.wickets || 0;
    const team = inn.battingTeam || fallbackName;
    if (legalBalls === 0 && score === 0 && wickets === 0) return null;
    return `${team}: ${score}/${wickets} (${formatOvers(legalBalls)} ov)`;
  };

  let inn1Text = formatInn(inn1, t1Name);
  let inn2Text = formatInn(inn2, t2Name);

  if (!inn1Text && !inn2Text && summary && summary.legalBalls > 0) {
    inn1Text = `${summary.battingTeam || t1Name}: ${summary.score || 0}/${summary.wickets || 0} (${formatOvers(summary.legalBalls || 0)} ov)`;
  }

  const isStarted = Boolean(inn1Text || (summary && summary.legalBalls > 0));
  if (!isStarted) {
    return {
      inn1Text: 'Not started',
      inn2Text: '',
      resultText: match.resultSummary || '',
      isStarted: false
    };
  }

  return {
    inn1Text: inn1Text || 'Not started',
    inn2Text: inn2Text || '',
    resultText: state?.resultSummary || match.resultSummary || '',
    isStarted: true
  };
}

/**
 * Determines comprehensive match status, distinguishing truly completed matches
 * from live in-progress and innings break matches.
 */
export function getMatchStatusMeta(m) {
  if (!m) return { status: 'live', isCompleted: false, isInningsBreak: false, label: 'LIVE' };

  // A match is truly completed ONLY when:
  // 1. status is explicitly 'completed'
  // 2. or winner is decided
  // 3. or resultSummary is present
  // 4. or 2nd innings isCompleted is true
  const isCompleted = m.status === 'completed' || Boolean(m.winner) || Boolean(m.resultSummary) || Boolean(m.innings?.[1]?.isCompleted);

  if (isCompleted) {
    return { status: 'completed', isCompleted: true, isInningsBreak: false, label: 'COMPLETED' };
  }

  // Innings break: 1st innings is done, 2nd innings not done yet
  const isInningsBreak = m.status === 'innings_break' || Boolean(m.innings?.[0]?.isCompleted && !m.innings?.[1]?.isCompleted);
  if (isInningsBreak) {
    return { status: 'innings_break', isCompleted: false, isInningsBreak: true, label: 'INNINGS BREAK' };
  }

  return { status: 'live', isCompleted: false, isInningsBreak: false, label: 'LIVE' };
}

/**
 * Phase 2 Requirement 4:
 * Updates match heartbeat renewing scorer lease every 30s using serverTimestamp().
 */
export async function updateMatchHeartbeat(matchId) {
  if (!matchId) return;
  try {
    const user = await ensureAnonymousAuth();
    const deviceId = getDeviceId();
    const matchRef = doc(db, 'matches', matchId);
    await setDoc(matchRef, {
      scorerId: deviceId,
      scorerUid: user?.uid || null,
      leaseExpiresAt: Date.now() + 45000,
      lastHeartbeat: serverTimestamp(),
      lastSeen: Date.now()
    }, { merge: true });
  } catch {}
}

/**
 * Phase 2 Requirement 1 & 4:
 * Claims or transfers the scorer lease.
 * Returns { granted: true } if acquired, or { granted: false, currentScorerId, leaseExpiresAt } if blocked.
 */
export async function claimScorerLease(matchId, forceTakeover = false) {
  if (!matchId) return { granted: true };
  try {
    const user = await ensureAnonymousAuth();
    const deviceId = getDeviceId();
    const matchRef = doc(db, 'matches', matchId);
    const snap = await getDoc(matchRef);

    if (snap.exists()) {
      const data = snap.data();
      const currentHolder = data.scorerId;
      const leaseExpiresAt = data.leaseExpiresAt || 0;
      const isExpired = Date.now() > leaseExpiresAt;
      const isSameDevice = currentHolder === deviceId;

      if (!isExpired && !isSameDevice && !forceTakeover) {
        return {
          granted: false,
          currentScorerId: currentHolder,
          leaseExpiresAt
        };
      }
    }

    const updatePayload = {
      scorerId: deviceId,
      leaseExpiresAt: Date.now() + 45000,
      lastHeartbeat: serverTimestamp(),
      lastSeen: Date.now()
    };
    if (user?.uid) {
      updatePayload.scorerUid = user.uid;
      if (!snap.exists() || !snap.data()?.ownerUid) {
        updatePayload.ownerUid = user.uid;
      }
    }

    await setDoc(matchRef, updatePayload, { merge: true });
    return { granted: true };
  } catch (err) {
    console.warn('[Lease] claimScorerLease error, falling back locally:', err);
    return { granted: true, offlineFallback: true };
  }
}

/**
 * Checks whether another device currently holds an active, unexpired lease.
 */
export function isScorerLeaseHeldByOther(matchDoc, currentDeviceId) {
  if (!matchDoc || !matchDoc.scorerId) return false;
  if (matchDoc.scorerId === currentDeviceId) return false;
  const expiresAt = matchDoc.leaseExpiresAt || 0;
  return expiresAt > Date.now();
}

/**
 * Phase 2 Requirement 1:
 * Creates a match document in Firestore with ownerUid, scorerId (device), and leaseExpiresAt.
 */
export async function createMatchInCloud(matchId, matchData) {
  try {
    const user = await ensureAnonymousAuth();
    const deviceId = getDeviceId();
    const matchRef = doc(db, 'matches', matchId);
    
    // Attach manager information from active manager session
    let managerMeta = {};
    try {
      const activeManager = JSON.parse(localStorage.getItem('cricket_manager_user') || 'null');
      if (activeManager && activeManager.uid) {
        managerMeta = {
          managerId: activeManager.uid,
          managerName: activeManager.name || 'Manager',
          managerEmail: activeManager.email || ''
        };
      }
    } catch {}

    const data = sanitizeForFirestore({
      ...matchData,
      ...managerMeta,
      ownerUid: user?.uid || null,
      scorerUid: user?.uid || null,
      scorerId: matchData?.scorerId || deviceId,
      leaseExpiresAt: Date.now() + 45000,
      lastHeartbeat: serverTimestamp(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    await setDoc(matchRef, data, { merge: true });
    return data;
  } catch (error) {
    console.error('Error creating match in cloud:', error);
    throw error;
  }
}

/**
 * Finds a match by its 6-character code or document ID.
 */
export async function findMatchByCode(code) {
  if (!code) return null;
  const rawId = (code || '').trim();
  const cleanCode = rawId.toUpperCase();
  try {
    // 1. If exactly 6 chars, query Firestore matches collection by 'code' field
    if (cleanCode.length === 6) {
      const q = query(collection(db, 'matches'), where('code', '==', cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const matches = snap.docs.map((d) => ({ matchId: d.id, ...d.data() }));
        matches.sort((a, b) => {
          const aActive = a.status === 'in_progress' ? 1 : 0;
          const bActive = b.status === 'in_progress' ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;
          const aTime = a.updatedAt || a.lastSeen || 0;
          const bTime = b.updatedAt || b.lastSeen || 0;
          return bTime - aTime;
        });
        return matches[0];
      }
    }

    // 2. Direct document fetch fallback using exact rawId (preserving case)
    const directDocRef = doc(db, 'matches', rawId);
    const directDoc = await getDoc(directDocRef);
    if (directDoc.exists()) {
      return {
        matchId: directDoc.id,
        ...directDoc.data()
      };
    }

    // 3. Fallback query by code if not 6 characters
    const qFallback = query(collection(db, 'matches'), where('code', '==', cleanCode));
    const snapFallback = await getDocs(qFallback);
    if (!snapFallback.empty) {
      const matches = snapFallback.docs.map((d) => ({ matchId: d.id, ...d.data() }));
      matches.sort((a, b) => {
        const aActive = a.status === 'in_progress' ? 1 : 0;
        const bActive = b.status === 'in_progress' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        const aTime = a.updatedAt || a.lastSeen || 0;
        const bTime = b.updatedAt || b.lastSeen || 0;
        return bTime - aTime;
      });
      return matches[0];
    }
  } catch (err) {
    console.warn('findMatchByCode error:', err);
  }
  return null;
}

/**
 * Searches matches by team names or match code.
 */
export async function searchMatches(queryText) {
  if (!queryText) return [];
  const clean = queryText.trim().toLowerCase();
  const cleanUpper = queryText.trim().toUpperCase();

  // Instant code check for 6-character inputs
  if (clean.length === 6) {
    const direct = await findMatchByCode(cleanUpper);
    if (direct && direct.status !== 'inactive') return [direct];
  }

  try {
    const q = query(collection(db, 'matches'), orderBy('updatedAt', 'desc'), limit(30));
    const snap = await getDocs(q);
    const matches = [];

    snap.forEach((d) => {
      const m = d.data();
      if (m.status === 'inactive') return; // Exclude soft-deleted matches
      const t1 = (m.teams?.[0]?.name || '').toLowerCase();
      const t2 = (m.teams?.[1]?.name || '').toLowerCase();
      const code = (m.code || '').toLowerCase();
      const manager = (m.managerName || '').toLowerCase();

      // Check player names if available
      const playersA = (m.teams?.[0]?.players || []).map(p => (typeof p === 'string' ? p : p.name || '').toLowerCase());
      const playersB = (m.teams?.[1]?.players || []).map(p => (typeof p === 'string' ? p : p.name || '').toLowerCase());
      const matchesPlayer = playersA.some(p => p.includes(clean)) || playersB.some(p => p.includes(clean));

      if (t1.includes(clean) || t2.includes(clean) || code.includes(clean) || manager.includes(clean) || matchesPlayer) {
        matches.push({ matchId: d.id, ...m });
      }
    });

    return matches;
  } catch (err) {
    console.warn('Search matches error:', err);
    return [];
  }
}

// Throttle management for root doc writes (Phase 5 Requirement 2)
const rootDocThrottleMap = new Map(); // matchId -> { lastWriteTime, timer, pendingData }

/**
 * Phase 5 Requirement 1:
 * Creates the compacted root document shape containing the aggregated score
 * and the last 12 balls for spectator Live view.
 */
export function getCompactedRootData(matchState) {
  if (!matchState) return {};
  const currentInningsIndex = matchState.currentInningsIndex !== undefined ? matchState.currentInningsIndex : 0;
  const currentInnings = matchState.innings?.[currentInningsIndex] || matchState.innings?.[0] || {};

  const allBalls = [];
  if (Array.isArray(matchState.innings)) {
    for (const inn of matchState.innings) {
      if (Array.isArray(inn.balls)) {
        allBalls.push(...inn.balls);
      }
    }
  }
  const recentBalls = allBalls.slice(-12);

  return sanitizeForFirestore({
    matchId: matchState.matchId || matchState.id,
    code: matchState.code || '',
    status: matchState.status || (matchState.isCompleted ? 'completed' : 'in_progress'),
    isCompleted: Boolean(matchState.isCompleted),
    teams: matchState.teams,
    toss: matchState.toss,
    overs: matchState.overs,
    playersPerTeam: matchState.playersPerTeam,
    currentInningsIndex,
    currentInnings: {
      battingTeam: currentInnings.battingTeam,
      bowlingTeam: currentInnings.bowlingTeam,
      runs: currentInnings.runs || 0,
      wickets: currentInnings.wickets || 0,
      completedOvers: currentInnings.completedOvers || 0,
      ballsInCurrentOver: currentInnings.ballsInCurrentOver || 0,
      target: currentInnings.target,
      isCompleted: currentInnings.isCompleted,
      balls: recentBalls
    },
    innings: (matchState.innings || []).map(inn => ({
      battingTeam: inn.battingTeam,
      bowlingTeam: inn.bowlingTeam,
      runs: inn.runs || 0,
      wickets: inn.wickets || 0,
      completedOvers: inn.completedOvers || 0,
      ballsInCurrentOver: inn.ballsInCurrentOver || 0,
      target: inn.target,
      isCompleted: inn.isCompleted,
      balls: (inn.balls || []).slice(-12)
    })),
    striker: matchState.striker,
    nonStriker: matchState.nonStriker,
    currentBowler: matchState.currentBowler,
    recentBalls,
    lastSeq: matchState.lastSeq || matchState.seq || allBalls.length,
    updatedAt: Date.now()
  });
}

/**
 * Directly writes the compacted root document to Firestore matches/{matchId}.
 */
export async function flushCompactedRootDoc(matchId, matchState) {
  if (!matchId || !matchState) return false;
  const matchRef = doc(db, 'matches', matchId);
  const data = getCompactedRootData(matchState);
  try {
    await setDoc(matchRef, data, { merge: true });
    return true;
  } catch (err) {
    console.warn('[RootDoc] flushCompactedRootDoc error:', err);
    return false;
  }
}

/**
 * Phase 5 Requirement 2:
 * Throttles root-doc writes (at most once every 2-3s, plus always on wicket, over end, and innings end).
 */
export function updateCompactedRootDocThrottled(matchId, matchState, isCritical = false) {
  if (!matchId || !matchState) return;
  const THROTTLE_MS = 2500; // 2.5 seconds throttle window

  let entry = rootDocThrottleMap.get(matchId);
  if (!entry) {
    entry = { lastWriteTime: 0, timer: null, pendingData: null };
    rootDocThrottleMap.set(matchId, entry);
  }

  entry.pendingData = matchState;

  if (isCritical) {
    // Critical boundary: bypass throttle and write immediately
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    entry.lastWriteTime = Date.now();
    return flushCompactedRootDoc(matchId, matchState);
  }

  const now = Date.now();
  const timeSinceLastWrite = now - entry.lastWriteTime;

  if (timeSinceLastWrite >= THROTTLE_MS) {
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    entry.lastWriteTime = now;
    return flushCompactedRootDoc(matchId, matchState);
  } else {
    if (!entry.timer) {
      const delay = THROTTLE_MS - timeSinceLastWrite;
      entry.timer = setTimeout(() => {
        entry.timer = null;
        entry.lastWriteTime = Date.now();
        if (entry.pendingData) {
          flushCompactedRootDoc(matchId, entry.pendingData);
        }
      }, delay);
    }
  }
}

/**
 * Phase 5 Requirement 3:
 * Queries the full events subcollection on demand (used when opening scorecard or timeline).
 */
export async function fetchFullMatchEvents(matchId) {
  if (!matchId) return [];
  try {
    const eventsCol = collection(db, 'matches', matchId, 'events');
    const q = query(eventsCol, orderBy('seq', 'asc'));
    const snap = await getDocs(q);
    const events = [];
    snap.forEach((docSnap) => {
      events.push(docSnap.data());
    });
    return events;
  } catch (err) {
    console.warn('fetchFullMatchEvents error:', err);
    return [];
  }
}

/**
 * Subscribes to events for a match in real time.
 */
export function subscribeToMatchEvents(matchId, onEventsUpdated) {
  if (!matchId) return () => {};
  const eventsCol = collection(db, 'matches', matchId, 'events');
  const q = query(eventsCol, orderBy('seq', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const events = [];
    snapshot.forEach((docSnap) => {
      events.push(docSnap.data());
    });
    onEventsUpdated(events);
  }, (err) => {
    console.warn('Events subscription error:', err);
  });
}

/**
 * Subscribes to the match document for real-time heartbeat, status, and compacted live scores.
 * Phase 5 Requirement 4: Uses persistentLocalCache metadata to provide instant cached updates.
 */
export function subscribeToMatchDoc(matchId, onDocUpdated) {
  if (!matchId) return () => {};
  const matchRef = doc(db, 'matches', matchId);

  return onSnapshot(matchRef, { includeMetadataChanges: true }, (docSnap) => {
    if (docSnap.exists()) {
      onDocUpdated({
        matchId: docSnap.id,
        ...docSnap.data()
      }, Boolean(docSnap.metadata?.fromCache));
    }
  }, (err) => {
    console.warn('Match doc subscription warning:', err);
  });
}

/**
 * Fetches all matches from Cloud for the developer portal.
 */
export async function getAllMatchesFromCloud() {
  try {
    const q = query(collection(db, 'matches'), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    const matches = [];
    snap.forEach((docSnap) => {
      matches.push({ matchId: docSnap.id, ...docSnap.data() });
    });
    return matches;
  } catch (err) {
    console.warn('Error fetching all matches:', err);
    return [];
  }
}

/**
 * Fetches all registered managers from Cloud Firestore (Developer portal only).
 */
export async function getAllManagersFromCloud() {
  try {
    const q = query(collection(db, 'managers'), orderBy('lastActive', 'desc'));
    const snap = await getDocs(q);
    const managers = [];
    snap.forEach((docSnap) => {
      managers.push({ uid: docSnap.id, ...docSnap.data() });
    });
    return managers;
  } catch (err) {
    console.warn('Error fetching all managers from cloud:', err);
    return [];
  }
}

/**
 * Saves or updates a manager profile in Firestore collection 'managers/{uid}'.
 * Requires valid name and email address.
 */
export async function saveManagerProfileToCloud(managerData) {
  if (!managerData || !managerData.uid) {
    throw new Error('Manager UID is required.');
  }

  const cleanName = (managerData.name || '').trim();
  const cleanEmail = (managerData.email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!cleanName) {
    throw new Error('Manager name cannot be empty.');
  }
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    throw new Error('Valid manager email is required.');
  }

  try {
    const managerRef = doc(db, 'managers', managerData.uid);
    const data = sanitizeForFirestore({
      uid: managerData.uid,
      name: cleanName,
      email: cleanEmail,
      createdAt: managerData.createdAt || Date.now(),
      lastActive: Date.now()
    });
    await setDoc(managerRef, data, { merge: true });
    return data;
  } catch (err) {
    console.warn('Error saving manager profile to cloud:', err);
    throw err;
  }
}

/**
 * Updates a manager's credentials in Firestore.
 */
export async function updateManagerCredentialsInCloud(uid, updates = {}) {
  if (!uid) return;
  try {
    const managerRef = doc(db, 'managers', uid);
    const { password: _password, ...safeUpdates } = updates;
    const sanitized = sanitizeForFirestore({
      ...safeUpdates,
      lastActive: Date.now()
    });
    await setDoc(managerRef, sanitized, { merge: true });
    return sanitized;
  } catch (err) {
    console.warn('Error updating manager credentials in cloud:', err);
  }
}

/**
 * Saves developer credentials in Firestore config.
 */
export async function saveDeveloperCredentialsInCloud(creds = {}) {
  try {
    const devRef = doc(db, 'config', 'developer');
    const sanitized = sanitizeForFirestore({
      email: creds.email || 'developer@example.com',
      updatedAt: Date.now()
    });
    await setDoc(devRef, sanitized, { merge: true });
    return sanitized;
  } catch (err) {
    console.warn('Error saving developer credentials to cloud:', err);
  }
}

/**
 * Fetches developer credentials from Firestore config.
 */
export async function getDeveloperCredentialsFromCloud() {
  try {
    const devRef = doc(db, 'config', 'developer');
    const snap = await getDoc(devRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('Error getting developer credentials from cloud:', err);
  }
  return null;
}

/**
 * Deletes a single match and its event subcollection from Cloud.
 */
export async function deleteMatchFromCloud(matchId) {
  if (!matchId) return;
  try {
    const eventsRef = collection(db, 'matches', matchId, 'events');
    const snap = await getDocs(eventsRef);
    const deletions = [];
    snap.forEach((docSnap) => {
      deletions.push(deleteDoc(doc(db, 'matches', matchId, 'events', docSnap.id)));
    });
    await Promise.all(deletions);
    await deleteDoc(doc(db, 'matches', matchId));
  } catch (err) {
    console.error(`Failed to delete match ${matchId} from cloud:`, err);
    throw err;
  }
}

/**
 * Deletes specific event documents from a match's events subcollection in Cloud (used by Undo).
 */
export async function deleteEventsFromCloud(matchId, eventIds = []) {
  if (!matchId || !eventIds || eventIds.length === 0) return;
  try {
    const deletions = eventIds.map(id => deleteDoc(doc(db, 'matches', matchId, 'events', id)));
    await Promise.all(deletions);
  } catch (err) {
    console.error(`Failed to delete cloud events for match ${matchId}:`, err);
  }
}

/**
 * Deletes all matches and subcollections from Cloud (Developer capability).
 */
export async function deleteAllMatchesFromCloud() {
  try {
    const matchesRef = collection(db, 'matches');
    const snap = await getDocs(matchesRef);
    for (const docSnap of snap.docs) {
      await deleteMatchFromCloud(docSnap.id);
    }
  } catch (err) {
    console.error('Failed to delete all matches from cloud:', err);
    throw err;
  }
}

/**
 * Updates match administrative settings (e.g. maxViewers, isViewerRestricted).
 */
export async function updateMatchSettings(matchId, settings = {}) {
  if (!matchId) return;
  try {
    const matchRef = doc(db, 'matches', matchId);
    await setDoc(matchRef, sanitizeForFirestore(settings), { merge: true });
  } catch (err) {
    console.error(`Failed to update settings for match ${matchId}:`, err);
    throw err;
  }
}

/**
 * Uploads/restores a full match JSON into Cloud Firestore.
 */
export async function saveUploadedMatchToCloud(matchId, matchData, events = []) {
  if (!matchId || !matchData) return;
  try {
    const matchRef = doc(db, 'matches', matchId);
    await setDoc(matchRef, sanitizeForFirestore({
      ...matchData,
      updatedAt: Date.now()
    }), { merge: true });

    if (Array.isArray(events) && events.length > 0) {
      for (const ev of events) {
        if (ev && ev.id) {
          const evRef = doc(db, 'matches', matchId, 'events', String(ev.id));
          await setDoc(evRef, sanitizeForFirestore(ev), { merge: true });
        }
      }
    }
  } catch (err) {
    console.error(`Failed to save uploaded match ${matchId}:`, err);
    throw err;
  }
}

/**
 * Saves an audit action log entry to Firestore.
 */
export async function saveActionLogToCloud(matchId, logEntry) {
  if (!matchId || !logEntry) return;
  try {
    const logId = logEntry.id || `act_${Date.now()}`;
    const logRef = doc(db, 'matches', matchId, 'action_logs', logId);
    await setDoc(logRef, sanitizeForFirestore(logEntry), { merge: true });
  } catch (err) {
    console.warn('Could not save action log to cloud:', err);
  }
}

/**
 * Retrieves audit action logs from Firestore.
 */
export async function getActionLogsFromCloud(matchId) {
  if (!matchId) return [];
  try {
    const logsCol = collection(db, 'matches', matchId, 'action_logs');
    const q = query(logsCol, orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  } catch (err) {
    console.warn('Could not get action logs from cloud:', err);
    return [];
  }
}

/**
 * Sends a real-time message between Developer and Scorer.
 */
export async function sendMatchMessage(matchId, { sender, senderName, text }) {
  if (!matchId || !text || !text.trim()) return;
  try {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msgRef = doc(db, 'matches', matchId, 'messages', msgId);
    const msgData = sanitizeForFirestore({
      id: msgId,
      matchId,
      sender: sender || 'developer', // 'developer' | 'scorer'
      senderName: senderName || (sender === 'developer' ? 'Developer (Maaz)' : 'Scorer'),
      text: text.trim(),
      timestamp: Date.now(),
      status: 'active'
    });
    await setDoc(msgRef, msgData);
    return msgData;
  } catch (err) {
    console.warn('sendMatchMessage error:', err);
    throw err;
  }
}

/**
 * Sets a match status to 'inactive' (soft deletion for developer).
 * Preserves the document and all events while hiding from active lists.
 */
export async function setMatchInactive(matchId) {
  if (!matchId) return false;
  try {
    const matchRef = doc(db, 'matches', matchId);
    await setDoc(matchRef, { status: 'inactive', updatedAt: Date.now() }, { merge: true });
    return true;
  } catch (err) {
    console.warn('setMatchInactive error:', err);
    throw err;
  }
}

/**
 * Sets a message status to 'inactive' (soft deletion for developer).
 * Document is preserved with status set to 'inactive'.
 */
export async function setMatchMessageInactive(matchId, messageId) {
  if (!matchId || !messageId) return;
  try {
    const msgRef = doc(db, 'matches', matchId, 'messages', messageId);
    await updateDoc(msgRef, {
      status: 'inactive'
    });
    return true;
  } catch (err) {
    console.warn('setMatchMessageInactive error:', err);
    throw err;
  }
}

/**
 * Subscribes to real-time chat messages between Developer and Scorer.
 */
export function subscribeMatchMessages(matchId, onMessagesUpdated) {
  if (!matchId) return () => {};
  try {
    const msgsCol = collection(db, 'matches', matchId, 'messages');
    const q = query(msgsCol, orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach((docSnap) => {
        messages.push({ id: docSnap.id, ...docSnap.data() });
      });
      onMessagesUpdated(messages);
    }, (err) => {
      console.warn('subscribeMatchMessages warning:', err);
    });
  } catch (err) {
    console.warn('subscribeMatchMessages init error:', err);
    return () => {};
  }
}
