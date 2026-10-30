import { describe, it, expect } from 'vitest';
import { applyEvent, createInitialMatchState, replayEvents } from '../engine/reducer.js';
import { EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES } from '../engine/constants.js';
import { computeInningsStats } from '../engine/stats.js';
import { calculateCRR, calculateRRR, formatOvers } from '../engine/rules.js';

function setupMatch(options = {}) {
  let state = createInitialMatchState();
  const initPayload = {
    matchId: 'qa_match_1',
    code: 'QA001',
    teams: [
      { id: 't1', name: 'Alpha', players: ['A1', 'A2', 'A3', 'A4', 'A5'] },
      { id: 't2', name: 'Bravo', players: ['B1', 'B2', 'B3', 'B4', 'B5'] }
    ],
    overs: options.overs || 5,
    playersPerTeam: options.playersPerTeam || 5,
    toss: { winner: 'Alpha', decision: 'bat' },
    striker: 'A1',
    nonStriker: 'A2',
    bowler: 'B1'
  };
  state = applyEvent(state, { type: EVENT_TYPES.MATCH_INIT, payload: initPayload });
  return state;
}

describe('QA Scope 1: Scoring Rules & MCC Laws', () => {
  it('Wide delivery does not count towards 6 legal balls and adds penalty + extras', () => {
    let state = setupMatch();
    // Bowler bowls 1 wide with 1 run ran (e.g. overthrow) -> total 2 runs
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: EXTRA_TYPES.WIDE, extraRuns: 1, isWicket: false }
    });

    expect(state.innings[0].legalBalls).toBe(0);
    expect(state.innings[0].score).toBe(2);
    expect(state.isOverComplete).toBe(false);

    // Over only finishes after 6 legal deliveries
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
      });
    }
    expect(state.innings[0].legalBalls).toBe(6);
    expect(state.isOverComplete).toBe(true);
    expect(state.innings[0].score).toBe(8); // 2 from wide + 6 from singles
  });

  it('No-ball delivery does not advance legal balls, awards bat runs + penalty, and activates Free Hit', () => {
    let state = setupMatch();
    // Batter hits a 4 off a no-ball -> 1 penalty + 4 bat runs = 5 runs
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 4, extraType: EXTRA_TYPES.NO_BALL, extraRuns: 0, isWicket: false }
    });

    const inn = state.innings[0];
    expect(inn.legalBalls).toBe(0);
    expect(inn.score).toBe(5);
    expect(state.isFreeHit).toBe(true);

    const stats = computeInningsStats(inn);
    expect(stats.batting['A1'].runs).toBe(4);
    expect(stats.batting['A1'].balls).toBe(1); // Faced a ball
    expect(stats.extras.noBalls).toBe(1);
    expect(stats.extras.total).toBe(1);
  });

  it('Free Hit dismissal restrictions (MCC Law): caught/bowled/lbw/stumped disallowed, run-out allowed', () => {
    let state = setupMatch();
    // No-ball activates Free Hit
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: EXTRA_TYPES.NO_BALL, extraRuns: 0, isWicket: false }
    });
    expect(state.isFreeHit).toBe(true);

    // Batter is caught on Free Hit -> illegal dismissal
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        extraType: null,
        extraRuns: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.CAUGHT, playerOut: 'A1', fielder: 'B2' }
      }
    });

    expect(state.innings[0].wickets).toBe(0); // Wicket disallowed
    expect(state.isFreeHit).toBe(false); // Free hit was consumed on legal delivery

    // Next no ball
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: EXTRA_TYPES.NO_BALL, extraRuns: 0 }
    });
    expect(state.isFreeHit).toBe(true);

    // Batter is run out on Free Hit -> valid dismissal
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 1,
        extraType: null,
        extraRuns: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.RUN_OUT, playerOut: 'A1', fielder: 'B3' },
        nextBatter: 'A3'
      }
    });
    expect(state.innings[0].wickets).toBe(1);
  });

  it('No-Ball delivery itself disallows caught/bowled/lbw dismissals (MCC Law 21.18)', () => {
    let state = setupMatch();
    // Recorded as caught off a no ball
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        extraType: EXTRA_TYPES.NO_BALL,
        extraRuns: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.CAUGHT, playerOut: 'A1', fielder: 'B2' }
      }
    });

    const inn = state.innings[0];
    expect(inn.wickets).toBe(0); // Caught off no-ball must not be counted
    expect(inn.score).toBe(1); // 1 run no-ball penalty still added
  });

  it('Wide delivery disallows bowled/caught/lbw but allows stumped and run-out (MCC Law 22.17)', () => {
    let state = setupMatch();
    // Bowled off a wide -> invalid
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        extraType: EXTRA_TYPES.WIDE,
        extraRuns: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.BOWLED, playerOut: 'A1' }
      }
    });
    expect(state.innings[0].wickets).toBe(0);

    // Stumped off a wide -> valid
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        extraType: EXTRA_TYPES.WIDE,
        extraRuns: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.STUMPED, playerOut: 'A1', fielder: 'B2' },
        nextBatter: 'A3'
      }
    });
    expect(state.innings[0].wickets).toBe(1);
  });

  it('Strike rotation: odd runs rotate strike, even runs maintain strike', () => {
    let state = setupMatch();
    expect(state.striker).toBe('A1');
    expect(state.nonStriker).toBe('A2');

    // 1 single run
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 1, extraType: null, extraRuns: 0 }
    });
    expect(state.striker).toBe('A2');
    expect(state.nonStriker).toBe('A1');

    // 2 runs
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 2, extraType: null, extraRuns: 0 }
    });
    expect(state.striker).toBe('A2');
    expect(state.nonStriker).toBe('A1');

    // 3 runs
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 3, extraType: null, extraRuns: 0 }
    });
    expect(state.striker).toBe('A1');
    expect(state.nonStriker).toBe('A2');
  });

  it('Wicket on the 6th legal delivery rotates ends: surviving batter takes strike for the new over (MCC Law 18.11/18.12)', () => {
    let state = setupMatch();
    expect(state.striker).toBe('A1');
    expect(state.nonStriker).toBe('A2');

    // First 5 balls: dot balls
    for (let i = 0; i < 5; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: null, extraRuns: 0 }
      });
    }
    expect(state.striker).toBe('A1');
    expect(state.nonStriker).toBe('A2');

    // Ball 6 (last ball of over): Striker A1 is Bowled!
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        extraType: null,
        extraRuns: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.BOWLED, playerOut: 'A1' }
      }
    });

    expect(state.isOverComplete).toBe(true);
    // Surviving batter A2 was at non-striker; at end of over, ends change -> A2 is now STRIKER!
    expect(state.striker).toBe('A2');
    expect(state.nonStriker).toBeNull();
    expect(state.vacantBatterSlot).toBe('nonStriker');

    // When new batter enters:
    state = applyEvent(state, {
      type: EVENT_TYPES.NEW_BATTER,
      payload: { batter: 'A3' }
    });
    expect(state.striker).toBe('A2');
    expect(state.nonStriker).toBe('A3');
  });

  it('Maiden over calculation: Byes and leg-byes do NOT spoil maidens (MCC Law 10)', () => {
    let state = setupMatch();
    // Over with 5 dots and 1 bye
    for (let i = 0; i < 5; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: null, extraRuns: 0 }
      });
    }
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: EXTRA_TYPES.BYE, extraRuns: 2 }
    });

    const stats = computeInningsStats(state.innings[0]);
    expect(stats.bowling['B1'].legalBalls).toBe(6);
    expect(stats.bowling['B1'].runsConceded).toBe(0);
    expect(stats.bowling['B1'].maidens).toBe(1); // Maiden intact despite 2 byes
    expect(state.innings[0].score).toBe(2);
  });

  it('Bowler credit rules: only bowler wickets credited to bowler', () => {
    let state = setupMatch();
    // Ball 1: Bowled -> credited to bowler
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.BOWLED, playerOut: 'A1' },
        nextBatter: 'A3'
      }
    });
    // Ball 2: Run Out -> NOT credited to bowler
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.RUN_OUT, playerOut: 'A3', fielder: 'B2' },
        nextBatter: 'A4'
      }
    });

    const stats = computeInningsStats(state.innings[0]);
    expect(stats.bowling['B1'].wickets).toBe(1); // Only bowled credited
  });

  it('CRR, RRR, Target, and Match Result computations', () => {
    expect(calculateCRR(60, 36)).toBe(10.0);
    expect(calculateCRR(0, 0)).toBe(0);

    // Target 120, current 60 in 6 overs (36 balls), max 10 overs
    // Remaining: 60 runs from 4 overs (24 balls) -> RRR = 15.0
    expect(calculateRRR(120, 60, 36, 10)).toBe(15.0);

    let state = setupMatch({ overs: 1 });
    // 6 balls of 1st innings -> score 6
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1 }
      });
    }
    expect(state.innings[0].isCompleted).toBe(true);
    expect(state.status).toBe(MATCH_STATUS.INNINGS_BREAK);
    expect(state.target).toBe(7);

    // Start Innings 2
    state = applyEvent(state, {
      type: EVENT_TYPES.END_INNINGS,
      payload: { striker: 'B1', nonStriker: 'B2', bowler: 'A1' }
    });
    expect(state.currentInningsIndex).toBe(1);

    // Innings 2 scores 7 runs in 2 balls (6 then 1)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 6 }
    });
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 1 }
    });

    expect(state.innings[1].score).toBe(7);
    expect(state.status).toBe(MATCH_STATUS.COMPLETED);
    expect(state.winner).toBe('Bravo');
    expect(state.resultSummary).toContain('won by 4 wickets');
  });
});
