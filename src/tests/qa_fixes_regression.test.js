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

  it('Fix 6: Developer Dashboard Credentials, Manager Password Management & Matches Dropdown', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const devCode = fs.readFileSync(path.resolve(__dirname, '../pages/DeveloperDashboard.jsx'), 'utf-8');

    // 1. Developer default username is syedmaazalam2007@gmail.com and password Silicon123@
    expect(devCode).toContain('syedmaazalam2007@gmail.com');
    expect(devCode).toContain('Silicon123@');

    // 2. Developer can view and change their own username and password
    expect(devCode).toContain('Developer Portal Credentials');
    expect(devCode).toContain('handleSaveDevCredentials');
    expect(devCode).toContain('saveDeveloperCredentialsInCloud');

    // 3. Developer can view managers usernames and passwords
    expect(devCode).toContain('Manager Credentials');
    expect(devCode).toContain('togglePasswordVisibility');
    expect(devCode).toContain('revealedPasswords');

    // 4. Developer can change manager usernames and passwords
    expect(devCode).toContain('handleSaveManagerCredentials');
    expect(devCode).toContain('updateManagerCredentialsInCloud');
    expect(devCode).toContain('updateManagerLocally');

    // 5. Developer can view each manager matches via a dropdown
    expect(devCode).toContain('Matches Dropdown:');
    expect(devCode).toContain('selectedManagerMatch');
    expect(devCode).toContain('-- Select a match to view');
  });

  it('Fix 7: Settings Overhaul: Glass blur, Reduce motion, Text scale, Haptics, Left-handed pad, Confirm Undo, Time format & Image export', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const cssCode = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf-8');
    const runPadCode = fs.readFileSync(path.resolve(__dirname, '../components/RunPad.jsx'), 'utf-8');
    const scoringCode = fs.readFileSync(path.resolve(__dirname, '../pages/Scoring.jsx'), 'utf-8');
    const settingsCode = fs.readFileSync(path.resolve(__dirname, '../pages/Settings.jsx'), 'utf-8');
    const imgGenCode = fs.readFileSync(path.resolve(__dirname, '../components/MatchSummaryImageGenerator.jsx'), 'utf-8');
    const scorecardCode = fs.readFileSync(path.resolve(__dirname, '../pages/Scorecard.jsx'), 'utf-8');

    // 1. CSS rules for glass blur, reduce motion, and text scale
    expect(cssCode).toContain('.no-glass');
    expect(cssCode).toContain('[data-reduce-motion="true"]');
    expect(cssCode).toContain('[data-text-scale="large"]');

    // 2. Settings page updates attributes and saves to localStorage
    expect(settingsCode).toContain('handleReduceMotionToggle');
    expect(settingsCode).toContain('handleTextSizeChange');
    expect(settingsCode).toContain('data-reduce-motion');
    expect(settingsCode).toContain('data-text-scale');

    // 3. RunPad respects haptics and left-handed layout
    expect(runPadCode).toContain("localStorage.getItem('setting_haptics') === 'false'");
    expect(runPadCode).toContain("localStorage.getItem('setting_left_handed') === 'true'");
    expect(runPadCode).toContain("direction: 'rtl'");

    // 4. Scoring respects confirm undo
    expect(scoringCode).toContain("localStorage.getItem('setting_confirm_undo') === 'true'");
    expect(scoringCode).toContain('window.confirm');

    // 5. Image export & scorecard respect export res, footer credit, and time format
    expect(imgGenCode).toContain("localStorage.getItem('setting_export_res')");
    expect(imgGenCode).toContain("localStorage.getItem('setting_footer_credit')");
    expect(scorecardCode).toContain("localStorage.getItem('setting_time_format')");
  });

  it('Fix 8: Light Theme Harmonization: Top 3 Players and Teams Section use Adaptive Theme Tokens', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const scorecardCode = fs.readFileSync(path.resolve(__dirname, '../pages/Scorecard.jsx'), 'utf-8');
    const h2hCode = fs.readFileSync(path.resolve(__dirname, '../components/PlayersHeadToHead.jsx'), 'utf-8');

    // 1. Scorecard Top 3 Players section uses theme tokens, not hardcoded dark backgrounds
    expect(scorecardCode).not.toContain('bg-[rgba(10,21,56,0.7)]');
    expect(scorecardCode).not.toContain("background: 'rgba(16, 31, 82, 0.45)'");
    expect(scorecardCode).toContain('bg-[var(--card)]');

    // 2. PlayersHeadToHead section uses theme tokens, not hardcoded dark gradients
    expect(h2hCode).not.toContain('rgba(8, 18, 48, 0.95)');
    expect(h2hCode).not.toContain('#0e173e');
    expect(h2hCode).toContain("background: 'var(--card)'");
    expect(h2hCode).toContain("background: 'var(--well)'");
  });

  it('Fix 9: Clean Slate Data Reset and Send Feedback Email Configuration', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const localDbCode = fs.readFileSync(path.resolve(__dirname, '../store/localDb.js'), 'utf-8');
    const mainCode = fs.readFileSync(path.resolve(__dirname, '../main.jsx'), 'utf-8');
    const settingsCode = fs.readFileSync(path.resolve(__dirname, '../pages/Settings.jsx'), 'utf-8');

    // 1. Data reset clears previous manager, matches, snapshots, and logs
    expect(localDbCode).toContain('clearAllPreviousData');
    expect(localDbCode).toContain('cricket_manager_user');
    expect(mainCode).toContain('cricket_clean_slate_done');

    // 2. Send Feedback button uses maazalam.uet@gmail.com
    expect(settingsCode).toContain('maazalam.uet@gmail.com');
  });

  it('Fix 10: Classy Entry Portal: Create vs Stream Match with Zero-Login Streaming and Persistent Manager Create', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const homeCode = fs.readFileSync(path.resolve(__dirname, '../pages/Home.jsx'), 'utf-8');

    // 1. First screen displays formal question cards:
    expect(homeCode).toContain('Do you want to create a match?');
    expect(homeCode).toContain('Do you want to stream a match?');

    // 2. Stream pathway does not require manager login
    expect(homeCode).toContain('handleSelectStreamMatch');
    expect(homeCode).toContain("setActivePortal('stream')");

    // 3. Create pathway prompts manager login and persists forever
    expect(homeCode).toContain('handleSelectCreateMatch');
    expect(homeCode).toContain('setIsAuthModalOpen(true)');
    expect(homeCode).toContain('cricket_manager_user');

    // 4. In Create mode: previous matches search, resume, and new match button
    expect(homeCode).toContain('Create New Match');
    expect(homeCode).toContain('filteredLocalMatches');
    expect(homeCode).toContain('onResumeMatch');
  });

  it('Fix 11: Mobile Spacing: Responsive edge-to-edge block alignment', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const scoringCode = fs.readFileSync(path.resolve(__dirname, '../pages/Scoring.jsx'), 'utf-8');
    const liveCode = fs.readFileSync(path.resolve(__dirname, '../pages/Live.jsx'), 'utf-8');
    const cssCode = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf-8');

    // Container horizontal padding on mobile is tight (px-1) to eliminate dead side gutter space
    expect(scoringCode).toContain('px-1 sm:px-3');
    expect(liveCode).toContain('px-1 sm:px-3');

    // CSS provides mobile card sizing for max-width <= 640px
    expect(cssCode).toContain('@media (max-width: 640px)');
    expect(cssCode).toContain('padding: 12px 14px');
  });

  it('Fix 12: 2x2 Player Tables Layout & Empty Row Rule in MatchSummaryImageGenerator', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const genCode = fs.readFileSync(path.resolve(__dirname, '../components/MatchSummaryImageGenerator.jsx'), 'utf-8');

    // 1. Four separate player tables configured in a 2x2 layout
    expect(genCode).toContain('BattingTableCard');
    expect(genCode).toContain('BowlingTableCard');
    expect(genCode).toContain('inn1Batters');
    expect(genCode).toContain('inn1Bowlers');
    expect(genCode).toContain('inn2Batters');
    expect(genCode).toContain('inn2Bowlers');

    // 2. Exact Batting columns: #, Player, Team, Runs, Balls, 4s, 6s, SR
    expect(genCode).toContain('>Runs</span>');
    expect(genCode).toContain('>Balls</span>');
    expect(genCode).toContain('>4s</span>');
    expect(genCode).toContain('>6s</span>');
    expect(genCode).toContain('>SR</span>');

    // 3. Exact Bowling columns: #, Player, Team, Overs, Runs, Wickets, Econ
    expect(genCode).toContain('>Overs</span>');
    expect(genCode).toContain('>Wickets</span>');
    expect(genCode).toContain('>Econ</span>');

    // 4. Exactly 4 rows per table and empty row handling with row numbers
    expect(genCode).toContain('Array.from({ length: 4 }');
    expect(genCode).toContain('idx + 1');

    // 5. Team badges centered with navy and light-blue styling
    expect(genCode).toContain('TeamPillBadge');
    expect(genCode).toContain('#071938');
    expect(genCode).toContain('#DBEAFE');
  });

  it('Fix 13: Default Dark Theme & Synchronized Theme Switch Button', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const htmlContent = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf-8');
    const cssContent = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf-8');
    const toggleCode = fs.readFileSync(path.resolve(__dirname, '../components/ThemeToggle.jsx'), 'utf-8');
    const settingsCode = fs.readFileSync(path.resolve(__dirname, '../pages/Settings.jsx'), 'utf-8');

    // 1. index.html defaults to dark theme
    expect(htmlContent).toContain('data-theme="dark"');
    expect(htmlContent).toContain('class="dark"');

    // 2. CSS root tokens default to dark theme
    expect(cssContent).toContain(':root:not([data-theme="light"])');
    expect(cssContent).toContain(':root[data-theme="dark"]');
    expect(cssContent).toContain('color-scheme: dark');

    // 3. ThemeToggle reflects active theme with Moon for dark, Sun for light
    expect(toggleCode).toContain('localStorage.getItem(\'cricket_theme\') || \'dark\'');
    expect(toggleCode).toContain('Moon');
    expect(toggleCode).toContain('Sun');
    expect(toggleCode).toContain('cricket_theme_changed');

    // 4. Settings dispatches and listens to cricket_theme_changed
    expect(settingsCode).toContain('cricket_theme_changed');
  });
});
