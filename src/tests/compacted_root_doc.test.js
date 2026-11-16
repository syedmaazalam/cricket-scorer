import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

// Mock Firestore functions
vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((db, ...pathSegments) => ({ path: pathSegments.join('/') })),
    doc: vi.fn((db, ...pathSegments) => ({ path: pathSegments.join('/') })),
    setDoc: vi.fn().mockResolvedValue(true),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
    getDocs: vi.fn().mockResolvedValue({ docs: [], empty: true, forEach: vi.fn() }),
    query: vi.fn((col) => col),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn((ref, optsOrCb, cb) => {
      const callback = typeof optsOrCb === 'function' ? optsOrCb : cb;
      if (typeof callback === 'function') {
        callback({
          exists: () => true,
          id: 'test_match_doc',
          data: () => ({ code: 'TEST99', status: 'in_progress' }),
          metadata: { fromCache: false }
        });
      }
      return vi.fn(); // Unsubscribe mock
    }),
    serverTimestamp: vi.fn(() => 1700000000000),
    initializeFirestore: vi.fn(),
    persistentLocalCache: vi.fn(),
    persistentMultipleTabManager: vi.fn(),
    getFirestore: vi.fn()
  };
});

import { setDoc, getDocs } from 'firebase/firestore';
import {
  getCompactedRootData,
  updateCompactedRootDocThrottled,
  fetchFullMatchEvents
} from '../firebase/matches.js';

describe('Phase 5: Compacted Root Document (Cost Reduction)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Compacted Root Document Shape & Last 12 Balls', () => {
    it('creates compacted root document with aggregate score and exactly the last 12 balls', () => {
      // Simulate an innings with 25 balls bowled
      const balls = [];
      for (let i = 1; i <= 25; i++) {
        balls.push({
          ballId: `ball_${i}`,
          runs: (i % 6 === 0) ? 6 : (i % 4 === 0) ? 4 : 1,
          isWicket: i === 10,
          seq: i
        });
      }

      const matchState = {
        matchId: 'match_cost_501',
        code: 'COST50',
        status: 'in_progress',
        isCompleted: false,
        teams: { teamA: 'Eagles', teamB: 'Falcons' },
        currentInningsIndex: 0,
        innings: [
          {
            battingTeam: 'Eagles',
            bowlingTeam: 'Falcons',
            runs: 48,
            wickets: 1,
            completedOvers: 4,
            ballsInCurrentOver: 1,
            balls
          }
        ],
        striker: { name: 'Player A' },
        nonStriker: { name: 'Player B' },
        currentBowler: { name: 'Bowler X' },
        lastSeq: 25
      };

      const compacted = getCompactedRootData(matchState);

      expect(compacted.matchId).toBe('match_cost_501');
      expect(compacted.code).toBe('COST50');
      expect(compacted.status).toBe('in_progress');
      expect(compacted.currentInnings.runs).toBe(48);
      expect(compacted.currentInnings.wickets).toBe(1);
      expect(compacted.currentInnings.completedOvers).toBe(4);
      expect(compacted.currentInnings.ballsInCurrentOver).toBe(1);

      // Verify exactly last 12 balls are included in recentBalls and currentInnings.balls
      expect(compacted.recentBalls.length).toBe(12);
      expect(compacted.recentBalls[0].seq).toBe(14); // 25 - 12 + 1 = 14
      expect(compacted.recentBalls[11].seq).toBe(25);
      expect(compacted.currentInnings.balls.length).toBe(12);
    });
  });

  describe('2. Throttled Root Document Writes', () => {
    it('throttles rapid normal ball updates within 2.5s window', async () => {
      const matchId = 'match_throttle_test';
      const state1 = {
        matchId,
        currentInningsIndex: 0,
        innings: [{ runs: 1, wickets: 0, completedOvers: 0, ballsInCurrentOver: 1, balls: [{ runs: 1 }] }]
      };
      const state2 = {
        matchId,
        currentInningsIndex: 0,
        innings: [{ runs: 2, wickets: 0, completedOvers: 0, ballsInCurrentOver: 2, balls: [{ runs: 1 }, { runs: 1 }] }]
      };
      const state3 = {
        matchId,
        currentInningsIndex: 0,
        innings: [{ runs: 3, wickets: 0, completedOvers: 0, ballsInCurrentOver: 3, balls: [{ runs: 1 }, { runs: 1 }, { runs: 1 }] }]
      };

      // 1. First ball writes immediately (window was cold)
      updateCompactedRootDocThrottled(matchId, state1, false);
      expect(setDoc).toHaveBeenCalledTimes(1);

      // 2. Second ball within 500ms is throttled (no immediate write)
      vi.advanceTimersByTime(500);
      updateCompactedRootDocThrottled(matchId, state2, false);
      expect(setDoc).toHaveBeenCalledTimes(1);

      // 3. Third ball at 1000ms is also throttled
      vi.advanceTimersByTime(500);
      updateCompactedRootDocThrottled(matchId, state3, false);
      expect(setDoc).toHaveBeenCalledTimes(1);

      // 4. Advance time past the 2.5s window: trailing write fires with latest state (state3)
      vi.advanceTimersByTime(2000);
      expect(setDoc).toHaveBeenCalledTimes(2);
    });

    it('immediately flushes on critical boundary (wicket, over end, innings end) bypassing throttle', () => {
      const matchId = 'match_critical_flush';
      const normalState = {
        matchId,
        currentInningsIndex: 0,
        innings: [{ runs: 1, wickets: 0, completedOvers: 0, ballsInCurrentOver: 1, balls: [] }]
      };

      // First write
      updateCompactedRootDocThrottled(matchId, normalState, false);
      expect(setDoc).toHaveBeenCalledTimes(1);

      // Immediate wicket 100ms later with isCritical = true
      vi.advanceTimersByTime(100);
      const wicketState = {
        matchId,
        currentInningsIndex: 0,
        innings: [{ runs: 1, wickets: 1, completedOvers: 0, ballsInCurrentOver: 2, balls: [] }]
      };
      updateCompactedRootDocThrottled(matchId, wicketState, true);

      // Must have written immediately without waiting for throttle timer
      expect(setDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('3. On-Demand Full Events Subcollection Query', () => {
    it('queries events subcollection only when requested for scorecard/timeline', async () => {
      const mockEventDocs = [
        { data: () => ({ id: 'ev_1', seq: 1, type: 'INIT' }) },
        { data: () => ({ id: 'ev_2', seq: 2, type: 'BALL' }) }
      ];
      vi.mocked(getDocs).mockResolvedValueOnce({
        forEach: (fn) => mockEventDocs.forEach(fn),
        docs: mockEventDocs
      });

      const events = await fetchFullMatchEvents('match_demand_99');
      expect(getDocs).toHaveBeenCalledTimes(1);
      expect(events.length).toBe(2);
      expect(events[0].seq).toBe(1);
      expect(events[1].seq).toBe(2);
    });
  });
});
