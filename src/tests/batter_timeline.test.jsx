import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { computeBatterDetails } from '../engine/stats.js';
import BatterDetailsModal from '../components/BatterDetailsModal.jsx';

describe('Batsman Delivery Timeline in BatterDetailsModal & stats.js', () => {
  const dummyInnings = {
    battingTeam: 'Team Alpha',
    bowlingTeam: 'Team Bravo',
    score: 45,
    wickets: 1,
    legalBalls: 18,
    balls: [
      // Ball 1: Babar faces dot ball
      { striker: 'Babar', nonStriker: 'Rizwan', bowler: 'Starc', runs: 0, isLegal: true, legalBallNumber: 1 },
      // Ball 2: Starc bowls a wide (NOT faced/played by Babar)
      { striker: 'Babar', nonStriker: 'Rizwan', bowler: 'Starc', runs: 0, extraType: 'wide', isLegal: false },
      // Ball 3: Babar hits a four
      { striker: 'Babar', nonStriker: 'Rizwan', bowler: 'Starc', runs: 4, isLegal: true, legalBallNumber: 2 },
      // Ball 4: Babar takes single
      { striker: 'Babar', nonStriker: 'Rizwan', bowler: 'Starc', runs: 1, isLegal: true, legalBallNumber: 3 },
      // Ball 5: Rizwan faces dot (NOT Babar)
      { striker: 'Rizwan', nonStriker: 'Babar', bowler: 'Starc', runs: 0, isLegal: true, legalBallNumber: 4 },
      // Ball 6: Babar hits no-ball for 6!
      { striker: 'Babar', nonStriker: 'Rizwan', bowler: 'Starc', runs: 6, extraType: 'no_ball', isLegal: false },
      // Ball 7: Babar is caught out
      {
        striker: 'Babar',
        nonStriker: 'Rizwan',
        bowler: 'Starc',
        runs: 0,
        isLegal: true,
        legalBallNumber: 5,
        isWicket: true,
        wicket: { type: 'caught', playerOut: 'Babar' }
      }
    ]
  };

  it('computeBatterDetails excludes wides from batsman balls played timeline', () => {
    const details = computeBatterDetails(dummyInnings, 'Babar');
    expect(details).toBeTruthy();
    expect(details.name).toBe('Babar');

    // Total balls played by Babar:
    // Ball 1 (dot), Ball 3 (4), Ball 4 (1), Ball 6 (Nb+6), Ball 7 (W) -> exactly 5 deliveries played!
    // Wide (Ball 2) must be excluded, and Rizwan's ball (Ball 5) must be excluded.
    expect(details.timeline.length).toBe(5);

    expect(details.timeline[0].runs).toBe(0);
    expect(details.timeline[0].isDot).toBe(true);

    expect(details.timeline[1].runs).toBe(4);
    expect(details.timeline[1].isFour).toBe(true);

    expect(details.timeline[2].runs).toBe(1);

    expect(details.timeline[3].runs).toBe(6);
    expect(details.timeline[3].extraType).toBe('no_ball');
    expect(details.timeline[3].shortLabel).toBe('Nb+6');

    expect(details.timeline[4].isWicket).toBe(true);
    expect(details.timeline[4].shortLabel).toBe('W');
  });

  it('renders Batsman Delivery Timeline title and chips in BatterDetailsModal', () => {
    const html = renderToString(
      <BatterDetailsModal
        batterName="Babar"
        innings={dummyInnings}
        onClose={() => {}}
      />
    );

    // Verify Title: Batsman Delivery Timeline
    expect(html).toContain('Batsman Delivery Timeline');

    // Verify balls played counter
    expect(html).toContain('5 balls played');

    // Verify chips contain score-based labels
    expect(html).toContain('>W<');
    expect(html).toContain('>Nb+6<');
    expect(html).toContain('>4<');
    expect(html).toContain('>1<');
    expect(html).toContain('>0<');

    // Verify circular chip classes
    expect(html).toContain('bl shrink-0');
    expect(html).toContain('rounded-full');
  });
});
