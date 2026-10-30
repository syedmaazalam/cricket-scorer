import {
  collection,
  doc,
  setDoc,
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
