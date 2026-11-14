import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import MatchSummaryImageGenerator from '../components/MatchSummaryImageGenerator.jsx';
import { exportAndSaveImage } from '../engine/nativeExport.js';

describe('Match Summary Badges Vertical Alignment', () => {
  const dummyMatch = {
    code: 'TEST01',
    status: 'in_progress',
    overs: 20,
    teams: [
      { name: 'Team Alpha', players: ['Player 1', 'Player 2'] },
      { name: 'Team Bravo', players: ['Player 3', 'Player 4'] }
    ],
    innings: [
      {
        battingTeam: 'Team Alpha',
        bowlingTeam: 'Team Bravo',
        score: 41,
        wickets: 0,
        legalBalls: 30,
        balls: [
          { striker: 'Player 1', bowler: 'Player 3', runs: 4, isLegal: true },
          { striker: 'Player 1', bowler: 'Player 3', runs: 1, isLegal: true }
        ]
      },
      {
        battingTeam: 'Team Bravo',
        bowlingTeam: 'Team Alpha',
        score: 0,
        wickets: 0,
        legalBalls: 0,
        balls: []
      }
    ]
  };

  it('renders MatchSummaryImageGenerator with fixed height, equal line-height, and vertical-align middle on pill badges', () => {
    const html = renderToString(
      <MatchSummaryImageGenerator
        matchState={dummyMatch}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Verify canvas exists
    expect(html).toContain('ms-canvas');

    // Verify TeamPillBadge renders with fixed height 28px, padding 0 12px, line-height 28px, vertical-align middle, overflow visible
    expect(html).toContain('vertical-align:middle');
    expect(html).toContain('height:28px');
    expect(html).toContain('line-height:28px');
    expect(html).toContain('padding:0 12px');
    expect(html).toContain('overflow:visible');

    // Verify table cells have vertical-align:middle
    expect(html).toContain('vertical-align:middle');

    // Verify Result Pill ("Match In Progress • Team Alpha 41/0") has fixed height 42px, line-height 42px, padding 0 32px
    expect(html).toContain('height:42px');
    expect(html).toContain('line-height:42px');
    expect(html).toContain('padding:0 32px');

    // Verify Team Alpha and Team Bravo toggle tabs have fixed height 32px, line-height 32px, padding 0 16px
    expect(html).toContain('height:32px');
    expect(html).toContain('line-height:32px');
    expect(html).toContain('padding:0 16px');

    // Verify ms-pill-centered and ms-pill-text classes are present on pill elements
    expect(html).toContain('ms-pill-centered');
    expect(html).toContain('ms-pill-text');
  });

  it('renders Top Performer banner, pill badges, and scales with 11 players without clipping or fixed height', () => {
    const elevenBattersBalls = Array.from({ length: 11 }, (_, i) => ({
      striker: `Batter ${i + 1}`,
      bowler: `Bowler ${(i % 5) + 1}`,
      runs: 4,
      isLegal: true
    }));

    const fullMatch = {
      ...dummyMatch,
      innings: [
        {
          battingTeam: 'Team Alpha',
          bowlingTeam: 'Team Bravo',
          score: 120,
          wickets: 10,
          legalBalls: 60,
          balls: elevenBattersBalls
        },
        dummyMatch.innings[1]
      ]
    };

    const topPerformer = {
      name: 'Alpha Star',
      team: 'Team Alpha',
      totalPoints: 35,
      batting: { runs: 25, balls: 6, fours: 0, sixes: 3 },
      bowling: { wickets: 2, runsConceded: 14, legalBalls: 12 }
    };

    const html = renderToString(
      <MatchSummaryImageGenerator
        matchState={fullMatch}
        topPerformer={topPerformer}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Top Performer banner must be present
    expect(html).toContain('Top Performer · Player of the Match');
    expect(html).toContain('Points');
    expect(html).toContain(String(topPerformer.totalPoints));
    expect(html).toContain('Batting:');
    expect(html).toContain('Bowling:');

    // Top 4 batters must be rendered in Top 4 card
    for (let i = 1; i <= 4; i++) {
      expect(html).toContain(`Batter\u00A0${i}`);
    }
    // Batters beyond 4 are excluded from Top 4 table
    expect(html).not.toContain(`Batter\u00A05`);

    // Verify Top 4 headers (using non-breaking space matching toNbsp)
    expect(html).toContain('Top\u00A04\u00A0Batters\u00A0–\u00A0Team\u00A0Alpha');
    expect(html).toContain('Top\u00A04\u00A0Batters\u00A0–\u00A0Team\u00A0Bravo');
    expect(html).toContain('Top\u00A04\u00A0Bowlers\u00A0–\u00A0Team\u00A0Alpha');
    expect(html).toContain('Top\u00A04\u00A0Bowlers\u00A0–\u00A0Team\u00A0Bravo');

    // Canvas must use min-height and NOT have overflow:hidden or fixed height:1080px
    expect(html).toContain('min-height:1080px');
    expect(html).not.toMatch(/ms-canvas[^>]*overflow:hidden/);
    expect(html).not.toMatch(/ms-canvas[^>]*\sstyle="[^"]*(?<!min-)height:1080px/);
  });

  it('renders Download PNG and Share buttons in MatchSummaryImageGenerator modal', () => {
    const html = renderToString(
      <MatchSummaryImageGenerator
        matchState={dummyMatch}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).toContain('Download PNG');
    expect(html).toContain('Share');
    expect(html).toContain('Download Infographic PNG directly without sharing');
  });

  it('exportAndSaveImage with downloadOnly:true strictly bypasses navigator.share and performs direct download', async () => {
    let shareCalled = false;
    let clickedDownload = false;
    let downloadFileName = '';

    const prevWindow = globalThis.window;
    const prevDocument = globalThis.document;

    globalThis.window = { ScorecardBridge: null };
    globalThis.document = {
      createElement: () => ({
        download: '',
        href: '',
        click: function () {
          clickedDownload = true;
          downloadFileName = this.download;
        }
      }),
      body: { appendChild: () => {}, removeChild: () => {} }
    };

    const origShare = globalThis.navigator?.share;
    const origCanShare = globalThis.navigator?.canShare;

    Object.defineProperty(globalThis.navigator, 'share', {
      value: async () => { shareCalled = true; },
      configurable: true,
      writable: true
    });
    Object.defineProperty(globalThis.navigator, 'canShare', {
      value: () => true,
      configurable: true,
      writable: true
    });

    try {
      const dummyDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = await exportAndSaveImage(dummyDataUrl, 'test_summary.png', 'Test Title', { downloadOnly: true });

      expect(shareCalled).toBe(false);
      expect(clickedDownload).toBe(true);
      expect(downloadFileName).toBe('test_summary.png');
      expect(result.success).toBe(true);
    } finally {
      if (origShare) {
        Object.defineProperty(globalThis.navigator, 'share', { value: origShare, configurable: true });
      } else {
        delete globalThis.navigator.share;
      }
      if (origCanShare) {
        Object.defineProperty(globalThis.navigator, 'canShare', { value: origCanShare, configurable: true });
      } else {
        delete globalThis.navigator.canShare;
      }
      globalThis.window = prevWindow;
      globalThis.document = prevDocument;
    }
  });

  it('exportAndSaveImage with shareOnly:true triggers navigator.share when available', async () => {
    let sharedPayload = null;
    const prevWindow = globalThis.window;
    globalThis.window = { ScorecardBridge: null };

    const origShare = globalThis.navigator?.share;
    const origCanShare = globalThis.navigator?.canShare;

    Object.defineProperty(globalThis.navigator, 'share', {
      value: async (payload) => { sharedPayload = payload; },
      configurable: true,
      writable: true
    });
    Object.defineProperty(globalThis.navigator, 'canShare', {
      value: () => true,
      configurable: true,
      writable: true
    });

    try {
      const dummyDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = await exportAndSaveImage(dummyDataUrl, 'test_share.png', 'Test Title', { shareOnly: true });

      expect(sharedPayload).not.toBeNull();
      expect(sharedPayload.title).toBe('Test Title');
      expect(result.success).toBe(true);
      expect(result.method).toBe('share');
    } finally {
      if (origShare) {
        Object.defineProperty(globalThis.navigator, 'share', { value: origShare, configurable: true });
      } else {
        delete globalThis.navigator.share;
      }
      if (origCanShare) {
        Object.defineProperty(globalThis.navigator, 'canShare', { value: origCanShare, configurable: true });
      } else {
        delete globalThis.navigator.canShare;
      }
      globalThis.window = prevWindow;
    }
  });
});
