import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { App as CapApp } from '@capacitor/app';
import { db, auth, ensureAnonymousAuth } from '../firebase/config.js';
import {
  getOfflineQueue,
  removeOfflineQueueEntries,
  peekOfflineQueueCount,
  saveMatchSnapshot,
  getMatchSnapshot
} from './localDb.js';

let isDraining = false;
let retryAttempt = 0;
let retryTimeoutId = null;
let isSystemInitialized = false;
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
 * Phase 1 Requirement 1:
 * Generates a deterministic, idempotent event ID: {matchId}_{seq}
 * Used directly as the Firestore document ID to ensure retries never duplicate.
 */
export function createEventId(matchId, seq) {
  return `${matchId}_${seq}`;
}

/**
 * Subscribes to sync status changes.
 */
export function subscribeSyncStatus(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners(status) {
  listeners.forEach(fn => {
    try {
      fn(status);
    } catch {}
  });
}

/**
 * Phase 1 Requirement 5:
 * Compares local max sequence number with cloud max sequence number prior to flushing.
 * Logs and surfaces any gap to listeners.
 */
async function verifySequenceContinuity(matchId, localMaxSeq) {
  if (!matchId) return null;
  try {
    const matchRef = doc(db, 'matches', matchId);
    const snap = await getDoc(matchRef);
    if (!snap.exists()) return null;

    const cloudData = snap.data() || {};
    const cloudMaxSeq = Number(cloudData.lastSeq || cloudData.maxSeq || 0);

    if (cloudMaxSeq > localMaxSeq) {
      console.warn(`[Sync Gap] Cloud max seq (${cloudMaxSeq}) > local max seq (${localMaxSeq}) for match ${matchId}. Gap detected!`);
      notifyListeners({
        status: 'gap_detected',
        matchId,
        cloudMaxSeq,
        localMaxSeq,
        gap: cloudMaxSeq - localMaxSeq
      });
      return { hasGap: true, cloudMaxSeq, localMaxSeq };
    }
    return { hasGap: false, cloudMaxSeq, localMaxSeq };
  } catch (err) {
    console.warn('[Sync] Could not inspect cloud max seq (offline or unauthenticated):', err);
    return null;
  }
}

/**
 * Phase 1 Requirements 3, 4, 5:
 * Single-flight queue drainer with mutex lock, seq-order batching, confirmed-commit deletion,
 * and exponential backoff with jitter.
 */
export async function triggerQueueDrain(targetMatchId = null) {
  // Single-flight lock: only one drain runs at a time
  if (isDraining) {
    return;
  }

  // Clear pending scheduled retry if manually triggered
  if (retryTimeoutId) {
    clearTimeout(retryTimeoutId);
    retryTimeoutId = null;
  }

  isDraining = true;

  try {
    // 1. Fetch pending entries from offline_queue (ordered by seq asc)
    const queueEntries = await getOfflineQueue(targetMatchId);

    if (!queueEntries || queueEntries.length === 0) {
      retryAttempt = 0;
      notifyListeners({ status: 'synced', pendingCount: 0 });
      return;
    }

    // Sort strictly by sequence number ascending
    queueEntries.sort((a, b) => (a.seq || 0) - (b.seq || 0));

    notifyListeners({ status: 'syncing', pendingCount: queueEntries.length });

    // 2. Ensure auth & connection
    await ensureAnonymousAuth();

    // 3. Check sequence gap before flushing (Requirement 5)
    const activeMatchId = targetMatchId || queueEntries[0].matchId;
    const localMaxSeq = queueEntries[queueEntries.length - 1].seq;
    await verifySequenceContinuity(activeMatchId, localMaxSeq);

    // 4. Drain in seq order with batched writes (up to 25 events per batch)
    const chunkSize = 25;
    for (let i = 0; i < queueEntries.length; i += chunkSize) {
      const chunk = queueEntries.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      const batchMatchId = chunk[0].matchId || activeMatchId;

      for (const entry of chunk) {
        const ev = entry.event || entry;
        // Document ID is strictly deterministic: ${matchId}_${seq}
        const evRef = doc(db, 'matches', batchMatchId, 'events', ev.id);
        const eventDocData = sanitizeForFirestore({
          v: ev.v || 1,
          id: ev.id,
          seq: ev.seq,
          prevEventId: ev.prevEventId || null,
          scorerUid: ev.scorerUid || (auth.currentUser?.uid || null),
          scorerId: ev.scorerId || ev.deviceId || getDeviceId(),
          ballId: ev.ballId || null,
          matchId: batchMatchId,
          type: ev.type,
          payload: ev.payload || {},
          ts: ev.ts || Date.now(),
          deviceId: ev.deviceId || getDeviceId()
        });
        batch.set(evRef, eventDocData, { merge: true });
      }

      // Update match document summary with latest metadata and lastSeq in same batch
      const lastInChunk = chunk[chunk.length - 1].event || chunk[chunk.length - 1];
      const matchRef = doc(db, 'matches', batchMatchId);

      let effectiveState = null;
      try {
        effectiveState = await getMatchSnapshot(batchMatchId);
      } catch {}

      const curInn = effectiveState?.innings?.[effectiveState?.currentInningsIndex || 0];
      const matchCode = (effectiveState?.code || '').trim().toUpperCase();

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
      } catch {}

      const matchDocData = sanitizeForFirestore({
        lastSeq: lastInChunk.seq,
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
        ownerUid: effectiveState?.ownerUid || auth.currentUser?.uid || null,
        scorerUid: auth.currentUser?.uid || null,
        scorerId: getDeviceId(),
        leaseExpiresAt: Date.now() + 45000,
        updatedAt: Date.now()
      });

      batch.set(matchRef, matchDocData, { merge: true });

      // CONFIRMED COMMIT
      await batch.commit();

      // DELETE QUEUE ENTRIES ONLY AFTER CONFIRMED COMMIT
      const committedIds = chunk.map(c => c.id);
      await removeOfflineQueueEntries(committedIds, batchMatchId);
    }

    // Success: reset retry counter
    retryAttempt = 0;
    notifyListeners({ status: 'live', pendingCount: 0 });
  } catch (error) {
    console.warn('[Sync] Drain encountered error, scheduling exponential backoff:', error);
    retryAttempt++;

    // Exponential backoff with jitter: 1s, 2s, 4s, 8s, 16s, capped at 30s + 0-1000ms jitter
    const baseDelay = Math.min(30000, 1000 * Math.pow(2, Math.min(retryAttempt, 5)));
    const jitter = Math.random() * 1000;
    const delay = Math.round(baseDelay + jitter);

    const pendingCount = await peekOfflineQueueCount(targetMatchId);
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    notifyListeners({
      status: isOnline ? 'error' : 'offline',
      pendingCount,
      retryAttempt,
      nextRetryMs: delay,
      errorMessage: error?.message || String(error)
    });

    // Schedule retry with backoff
    retryTimeoutId = setTimeout(() => {
      triggerQueueDrain(targetMatchId);
    }, delay);
  } finally {
    isDraining = false;
  }
}

