import { replayEvents } from '../engine/reducer.js';

const DB_NAME = 'cricket_scorer_db';
const DB_VERSION = 3;

let dbPromise = null;

export function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Object store for match events
      if (!db.objectStoreNames.contains('events')) {
        const eventStore = db.createObjectStore('events', { keyPath: 'id' });
        eventStore.createIndex('matchId', 'matchId', { unique: false });
        eventStore.createIndex('matchId_seq', ['matchId', 'seq'], { unique: true });
        eventStore.createIndex('synced', 'synced', { unique: false });
      }

      // Object store for match summaries/snapshots
      if (!db.objectStoreNames.contains('matches')) {
        const matchStore = db.createObjectStore('matches', { keyPath: 'matchId' });
        matchStore.createIndex('code', 'code', { unique: false });
        matchStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        matchStore.createIndex('managerId', 'managerId', { unique: false });
      }

      // Object store for registered managers
      if (!db.objectStoreNames.contains('managers')) {
        const managerStore = db.createObjectStore('managers', { keyPath: 'uid' });
        managerStore.createIndex('email', 'email', { unique: false });
        managerStore.createIndex('lastActive', 'lastActive', { unique: false });
      }

      // Object store for offline event queue (Phase 1 idempotency)
      if (!db.objectStoreNames.contains('offline_queue')) {
        const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id' });
        queueStore.createIndex('matchId', 'matchId', { unique: false });
        queueStore.createIndex('matchId_seq', ['matchId', 'seq'], { unique: true });
        queueStore.createIndex('seq', 'seq', { unique: false });
        queueStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

/**
 * Persists an event to local IndexedDB before any UI/network operation.
 * Also mirrors in localStorage as fallback.
 */
export async function saveEventLocally(event, synced = false) {
  const record = {
    ...event,
    synced: synced ? 1 : 0,
    savedAt: Date.now()
  };

  try {
    const lsKey = `cricket_events_${event.matchId}`;
    const existing = JSON.parse(localStorage.getItem(lsKey) || '[]');
    const idx = existing.findIndex(e => e.id === event.id || e.seq === event.seq);
    if (idx !== -1) existing[idx] = record;
    else existing.push(record);
    localStorage.setItem(lsKey, JSON.stringify(existing));
  } catch {}

  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => resolve(record);
    });
  } catch {
    return record;
  }
}

/**
 * Phase 1 Requirement 2: Saves the event, the match snapshot, and the offline_queue entry
 * in ONE single atomic IndexedDB transaction.
 */
export async function saveEventAndSnapshotAtomically(event, snapshot, enqueue = true) {
  const eventRecord = {
    ...event,
    synced: 0,
    savedAt: Date.now()
  };

  const snapshotRecord = snapshot ? {
    ...snapshot,
    matchId: event.matchId,
    updatedAt: Date.now()
  } : null;

  const queueRecord = {
    id: event.id,
    seq: event.seq,
    matchId: event.matchId,
    event: eventRecord,
    createdAt: Date.now()
  };

  // 1. Synchronous fallback in localStorage
  try {
    const lsKey = `cricket_events_${event.matchId}`;
    const existing = JSON.parse(localStorage.getItem(lsKey) || '[]');
    const idx = existing.findIndex(e => e.id === event.id || e.seq === event.seq);
    if (idx !== -1) existing[idx] = eventRecord;
    else existing.push(eventRecord);
    localStorage.setItem(lsKey, JSON.stringify(existing));

    if (snapshotRecord) {
      saveFastPaintSnapshot(event.matchId, snapshotRecord);
      localStorage.setItem(`cricket_snapshot_${event.matchId}`, JSON.stringify(snapshotRecord));
      if (snapshotRecord.code) {
        localStorage.setItem(`cricket_snapshot_${snapshotRecord.code}`, JSON.stringify(snapshotRecord));
      }
    }

    if (enqueue) {
      const qKey = `cricket_offline_queue_${event.matchId}`;
      const qExisting = JSON.parse(localStorage.getItem(qKey) || '[]');
      const qIdx = qExisting.findIndex(e => e.id === event.id || e.seq === event.seq);
      if (qIdx !== -1) qExisting[qIdx] = queueRecord;
      else qExisting.push(queueRecord);
      localStorage.setItem(qKey, JSON.stringify(qExisting));
    }
  } catch {}

  // 2. Single atomic IndexedDB transaction across ['events', 'matches', 'offline_queue']
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const hasQueueStore = db.objectStoreNames.contains('offline_queue');
      const storeNames = ['events', 'matches'];
      if (enqueue && hasQueueStore) {
        storeNames.push('offline_queue');
      }

      const tx = db.transaction(storeNames, 'readwrite');
      tx.objectStore('events').put(eventRecord);

      if (snapshotRecord) {
        tx.objectStore('matches').put(snapshotRecord);
      }

      if (enqueue && hasQueueStore) {
        tx.objectStore('offline_queue').put(queueRecord);
      }

      tx.oncomplete = () => resolve({ event: eventRecord, snapshot: snapshotRecord });
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    return { event: eventRecord, snapshot: snapshotRecord };
  }
}

