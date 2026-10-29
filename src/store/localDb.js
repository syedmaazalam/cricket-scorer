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
 */
export async function saveEventLocally(event, synced = false) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const record = {
      ...event,
      synced: synced ? 1 : 0,
      savedAt: Date.now()
    };
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Gets all events for a match ordered by sequence.
 */
export async function getEventsForMatch(matchId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly');
    const store = tx.objectStore('events');
    const index = store.index('matchId');
    const req = index.getAll(matchId);
    req.onsuccess = () => {
      const results = req.result || [];
      results.sort((a, b) => a.seq - b.seq);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
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
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('matches', 'readwrite');
    const store = tx.objectStore('matches');
    const record = {
      matchId,
      ...data,
      updatedAt: Date.now()
    };
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves a match snapshot by ID.
 */
export async function getMatchSnapshot(matchId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('matches', 'readonly');
    const store = tx.objectStore('matches');
    const req = store.get(matchId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
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
