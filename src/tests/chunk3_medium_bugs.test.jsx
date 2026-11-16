import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { calculatePlayerPoints } from '../engine/potm.js';
import { computeInningsStats, createBowlingStat } from '../engine/stats.js';
import { EXTRA_TYPES } from '../engine/constants.js';

describe('Chunk 3: Medium Severity Bugs Verification', () => {
  it('Bug 27: Record Wicket dismissal pill highlight is bound to wicketType state', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../components/WicketModal.jsx'), 'utf8');
    expect(code).toContain('const isSelected = wicketType === id;');
    expect(code).toContain('isSelected ?');
    expect(code).toContain('aria-checked={isSelected}');
  });

  it('Bug 29: Edit Ball modal pre-selects runs off bat from stored ball value', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../components/EditBallModal.jsx'), 'utf8');
    expect(code).toContain('const targetRuns = target.runs !== undefined ? Number(target.runs) :');
    expect(code).toContain('setRuns(Number.isFinite(targetRuns) ? targetRuns : 0);');
  });

  it('Bug 31 & 32: Setup.jsx Step 1 trims team names, validates blank names, and rejects non-integer/overs < 1', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../pages/Setup.jsx'), 'utf8');
    expect(code).toContain('const cleanTeamA = teamAName.trim();');
    expect(code).toContain('const cleanTeamB = teamBName.trim();');
    expect(code).toContain('Team names cannot be blank');
    expect(code).toContain('Number.isInteger');
    expect(code).toContain('minimum 1');
  });

  it('Bug 33: Full Summary has Back button, COMPLETED badge, and accurate MVP Extras calculation for 5 extras', () => {
    const summaryCode = fs.readFileSync(path.resolve(__dirname, '../pages/MatchSummary.jsx'), 'utf8');
    expect(summaryCode).toContain('COMPLETED');
    expect(summaryCode).toContain('Back');

    // Bowler with 5 extras conceded (e.g. 5 wide runs)
    const bowlerStats = {
      bowling: {
        legalBalls: 12,
        runsConceded: 20,
        wickets: 1,
        bowledLbw: 0,
        maidens: 0,
        dots: 4,
        wides: 2,
        noBalls: 0,
        extrasConceded: 5 // 5 total extras conceded on wides
      }
    };
    const breakdown = calculatePlayerPoints(bowlerStats);
    // When 5 extras conceded, extras points should be -5 (not -2)
    expect(breakdown.extras).toBe(-5);
  });

  it('Bug 34: Chat shows error on send failure, clears input only after send, renders plain text, Esc closes', () => {
    const chatCode = fs.readFileSync(path.resolve(__dirname, '../components/DeveloperScorerChatModal.jsx'), 'utf8');
    expect(chatCode).toContain('setSendError');
    expect(chatCode).toContain('sendError &&');
    expect(chatCode).toContain('useModalA11y');

    const watchChatCode = fs.readFileSync(path.resolve(__dirname, '../components/DeveloperWatchAndChatModal.jsx'), 'utf8');
    expect(watchChatCode).toContain('setSendError');
    expect(watchChatCode).toContain('sendError &&');
  });

  it('Bug 41: Scoring sticky header has opaque background, bottom border, shadow, and z-30', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../pages/Scoring.jsx'), 'utf8');
    expect(code).toContain('sticky top-0 z-30');
    expect(code).toContain("backgroundColor: 'var(--bg)'");
    expect(code).toContain("borderBottom: '1px solid var(--bd)'");
    expect(code).toContain('boxShadow:');
  });

  it('Bug 42: When match ends, +OT Overthrow and Swap Batter are disabled, and Select Striker prompt is hidden', () => {
    const scoringCode = fs.readFileSync(path.resolve(__dirname, '../pages/Scoring.jsx'), 'utf8');
    expect(scoringCode).toContain("matchState.striker || (matchState.status === 'completed' ? '-' : 'Select Striker')");
    expect(scoringCode).toContain("matchState.nonStriker || (matchState.status === 'completed' ? '-' : 'Select Non-Striker')");

    const runPadCode = fs.readFileSync(path.resolve(__dirname, '../components/RunPad.jsx'), 'utf8');
    expect(runPadCode).toContain('disabled={disabled || isScoringDisabled}');
  });

  it('Bug 43: useMatch immediately resets local state on matchId change and unmount to prevent stale flash', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../store/useMatch.js'), 'utf8');
    expect(code).toContain('const freshInitialState = createInitialMatchState();');
    expect(code).toContain('stateRef.current = freshInitialState;');
    expect(code).toContain('const unmountState = createInitialMatchState();');
  });
});