/**
 * Gets all entries currently in the offline queue, sorted by seq ascending.
 */
export async function getOfflineQueue(matchId = null) {
  const getFromLocalStorage = () => {
    try {
      if (matchId) {
        const items = JSON.parse(localStorage.getItem(`cricket_offline_queue_${matchId}`) || '[]');
        items.sort((a, b) => (a.seq || 0) - (b.seq || 0));
        return items;
      }
      const list = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cricket_offline_queue_')) {
          const items = JSON.parse(localStorage.getItem(key) || '[]');
          list.push(...items);
        }
      }
      list.sort((a, b) => (a.seq || 0) - (b.seq || 0));
      return list;
    } catch {
      return [];
    }
  };

  try {
    const db = await openDb();
    if (!db.objectStoreNames.contains('offline_queue')) {
      return getFromLocalStorage();
    }

    const entries = await new Promise((resolve) => {
      const tx = db.transaction('offline_queue', 'readonly');
      const store = tx.objectStore('offline_queue');
      if (matchId) {
        const index = store.index('matchId');
        const req = index.getAll(matchId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      }
    });

    if (entries.length > 0) {
      entries.sort((a, b) => (a.seq || 0) - (b.seq || 0));
      return entries;
    }
    return getFromLocalStorage();
  } catch {
    return getFromLocalStorage();
  }
}

/**
 * Deletes confirmed queue entries from offline_queue and marks events as synced: 1.
 */
