import { EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES } from './constants.js';
import { isLegalDelivery, doesBatterEarnRuns, isWicketValidOnFreeHit, isWicketValidOnNoBall, isWicketValidOnWide, getMaxWickets, formatOvers } from './rules.js';
import { computeInningsStats } from './stats.js';

/**
 * Creates the initial empty state for a match.
 */
export function createInitialMatchState() {
  return {
    matchId: null,
    code: null,
    teams: [],
    overs: 20,
    playersPerTeam: 11,
    toss: null, // { winner: string, decision: 'bat' | 'bowl' }
    status: MATCH_STATUS.SETUP,
    currentInningsIndex: 0,
    innings: [],
    striker: null,
    nonStriker: null,
    currentBowler: null,
    previousBowler: null,
    isFreeHit: false,
    isOverComplete: false,
    needsBowlerChange: false,
    needsNewBatter: false,
    vacantBatterSlot: null, // 'striker' | 'nonStriker'
    target: null,
    winner: null,
    resultSummary: null,
    events: [],
    lastBallSummary: null
  };
}

/**
 * Helper to initialize an innings structure.
 */
function createInningsState(inningsNumber, battingTeam, bowlingTeam, maxOvers) {
  return {
    inningsNumber,
    battingTeam,
    bowlingTeam,
    maxOvers,
    score: 0,
    wickets: 0,
    legalBalls: 0,
    balls: [],
    isCompleted: false,
    completedReason: null
  };
}

/**
 * Check if innings has ended (either all-out, overs completed, or target chased).
 */
function checkInningsEnd(state) {
  const currentInnings = state.innings[state.currentInningsIndex];
  if (!currentInnings || currentInnings.isCompleted) return state;

  const maxWickets = getMaxWickets(state.playersPerTeam);
  const maxBalls = state.overs * 6;

  let ended = false;
  let reason = null;

  // 1. All out
  if (currentInnings.wickets >= maxWickets) {
    ended = true;
    reason = 'All out';
  }
  // 2. Overs completed
  else if (currentInnings.legalBalls >= maxBalls) {
    ended = true;
    reason = 'Overs completed';
  }
  // 3. 2nd innings target reached
  else if (state.currentInningsIndex === 1 && state.target && currentInnings.score >= state.target) {
    ended = true;
    reason = 'Target chased';
  }

  if (ended) {
    currentInnings.isCompleted = true;
    currentInnings.completedReason = reason;

    if (state.currentInningsIndex === 0) {
      // Innings 1 ended
      state.status = MATCH_STATUS.INNINGS_BREAK;
      state.target = currentInnings.score + 1;
    } else {
      // Innings 2 ended -> Match finished
      state.status = MATCH_STATUS.COMPLETED;
      const inn1 = state.innings[0];
      const inn2 = currentInnings;

      if (inn2.score >= state.target) {
        const wicketsRemaining = maxWickets - inn2.wickets;
        state.winner = inn2.battingTeam;
        state.resultSummary = `${inn2.battingTeam} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`;
      } else if (inn2.score === inn1.score) {
        state.winner = 'Tie';
        state.resultSummary = 'Match tied';
      } else {
        const runsDiff = inn1.score - inn2.score;
        state.winner = inn1.battingTeam;
        state.resultSummary = `${inn1.battingTeam} won by ${runsDiff} run${runsDiff === 1 ? '' : 's'}`;
      }
    }
  }

  return state;
}

/**
 * Pure reducer that applies a single event to a match state.
 */
