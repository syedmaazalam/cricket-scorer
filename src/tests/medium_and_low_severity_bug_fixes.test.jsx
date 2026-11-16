import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Chunk 3 & Chunk 4: Medium & Low Severity Bug Fixes Verification', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('Bug 8: EditBallModal displays real delivery-type pill with normalized types', () => {
    const editBallSrc = fs.readFileSync(path.join(rootDir, 'components', 'EditBallModal.jsx'), 'utf-8');
    expect(editBallSrc).toContain('function normalizeDeliveryType');
    expect(editBallSrc).toContain('data-testid="delivery-type-pill"');
    expect(editBallSrc).toContain('extraType === EXTRA_TYPES.WIDE');
    expect(editBallSrc).toContain('extraType === EXTRA_TYPES.NO_BALL');
    expect(editBallSrc).toContain('extraType === EXTRA_TYPES.BYE');
    expect(editBallSrc).toContain('extraType === EXTRA_TYPES.LEG_BYE');
  });

  it('Bug 9 & Bug 18: Client-side routing and back arrow history targets', () => {
    const appSrc = fs.readFileSync(path.join(rootDir, 'App.jsx'), 'utf-8');
    // Client-side routes supported
    expect(appSrc).toContain("path === '/scorer'");
    expect(appSrc).toContain("path === '/setup'");
    expect(appSrc).toContain("path === '/developer'");
    expect(appSrc).toContain("path.match(/^\\/live\\/([^/?#]+)/i)");
    expect(appSrc).toContain("path.match(/^\\/match\\/([^/?#]+)/i)");
    expect(appSrc).toContain("path.match(/^\\/summary\\/([^/?#]+)/i)");
    expect(appSrc).toContain("path.match(/^\\/scorecard\\/([^/?#]+)/i)");

    // URL sync
    expect(appSrc).toContain('window.history.pushState');

    // Back arrow targets
    expect(appSrc).toContain('handleBackFromScoring');
    expect(appSrc).toContain('handleBackFromSetup');
    expect(appSrc).toContain('handleBackFromLive');
    expect(appSrc).toContain("initialPortal: 'create'");
    expect(appSrc).toContain("initialPortal: 'stream'");
  });

  it('Bug 10: Online vs real offline distinction in SyncBadge and Firestore rule exists guard', () => {
    const syncBadgeSrc = fs.readFileSync(path.join(rootDir, 'components', 'SyncBadge.jsx'), 'utf-8');
    const syncSrc = fs.readFileSync(path.join(rootDir, 'store', 'sync.js'), 'utf-8');
    const rulesSrc = fs.readFileSync(path.resolve(rootDir, '..', 'firestore.rules'), 'utf-8');

    // SyncBadge checks navigator.onLine
    expect(syncBadgeSrc).toContain("navigator.onLine");
    expect(syncBadgeSrc).toContain("Sync Pending");

    // sync.js distinguishes isOnline
    expect(syncSrc).toContain("const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true");
    expect(syncSrc).toContain("status: isOnline ? 'error' : 'offline'");

    // firestore.rules guards with !exists
    expect(rulesSrc).toContain("!exists(/databases/$(database)/documents/matches/$(matchId))");
  });

  it('Bug 11: Team name deduplication and toss winner keyed by index', () => {
    const setupSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Setup.jsx'), 'utf-8');
    expect(setupSrc).toContain("teamAName.trim().toLowerCase() === teamBName.trim().toLowerCase()");
    expect(setupSrc).toContain("tossWinnerIndex === 0");
    expect(setupSrc).toContain("tossWinnerIndex === 1");
    expect(setupSrc).toContain("winnerIndex: tossWinnerIndex");
  });

  it('Bug 12: Caught without fielder disables Confirm and shows inline hint', () => {
    const wicketModalSrc = fs.readFileSync(path.join(rootDir, 'components', 'WicketModal.jsx'), 'utf-8');
    expect(wicketModalSrc).toContain("isCaughtWithoutFielder = wicketType === WICKET_TYPES.CAUGHT && !fielder");
    expect(wicketModalSrc).toContain("disabled={isCaughtWithoutFielder}");
    expect(wicketModalSrc).toContain("Please select the fielder who took the catch");
  });

  it('Bug 13: Logo preload and inline SVG fallback', () => {
    const indexHtml = fs.readFileSync(path.resolve(rootDir, '..', 'index.html'), 'utf-8');
    const homeSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Home.jsx'), 'utf-8');

    expect(indexHtml).toContain('<link rel="preload" as="image" href="/logo.png" />');
    expect(homeSrc).toContain('logo-fallback-svg');
  });

  it('Bug 14: Scorer Portal container widened on desktop and responsive grid', () => {
    const homeSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Home.jsx'), 'utf-8');
    expect(homeSrc).toContain('max-w-xl lg:max-w-5xl xl:max-w-6xl mx-auto');
    expect(homeSrc).toContain('grid grid-cols-1 md:grid-cols-2');
  });

  it('Bug 15: Dot-ball and score toasts moved outside scoreboard area with high z-index', () => {
    const animSrc = fs.readFileSync(path.join(rootDir, 'components', 'ScoreAnimation.jsx'), 'utf-8');
    expect(animSrc).toContain('top-3');
    expect(animSrc).toContain('z-[100]');
  });

  it('Bug 16: Bowler table has ECON header and economy display', () => {
    const scoringSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Scoring.jsx'), 'utf-8');
    const liveSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Live.jsx'), 'utf-8');

    expect(scoringSrc).toContain('<th className="r">ECON</th>');
    expect(scoringSrc).toContain('bowlerStat.economy');
    expect(liveSrc).toContain('<th className="text-right text-[10px]">ECON</th>');
    expect(liveSrc).toContain('bowlerStat.economy');
  });

  it('Bug 17: Chart legends have visible colored dots matching series', () => {
    const chartsSrc = fs.readFileSync(path.join(rootDir, 'components', 'MatchCharts.jsx'), 'utf-8');
    const cssSrc = fs.readFileSync(path.join(rootDir, 'index.css'), 'utf-8');

    expect(chartsSrc).toContain('inline-block w-2.5 h-2.5 rounded-full shrink-0');
    expect(cssSrc).toContain('.dot {');
    expect(cssSrc).toContain('width: 10px;');
  });

  it('Bug 19: Padding and max-height fixed for Step 2 Boxes and BatterDetailsModal', () => {
    const setupSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Setup.jsx'), 'utf-8');
    const modalSrc = fs.readFileSync(path.join(rootDir, 'components', 'BatterDetailsModal.jsx'), 'utf-8');

    expect(setupSrc).toContain('max-h-60 overflow-y-auto pr-1 pb-4');
    expect(modalSrc).toContain('pb-6 overflow-y-auto space-y-4 max-h-[75vh]');
  });

  it('Bug 21: Record Wicket modal styled with theme variables', () => {
    const wicketModalSrc = fs.readFileSync(path.join(rootDir, 'components', 'WicketModal.jsx'), 'utf-8');
    expect(wicketModalSrc).toContain("backgroundColor: 'var(--card)'");
    expect(wicketModalSrc).toContain("borderColor: 'var(--border)'");
    expect(wicketModalSrc).toContain("color: 'var(--text)'");
  });

  it('Bug 22: Missing JSX spaces fixed in headers and chart summaries', () => {
    const scoringSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Scoring.jsx'), 'utf-8');
    const chartsSrc = fs.readFileSync(path.join(rootDir, 'components', 'MatchCharts.jsx'), 'utf-8');
    const liveSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Live.jsx'), 'utf-8');

    // 1. Scoring header space between Innings and vs Bowling Team
    expect(scoringSrc).toMatch(/·\s*Inn\s*\{curInnIndex\s*\+\s*1\}[\s\S]*?\{'\s*'\}[\s\S]*?vs\s*\{currentInnings\.bowlingTeam/);

    // 2. Wide toast format has explicit space: +${...} WIDE
    expect(scoringSrc).toContain("text: `+${extraRuns} WIDE`");
    expect(liveSrc).toContain("text: `+${totalWideRuns} WIDE`");

    // 3. MatchCharts CRR and Proj have explicit space separation
    expect(chartsSrc).toMatch(/CRR\s*<b[\s\S]*?\{crrValue\.toFixed\(1\)\}<\/b><\/span>[\s\S]*?\{'\s*'\}[\s\S]*?<span className="mu">Proj/);
  });

  it('Bug 23: Squad copy uses "One player per line" and APK update restricted to native/Capacitor', () => {
    const setupSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Setup.jsx'), 'utf-8');
    const bannerSrc = fs.readFileSync(path.join(rootDir, 'components', 'UpdateNotificationBanner.jsx'), 'utf-8');

    expect(setupSrc).toContain('One player per line');
    expect(setupSrc).not.toContain('Line-by-line (\\n)');
    expect(bannerSrc).toContain('isNativeApp');
    expect(bannerSrc).toContain('if (!isNativeApp())');
  });

  it('Bug 24: Inline clear (X) button in match search inputs', () => {
    const homeSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Home.jsx'), 'utf-8');
    expect(homeSrc).toContain('onClick={() => setSearchInput(\'\')}');
    expect(homeSrc).toContain('aria-label="Clear search"');
  });
});
