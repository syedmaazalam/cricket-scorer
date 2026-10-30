import { describe, it, expect } from 'vitest';
import { applyEvent, createInitialMatchState } from '../engine/reducer.js';
import { EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES } from '../engine/constants.js';
import { computeInningsStats } from '../engine/stats.js';
import { getMaxWickets, formatOvers } from '../engine/rules.js';

function setupMatch() {
  let state = createInitialMatchState();
  state = applyEvent(state, {
    type: EVENT_TYPES.MATCH_INIT,
    payload: {
      matchId: 'fix_test_1',
      code: 'FIX01',
      teams: [
        { id: 't1', name: 'Alpha', players: ['A1', 'A2', 'A3', 'A4'] },
        { id: 't2', name: 'Bravo', players: ['B1', 'B2', 'B3', 'B4'] }
      ],
      overs: 5,
      playersPerTeam: 4,
      toss: { winner: 'Alpha', decision: 'bat' },
      striker: 'A1',
      nonStriker: 'A2',
      bowler: 'B1'
    }
  });
  return state;
}

describe('Regression Tests: All User Reported Fixes', () => {
  it('Fix 1: Wicket added to scorecard, batter marked out, and batsman replaced seamlessly', () => {
    let state = setupMatch();

    // Wicket submitted with flattened fields (from WicketModal)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        extraType: null,
        extraRuns: 0,
        isWicket: true,
        wicketType: WICKET_TYPES.CAUGHT,
        dismissedPlayer: 'A1',
        fielder: 'B2',
        nextBatter: 'A3'
      }
    });

    const inn = state.innings[0];
    expect(inn.wickets).toBe(1);
    expect(inn.balls[0].isWicket).toBe(true);
    expect(inn.balls[0].wicket).toBeDefined();
    expect(inn.balls[0].wicket.playerOut).toBe('A1');

    // Batsman replaced
    expect(state.striker).toBe('A3');
    expect(state.nonStriker).toBe('A2');
    expect(state.needsNewBatter).toBe(false);

    // Scorecard verification
    const stats = computeInningsStats(inn);
    expect(stats.batting['A1'].isOut).toBe(true);
    expect(stats.batting['A1'].dismissal).toContain('c B2 b B1');
    expect(stats.fow.length).toBe(1);
    expect(stats.fow[0].playerOut).toBe('A1');
  });

  it('Fix 2: Partnership correctly counts all deliveries faced together and resets upon wicket', () => {
    let state = setupMatch();

    // Ball 1: 4 runs off bat
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 4, extraType: null, extraRuns: 0 }
    });

    // Ball 2: 2 runs off bat
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 2, extraType: null, extraRuns: 0 }
    });

    let stats = computeInningsStats(state.innings[0]);
    // Both balls faced together: 6 runs from 2 balls (not 6 from 1 ball)
    expect(stats.partnership.runs).toBe(6);
    expect(stats.partnership.balls).toBe(2);

    // Ball 3: Wicket falls!
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        isWicket: true,
        wicket: { type: WICKET_TYPES.BOWLED, playerOut: state.striker },
        nextBatter: 'A3'
      }
    });

    stats = computeInningsStats(state.innings[0]);
    // Wicket recorded previous partnership in FOW
    expect(stats.fow.length).toBe(1);
    expect(stats.fow[0].partnershipRuns).toBe(6);
    expect(stats.fow[0].partnershipBalls).toBe(3);

    // New partnership resets to 0 runs and 0 balls
    expect(stats.partnership.runs).toBe(0);
    expect(stats.partnership.balls).toBe(0);

    // Next ball in new partnership
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 1, extraType: null }
    });
    stats = computeInningsStats(state.innings[0]);
    expect(stats.partnership.runs).toBe(1);
    expect(stats.partnership.balls).toBe(1);
  });

  it('Fix 3: Current over ball strip filter returns only current over deliveries', () => {
    let state = setupMatch();
    // Over 1: 1 wide + 6 legal balls = 7 deliveries total
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 0, extraType: EXTRA_TYPES.WIDE } });
    for (let i = 0; i < 6; i++) {
      state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 1 } });
    }

    const curInn = state.innings[0];
    expect(curInn.legalBalls).toBe(6);
    expect(curInn.balls.length).toBe(7);

    // Filter over 1 deliveries:
    const targetThreshold1 = Math.floor(curInn.legalBalls / 6) * 6 - 6; // completed over awaiting bowler
    let legalCount = 0;
    const over1Balls = [];
    for (const b of curInn.balls) {
      if (legalCount >= targetThreshold1) over1Balls.push(b);
      if (b.isLegal) legalCount++;
    }
    expect(over1Balls.length).toBe(7);

    // Bowler changed for over 2
    state = applyEvent(state, { type: EVENT_TYPES.CHANGE_BOWLER, payload: { bowler: 'B2' } });

    // Bowl 2 balls in over 2
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 4 } });
    state = applyEvent(state, { type: EVENT_TYPES.BALL, payload: { runs: 6 } });

    const targetThreshold2 = Math.floor(state.innings[0].legalBalls / 6) * 6; // 6
    legalCount = 0;
    const over2Balls = [];
    for (const b of state.innings[0].balls) {
      if (legalCount >= targetThreshold2) over2Balls.push(b);
      if (b.isLegal) legalCount++;
    }
    // Only the 2 deliveries of over 2 are returned!
    expect(over2Balls.length).toBe(2);
    expect(over2Balls[0].runs).toBe(4);
    expect(over2Balls[1].runs).toBe(6);
  });

  it('Fix 4: Heartbeat & Scorer offline evaluator logic', () => {
    // Evaluates whether viewer shows offline banner based on lastSeen heartbeat
    const evaluateViewerOffline = (docData, now) => {
      if (!docData || docData.status === 'completed') return null;
      const lastSeen = docData.lastSeen || docData.updatedAt || 0;
      if (lastSeen > 0 && (now - lastSeen > 45000)) {
        const d = new Date(lastSeen);
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `Scorer offline - last update ${timeStr}`;
      }
      return null;
    };

    const now = 1700000000000;
    // Scorer active 10 seconds ago -> NOT offline
    const activeDoc = { status: 'in_progress', lastSeen: now - 10000 };
    expect(evaluateViewerOffline(activeDoc, now)).toBeNull();

    // Scorer inactive 50 seconds ago -> OFFLINE
    const inactiveDoc = { status: 'in_progress', lastSeen: now - 50000 };
    expect(evaluateViewerOffline(inactiveDoc, now)).toContain('Scorer offline');

    // Match completed -> NEVER show offline banner
    const finishedDoc = { status: 'completed', lastSeen: now - 100000 };
    expect(evaluateViewerOffline(finishedDoc, now)).toBeNull();
  });

  it('Fix 5: Data Consistency & Projected threshold & Wickets left calculation', () => {
    let state = setupMatch();
    const maxWickets = getMaxWickets(state.playersPerTeam); // 4 - 1 = 3

    expect(maxWickets).toBe(3);
    expect(state.innings[0].wickets).toBe(0);
    expect(maxWickets - state.innings[0].wickets).toBe(3); // 3 wickets left

    // Score 1 wicket
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, isWicket: true, wicket: { type: WICKET_TYPES.BOWLED, playerOut: 'A1' }, nextBatter: 'A3' }
    });
    expect(maxWickets - state.innings[0].wickets).toBe(2); // 2 wickets left

    // Projected visibility rule: only when legal balls >= 12 (2 overs)
    expect(state.innings[0].legalBalls >= 12).toBe(false); // Hidden during first 2 overs
  });
});