export function applyEvent(state, event) {
  if (!event || !event.type) return state;

  // Clone state shallowly (with array/innings copies)
  const next = {
    ...state,
    innings: state.innings.map(inn => ({
      ...inn,
      balls: [...inn.balls]
    })),
    events: [...(state.events || [])]
  };

  switch (event.type) {
    case EVENT_TYPES.MATCH_INIT: {
      const {
        matchId,
        code,
        teams,
        overs = 20,
        playersPerTeam = 11,
        toss,
        striker,
        nonStriker,
        bowler
      } = event.payload;

      next.matchId = matchId || next.matchId;
      next.code = code || next.code;
      next.teams = teams || [];
      next.overs = Number(overs) || 20;
      next.playersPerTeam = Number(playersPerTeam) || 11;
      next.toss = toss || null;

      // Determine batting & bowling teams from toss
      let battingTeam = teams[0]?.name;
      let bowlingTeam = teams[1]?.name;
      if (toss) {
        if (toss.decision === 'bat') {
          battingTeam = toss.winner;
          bowlingTeam = teams.find(t => t.name !== toss.winner)?.name || teams[1]?.name;
        } else {
          bowlingTeam = toss.winner;
          battingTeam = teams.find(t => t.name !== toss.winner)?.name || teams[1]?.name;
        }
      }

      next.currentInningsIndex = 0;
      next.innings = [
        createInningsState(1, battingTeam, bowlingTeam, next.overs),
        createInningsState(2, bowlingTeam, battingTeam, next.overs)
      ];

      next.striker = striker || null;
      next.nonStriker = nonStriker || null;
      next.currentBowler = bowler || null;
      next.previousBowler = null;
      next.isFreeHit = false;
      next.isOverComplete = false;
      next.needsBowlerChange = false;
      next.needsNewBatter = false;
      next.vacantBatterSlot = null;
      next.target = null;
      next.winner = null;
      next.resultSummary = null;
      next.status = MATCH_STATUS.IN_PROGRESS;
      break;
    }

    case EVENT_TYPES.BALL: {
      const curInn = next.innings[next.currentInningsIndex];
      if (!curInn || curInn.isCompleted) return next;

      const {
        runs = 0,
        extraType = null,
        extraRuns = 0,
        isWicket = false,
        wicket = null,
        wicketType = null,
        dismissedPlayer = null,
        fielder = null,
        nextBatter = null
      } = event.payload;

      const isLegal = isLegalDelivery(extraType);
      let calculatedWicket = Boolean(isWicket || wicket || wicketType);

      // Normalize wicket object
      let normalizedWicket = wicket ? { ...wicket } : null;
      if (calculatedWicket && !normalizedWicket) {
        normalizedWicket = {
          type: wicketType || WICKET_TYPES.BOWLED,
          playerOut: dismissedPlayer || event.payload.playerOut || next.striker,
          fielder: fielder || null,
          bowler: next.currentBowler
        };
      }
      if (normalizedWicket && !normalizedWicket.playerOut) {
        normalizedWicket.playerOut = next.striker;
      }
      if (normalizedWicket && !normalizedWicket.bowler) {
        normalizedWicket.bowler = next.currentBowler;
      }

      // Check Free Hit rules: only run-outs / obstructing / hit ball twice / retired are valid on Free Hit
      if (next.isFreeHit && calculatedWicket && normalizedWicket) {
        if (!isWicketValidOnFreeHit(normalizedWicket.type)) {
          calculatedWicket = false; // Disallowed dismissal on free hit
          normalizedWicket = null;
        }
      }

      // Check No-Ball dismissal rules (MCC Law 21.18): only run-out / obstructing / hit ball twice / retired
      if (extraType === EXTRA_TYPES.NO_BALL && calculatedWicket && normalizedWicket) {
        if (!isWicketValidOnNoBall(normalizedWicket.type)) {
          calculatedWicket = false; // Disallowed dismissal off a no-ball
          normalizedWicket = null;
        }
      }

      // Check Wide dismissal rules (MCC Law 22.17): bowled, caught, lbw are strictly disallowed
      if (extraType === EXTRA_TYPES.WIDE && calculatedWicket && normalizedWicket) {
        if (!isWicketValidOnWide(normalizedWicket.type)) {
          calculatedWicket = false; // Disallowed dismissal off a wide
          normalizedWicket = null;
        }
      }

      // Calculate runs added to team score
      let totalBallRuns = 0;
      if (extraType === EXTRA_TYPES.WIDE) {
        totalBallRuns = 1 + extraRuns;
      } else if (extraType === EXTRA_TYPES.NO_BALL) {
        totalBallRuns = 1 + extraRuns + runs;
      } else if (extraType === EXTRA_TYPES.BYE || extraType === EXTRA_TYPES.LEG_BYE || extraType === EXTRA_TYPES.PENALTY) {
        totalBallRuns = extraRuns;
      } else {
        totalBallRuns = runs;
      }

      curInn.score += totalBallRuns;

      if (isLegal) {
        curInn.legalBalls += 1;
      }

      // Record ball details
      const ballRecord = {
        ballId: event.id || `ball_${curInn.balls.length + 1}`,
        seq: event.seq || (next.events.length + 1),
        striker: next.striker,
        nonStriker: next.nonStriker,
        bowler: next.currentBowler,
        runs,
        extraType,
        extraRuns,
        isLegal,
        isWicket: calculatedWicket,
        wicket: calculatedWicket ? normalizedWicket : null,
        scoreAtBall: curInn.score,
        legalBallsSoFar: curInn.legalBalls,
        shortLabel: formatBallLabel(runs, extraType, extraRuns, calculatedWicket, normalizedWicket?.type)
      };
      curInn.balls.push(ballRecord);
      next.lastBallSummary = ballRecord.shortLabel;

      // Strike Rotation & Wickets handling (MCC Law 18.11, 18.12, 21.18, 22.17)
      let curStriker = next.striker;
      let curNonStriker = next.nonStriker;

      // Determine physical runs completed
      let physicalRunsRan = 0;
      if (extraType === EXTRA_TYPES.BYE || extraType === EXTRA_TYPES.LEG_BYE) {
        physicalRunsRan = extraRuns;
      } else if (extraType === EXTRA_TYPES.WIDE) {
        physicalRunsRan = extraRuns; // extra runs run on wide (e.g. overthrows)
      } else {
        physicalRunsRan = runs;
      }

      // If odd physical runs were completed, batters crossed ends
      if (physicalRunsRan % 2 === 1 && curStriker && curNonStriker) {
        const temp = curStriker;
        curStriker = curNonStriker;
        curNonStriker = temp;
      }

      // Handle Wickets
      let batterDismissedSlot = null;
      if (calculatedWicket && normalizedWicket) {
        curInn.wickets += 1;
        const playerOut = normalizedWicket.playerOut || next.striker;
        if (playerOut === curStriker) {
          batterDismissedSlot = 'striker';
        } else if (playerOut === curNonStriker) {
          batterDismissedSlot = 'nonStriker';
        } else if (playerOut === next.striker) {
          batterDismissedSlot = 'striker';
        } else {
          batterDismissedSlot = 'nonStriker';
        }

        const maxWickets = getMaxWickets(next.playersPerTeam);
        if (curInn.wickets < maxWickets) {
          if (nextBatter) {
            if (batterDismissedSlot === 'striker') curStriker = nextBatter;
            else curNonStriker = nextBatter;
            next.needsNewBatter = false;
            next.vacantBatterSlot = null;
          } else {
            next.needsNewBatter = true;
            next.vacantBatterSlot = batterDismissedSlot;
            if (batterDismissedSlot === 'striker') curStriker = null;
            else curNonStriker = null;
          }
        } else {
          // All out
          if (batterDismissedSlot === 'striker') curStriker = null;
          else curNonStriker = null;
          next.needsNewBatter = false;
          next.vacantBatterSlot = null;
        }
      }

      next.striker = curStriker;
      next.nonStriker = curNonStriker;

      // Check Over Completion (6 legal balls in current over)
      if (isLegal && curInn.legalBalls % 6 === 0) {
        next.isOverComplete = true;
        next.needsBowlerChange = true;
        next.previousBowler = next.currentBowler;
        next.currentBowler = null;

        // Change ends at end of over (MCC Law 18.11 / 18.12)
        // Swap slots, preserving whether a slot is occupied or vacant
        const temp = next.striker;
        next.striker = next.nonStriker;
        next.nonStriker = temp;

        if (next.vacantBatterSlot === 'striker') {
          next.vacantBatterSlot = 'nonStriker';
        } else if (next.vacantBatterSlot === 'nonStriker') {
          next.vacantBatterSlot = 'striker';
        }
      } else {
        next.isOverComplete = false;
      }

      // Update Free Hit State
      if (extraType === EXTRA_TYPES.NO_BALL) {
        next.isFreeHit = true;
      } else if (next.isFreeHit) {
        if (isLegal) {
          next.isFreeHit = false;
        }
        // If wide on free hit, free hit remains true
      }

      // Check Innings End conditions
      checkInningsEnd(next);
      break;
    }

    case EVENT_TYPES.SWAP_BATTER: {
      if (next.striker && next.nonStriker) {
        const temp = next.striker;
        next.striker = next.nonStriker;
        next.nonStriker = temp;
      }
      break;
    }

    case EVENT_TYPES.CHANGE_BOWLER: {
      const newBowler = event.payload.bowler;
      const curInn = next.innings[next.currentInningsIndex];
      let bowlingSquadSize = 0;
      if (curInn && next.teams) {
        const bowlingTeam = next.teams.find(t => t.name === curInn.bowlingTeam);
        if (bowlingTeam && bowlingTeam.players) {
          bowlingSquadSize = bowlingTeam.players.length;
        }
      }

      // MCC Law 21.1: Bowler cannot bowl consecutive overs if bowling squad > 1
      if (bowlingSquadSize > 1 && next.previousBowler && newBowler === next.previousBowler && !event.payload.allowConsecutive) {
        return state; // Consecutive overs disallowed
      }

      next.currentBowler = newBowler;
      next.needsBowlerChange = false;
      next.isOverComplete = false;

      // Ensure new bowler is in bowling team's squad list
      if (curInn && newBowler && next.teams) {
        const bowlingTeam = next.teams.find(t => t.name === curInn.bowlingTeam);
        if (bowlingTeam && bowlingTeam.players && !bowlingTeam.players.includes(newBowler)) {
          bowlingTeam.players.push(newBowler);
        }
      }
      break;
    }

    case EVENT_TYPES.NEW_BATTER: {
      const slot = event.payload.slot || next.vacantBatterSlot || 'striker';
      const batterName = event.payload.batter;
      if (slot === 'striker') {
        next.striker = batterName;
      } else {
        next.nonStriker = batterName;
      }
      // If returning from time declare / retired hurt, remove from bench retired list
      if (next.retiredHurtBatters) {
        next.retiredHurtBatters = next.retiredHurtBatters.filter(b => b !== batterName);
      }
      next.needsNewBatter = false;
      next.vacantBatterSlot = null;

      // Ensure new batter is in batting team's squad list
      const curInn = next.innings[next.currentInningsIndex];
      if (curInn && batterName && next.teams) {
        const battingTeam = next.teams.find(t => t.name === curInn.battingTeam);
        if (battingTeam && battingTeam.players && !battingTeam.players.includes(batterName)) {
          battingTeam.players.push(batterName);
        }
      }
      break;
    }

    case EVENT_TYPES.RETIRE_BATTER: {
      const { batter, reason, nextBatter: incomingBatter } = event.payload;
      const curInn = next.innings[next.currentInningsIndex];
      const isStriker = batter === next.striker;
      const slot = isStriker ? 'striker' : 'nonStriker';

      if (reason === 'out' && curInn) {
        curInn.wickets += 1;
        checkInningsEnd(next);
      } else if (reason === 'time_declare' || reason === 'retired_hurt') {
        // Time declare: Can return at anytime when team needs him
        next.retiredHurtBatters = next.retiredHurtBatters || [];
        if (!next.retiredHurtBatters.includes(batter)) {
          next.retiredHurtBatters.push(batter);
        }
      }

      if (incomingBatter) {
        if (slot === 'striker') next.striker = incomingBatter;
        else next.nonStriker = incomingBatter;
        if (next.retiredHurtBatters) {
          next.retiredHurtBatters = next.retiredHurtBatters.filter(b => b !== incomingBatter);
        }
        next.needsNewBatter = false;
        next.vacantBatterSlot = null;
      } else {
        if (slot === 'striker') next.striker = null;
        else next.nonStriker = null;
        next.needsNewBatter = true;
        next.vacantBatterSlot = slot;
      }
      break;
    }

    case EVENT_TYPES.EDIT_PLAYER: {
      const { oldName, newName, role } = event.payload;
      if (oldName && newName && oldName !== newName) {
        if (next.teams) {
          next.teams.forEach(t => {
            if (t.players) {
              const idx = t.players.indexOf(oldName);
              if (idx !== -1) t.players[idx] = newName;
            }
          });
        }
        if (next.striker === oldName) next.striker = newName;
        if (next.nonStriker === oldName) next.nonStriker = newName;
        if (next.currentBowler === oldName) next.currentBowler = newName;
        if (next.previousBowler === oldName) next.previousBowler = newName;
        if (next.retiredHurtBatters) {
          const rIdx = next.retiredHurtBatters.indexOf(oldName);
          if (rIdx !== -1) next.retiredHurtBatters[rIdx] = newName;
        }
        if (next.innings) {
          next.innings.forEach(inn => {
            if (inn.balls) {
              inn.balls.forEach(b => {
                if (b.striker === oldName) b.striker = newName;
                if (b.nonStriker === oldName) b.nonStriker = newName;
                if (b.bowler === oldName) b.bowler = newName;
                if (b.dismissedPlayer === oldName) b.dismissedPlayer = newName;
              });
            }
          });
        }
      }
      break;
    }

    case EVENT_TYPES.END_INNINGS: {
      const curInn = next.innings[next.currentInningsIndex];
      if (curInn) {
        curInn.isCompleted = true;
        curInn.completedReason = event.payload.reason || 'Declared / Ended';
      }

      if (next.currentInningsIndex === 0) {
        next.status = MATCH_STATUS.IN_PROGRESS;
        next.currentInningsIndex = 1;
        next.target = (curInn ? curInn.score : 0) + 1;
        next.striker = event.payload.striker || null;
        next.nonStriker = event.payload.nonStriker || null;
        next.currentBowler = event.payload.bowler || null;
        next.previousBowler = null;
        next.isFreeHit = false;
        next.isOverComplete = false;
        next.needsBowlerChange = false;
        next.needsNewBatter = false;
      } else {
        next.status = MATCH_STATUS.COMPLETED;
      }
      break;
    }

    case EVENT_TYPES.REVISE_TARGET: {
      if (event.payload.target != null) {
        next.target = Number(event.payload.target);
      }
      if (event.payload.overs != null) {
        next.overs = Number(event.payload.overs);
      }
      checkInningsEnd(next);
      break;
    }

    default:
      break;
  }

  // Record event in history
  next.events.push(event);
  return next;
}

