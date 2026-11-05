import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createInitialMatchState, applyEvent } from '../engine/reducer.js';
import { EVENT_TYPES, EXTRA_TYPES, MATCH_STATUS, WICKET_TYPES } from '../engine/constants.js';
import Scorecard from '../pages/Scorecard.jsx';
import MatchSummary from '../pages/MatchSummary.jsx';

describe('E2E Lifecycle Verification: Complete Match Flow to Summary', () => {
  it('executes full 2-innings match, completes target chase, and renders Scorecard & MatchSummary', () => {
    // 1. Initialize Match
    let state = createInitialMatchState();
    state = applyEvent(state, {
      type: EVENT_TYPES.MATCH_INIT,
      payload: {
        matchId: 'e2e_test_match',
        code: 'TEST99',
        teams: [
          { id: 't1', name: 'Lahore Stars', players: ['Babar', 'Rizwan', 'Fakhar', 'Shadab'] },
          { id: 't2', name: 'Karachi Kings', players: ['Amir', 'Imad', 'Shoaib', 'Shan'] }
        ],
        overs: 1,
        playersPerTeam: 4,
        toss: { winner: 'Lahore Stars', decision: 'bat' },
        striker: 'Babar',
        nonStriker: 'Rizwan',
        bowler: 'Amir'
      }
    });

    expect(state.status).toBe(MATCH_STATUS.IN_PROGRESS);
    expect(state.currentInningsIndex).toBe(0);

    // 2. Play Innings 1 (1 Over = 6 legal balls)
    // Ball 1: 4 runs
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 4, extraType: null, extraRuns: 0, isWicket: false }
    });
    // Ball 2: 1 run (Strike rotates to Rizwan)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
    });
    expect(state.striker).toBe('Rizwan');

    // Ball 3: 6 runs
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 6, extraType: null, extraRuns: 0, isWicket: false }
    });
    // Ball 4: Wicket (Caught out)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        extraType: null,
        extraRuns: 0,
        isWicket: true,
        wicketType: WICKET_TYPES.CAUGHT,
        dismissedPlayer: 'Rizwan',
        fielder: 'Shan'
      }
    });
    expect(state.needsNewBatter).toBe(true);

    // Incoming batter: Fakhar
    state = applyEvent(state, {
      type: EVENT_TYPES.NEW_BATTER,
      payload: { batter: 'Fakhar', slot: 'striker' }
    });
    expect(state.needsNewBatter).toBe(false);

    // Ball 5: Wide delivery (+1 extra, re-bowl)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: EXTRA_TYPES.WIDE, extraRuns: 0, isWicket: false }
    });
    // Ball 5 (re-bowl): 2 runs
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 2, extraType: null, extraRuns: 0, isWicket: false }
    });
    // Ball 6: 0 dot ball (Over complete, 1st innings finished!)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: false }
    });

    // Innings 1 should now be complete
    const inn1 = state.innings[0];
    expect(inn1.isCompleted).toBe(true);
    // Score: 4 + 1 + 6 + 0 + 1(wd) + 2 + 0 = 14 runs for 1 wicket
    expect(inn1.score).toBe(14);
    expect(inn1.wickets).toBe(1);
    expect(state.target).toBe(15);

    // 3. Start Innings 2 (Karachi Kings chasing 15 runs)
    state = applyEvent(state, {
      type: EVENT_TYPES.END_INNINGS,
      payload: {
        striker: 'Shan',
        nonStriker: 'Shoaib',
        bowler: 'Babar'
      }
    });
    expect(state.currentInningsIndex).toBe(1);

    // Innings 2 Chasing:
    // Ball 1: 6 runs
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 6, extraType: null, extraRuns: 0, isWicket: false }
    });
    // Ball 2: 6 runs (Total: 12 runs)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 6, extraType: null, extraRuns: 0, isWicket: false }
    });
    // Ball 3: 4 runs (Total: 16 runs -> Reached 15 target!)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 4, extraType: null, extraRuns: 0, isWicket: false }
    });

    // Match should now be COMPLETED
    expect(state.status).toBe(MATCH_STATUS.COMPLETED);
    expect(state.winner).toBe('Karachi Kings');
    expect(state.resultSummary).toContain('Karachi Kings');

    // 4. Test Scorecard UI Rendering
    const scorecardHtml = renderToString(
      <Scorecard matchState={state} onBack={() => {}} onOpenSummary={() => {}} />
    );
    expect(scorecardHtml).toContain('Lahore Stars');
    expect(scorecardHtml).toContain('Karachi Kings');
    expect(scorecardHtml).toContain('Babar');
    expect(scorecardHtml).toContain('Rizwan');
    expect(scorecardHtml).toContain('Scorecard');

    // 5. Test MatchSummary UI Rendering
    const summaryHtml = renderToString(
      <MatchSummary matchState={state} onBack={() => {}} />
    );
    expect(summaryHtml).toContain('Karachi Kings');
    expect(summaryHtml).toContain('Comprehensive Match Summary');
    expect(summaryHtml).toContain('Top 3 players of the match');
  });
});
