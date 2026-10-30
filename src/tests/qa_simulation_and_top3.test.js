import { describe, it, expect } from 'vitest';
import { applyEvent, createInitialMatchState, replayEvents } from '../engine/reducer.js';
import { EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES } from '../engine/constants.js';
import { computeInningsStats } from '../engine/stats.js';
import { calculatePlayerPoints, getTopPlayers } from '../engine/potm.js';

describe('QA Scope 7: Top 3 Players Hand Math & Tie Breaks', () => {
  it('Calculates hand-calculated player points exactly matching official formula', () => {
    // Batter: 45 runs off 20 balls (3 fours, 2 sixes)
    // Runs: 45 pts
    // Boundaries: (3 * 1) + (2 * 2) = 7 pts
    // SR = 225% (>= 200%) -> 10 pts
    // Bowler: 18 legal balls (3.0 overs), 12 runs, 2 wickets, 1 maiden
    // Wickets: 2 * 25 = 50 pts
    // Maidens: 1 * 8 = 8 pts
    // Economy = 12 / 3 = 4.0 (<= 4.5) -> 10 pts
    // Fielding: 1 catch + 1 run-out -> 20 pts
    // Expected Total: 45 + 7 + 10 + 50 + 8 + 10 + 20 = 150 pts

    const playerStat = {
      name: 'AllRounder Star',
      team: 'Alpha',
      batting: { runs: 45, balls: 20, fours: 3, sixes: 2 },
      bowling: { legalBalls: 18, runsConceded: 12, wickets: 2, maidens: 1 }
    };
    const fieldingStat = { catches: 1, runOuts: 1, stumpings: 0 };

    const pts = calculatePlayerPoints(playerStat, fieldingStat);
    expect(pts.runs).toBe(45);
    expect(pts.boundaries).toBe(7);
    expect(pts.strikeRateBonus).toBe(10);
    expect(pts.wickets).toBe(50);
    expect(pts.maidens).toBe(8);
    expect(pts.economyBonus).toBe(10);
    expect(pts.fielding).toBe(20);
    expect(pts.total).toBe(150);
  });

  it('Resolves tie-breaks correctly when two players have identical points', () => {
    const p1 = {
      name: 'Player Bowler',
      team: 'Alpha',
      batting: { runs: 0, balls: 0, fours: 0, sixes: 0 },
      bowling: { legalBalls: 12, runsConceded: 10, wickets: 2, maidens: 0 } // 2 wickets = 50 pts
    };
    const p2 = {
      name: 'Player Batter',
      team: 'Bravo',
      batting: { runs: 50, balls: 30, fours: 0, sixes: 0 }, // 50 runs = 50 pts
      bowling: { legalBalls: 0, runsConceded: 0, wickets: 0, maidens: 0 }
    };

    const allStats = { p1, p2 };
    const ranked = getTopPlayers(allStats, {}, 2);

    // Bowler with more wickets (2 vs 0) wins the tie-break
    expect(ranked[0].name).toBe('Player Bowler');
    expect(ranked[1].name).toBe('Player Batter');
  });

  it('Allows losing team player with highest points to win Player of the Match', () => {
    const losingStar = {
      name: 'Losing Star',
      team: 'Bravo (Loser)',
      batting: { runs: 85, balls: 40, fours: 6, sixes: 4 }, // 85 + 14 + 10 = 109 pts
      bowling: { legalBalls: 0, runsConceded: 0, wickets: 0, maidens: 0 }
    };
    const winningPlayer = {
      name: 'Winning Steady',
      team: 'Alpha (Winner)',
      batting: { runs: 20, balls: 15, fours: 2, sixes: 0 }, // 20 + 2 = 22 pts
      bowling: { legalBalls: 0, runsConceded: 0, wickets: 0, maidens: 0 }
    };

    const ranked = getTopPlayers({ losingStar, winningPlayer }, {}, 2);
    expect(ranked[0].name).toBe('Losing Star');
    expect(ranked[0].totalPoints).toBeGreaterThan(ranked[1].totalPoints);
  });
});

