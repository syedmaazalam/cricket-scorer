import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockStore = {};
globalThis.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => { mockStore[k] = String(v); globalThis.localStorage[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; delete globalThis.localStorage[k]; },
  clear: () => {
    Object.keys(mockStore).forEach(k => {
      delete mockStore[k];
      delete globalThis.localStorage[k];
    });
  },
  get length() { return Object.keys(mockStore).length; },
  key: (i) => Object.keys(mockStore)[i] || null
};

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
}

if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = {};
}

import {
  createFastPaintSnapshot,
  saveFastPaintSnapshot,
  getFastPaintSnapshot,
  verifyAndReconcileLocalSequence,
  requestStoragePersistence,
  migrateLegacyMatchState,
  saveMatchSnapshot,
  getMatchSnapshot,
  saveEventAndSnapshotAtomically
} from '../store/localDb.js';

describe('Phase 4: Move Full State to IndexedDB & Fast Paint Optimization', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  describe('1 & 2. Fast Paint Snapshot Extraction & Try/Catch LocalStorage', () => {
    it('creates compact snapshot with essential score, wickets, overs, striker, and bowler', () => {
      const matchState = {
        matchId: 'match_test_401',
        currentInningsIndex: 0,
        teams: { teamA: 'Warriors', teamB: 'Titans' },
        striker: { name: 'Babar Azam' },
        currentBowler: { name: 'Shaheen Afridi' },
        innings: [
          {
            battingTeam: 'Warriors',
            bowlingTeam: 'Titans',
            runs: 145,
            wickets: 3,
            completedOvers: 16,
            ballsInCurrentOver: 4,
            balls: new Array(100)
          }
        ],
        lastSeq: 100
      };

      const compact = createFastPaintSnapshot('match_test_401', matchState);
      expect(compact.activeMatchId).toBe('match_test_401');
      expect(compact.score).toBe(145);
      expect(compact.wickets).toBe(3);
      expect(compact.overs).toBe('16.4');
      expect(compact.striker).toBe('Babar Azam');
      expect(compact.bowler).toBe('Shaheen Afridi');
      expect(compact.battingTeam).toBe('Warriors');
      expect(compact.seq).toBe(100);
      expect(compact.lastActive).toBeTypeOf('number');
    });

    it('saves and retrieves fast paint snapshot from localStorage safely', () => {
      const matchState = {
        matchId: 'match_paint_1',
        striker: 'Rizwan',
        currentBowler: 'Naseem',
        score: 42,
        wickets: 1,
        oversFormatted: '4.2',
        seq: 26
      };

      saveFastPaintSnapshot('match_paint_1', matchState);
      const retrieved = getFastPaintSnapshot('match_paint_1');

      expect(retrieved).not.toBeNull();
      expect(retrieved.activeMatchId).toBe('match_paint_1');
      expect(retrieved.score).toBe(42);
      expect(retrieved.wickets).toBe(1);
      expect(retrieved.striker).toBe('Rizwan');
      expect(retrieved.bowler).toBe('Naseem');
    });

    it('handles localStorage errors gracefully without throwing', () => {
      const originalSetItem = globalThis.localStorage.setItem;
      globalThis.localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError: storage is full');
      });

      expect(() => {
        saveFastPaintSnapshot('match_overflow', { score: 100 });
      }).not.toThrow();

      globalThis.localStorage.setItem = originalSetItem;
    });
  });

  describe('3. Sequence Verification & Cache Replacement', () => {
    it('verifies and updates cache when events sequence differs from snapshot', async () => {
      const matchId = 'match_seq_reconcile_test';

      // 1. Initial snapshot at seq 1
      const initialSnapshot = {
        matchId,
        teams: { teamA: 'Lions', teamB: 'Tigers' },
        currentInningsIndex: 0,
        innings: [{ runs: 4, wickets: 0, completedOvers: 0, ballsInCurrentOver: 1, balls: [] }],
        seq: 1
      };
      await saveMatchSnapshot(matchId, initialSnapshot);
      saveFastPaintSnapshot(matchId, initialSnapshot);

      // 2. Add events in store up to seq 3 (simulating out-of-sync events)
      const ev1 = { id: `${matchId}_1`, seq: 1, matchId, type: 'BALL', payload: { runs: 4 } };
      const ev2 = { id: `${matchId}_2`, seq: 2, matchId, type: 'BALL', payload: { runs: 6 } };
      const ev3 = { id: `${matchId}_3`, seq: 3, matchId, type: 'BALL', payload: { runs: 1 } };

      await saveEventAndSnapshotAtomically(ev1, null, false);
      await saveEventAndSnapshotAtomically(ev2, null, false);
      await saveEventAndSnapshotAtomically(ev3, null, false);

      // 3. Reconcile
      const result = await verifyAndReconcileLocalSequence(matchId);
      expect(result).not.toBeNull();
      expect(result.verified).toBe(true);
      expect(result.replaced).toBe(true);
      expect(result.seq).toBe(3);

      // 4. Verify cache was replaced with new state
      const updatedCache = getFastPaintSnapshot(matchId);
      expect(updatedCache).not.toBeNull();
      expect(updatedCache.seq).toBe(3);
    });
  });

  describe('4. Storage Persistence Request on Boot', () => {
    it('calls navigator.storage.persist when available', async () => {
      const mockPersisted = vi.fn().mockResolvedValue(false);
      const mockPersist = vi.fn().mockResolvedValue(true);

      const originalStorage = globalThis.navigator.storage;
      globalThis.navigator.storage = {
        persisted: mockPersisted,
        persist: mockPersist
      };

      const granted = await requestStoragePersistence();
      expect(granted).toBe(true);
      expect(mockPersist).toHaveBeenCalled();

      globalThis.navigator.storage = originalStorage;
    });

    it('returns false gracefully when navigator.storage is unsupported', async () => {
      const originalStorage = globalThis.navigator.storage;
      delete globalThis.navigator.storage;

      const granted = await requestStoragePersistence();
      expect(granted).toBe(false);

      globalThis.navigator.storage = originalStorage;
    });
  });

  describe('5. Safe Migration of Legacy cricket_match_state', () => {
    it('migrates old cricket_match_state once into IndexedDB and updates flag', async () => {
      const legacyState = {
        matchId: 'legacy_match_999',
        code: 'LEG999',
        teams: { teamA: 'Legacy Stars', teamB: 'Modern Kings' },
        score: 110,
        wickets: 2,
        oversFormatted: '12.0',
        currentInningsIndex: 0,
        innings: [{ runs: 110, wickets: 2, completedOvers: 12, ballsInCurrentOver: 0, balls: [] }]
      };

      globalThis.localStorage.setItem('cricket_match_state', JSON.stringify(legacyState));
      expect(globalThis.localStorage.getItem('cricket_legacy_migrated_v4')).toBeNull();

      const result = await migrateLegacyMatchState();
      expect(result.migrated).toBe(true);
      expect(result.matchId).toBe('legacy_match_999');
      expect(globalThis.localStorage.getItem('cricket_legacy_migrated_v4')).toBe('true');

      // Verify that IndexedDB now holds the match snapshot
      const migratedSnapshot = await getMatchSnapshot('legacy_match_999');
      expect(migratedSnapshot).not.toBeNull();
      expect(migratedSnapshot.matchId).toBe('legacy_match_999');

      // Verify fast paint snapshot is written
      const fastPaint = getFastPaintSnapshot('legacy_match_999');
      expect(fastPaint).not.toBeNull();
      expect(fastPaint.score).toBe(110);

      // Verify second call is a no-op
      const secondCall = await migrateLegacyMatchState();
      expect(secondCall.migrated).toBe(false);
      expect(secondCall.alreadyDone).toBe(true);
    });
  });
});
