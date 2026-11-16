import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyEvent,
  createInitialMatchState,
  replayEvents
} from '../engine/reducer.js';
import {
  EVENT_TYPES,
  EXTRA_TYPES,
  WICKET_TYPES
} from '../engine/constants.js';
import {
  isLegalDelivery,
  isBowlerWicket,
  doesBatterEarnRuns,
  isWicketValidOnFreeHit,
  isWicketValidOnNoBall,
  isWicketValidOnWide,
  getMaxWickets,
  formatOvers,
  oversToBalls,
  calculateCRR,
  calculateRRR,
  checkBattingMilestone,
  checkBowlerHatTrick
} from '../engine/rules.js';

describe('Comprehensive Functional Flows & Edge Cases Suite', () => {

  // Flow 1: Match Initialization & Toss
  describe('Flow 1: Match Setup, Toss & Configuration Invariants', () => {
    it('initializes match with custom overs and player limits properly', () => {
      const initEvent = {
        type: EVENT_TYPES.MATCH_INIT,
        payload: {
          matchId: 'match_test_01',
          code: 'FLOW01',
          teams: [{ name: 'Lions' }, { name: 'Tigers' }],
          overs: 10,
          playersPerTeam: 8,
          toss: { winner: 'Lions', decision: 'bat' }
        }
      };

      const state = applyEvent(createInitialMatchState(), initEvent);
      expect(state.matchId).toBe('match_test_01');
      expect(state.code).toBe('FLOW01');
      expect(state.overs).toBe(10);
      expect(state.playersPerTeam).toBe(8);
      expect(state.innings.length).toBe(2);
      expect(state.innings[0].battingTeam).toBe('Lions');
      expect(state.innings[0].bowlingTeam).toBe('Tigers');
      expect(getMaxWickets(state.playersPerTeam)).toBe(7);
    });

    it('correctly sets bowling team to bat first when toss winner bowls', () => {
      const initEvent = {
        type: EVENT_TYPES.MATCH_INIT,
        payload: {
          matchId: 'match_test_02',
          teams: [{ name: 'Team Alpha' }, { name: 'Team Beta' }],
          overs: 20,
          toss: { winner: 'Team Alpha', decision: 'bowl' }
        }
      };

      const state = applyEvent(createInitialMatchState(), initEvent);
      expect(state.innings[0].battingTeam).toBe('Team Beta');
      expect(state.innings[0].bowlingTeam).toBe('Team Alpha');
    });

    it('handles empty or malformed toss gracefully with fallback', () => {
      const initEvent = {
        type: EVENT_TYPES.MATCH_INIT,
        payload: {
          matchId: 'match_test_03',
          teams: [{ name: 'Warriors' }, { name: 'Hawks' }],
          toss: null
        }
      };

      const state = applyEvent(createInitialMatchState(), initEvent);
      expect(state.innings[0].battingTeam).toBe('Warriors');
      expect(state.innings[0].bowlingTeam).toBe('Hawks');
    });
  });

  // Flow 2: Batter and Bowler Setup & Rotations
  describe('Flow 2: Batter & Bowler Assignment Edge Cases', () => {
    let baseState;
    beforeEach(() => {
      baseState = applyEvent(createInitialMatchState(), {
        type: EVENT_TYPES.MATCH_INIT,
        payload: {
          matchId: 'm1',
          teams: [
            { name: 'Team A', players: ['Alice', 'Bob', 'Batter3'] },
            { name: 'Team B', players: ['Charlie', 'Dave'] }
          ],
          overs: 5,
          playersPerTeam: 11
        }
      });
    });

    it('assigns opening batters and bowler correctly via NEW_BATTER and CHANGE_BOWLER', () => {
      let state = applyEvent(baseState, {
        type: EVENT_TYPES.NEW_BATTER,
        payload: { batter: 'Alice', slot: 'striker' }
      });
      state = applyEvent(state, {
        type: EVENT_TYPES.NEW_BATTER,
        payload: { batter: 'Bob', slot: 'nonStriker' }
      });
      state = applyEvent(state, {
        type: EVENT_TYPES.CHANGE_BOWLER,
        payload: { bowler: 'Charlie' }
      });

      expect(state.striker).toBe('Alice');
      expect(state.nonStriker).toBe('Bob');
      expect(state.currentBowler).toBe('Charlie');
      expect(state.needsBowlerChange).toBe(false);
      expect(state.needsNewBatter).toBe(false);
    });

    it('prevents assigning the same player as both striker and nonStriker', () => {
      let state = applyEvent(baseState, {
        type: EVENT_TYPES.NEW_BATTER,
        payload: { batter: 'Alice', slot: 'striker' }
      });
      // Try assigning Alice as nonStriker too
      state = applyEvent(state, {
        type: EVENT_TYPES.NEW_BATTER,
        payload: { batter: 'Alice', slot: 'nonStriker' }
      });

      expect(state.striker).toBe('Alice');
      expect(state.nonStriker).toBe(null);
    });

    it('swaps batter strike manually via SWAP_BATTER event', () => {
      let state = applyEvent(baseState, {
        type: EVENT_TYPES.NEW_BATTER,
        payload: { batter: 'Alice', slot: 'striker' }
      });
      state = applyEvent(state, {
        type: EVENT_TYPES.NEW_BATTER,
        payload: { batter: 'Bob', slot: 'nonStriker' }
      });
      state = applyEvent(state, { type: EVENT_TYPES.SWAP_BATTER });

      expect(state.striker).toBe('Bob');
      expect(state.nonStriker).toBe('Alice');
    });
  });

  // Flow 3: Scoring Deliveries & Strike Rotations
  describe('Flow 3: Ball Scoring & Strike Rotations', () => {
    let liveState;
    beforeEach(() => {
      liveState = applyEvent(createInitialMatchState(), {
        type: EVENT_TYPES.MATCH_INIT,
        payload: {
          matchId: 'm_scoring',
          teams: [
            { name: 'A', players: ['Batter1', 'Batter2', 'Batter3'] },
            { name: 'B', players: ['Bowler1', 'Bowler2'] }
          ],
          overs: 5,
          striker: 'Batter1',
          nonStriker: 'Batter2',
          bowler: 'Bowler1'
        }
      });
    });

    it('rotates strike on odd runs (1, 3, 5) and preserves on even runs (0, 2, 4, 6)', () => {
      // Ball 1: 1 run -> strike swaps
      let s = applyEvent(liveState, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
      });
      expect(s.striker).toBe('Batter2');
      expect(s.nonStriker).toBe('Batter1');
      expect(s.innings[0].score).toBe(1);

      // Ball 2: 2 runs -> strike stays with Batter2
      s = applyEvent(s, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 2, extraType: null, extraRuns: 0, isWicket: false }
      });
      expect(s.striker).toBe('Batter2');
      expect(s.innings[0].score).toBe(3);

      // Ball 3: 4 runs -> boundary, strike stays
      s = applyEvent(s, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 4, extraType: null, extraRuns: 0, isWicket: false }
      });
      expect(s.striker).toBe('Batter2');
      expect(s.innings[0].score).toBe(7);

      // Ball 4: 3 runs -> strike swaps
      s = applyEvent(s, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 3, extraType: null, extraRuns: 0, isWicket: false }
      });
      expect(s.striker).toBe('Batter1');
      expect(s.innings[0].score).toBe(10);
    });

    it('swaps strike at end of over (6 legal deliveries)', () => {
      let s = liveState;
      // 5 dot balls: striker remains Batter1
      for (let i = 0; i < 5; i++) {
        s = applyEvent(s, {
          type: EVENT_TYPES.BALL,
          payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: false }
        });
        expect(s.striker).toBe('Batter1');
      }

      // 6th legal delivery: 0 runs -> end of over rotates strike to Batter2
      s = applyEvent(s, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: false }
      });
      expect(s.isOverComplete).toBe(true);
      expect(s.needsBowlerChange).toBe(true);
      expect(s.striker).toBe('Batter2');
      expect(s.nonStriker).toBe('Batter1');
    });

    it('swaps strike twice (net zero swap) when 1 run scored on 6th legal ball of over', () => {
      let s = liveState;
      for (let i = 0; i < 5; i++) {
        s = applyEvent(s, {
          type: EVENT_TYPES.BALL,
          payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: false }
        });
      }
      // 6th ball: 1 run -> odd run swaps strike, then end of over swaps strike again
      s = applyEvent(s, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
      });
      expect(s.striker).toBe('Batter1');
      expect(s.nonStriker).toBe('Batter2');
    });
  });

  // Flow 4: Extras Handling & Free Hits
  describe('Flow 4: Extras & Free Hit Invariants', () => {
    let liveState;
    beforeEach(() => {
      liveState = applyEvent(createInitialMatchState(), {
        type: EVENT_TYPES.MATCH_INIT,
        payload: {
          matchId: 'm_extras',
          teams: [
            { name: 'A', players: ['B1', 'B2', 'B3'] },
            { name: 'B', players: ['Bowl1', 'Bowl2'] }
          ],
          overs: 5,
          striker: 'B1',
          nonStriker: 'B2',
          bowler: 'Bowl1'
        }
      });
    });

    it('wide ball awards extra run, does not increment legal ball count, preserves strike', () => {
      const s = applyEvent(liveState, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: EXTRA_TYPES.WIDE, extraRuns: 0, isWicket: false }
      });
      expect(s.innings[0].score).toBe(1);
      expect(s.innings[0].legalBalls).toBe(0);
      expect(s.striker).toBe('B1');
      expect(isLegalDelivery(EXTRA_TYPES.WIDE)).toBe(false);
    });

    it('wide ball with overthrow/bye awards wide penalty plus overthrow runs', () => {
      const s = applyEvent(liveState, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: EXTRA_TYPES.WIDE, extraRuns: 2, isWicket: false }
      });
      // 1 penalty + 2 overthrow runs = 3 runs total
      expect(s.innings[0].score).toBe(3);
      expect(s.innings[0].legalBalls).toBe(0);
    });

    it('no ball awards extra run, triggers Free Hit, and credits batter runs', () => {
      const s = applyEvent(liveState, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 4, extraType: EXTRA_TYPES.NO_BALL, extraRuns: 0, isWicket: false }
      });
      expect(s.innings[0].score).toBe(5); // 4 bat + 1 NB
      expect(s.innings[0].legalBalls).toBe(0);
      expect(s.isFreeHit).toBe(true);
      expect(doesBatterEarnRuns(EXTRA_TYPES.NO_BALL)).toBe(true);
    });

    it('free hit expires on next legal delivery', () => {
      // 1. Deliver No Ball
      let s = applyEvent(liveState, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: EXTRA_TYPES.NO_BALL, extraRuns: 1, isWicket: false }
      });
      expect(s.isFreeHit).toBe(true);

      // 2. Next ball is Wide -> Free Hit persists
      s = applyEvent(s, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: EXTRA_TYPES.WIDE, extraRuns: 1, isWicket: false }
      });
      expect(s.isFreeHit).toBe(true);

      // 3. Next ball is legal delivery -> Free Hit consumed
      s = applyEvent(s, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
      });
      expect(s.isFreeHit).toBe(false);
    });
  });

  // Flow 5: Wickets and Dismissal Legality (MCC Laws)
  describe('Flow 5: Wicket Scenarios & Dismissal Legality Rules', () => {
    it('verifies bowler credit classification according to MCC laws', () => {
      expect(isBowlerWicket(WICKET_TYPES.BOWLED)).toBe(true);
      expect(isBowlerWicket(WICKET_TYPES.CAUGHT)).toBe(true);
      expect(isBowlerWicket(WICKET_TYPES.LBW)).toBe(true);
      expect(isBowlerWicket(WICKET_TYPES.STUMPED)).toBe(true);
      expect(isBowlerWicket(WICKET_TYPES.HIT_WICKET)).toBe(true);

      expect(isBowlerWicket(WICKET_TYPES.RUN_OUT)).toBe(false);
      expect(isBowlerWicket(WICKET_TYPES.RETIRED_HURT)).toBe(false);
      expect(isBowlerWicket(WICKET_TYPES.OBSTRUCTING_FIELD)).toBe(false);
    });

    it('enforces dismissal legality on No Balls (MCC Law 21.18)', () => {
      expect(isWicketValidOnNoBall(WICKET_TYPES.RUN_OUT)).toBe(true);
      expect(isWicketValidOnNoBall(WICKET_TYPES.OBSTRUCTING_FIELD)).toBe(true);
      expect(isWicketValidOnNoBall(WICKET_TYPES.HIT_BALL_TWICE)).toBe(true);

      // Prohibited on No-Ball
      expect(isWicketValidOnNoBall(WICKET_TYPES.BOWLED)).toBe(false);
      expect(isWicketValidOnNoBall(WICKET_TYPES.CAUGHT)).toBe(false);
      expect(isWicketValidOnNoBall(WICKET_TYPES.LBW)).toBe(false);
      expect(isWicketValidOnNoBall(WICKET_TYPES.STUMPED)).toBe(false);
    });

    it('enforces dismissal legality on Wide Deliveries (MCC Law 22.17)', () => {
      expect(isWicketValidOnWide(WICKET_TYPES.STUMPED)).toBe(true);
      expect(isWicketValidOnWide(WICKET_TYPES.RUN_OUT)).toBe(true);
      expect(isWicketValidOnWide(WICKET_TYPES.HIT_WICKET)).toBe(true);

      // Prohibited on Wide
      expect(isWicketValidOnWide(WICKET_TYPES.BOWLED)).toBe(false);
      expect(isWicketValidOnWide(WICKET_TYPES.CAUGHT)).toBe(false);
      expect(isWicketValidOnWide(WICKET_TYPES.LBW)).toBe(false);
    });

    it('enforces dismissal legality on Free Hits', () => {
      expect(isWicketValidOnFreeHit(WICKET_TYPES.RUN_OUT)).toBe(true);
      expect(isWicketValidOnFreeHit(WICKET_TYPES.BOWLED)).toBe(false);
      expect(isWicketValidOnFreeHit(WICKET_TYPES.CAUGHT)).toBe(false);
      expect(isWicketValidOnFreeHit(WICKET_TYPES.LBW)).toBe(false);
    });
  });

  // Flow 6: Calculations & Edge Cases (CRR, RRR, Milestones, Hat-Trick)
  describe('Flow 6: Calculations, CRR, RRR & Milestones', () => {
    it('calculates CRR accurately with zero balls and fractional overs', () => {
      expect(calculateCRR(0, 0)).toBe(0);
      expect(calculateCRR(10, 6)).toBe(10.0);
      expect(calculateCRR(15, 12)).toBe(7.5);
      expect(calculateCRR(25, 15)).toBe(10.0);
    });

    it('calculates RRR accurately and handles impossible run rate boundary', () => {
      expect(calculateRRR(0, 10, 10, 20)).toBe(0);
      expect(calculateRRR(100, 100, 30, 20)).toBe(0); // already won
      // 50 needed off 60 balls (10 overs) = 5.00
      expect(calculateRRR(100, 50, 60, 20)).toBe(5.0);
      // No balls remaining
      expect(calculateRRR(100, 90, 120, 20)).toBe(99.99);
    });

    it('formats overs and converts between overs and legal balls', () => {
      expect(formatOvers(0)).toBe('0.0');
      expect(formatOvers(5)).toBe('0.5');
      expect(formatOvers(6)).toBe('1.0');
      expect(formatOvers(17)).toBe('2.5');

      expect(oversToBalls('0.0')).toBe(0);
      expect(oversToBalls('1.0')).toBe(6);
      expect(oversToBalls('2.5')).toBe(17);
      expect(oversToBalls(2.5)).toBe(17);
    });

    it('detects fifty and century batting milestones accurately', () => {
      expect(checkBattingMilestone(46, 4)).toBe('fifty');
      expect(checkBattingMilestone(49, 1)).toBe('fifty');
      expect(checkBattingMilestone(50, 4)).toBe(null); // already past 50
      expect(checkBattingMilestone(96, 6)).toBe('century');
      expect(checkBattingMilestone(100, 1)).toBe(null); // already past 100
    });

    it('detects bowler hat-trick on 3 consecutive wickets by same bowler', () => {
      const history = [
        { bowler: 'Bowler A', isWicket: true },
        { bowler: 'Bowler B', isWicket: false },
        { bowler: 'Bowler A', isWicket: true }
      ];

      // Bowler A bowled 2 wickets previously, now bowls 3rd wicket -> Hat-trick!
      expect(checkBowlerHatTrick(history, 'Bowler A', true)).toBe(true);

      // Current ball is not a wicket -> no hat-trick
      expect(checkBowlerHatTrick(history, 'Bowler A', false)).toBe(false);

      // Bowler B only bowled 1 ball -> no hat-trick
      expect(checkBowlerHatTrick(history, 'Bowler B', true)).toBe(false);
    });
  });

  // Flow 7: Immutable Replay Consistency
  describe('Flow 7: Event Replay & State Invariant Resilience', () => {
    it('produces identical state when replaying a complete sequence of events', () => {
      const events = [
        {
          type: EVENT_TYPES.MATCH_INIT,
          payload: {
            matchId: 'm_replay',
            teams: [
              { name: 'A', players: ['P1', 'P2', 'P3'] },
              { name: 'B', players: ['B1', 'B2'] }
            ],
            overs: 2,
            striker: 'P1',
            nonStriker: 'P2',
            bowler: 'B1'
          }
        },
        { type: EVENT_TYPES.BALL, payload: { runs: 4, extraType: null, extraRuns: 0, isWicket: false } },
        { type: EVENT_TYPES.BALL, payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false } },
        { type: EVENT_TYPES.BALL, payload: { runs: 0, extraType: EXTRA_TYPES.WIDE, extraRuns: 1, isWicket: false } },
        { type: EVENT_TYPES.BALL, payload: { runs: 6, extraType: null, extraRuns: 0, isWicket: false } }
      ];

      // Incremental
      let incState = createInitialMatchState();
      for (const ev of events) {
        incState = applyEvent(incState, ev);
      }

      // Replay
      const replayedState = replayEvents(events);

      expect(replayedState.innings[0].score).toBe(incState.innings[0].score);
      expect(replayedState.innings[0].legalBalls).toBe(incState.innings[0].legalBalls);
      expect(replayedState.striker).toBe(incState.striker);
      expect(replayedState.nonStriker).toBe(incState.nonStriker);
    });

    it('survives null or corrupted events in stream without throwing', () => {
      const events = [
        null,
        { type: 'UNKNOWN_CORRUPT_EVENT', payload: null },
        {
          type: EVENT_TYPES.MATCH_INIT,
          payload: { matchId: 'm_resilient', teams: [{ name: 'A' }, { name: 'B' }], overs: 5 }
        },
        undefined,
        { type: null }
      ];

      expect(() => replayEvents(events)).not.toThrow();
      const state = replayEvents(events);
      expect(state.matchId).toBe('m_resilient');
    });
  });
});