export async function removeOfflineQueueEntries(entryIds = [], matchId = null) {
  if (!entryIds || entryIds.length === 0) return;
  const idSet = new Set(entryIds);

  // 1. Clean localStorage fallback
  try {
    if (matchId) {
      const qKey = `cricket_offline_queue_${matchId}`;
      const existing = JSON.parse(localStorage.getItem(qKey) || '[]');
      const filtered = existing.filter(e => !idSet.has(e.id));
      localStorage.setItem(qKey, JSON.stringify(filtered));
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cricket_offline_queue_')) {
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        if (existing.some(e => idSet.has(e.id))) {
          const filtered = existing.filter(e => !idSet.has(e.id));
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    }
  } catch {}

  // 2. Remove from IndexedDB offline_queue and mark synced in events
  try {
    const db = await openDb();
    const hasQueue = db.objectStoreNames.contains('offline_queue');
    const storeNames = hasQueue ? ['offline_queue', 'events'] : ['events'];

    return new Promise((resolve) => {
      const tx = db.transaction(storeNames, 'readwrite');
      const eventStore = tx.objectStore('events');
      const queueStore = hasQueue ? tx.objectStore('offline_queue') : null;

      for (const id of entryIds) {
        if (queueStore) queueStore.delete(id);
        const req = eventStore.get(id);
        req.onsuccess = () => {
          if (req.result) {
            const updated = { ...req.result, synced: 1 };
            eventStore.put(updated);
          }
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

/**
 * Counts pending queue entries.
 */
export async function peekOfflineQueueCount(matchId = null) {
  const entries = await getOfflineQueue(matchId);
  return entries.length;
}

/**
 * Gets all events for a match ordered by sequence.
 */
export async function getEventsForMatch(matchId) {
  if (!matchId) return [];

  const getFromLocalStorage = () => {
    try {
      const direct = JSON.parse(localStorage.getItem(`cricket_events_${matchId}`) || '[]');
      if (direct.length > 0) return direct;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cricket_events_')) {
          const evts = JSON.parse(localStorage.getItem(key) || '[]');
          if (evts.some(e => e.matchId === matchId || e.payload?.code === matchId)) {
            return evts;
          }
        }
      }
    } catch {}
    return [];
  };

  try {
    const db = await openDb();
    const results = await new Promise((resolve) => {
      const tx = db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const index = store.index('matchId');
      const req = index.getAll(matchId);
      req.onsuccess = () => {
        const res = req.result || [];
        res.sort((a, b) => a.seq - b.seq);
        resolve(res);
      };
      req.onerror = () => resolve([]);
    });

    if (results.length > 0) return results;
    return getFromLocalStorage();
  } catch {
    return getFromLocalStorage();
  }
}

/**
 * Permanently deletes specified events from IndexedDB and localStorage (used by Undo).
 * Also purges dropped events from offline_queue so they are never erroneously flushed.
 */
export async function deleteEventsLocally(matchId, eventIds = []) {
  if (!matchId || !eventIds || eventIds.length === 0) return;
  const idSet = new Set(eventIds);

  // 1. Purge from localStorage
  try {
    const lsKey = `cricket_events_${matchId}`;
    const existing = JSON.parse(localStorage.getItem(lsKey) || '[]');
    const filtered = existing.filter(e => !idSet.has(e.id));
    localStorage.setItem(lsKey, JSON.stringify(filtered));

    const qKey = `cricket_offline_queue_${matchId}`;
    const qExisting = JSON.parse(localStorage.getItem(qKey) || '[]');
    const qFiltered = qExisting.filter(e => !idSet.has(e.id));
    localStorage.setItem(qKey, JSON.stringify(qFiltered));

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('cricket_events_') || key.startsWith('cricket_offline_queue_')) && key !== lsKey && key !== qKey) {
        const evts = JSON.parse(localStorage.getItem(key) || '[]');
        if (evts.some(e => idSet.has(e.id))) {
          const updated = evts.filter(e => !idSet.has(e.id));
          localStorage.setItem(key, JSON.stringify(updated));
        }
      }
    }
  } catch {}

  // 2. Purge from IndexedDB (both events and offline_queue)
  try {
    const db = await openDb();
    const hasQueue = db.objectStoreNames.contains('offline_queue');
    const storeNames = hasQueue ? ['events', 'offline_queue'] : ['events'];

    return new Promise((resolve) => {
      const tx = db.transaction(storeNames, 'readwrite');
      const store = tx.objectStore('events');
      const queueStore = hasQueue ? tx.objectStore('offline_queue') : null;
      for (const id of eventIds) {
        store.delete(id);
        if (queueStore) queueStore.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

/**
 * Returns unsynced events (synced === 0) for a match.
 */
export async function getUnsyncedEvents(matchId) {
  const allEvents = await getEventsForMatch(matchId);
  return allEvents.filter(e => !e.synced);
}

/**
 * Marks an event as synced in IndexedDB.
 */
export async function markEventSynced(eventId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const getReq = store.get(eventId);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.synced = 1;
        store.put(item);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Saves a match summary snapshot for quick listing and offline resume.
 */
export async function saveMatchSnapshot(matchId, data) {
  const record = {
    matchId,
    ...data,
    updatedAt: Date.now()
  };

  try {
    saveFastPaintSnapshot(matchId, record);
    localStorage.setItem(`cricket_snapshot_${matchId}`, JSON.stringify(record));
    if (data?.code) {
      localStorage.setItem(`cricket_snapshot_${data.code}`, JSON.stringify(record));
    }
  } catch {}

  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction('matches', 'readwrite');
      const store = tx.objectStore('matches');
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => resolve(record);
    });
  } catch {
    return record;
  }
}

/**
 * Phase 4 Requirement 2:
 * Creates a minimal snapshot of the latest match state containing only essential fields
 * (score, wickets, overs, striker, bowler, activeMatchId, lastActive, seq) for fast first paint.
 */
export function createFastPaintSnapshot(matchId, state = {}) {
  const inningsIndex = state.currentInningsIndex !== undefined ? state.currentInningsIndex : 0;
  const currentInnings = (state.innings && state.innings[inningsIndex]) || (state.innings && state.innings[0]) || {};
  const oversFormatted = `${currentInnings.completedOvers || 0}.${currentInnings.ballsInCurrentOver || 0}`;
  
  const strikerName = typeof state.striker === 'object' && state.striker !== null 
    ? (state.striker.name || '') 
    : (typeof state.striker === 'string' ? state.striker : '');
    
  const bowlerName = typeof state.currentBowler === 'object' && state.currentBowler !== null
    ? (state.currentBowler.name || '')
    : (typeof state.currentBowler === 'string' ? state.currentBowler : '');

  const totalScore = state.score !== undefined 
    ? state.score 
    : (currentInnings.runs !== undefined ? currentInnings.runs : 0);
    
  const totalWickets = state.wickets !== undefined 
    ? state.wickets 
    : (currentInnings.wickets !== undefined ? currentInnings.wickets : 0);

  const lastSeq = state.lastSeq !== undefined 
    ? state.lastSeq 
    : (state.seq !== undefined 
      ? state.seq 
      : (Array.isArray(state.events) && state.events.length > 0 
        ? (state.events[state.events.length - 1]?.seq || state.events.length)
        : (currentInnings.balls?.length || 0)));

  return {
    activeMatchId: matchId || state.matchId || state.id || '',
    matchId: matchId || state.matchId || state.id || '',
    code: state.code || '',
    lastActive: Date.now(),
    score: totalScore,
    wickets: totalWickets,
    overs: state.oversFormatted || oversFormatted,
    striker: strikerName,
    bowler: bowlerName,
    battingTeam: currentInnings.battingTeam || state.teams?.teamA || '',
    bowlingTeam: currentInnings.bowlingTeam || state.teams?.teamB || '',
    seq: lastSeq
  };
}

/**
 * Phase 4 Requirement 2:
 * Saves the minimal fast-paint snapshot to LocalStorage. All writes are wrapped in try/catch.
 */
export function saveFastPaintSnapshot(matchId, state) {
  if (!matchId && !state) return;
  const effectiveId = matchId || state?.matchId || state?.id;
  try {
    if (typeof localStorage === 'undefined') return;
    const compact = createFastPaintSnapshot(effectiveId, state);
    localStorage.setItem('cricket_fast_paint_snapshot', JSON.stringify(compact));
    localStorage.setItem('cricket_active_session', JSON.stringify({
      activeMatchId: effectiveId,
      lastActive: Date.now()
    }));
    // Backwards-compatible snapshot for existing consumers expecting cricket_match_state
    localStorage.setItem('cricket_match_state', JSON.stringify(compact));
  } catch (e) {
    console.warn('saveFastPaintSnapshot write error (handled gracefully):', e);
  }
}

/**
 * Phase 4 Requirement 2:
 * Retrieves the minimal fast-paint snapshot from LocalStorage. Wrapped in try/catch.
 */
export function getFastPaintSnapshot(matchId = null) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('cricket_fast_paint_snapshot') || localStorage.getItem('cricket_match_state');
    if (!raw) return null;
    const snap = JSON.parse(raw);
    if (!matchId || snap.activeMatchId === matchId || snap.matchId === matchId || snap.code === matchId) {
      return snap;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Phase 4 Requirement 3:
 * After IndexedDB opens, verify the last seq against the events store and replace the cache if it differs.
 */
export async function verifyAndReconcileLocalSequence(matchId) {
  if (!matchId) return null;
  try {
    const events = await getEventsForMatch(matchId);
    let maxEventSeq = 0;
    if (events && events.length > 0) {
      for (const ev of events) {
        if ((ev.seq || 0) > maxEventSeq) maxEventSeq = ev.seq;
      }
    }

    const currentSnapshot = await getMatchSnapshot(matchId);
    const cachedFastPaint = getFastPaintSnapshot(matchId);
    const cachedSeq = cachedFastPaint?.seq ?? currentSnapshot?.seq ?? currentSnapshot?.lastSeq ?? 0;

    if (cachedSeq !== maxEventSeq && events.length > 0) {
      const replayed = replayEvents(events);
      const merged = currentSnapshot 
        ? { ...currentSnapshot, ...replayed, seq: maxEventSeq, lastSeq: maxEventSeq } 
        : { ...replayed, seq: maxEventSeq, lastSeq: maxEventSeq };
      await saveMatchSnapshot(matchId, merged);
      saveFastPaintSnapshot(matchId, merged);
      return { verified: true, replaced: true, state: merged, seq: maxEventSeq };
    }

    if (currentSnapshot) {
      saveFastPaintSnapshot(matchId, currentSnapshot);
    }
    return { verified: true, replaced: false, state: currentSnapshot, seq: maxEventSeq };
  } catch (e) {
    console.warn('verifyAndReconcileLocalSequence error:', e);
    return null;
  }
}

/**
 * Phase 4 Requirement 4:
 * Call navigator.storage.persist() on boot to protect data from browser eviction.
 */
export async function requestStoragePersistence() {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
    try {
      const isPersisted = typeof navigator.storage.persisted === 'function'
        ? await navigator.storage.persisted()
        : false;
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        return granted;
      }
      return true;
    } catch (e) {
      console.warn('navigator.storage.persist error:', e);
      return false;
    }
  }
  return false;
}

/**
 * Phase 4 Requirement 5:
 * Migrate the old cricket_match_state once, safely into IndexedDB.
 */
export async function migrateLegacyMatchState() {
  if (typeof localStorage === 'undefined') return { migrated: false };
  try {
    const isDone = localStorage.getItem('cricket_legacy_migrated_v4');
    if (isDone === 'true') return { migrated: false, alreadyDone: true };

    const raw = localStorage.getItem('cricket_match_state');
    if (!raw) {
      localStorage.setItem('cricket_legacy_migrated_v4', 'true');
      return { migrated: false, reason: 'no_legacy_data' };
    }

    const legacy = JSON.parse(raw);
    const matchId = legacy.matchId || legacy.id || legacy.code;

    if (matchId) {
      // 1. Ensure it exists in IndexedDB
      const existingInIdb = await getMatchSnapshot(matchId);
      if (!existingInIdb) {
        await saveMatchSnapshot(matchId, legacy);
      }

      // 2. Replace monolithic state in localStorage with small fast-paint snapshot
      saveFastPaintSnapshot(matchId, legacy);
    }

    // Mark migration complete
    localStorage.setItem('cricket_legacy_migrated_v4', 'true');
    return { migrated: true, matchId };
  } catch (e) {
    console.warn('migrateLegacyMatchState error:', e);
    return { migrated: false, error: e };
  }
}

/**
 * Retrieves a match snapshot by ID or code.
 */
export async function getMatchSnapshot(matchId) {
  if (!matchId) return null;

  const getFromLocalStorage = () => {
    try {
      const direct = localStorage.getItem(`cricket_snapshot_${matchId}`);
      if (direct) return JSON.parse(direct);
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cricket_snapshot_')) {
          const snap = JSON.parse(localStorage.getItem(key) || 'null');
          if (snap && (snap.matchId === matchId || snap.code === matchId)) {
            return snap;
          }
        }
      }
    } catch {}
    return null;
  };

  try {
    const db = await openDb();
    const result = await new Promise((resolve) => {
      const tx = db.transaction('matches', 'readonly');
      const store = tx.objectStore('matches');
      const req = store.get(matchId);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result);
          return;
        }
        if (store.indexNames.contains('code')) {
          const codeIndex = store.index('code');
          const codeReq = codeIndex.get(matchId);
          codeReq.onsuccess = () => resolve(codeReq.result || null);
          codeReq.onerror = () => resolve(null);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });

    if (result) return result;
    return getFromLocalStorage();
  } catch {
    return getFromLocalStorage();
  }
}

/**
 * Deletes an individual match and its events from IndexedDB and localStorage.
 */
export async function deleteMatchLocally(matchId) {
  try {
    localStorage.removeItem(`cricket_events_${matchId}`);
    localStorage.removeItem(`cricket_match_${matchId}`);
    localStorage.removeItem(`cricket_snapshot_${matchId}`);
    localStorage.removeItem(`cricket_action_logs_${matchId}`);
    localStorage.removeItem(`cricket_offline_queue_${matchId}`);

    if (typeof indexedDB !== 'undefined') {
      const db = await openDb();
      const tx = db.transaction(['matches', 'events'], 'readwrite');
      const matchStore = tx.objectStore('matches');
      
      // Also remove by match code if present in record
      const getReq = matchStore.get(matchId);
      getReq.onsuccess = () => {
        if (getReq.result?.code) {
          localStorage.removeItem(`cricket_snapshot_${getReq.result.code}`);
        }
        matchStore.delete(matchId);
      };

      const eventStore = tx.objectStore('events');
      const index = eventStore.index('matchId');
      const req = index.getAllKeys(matchId);
      req.onsuccess = () => {
        (req.result || []).forEach(k => eventStore.delete(k));
      };
    }
  } catch (e) {
    console.warn('deleteMatchLocally error:', e);
  }
}

/**
 * Deletes all matches and events from IndexedDB and localStorage.
 */
export async function deleteAllMatchesLocally() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.push(k);
    }
    keys.forEach(k => {
      if (
        k.startsWith('cricket_events_') ||
        k.startsWith('cricket_match_') ||
        k.startsWith('cricket_snapshot_') ||
        k.startsWith('cricket_action_logs_') ||
        k.startsWith('cricket_offline_queue_')
      ) {
        localStorage.removeItem(k);
      }
    });
    localStorage.removeItem('cricket_active_match_id');
    localStorage.removeItem('cricket_live_code');
    localStorage.removeItem('cricket_fast_paint_snapshot');
    localStorage.removeItem('cricket_active_session');
    localStorage.removeItem('cricket_match_state');

    if (typeof indexedDB !== 'undefined') {
      const db = await openDb();
      const tx = db.transaction(['matches', 'events'], 'readwrite');
      tx.objectStore('matches').clear();
      tx.objectStore('events').clear();
    }
  } catch (e) {
    console.warn('deleteAllMatchesLocally error:', e);
  }
}

