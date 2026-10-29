import { EXTRA_TYPES } from './constants.js';
import { isBowlerWicket, doesBatterEarnRuns, formatOvers } from './rules.js';

/**
 * Initializes a blank batting entry for a player.
 */
export function createBattingStat(playerName) {
  return {
    name: playerName,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    dots: 0,
    strikeRate: 0,
    isOut: false,
    dismissal: null,
    dismissalType: null,
    bowler: null,
    fielder: null
  };
}

/**
 * Initializes a blank bowling entry for a bowler.
 */
export function createBowlingStat(bowlerName) {
  return {
    name: bowlerName,
    legalBalls: 0,
    overs: '0.0',
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    economy: 0,
    dots: 0,
    wides: 0,
    noBalls: 0,
    currentOverRuns: 0,
    currentOverBalls: 0
  };
}

/**
 * Computes batting, bowling, extras, fall-of-wickets and partnership statistics for an innings.
 */
export function computeInningsStats(inningsData) {
  const batting = {};
  const bowling = {};
  const extras = {
    wides: 0,
    noBalls: 0,
    byes: 0,
    legByes: 0,
    penalty: 0,
    total: 0
  };
  const fow = [];
  const overSummaries = [];

  // Helper to get or create batter stat
  const getBatter = (name) => {
    if (!name) return null;
    if (!batting[name]) batting[name] = createBattingStat(name);
    return batting[name];
  };

  // Helper to get or create bowler stat
  const getBowler = (name) => {
    if (!name) return null;
    if (!bowling[name]) bowling[name] = createBowlingStat(name);
    return bowling[name];
  };

  let currentOver = {
    overIndex: 0,
    bowler: null,
    balls: [],
    runs: 0,
    wickets: 0,
    isMaiden: true
  };

  let partnership = {
    runs: 0,
    balls: 0,
    batter1: null,
    batter2: null,
    b1Runs: 0,
    b2Runs: 0
  };

  const ballHistory = inningsData.balls || [];

  ballHistory.forEach((ball, idx) => {
    const striker = getBatter(ball.striker);
    const nonStriker = getBatter(ball.nonStriker);
    const bowler = getBowler(ball.bowler);

    // Track active partnership members
    if (!partnership.batter1 && ball.striker) partnership.batter1 = ball.striker;
    if (!partnership.batter2 && ball.nonStriker) partnership.batter2 = ball.nonStriker;

    const runs = Number(ball.runs) || 0;
    const extraRuns = Number(ball.extraRuns) || 0;
    const extraType = ball.extraType || null;
    const isWicket = Boolean(ball.isWicket);
    const wicket = ball.wicket || null;

    let ballTotalRuns = runs + extraRuns;

    // 1. Extras Accounting
    if (extraType === EXTRA_TYPES.WIDE) {
      extras.wides += (1 + extraRuns);
      extras.total += (1 + extraRuns);
      if (bowler) {
        bowler.wides += 1;
        bowler.runsConceded += (1 + extraRuns);
      }
      ballTotalRuns = 1 + extraRuns;
    } else if (extraType === EXTRA_TYPES.NO_BALL) {
      extras.noBalls += (1 + extraRuns);
      extras.total += (1 + extraRuns);
      if (bowler) {
        bowler.noBalls += 1;
        bowler.runsConceded += (1 + extraRuns + runs);
      }
      ballTotalRuns = 1 + extraRuns + runs;
    } else if (extraType === EXTRA_TYPES.BYE) {
      extras.byes += extraRuns;
      extras.total += extraRuns;
      ballTotalRuns = extraRuns;
    } else if (extraType === EXTRA_TYPES.LEG_BYE) {
      extras.legByes += extraRuns;
      extras.total += extraRuns;
      ballTotalRuns = extraRuns;
    } else if (extraType === EXTRA_TYPES.PENALTY) {
      extras.penalty += extraRuns;
      extras.total += extraRuns;
      ballTotalRuns = extraRuns;
    } else {
      // Normal ball off the bat
      if (bowler) {
        bowler.runsConceded += runs;
      }
    }

    // 2. Batter Stats
    // Wide does not count as a ball faced by batter
    if (extraType !== EXTRA_TYPES.WIDE && striker) {
      striker.balls += 1;
      if (runs === 0 && !extraType) {
        striker.dots += 1;
      }
    }

    if (doesBatterEarnRuns(extraType) && striker) {
      striker.runs += runs;
      if (runs === 4) striker.fours += 1;
      if (runs === 6) striker.sixes += 1;
    }

    if (striker && striker.balls > 0) {
      striker.strikeRate = Number(((striker.runs / striker.balls) * 100).toFixed(1));
    }

    // 3. Bowler Stats
    const isLegal = extraType !== EXTRA_TYPES.WIDE && extraType !== EXTRA_TYPES.NO_BALL;
    if (isLegal && bowler) {
      bowler.legalBalls += 1;
      if (ballTotalRuns === 0) bowler.dots += 1;
      bowler.overs = formatOvers(bowler.legalBalls);
    }

    // 4. Wicket
    if (isWicket && wicket) {
      const outPlayer = getBatter(wicket.playerOut);
      if (outPlayer) {
        outPlayer.isOut = true;
        outPlayer.dismissalType = wicket.type;
        outPlayer.bowler = wicket.bowler || ball.bowler;
        outPlayer.fielder = wicket.fielder || null;

        // Dismissal string
        let dismissalText = wicket.type;
        if (wicket.type === 'bowled') dismissalText = `b ${ball.bowler}`;
        else if (wicket.type === 'caught') dismissalText = `c ${wicket.fielder || 'sub'} b ${ball.bowler}`;
        else if (wicket.type === 'lbw') dismissalText = `lbw b ${ball.bowler}`;
        else if (wicket.type === 'stumped') dismissalText = `st ${wicket.fielder || 'wk'} b ${ball.bowler}`;
        else if (wicket.type === 'hit_wicket') dismissalText = `hit wicket b ${ball.bowler}`;
        else if (wicket.type === 'run_out') dismissalText = `run out (${wicket.fielder || 'direct'})`;
        else if (wicket.type === 'retired_hurt') dismissalText = 'retired hurt';
        else if (wicket.type === 'retired_out') dismissalText = 'retired out';

        outPlayer.dismissal = dismissalText;
      }

      if (isBowlerWicket(wicket.type) && bowler) {
        bowler.wickets += 1;
      }

      // Record Fall of Wicket
      fow.push({
        wicketNumber: fow.length + 1,
        score: ball.scoreAtBall || (inningsData.totalRunsSoFar || 0),
        overs: formatOvers(ball.legalBallsSoFar || 0),
        playerOut: wicket.playerOut,
        dismissal: outPlayer ? outPlayer.dismissal : wicket.type
      });

      // Reset partnership for new batter
      partnership = {
        runs: 0,
        balls: 0,
        batter1: wicket.playerOut === ball.striker ? ball.nextBatter : ball.striker,
        batter2: wicket.playerOut === ball.nonStriker ? ball.nextBatter : ball.nonStriker,
        b1Runs: 0,
        b2Runs: 0
      };
    } else {
      // Add to partnership
      partnership.runs += ballTotalRuns;
      if (isLegal) partnership.balls += 1;
      if (ball.striker === partnership.batter1) partnership.b1Runs += runs;
      if (ball.striker === partnership.batter2) partnership.b2Runs += runs;
    }

    // 5. Over Summaries tracking
    if (isLegal) {
      currentOver.balls.push(ball.shortLabel || (runs + (extraType ? ` (${extraType})` : '')));
      currentOver.runs += ballTotalRuns;
      if (ballTotalRuns > 0) currentOver.isMaiden = false;
      if (isWicket) currentOver.wickets += 1;

      if (currentOver.balls.length === 6) {
        // Over completed
        if (currentOver.isMaiden && bowler) {
          bowler.maidens += 1;
        }
        overSummaries.push({
          overIndex: overSummaries.length + 1,
          bowler: ball.bowler,
          runs: currentOver.runs,
          wickets: currentOver.wickets,
          isMaiden: currentOver.isMaiden,
          balls: [...currentOver.balls]
        });
        currentOver = {
          overIndex: overSummaries.length + 1,
          bowler: null,
          balls: [],
          runs: 0,
          wickets: 0,
          isMaiden: true
        };
      }
    } else {
      currentOver.balls.push(ball.shortLabel || (extraType ? `1${extraType[0].toUpperCase()}` : 'Ex'));
      currentOver.runs += ballTotalRuns;
      if (ballTotalRuns > 0) currentOver.isMaiden = false;
    }

    if (bowler && bowler.legalBalls > 0) {
      const oversVal = bowler.legalBalls / 6;
      bowler.economy = Number((bowler.runsConceded / oversVal).toFixed(2));
    }
  });

  return {
    batting,
    bowling,
    extras,
    fow,
    partnership,
    overSummaries
  };
}

