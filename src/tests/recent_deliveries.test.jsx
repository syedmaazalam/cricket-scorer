import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Live from '../pages/Live.jsx';

describe('Recent Deliveries Score-Based Styling & Animation in Live Screen', () => {
  const dummyState = {
    code: 'LIVE99',
    status: 'in_progress',
    overs: 20,
    striker: 'Babar Azam',
    nonStriker: 'Mohammad Rizwan',
    currentBowler: 'Shaheen Afridi',
    teams: [
      { name: 'Team Alpha', players: ['Babar Azam', 'Mohammad Rizwan'] },
      { name: 'Team Bravo', players: ['Shaheen Afridi', 'Haris Rauf'] }
    ],
    innings: [
      {
        battingTeam: 'Team Alpha',
        bowlingTeam: 'Team Bravo',
        score: 35,
        wickets: 1,
        legalBalls: 12,
        balls: [
          { ballId: 'b1', runs: 0, isLegal: true },
          { ballId: 'b2', runs: 1, isLegal: true },
          { ballId: 'b3', runs: 4, isLegal: true },
          { ballId: 'b4', runs: 6, isLegal: true },
          { ballId: 'b5', runs: 0, isWicket: true, isLegal: true },
          { ballId: 'b6', runs: 0, extraType: 'wide', isLegal: false },
          { ballId: 'b7', runs: 4, extraType: 'no_ball', isLegal: false }
        ]
      }
    ]
  };

  it('renders Recent Deliveries chips with score-based colors and animate-ball-scale-in', () => {
    const html = renderToString(
      <Live
        matchState={dummyState}
        matchCodeOrId="LIVE99"
        onBack={() => {}}
      />
    );

    // Verify section title
    expect(html).toContain('Recent Deliveries');

    // Verify chips contain color-blind accessibility labels
    expect(html).toContain('>W<');
    expect(html).toContain('>Wd<');
    expect(html).toContain('>Nb+4<');
    expect(html).toContain('>6<');
    expect(html).toContain('>4<');
    expect(html).toContain('>1<');
    expect(html).toContain('>0<');

    // Verify animate-ball-scale-in class and bl class
    expect(html).toContain('animate-ball-scale-in');
    expect(html).toContain('bl shrink-0');
  });
});
