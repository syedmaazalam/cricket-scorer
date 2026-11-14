import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  computeInningsStats,
  computeMatchFieldingStats
} from '../engine/stats.js';
import {
  calculatePlayerPoints,
  getTopPlayers,
  getVisibleBreakdownItems
} from '../engine/potm.js';
import {
  createInitialMatchState,
  applyEvent,
  undoLastEvent
} from '../engine/reducer.js';
import { EVENT_TYPES, WICKET_TYPES, EXTRA_TYPES } from '../engine/constants.js';
import MatchCharts from '../components/MatchCharts.jsx';
import PointingCriteriaModal from '../components/PointingCriteriaModal.jsx';

describe('POTM Engine Tracking, Breakdown & Over Comparison Integration Tests', () => {
  it('Tracks batting.dismissed, bowling.bowledLbw, extras, and fielding stats accurately on ball events', () => {
    let state = createInitialMatchState();
    state = applyEvent(state, {
      type: EVENT_TYPES.MATCH_INIT,
      payload: {
        overs: 5,
        playersPerTeam: 11,
        teams: [
          { name: 'Team Alpha', players: ['Striker A', 'NonStriker B', 'Batter C'] },
          { name: 'Team Bravo', players: ['Bowler X', 'Fielder Y', 'Fielder Z'] }
        ],
        toss: { winner: 'Team Alpha', decision: 'bat' },
        striker: 'Striker A',
        nonStriker: 'NonStriker B',
        bowler: 'Bowler X'
      }
    });

    // Ball 1: Wide bowled by Bowler X
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: { runs: 0, extraType: EXTRA_TYPES.WIDE, extraRuns: 0, isWicket: false, bowler: 'Bowler X' }
    });

    // Ball 2: Bowled dismissal (bowler-credited bowled/LBW)
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        extraType: null,
        extraRuns: 0,
        isWicket: true,
        wicketType: WICKET_TYPES.BOWLED,
        dismissedPlayer: 'Striker A',
        bowler: 'Bowler X'
      }
    });

    // Ball 3: Run out with Direct Hit credited to Fielder Y
    state.striker = 'Batter C';
    state = applyEvent(state, {
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        extraType: null,
        extraRuns: 0,
        isWicket: true,
        wicketType: WICKET_TYPES.RUN_OUT,
        dismissedPlayer: 'Batter C',
        fielder: 'Fielder Y',
        isDirectHit: true,
        bowler: 'Bowler X'
      }
    });

    const innStats = computeInningsStats(state.innings[0]);
    const strikerA = innStats.batting['Striker A'];
    const bowlerX = innStats.bowling['Bowler X'];

    expect(strikerA.dismissed).toBe(true);
    expect(strikerA.isOut).toBe(true);
    expect(bowlerX.bowledLbw).toBe(1);
    expect(bowlerX.wides).toBe(1);

    const fielding = computeMatchFieldingStats(state);
    expect(fielding['Fielder Y']).toBeDefined();
    expect(fielding['Fielder Y'].runOuts).toBe(1);
    expect(fielding['Fielder Y'].directRunOuts).toBe(1);

    // Verify Undo correctly reverses all stats
    const events = state.events;
    const undoneState = undoLastEvent(events);
    const undoneInnStats = computeInningsStats(undoneState.innings[0]);
    const undoneFielding = computeMatchFieldingStats(undoneState);

    expect(undoneInnStats.batting['Batter C']?.dismissed).toBeFalsy();
    expect(undoneFielding['Fielder Y']?.runOuts || 0).toBe(0);
    expect(undoneFielding['Fielder Y']?.directRunOuts || 0).toBe(0);
  });

  it('Passes winning team to getTopPlayers when concluded and null when in progress', () => {
    const allStats = {
      p1: { name: 'Player One', team: 'Winners', batting: { runs: 20 }, bowling: {} },
      p2: { name: 'Player Two', team: 'Losers', batting: { runs: 20 }, bowling: {} }
    };

    // When tied in points, passing winningTeam breaks tie in favor of winners
    const concludedTop = getTopPlayers(allStats, {}, 2, 'Winners');
    expect(concludedTop[0].name).toBe('Player One');

    // When in progress (null winningTeam), tie-break falls to subsequent rules (alphabetical if equal runs)
    const inProgressTop = getTopPlayers(allStats, {}, 2, null);
    expect(inProgressTop.length).toBe(2);
  });

  it('Ensures all visible breakdown rows are non-zero, negative values styled properly, and sum to breakdown.total', () => {
    // Batter out for a duck + Bowler with heavy economy penalty and extras
    const playerWithPenalties = {
      batting: { runs: 0, balls: 4, fours: 0, sixes: 0, dismissed: true },
      bowling: { legalBalls: 12, runsConceded: 30, wickets: 0, maidens: 0, dots: 2, wides: 2, noBalls: 1 }
    };

    const breakdown = calculatePlayerPoints(playerWithPenalties);
    const visibleItems = getVisibleBreakdownItems(breakdown);

    // No visible item has 0 value
    visibleItems.forEach((item) => {
      expect(item.val).not.toBe(0);
    });

    // Check presence of duck and penalties
    const duckItem = visibleItems.find((i) => i.key === 'duck');
    const econPenItem = visibleItems.find((i) => i.key === 'economyPenalty');
    const extrasItem = visibleItems.find((i) => i.key === 'extras');

    expect(duckItem).toBeDefined();
    expect(duckItem.val).toBe(-2);
    expect(econPenItem).toBeDefined();
    expect(econPenItem.val).toBe(-6);
    expect(extrasItem).toBeDefined();
    expect(extrasItem.val).toBe(-3);

    // Exact mathematical sum verification
    const sumOfVisible = visibleItems.reduce((acc, curr) => acc + curr.val, 0);
    expect(sumOfVisible).toBe(breakdown.total);
  });

  it('Maintains full backward compatibility for older match records without new fields', () => {
    // Legacy match record missing dismissed, bowledLbw, wides, noBalls, directRunOuts
    const legacyPlayer = {
      batting: { runs: 24, balls: 15, fours: 3, sixes: 0 },
      bowling: { legalBalls: 6, runsConceded: 8, wickets: 1, maidens: 0, dots: 3 }
    };
    const legacyFielding = { catches: 1 };

    const breakdown = calculatePlayerPoints(legacyPlayer, legacyFielding);
    expect(Number.isNaN(breakdown.total)).toBe(false);
    expect(breakdown.duck).toBe(0);
    expect(breakdown.bowledLbwBonus).toBe(0);
    expect(breakdown.extras).toBe(0);
    expect(breakdown.fielding).toBe(8); // 1 catch = 8 pts
    expect(breakdown.total).toBeGreaterThan(0);
  });

  it('Removes Best Over, Average, and Total tiles in MatchCharts when hideSummaryTiles is true', () => {
    const dummyMatch = {
      overs: 10,
      innings: [
        {
          battingTeam: 'Team Alpha',
          score: 45,
          wickets: 2,
          legalBalls: 18,
          balls: []
        }
      ]
    };

    const scoreHtml = renderToString(<MatchCharts matchState={dummyMatch} hideSummaryTiles={true} />);
    expect(scoreHtml).not.toContain('Best over');
    expect(scoreHtml).not.toContain('Avg');
    expect(scoreHtml).not.toContain('Total');

    const defaultHtml = renderToString(<MatchCharts matchState={dummyMatch} hideSummaryTiles={false} />);
    expect(defaultHtml).toContain('Best over');
    expect(defaultHtml).toContain('Avg');
    expect(defaultHtml).toContain('Total');
  });

  it('Defaults to worm graph in Teams view when initialChart="worm" is passed', () => {
    const dummyMatch = {
      overs: 10,
      innings: [
        {
          battingTeam: 'Team Alpha',
          score: 50,
          wickets: 1,
          legalBalls: 24,
          balls: []
        }
      ]
    };

    const teamsHtml = renderToString(<MatchCharts matchState={dummyMatch} initialChart="worm" />);
    expect(teamsHtml).toContain('<button type="button" class="on" aria-pressed="true">Worm</button>');
    expect(teamsHtml).toContain('linearGradient');
  });

  it('Renders PointingCriteriaModal dynamically from POINTING_CRITERIA with negative values styled properly', () => {
    const modalHtml = renderToString(<PointingCriteriaModal isOpen={true} onClose={() => {}} />);
    expect(modalHtml).toContain('Scoring Criteria');
    expect(modalHtml).toContain('Run Scored (Batter)');
    expect(modalHtml).toContain('Duck (Batter)');
    expect(modalHtml).toContain('danger'); // negative points chip styled with danger
  });

  it('Displays bowler name in over summary card and renders 2W on multi-wicket bar', () => {
    const dummyMatch = {
      overs: 10,
      innings: [
        {
          battingTeam: 'Team Amjad',
          score: 18,
          wickets: 2,
          legalBalls: 6,
          balls: [
            { striker: 'A', nonStriker: 'B', bowler: '*Rizwan Bowler*', runs: 4, isLegal: true, isWicket: false },
            { striker: 'A', nonStriker: 'B', bowler: '*Rizwan Bowler*', runs: 0, isLegal: true, isWicket: true, wicket: { type: 'bowled', playerOut: 'A' } },
            { striker: 'C', nonStriker: 'B', bowler: '*Rizwan Bowler*', runs: 6, isLegal: true, isWicket: false },
            { striker: 'C', nonStriker: 'B', bowler: '*Rizwan Bowler*', runs: 0, isLegal: true, isWicket: true, wicket: { type: 'bowled', playerOut: 'C' } },
            { striker: 'D', nonStriker: 'B', bowler: '*Rizwan Bowler*', runs: 2, isLegal: true, isWicket: false },
            { striker: 'D', nonStriker: 'B', bowler: '*Rizwan Bowler*', runs: 6, isLegal: true, isWicket: false }
          ]
        }
      ]
    };

    const html = renderToString(<MatchCharts matchState={dummyMatch} initialChart="runs" initialSelectedOver={1} />);
    // Bowler name should be displayed without asterisks
    expect(html).toContain('Rizwan Bowler');
    expect(html).not.toContain('*Rizwan Bowler*');
    // Multi-wicket indicator on the bar
    expect(html).toContain('2W');
  });

  it('Uses Green (#10B981) and Sky Blue (#0EA5E9) for distinct Worm graph representation', () => {
    const dummyMatch = {
      overs: 10,
      innings: [
        {
          battingTeam: 'Team Green',
          score: 40,
          wickets: 1,
          legalBalls: 6,
          balls: [
            { striker: 'A', nonStriker: 'B', bowler: 'X', runs: 6, isLegal: true, isWicket: false },
            { striker: 'A', nonStriker: 'B', bowler: 'X', runs: 6, isLegal: true, isWicket: false },
            { striker: 'A', nonStriker: 'B', bowler: 'X', runs: 6, isLegal: true, isWicket: false },
            { striker: 'A', nonStriker: 'B', bowler: 'X', runs: 6, isLegal: true, isWicket: false },
            { striker: 'A', nonStriker: 'B', bowler: 'X', runs: 6, isLegal: true, isWicket: false },
            { striker: 'A', nonStriker: 'B', bowler: 'X', runs: 10, isLegal: true, isWicket: true, wicket: { type: 'bowled', playerOut: 'A' } }
          ]
        },
        {
          battingTeam: 'Team SkyBlue',
          score: 45,
          wickets: 0,
          legalBalls: 6,
          balls: [
            { striker: 'M', nonStriker: 'N', bowler: 'Y', runs: 6, isLegal: true, isWicket: false },
            { striker: 'M', nonStriker: 'N', bowler: 'Y', runs: 6, isLegal: true, isWicket: false },
            { striker: 'M', nonStriker: 'N', bowler: 'Y', runs: 6, isLegal: true, isWicket: false },
            { striker: 'M', nonStriker: 'N', bowler: 'Y', runs: 6, isLegal: true, isWicket: false },
            { striker: 'M', nonStriker: 'N', bowler: 'Y', runs: 6, isLegal: true, isWicket: false },
            { striker: 'M', nonStriker: 'N', bowler: 'Y', runs: 15, isLegal: true, isWicket: false }
          ]
        }
      ]
    };

    const wormHtml = renderToString(<MatchCharts matchState={dummyMatch} initialChart="worm" />);
    expect(wormHtml).toContain('stop-color="#10B981"');
    expect(wormHtml).toContain('stop-color="#0EA5E9"');
    expect(wormHtml).toContain('stroke="#10B981"');
    expect(wormHtml).toContain('stroke="#0EA5E9"');
    expect(wormHtml).toContain('background-color:#10B981');
    expect(wormHtml).toContain('background-color:#0EA5E9');
  });
});
