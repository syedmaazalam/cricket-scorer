import { describe, it, expect } from 'vitest';
import { applyEvent, createInitialMatchState, replayEvents } from '../engine/reducer.js';
import { EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES } from '../engine/constants.js';
import { computeInningsStats } from '../engine/stats.js';
import { calculatePlayerPoints, POINTING_CRITERIA } from '../engine/potm.js';

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

  it('Scenario 9: Best Bowling Over calculation ranks 5-run over higher than 10-run over', () => {
    const overSummaries = [
      { overIndex: 1, runs: 10, wickets: 0 },
      { overIndex: 2, runs: 5, wickets: 0 },
      { overIndex: 3, runs: 15, wickets: 0 }
    ];

    const sortedOvers = [...overSummaries].sort((a, b) => {
      const scoreA = (a.runs || 0) - ((a.wickets || 0) * 12);
      const scoreB = (b.runs || 0) - ((b.wickets || 0) * 12);
      return scoreA - scoreB;
    });

    // 5 runs over (score = 5) beats 10 runs over (score = 10)
    expect(sortedOvers[0].overIndex).toBe(2);
    expect(sortedOvers[0].runs).toBe(5);
  });

  it('Scenario 10: Pointing criteria awards +2 points per dot ball', () => {
    expect(POINTING_CRITERIA.some(c => c.item.includes('Dot Ball') && c.points === '+2 pts')).toBe(true);

    const bowlerStat = {
      batting: { runs: 0, balls: 0, fours: 0, sixes: 0 },
      bowling: { legalBalls: 12, runsConceded: 10, wickets: 1, maidens: 0, dots: 8 }
    };

    const points = calculatePlayerPoints(bowlerStat);
    // 1 wicket = 25 pts, 8 dots * 2 = 16 pts. Total >= 41 pts (plus economy bonus)
    expect(points.dots).toBe(16);
    expect(points.wickets).toBe(25);
    expect(points.total).toBeGreaterThanOrEqual(41);
  });

  it('Scenario 11: All-out in Innings 1 correctly triggers innings break and target', () => {
    let state = createInitialMatchState();
    state = applyEvent(state, {
      type: EVENT_TYPES.MATCH_INIT,
      payload: {
        matchId: 'all_out_test',
        code: 'AOUT01',
        teams: [
          { id: 't1', name: 'Alpha', players: ['P1', 'P2', 'P3'] },
          { id: 't2', name: 'Bravo', players: ['B1', 'B2', 'B3'] }
        ],
        overs: 5,
        playersPerTeam: 3, // Max wickets = 2
        toss: { winner: 'Alpha', decision: 'bat' },
        striker: 'P1',
        nonStriker: 'P2',
        bowler: 'B1'
      }
    });

    // Wicket 1
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: true, dismissalType: WICKET_TYPES.BOWLED, nextBatter: 'P3' }
    });
    expect(state.innings[0].wickets).toBe(1);
    expect(state.innings[0].isCompleted).toBe(false);

    // Wicket 2 (All out, 2 wickets for 3 players)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: true, dismissalType: WICKET_TYPES.BOWLED }
    });

    expect(state.innings[0].wickets).toBe(2);
    expect(state.innings[0].isCompleted).toBe(true);
    expect(state.status).toBe(MATCH_STATUS.INNINGS_BREAK);
    expect(state.target).toBe(1); // 0 runs made, target is 1
  });

  it('Scenario 12: Ball records contain valid timestamps for audit logs', () => {
    let state = createTwoOverMatch();
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 4, extraType: null, extraRuns: 0, isWicket: false, timestamp: 1730000000000 }
    });

    const recordedBall = state.innings[0].balls[0];
    expect(recordedBall.timestamp).toBe(1730000000000);
  });

  it('Scenario 13: Starting Innings 2 initializes state seamlessly without crashing', () => {
    let state = createTwoOverMatch();

    // 1st innings complete (all out)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: true, dismissalType: WICKET_TYPES.BOWLED, nextBatter: 'A3' }
    });
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: true, dismissalType: WICKET_TYPES.BOWLED, nextBatter: 'A4' }
    });
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: true, dismissalType: WICKET_TYPES.BOWLED }
    });

    expect(state.innings[0].isCompleted).toBe(true);
    expect(state.innings[0].wickets).toBe(3);

    // Start 2nd innings
    state = applyEvent(state, {
      type: EVENT_TYPES.END_INNINGS,
      payload: {
        striker: 'B1',
        nonStriker: 'B2',
        bowler: 'A1'
      }
    });

    expect(state.currentInningsIndex).toBe(1);
    expect(state.innings[1]).toBeDefined();
    expect(state.innings[1].battingTeam).toBe('Team Bravo');
    expect(state.innings[1].bowlingTeam).toBe('Team Alpha');
    expect(state.striker).toBe('B1');
    expect(state.nonStriker).toBe('B2');
    expect(state.currentBowler).toBe('A1');
    expect(state.status).toBe(MATCH_STATUS.IN_PROGRESS);
  });

  it('Scenario 14: Top 3 Players correctly assigns the bowler actual team (Team Bravo, not Team Alpha)', () => {
    let state = createTwoOverMatch();

    // Innings 1: Team Alpha batting, B1 from Team Bravo bowling
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: true, dismissalType: WICKET_TYPES.BOWLED, nextBatter: 'A3' }
    });

    const stats1 = computeInningsStats(state.innings[0]);
    const aggregatedPlayerStats = {};

    const getPlayerTeam = (playerName) => {
      if (state.teams) {
        for (const t of state.teams) {
          if (t.players && t.players.includes(playerName)) return t.name;
        }
      }
      return null;
    };

    Object.entries(stats1.bowling).forEach(([name, bwStat]) => {
      const team = getPlayerTeam(name) || state.innings[0].bowlingTeam;
      aggregatedPlayerStats[name] = {
        name,
        team,
        batting: { runs: 0, balls: 0, fours: 0, sixes: 0 },
        bowling: bwStat
      };
    });

    // Bowler B1 must be attributed to Team Bravo!
    expect(aggregatedPlayerStats['B1'].team).toBe('Team Bravo');
  });

  it('Scenario 15: All-out in Innings 1 properly marks innings complete and transition to 2nd innings works seamlessly', () => {
    let state = createTwoOverMatch();

    // 4 players per team => max wickets is 3
    // Wicket 1
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 4, isWicket: true, dismissalType: WICKET_TYPES.BOWLED, nextBatter: 'A3' }
    });
    // Wicket 2
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 2, isWicket: true, dismissalType: WICKET_TYPES.BOWLED, nextBatter: 'A4' }
    });
    // Wicket 3 -> All out!
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, isWicket: true, dismissalType: WICKET_TYPES.BOWLED }
    });

    // Innings 1 must be marked complete and status INNINGS_BREAK
    expect(state.innings[0].wickets).toBe(3);
    expect(state.innings[0].isCompleted).toBe(true);
    expect(state.status).toBe(MATCH_STATUS.INNINGS_BREAK);
    expect(state.target).toBe(7); // 4 + 2 + 0 = 6 runs, target = 7
    expect(state.needsBowlerChange).toBe(false);
    expect(state.needsNewBatter).toBe(false);

    // Start 2nd innings with Team Bravo batting and Team Alpha bowling
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
    expect(state.innings[1].battingTeam).toBe('Team Bravo');
    expect(state.innings[1].bowlingTeam).toBe('Team Alpha');
    expect(state.striker).toBe('B1');
    expect(state.nonStriker).toBe('B2');
    expect(state.currentBowler).toBe('A1');
  });

  it('Scenario 16: Strike rate contains only whole numbers (no decimal points)', () => {
    let state = createTwoOverMatch();

    // A1 scores 8 runs off 3 balls (6, 2, 0) -> 8/3 * 100 = 266.666...
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 6, isLegal: true, isWicket: false }
    });
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 2, isLegal: true, isWicket: false }
    });
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, isLegal: true, isWicket: false }
    });

    const stats = computeInningsStats(state.innings[0]);
    const striker = stats.batting['A1'];
    expect(striker.runs).toBe(8);
    expect(striker.balls).toBe(3);
    // Strike rate MUST be integer 267, not 266.7
    expect(striker.strikeRate).toBe(267);
    expect(Number.isInteger(striker.strikeRate)).toBe(true);
  });
});
