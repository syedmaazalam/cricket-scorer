import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db, ensureAnonymousAuth } from './config.js';

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
 * Updates match heartbeat (scorer device online pulse).
 */
export async function updateMatchHeartbeat(matchId) {
  if (!matchId) return;
  try {
    const matchRef = doc(db, 'matches', matchId);
    await setDoc(matchRef, { lastSeen: Date.now() }, { merge: true });
  } catch (err) {
    // Ignore network dropouts; will update on next pulse
  }
}

/**
 * Creates a match document in Firestore.
 */
export async function createMatchInCloud(matchId, matchData) {
  try {
    const user = await ensureAnonymousAuth();
    const matchRef = doc(db, 'matches', matchId);
    const data = sanitizeForFirestore({
      ...matchData,
      scorerId: user?.uid || 'anonymous',
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
 * Finds a match by its 6-character code.
 */
export async function findMatchByCode(code) {
  const cleanCode = (code || '').trim().toUpperCase();
  const q = query(collection(db, 'matches'), where('code', '==', cleanCode));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const matchDoc = snap.docs[0];
  return {
    matchId: matchDoc.id,
    ...matchDoc.data()
  };
}

/**
 * Searches matches by team names or match code.
 */
export async function searchMatches(queryText) {
  if (!queryText) return [];
  const clean = queryText.trim().toLowerCase();

  // Try direct code match first
  if (clean.length === 6) {
    const direct = await findMatchByCode(clean);
    if (direct) return [direct];
  }

  try {
    const q = query(collection(db, 'matches'), orderBy('updatedAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    const matches = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const teamA = (data.teams?.[0]?.name || '').toLowerCase();
      const teamB = (data.teams?.[1]?.name || '').toLowerCase();
      const code = (data.code || '').toLowerCase();
      if (teamA.includes(clean) || teamB.includes(clean) || code.includes(clean)) {
        matches.push({ matchId: docSnap.id, ...data });
      }
    });
    return matches;
  } catch (err) {
    console.warn('Match search error:', err);
    return [];
  }
}

/**
 * Subscribes to real-time events for live viewing and catch-up.
 */
export function subscribeToMatchEvents(matchId, callback) {
  const eventsRef = collection(db, 'matches', matchId, 'events');
  const q = query(eventsRef, orderBy('seq', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const events = [];
    snapshot.forEach((doc) => {
      events.push(doc.data());
    });
    callback(events, snapshot.metadata.fromCache);
  }, (err) => {
    console.warn('Events subscription warning (offline fallback active):', err);
  });
}

/**
 * Subscribes to match summary updates.
 */
export function subscribeToMatchDoc(matchId, callback) {
  const matchRef = doc(db, 'matches', matchId);
  return onSnapshot(matchRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({
        matchId: docSnap.id,
        ...docSnap.data()
      }, docSnap.metadata.fromCache);
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
 * Deletes a single match and its event subcollection from Cloud.
 */
export async function deleteMatchFromCloud(matchId) {
  if (!matchId) return;
  try {
    // 1. Delete events
    const eventsRef = collection(db, 'matches', matchId, 'events');
    const snap = await getDocs(eventsRef);
    const deletions = [];
    snap.forEach((docSnap) => {
      deletions.push(deleteDoc(doc(db, 'matches', matchId, 'events', docSnap.id)));
    });
    await Promise.all(deletions);
    // 2. Delete main match doc
    await deleteDoc(doc(db, 'matches', matchId));
  } catch (err) {
    console.error(`Failed to delete match ${matchId} from cloud:`, err);
    throw err;
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

    // Save events
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