/**
 * Lists all matches stored locally, sorted by most recently updated.
 * Automatically deduplicates matches sharing the same match code or ID.
 */
export async function getAllLocalMatches() {
  const getFromLocalStorage = () => {
    try {
      const list = [];
      const seenIds = new Set();
      const seenCodes = new Set();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cricket_snapshot_')) {
          const snap = JSON.parse(localStorage.getItem(key) || 'null');
          if (snap) {
            const mid = snap.matchId || snap.id;
            const code = snap.code ? String(snap.code).trim().toUpperCase() : null;
            if (mid && seenIds.has(mid)) continue;
            if (code && seenCodes.has(code)) continue;
            if (mid) seenIds.add(mid);
            if (code) seenCodes.add(code);
            list.push(snap);
          }
        }
      }
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      return list;
    } catch {
      return [];
    }
  };

  try {
    const db = await openDb();
    const results = await new Promise((resolve) => {
      const tx = db.transaction('matches', 'readonly');
      const store = tx.objectStore('matches');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        // Deduplicate matches so duplicate matches with the same 6-char code never show twice
        const seenCodes = new Set();
        const seenIds = new Set();
        const deduplicated = [];

        for (const m of list) {
          if (!m) continue;
          const mid = m.matchId || m.id;
          const code = m.code ? String(m.code).trim().toUpperCase() : null;

          if (mid && seenIds.has(mid)) continue;
          if (code && seenCodes.has(code)) continue;

          if (mid) seenIds.add(mid);
          if (code) seenCodes.add(code);
          deduplicated.push(m);
        }

        resolve(deduplicated);
      };
      req.onerror = () => resolve([]);
    });

    if (results.length > 0) return results;
    return getFromLocalStorage();
  } catch {
    return getFromLocalStorage();
  }
}

