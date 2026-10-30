import { describe, it, expect } from 'vitest';
import { applyEvent, createInitialMatchState, replayEvents, undoLastEvent } from '../engine/reducer.js';
import { EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES } from '../engine/constants.js';
import { computeInningsStats } from '../engine/stats.js';

function createMatchWithPlayers(playerCount = 11, overs = 20) {
  let state = createInitialMatchState();
  const team1Players = Array.from({ length: playerCount }, (_, i) => `A_P${i + 1}`);
  const team2Players = Array.from({ length: playerCount }, (_, i) => `B_P${i + 1}`);

  state = applyEvent(state, {
    type: EVENT_TYPES.MATCH_INIT,
    payload: {
      matchId: `test_m_${playerCount}`,
      code: `CODE_${playerCount}`,
      teams: [
        { id: 't1', name: 'TeamA', players: team1Players },
        { id: 't2', name: 'TeamB', players: team2Players }
      ],
      overs,
      playersPerTeam: playerCount,
      toss: { winner: 'TeamA', decision: 'bat' },
      striker: team1Players[0],
      nonStriker: playerCount > 1 ? team1Players[1] : null,
      bowler: team2Players[0]
    }
  });
  return { state, team1Players, team2Players };
}

describe('QA Scope 2: Configurable Setup (2 to 15 Players, Custom Overs, Bowler Rules)', () => {
  it('Handles 2-player match: 1 wicket is all out (playersPerTeam - 1 = 1), no crash, sole bowler can bowl consecutive overs', () => {
    let { state, team1Players, team2Players } = createMatchWithPlayers(2, 5);
    expect(state.playersPerTeam).toBe(2);
    expect(state.striker).toBe('A_P1');
    expect(state.nonStriker).toBe('A_P2');

    // 1st over: 6 dot balls bowled by B_P1
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: null, extraRuns: 0 }
      });
    }
    expect(state.isOverComplete).toBe(true);
    expect(state.needsBowlerChange).toBe(true);

    // In a 2-player match, bowling team has only 1 player (or squad of 1). Same bowler B_P1 must be allowed!
    // If team has 2 players, team2 has B_P1 and B_P2:
    // If B_P2 bowls, great. But if squad was 1, consecutive is allowed.
    // Let's test with a 1-player squad on team2:
    let singlePlayerState = createInitialMatchState();
    singlePlayerState = applyEvent(singlePlayerState, {
      type: EVENT_TYPES.MATCH_INIT,
      payload: {
        matchId: 'single_squad',
        code: 'SS1',
        teams: [
          { id: 't1', name: 'SoloA', players: ['A1', 'A2'] },
          { id: 't2', name: 'SoloB', players: ['B1'] } // 1 bowler only
        ],
        overs: 2,
        playersPerTeam: 2,
        toss: { winner: 'SoloA', decision: 'bat' },
        striker: 'A1',
        nonStriker: 'A2',
        bowler: 'B1'
      }
    });

    for (let i = 0; i < 6; i++) {
      singlePlayerState = applyEvent(singlePlayerState, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0 }
      });
    }
    expect(singlePlayerState.isOverComplete).toBe(true);
    // B1 bowls next over again because squad size is 1:
    singlePlayerState = applyEvent(singlePlayerState, {
      type: EVENT_TYPES.CHANGE_BOWLER,
      payload: { bowler: 'B1' }
    });
    expect(singlePlayerState.currentBowler).toBe('B1');
    expect(singlePlayerState.needsBowlerChange).toBe(false);

    // In 2-player match, 1st wicket falls -> innings completed (all out)
    singlePlayerState = applyEvent(singlePlayerState, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.BOWLED, playerOut: 'A1' }
      }
    });
    expect(singlePlayerState.innings[0].wickets).toBe(1);
    expect(singlePlayerState.innings[0].isCompleted).toBe(true);
    expect(singlePlayerState.innings[0].completedReason).toBe('All out');
    expect(singlePlayerState.status).toBe(MATCH_STATUS.INNINGS_BREAK);
  });

  it('Enforces consecutive over rule when bowling team squad > 1', () => {
    let { state } = createMatchWithPlayers(5, 5);
    // Over 1 by B_P1
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0 }
      });
    }
    expect(state.previousBowler).toBe('B_P1');

    // Attempt to set B_P1 again -> should be rejected by reducer
    const rejectedState = applyEvent(state, {
      type: EVENT_TYPES.CHANGE_BOWLER,
      payload: { bowler: 'B_P1' }
    });
    expect(rejectedState.currentBowler).toBeNull();
    expect(rejectedState.needsBowlerChange).toBe(true);

    // Selecting B_P2 works
    const acceptedState = applyEvent(state, {
      type: EVENT_TYPES.CHANGE_BOWLER,
      payload: { bowler: 'B_P2' }
    });
    expect(acceptedState.currentBowler).toBe('B_P2');
    expect(acceptedState.needsBowlerChange).toBe(false);
  });

  it('Handles 15-player match with custom odd overs (e.g. 7 overs)', () => {
    let { state } = createMatchWithPlayers(15, 7);
    expect(state.overs).toBe(7);
    expect(state.playersPerTeam).toBe(15);

    // Max wickets before all out is 14
    for (let w = 1; w <= 14; w++) {
      const playerOut = state.striker;
      const nextBatter = `A_P${w + 2}`;
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: {
          runs: 0,
          isWicket: true,
          wicket: { type: WICKET_TYPES.BOWLED, playerOut },
          nextBatter: w < 14 ? nextBatter : null
        }
      });
    }
    expect(state.innings[0].wickets).toBe(14);
    expect(state.innings[0].isCompleted).toBe(true);
    expect(state.innings[0].completedReason).toBe('All out');
  });
});

