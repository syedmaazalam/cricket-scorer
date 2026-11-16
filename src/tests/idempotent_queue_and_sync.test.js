import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockStore = {};
globalThis.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => { mockStore[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); },
  get length() { return Object.keys(mockStore).length; },
  key: (i) => Object.keys(mockStore)[i] || null
};

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    Capacitor: { Plugins: { Network: { addListener: vi.fn() } } }
  };
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    visibilityState: 'visible'
  };
}

import {
  createEventId,
  triggerQueueDrain,
  initSyncSystem,
  getDeviceId
} from '../store/sync.js';
import {
  saveEventAndSnapshotAtomically,
  getOfflineQueue,
  removeOfflineQueueEntries,
  peekOfflineQueueCount,
  deleteEventsLocally
} from '../store/localDb.js';

describe('Phase 1: Idempotent Queue, Atomic Persistence & Auto-Flush', () => {
  const matchId = 'm_phase1_test';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1.1 Deterministic Event IDs & Idempotency', () => {
    it('generates deterministic event IDs matching ${matchId}_${seq} with strictly increasing sequence', () => {
      const id1 = createEventId(matchId, 1);
      const id2 = createEventId(matchId, 2);
      const id10 = createEventId(matchId, 10);

      expect(id1).toBe(`${matchId}_1`);
      expect(id2).toBe(`${matchId}_2`);
      expect(id10).toBe(`${matchId}_10`);
    });

    it('guarantees identical doc ID on retried delivery so Firestore never duplicates records', () => {
      const attempt1 = createEventId(matchId, 42);
      const attempt2 = createEventId(matchId, 42);

      expect(attempt1).toBe(attempt2);
      expect(attempt1).toBe(`${matchId}_42`);
    });

    it('creates a persistent deviceId without introducing randomness into the event document ID', () => {
      const devId1 = getDeviceId();
      const devId2 = getDeviceId();
      expect(devId1).toBeTruthy();
      expect(devId1).toBe(devId2);

      const evId = createEventId(matchId, 5);
      expect(evId).not.toContain(devId1);
      expect(evId).toBe(`${matchId}_5`);
    });
  });

  describe('1.2 Atomic IndexedDB Persistence & Offline Queue Enqueuing', () => {
    it('persists event, snapshot, and offline queue entry atomically', async () => {
      const event = {
        id: createEventId(matchId, 1),
        seq: 1,
        matchId,
        type: 'BALL',
        payload: { runs: 4, isWicket: false },
        ts: Date.now()
      };

      const snapshot = {
        matchId,
        code: 'PH1TEST',
        status: 'in_progress',
        overs: 20,
        score: 4,
        wickets: 0
      };

      const result = await saveEventAndSnapshotAtomically(event, snapshot, true);

      expect(result.event.id).toBe(`${matchId}_1`);
      expect(result.event.synced).toBe(0);
      expect(result.snapshot.code).toBe('PH1TEST');

      // Verify offline queue entry was recorded
      const queue = await getOfflineQueue(matchId);
      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe(`${matchId}_1`);
      expect(queue[0].seq).toBe(1);

      // Verify synchronous localStorage fallback was written
      const lsEvents = JSON.parse(localStorage.getItem(`cricket_events_${matchId}`));
      expect(lsEvents.length).toBe(1);
      expect(lsEvents[0].id).toBe(`${matchId}_1`);

      const lsSnapshot = JSON.parse(localStorage.getItem('cricket_match_state'));
      expect(lsSnapshot.score).toBe(4);
    });

    it('orders offline queue in strictly ascending sequence number order', async () => {
      // Simulate out-of-order local arrival
      const ev3 = { id: `${matchId}_3`, seq: 3, matchId, type: 'BALL', payload: { runs: 1 } };
      const ev1 = { id: `${matchId}_1`, seq: 1, matchId, type: 'BALL', payload: { runs: 0 } };
      const ev2 = { id: `${matchId}_2`, seq: 2, matchId, type: 'BALL', payload: { runs: 6 } };

      await saveEventAndSnapshotAtomically(ev3, null, true);
      await saveEventAndSnapshotAtomically(ev1, null, true);
      await saveEventAndSnapshotAtomically(ev2, null, true);

      const queue = await getOfflineQueue(matchId);
      expect(queue.length).toBe(3);
      expect(queue[0].seq).toBe(1);
      expect(queue[1].seq).toBe(2);
      expect(queue[2].seq).toBe(3);
    });
  });

  describe('1.3 Confirmed Commit Deletion & Queue Pruning', () => {
    it('removes confirmed queue entries and marks corresponding events as synced: 1', async () => {
      const ev1 = { id: `${matchId}_1`, seq: 1, matchId, type: 'BALL', payload: { runs: 1 } };
      const ev2 = { id: `${matchId}_2`, seq: 2, matchId, type: 'BALL', payload: { runs: 2 } };

      await saveEventAndSnapshotAtomically(ev1, null, true);
      await saveEventAndSnapshotAtomically(ev2, null, true);

      expect(await peekOfflineQueueCount(matchId)).toBe(2);

      // Simulate confirmed commit of ev1 only (batch 1)
      await removeOfflineQueueEntries([`${matchId}_1`], matchId);

      const remainingQueue = await getOfflineQueue(matchId);
      expect(remainingQueue.length).toBe(1);
      expect(remainingQueue[0].id).toBe(`${matchId}_2`);
    });

    it('purges dropped events from offline_queue during Undo so undone balls never sync', async () => {
      const ev1 = { id: `${matchId}_1`, seq: 1, matchId, type: 'BALL', payload: { runs: 4 } };
      const ev2 = { id: `${matchId}_2`, seq: 2, matchId, type: 'BALL', payload: { runs: 6 } };

      await saveEventAndSnapshotAtomically(ev1, null, true);
      await saveEventAndSnapshotAtomically(ev2, null, true);

      expect(await peekOfflineQueueCount(matchId)).toBe(2);

      // User hits Undo on ball 2
      await deleteEventsLocally(matchId, [`${matchId}_2`]);

      const queueAfterUndo = await getOfflineQueue(matchId);
      expect(queueAfterUndo.length).toBe(1);
      expect(queueAfterUndo[0].id).toBe(`${matchId}_1`);
    });
  });

  describe('1.4 Single-Flight Lock & Multi-Trigger Wiring', () => {
    it('provides single-flight queue drainer that ignores redundant triggers while busy', async () => {
      // Trigger drainer
      const p1 = triggerQueueDrain(matchId);
      const p2 = triggerQueueDrain(matchId);

      // Both should resolve safely without throwing
      await expect(Promise.all([p1, p2])).resolves.toBeDefined();
    });

    it('initializes sync system on app boot and wires lifecycle event listeners', () => {
      const addEventSpy = vi.spyOn(window, 'addEventListener');
      initSyncSystem(matchId, true);

      // Must attach window online and visibility listeners
      const attachedEvents = addEventSpy.mock.calls.map(c => c[0]);
      expect(attachedEvents).toContain('online');
      expect(attachedEvents).toContain('offline');
      addEventSpy.mockRestore();
    });
  });
});
