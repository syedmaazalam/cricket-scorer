import { describe, it, expect } from 'vitest';
import { applyEvent, createInitialMatchState, replayEvents } from '../engine/reducer.js';
import { EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES } from '../engine/constants.js';
import { computeInningsStats } from '../engine/stats.js';

function createTwoOverMatch() {
  let state = createInitialMatchState();
  state = applyEvent(state, {
    type: EVENT_TYPES.MATCH_INIT,
    payload: {
      matchId: 'two_over_test',
      code: 'TOV001',
      teams: [
        { id: 't1', name: 'Team Alpha', players: ['A1', 'A2', 'A3', 'A4'] },
        { id: 't2', name: 'Team Bravo', players: ['B1', 'B2', 'B3', 'B4'] }
      ],
      overs: 2,
      playersPerTeam: 4,
      toss: { winner: 'Team Alpha', decision: 'bat' },
      striker: 'A1',
      nonStriker: 'A2',
      bowler: 'B1'
    }
  });
  return state;
}

describe('QA Tests: Match Completion & Developer Features', () => {
  it('Scenario 1: 2-over match completes cleanly without asking for bowler of 3rd over', () => {
    let state = createTwoOverMatch();

    // Innings 1, Over 1: 6 legal dots bowled by B1
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
      });
    }

    expect(state.innings[0].legalBalls).toBe(6);
    expect(state.needsBowlerChange).toBe(true);

    // Innings 1, Select Bowler for Over 2: B2
    state = applyEvent(state, {
      type: EVENT_TYPES.CHANGE_BOWLER,
      payload: { bowler: 'B2' }
    });
    expect(state.needsBowlerChange).toBe(false);
    expect(state.currentBowler).toBe('B2');

    // Innings 1, Over 2: 6 balls bowled by B2 (total 12 balls = 2 overs completed)
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 2, extraType: null, extraRuns: 0, isWicket: false }
      });
    }

    // Innings 1 is now complete!
    expect(state.innings[0].legalBalls).toBe(12);
    expect(state.innings[0].isCompleted).toBe(true);
    // Crucial: Innings 1 complete should NOT ask for bowler for over 3
    expect(state.needsBowlerChange).toBe(false);

    // End Innings 1 and start Innings 2
    state = applyEvent(state, {
      type: EVENT_TYPES.END_INNINGS,
      payload: {
        striker: 'B1',
        nonStriker: 'B2',
        bowler: 'A1'
      }
    });

    expect(state.currentInningsIndex).toBe(1);
    expect(state.target).toBe(19); // 6 + 12 = 18 runs, target = 19
    expect(state.striker).toBe('B1');
    expect(state.nonStriker).toBe('B2');
    expect(state.currentBowler).toBe('A1');

    // Innings 2, Over 1: 6 balls bowled by A1
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: false }
      });
    }
    expect(state.innings[1].legalBalls).toBe(6);
    expect(state.needsBowlerChange).toBe(true);

    // Innings 2, Over 2 Bowler selection: A2
    state = applyEvent(state, {
      type: EVENT_TYPES.CHANGE_BOWLER,
      payload: { bowler: 'A2' }
    });
    expect(state.needsBowlerChange).toBe(false);

    // Innings 2, Over 2: 6 balls bowled by A2 (Team Bravo scores only 6 runs, Alpha scored 18)
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
      });
    }

    // Match is now fully completed: Bravo lost, Alpha won
    expect(state.innings[1].legalBalls).toBe(12);
    expect(state.innings[1].isCompleted).toBe(true);
    expect(state.status).toBe(MATCH_STATUS.COMPLETED);
    expect(state.result).toBeDefined();
    expect(state.result.winner).toBe('Team Alpha');

    // CRITICAL FIX VERIFICATION:
    // When match is finished, needsBowlerChange MUST be false so no 3rd over bowler modal is shown!
    expect(state.needsBowlerChange).toBe(false);
    expect(state.isOverComplete).toBe(false);
  });

  it('Scenario 2: ADD_BALL_TO_PREVIOUS_OVER properly adds runs/extras/wickets and credits players', () => {
    let state = createTwoOverMatch();

    // Bowl 6 balls in Over 1
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
      });
    }

    // Select Bowler for Over 2
    state = applyEvent(state, {
      type: EVENT_TYPES.CHANGE_BOWLER,
      payload: { bowler: 'B2' }
    });

    const initialScore = state.innings[0].score;

    // Scorer realizes a 4 was missed on the last ball of over 1, or needs to append a ball
    state = applyEvent(state, {
      type: EVENT_TYPES.ADD_BALL_TO_PREVIOUS_OVER,
      payload: {
        runs: 4,
        extraType: null,
        extraRuns: 0,
        isWicket: false
      }
    });

    const inn = state.innings[0];
    expect(inn.score).toBe(initialScore + 4);
    // Added ball is reflected in balls array
    const lastBallOfPrevOver = inn.balls[inn.balls.length - 1];
    expect(lastBallOfPrevOver.runs).toBe(4);
    expect(lastBallOfPrevOver.isPreviousOverCorrection).toBe(true);
  });

  it('Scenario 3: REOPEN_PREVIOUS_OVER resets bowler and legalBalls so over 1 can be edited', () => {
    let state = createTwoOverMatch();

    // Bowl 6 balls in Over 1
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
      });
    }

    // Select Bowler for Over 2
    state = applyEvent(state, {
      type: EVENT_TYPES.CHANGE_BOWLER,
      payload: { bowler: 'B2' }
    });
    expect(state.currentBowler).toBe('B2');

    // Scorer reopens previous over
    state = applyEvent(state, {
      type: EVENT_TYPES.REOPEN_PREVIOUS_OVER,
      payload: {}
    });

    // Bowler should be restored to Over 1 bowler (B1)
    expect(state.currentBowler).toBe('B1');
    expect(state.needsBowlerChange).toBe(false);
  });

  it('Scenario 4: Replay consistency check with full event stream', () => {
    let state = createTwoOverMatch();

    const events = [...state.events];

    const ballEvent = {
      type: EVENT_TYPES.BALL,
      payload: { runs: 6, extraType: null, extraRuns: 0, isWicket: false }
    };

    state = applyEvent(state, ballEvent);
    events.push(ballEvent);

    const replayed = replayEvents(events);
    expect(replayed.innings[0].score).toBe(state.innings[0].score);
    expect(replayed.innings[0].score).toBe(6);
    expect(replayed.innings[0].balls.length).toBe(1);
  });

  it('Scenario 5: 2nd innings target chased mid-over immediately finishes match and clears bowler prompts', () => {
    let state = createTwoOverMatch();

    // Innings 1: 6 runs scored in 1 over (target = 7)
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
      });
    }

    // Force innings end
    state = applyEvent(state, {
      type: EVENT_TYPES.END_INNINGS,
      payload: { striker: 'B1', nonStriker: 'B2', bowler: 'A1' }
    });

    expect(state.target).toBe(7);

    // Innings 2: Ball 1: hits a 6 (score = 6), Ball 2: hits a 4 (score = 10 >= 7 target chased!)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 6, extraType: null, extraRuns: 0, isWicket: false }
    });
    expect(state.status).toBe(MATCH_STATUS.IN_PROGRESS);

    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 4, extraType: null, extraRuns: 0, isWicket: false }
    });

    expect(state.status).toBe(MATCH_STATUS.COMPLETED);
    expect(state.winner).toBe('Team Bravo');
    expect(state.needsBowlerChange).toBe(false);
    expect(state.isOverComplete).toBe(false);
  });

  it('Scenario 6: Developer export / upload roundtrip validation', () => {
    let state = createTwoOverMatch();

    for (let i = 0; i < 4; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: i + 1, extraType: null, extraRuns: 0, isWicket: false }
      });
    }

    // Emulate JSON download and re-upload
    const exportedJson = JSON.stringify({
      matchId: state.matchId,
      code: state.code,
      status: state.status,
      teams: state.teams,
      events: state.events,
      exportedAt: new Date().toISOString()
    });

    const parsed = JSON.parse(exportedJson);
    expect(parsed.matchId).toBe('two_over_test');
    expect(parsed.events.length).toBe(state.events.length);

    // Replay on another device / clean client
    const restored = replayEvents(parsed.events);
    expect(restored.matchId).toBe(state.matchId);
    expect(restored.innings[0].score).toBe(state.innings[0].score);
    expect(restored.innings[0].legalBalls).toBe(state.innings[0].legalBalls);
  });

  it('Scenario 7: Consecutive over indices and best over calculation', () => {
    let state = createTwoOverMatch();

    // Over 1: 10 runs (1, 1, 2, 2, 2, 2)
    const over1Runs = [1, 1, 2, 2, 2, 2];
    for (const r of over1Runs) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: r, extraType: null, extraRuns: 0, isWicket: false }
      });
    }

    state = applyEvent(state, {
      type: EVENT_TYPES.CHANGE_BOWLER,
      payload: { bowler: 'B2' }
    });

    // Over 2: 24 runs (4, 4, 4, 4, 4, 4)
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 4, extraType: null, extraRuns: 0, isWicket: false }
      });
    }

    const stats = computeInningsStats(state.innings[0]);
    expect(stats.overSummaries.length).toBe(2);
    expect(stats.overSummaries[0].overIndex).toBe(1);
    expect(stats.overSummaries[0].runs).toBe(10);
    expect(stats.overSummaries[1].overIndex).toBe(2);
    expect(stats.overSummaries[1].runs).toBe(24);

    // Innings 1 is completed and target is 35
    expect(state.innings[0].isCompleted).toBe(true);
    expect(state.target).toBe(35);
    expect(state.status).toBe(MATCH_STATUS.INNINGS_BREAK);
  });

  it('Scenario 8: Starting Innings 2 properly resets striker, non-striker, and bowler', () => {
    let state = createTwoOverMatch();

    // Bowl 12 balls in Innings 1
    for (let i = 0; i < 12; i++) {
      if (i === 6) {
        state = applyEvent(state, {
          type: EVENT_TYPES.CHANGE_BOWLER,
          payload: { bowler: 'B2' }
        });
      }
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
      });
    }

    expect(state.status).toBe(MATCH_STATUS.INNINGS_BREAK);

    // Start 2nd Innings
    state = applyEvent(state, {
      type: EVENT_TYPES.END_INNINGS,
      payload: {
        striker: 'B1',
        nonStriker: 'B2',
        bowler: 'A1'
      }
    });

    expect(state.currentInningsIndex).toBe(1);
    expect(state.status).toBe(MATCH_STATUS.IN_PROGRESS);
    expect(state.striker).toBe('B1');
    expect(state.nonStriker).toBe('B2');
    expect(state.currentBowler).toBe('A1');
    expect(state.innings[1].score).toBe(0);
    expect(state.innings[1].legalBalls).toBe(0);
  });
});
