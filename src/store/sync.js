import { doc, writeBatch } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from '../firebase/config.js';
import { getUnsyncedEvents, markEventSynced, saveMatchSnapshot, getMatchSnapshot } from './localDb.js';

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

    // Fallback to local snapshot if state is partially loaded
    let effectiveState = currentMatchState;
    if (!effectiveState?.teams || effectiveState.teams.length === 0) {
      try {
        const snap = await getMatchSnapshot(matchId);
        if (snap) effectiveState = { ...snap, ...effectiveState };
      } catch (e) {}
    }

    // Attach manager information if available
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
    } catch (e) {}

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

      // Update match document summary with full metadata in same batch
      const matchRef = doc(db, 'matches', matchId);
      const curInn = effectiveState?.innings?.[effectiveState?.currentInningsIndex || 0];
      const matchCode = (effectiveState?.code || '').trim().toUpperCase();

      const matchDocData = sanitizeForFirestore({
        code: matchCode,
        status: effectiveState?.status || 'in_progress',
        overs: effectiveState?.overs || 20,
        playersPerTeam: effectiveState?.playersPerTeam || 11,
        teams: effectiveState?.teams || [],
        toss: effectiveState?.toss || null,
        currentInningsIndex: effectiveState?.currentInningsIndex || 0,
        striker: effectiveState?.striker || null,
        nonStriker: effectiveState?.nonStriker || null,
        currentBowler: effectiveState?.currentBowler || null,
        isFreeHit: Boolean(effectiveState?.isFreeHit),
        target: effectiveState?.target != null ? effectiveState.target : null,
        summary: {
          score: curInn?.score || 0,
          wickets: curInn?.wickets || 0,
          legalBalls: curInn?.legalBalls || 0,
          battingTeam: curInn?.battingTeam || (effectiveState?.teams?.[0]?.name || '')
        },
        innings: effectiveState?.innings || [],
        ...managerMeta,
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
    if (effectiveState) {
      await saveMatchSnapshot(matchId, effectiveState);
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
