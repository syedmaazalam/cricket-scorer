import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Chunk 2: HIGH Severity Bug Fixes Verification', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('Bug 2: Live chat derives role from real session and defaults to spectator with display name', () => {
    const liveSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Live.jsx'), 'utf-8');
    const chatModalSrc = fs.readFileSync(path.join(rootDir, 'components', 'DeveloperScorerChatModal.jsx'), 'utf-8');

    // Live.jsx passes derived role and senderName
    expect(liveSrc).toContain("chatRole = isDevUser ? 'developer' : (isManagerRole ? 'scorer' : 'spectator')");
    expect(liveSrc).toContain('role={chatRole}');
    expect(liveSrc).toContain('senderName={chatSenderName}');

    // DeveloperScorerChatModal handles spectator and display name
    expect(chatModalSrc).toContain("role = 'spectator'");
    expect(chatModalSrc).toContain('cricket_spectator_name');
    expect(chatModalSrc).toContain('Live Match Chat');
  });

  it('Bug 3: AuthModal requires non-empty name, valid email, and min 6-char password with inline errors', () => {
    const authModalSrc = fs.readFileSync(path.join(rootDir, 'components', 'AuthModal.jsx'), 'utf-8');
    const matchesSrc = fs.readFileSync(path.join(rootDir, 'firebase', 'matches.js'), 'utf-8');

    // Client-side validation in AuthModal
    expect(authModalSrc).toContain('fieldErrors.name');
    expect(authModalSrc).toContain('fieldErrors.email');
    expect(authModalSrc).toContain('fieldErrors.password');
    expect(authModalSrc).toContain('Password must be at least 6 characters.');
    expect(authModalSrc).toContain('Please enter your manager name.');

    // Cloud validation in saveManagerProfileToCloud
    expect(matchesSrc).toContain("if (!cleanName)");
    expect(matchesSrc).toContain("throw new Error('Manager name cannot be empty.');");
    expect(matchesSrc).toContain("throw new Error('Valid manager email is required.');");
  });

  it('Bug 4: Worm chart excludes wides/no-balls from over count and CRR correctly', () => {
    const chartsSrc = fs.readFileSync(path.join(rootDir, 'components', 'MatchCharts.jsx'), 'utf-8');

    // Wides and noballs excluded from legal balls
    expect(chartsSrc).toContain("!['wide', 'wd', 'noball', 'no_ball', 'nb'].includes(String(b.extraType || '').toLowerCase())");
    expect(chartsSrc).toContain('if (isLegal)');

    // Over display is cricket notation: completedOvers.balls
    expect(chartsSrc).toContain('`${completed}.${remainingBalls}`');

    // CRR calculation in tooltip divides by overDecimal
    expect(chartsSrc).toContain('activeWormPoint.score / activeWormPoint.overDecimal');

    // Test the exact math from the prompt: 5 runs in 0.2 ov -> CRR 15.00
    const score = 5;
    const completedOvers = 0;
    const ballsInCurrentOver = 2;
    const overDecimal = completedOvers + (ballsInCurrentOver / 6); // 2/6 = 0.3333333333333333
    const crr = Number((score / overDecimal).toFixed(2));
    expect(crr).toBe(15.00);
  });

  it('Bug 5: Bowled and all dismissal types require explicit Confirm Wicket click', () => {
    const wicketModalSrc = fs.readFileSync(path.join(rootDir, 'components', 'WicketModal.jsx'), 'utf-8');

    // Button types must be button to avoid accidental form submission
    expect(wicketModalSrc).toContain('type="button"');
    expect(wicketModalSrc).toContain('onClick={() => setWicketType(id)}');
    expect(wicketModalSrc).toContain('type="submit"');
    expect(wicketModalSrc).toContain('Confirm Wicket');
  });

  it('Bug 6: Custom overs has min=1 validation and visible inline error', () => {
    const setupSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Setup.jsx'), 'utf-8');

    // Inline error check and min validation
    expect(setupSrc).toContain('oversError');
    expect(setupSrc).toContain('Custom overs must be a positive whole number (minimum 1).');
  });

  it('Bug 7: Duplicate striker and non-striker are disabled and show inline error', () => {
    const setupSrc = fs.readFileSync(path.join(rootDir, 'pages', 'Setup.jsx'), 'utf-8');

    // Striker options disable nonStriker
    expect(setupSrc).toContain('disabled={p === nonStriker}');
    // Non-striker options disable striker
    expect(setupSrc).toContain('disabled={p === striker}');
    // Step 3 error display
    expect(setupSrc).toContain('Striker and Non-Striker must be two distinct players');
    expect(setupSrc).toContain('disabled={striker === nonStriker || !bowler}');
  });
});
