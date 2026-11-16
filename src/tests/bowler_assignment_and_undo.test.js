import { describe, it, expect } from 'vitest';
import { applyEvent, undoLastEvent, createInitialMatchState } from '../engine/reducer.js';
import { EVENT_TYPES, WICKET_TYPES } from '../engine/constants.js';
import { computeInningsStats } from '../engine/stats.js';

describe('Chunk 1: Bowler Assignment, Mid-Over Correction & Cross-Over Undo', () => {
  const initEvent = {
    type: EVENT_TYPES.MATCH_INIT,
    payload: {
      matchId: 'm1',
      teams: [
        { name: 'Team A', players: ['Batter 1', 'Batter 2', 'Batter 3'] },
        { name: 'Team B', players: ['Bowler 1', 'Bowler 2', 'Bowler 3'] }
      ],
      overs: 5,
      toss: { winner: 'Team A', decision: 'bat' },
      striker: 'Batter 1',
      nonStriker: 'Batter 2',
      bowler: 'Bowler 1'
    }
  };

  it('allows swapping bowler before the first ball is bowled with zero impact on stats', () => {
    let state = applyEvent(createInitialMatchState(), initEvent);
    expect(state.currentBowler).toBe('Bowler 1');

    // Swap to Bowler 2 before ball 1
    state = applyEvent(state, {
      type: EVENT_TYPES.CHANGE_BOWLER,
      payload: { bowler: 'Bowler 2' }
    });

    expect(state.currentBowler).toBe('Bowler 2');
    const inn = state.innings[0];
    expect(inn.balls.length).toBe(0);

    const stats = computeInningsStats(inn, 5);
    expect(Object.keys(stats.bowling).length).toBe(0);
  });

  it('supports mid-over full over reassignment (scorer mistake)', () => {
    let state = applyEvent(createInitialMatchState(), initEvent);

    // Ball 1: 1 run
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
    });

    // Ball 2: Wicket
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: true, wicketType: WICKET_TYPES.BOWLED }
    });

    const innBefore = state.innings[0];
    expect(innBefore.balls[0].bowler).toBe('Bowler 1');
    expect(innBefore.balls[1].bowler).toBe('Bowler 1');
    expect(innBefore.balls[1].wicket.bowler).toBe('Bowler 1');

    // Scorer realizes mistake: Bowler 2 was bowling this entire over!
    state = applyEvent(state, {
      type: EVENT_TYPES.CHANGE_BOWLER,
      payload: { bowler: 'Bowler 2', mode: 'reassign_over' }
    });

    expect(state.currentBowler).toBe('Bowler 2');
    const innAfter = state.innings[0];
    expect(innAfter.balls[0].bowler).toBe('Bowler 2');
    expect(innAfter.balls[1].bowler).toBe('Bowler 2');
    expect(innAfter.balls[1].wicket.bowler).toBe('Bowler 2');

    // Verify stats recalculation
    const stats = computeInningsStats(innAfter, 5);
    const bowler1 = stats.bowling['Bowler 1'];
    const bowler2 = stats.bowling['Bowler 2'];

    expect(bowler1).toBeUndefined(); // Bowler 1 has no balls attributed
    expect(bowler2).toBeDefined();
    expect(bowler2.overs).toBe('0.2');
    expect(bowler2.wickets).toBe(1);
    expect(bowler2.runsConceded).toBe(1);
  });

  it('supports mid-over split over (bowler injury / replacement)', () => {
    let state = applyEvent(createInitialMatchState(), initEvent);

    // Ball 1: 0 runs by Bowler 1
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: false }
    });

    // Ball 2: 4 runs by Bowler 1
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 4, extraType: null, extraRuns: 0, isWicket: false }
    });

    // Bowler 1 injured mid-over after 0.2 overs. Bowler 3 comes in to complete the over.
    state = applyEvent(state, {
      type: EVENT_TYPES.CHANGE_BOWLER,
      payload: { bowler: 'Bowler 3', mode: 'split_over' }
    });

    expect(state.currentBowler).toBe('Bowler 3');

    // Bowler 3 bowls balls 3, 4, 5, 6
    for (let i = 0; i < 4; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
      });
    }

    const inn = state.innings[0];
    expect(inn.legalBalls).toBe(6);
    expect(inn.balls[0].bowler).toBe('Bowler 1');
    expect(inn.balls[1].bowler).toBe('Bowler 1');
    expect(inn.balls[2].bowler).toBe('Bowler 3');
    expect(inn.balls[5].bowler).toBe('Bowler 3');

    const stats = computeInningsStats(inn, 5);
    const bowler1 = stats.bowling['Bowler 1'];
    const bowler3 = stats.bowling['Bowler 3'];

    expect(bowler1.overs).toBe('0.2');
    expect(bowler1.runsConceded).toBe(4);

    expect(bowler3.overs).toBe('0.4');
    expect(bowler3.runsConceded).toBe(4);
  });

  it('supports overriding bowler on specific historical ball events', () => {
    let state = applyEvent(createInitialMatchState(), initEvent);

    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 2, extraType: null, extraRuns: 0, isWicket: false, bowler: 'Bowler 3' }
    });

    const inn = state.innings[0];
    expect(inn.balls[0].bowler).toBe('Bowler 3');
  });

  it('seamlessly reopens previous over upon undo at X.0 overs boundary', () => {
    let state = applyEvent(createInitialMatchState(), initEvent);
    const events = [initEvent];

    // Bowl 6 legal balls
    for (let i = 1; i <= 6; i++) {
      const ballEvent = {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
      };
      events.push(ballEvent);
      state = applyEvent(state, ballEvent);
    }

    // Over 1 completed: exactly 6 legal balls
    expect(state.innings[0].legalBalls).toBe(6);
    expect(state.isOverComplete).toBe(true);
    expect(state.needsBowlerChange).toBe(true);
    expect(state.previousBowler).toBe('Bowler 1');
    // Strikers swapped at over end
    expect(state.striker).toBe('Batter 2');

    // Undo 6th ball
    const undoneState = undoLastEvent(events);
    expect(undoneState.innings[0].legalBalls).toBe(5);
    expect(undoneState.isOverComplete).toBe(false);
    expect(undoneState.needsBowlerChange).toBe(false);
    expect(undoneState.currentBowler).toBe('Bowler 1');
    expect(undoneState.striker).toBe('Batter 2'); // was on strike before ball 6 (which had 1 run)
  });

  it('reopens previous over and restores ends on REOPEN_PREVIOUS_OVER event', () => {
    let state = applyEvent(createInitialMatchState(), initEvent);

    // Bowl 6 legal balls (0 runs each, so no odd-run striker swap)
    for (let i = 1; i <= 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: false }
      });
    }

    // At over completion, striker swapped from Batter 1 to Batter 2
    expect(state.isOverComplete).toBe(true);
    expect(state.needsBowlerChange).toBe(true);
    expect(state.striker).toBe('Batter 2');

    // Reopen previous over
    state = applyEvent(state, {
      type: EVENT_TYPES.REOPEN_PREVIOUS_OVER,
      payload: {}
    });

    expect(state.isOverComplete).toBe(false);
    expect(state.needsBowlerChange).toBe(false);
    expect(state.currentBowler).toBe('Bowler 1');
    expect(state.striker).toBe('Batter 1'); // swapped back
  });
});
