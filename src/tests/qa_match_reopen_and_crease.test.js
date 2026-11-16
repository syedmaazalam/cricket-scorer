import { describe, it, expect } from 'vitest';
import { createInitialMatchState, applyEvent } from '../engine/reducer.js';
import { EVENT_TYPES, MATCH_STATUS, EXTRA_TYPES } from '../engine/constants.js';
import { saveEventLocally, getEventsForMatch, deleteEventsLocally } from '../store/localDb.js';
import { deriveMatchDisplayScore } from '../firebase/matches.js';

const mockStore = {};
globalThis.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => { mockStore[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); },
  get length() { return Object.keys(mockStore).length; },
  key: (i) => Object.keys(mockStore)[i] || null
};

describe('Crease & Innings Transition Integrity', () => {
  const initEvent = {
    type: EVENT_TYPES.MATCH_INIT,
    payload: {
      matchId: 'match_test_crease',
      teams: [
        { name: 'Team Alpha', players: ['Alpha1', 'Alpha2', 'Alpha3'] },
        { name: 'Team Bravo', players: ['Bravo1', 'Bravo2', 'Bravo3'] }
      ],
      overs: 1,
      playersPerTeam: 3,
      toss: { winner: 'Team Alpha', decision: 'bat' },
      striker: 'Alpha1',
      nonStriker: 'Alpha2',
      bowler: 'Bravo1'
    }
  };

  it('Explicitly clears striker, nonStriker, and bowler when Innings 1 completes', () => {
    let state = applyEvent(createInitialMatchState(), initEvent);
    expect(state.striker).toBe('Alpha1');
    expect(state.nonStriker).toBe('Alpha2');

    // Bowl 6 legal deliveries to conclude 1-over innings
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, isLegal: true }
      });
    }

    expect(state.innings[0].isCompleted).toBe(true);
    expect(state.status).toBe(MATCH_STATUS.INNINGS_BREAK);
    // Crease must be flushed completely
    expect(state.striker).toBeNull();
    expect(state.nonStriker).toBeNull();
    expect(state.currentBowler).toBeNull();
  });

  it('Prevents assigning a defending team player as an opener in Innings 2', () => {
    let state = applyEvent(createInitialMatchState(), initEvent);
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, isLegal: true }
      });
    }

    // Attempt to start Innings 2 with an Alpha player as nonStriker
    state = applyEvent(state, {
      type: EVENT_TYPES.END_INNINGS,
      payload: {
        reason: 'Innings completed',
        striker: 'Bravo1',
        nonStriker: 'Alpha1', // Defending team batter - ILLEGAL!
        bowler: 'Alpha2'
      }
    });

    expect(state.currentInningsIndex).toBe(1);
    expect(state.striker).toBe('Bravo1');
    // Alpha1 must NOT be accepted as nonStriker
    expect(state.nonStriker).toBeNull();
    expect(state.needsNewBatter).toBe(true);
    expect(state.vacantBatterSlot).toBe('nonStriker');
  });

  it('NEW_BATTER rejects duplicate batter already at the opposite crease', () => {
    let state = applyEvent(createInitialMatchState(), initEvent);
    // Try to set striker as Alpha2 (who is already nonStriker)
    const nextState = applyEvent(state, {
      type: EVENT_TYPES.NEW_BATTER,
      payload: { slot: 'striker', batter: 'Alpha2' }
    });

    // Should be rejected (returns previous state without duplicating Alpha2)
    expect(nextState.striker).toBe('Alpha1');
    expect(nextState.nonStriker).toBe('Alpha2');
  });

  it('NEW_BATTER rejects selecting a player from the bowling team', () => {
    let state = applyEvent(createInitialMatchState(), initEvent);
    // Alpha is batting, Bravo is bowling. Attempt to introduce Bravo2 to bat for Alpha
    const nextState = applyEvent(state, {
      type: EVENT_TYPES.NEW_BATTER,
      payload: { slot: 'striker', batter: 'Bravo2' }
    });

    // Should be rejected
    expect(nextState.striker).toBe('Alpha1');
  });

  it('Accurately tallies No-Ball runs without phantom double-counting', () => {
    let state = applyEvent(createInitialMatchState(), initEvent);

    // 1. Dot No-Ball (0 off bat) -> Exactly 1 penalty run for team
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: EXTRA_TYPES.NO_BALL, extraRuns: 0, isLegal: false }
    });
    expect(state.innings[0].score).toBe(1);
    expect(state.innings[0].legalBalls).toBe(0);

    // 2. Single off No-Ball (1 off bat) -> Exactly 2 runs for team (1 penalty + 1 off bat)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 1, extraType: EXTRA_TYPES.NO_BALL, extraRuns: 0, isLegal: false }
    });
    expect(state.innings[0].score).toBe(3); // 1 + 2 = 3
    expect(state.innings[0].legalBalls).toBe(0);

    // 3. Four off No-Ball (4 off bat) -> Exactly 5 runs for team (1 penalty + 4 off bat)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 4, extraType: EXTRA_TYPES.NO_BALL, extraRuns: 0, isLegal: false }
    });
    expect(state.innings[0].score).toBe(8); // 3 + 5 = 8
    expect(state.innings[0].legalBalls).toBe(0);
  });

  it('Permanently deletes undone events from local store so they cannot resurrect on reopen', async () => {
    const testMatchId = 'match_undo_test_999';
    const ev1 = { id: 'ev_1', matchId: testMatchId, seq: 1, type: EVENT_TYPES.MATCH_INIT, payload: {} };
    const ev2 = { id: 'ev_2', matchId: testMatchId, seq: 2, type: EVENT_TYPES.BALL, payload: { runs: 4 } };
    const ev3 = { id: 'ev_3', matchId: testMatchId, seq: 3, type: EVENT_TYPES.BALL, payload: { runs: 6 } };

    await saveEventLocally(ev1);
    await saveEventLocally(ev2);
    await saveEventLocally(ev3);

    const initialEvents = await getEventsForMatch(testMatchId);
    expect(initialEvents.map(e => e.id)).toContain('ev_2');
    expect(initialEvents.map(e => e.id)).toContain('ev_3');

    // Simulate undoing ev_3
    await deleteEventsLocally(testMatchId, ['ev_3']);

    const eventsAfterUndo = await getEventsForMatch(testMatchId);
    expect(eventsAfterUndo.map(e => e.id)).toContain('ev_1');
    expect(eventsAfterUndo.map(e => e.id)).toContain('ev_2');
    expect(eventsAfterUndo.map(e => e.id)).not.toContain('ev_3');
  });

  it('Correctly maps team scores when toss winner elects to bowl (Team 2 bats first)', () => {
    // Team Alpha won toss and chose to BOWL -> Team Bravo bats in Innings 1
    const bowlFirstEvent = {
      type: EVENT_TYPES.MATCH_INIT,
      payload: {
        matchId: 'match_toss_bowl',
        teams: [
          { name: 'Team Alpha', players: ['A1', 'A2'] },
          { name: 'Team Bravo', players: ['B1', 'B2'] }
        ],
        overs: 1,
        playersPerTeam: 2,
        toss: { winner: 'Team Alpha', decision: 'bowl' },
        striker: 'B1',
        nonStriker: 'B2',
        bowler: 'A1'
      }
    };

    let state = applyEvent(createInitialMatchState(), bowlFirstEvent);
    expect(state.innings[0].battingTeam).toBe('Team Bravo');
    expect(state.innings[0].bowlingTeam).toBe('Team Alpha');

    // Bravo scores 10 runs in Innings 1
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 6, isLegal: true }
    });
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 4, isLegal: true }
    });

    const displayScore = deriveMatchDisplayScore(state);
    expect(displayScore.inn1Text).toContain('Team Bravo: 10/0');
    expect(displayScore.inn1Text).not.toContain('Team Alpha');
  });

  it('End-to-End Match Completion and Reopen: Guarantees 0 cross-team batters on crease and exact score preservation', async () => {
    const matchId = 'match_e2e_reopen_verify';
    const teams = [
      { name: 'Team Alpha', players: ['Alpha1', 'Alpha2', 'Alpha3'] },
      { name: 'Team Bravo', players: ['Bravo1', 'Bravo2', 'Bravo3'] }
    ];

    const eventInit = {
      id: `${matchId}_init`,
      matchId,
      seq: 1,
      type: EVENT_TYPES.MATCH_INIT,
      payload: {
        matchId,
        teams,
        overs: 1,
        playersPerTeam: 3,
        toss: { winner: 'Team Alpha', decision: 'bat' },
        striker: 'Alpha1',
        nonStriker: 'Alpha2',
        bowler: 'Bravo1'
      }
    };

    let localState = applyEvent(createInitialMatchState(), eventInit);
    await saveEventLocally(eventInit);

    // Ball 1: 1 run
    const b1 = { id: `${matchId}_b1`, matchId, seq: 2, type: EVENT_TYPES.BALL, payload: { runs: 1, isLegal: true } };
    localState = applyEvent(localState, b1);
    await saveEventLocally(b1);

    // Ball 2 (Accidental): No-ball that user subsequently undid
    const b2Bad = { id: `${matchId}_b2_bad`, matchId, seq: 3, type: EVENT_TYPES.BALL, payload: { runs: 0, extraType: EXTRA_TYPES.NO_BALL, extraRuns: 0, isLegal: false } };
    localState = applyEvent(localState, b2Bad);
    await saveEventLocally(b2Bad);

    // Scorer performs UNDO on the accidental No-ball
    await deleteEventsLocally(matchId, [b2Bad.id]);
    localState = applyEvent(createInitialMatchState(), eventInit);
    localState = applyEvent(localState, b1);

    // Ball 2 (Corrected): 4 runs off bat
    const b2 = { id: `${matchId}_b2`, matchId, seq: 4, type: EVENT_TYPES.BALL, payload: { runs: 4, isLegal: true } };
    localState = applyEvent(localState, b2);
    await saveEventLocally(b2);

    // Balls 3-6: 1, 1, 1, 2
    for (let i = 3; i <= 6; i++) {
      const b = { id: `${matchId}_b${i}`, matchId, seq: i + 2, type: EVENT_TYPES.BALL, payload: { runs: i === 6 ? 2 : 1, isLegal: true } };
      localState = applyEvent(localState, b);
      await saveEventLocally(b);
    }

    // Innings 1 completes: Score is 1 + 4 + 1 + 1 + 1 + 2 = 10 runs
    expect(localState.innings[0].score).toBe(10);
    expect(localState.status).toBe(MATCH_STATUS.INNINGS_BREAK);
    expect(localState.target).toBe(11);
    expect(localState.striker).toBeNull();
    expect(localState.nonStriker).toBeNull();

    // Start Innings 2 with Team Bravo openers
    const inn2Start = {
      id: `${matchId}_end_inn`,
      matchId,
      seq: 9,
      type: EVENT_TYPES.END_INNINGS,
      payload: {
        reason: 'Innings completed',
        striker: 'Bravo1',
        nonStriker: 'Bravo2',
        bowler: 'Alpha1'
      }
    };
    localState = applyEvent(localState, inn2Start);
    await saveEventLocally(inn2Start);

    expect(localState.currentInningsIndex).toBe(1);
    expect(localState.striker).toBe('Bravo1');
    expect(localState.nonStriker).toBe('Bravo2');

    // Bravo chases 11: 6 runs, 4 runs, 1 run -> 11 runs
    const chaseBalls = [
      { id: `${matchId}_chase_1`, matchId, seq: 10, type: EVENT_TYPES.BALL, payload: { runs: 6, isLegal: true } },
      { id: `${matchId}_chase_2`, matchId, seq: 11, type: EVENT_TYPES.BALL, payload: { runs: 4, isLegal: true } },
      { id: `${matchId}_chase_3`, matchId, seq: 12, type: EVENT_TYPES.BALL, payload: { runs: 1, isLegal: true } }
    ];

    for (const cb of chaseBalls) {
      localState = applyEvent(localState, cb);
      await saveEventLocally(cb);
    }

    expect(localState.status).toBe(MATCH_STATUS.COMPLETED);
    expect(localState.winner).toBe('Team Bravo');
    expect(localState.innings[1].score).toBe(11);

    // ==========================================
    // SIMULATE MATCH REOPENING NEXT DAY
    // ==========================================
    const reloadedEvents = await getEventsForMatch(matchId);
    // 1. Ensure the undone ball was NEVER stored or retrieved
    expect(reloadedEvents.map(e => e.id)).not.toContain(`${matchId}_b2_bad`);

    // 2. Reconstruct entire match state by replaying local events
    let replayedState = createInitialMatchState();
    for (const ev of reloadedEvents) {
      replayedState = applyEvent(replayedState, ev);
    }

    // 3. Verify match scores and status are 100% accurate
    expect(replayedState.innings[0].score).toBe(10);
    expect(replayedState.innings[1].score).toBe(11);
    expect(replayedState.status).toBe(MATCH_STATUS.COMPLETED);
    expect(replayedState.winner).toBe('Team Bravo');

    // 4. Verify ZERO cross-team batsmen on the crease
    const bravoPlayers = teams[1].players;
    const alphaPlayers = teams[0].players;
    if (replayedState.striker) {
      expect(bravoPlayers).toContain(replayedState.striker);
      expect(alphaPlayers).not.toContain(replayedState.striker);
    }
    if (replayedState.nonStriker) {
      expect(bravoPlayers).toContain(replayedState.nonStriker);
      expect(alphaPlayers).not.toContain(replayedState.nonStriker);
    }
  });
});