/**
 * Calculates the score and wickets of an innings up to a specified number of legal balls.
 * Used for comparative score ("score of previous team batting at that point").
 */
export function getScoreAtLegalBalls(innings, targetLegalBalls) {
  if (!innings || !innings.balls || targetLegalBalls <= 0) {
    return { score: 0, wickets: 0, overs: '0.0' };
  }
  let legalCount = 0;
  let score = 0;
  let wickets = 0;

  for (const b of innings.balls) {
    score = b.scoreAtBall || (score + (b.runs || 0) + (b.extraRuns || 0));
    if (b.isWicket) wickets++;
    if (b.isLegal) {
      legalCount++;
      if (legalCount >= targetLegalBalls) {
        return {
          score,
          wickets,
          overs: formatOvers(targetLegalBalls)
        };
      }
    }
  }

  return {
    score: innings.score || score,
    wickets: innings.wickets || wickets,
    overs: formatOvers(innings.legalBalls || legalCount)
  };
}

/**
 * Computes deep career/innings breakdown for a batter:
 * - Head-to-head match-up against every bowler faced (runs, balls, SR, dismissals)
 * - Complete chronological ball-by-ball timeline
 * - Scoring distribution (dots, 1s, 2s, 3s, 4s, 6s, boundary %, dot %)
 */
