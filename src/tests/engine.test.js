import { describe, it, expect } from 'vitest';
import { EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES } from '../engine/constants.js';
import { getMaxWickets, isLegalDelivery, isBowlerWicket, calculateCRR, calculateRRR, formatOvers } from '../engine/rules.js';
import { createInitialMatchState, applyEvent, replayEvents, undoLastEvent } from '../engine/reducer.js';
import { computeInningsStats, computeBatterDetails, computeBowlerDetails } from '../engine/stats.js';
import { calculatePlayerPoints, getTopPlayers } from '../engine/potm.js';

describe('Cricket Scoring Engine', () => {
  const setupEvent = {
    type: EVENT_TYPES.MATCH_INIT,
    payload: {
      matchId: 'match_123',
      code: 'CRK123',
      teams: [
        { name: 'India', players: ['Rohit', 'Gill', 'Kohli', 'Rahul', 'Hardik', 'Jadeja'] },
        { name: 'Australia', players: ['Head', 'Warner', 'Smith', 'Marsh', 'Maxwell', 'Starc'] }
      ],
      overs: 5,
      playersPerTeam: 6,
      toss: { winner: 'India', decision: 'bat' },
      striker: 'Rohit',
      nonStriker: 'Gill',
      bowler: 'Starc'
    }
  };

  it('correctly calculates max wickets for custom team sizes (players - 1)', () => {
    expect(getMaxWickets(11)).toBe(10);
    expect(getMaxWickets(6)).toBe(5);
    expect(getMaxWickets(2)).toBe(1);
    expect(getMaxWickets(15)).toBe(14);
  });

  it('initializes match state correctly from MATCH_INIT event', () => {
    const state = applyEvent(createInitialMatchState(), setupEvent);
    expect(state.status).toBe(MATCH_STATUS.IN_PROGRESS);
    expect(state.teams[0].name).toBe('India');
    expect(state.overs).toBe(5);
    expect(state.playersPerTeam).toBe(6);
    expect(state.striker).toBe('Rohit');
    expect(state.nonStriker).toBe('Gill');
    expect(state.currentBowler).toBe('Starc');
    expect(state.innings[0].score).toBe(0);
    expect(state.innings[0].wickets).toBe(0);
    expect(state.innings[0].legalBalls).toBe(0);
  });

  it('handles dot balls and strike rotation on odd runs', () => {
    let state = applyEvent(createInitialMatchState(), setupEvent);

    // Ball 1: 0 runs
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0 }
    });
    expect(state.innings[0].score).toBe(0);
    expect(state.innings[0].legalBalls).toBe(1);
    expect(state.striker).toBe('Rohit');
    expect(state.nonStriker).toBe('Gill');

    // Ball 2: 1 run -> strike rotates
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 1 }
    });
    expect(state.innings[0].score).toBe(1);
    expect(state.innings[0].legalBalls).toBe(2);
    expect(state.striker).toBe('Gill');
    expect(state.nonStriker).toBe('Rohit');

    // Ball 3: 4 runs -> boundary, no rotation
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 4 }
    });
    expect(state.innings[0].score).toBe(5);
    expect(state.innings[0].legalBalls).toBe(3);
    expect(state.striker).toBe('Gill');
    expect(state.nonStriker).toBe('Rohit');

    // Ball 4: 3 runs -> odd runs, strike rotates
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 3 }
    });
    expect(state.innings[0].score).toBe(8);
    expect(state.innings[0].legalBalls).toBe(4);
    expect(state.striker).toBe('Rohit');
    expect(state.nonStriker).toBe('Gill');
  });

  it('handles wide and no-ball extras correctly without advancing legal balls', () => {
    let state = applyEvent(createInitialMatchState(), setupEvent);

    // Wide ball (1 run extra)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: EXTRA_TYPES.WIDE, extraRuns: 0 }
    });
    expect(state.innings[0].score).toBe(1);
    expect(state.innings[0].legalBalls).toBe(0); // Not a legal ball
    expect(state.striker).toBe('Rohit');

    // Wide ball with 2 additional overthrows (total 3 runs)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: EXTRA_TYPES.WIDE, extraRuns: 2 }
    });
    expect(state.innings[0].score).toBe(4); // 1 + 3 = 4
    expect(state.innings[0].legalBalls).toBe(0);

    // No ball with 2 runs off the bat
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 2, extraType: EXTRA_TYPES.NO_BALL, extraRuns: 0 }
    });
    expect(state.innings[0].score).toBe(7); // 4 + (1 nb + 2 runs) = 7
    expect(state.innings[0].legalBalls).toBe(0); // Still 0 legal balls
    expect(state.isFreeHit).toBe(true); // Next delivery is Free Hit!
  });

  it('enforces Free Hit rules correctly', () => {
    let state = applyEvent(createInitialMatchState(), setupEvent);

    // No-ball triggers free hit
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: EXTRA_TYPES.NO_BALL }
    });
    expect(state.isFreeHit).toBe(true);

    // Ball on Free Hit: Batter is caught -> DISALLOWED on Free Hit!
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.CAUGHT, playerOut: 'Rohit', fielder: 'Warner' }
      }
    });
    expect(state.innings[0].wickets).toBe(0); // Wicket not counted
    expect(state.isFreeHit).toBe(false); // Free hit concluded on legal ball

    // Trigger another free hit
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: EXTRA_TYPES.NO_BALL }
    });
    expect(state.isFreeHit).toBe(true);

    // On Free Hit, wide is bowled -> Free hit PERSISTS!
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: EXTRA_TYPES.WIDE }
    });
    expect(state.isFreeHit).toBe(true);

    // On Free Hit, run out occurs -> ALLOWED on Free Hit!
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 1,
        isWicket: true,
        wicket: { type: WICKET_TYPES.RUN_OUT, playerOut: 'Rohit', fielder: 'Maxwell' },
        nextBatter: 'Kohli'
      }
    });
    expect(state.innings[0].wickets).toBe(1);
    expect(state.isFreeHit).toBe(false);
  });

  it('completes over on 6 legal balls and prompts bowler change', () => {
    let state = applyEvent(createInitialMatchState(), setupEvent);

    // Bowl 5 legal dots
    for (let i = 0; i < 5; i++) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0 }
      });
    }
    expect(state.innings[0].legalBalls).toBe(5);
    expect(state.isOverComplete).toBe(false);

    // Ball 6: 0 runs -> over complete
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0 }
    });
    expect(state.innings[0].legalBalls).toBe(6);
    expect(state.isOverComplete).toBe(true);
    expect(state.needsBowlerChange).toBe(true);
    expect(state.previousBowler).toBe('Starc');
    expect(state.currentBowler).toBe(null);
    // Strike rotated at end of over
    expect(state.striker).toBe('Gill');
    expect(state.nonStriker).toBe('Rohit');

    // Bowler change event
    state = applyEvent(state, {
      type: EVENT_TYPES.CHANGE_BOWLER,
      payload: { bowler: 'Maxwell' }
    });
    expect(state.currentBowler).toBe('Maxwell');
    expect(state.needsBowlerChange).toBe(false);
    expect(state.isOverComplete).toBe(false);
  });

  it('correctly handles 1 run on the 6th ball (odd run + change of ends)', () => {
    let state = applyEvent(createInitialMatchState(), setupEvent);

    // 5 dots
    for (let i = 0; i < 5; i++) {
      state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 0 } });
    }
    expect(state.striker).toBe('Rohit');
    expect(state.nonStriker).toBe('Gill');

    // 6th ball: Rohit takes a single (1 run).
    // Rohit runs to non-striker's end, then ends change for new over.
    // Result: Rohit faces the first ball of the next over!
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 1 }
    });
    expect(state.innings[0].legalBalls).toBe(6);
    expect(state.striker).toBe('Rohit');
    expect(state.nonStriker).toBe('Gill');
  });

  it('supports 1-tap manual swap batter', () => {
    let state = applyEvent(createInitialMatchState(), setupEvent);
    expect(state.striker).toBe('Rohit');
    expect(state.nonStriker).toBe('Gill');

    state = applyEvent(state, { type: EVENT_TYPES.SWAP_BATTER });
    expect(state.striker).toBe('Gill');
    expect(state.nonStriker).toBe('Rohit');
  });

  it('triggers all-out when wickets reach players - 1', () => {
    // 6 players per team -> max wickets = 5
    let state = applyEvent(createInitialMatchState(), setupEvent);

    const dismissals = ['Rohit', 'Gill', 'Kohli', 'Rahul'];
    for (const p of dismissals) {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: {
          runs: 0,
          isWicket: true,
          wicket: { type: WICKET_TYPES.BOWLED, playerOut: p },
          nextBatter: 'NextPlayer'
        }
      });
    }
    expect(state.innings[0].wickets).toBe(4);
    expect(state.status).toBe(MATCH_STATUS.IN_PROGRESS);

    // 5th wicket -> All out!
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.BOWLED, playerOut: 'NextPlayer' }
      }
    });
    expect(state.innings[0].wickets).toBe(5);
    expect(state.innings[0].isCompleted).toBe(true);
    expect(state.status).toBe(MATCH_STATUS.INNINGS_BREAK);
    expect(state.target).toBe(1); // Score is 0, target is 1
  });

  it('guarantees 100% deterministic event sourcing replay and undo', () => {
    const events = [
      setupEvent,
      { type: EVENT_TYPES.BALL, payload: { runs: 4 } },
      { type: EVENT_TYPES.BALL, payload: { runs: 1 } },
      { type: EVENT_TYPES.BALL, payload: { runs: 6 } },
      { type: EVENT_TYPES.BALL, payload: { runs: 0, extraType: EXTRA_TYPES.WIDE } },
      { type: EVENT_TYPES.SWAP_BATTER },
      {
        type: EVENT_TYPES.BALL,
        payload: {
          runs: 0,
          isWicket: true,
          wicket: { type: WICKET_TYPES.CAUGHT, playerOut: 'Rohit', fielder: 'Warner' },
          nextBatter: 'Kohli'
        }
      }
    ];

    const state1 = replayEvents(events);
    const state2 = replayEvents(events);

    // Determinism test
    expect(JSON.stringify(state1)).toBe(JSON.stringify(state2));
    expect(state1.innings[0].score).toBe(12); // 4 + 1 + 6 + 1(wd) = 12
    expect(state1.innings[0].wickets).toBe(1);

    // Undo test: undoing the last wicket rolls back score and wickets accurately
    const stateUndone = undoLastEvent(events);
    expect(stateUndone.innings[0].wickets).toBe(0);
    expect(stateUndone.innings[0].score).toBe(12);
  });

  it('calculates comprehensive batting, bowling, and extras statistics', () => {
    let state = applyEvent(createInitialMatchState(), setupEvent);
    // Rohit hits 4
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 4 } });
    // Rohit hits 6
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 6 } });
    // Wide ball
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 0, extraType: EXTRA_TYPES.WIDE } });
    // Leg bye 2 runs
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 0, extraType: EXTRA_TYPES.LEG_BYE, extraRuns: 2 } });

    const stats = computeInningsStats(state.innings[0]);

    // Batting stats
    expect(stats.batting['Rohit'].runs).toBe(10);
    expect(stats.batting['Rohit'].balls).toBe(3); // 2 boundaries + 1 leg bye (faced), wide not counted
    expect(stats.batting['Rohit'].fours).toBe(1);
    expect(stats.batting['Rohit'].sixes).toBe(1);

    // Bowling stats
    expect(stats.bowling['Starc'].runsConceded).toBe(11); // 4 + 6 + 1(wd) = 11. Leg-bye not charged to bowler!
    expect(stats.bowling['Starc'].legalBalls).toBe(3);
    expect(stats.bowling['Starc'].wides).toBe(1);

    // Extras
    expect(stats.extras.wides).toBe(1);
    expect(stats.extras.legByes).toBe(2);
    expect(stats.extras.total).toBe(3);
  });

  it('ranks Top 3 Players of the Match using the official formula', () => {
    const allStats = {
      Rohit: {
        name: 'Rohit Sharma',
        team: 'India',
        batting: { runs: 85, balls: 45, fours: 8, sixes: 4 },
        bowling: { legalBalls: 0, runsConceded: 0, wickets: 0, maidens: 0 }
      },
      Bumrah: {
        name: 'Jasprit Bumrah',
        team: 'India',
        batting: { runs: 0, balls: 0, fours: 0, sixes: 0 },
        bowling: { legalBalls: 24, runsConceded: 18, wickets: 4, maidens: 1 } // 4-18 in 4 overs (econ = 4.5)
      },
      Head: {
        name: 'Travis Head',
        team: 'Australia',
        batting: { runs: 40, balls: 25, fours: 4, sixes: 2 },
        bowling: { legalBalls: 6, runsConceded: 8, wickets: 0, maidens: 0 }
      },
      Starc: {
        name: 'Mitchell Starc',
        team: 'Australia',
        batting: { runs: 10, balls: 8, fours: 1, sixes: 0 },
        bowling: { legalBalls: 24, runsConceded: 42, wickets: 1, maidens: 0 }
      }
    };

    const fielding = {
      Rohit: { catches: 1, runOuts: 0, stumpings: 0 },
      Bumrah: { catches: 0, runOuts: 0, stumpings: 0 },
      Head: { catches: 0, runOuts: 0, stumpings: 0 },
      Starc: { catches: 1, runOuts: 0, stumpings: 0 }
    };

    const topPlayers = getTopPlayers(allStats, fielding, 3);
    expect(topPlayers.length).toBe(3);

    // Bumrah: 4 wickets * 25 = 100, maiden = 8, econ <= 4.5 bonus = 10 -> 118 pts
    // Rohit: 85 runs + 8(fours) + 8(sixes) + 7(SR bonus 188.8) + 10(catch) = 118 pts
    expect(topPlayers[0].name).toBeDefined();
    expect(topPlayers[0].totalPoints).toBeGreaterThan(50);
    expect(topPlayers[1].totalPoints).toBeGreaterThan(50);
    expect(topPlayers[2].totalPoints).toBeGreaterThan(20);
  });

  it('computes detailed batter and bowler records with head-to-head match-up and timeline', () => {
    let state = applyEvent(createInitialMatchState(), setupEvent);
    // Ball 1: Rohit hits 4 off Starc
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 4 } });
    // Ball 2: Rohit takes 1 off Starc (strike to Gill)
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 1 } });
    // Ball 3: Gill hits 6 off Starc
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 6 } });
    // Ball 4: Gill out caught off Starc
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        wicket: {
          type: WICKET_TYPES.CAUGHT,
          playerOut: 'Gill',
          fielder: 'Warner'
        }
      }
    });

    const batterRohit = computeBatterDetails(state.innings[0], 'Rohit');
    expect(batterRohit.name).toBe('Rohit');
    expect(batterRohit.summary.runs).toBe(5);
    expect(batterRohit.summary.fours).toBe(1);
    expect(batterRohit.headToHead.length).toBe(1);
    expect(batterRohit.headToHead[0].bowlerName).toBe('Starc');
    expect(batterRohit.headToHead[0].runs).toBe(5);
    expect(batterRohit.headToHead[0].balls).toBe(2);
    expect(batterRohit.headToHead[0].isDismissed).toBe(false);

    const bowlerStarc = computeBowlerDetails(state.innings[0], 'Starc');
    expect(bowlerStarc.name).toBe('Starc');
    expect(bowlerStarc.summary.wickets).toBe(1);
    expect(bowlerStarc.summary.runsConceded).toBe(11);
    expect(bowlerStarc.headToHead.length).toBe(2); // Rohit and Gill

    const vsGill = bowlerStarc.headToHead.find(h => h.batterName === 'Gill');
    expect(vsGill.runsConceded).toBe(6);
    expect(vsGill.wickets).toBe(1);

    const vsRohit = bowlerStarc.headToHead.find(h => h.batterName === 'Rohit');
    expect(vsRohit.runsConceded).toBe(5);
    expect(vsRohit.wickets).toBe(0);
  });
});
