import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialMatchState, applyEvent } from '../engine/reducer.js';
import { EVENT_TYPES, EXTRA_TYPES, WICKET_TYPES } from '../engine/constants.js';
import { computeInningsStats } from '../engine/stats.js';
import { formatOvers } from '../engine/rules.js';
import fs from 'fs';
import path from 'path';

describe('Regression Verification: Scoring, Navigation & Both Themes', () => {
  let state;

  beforeEach(() => {
    state = createInitialMatchState();
    state = applyEvent(state, {
      type: EVENT_TYPES.MATCH_INIT,
      payload: {
        matchId: 'match_test_regression',
        code: 'REG123',
        teams: [
          { name: 'Team Alpha', players: ['Alpha 1', 'Alpha 2', 'Alpha 3', 'Alpha 4'] },
          { name: 'Team Bravo', players: ['Bravo 1', 'Bravo 2', 'Bravo 3', 'Bravo 4'] }
        ],
        overs: 5,
        playersPerTeam: 4,
        toss: { winner: 'Team Alpha', decision: 'bat' },
        striker: 'Alpha 1',
        nonStriker: 'Alpha 2',
        bowler: 'Bravo 1'
      }
    });
  });

  describe('1. Comprehensive Scoring Rules (Wide, No-Ball, Free Hit, Wicket & Over End)', () => {
    it('Records wide: does not increment legal balls, persists re-bowl, and adds 1 extra run', () => {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: EXTRA_TYPES.WIDE, extraRuns: 0, isWicket: false }
      });

      const inn = state.innings[0];
      const stats = computeInningsStats(inn);
      expect(inn.score).toBe(1);
      expect(inn.legalBalls).toBe(0);
      expect(formatOvers(inn.legalBalls)).toBe('0.0');
      expect(stats.extras.wides).toBe(1);
    });

    it('Records no-ball: triggers Free Hit; subsequent wide keeps Free Hit active', () => {
      // Ball 1: No ball
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: EXTRA_TYPES.NO_BALL, extraRuns: 0, isWicket: false }
      });

      expect(state.isFreeHit).toBe(true);
      expect(state.innings[0].legalBalls).toBe(0);
      expect(state.innings[0].score).toBe(1);

      // Ball 2: Wide on Free Hit
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: EXTRA_TYPES.WIDE, extraRuns: 0, isWicket: false }
      });

      // Free Hit MUST remain active on illegal delivery
      expect(state.isFreeHit).toBe(true);
      expect(state.innings[0].score).toBe(2);
      expect(state.innings[0].legalBalls).toBe(0);

      // Ball 3: Legal dot ball clears Free Hit
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: null, extraRuns: 0, isWicket: false }
      });

      expect(state.isFreeHit).toBe(false);
      expect(state.innings[0].legalBalls).toBe(1);
      expect(formatOvers(state.innings[0].legalBalls)).toBe('0.1');
    });

    it('Records wicket dismissal: rotates new batter into crease', () => {
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: {
          runs: 0,
          extraType: null,
          extraRuns: 0,
          isWicket: true,
          wicket: { type: WICKET_TYPES.BOWLED, playerOut: 'Alpha 1' },
          nextBatter: 'Alpha 3'
        }
      });

      expect(state.innings[0].wickets).toBe(1);
      expect(state.innings[0].legalBalls).toBe(1);
      expect(state.striker).toBe('Alpha 3');
    });

    it('Completes over: 6 legal balls triggers needsBowlerChange', () => {
      for (let i = 0; i < 6; i++) {
        state = applyEvent(state, {
          type: EVENT_TYPES.BALL,
          payload: { runs: 1, extraType: null, extraRuns: 0, isWicket: false }
        });
      }

      expect(state.innings[0].legalBalls).toBe(6);
      expect(formatOvers(state.innings[0].legalBalls)).toBe('1.0');
      expect(state.needsBowlerChange).toBe(true);
      expect(state.isOverComplete).toBe(true);

      // Assign new bowler
      state = applyEvent(state, {
        type: EVENT_TYPES.CHANGE_BOWLER,
        payload: { bowler: 'Bravo 2' }
      });

      expect(state.currentBowler).toBe('Bravo 2');
      expect(state.needsBowlerChange).toBe(false);
      expect(state.isOverComplete).toBe(false);
    });
  });

  describe('2. Navigation Back Routing & URL History Verification', () => {
    it('Verifies App.jsx defines back routing accurately for all screens', () => {
      const appCode = fs.readFileSync(path.join(__dirname, '../App.jsx'), 'utf-8');

      // Live Scoring back arrow goes to Scorer Match List (Home with isManager: true)
      expect(appCode).toContain('const handleBackFromScoring = () => {');
      expect(appCode).toContain('targetPath = (screen.isManager || screen.initialPortal === \'create\') ? \'/scorer\' : \'/\';');

      // Setup back arrow goes to Scorer Portal (Home with isManager: true)
      expect(appCode).toContain('const handleBackFromSetup = () => {');
      expect(appCode).toContain('isManager: true');

      // Live stream back arrow goes to Stream List (Home with isManager: false)
      expect(appCode).toContain('const handleBackFromLive = () => {');
      expect(appCode).toContain('isManager: false');

      // Client side deep linking routes registered in URL routing
      expect(appCode).toContain("path === '/developer'");
      expect(appCode).toContain("path === '/scorer'");
      expect(appCode).toContain("path === '/setup'");
      expect(appCode).toContain("/^\\/live\\/([^/?#]+)/i");
      expect(appCode).toContain("/^\\/match\\/([^/?#]+)/i");
      expect(appCode).toContain("/^\\/summary\\/([^/?#]+)/i");
      expect(appCode).toContain("/^\\/scorecard\\/([^/?#]+)/i");
    });
  });

  describe('3. Dual Theme Styling (Light Mode & Dark Mode Verification)', () => {
    it('Verifies WicketModal uses CSS theme variables instead of hardcoded dark classes', () => {
      const modalSrc = fs.readFileSync(path.join(__dirname, '../components/WicketModal.jsx'), 'utf-8');

      expect(modalSrc).toContain("backgroundColor: 'var(--card)'");
      expect(modalSrc).toContain("borderColor: 'var(--border)'");
      expect(modalSrc).toContain("color: 'var(--text)'");
      expect(modalSrc).toContain("backgroundColor: 'var(--card-alt)'");
      expect(modalSrc).not.toContain('bg-slate-900 border-slate-700 text-slate-100');
    });

    it('Verifies index.css defines light and dark theme variable bindings', () => {
      const cssSrc = fs.readFileSync(path.join(__dirname, '../index.css'), 'utf-8');

      expect(cssSrc).toContain(':root');
      expect(cssSrc).toContain('[data-theme="light"]');
      expect(cssSrc).toContain('--card:');
      expect(cssSrc).toContain('--border:');
      expect(cssSrc).toContain('--text:');
      expect(cssSrc).toContain('.dot');
    });
  });
});