describe('QA Scope 3: Swap Batter / Batter Changes', () => {
  it('Allows swap mid-over, swap twice, swap then undo, and preserves stats with correct players', () => {
    let { state } = createMatchWithPlayers(5, 5);
    expect(state.striker).toBe('A_P1');
    expect(state.nonStriker).toBe('A_P2');

    // Batter A_P1 hits a 4
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 4 }
    });
    expect(state.striker).toBe('A_P1');

    // Manager swaps batter mid-over
    state = applyEvent(state, { type: EVENT_TYPES.SWAP_BATTER, payload: {} });
    expect(state.striker).toBe('A_P2');
    expect(state.nonStriker).toBe('A_P1');

    // Swap back (twice)
    state = applyEvent(state, { type: EVENT_TYPES.SWAP_BATTER, payload: {} });
    expect(state.striker).toBe('A_P1');
    expect(state.nonStriker).toBe('A_P2');

    // Swap once more
    state = applyEvent(state, { type: EVENT_TYPES.SWAP_BATTER, payload: {} });
    expect(state.striker).toBe('A_P2');

    // Undo swap
    state = undoLastEvent(state.events);
    expect(state.striker).toBe('A_P1');
    expect(state.nonStriker).toBe('A_P2');

    // Batter A_P1 hits a 6
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 6 }
    });

    const stats = computeInningsStats(state.innings[0]);
    expect(stats.batting['A_P1'].runs).toBe(10);
    expect(stats.batting['A_P1'].fours).toBe(1);
    expect(stats.batting['A_P1'].sixes).toBe(1);
    expect(stats.batting['A_P2'].runs).toBe(0);
  });

  it('Supports time declare / retired hurt and allows batter to rejoin', () => {
    let { state } = createMatchWithPlayers(5, 5);
    expect(state.striker).toBe('A_P1');

    // Batter A_P1 time declares
    state = applyEvent(state, {
      type: EVENT_TYPES.RETIRE_BATTER,
      payload: { batter: 'A_P1', reason: 'time_declare', nextBatter: 'A_P3' }
    });
    expect(state.striker).toBe('A_P3');
    expect(state.retiredHurtBatters).toContain('A_P1');
    expect(state.innings[0].wickets).toBe(0); // Time declare is NOT a wicket

    // Later, A_P3 gets out
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.BOWLED, playerOut: 'A_P3' }
      }
    });
    expect(state.needsNewBatter).toBe(true);

    // A_P1 returns to the crease!
    state = applyEvent(state, {
      type: EVENT_TYPES.NEW_BATTER,
      payload: { batter: 'A_P1', slot: 'striker' }
    });
    expect(state.striker).toBe('A_P1');
    expect(state.retiredHurtBatters).not.toContain('A_P1');
  });
});

describe('QA Scope 4: Undo System', () => {
  it('Can undo a boundary, wide, wicket, over-end, and multiple events consecutively', () => {
    let { state } = createMatchWithPlayers(5, 5);

    // 1. Boundary
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 6 } });
    expect(state.innings[0].score).toBe(6);

    // 2. Wide
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 0, extraType: EXTRA_TYPES.WIDE, extraRuns: 0 } });
    expect(state.innings[0].score).toBe(7);

    // 3. Wicket
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, isWicket: true, wicket: { type: WICKET_TYPES.BOWLED, playerOut: 'A_P1' }, nextBatter: 'A_P3' }
    });
    expect(state.innings[0].wickets).toBe(1);
    expect(state.striker).toBe('A_P3');

    // Undo wicket
    state = undoLastEvent(state.events);
    expect(state.innings[0].wickets).toBe(0);
    expect(state.striker).toBe('A_P1');
    expect(state.innings[0].score).toBe(7);

    // Undo wide
    state = undoLastEvent(state.events);
    expect(state.innings[0].score).toBe(6);

    // Undo boundary
    state = undoLastEvent(state.events);
    expect(state.innings[0].score).toBe(0);
    expect(state.innings[0].legalBalls).toBe(0);

    // Continue scoring after undo
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 4 } });
    expect(state.innings[0].score).toBe(4);
    expect(state.innings[0].legalBalls).toBe(1);
  });

  it('Can undo over-end and restore previous bowler and ends', () => {
    let { state } = createMatchWithPlayers(5, 5);
    // Bowl 5 legal dots
    for (let i = 0; i < 5; i++) {
      state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 0 } });
    }
    expect(state.isOverComplete).toBe(false);

    // Bowl 6th ball
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 0 } });
    expect(state.isOverComplete).toBe(true);
    expect(state.needsBowlerChange).toBe(true);
    expect(state.previousBowler).toBe('B_P1');
    expect(state.currentBowler).toBeNull();

    // Undo 6th ball
    state = undoLastEvent(state.events);
    expect(state.isOverComplete).toBe(false);
    expect(state.needsBowlerChange).toBe(false);
    expect(state.currentBowler).toBe('B_P1');
    expect(state.innings[0].legalBalls).toBe(5);
  });
});
