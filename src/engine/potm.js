export const POINTING_CRITERIA = [
  { item: 'Run Scored (Batter)', points: '+1 pt', desc: 'Every run scored off the bat' },
  { item: 'Boundary Four', points: '+1 bonus (+5 pts)', desc: '4 runs + 1 boundary bonus' },
  { item: 'Boundary Six', points: '+2 bonus (+8 pts)', desc: '6 runs + 2 boundary bonus' },
  { item: 'Batting Milestone', points: '+4 / +8 / +16', desc: 'Highest reached only: 25 / 50 / 100 runs' },
  { item: 'Duck (Batter)', points: '-2 pts', desc: 'Dismissed without scoring' },
  { item: 'Strike Rate Bonus (Batter)', points: 'Up to +10 pts', desc: 'Min 10 balls and 15 runs. SR ≥ 200: +10, ≥ 170: +7, ≥ 140: +5' },
  { item: 'Low Strike Rate (Batter)', points: '-3 pts', desc: 'Min 10 balls. SR < 80' },
  { item: 'Dot Ball (Bowler)', points: '+1 pt', desc: 'Each legal dot ball bowled' },
  { item: 'Wicket (Bowler)', points: '+25 pts', desc: 'Bowled, caught, LBW, stumped, hit-wicket' },
  { item: 'Bowled / LBW Bonus', points: '+6 pts', desc: 'Extra for a bowler-only dismissal' },
  { item: 'Maiden Over (Bowler)', points: '+6 pts', desc: '6 legal balls with zero runs conceded' },
  { item: 'Wicket Haul (Bowler)', points: '+8 / +12 / +16', desc: '3 / 4 / 5 wickets' },
  { item: 'Economy Bonus (Bowler)', points: 'Up to +10 pts', desc: 'Min 2 overs. Econ ≤ 4.5: +10, ≤ 5.5: +8, ≤ 6.5: +5' },
  { item: 'Economy Penalty (Bowler)', points: 'Up to -6 pts', desc: 'Min 2 overs. Econ ≥ 10: -4, ≥ 12: -6' },
  { item: 'Wide / No Ball (Bowler)', points: '-1 pt', desc: 'Each extra bowled' },
  { item: 'Catch', points: '+8 pts', desc: 'Fielding catch taken' },
  { item: 'Stumping / Direct Run-out', points: '+12 pts', desc: 'Harder fielding dismissals' },
  { item: 'Indirect Run-out', points: '+6 pts', desc: 'Involved in a run-out' },
  { item: '3-Catch Bonus', points: '+4 pts', desc: 'Three catches in one match' }
];

/**
 * Single source of truth for the scoring values used in the calculation.
 * If you change a number here, also update the matching text in POINTING_CRITERIA above.
 */
export const SCORING = {
  run: 1,
  four: 1, // bonus on top of the 4 runs already counted
  six: 2, // bonus on top of the 6 runs already counted
  milestones: [
    { runs: 100, points: 16 },
    { runs: 50, points: 8 },
    { runs: 25, points: 4 }
  ],
  duck: -2,
  strikeRate: {
    minBalls: 10,
    minRuns: 15,
    tiers: [
      { sr: 200, points: 10 },
      { sr: 170, points: 7 },
      { sr: 140, points: 5 }
    ],
    lowSr: 80,
    lowSrPenalty: -3
  },
  dot: 1,
  wicket: 25,
  bowledLbwBonus: 6,
  maiden: 6,
  hauls: [
    { wickets: 5, points: 16 },
    { wickets: 4, points: 12 },
    { wickets: 3, points: 8 }
  ],
  economy: {
    minBalls: 12, // 2 overs
    bonusTiers: [
      { econ: 4.5, points: 10 },
      { econ: 5.5, points: 8 },
      { econ: 6.5, points: 5 }
    ],
    penaltyTiers: [
      { econ: 12, points: -6 },
      { econ: 10, points: -4 }
    ]
  },
  extra: -1, // per wide or no ball
  catch: 8,
  stumping: 12,
  directRunOut: 12,
  indirectRunOut: 6,
  catchBonusAt: 3,
  catchBonus: 4
};

const num = (v) => Number(v) || 0;

