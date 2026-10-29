import { doc, writeBatch } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '../firebase/config.js';
import { getUnsyncedEvents, markEventSynced, saveMatchSnapshot } from './localDb.js';

let isSyncing = false;
const listeners = new Set();

/**
 * Removes undefined fields which cause Firestore batch.set() to fail.
 */
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
 * Gets or creates a persistent device ID.
 */
export function getDeviceId() {
  let devId = localStorage.getItem('cricket_device_id');
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('cricket_device_id', devId);
  }
  return devId;
}

/**
 * Generates an idempotent event ID: {matchId}_{seq}_{deviceId}
 */
export function createEventId(matchId, seq) {
  return `${matchId}_${seq}_${getDeviceId()}`;
}

/**
 * Subscribes to sync status changes.
 */
export function subscribeSyncStatus(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners(status) {
  listeners.forEach(fn => fn(status));
}

/**
 * Synchronizes pending local events to Firestore in sequence.
 * Idempotent: write uses event.id as document ID.
 */
export async function syncPendingEvents(matchId, currentMatchState) {
  if (!matchId) return;
  if (isSyncing) return;

  if (!navigator.onLine) {
    const pending = await getUnsyncedEvents(matchId);
    notifyListeners({ status: 'offline', pendingCount: pending.length });
    return;
  }

  try {
    isSyncing = true;
    await ensureAnonymousAuth();

    const pendingEvents = await getUnsyncedEvents(matchId);

    if (pendingEvents.length === 0) {
      notifyListeners({ status: 'synced', pendingCount: 0 });
      isSyncing = false;
      return;
    }

    notifyListeners({ status: 'syncing', pendingCount: pendingEvents.length });

    // Firestore batch writes (batches of up to 20 for safety)
    const chunkSize = 20;
    for (let i = 0; i < pendingEvents.length; i += chunkSize) {
      const chunk = pendingEvents.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const ev of chunk) {
        const evRef = doc(db, 'matches', matchId, 'events', ev.id);
        const eventDocData = sanitizeForFirestore({
          id: ev.id,
          seq: ev.seq,
          type: ev.type,
          payload: ev.payload || {},
          ts: ev.ts || Date.now(),
          deviceId: ev.deviceId || getDeviceId()
        });
        batch.set(evRef, eventDocData, { merge: true });
      }

      // Update match document summary in same batch
      const matchRef = doc(db, 'matches', matchId);
      const curInn = currentMatchState?.innings?.[currentMatchState?.currentInningsIndex || 0];

      const matchDocData = sanitizeForFirestore({
        code: currentMatchState?.code || '',
        status: currentMatchState?.status || 'in_progress',
        overs: currentMatchState?.overs || 20,
        playersPerTeam: currentMatchState?.playersPerTeam || 11,
        currentInningsIndex: currentMatchState?.currentInningsIndex || 0,
        striker: currentMatchState?.striker || null,
        nonStriker: currentMatchState?.nonStriker || null,
        currentBowler: currentMatchState?.currentBowler || null,
        isFreeHit: Boolean(currentMatchState?.isFreeHit),
        target: currentMatchState?.target != null ? currentMatchState.target : null,
        summary: {
          score: curInn?.score || 0,
          wickets: curInn?.wickets || 0,
          legalBalls: curInn?.legalBalls || 0,
          battingTeam: curInn?.battingTeam || ''
        },
        updatedAt: Date.now()
      });

      batch.set(matchRef, matchDocData, { merge: true });

      await batch.commit();

      // Mark locally as synced
      for (const ev of chunk) {
        await markEventSynced(ev.id);
      }
    }

    // Save snapshot locally
    if (currentMatchState) {
      await saveMatchSnapshot(matchId, currentMatchState);
    }

    notifyListeners({ status: 'live', pendingCount: 0 });
  } catch (error) {
    console.error('Firestore sync error:', error);
    const pending = await getUnsyncedEvents(matchId);
    notifyListeners({
      status: 'offline',
      pendingCount: pending.length,
      errorMessage: error.message || String(error)
    });
  } finally {
    isSyncing = false;
  }
}

// Auto-sync listener when browser reconnects
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifyListeners({ status: 'syncing', pendingCount: 0 });
  });

  window.addEventListener('offline', () => {
    notifyListeners({ status: 'offline', pendingCount: 0 });
  });
}
