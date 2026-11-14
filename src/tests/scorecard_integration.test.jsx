import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import MatchSummary from '../pages/MatchSummary.jsx';
import Scorecard from '../pages/Scorecard.jsx';

describe('Scorecard PNG Integration into Match Pages', () => {
  const mockMatch = {
    code: 'INTG01',
    status: 'completed',
    overs: 20,
    teams: [
      { name: 'Team Alpha', players: ['Player 1', 'Player 2'] },
      { name: 'Team Bravo', players: ['Player 3', 'Player 4'] }
    ],
    innings: [
      {
        battingTeam: 'Team Alpha',
        bowlingTeam: 'Team Bravo',
        score: 120,
        wickets: 2,
        legalBalls: 60,
        balls: []
      },
      {
        battingTeam: 'Team Bravo',
        bowlingTeam: 'Team Alpha',
        score: 121,
        wickets: 1,
        legalBalls: 55,
        balls: []
      }
    ]
  };

  it('renders Scorecard PNG action button in MatchSummary.jsx', () => {
    const html = renderToString(
      <MatchSummary
        matchState={mockMatch}
        onBack={() => {}}
      />
    );

    expect(html).toContain('Scorecard PNG');
    expect(html).toContain('Generate Premium Scorecard PNG (16:8)');
    expect(html).toContain('Infographic');
  });

  it('renders Scorecard PNG action button in Scorecard.jsx', () => {
    const html = renderToString(
      <Scorecard
        matchState={mockMatch}
        onBack={() => {}}
        onOpenSummary={() => {}}
      />
    );

    expect(html).toContain('Scorecard PNG');
    expect(html).toContain('Generate Premium Scorecard PNG (16:8)');
    expect(html).toContain('Infographic');
    expect(html).toContain('Full Summary');
    // Verify responsive toolbar layout classes
    expect(html).toContain('flex-col sm:flex-row');
  });
});