/**
 * Generates a short, user-friendly badge label for a ball.
 */
function formatBallLabel(runs, extraType, extraRuns, isWicket, wicketType) {
  if (isWicket) {
    if (wicketType === WICKET_TYPES.RUN_OUT) return `W (RO)`;
    return 'W';
  }
  if (extraType === EXTRA_TYPES.WIDE) {
    return extraRuns > 0 ? `${1 + extraRuns}wd` : 'wd';
  }
  if (extraType === EXTRA_TYPES.NO_BALL) {
    return runs > 0 ? `nb+${runs}` : 'nb';
  }
  if (extraType === EXTRA_TYPES.BYE) {
    return `${extraRuns}b`;
  }
  if (extraType === EXTRA_TYPES.LEG_BYE) {
    return `${extraRuns}lb`;
  }
  return String(runs);
}

/**
 * Replays an array of events sequentially from scratch.
 * Guarantees 100% deterministic state reconstruction.
 */
export function replayEvents(events = []) {
  let state = createInitialMatchState();
  for (const event of events) {
    state = applyEvent(state, event);
  }
  return state;
}

/**
 * Handles Undo by replaying events up to target sequence.
 */
export function undoLastEvent(events = []) {
  if (!events || events.length === 0) return createInitialMatchState();
  // Filter out the last scoring action
  const eventsWithoutLast = events.slice(0, -1);
  return replayEvents(eventsWithoutLast);
}
