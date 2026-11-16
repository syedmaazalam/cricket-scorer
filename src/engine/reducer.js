import { EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES } from './constants.js';
import { isLegalDelivery, isWicketValidOnFreeHit, isWicketValidOnNoBall, isWicketValidOnWide, getMaxWickets } from './rules.js';

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

    // Clear bowler change, over completion, and new batter flags since innings has concluded
    state.needsBowlerChange = false;
    state.isOverComplete = false;
    state.needsNewBatter = false;
    state.vacantBatterSlot = null;

    if (state.currentInningsIndex === 0) {
      // Innings 1 ended
      state.status = MATCH_STATUS.INNINGS_BREAK;
      state.target = currentInnings.score + 1;
      // Explicitly clear crease on innings break so Innings 1 batters never leak into Innings 2
      state.striker = null;
      state.nonStriker = null;
      state.currentBowler = null;
    } else {
      // Innings 2 ended -> Match finished
      state.status = MATCH_STATUS.COMPLETED;
      state.needsBowlerChange = false;
      state.isOverComplete = false;
      state.needsNewBatter = false;
      state.vacantBatterSlot = null;
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
      state.result = {
        winner: state.winner,
        summary: state.resultSummary
      };
    }
  }

  return state;
}

/**
 * Pure reducer that applies a single event to a match state.
 */
