import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createInitialMatchState, applyEvent } from '../engine/reducer.js';
import { EVENT_TYPES, EXTRA_TYPES, WICKET_TYPES } from '../engine/constants.js';

describe('Chunk 1: CRITICAL Severity (Bug 25 & Bug 36)', () => {
  describe('Bug 25: Free Hit Wicket Validation & State Invariant', () => {
    it('Ensures invalid wicket on free hit (e.g. bowled/caught) does NOT consume Free Hit', () => {
      let state = createInitialMatchState();
      state = applyEvent(state, {
        type: EVENT_TYPES.MATCH_INIT,
        payload: {
          matchId: 'match_fh',
          code: 'FH123',
          teams: [
            { name: 'India', players: ['Rohit', 'Gill', 'Kohli', 'Rahul'] },
            { name: 'Australia', players: ['Starc', 'Cummins', 'Hazlewood', 'Zampa'] }
          ],
          overs: 5,
          playersPerTeam: 4,
          toss: { winner: 'India', decision: 'bat' },
          striker: 'Rohit',
          nonStriker: 'Gill',
          bowler: 'Starc'
        }
      });

      // 1. No ball bowled -> activates Free Hit
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: { runs: 0, extraType: EXTRA_TYPES.NO_BALL }
      });
      expect(state.isFreeHit).toBe(true);
      expect(state.innings[0].legalBalls).toBe(0);

      // 2. Batter is bowled on Free Hit -> DISALLOWED and must NOT consume Free Hit!
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: {
          runs: 0,
          isWicket: true,
          wicket: { type: WICKET_TYPES.BOWLED, playerOut: 'Rohit' }
        }
      });
      expect(state.innings[0].wickets).toBe(0); // Wicket not counted
      expect(state.isFreeHit).toBe(true); // Free Hit must NOT be consumed by invalid dismissal

      // 3. Batter is run out on Free Hit -> ALLOWED and concludes Free Hit!
      state = applyEvent(state, {
        type: EVENT_TYPES.BALL,
        payload: {
          runs: 1,
          isWicket: true,
          wicket: { type: WICKET_TYPES.RUN_OUT, playerOut: 'Rohit' },
          nextBatter: 'Kohli'
        }
      });
      expect(state.innings[0].wickets).toBe(1);
      expect(state.isFreeHit).toBe(false); // Valid dismissal concludes Free Hit
    });

    it('Verifies WicketModal clears Caught, defaults to Run Out on Free Hit, and disables submit for invalid dismissals', () => {
      const modalSrc = fs.readFileSync(path.join(__dirname, '../components/WicketModal.jsx'), 'utf-8');

      // Defaults to Run Out on Free Hit
      expect(modalSrc).toContain('setWicketType(WICKET_TYPES.RUN_OUT)');
      // Disables submit when invalid dismissal on Free Hit is chosen
      expect(modalSrc).toContain('const isInvalidFreeHitDismissal = isFreeHit && !isWicketValidOnFreeHit(wicketType);');
      expect(modalSrc).toContain('const isSubmitDisabled = isCaughtWithoutFielder || isInvalidFreeHitDismissal;');
      expect(modalSrc).toContain('disabled={isSubmitDisabled}');
    });
  });

  describe('Bug 36: Landing Page Portal Cards Keyboard Accessibility', () => {
    it('Verifies Home.jsx portal cards have tabIndex, role="button", and Enter/Space handlers', () => {
      const homeSrc = fs.readFileSync(path.join(__dirname, '../pages/Home.jsx'), 'utf-8');

      // Both cards are keyboard focusable
      expect(homeSrc).toContain('role="button"');
      expect(homeSrc).toContain('tabIndex={0}');
      expect(homeSrc).toContain("e.key === 'Enter' || e.key === ' '");
      expect(homeSrc).toContain('handleSelectCreateMatch();');
      expect(homeSrc).toContain('handleSelectStreamMatch();');
      expect(homeSrc).toContain('focus-visible:ring-[#22C55E]');
      expect(homeSrc).toContain('focus-visible:ring-[#3B82F6]');
    });
  });
});
