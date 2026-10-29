/**
 * Calculates Player of the Match points and returns top ranked players with breakdown.
 * Formula per plan:
 * - Runs: 1 pt each
 * - Boundaries: +1 for Four, +2 for Six
 * - Strike Rate bonus (min 10 balls faced): up to +10 pts
 * - Wicket: 25 pts each
 * - Maiden over: 8 pts each
 * - Economy bonus (min 12 legal balls bowled): up to +10 pts
 * - Catch / Run-out / Stumping: 10 pts each
 */
export function calculatePlayerPoints(playerStat, fieldingStat = {}) {
  const breakdown = {
    runs: 0,
    boundaries: 0,
    strikeRateBonus: 0,
    wickets: 0,
    maidens: 0,
    economyBonus: 0,
    fielding: 0,
    total: 0
  };

  const batting = playerStat.batting || { runs: 0, balls: 0, fours: 0, sixes: 0 };
  const bowling = playerStat.bowling || { legalBalls: 0, runsConceded: 0, wickets: 0, maidens: 0 };
  const fielding = fieldingStat || { catches: 0, runOuts: 0, stumpings: 0 };

  // 1. Runs
  breakdown.runs = (batting.runs || 0) * 1;

  // 2. Boundary Bonus (+1 for 4, +2 for 6)
  breakdown.boundaries = ((batting.fours || 0) * 1) + ((batting.sixes || 0) * 2);

  // 3. Strike Rate Bonus (Min 10 balls faced)
  if ((batting.balls || 0) >= 10) {
    const sr = (batting.runs / batting.balls) * 100;
    if (sr >= 200) breakdown.strikeRateBonus = 10;
    else if (sr >= 170) breakdown.strikeRateBonus = 7;
    else if (sr >= 140) breakdown.strikeRateBonus = 5;
    else if (sr >= 120) breakdown.strikeRateBonus = 3;
    else if (sr >= 100) breakdown.strikeRateBonus = 1;
    else breakdown.strikeRateBonus = 0;
  }

  // 4. Bowling Wickets (25 pts each)
  breakdown.wickets = (bowling.wickets || 0) * 25;

  // 5. Maiden Overs (8 pts each)
  breakdown.maidens = (bowling.maidens || 0) * 8;

  // 6. Economy Rate Bonus (min 12 legal balls / 2 overs bowled)
  if ((bowling.legalBalls || 0) >= 12) {
    const overs = bowling.legalBalls / 6;
    const econ = bowling.runsConceded / overs;
    if (econ <= 4.5) breakdown.economyBonus = 10;
    else if (econ <= 5.5) breakdown.economyBonus = 8;
    else if (econ <= 6.5) breakdown.economyBonus = 5;
    else if (econ <= 7.5) breakdown.economyBonus = 3;
    else if (econ <= 8.5) breakdown.economyBonus = 1;
    else breakdown.economyBonus = 0;
  }

  // 7. Fielding (10 pts each)
  const catches = fielding.catches || 0;
  const runOuts = fielding.runOuts || 0;
  const stumpings = fielding.stumpings || 0;
  breakdown.fielding = (catches + runOuts + stumpings) * 10;

  // Total
  breakdown.total =
    breakdown.runs +
    breakdown.boundaries +
    breakdown.strikeRateBonus +
    breakdown.wickets +
    breakdown.maidens +
    breakdown.economyBonus +
    breakdown.fielding;

  return breakdown;
}

/**
 * Computes Top N players across both teams from innings stats.
 */
export function getTopPlayers(allPlayerStats = {}, fieldingStats = {}, limit = 3) {
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

  ranked.sort((a, b) => b.totalPoints - a.totalPoints);
  return ranked.slice(0, limit);
}