/**
 * Lists all events across all matches in IndexedDB and localStorage (used by backup/restore).
 */
export async function getAllLocalEvents() {
  const getFromLocalStorage = () => {
    try {
      const list = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cricket_events_')) {
          const evts = JSON.parse(localStorage.getItem(key) || '[]');
          list.push(...evts);
        }
      }
      return list;
    } catch {
      return [];
    }
  };

  try {
    const db = await openDb();
    const results = await new Promise((resolve) => {
      const tx = db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    if (results.length > 0) return results;
    return getFromLocalStorage();
  } catch {
    return getFromLocalStorage();
  }
}

/**
 * Saves a registered manager profile to IndexedDB and localStorage.
 */
export async function saveManagerLocally(managerData) {
  if (!managerData || !managerData.uid) return;
  const { password: _password, ...safeData } = managerData;
  const record = {
    uid: safeData.uid,
    name: safeData.name || 'Manager',
    email: safeData.email || '',
    createdAt: safeData.createdAt || Date.now(),
    lastActive: Date.now()
  };

  try {
    const key = 'cricket_local_managers';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = current.findIndex(m => m.uid === record.uid);
    if (idx !== -1) {
      delete current[idx].password;
      current[idx] = { ...current[idx], ...record };
    } else {
      current.push(record);
    }
    localStorage.setItem(key, JSON.stringify(current));
  } catch {}

  try {
    const db = await openDb();
    const tx = db.transaction('managers', 'readwrite');
    tx.objectStore('managers').put(record);
  } catch {}

  return record;
}

/**
 * Updates a manager record locally (email, name, metadata). Never stores plaintext passwords.
 */
export async function updateManagerLocally(uid, updates) {
  if (!uid || !updates) return null;
  const { password: _password, ...safeUpdates } = updates;
  try {
    const key = 'cricket_local_managers';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = current.findIndex(m => m.uid === uid);
    let updatedRecord = null;
    if (idx !== -1) {
      delete current[idx].password;
      current[idx] = { ...current[idx], ...safeUpdates, lastActive: Date.now() };
      updatedRecord = current[idx];
      localStorage.setItem(key, JSON.stringify(current));
    }
    const currentSession = JSON.parse(localStorage.getItem('cricket_manager_user') || 'null');
    if (currentSession && currentSession.uid === uid) {
      delete currentSession.password;
      localStorage.setItem('cricket_manager_user', JSON.stringify({ ...currentSession, ...safeUpdates }));
    }
    const db = await openDb();
    const tx = db.transaction('managers', 'readwrite');
    const store = tx.objectStore('managers');
    const existing = await new Promise((res) => {
      const r = store.get(uid);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    });
    if (existing) {
      delete existing.password;
      const merged = { ...existing, ...safeUpdates, lastActive: Date.now() };
      store.put(merged);
    }
    return updatedRecord;
  } catch {
    return null;
  }
}

/**
 * Retrieves all managers stored locally.
 */
export async function getAllLocalManagers() {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction('managers', 'readonly');
      const store = tx.objectStore('managers');
      const req = store.getAll();
      req.onsuccess = () => {
        let list = req.result || [];
        if (list.length === 0) {
          try {
            list = JSON.parse(localStorage.getItem('cricket_local_managers') || '[]');
          } catch {}
        }
        // Ensure passwords are never present in returned manager records
        const sanitized = list.map(({ password: _password, ...m }) => m);
        sanitized.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
        resolve(sanitized);
      };
      req.onerror = () => {
        try {
          const list = JSON.parse(localStorage.getItem('cricket_local_managers') || '[]');
          resolve(list.map(({ password: _password, ...m }) => m));
        } catch {
          resolve([]);
        }
      };
    });
  } catch {
    try {
      const list = JSON.parse(localStorage.getItem('cricket_local_managers') || '[]');
      return list.map(({ password: _password, ...m }) => m);
    } catch {
      return [];
    }
  }
}

