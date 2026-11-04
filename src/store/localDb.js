const DB_NAME = 'cricket_scorer_db';
const DB_VERSION = 2;

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
    return new Promise((resolve) => {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => resolve(record);
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
    } catch (e) {}
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
    return new Promise((resolve) => {
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
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction('matches', 'readonly');
      const store = tx.objectStore('matches');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

/**
 * Saves a registered manager profile to IndexedDB and localStorage.
 */
export async function saveManagerLocally(managerData) {
  if (!managerData || !managerData.uid) return;
  const record = {
    uid: managerData.uid,
    name: managerData.name || 'Manager',
    email: managerData.email || '',
    password: managerData.password || '',
    createdAt: managerData.createdAt || Date.now(),
    lastActive: Date.now()
  };

  try {
    const key = 'cricket_local_managers';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = current.findIndex(m => m.uid === record.uid);
    if (idx !== -1) current[idx] = { ...current[idx], ...record };
    else current.push(record);
    localStorage.setItem(key, JSON.stringify(current));
  } catch (e) {}

  try {
    const db = await openDb();
    const tx = db.transaction('managers', 'readwrite');
    tx.objectStore('managers').put(record);
  } catch (e) {}

  return record;
}

/**
 * Updates a manager record locally (email, password, name).
 */
export async function updateManagerLocally(uid, updates) {
  if (!uid || !updates) return null;
  try {
    const key = 'cricket_local_managers';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = current.findIndex(m => m.uid === uid);
    let updatedRecord = null;
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...updates, lastActive: Date.now() };
      updatedRecord = current[idx];
      localStorage.setItem(key, JSON.stringify(current));
    }
    const currentSession = JSON.parse(localStorage.getItem('cricket_manager_user') || 'null');
    if (currentSession && currentSession.uid === uid) {
      localStorage.setItem('cricket_manager_user', JSON.stringify({ ...currentSession, ...updates }));
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
      const merged = { ...existing, ...updates, lastActive: Date.now() };
      store.put(merged);
    }
    return updatedRecord;
  } catch (e) {
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
          } catch (e) {}
        }
        list.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    try {
      return JSON.parse(localStorage.getItem('cricket_local_managers') || '[]');
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
  } catch (e) {}

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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
    console.warn('Error clearing IndexedDB:', e);
  }
}