export function computeBatterDetails(innings, batterName) {
  if (!batterName) return null;
  const innStats = computeInningsStats(innings || {});
  const batterSummary = innStats.batting[batterName] || createBattingStat(batterName);

  const headToHead = {};
  const timeline = [];
  let cumulativeRuns = 0;
  let singles = 0;
  let twos = 0;
  let threes = 0;
  let dotCount = 0;

  const balls = (innings && innings.balls) ? innings.balls : [];

  balls.forEach((b, idx) => {
    if (b.striker === batterName) {
      const runsOffBat = b.runs || 0;
      const bowler = b.bowler || 'Unknown';

      if (!headToHead[bowler]) {
        headToHead[bowler] = {
          bowlerName: bowler,
          runs: 0,
          balls: 0,
          dots: 0,
          fours: 0,
          sixes: 0,
          isDismissed: false,
          dismissalType: null,
          strikeRate: 0
        };
      }

      if (b.isLegal) {
        headToHead[bowler].balls += 1;
      }
      headToHead[bowler].runs += runsOffBat;

      if (runsOffBat === 0 && !b.extraType) {
        headToHead[bowler].dots += 1;
        dotCount++;
      } else if (runsOffBat === 1) {
        singles++;
      } else if (runsOffBat === 2) {
        twos++;
      } else if (runsOffBat === 3) {
        threes++;
      } else if (runsOffBat === 4) {
        headToHead[bowler].fours += 1;
      } else if (runsOffBat === 6) {
        headToHead[bowler].sixes += 1;
      }

      if (b.isWicket && b.dismissedPlayer === batterName) {
        headToHead[bowler].isDismissed = true;
        headToHead[bowler].dismissalType = b.wicketType || 'out';
      }

      if (headToHead[bowler].balls > 0) {
        headToHead[bowler].strikeRate = Number(((headToHead[bowler].runs / headToHead[bowler].balls) * 100).toFixed(1));
      }

      cumulativeRuns += runsOffBat;

      timeline.push({
        deliveryIndex: idx + 1,
        ballInOver: b.legalBallNumber ? `${Math.floor((b.legalBallNumber - 1) / 6)}.${((b.legalBallNumber - 1) % 6) + 1}` : `${timeline.length + 1}`,
        bowler,
        runs: runsOffBat,
        cumulativeRuns,
        extraType: b.extraType,
        shortLabel: b.shortLabel || (b.isWicket ? 'W' : `${runsOffBat}`),
        isWicket: b.isWicket && b.dismissedPlayer === batterName,
        isFour: runsOffBat === 4,
        isSix: runsOffBat === 6,
        isDot: runsOffBat === 0 && !b.extraType
      });
    }
  });

  const totalRuns = batterSummary.runs || 0;
  const totalBalls = batterSummary.balls || 0;
  const boundaryRuns = ((batterSummary.fours || 0) * 4) + ((batterSummary.sixes || 0) * 6);
  const boundaryPct = totalRuns > 0 ? Number(((boundaryRuns / totalRuns) * 100).toFixed(1)) : 0;
  const dotPct = totalBalls > 0 ? Number(((dotCount / totalBalls) * 100).toFixed(1)) : 0;

  return {
    name: batterName,
    summary: {
      ...batterSummary,
      singles,
      twos,
      threes,
      dotCount,
      boundaryRuns,
      boundaryPercentage: boundaryPct,
      dotBallPercentage: dotPct
    },
    headToHead: Object.values(headToHead),
    timeline
  };
}