export function applyEvent(state, event) {
  if (!event || !event.type) return state;

  const eventTimestamp = event.timestamp || event.payload?.timestamp || 0;
  const eventToRecord = event.timestamp ? event : (eventTimestamp ? { ...event, timestamp: eventTimestamp } : event);

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

      let isLegal = isLegalDelivery(extraType);
      let calculatedWicket = Boolean(isWicket || wicket || wicketType);

      // Normalize wicket object
      let normalizedWicket = wicket ? { ...wicket } : null;
      const ballBowler = event.payload.bowler || next.currentBowler;
      if (calculatedWicket && !normalizedWicket) {
        normalizedWicket = {
          type: wicketType || WICKET_TYPES.BOWLED,
          playerOut: dismissedPlayer || event.payload.playerOut || next.striker,
          fielder: fielder || null,
          isDirectHit: Boolean(event.payload.isDirectHit),
          bowler: ballBowler
        };
      } else if (normalizedWicket) {
        if (event.payload.isDirectHit !== undefined && normalizedWicket.isDirectHit === undefined) {
          normalizedWicket.isDirectHit = Boolean(event.payload.isDirectHit);
        }
      }
      if (normalizedWicket && !normalizedWicket.playerOut) {
        normalizedWicket.playerOut = next.striker;
      }
      if (normalizedWicket && !normalizedWicket.bowler) {
        normalizedWicket.bowler = ballBowler;
      }

      // Check Free Hit rules: only run-outs / obstructing / hit ball twice / retired are valid on Free Hit
      let wasInvalidWicketOnFreeHit = false;
      if (next.isFreeHit && calculatedWicket && normalizedWicket) {
        if (!isWicketValidOnFreeHit(normalizedWicket.type)) {
          calculatedWicket = false; // Disallowed dismissal on free hit
          normalizedWicket = null;
          wasInvalidWicketOnFreeHit = true;
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

      // Check for Retired Hurt (Bug 26: Must NOT count as a team wicket or a legal ball)
      const isRetiredHurtDelivery = Boolean(
        (normalizedWicket && normalizedWicket.type === WICKET_TYPES.RETIRED_HURT) ||
        event.payload?.wicketType === WICKET_TYPES.RETIRED_HURT
      );
      if (isRetiredHurtDelivery) {
        isLegal = false;
        calculatedWicket = false; // Does not count towards team wickets!
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
        bowler: ballBowler,
        runs,
        extraType,
        extraRuns,
        isLegal,
        isWicket: calculatedWicket,
        isRetiredHurt: isRetiredHurtDelivery,
        wicket: isRetiredHurtDelivery ? (normalizedWicket || { type: WICKET_TYPES.RETIRED_HURT, playerOut: event.payload.dismissedPlayer || next.striker }) : (calculatedWicket ? normalizedWicket : null),
        isDirectHit: Boolean(normalizedWicket?.isDirectHit || event.payload.isDirectHit),
        isOverthrow: Boolean(event.payload.isOverthrow),
        overthrowRuns: Number(event.payload.overthrowRuns) || 0,
        runsRan: event.payload.runsRan !== undefined ? Number(event.payload.runsRan) : runs,
        scoreAtBall: curInn.score,
        legalBallsSoFar: curInn.legalBalls,
        timestamp: eventTimestamp,
        shortLabel: isRetiredHurtDelivery ? 'RetHurt' : formatBallLabel(runs, extraType, extraRuns, calculatedWicket, normalizedWicket?.type)
      };
      curInn.balls.push(ballRecord);
      next.lastBallSummary = ballRecord.shortLabel;

      // Ensure ballBowler is in bowling team squad list
      if (curInn && ballBowler && next.teams) {
        const bowlingTeam = next.teams.find(t => t.name === curInn.bowlingTeam);
        if (bowlingTeam && bowlingTeam.players && !bowlingTeam.players.includes(ballBowler)) {
          bowlingTeam.players.push(ballBowler);
        }
      }

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

      // Handle Wickets & Retired Hurt
      let batterDismissedSlot = null;
      if (isRetiredHurtDelivery) {
        const playerOut = (normalizedWicket?.playerOut) || event.payload?.dismissedPlayer || next.striker;
        next.retiredHurtBatters = next.retiredHurtBatters || [];
        if (!next.retiredHurtBatters.includes(playerOut)) {
          next.retiredHurtBatters.push(playerOut);
        }

        if (playerOut === curStriker) {
          batterDismissedSlot = 'striker';
        } else if (playerOut === curNonStriker) {
          batterDismissedSlot = 'nonStriker';
        } else if (playerOut === next.striker) {
          batterDismissedSlot = 'striker';
        } else {
          batterDismissedSlot = 'nonStriker';
        }

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
      } else if (calculatedWicket && normalizedWicket) {
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
        if (isLegal && !wasInvalidWicketOnFreeHit) {
          next.isFreeHit = false;
        }
        // If wide, no-ball, or invalid wicket on free hit, free hit remains true
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

      // If mid-over reassignment: reassign all balls bowled in the current active over to newBowler
      if (curInn && curInn.balls && curInn.balls.length > 0 && event.payload.mode === 'reassign_over') {
        const targetLegalCutoff = Math.floor(curInn.legalBalls / 6) * 6;
        let legalSeen = 0;
        for (let i = 0; i < curInn.balls.length; i++) {
          const b = curInn.balls[i];
          if (legalSeen >= targetLegalCutoff) {
            b.bowler = newBowler;
            if (b.wicket && b.wicket.bowler) {
              b.wicket.bowler = newBowler;
            }
          }
          if (b.isLegal) {
            legalSeen++;
          }
        }
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
      const batterName = typeof event.payload.batter === 'string' ? event.payload.batter.trim() : '';
      if (!batterName) return state;

      // Disallow assigning the batter already on the crease at the other end
      if (slot === 'striker' && next.nonStriker === batterName) {
        return state;
      }
      if (slot === 'nonStriker' && next.striker === batterName) {
        return state;
      }

      // Squad validation: prevent opposing bowling team player from batting
      const curInn = next.innings[next.currentInningsIndex];
      if (curInn && next.teams) {
        const battingTeam = next.teams.find(t => t.name === curInn.battingTeam);
        const bowlingTeam = next.teams.find(t => t.name === curInn.bowlingTeam);
        if (bowlingTeam?.players?.includes(batterName) && !battingTeam?.players?.includes(batterName)) {
          return state;
        }
        if (battingTeam && battingTeam.players && !battingTeam.players.includes(batterName)) {
          battingTeam.players.push(batterName);
        }
      }

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
      const { oldName, newName } = event.payload;
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
        const inn1BatTeam = curInn?.battingTeam || next.teams?.[0]?.name || 'Team 1';
        const inn1BowlTeam = curInn?.bowlingTeam || next.teams?.[1]?.name || 'Team 2';

        if (!next.innings[1]) {
          next.innings[1] = createInningsState(2, inn1BowlTeam, inn1BatTeam, next.overs);
        } else {
          next.innings[1].battingTeam = inn1BowlTeam;
          next.innings[1].bowlingTeam = inn1BatTeam;
        }

        const rawStriker = typeof event.payload.striker === 'string' ? event.payload.striker.trim() : null;
        const rawNonStriker = typeof event.payload.nonStriker === 'string' ? event.payload.nonStriker.trim() : null;
        const rawBowler = typeof event.payload.bowler === 'string' ? event.payload.bowler.trim() : null;

        let newStriker = rawStriker || null;
        let newNonStriker = rawNonStriker || null;
        if (newStriker && newNonStriker && newStriker === newNonStriker) {
          newNonStriker = null;
        }

        const defendingTeam = next.teams?.find(t => t.name === inn1BatTeam);
        const chasingTeam = next.teams?.find(t => t.name === inn1BowlTeam);

        // Guard against assigning a defending team (Innings 1 batting team) player as a batter in Innings 2
        if (defendingTeam?.players && chasingTeam?.players) {
          if (newStriker && defendingTeam.players.includes(newStriker) && !chasingTeam.players.includes(newStriker)) {
            newStriker = null;
          }
          if (newNonStriker && defendingTeam.players.includes(newNonStriker) && !chasingTeam.players.includes(newNonStriker)) {
            newNonStriker = null;
          }
        }

        next.striker = newStriker;
        next.nonStriker = newNonStriker;
        next.currentBowler = rawBowler || null;
        next.previousBowler = null;
        next.isFreeHit = false;
        next.isOverComplete = false;
        next.needsBowlerChange = false;
        next.needsNewBatter = !newStriker || !newNonStriker;
        next.vacantBatterSlot = !newStriker ? 'striker' : (!newNonStriker ? 'nonStriker' : null);

        // Ensure newly picked striker/nonStriker/bowler are in the respective team squads
        if (next.teams) {
          if (chasingTeam && chasingTeam.players) {
            if (next.striker && !chasingTeam.players.includes(next.striker)) chasingTeam.players.push(next.striker);
            if (next.nonStriker && !chasingTeam.players.includes(next.nonStriker)) chasingTeam.players.push(next.nonStriker);
          }
          if (defendingTeam && defendingTeam.players) {
            if (next.currentBowler && !defendingTeam.players.includes(next.currentBowler)) defendingTeam.players.push(next.currentBowler);
          }
        }
      } else {
        next.status = MATCH_STATUS.COMPLETED;
        next.needsBowlerChange = false;
        next.isOverComplete = false;
        next.needsNewBatter = false;
        next.vacantBatterSlot = null;
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

    case EVENT_TYPES.REOPEN_PREVIOUS_OVER: {
      const curInn = next.innings[next.currentInningsIndex];
      if (curInn && curInn.balls.length > 0) {
        if (next.previousBowler) {
          next.currentBowler = next.previousBowler;
          next.previousBowler = null;
        }
        next.needsBowlerChange = false;
        next.isOverComplete = false;
        // Swap ends back to restore previous over's positions if over had completed
        const temp = next.striker;
        next.striker = next.nonStriker;
        next.nonStriker = temp;
      }
      break;
    }

    case EVENT_TYPES.ADD_BALL_TO_PREVIOUS_OVER: {
      const curInn = next.innings[next.currentInningsIndex];
      if (!curInn) break;

      const {
        runs = 0,
        extraType = null,
        extraRuns = 0,
        isWicket = false,
        wicket = null,
        wicketType = null,
        dismissedPlayer = null,
        fielder = null,
        striker = null,
        bowler = null
      } = event.payload;

      let isLegal = isLegalDelivery(extraType);
      let calculatedWicket = Boolean(isWicket || wicket || wicketType);
      let normalizedWicket = wicket ? { ...wicket } : null;
      if (calculatedWicket && !normalizedWicket) {
        normalizedWicket = {
          type: wicketType || WICKET_TYPES.BOWLED,
          playerOut: dismissedPlayer || event.payload.playerOut || next.striker,
          fielder: fielder || null,
          isDirectHit: Boolean(event.payload.isDirectHit),
          bowler: bowler || next.previousBowler || next.currentBowler
        };
      } else if (normalizedWicket) {
        if (event.payload.isDirectHit !== undefined && normalizedWicket.isDirectHit === undefined) {
          normalizedWicket.isDirectHit = Boolean(event.payload.isDirectHit);
        }
      }

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
      if (isLegal) curInn.legalBalls += 1;
      if (calculatedWicket) curInn.wickets += 1;

      // Find insertion point at previous over's boundary
      const targetThreshold = Math.max(0, Math.floor((curInn.legalBalls - (isLegal ? 1 : 0)) / 6) * 6);
      let insertIdx = curInn.balls.length;
      let count = 0;
      for (let i = 0; i < curInn.balls.length; i++) {
        if (curInn.balls[i].isLegal) count++;
        if (count === targetThreshold) {
          insertIdx = i + 1;
          break;
        }
      }

      const ballRecord = {
        ballId: event.id || `ball_prev_${Date.now()}`,
        seq: event.seq || (next.events.length + 1),
        striker: striker || next.striker,
        nonStriker: next.nonStriker,
        bowler: bowler || next.previousBowler || next.currentBowler,
        runs,
        extraType,
        extraRuns,
        isLegal,
        isWicket: calculatedWicket,
        wicket: calculatedWicket ? normalizedWicket : null,
        isDirectHit: Boolean(normalizedWicket?.isDirectHit || event.payload.isDirectHit),
        isPreviousOverCorrection: true,
        scoreAtBall: curInn.score,
        legalBallsSoFar: curInn.legalBalls,
        timestamp: eventTimestamp,
        shortLabel: formatBallLabel(runs, extraType, extraRuns, calculatedWicket, normalizedWicket?.type)
      };

      curInn.balls.splice(insertIdx, 0, ballRecord);
      checkInningsEnd(next);
      break;
    }

    default:
      break;
  }

  // Record event in history
  next.events.push(eventToRecord);
  return next;
}

/**
 * Generates a short, user-friendly badge label for a ball.
 */
function formatBallLabel(runs, extraType, extraRuns, isWicket, wicketType) {
  if (wicketType === WICKET_TYPES.RETIRED_HURT) {
    return 'RetHurt';
  }
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