/**
 * Formula:
 * - Runs: 1 pt each, boundary bonus +1 (four) / +2 (six)
 * - Milestone (highest only): 25 = +4, 50 = +8, 100 = +16
 * - Duck: -2
 * - Strike rate bonus (min 10 balls and 15 runs): up to +10
 * - Low strike rate (min 10 balls, SR < 80): -3
 * - Wicket: 25 each, +6 extra for bowled / LBW
 * - Dot ball: 1 each, maiden over: 6 each
 * - Wicket haul: 3 = +8, 4 = +12, 5+ = +16
 * - Economy bonus (min 12 legal balls): up to +10, penalty down to -6
 * - Wide / no ball: -1 each
 * - Fielding: catch 8, stumping 12, direct run-out 12, indirect run-out 6, 3-catch bonus +4
 *
 * Optional fields (default to 0 / false when missing, so existing data still works):
 * - batting.dismissed (boolean): needed for the duck penalty
 * - bowling.bowledLbw: number of wickets that were bowled or LBW
 * - bowling.wides, bowling.noBalls
 * - fielding.directRunOuts: how many of fielding.runOuts were direct hits.
 *   Any run-out not marked direct counts as indirect.
 */
export function calculatePlayerPoints(playerStat, fieldingStat = {}) {
  const breakdown = {
    runs: 0,
    boundaries: 0,
    milestones: 0,
    duck: 0,
    strikeRateBonus: 0,
    lowStrikeRate: 0,
    wickets: 0,
    bowledLbwBonus: 0,
    maidens: 0,
    dots: 0,
    wicketHaul: 0,
    economyBonus: 0,
    economyPenalty: 0,
    extras: 0,
    fielding: 0,
    catchBonus: 0,
    total: 0
  };

  const batting = playerStat.batting || { runs: 0, balls: 0, fours: 0, sixes: 0 };
  const bowling = playerStat.bowling || { legalBalls: 0, runsConceded: 0, wickets: 0, maidens: 0, dots: 0 };
  const fielding = fieldingStat || { catches: 0, runOuts: 0, stumpings: 0 };

  const runs = num(batting.runs);
  const balls = num(batting.balls);

  // 1. Runs
  breakdown.runs = runs * SCORING.run;

  // 2. Boundary bonus
  breakdown.boundaries = num(batting.fours) * SCORING.four + num(batting.sixes) * SCORING.six;

  // 3. Milestone (highest reached only)
  const milestone = SCORING.milestones.find((m) => runs >= m.runs);
  breakdown.milestones = milestone ? milestone.points : 0;

  // 4. Duck
  if (batting.dismissed && runs === 0) {
    breakdown.duck = SCORING.duck;
  }

  // 5. Strike rate bonus / penalty
  if (balls >= SCORING.strikeRate.minBalls) {
    const sr = (runs / balls) * 100;
    if (runs >= SCORING.strikeRate.minRuns) {
      const tier = SCORING.strikeRate.tiers.find((t) => sr >= t.sr);
      breakdown.strikeRateBonus = tier ? tier.points : 0;
    }
    if (sr < SCORING.strikeRate.lowSr) {
      breakdown.lowStrikeRate = SCORING.strikeRate.lowSrPenalty;
    }
  }

  // 6. Wickets and bowled / LBW bonus
  const wickets = num(bowling.wickets);
  breakdown.wickets = wickets * SCORING.wicket;
  breakdown.bowledLbwBonus = num(bowling.bowledLbw) * SCORING.bowledLbwBonus;

  // 7. Maidens and dots
  breakdown.maidens = num(bowling.maidens) * SCORING.maiden;
  breakdown.dots = num(bowling.dots) * SCORING.dot;

  // 8. Wicket haul (highest reached only)
  const haul = SCORING.hauls.find((h) => wickets >= h.wickets);
  breakdown.wicketHaul = haul ? haul.points : 0;

  // 9. Economy bonus / penalty
  const legalBalls = num(bowling.legalBalls);
  if (legalBalls >= SCORING.economy.minBalls) {
    const overs = legalBalls / 6;
    const econ = num(bowling.runsConceded) / overs;
    const bonus = SCORING.economy.bonusTiers.find((t) => econ <= t.econ);
    const penalty = SCORING.economy.penaltyTiers.find((t) => econ >= t.econ);
    breakdown.economyBonus = bonus ? bonus.points : 0;
    breakdown.economyPenalty = penalty ? penalty.points : 0;
  }

  // 10. Wides and no balls (Bug 33: counts all extras conceded by the bowler)
  const extrasCount = num(bowling.extrasConceded) || (num(bowling.wides) + num(bowling.noBalls));
  breakdown.extras = extrasCount > 0 ? extrasCount * SCORING.extra : 0;

  // 11. Fielding
  const catches = num(fielding.catches);
  const stumpings = num(fielding.stumpings);
  const runOuts = num(fielding.runOuts);
  const directRunOuts = Math.min(num(fielding.directRunOuts), runOuts);
  const indirectRunOuts = runOuts - directRunOuts;

  breakdown.fielding =
    catches * SCORING.catch +
    stumpings * SCORING.stumping +
    directRunOuts * SCORING.directRunOut +
    indirectRunOuts * SCORING.indirectRunOut;

  if (catches >= SCORING.catchBonusAt) {
    breakdown.catchBonus = SCORING.catchBonus;
  }

  // Total
  breakdown.total =
    breakdown.runs +
    breakdown.boundaries +
    breakdown.milestones +
    breakdown.duck +
    breakdown.strikeRateBonus +
    breakdown.lowStrikeRate +
    breakdown.wickets +
    breakdown.bowledLbwBonus +
    breakdown.maidens +
    breakdown.dots +
    breakdown.wicketHaul +
    breakdown.economyBonus +
    breakdown.economyPenalty +
    breakdown.extras +
    breakdown.fielding +
    breakdown.catchBonus;

  return breakdown;
}

