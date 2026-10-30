const DB_NAME = 'cricket_scorer_db';
const DB_VERSION = 1;

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
  } catch (e) {}

  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => resolve(record); // Don't throw, localStorage saved
    });
  } catch (err) {
    return record;
  }
}

/**
 * Gets all events for a match ordered by sequence.
 */
export async function getEventsForMatch(matchId) {
  if (!matchId) return [];

  // Fallback helper from localStorage
  const getFromLocalStorage = () => {
    try {
      const direct = JSON.parse(localStorage.getItem(`cricket_events_${matchId}`) || '[]');
      if (direct.length > 0) return direct;
      // Search all keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cricket_events_')) {
          const evts = JSON.parse(localStorage.getItem(key) || '[]');
          if (evts.some(e => e.matchId === matchId || e.payload?.code === matchId)) {
            return evts;
          }
        }
      }
    } catch (e) {}
    return [];
  };

  try {
    const db = await openDb();
    const results = await new Promise((resolve, reject) => {
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
  } catch (err) {
    return getFromLocalStorage();
  }
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
    localStorage.setItem(`cricket_snapshot_${matchId}`, JSON.stringify(record));
    if (data?.code) {
      localStorage.setItem(`cricket_snapshot_${data.code}`, JSON.stringify(record));
    }
  } catch (e) {}

  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('matches', 'readwrite');
      const store = tx.objectStore('matches');
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => resolve(record);
    });
  } catch (e) {
    return record;
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
    } catch (e) {}
    return null;
  };

  try {
    const db = await openDb();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction('matches', 'readonly');
      const store = tx.objectStore('matches');
      const req = store.get(matchId);
      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result);
          return;
        }
        // Fallback: check code index
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
  } catch (err) {
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
    const db = await openDb();
    const tx = db.transaction(['matches', 'events'], 'readwrite');
    tx.objectStore('matches').delete(matchId);
    const eventStore = tx.objectStore('events');
    const index = eventStore.index('matchId');
    const req = index.getAllKeys(matchId);
    req.onsuccess = () => {
      (req.result || []).forEach(k => eventStore.delete(k));
    };
  } catch (e) {}
}

/**
 * Deletes all matches and events from IndexedDB and localStorage.
 */
export async function deleteAllMatchesLocally() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith('cricket_events_') || k.startsWith('cricket_match_')) {
        localStorage.removeItem(k);
      }
    });
    const db = await openDb();
    const tx = db.transaction(['matches', 'events'], 'readwrite');
    tx.objectStore('matches').clear();
    tx.objectStore('events').clear();
  } catch (e) {}
}

/**
 * Lists all matches stored locally, sorted by most recently updated.
 */
export async function getAllLocalMatches() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('matches', 'readonly');
    const store = tx.objectStore('matches');
    const req = store.getAll();
    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}
