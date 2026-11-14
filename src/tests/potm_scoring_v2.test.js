import { describe, it, expect } from 'vitest';
import { calculatePlayerPoints, getTopPlayers } from '../engine/potm.js';

describe('Player of the Match (POTM) Scoring System v2', () => {
  it('Scenario 1: Batter 30 runs off 18 balls, 4 fours, 1 six, not dismissed → total 45', () => {
    // 30 runs + 6 boundary bonus (4*1 + 1*2) + 4 milestone (25+) + 5 strike rate (166.7% >= 140) = 45
    const player = {
      batting: {
        runs: 30,
        balls: 18,
        fours: 4,
        sixes: 1,
        dismissed: false
      }
    };
    const breakdown = calculatePlayerPoints(player);
    expect(breakdown.runs).toBe(30);
    expect(breakdown.boundaries).toBe(6);
    expect(breakdown.milestones).toBe(4);
    expect(breakdown.strikeRateBonus).toBe(5);
    expect(breakdown.total).toBe(45);
  });

  it('Scenario 2: Bowler 2 wickets (not bowled/LBW), 8 dots, 4 overs, 28 runs conceded → total 58', () => {
    // 50 wickets (2*25) + 8 dots (8*1), economy 7.0 gives 0 bonus/penalty = 58
    const player = {
      bowling: {
        wickets: 2,
        bowledLbw: 0,
        dots: 8,
        legalBalls: 24, // 4 overs
        runsConceded: 28,
        maidens: 0,
        wides: 0,
        noBalls: 0
      }
    };
    const breakdown = calculatePlayerPoints(player);
    expect(breakdown.wickets).toBe(50);
    expect(breakdown.dots).toBe(8);
    expect(breakdown.economyBonus).toBe(0);
    expect(breakdown.economyPenalty).toBe(0);
    expect(breakdown.total).toBe(58);
  });

  it('Scenario 3: Batter out for 0 off 3 balls, dismissed: true → total -2', () => {
    const player = {
      batting: {
        runs: 0,
        balls: 3,
        fours: 0,
        sixes: 0,
        dismissed: true
      }
    };
    const breakdown = calculatePlayerPoints(player);
    expect(breakdown.duck).toBe(-2);
    expect(breakdown.total).toBe(-2);
  });

  it('Scenario 4: Batter 12 runs off 10 balls → no strike rate bonus (below 15 runs), no penalty (SR 120) → total 12', () => {
    const player = {
      batting: {
        runs: 12,
        balls: 10,
        fours: 0,
        sixes: 0,
        dismissed: false
      }
    };
    const breakdown = calculatePlayerPoints(player);
    expect(breakdown.runs).toBe(12);
    expect(breakdown.strikeRateBonus).toBe(0);
    expect(breakdown.lowStrikeRate).toBe(0);
    expect(breakdown.total).toBe(12);
  });

  it('Scenario 5: Bowler 2 overs, 26 runs conceded, 0 wickets → economy 13.0 gives -6 penalty → total -6', () => {
    const player = {
      bowling: {
        wickets: 0,
        dots: 0,
        legalBalls: 12, // 2 overs
        runsConceded: 26, // econ = 13.0 >= 12
        maidens: 0,
        wides: 0,
        noBalls: 0
      }
    };
    const breakdown = calculatePlayerPoints(player);
    expect(breakdown.economyPenalty).toBe(-6);
    expect(breakdown.total).toBe(-6);
  });

  it('Scenario 6: Fielder with 3 catches, 1 stumping, 1 direct run-out, 1 indirect run-out → total 58', () => {
    // 3*8 + 1*12 + 1*12 + 1*6 + 4 (3-catch bonus) = 24 + 12 + 12 + 6 + 4 = 58
    const player = {
      batting: { runs: 0, balls: 0 },
      bowling: { legalBalls: 0, runsConceded: 0, wickets: 0 }
    };
    const fielding = {
      catches: 3,
      stumpings: 1,
      runOuts: 2, // 1 direct + 1 indirect
      directRunOuts: 1
    };
    const breakdown = calculatePlayerPoints(player, fielding);
    expect(breakdown.fielding).toBe(54); // 24 + 12 + 12 + 6
    expect(breakdown.catchBonus).toBe(4);
    expect(breakdown.total).toBe(58);
  });

  it('Scenario 7: Tie-break: two players with equal points, one on the winning team → the winning-team player ranks first', () => {
    const allStats = {
      p1: {
        name: 'Player Losing Team',
        team: 'Team Bravo',
        batting: { runs: 30, balls: 20 },
        bowling: { wickets: 1 }
      },
      p2: {
        name: 'Player Winning Team',
        team: 'Team Alpha',
        batting: { runs: 30, balls: 20 },
        bowling: { wickets: 1 }
      }
    };
    const fielding = {};
    const top = getTopPlayers(allStats, fielding, 2, 'Team Alpha');
    expect(top[0].name).toBe('Player Winning Team');
    expect(top[0].team).toBe('Team Alpha');
    expect(top[1].name).toBe('Player Losing Team');
    expect(top[1].team).toBe('Team Bravo');
  });
});