/**
 * Backward-compatible helper used across existing codebase.
 * Enqueues / triggers queue drain.
 */
export async function syncPendingEvents(matchId, currentMatchState) {
  if (matchId && currentMatchState) {
    await saveMatchSnapshot(matchId, currentMatchState);
  }
  return triggerQueueDrain(matchId);
}

/**
 * Phase 1 Requirement 4:
 * Sets up multi-trigger queue flush system across:
 * - App boot
 * - Window 'online'
 * - 'visibilitychange' (visible)
 * - Capacitor App resume
 * - Capacitor Network status change
 */
export function initSyncSystem(defaultMatchId = null, force = false) {
  if (isSystemInitialized && !force) {
    triggerQueueDrain(defaultMatchId);
    return;
  }
  isSystemInitialized = true;

  // 1. Trigger on boot
  triggerQueueDrain(defaultMatchId);

  if (typeof window !== 'undefined') {
    // 2. Window online
    window.addEventListener('online', () => {
      triggerQueueDrain(defaultMatchId);
    });

    window.addEventListener('offline', () => {
      notifyListeners({ status: 'offline', pendingCount: -1 });
    });

    // 3. Document visibility change (user returns to browser tab)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        triggerQueueDrain(defaultMatchId);
      }
    });

    // 4. Capacitor App resume (native mobile app returns from background)
    try {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          triggerQueueDrain(defaultMatchId);
        }
      });
    } catch {}

    // 5. Capacitor Network plugin status change
    try {
      const netPlugin = window.Capacitor?.Plugins?.Network;
      if (netPlugin?.addListener) {
        netPlugin.addListener('networkStatusChange', (status) => {
          if (status?.connected) {
            triggerQueueDrain(defaultMatchId);
          }
        });
      }
    } catch {}
  }
}

// Auto-initialize listeners on module load if in browser
if (typeof window !== 'undefined') {
  initSyncSystem();
}