describe('QA Scope 5 & Robustness: 100+ Randomized Matches Simulation & Invariants', () => {
  it('Executes 100 fully randomized simulated matches maintaining all mathematical invariants', () => {
    const possibleExtraTypes = [null, null, null, null, null, EXTRA_TYPES.WIDE, EXTRA_TYPES.NO_BALL, EXTRA_TYPES.BYE, EXTRA_TYPES.LEG_BYE];
    const possibleRuns = [0, 1, 2, 3, 4, 6];

    for (let sim = 0; sim < 100; sim++) {
      const playersPerTeam = 5 + (sim % 7); // 5 to 11 players
      const overs = 2 + (sim % 4); // 2 to 5 overs
      const teamAPlayers = Array.from({ length: playersPerTeam }, (_, i) => `A${i + 1}`);
      const teamBPlayers = Array.from({ length: playersPerTeam }, (_, i) => `B${i + 1}`);

      let state = createInitialMatchState();
      state = applyEvent(state, {
        type: EVENT_TYPES.MATCH_INIT,
        payload: {
          matchId: `sim_${sim}`,
          code: `SIM${sim}`,
          teams: [
            { id: 't1', name: 'TeamA', players: teamAPlayers },
            { id: 't2', name: 'TeamB', players: teamBPlayers }
          ],
          overs,
          playersPerTeam,
          toss: { winner: 'TeamA', decision: 'bat' },
          striker: teamAPlayers[0],
          nonStriker: teamAPlayers[1],
          bowler: teamBPlayers[0]
        }
      });

      // Simulate match loop
      let stepCount = 0;
      const maxSteps = 250;

      while (state.status !== MATCH_STATUS.COMPLETED && stepCount < maxSteps) {
        stepCount++;

        // Innings break transition
        if (state.status === MATCH_STATUS.INNINGS_BREAK) {
          state = applyEvent(state, {
            type: EVENT_TYPES.END_INNINGS,
            payload: {
              striker: teamBPlayers[0],
              nonStriker: teamBPlayers[1],
              bowler: teamAPlayers[0]
            }
          });
          continue;
        }

        // Needs new bowler
        if (state.needsBowlerChange) {
          const curInn = state.innings[state.currentInningsIndex];
          const bowlingSquad = curInn.bowlingTeam === 'TeamA' ? teamAPlayers : teamBPlayers;
          const eligibleBowlers = bowlingSquad.filter(p => p !== state.previousBowler);
          const nextBowler = eligibleBowlers[Math.floor(Math.random() * eligibleBowlers.length)] || bowlingSquad[0];

          state = applyEvent(state, {
            type: EVENT_TYPES.CHANGE_BOWLER,
            payload: { bowler: nextBowler }
          });
          continue;
        }

        // Needs new batter
        if (state.needsNewBatter) {
          const curInn = state.innings[state.currentInningsIndex];
          const battingSquad = curInn.battingTeam === 'TeamA' ? teamAPlayers : teamBPlayers;
          const usedBatters = new Set();
          curInn.balls.forEach(b => {
            if (b.striker) usedBatters.add(b.striker);
            if (b.nonStriker) usedBatters.add(b.nonStriker);
          });
          const availableBatters = battingSquad.filter(p => !usedBatters.has(p));
          const nextBatter = availableBatters[0] || `Sub_${stepCount}`;

          state = applyEvent(state, {
            type: EVENT_TYPES.NEW_BATTER,
            payload: { batter: nextBatter }
          });
          continue;
        }

        // Random ball event
        const extraType = possibleExtraTypes[Math.floor(Math.random() * possibleExtraTypes.length)];
        const runs = possibleRuns[Math.floor(Math.random() * possibleRuns.length)];
        const extraRuns = (extraType === EXTRA_TYPES.BYE || extraType === EXTRA_TYPES.LEG_BYE) ? 1 : 0;
        const isWicket = (Math.random() < 0.12); // ~12% chance of wicket
        const wicketType = isWicket ? WICKET_TYPES.BOWLED : null;

        state = applyEvent(state, {
          type: EVENT_TYPES.BALL,
          payload: {
            runs: extraType === EXTRA_TYPES.WIDE ? 0 : runs,
            extraType,
            extraRuns,
            isWicket,
            wicket: isWicket ? { type: wicketType, playerOut: state.striker } : null
          }
        });
      }

      // Check INVARIANTS for each innings of the simulated match:
      state.innings.forEach((inn, innIdx) => {
        if (!inn.balls || inn.balls.length === 0) return;

        const stats = computeInningsStats(inn);

        // Invariant 1: Total Batting Runs + Extras === Innings Score
        let totalBattingRuns = 0;
        Object.values(stats.batting).forEach(b => {
          totalBattingRuns += b.runs;
          expect(b.runs).toBeGreaterThanOrEqual(0);
          expect(b.balls).toBeGreaterThanOrEqual(0);
          expect(Number.isNaN(b.strikeRate)).toBe(false);
        });

        const expectedScore = totalBattingRuns + stats.extras.total;
        expect(inn.score).toBe(expectedScore);

        // Invariant 2: Legal balls counted === sum of isLegal deliveries
        const legalBallCount = inn.balls.filter(b => b.isLegal).length;
        expect(inn.legalBalls).toBe(legalBallCount);

        // Invariant 3: Wickets never exceed playersPerTeam - 1
        expect(inn.wickets).toBeLessThanOrEqual(playersPerTeam - 1);

        // Invariant 4: Bowler overs formatting and stats validity
        Object.values(stats.bowling).forEach(bw => {
          expect(bw.legalBalls).toBeGreaterThanOrEqual(0);
          expect(bw.runsConceded).toBeGreaterThanOrEqual(0);
          expect(Number.isNaN(bw.economy)).toBe(false);
        });
      });

      // Invariant 5: Complete Deterministic Replay from events array
      const replayedState = replayEvents(state.events);
      expect(replayedState.innings[0].score).toBe(state.innings[0].score);
      expect(replayedState.innings[0].wickets).toBe(state.innings[0].wickets);
      expect(replayedState.innings[0].legalBalls).toBe(state.innings[0].legalBalls);
      if (state.innings[1]) {
        expect(replayedState.innings[1].score).toBe(state.innings[1].score);
        expect(replayedState.innings[1].wickets).toBe(state.innings[1].wickets);
      }
      expect(replayedState.status).toBe(state.status);
    }
  });
});
