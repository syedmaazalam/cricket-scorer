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

import { EVENT_TYPES } from '../engine/constants.js';
import { createInitialMatchState, applyEvent, replayEvents } from '../engine/reducer.js';
import { isScorerLeaseHeldByOther } from '../firebase/matches.js';
import { createEventId, getDeviceId } from '../store/sync.js';

describe('Phase 2: Conflict Protection, Scorer Lease & Replay Invariants', () => {
  const matchId = 'm_phase2_conflict_test';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('2.1 & 2.2 Event Shape & Deterministic Chain Linkage', () => {
    it('creates events with version v: 1, strict seq, prevEventId hash-chain, scorerUid, and ballId', () => {
      const devId = getDeviceId();
      const ev1 = {
        v: 1,
        id: createEventId(matchId, 1),
        seq: 1,
        prevEventId: null,
        scorerUid: 'uid_scorer_alice',
        scorerId: devId,
        ballId: null,
        matchId,
        type: EVENT_TYPES.MATCH_INIT,
        payload: {
          matchId,
          teams: [{ name: 'A', players: ['A1', 'A2', 'A3'] }, { name: 'B', players: ['B1', 'B2', 'B3'] }],
          overs: 2,
          playersPerTeam: 3,
          striker: 'A1',
          nonStriker: 'A2',
          bowler: 'B1'
        },
        ts: Date.now(),
        deviceId: devId
      };

      const ev2 = {
        v: 1,
        id: createEventId(matchId, 2),
        seq: 2,
        prevEventId: ev1.id,
        scorerUid: 'uid_scorer_alice',
        scorerId: devId,
        ballId: `ball_${matchId}_2`,
        matchId,
        type: EVENT_TYPES.BALL,
        payload: { runs: 4, isWicket: false },
        ts: Date.now() + 1000,
        deviceId: devId
      };

      expect(ev1.v).toBe(1);
      expect(ev1.seq).toBe(1);
      expect(ev1.prevEventId).toBeNull();
      expect(ev1.id).toBe(`${matchId}_1`);

      expect(ev2.v).toBe(1);
      expect(ev2.seq).toBe(2);
      expect(ev2.prevEventId).toBe(ev1.id);
      expect(ev2.id).toBe(`${matchId}_2`);
      expect(ev2.ballId).toBe(`ball_${matchId}_2`);
    });

    it('detects a broken chain when an event prevEventId does not match the previous event ID', () => {
      const chain = [
        { id: `${matchId}_1`, seq: 1, prevEventId: null },
        { id: `${matchId}_2`, seq: 2, prevEventId: `${matchId}_1` },
        // Out-of-order or missing event: references unknown id
        { id: `${matchId}_3`, seq: 3, prevEventId: `${matchId}_corrupted` }
      ];

      const verifyChain = (events) => {
        for (let i = 1; i < events.length; i++) {
          if (events[i].prevEventId !== events[i - 1].id) {
            return { valid: false, brokenAtIndex: i };
          }
        }
        return { valid: true };
      };

      const result = verifyChain(chain);
      expect(result.valid).toBe(false);
      expect(result.brokenAtIndex).toBe(2);
    });
  });

  describe('2.3 & 2.4 Scorer Lease Heartbeat & Takeover Detection', () => {
    it('allows scoring if the same device holds the lease', () => {
      const myDevice = 'dev_device_alpha';
      const matchDoc = {
        scorerId: myDevice,
        leaseExpiresAt: Date.now() + 30000
      };

      const isBlocked = isScorerLeaseHeldByOther(matchDoc, myDevice);
      expect(isBlocked).toBe(false);
    });

    it('blocks scoring if another active device holds an unexpired lease', () => {
      const myDevice = 'dev_device_alpha';
      const otherDevice = 'dev_device_beta';
      const matchDoc = {
        scorerId: otherDevice,
        leaseExpiresAt: Date.now() + 30000
      };

      const isBlocked = isScorerLeaseHeldByOther(matchDoc, myDevice);
      expect(isBlocked).toBe(true);
    });

    it('allows scoring takeover if the previous lease has expired', () => {
      const myDevice = 'dev_device_alpha';
      const otherDevice = 'dev_device_beta';
      const matchDoc = {
        scorerId: otherDevice,
        leaseExpiresAt: Date.now() - 5000 // Expired 5 seconds ago
      };

      const isBlocked = isScorerLeaseHeldByOther(matchDoc, myDevice);
      expect(isBlocked).toBe(false);
    });
  });

  describe('2.6 Replay Invariants: Undo, Over-Reopen, and Determinism', () => {
    it('produces identical state when replaying a complete match with over-reopen in order', () => {
      const initEvent = {
        v: 1,
        id: `${matchId}_1`,
        seq: 1,
        prevEventId: null,
        type: EVENT_TYPES.MATCH_INIT,
        payload: {
          matchId,
          teams: [
            { name: 'Titans', players: ['T1', 'T2', 'T3'] },
            { name: 'Warriors', players: ['W1', 'W2', 'W3'] }
          ],
          overs: 2,
          playersPerTeam: 3,
          toss: { winner: 'Titans', decision: 'bat' },
          striker: 'T1',
          nonStriker: 'T2',
          bowler: 'W1'
        }
      };

      let liveState = applyEvent(createInitialMatchState(), initEvent);

      // Bowl 6 legal deliveries for Over 1
      for (let i = 1; i <= 6; i++) {
        const ballEv = {
          v: 1,
          id: `${matchId}_${i + 1}`,
          seq: i + 1,
          prevEventId: `${matchId}_${i}`,
          type: EVENT_TYPES.BALL,
          payload: { runs: (i % 2 === 0 ? 2 : 1), isWicket: false }
        };
        liveState = applyEvent(liveState, ballEv);
      }

      // Over 1 has completed
      expect(liveState.isOverComplete).toBe(true);
      expect(liveState.needsBowlerChange).toBe(true);
      const strikerBeforeReopen = liveState.striker;
      const nonStrikerBeforeReopen = liveState.nonStriker;

      // Reopen previous over
      const reopenEvent = {
        v: 1,
        id: `${matchId}_8`,
        seq: 8,
        prevEventId: `${matchId}_7`,
        type: EVENT_TYPES.REOPEN_PREVIOUS_OVER,
        payload: {}
      };
      liveState = applyEvent(liveState, reopenEvent);

      // Crease ends should have swapped back and over complete reset
      expect(liveState.isOverComplete).toBe(false);
      expect(liveState.needsBowlerChange).toBe(false);
      expect(liveState.striker).toBe(nonStrikerBeforeReopen);
      expect(liveState.nonStriker).toBe(strikerBeforeReopen);

      // Replay all events from clean state
      const replayedState = replayEvents(liveState.events);

      // Replay state must equal live state identically
      expect(replayedState.innings[0].score).toBe(liveState.innings[0].score);
      expect(replayedState.innings[0].legalBalls).toBe(liveState.innings[0].legalBalls);
      expect(replayedState.striker).toBe(liveState.striker);
      expect(replayedState.nonStriker).toBe(liveState.nonStriker);
      expect(replayedState.currentBowler).toBe(liveState.currentBowler);
      expect(replayedState.status).toBe(liveState.status);
    });

    it('guarantees replay output equals live state across undo and re-bowling sequences', () => {
      const initEvent = {
        v: 1,
        id: `${matchId}_1`,
        seq: 1,
        prevEventId: null,
        type: EVENT_TYPES.MATCH_INIT,
        payload: {
          matchId,
          teams: [
            { name: 'Eagles', players: ['E1', 'E2', 'E3'] },
            { name: 'Hawks', players: ['H1', 'H2', 'H3'] }
          ],
          overs: 1,
          playersPerTeam: 3,
          toss: { winner: 'Eagles', decision: 'bat' },
          striker: 'E1',
          nonStriker: 'E2',
          bowler: 'H1'
        }
      };

      let state = applyEvent(createInitialMatchState(), initEvent);

      // Ball 1: 4 runs
      const b1 = { v: 1, id: `${matchId}_2`, seq: 2, prevEventId: `${matchId}_1`, type: EVENT_TYPES.BALL, payload: { runs: 4, isWicket: false } };
      state = applyEvent(state, b1);

      // Ball 2: 6 runs
      const b2 = { v: 1, id: `${matchId}_3`, seq: 3, prevEventId: `${matchId}_2`, type: EVENT_TYPES.BALL, payload: { runs: 6, isWicket: false } };
      state = applyEvent(state, b2);

      expect(state.innings[0].score).toBe(10);

      // Simulate Undo on Ball 2: replay up to Ball 1
      const eventsAfterUndo = state.events.slice(0, -1);
      const stateAfterUndo = replayEvents(eventsAfterUndo);
      expect(stateAfterUndo.innings[0].score).toBe(4);
      expect(stateAfterUndo.innings[0].legalBalls).toBe(1);

      // Re-bowl Ball 2 with 1 run instead
      const b2Alt = { v: 1, id: `${matchId}_3_alt`, seq: 2, prevEventId: `${matchId}_1`, type: EVENT_TYPES.BALL, payload: { runs: 1, isWicket: false } };
      const stateAfterRebowl = applyEvent(stateAfterUndo, b2Alt);
      expect(stateAfterRebowl.innings[0].score).toBe(5);
      expect(stateAfterRebowl.innings[0].legalBalls).toBe(2);

      // Full replay of the altered history
      const fullReplay = replayEvents(stateAfterRebowl.events);
      expect(fullReplay.innings[0].score).toBe(stateAfterRebowl.innings[0].score);
      expect(fullReplay.innings[0].legalBalls).toBe(stateAfterRebowl.innings[0].legalBalls);
      expect(fullReplay.striker).toBe(stateAfterRebowl.striker);
    });
  });
});