/**
 * Saves an audit action log with exact timestamp.
 */
export async function saveActionLogLocally(matchId, logEntry) {
  if (!matchId || !logEntry) return;
  const entry = {
    id: logEntry.id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    matchId,
    timestamp: logEntry.timestamp || Date.now(),
    isoTime: new Date(logEntry.timestamp || Date.now()).toLocaleTimeString(),
    action: logEntry.action || 'ACTION',
    title: logEntry.title || '',
    details: logEntry.details || '',
    scoreSnapshot: logEntry.scoreSnapshot || ''
  };

  try {
    const key = `cricket_action_logs_${matchId}`;
    const logs = JSON.parse(localStorage.getItem(key) || '[]');
    logs.push(entry);
    localStorage.setItem(key, JSON.stringify(logs));
  } catch {}

  return entry;
}

/**
 * Retrieves all action audit logs for a match in chronological order.
 */
export function getActionLogsLocally(matchId) {
  if (!matchId) return [];
  try {
    const key = `cricket_action_logs_${matchId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

/**
 * Wipes all previous matches, managers, snapshots, and logs for a completely fresh clean slate.
 */
export async function clearAllPreviousData() {
  try {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (
          k.startsWith('cricket_local_') ||
          k.startsWith('cricket_events_') ||
          k.startsWith('cricket_snapshot_') ||
          k.startsWith('cricket_action_logs_') ||
          k === 'cricket_manager_user' ||
          k === 'cricket_is_manager' ||
          k === 'cricket_active_match_id'
        )) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch {
    console.warn('Error clearing localStorage:', e);
  }

  try {
    const db = await openDb();
    const storeNames = ['matches', 'events', 'snapshots', 'managers'];
    for (const name of storeNames) {
      if (db.objectStoreNames.contains(name)) {
        const tx = db.transaction(name, 'readwrite');
        tx.objectStore(name).clear();
      }
    }
  } catch {
    console.warn('Error clearing IndexedDB:', e);
  }
}
