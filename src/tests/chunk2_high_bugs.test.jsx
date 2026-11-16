import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createInitialMatchState, applyEvent } from '../engine/reducer.js';
import { EVENT_TYPES, WICKET_TYPES } from '../engine/constants.js';
import { computeInningsStats } from '../engine/stats.js';

describe('Chunk 2: High Severity Bugs Verification', () => {
  it('Bug 26: Retired Hurt must not count as a team wicket or a legal ball', () => {
    let state = applyEvent(createInitialMatchState(), {
      type: EVENT_TYPES.MATCH_INIT,
      payload: {
        matchId: 'm1',
        teams: [
          { name: 'Team Red', players: ['Player A', 'Player B', 'Player C'] },
          { name: 'Team Blue', players: ['Bowler 1', 'Bowler 2'] }
        ],
        overs: 5,
        toss: { winner: 'Team Red', decision: 'bat' },
        striker: 'Player A',
        nonStriker: 'Player B',
        bowler: 'Bowler 1'
      }
    });

    // Score a normal legal ball: 1 run
    state = applyEvent(state, {
      seq: 1,
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 1,
        extraType: null,
        extraRuns: 0
      }
    });
    expect(state.innings[0].score).toBe(1);
    expect(state.innings[0].wickets).toBe(0);
    expect(state.innings[0].legalBalls).toBe(1);

    // Now player retires hurt
    state = applyEvent(state, {
      seq: 2,
      type: EVENT_TYPES.BALL,
      payload: {
        runs: 0,
        extraType: null,
        extraRuns: 0,
        isWicket: true,
        wicketType: WICKET_TYPES.RETIRED_HURT,
        dismissedPlayer: 'Player B',
        nextBatter: 'Player C'
      }
    });

    // Score remains 1, wickets remains 0, legal balls remains 1
    expect(state.innings[0].score).toBe(1);
    expect(state.innings[0].wickets).toBe(0);
    expect(state.innings[0].legalBalls).toBe(1);
    expect(state.retiredHurtBatters).toContain('Player B');

    // Scorecard verification: Player B is retired hurt, not out, no FOW
    const stats = computeInningsStats(state.innings[0]);
    const pB = stats.batting['Player B'];
    expect(pB).toBeDefined();
    expect(pB.isOut).toBe(false);
    expect(pB.retiredHurt).toBe(true);
    expect(pB.dismissal).toBe('retired hurt');
    // FOW should be empty because 0 wickets have fallen
    expect(stats.fow.length).toBe(0);
  });

  it('Bug 28: useMatch editBall updates compacted root doc and Firestore event doc', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../store/useMatch.js'), 'utf8');
    expect(code).toContain('updateCompactedRootDocThrottled(activeMid, replayed, true)');
    expect(code).toContain("doc(db, 'matches', activeMid, 'events', updatedEvent.id)");
  });

  it('Bug 30: Home.jsx never silently auto-logs in as Offline Manager on Create Match', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../pages/Home.jsx'), 'utf8');
    expect(code).not.toContain("name: 'Offline Manager'");
    expect(code).toContain('setIsAuthModalOpen(true)');
  });

  it('Bug 37: Theme toggle handles Enter and Space keys', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../components/ThemeToggle.jsx'), 'utf8');
    expect(code).toContain("e.key === 'Enter' || e.key === ' '");
    expect(code).toContain('type="button"');
  });

  it('Bug 38: Create New Match CTA button activates on Enter and Space', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../pages/Home.jsx'), 'utf8');
    expect(code).toContain("e.key === 'Enter' || e.key === ' '");
    expect(code).toContain('onNavigate(\'setup\')');
  });

  it('Bug 39: PROCEED TO SQUADS button activates on Enter and Space', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../pages/Setup.jsx'), 'utf8');
    expect(code).toContain("e.key === 'Enter' || e.key === ' '");
    expect(code).toContain('handleStep1Next()');
    expect(code).toContain('type="button"');
  });

  it('Bug 40: Modals have focus-trap hook and accessible dialog attributes', () => {
    const hookCode = fs.readFileSync(path.resolve(__dirname, '../hooks/useModalA11y.js'), 'utf8');
    expect(hookCode).toContain("e.key === 'Escape'");
    expect(hookCode).toContain("e.key === 'Tab'");

    const modals = [
      '../components/WicketModal.jsx',
      '../components/EditBallModal.jsx',
      '../components/BowlerModal.jsx',
      '../components/NewBatterModal.jsx',
      '../components/OverthrowModal.jsx',
      '../components/SquadModal.jsx',
      '../components/InningsBreakModal.jsx',
      '../components/TimeDeclareModal.jsx',
      '../components/AuthModal.jsx',
      '../components/DeveloperScorerChatModal.jsx',
      '../components/DeveloperWatchAndChatModal.jsx',
      '../components/PointingCriteriaModal.jsx',
      '../components/BatterDetailsModal.jsx',
      '../components/ActionLogsModal.jsx',
      '../components/CelebrationModal.jsx',
      '../components/AddPreviousOverBallModal.jsx'
    ];

    for (const m of modals) {
      const modalCode = fs.readFileSync(path.resolve(__dirname, m), 'utf8');
      expect(modalCode).toContain('role="dialog"');
      expect(modalCode).toContain('aria-modal="true"');
    }

    const cssCode = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf8');
    expect(cssCode).toContain(':focus-visible');
  });
});