/**
 * Computes Top N players across both teams from innings stats.
 * Pass winningTeam (team name or id) to favour the winning side when points are tied.
 */
export function getTopPlayers(allPlayerStats = {}, fieldingStats = {}, limit = 3, winningTeam = null) {
  const ranked = Object.entries(allPlayerStats).map(([playerId, stat]) => {
    const fielding = fieldingStats[playerId] || { catches: 0, runOuts: 0, stumpings: 0 };
    const breakdown = calculatePlayerPoints(stat, fielding);
    return {
      playerId,
      name: stat.name || playerId,
      team: stat.team || '',
      breakdown,
      totalPoints: breakdown.total,
      batting: stat.batting,
      bowling: stat.bowling,
      fielding
    };
  });

  ranked.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    // Tie-break 1: Player from the winning team
    if (winningTeam) {
      const aWin = a.team === winningTeam ? 1 : 0;
      const bWin = b.team === winningTeam ? 1 : 0;
      if (aWin !== bWin) return bWin - aWin;
    }
    // Tie-break 2: Most wickets taken
    const wDiff = num(b.bowling?.wickets) - num(a.bowling?.wickets);
    if (wDiff !== 0) return wDiff;
    // Tie-break 3: Most runs scored
    const rDiff = num(b.batting?.runs) - num(a.batting?.runs);
    if (rDiff !== 0) return rDiff;
    // Tie-break 4: Fewer runs conceded (only for players who bowled)
    const aBowled = num(a.bowling?.legalBalls) > 0;
    const bBowled = num(b.bowling?.legalBalls) > 0;
    if (aBowled && bBowled) {
      const cDiff = num(a.bowling.runsConceded) - num(b.bowling.runsConceded);
      if (cDiff !== 0) return cDiff;
    }
    // Tie-break 5: Name alphabetical
    return (a.name || '').localeCompare(b.name || '');
  });
  return ranked.slice(0, limit);
}

export const POTM_BREAKDOWN_CONFIG = [
  { key: 'runs', label: 'Runs' },
  { key: 'boundaries', label: 'Boundaries' },
  { key: 'milestones', label: 'Milestone' },
  { key: 'duck', label: 'Duck' },
  { key: 'strikeRateBonus', label: 'SR Bonus' },
  { key: 'lowStrikeRate', label: 'Low SR' },
  { key: 'wickets', label: 'Wickets' },
  { key: 'bowledLbwBonus', label: 'Bowled/LBW' },
  { key: 'maidens', label: 'Maidens' },
  { key: 'dots', label: 'Dots' },
  { key: 'wicketHaul', label: 'Haul Bonus' },
  { key: 'economyBonus', label: 'Econ Bonus' },
  { key: 'economyPenalty', label: 'Econ Penalty' },
  { key: 'extras', label: 'Extras' },
  { key: 'fielding', label: 'Fielding' },
  { key: 'catchBonus', label: '3-Catch Bonus' }
];

export function getVisibleBreakdownItems(breakdown = {}) {
  if (!breakdown) return [];
  return POTM_BREAKDOWN_CONFIG
    .map(({ key, label }) => {
      const val = Number(breakdown[key]) || 0;
      return { key, label, val };
    })
    .filter(item => item.val !== 0);
}
