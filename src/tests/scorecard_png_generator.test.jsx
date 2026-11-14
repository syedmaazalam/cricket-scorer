import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ScorecardPNGGenerator from '../components/ScorecardPNGGenerator.jsx';

describe('ScorecardPNGGenerator Component', () => {
  const sampleMatch = {
    code: 'JTTD5S',
    status: 'completed',
    overs: 20,
    playersPerTeam: 11,
    toss: { winner: 'Team Hafiz', decision: 'bat' },
    teams: [
      {
        name: 'Team Hafiz',
        players: ['Hafiz Captain', 'Farhan Star', 'Tariq Opener', 'Bilal Tail']
      },
      {
        name: 'Team Amjad',
        players: ['Amjad Leader', 'Hamza Striker', 'Zaid Quick', 'Usman Spin']
      }
    ],
    innings: [
      {
        battingTeam: 'Team Hafiz',
        bowlingTeam: 'Team Amjad',
        score: 158,
        wickets: 3,
        legalBalls: 90,
        maxOvers: 20,
        balls: [
          {
            striker: 'Farhan Star',
            nonStriker: 'Tariq Opener',
            bowler: 'Zaid Quick',
            runs: 4,
            isLegal: true,
            isWicket: false
          },
          {
            striker: 'Farhan Star',
            nonStriker: 'Tariq Opener',
            bowler: 'Zaid Quick',
            runs: 6,
            isLegal: true,
            isWicket: false
          },
          {
            striker: 'Tariq Opener',
            nonStriker: 'Farhan Star',
            bowler: 'Usman Spin',
            runs: 0,
            isLegal: true,
            isWicket: true,
            wicket: { type: 'bowled', playerOut: 'Tariq Opener', bowler: 'Usman Spin' }
          },
          {
            striker: 'Hafiz Captain',
            nonStriker: 'Farhan Star',
            bowler: 'Usman Spin',
            runs: 1,
            isLegal: true,
            isWicket: false
          }
        ]
      },
      {
        battingTeam: 'Team Amjad',
        bowlingTeam: 'Team Hafiz',
        score: 162,
        wickets: 4,
        legalBalls: 81,
        maxOvers: 20,
        balls: [
          {
            striker: 'Hamza Striker',
            nonStriker: 'Amjad Leader',
            bowler: 'Hafiz Captain',
            runs: 4,
            isLegal: true,
            isWicket: false
          },
          {
            striker: 'Hamza Striker',
            nonStriker: 'Amjad Leader',
            bowler: 'Hafiz Captain',
            runs: 6,
            isLegal: true,
            isWicket: false
          },
          {
            striker: 'Amjad Leader',
            nonStriker: 'Hamza Striker',
            bowler: 'Hafiz Captain',
            runs: 0,
            isLegal: true,
            isWicket: true,
            wicket: { type: 'caught', fielder: 'Farhan Star', playerOut: 'Amjad Leader', bowler: 'Hafiz Captain' }
          }
        ]
      }
    ]
  };

  it('renders hidden canvas when isOpen is false', () => {
    const html = renderToString(
      <ScorecardPNGGenerator
        matchState={sampleMatch}
        isOpen={false}
        onClose={() => {}}
      />
    );
    // When closed, renders a hidden canvas in the DOM ready for export
    expect(html).toContain('SMARTCRICKET');
    expect(html).toContain('z-index:-99999');
  });

  it('renders 3200x1600 canvas with correct data when isOpen is true', () => {
    const html = renderToString(
      <ScorecardPNGGenerator
        matchState={sampleMatch}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Canvas size
    expect(html).toContain('width:3200px');
    expect(html).toContain('height:1600px');

    // Background colors (reference palette)
    expect(html).toContain('061B3A');

    // Header (React SSR may insert <!-- --> comments between adjacent expressions)
    expect(html).toContain('SMARTCRICKET');
    expect(html).toContain('JTTD5S');
    expect(html).toContain('OVERS MATCH');
    expect(html).toContain('Team Hafiz');

    // Result banner — inn2Score (162) > inn1Score (158) → Amjad won
    // 11 - 1 - 4 = 6 wickets margin
    expect(html).toContain('WON BY 6 WICKETS');

    // Innings columns (React SSR inserts <!-- --> between string literal and {innNum})
    expect(html).toContain('INNINGS');
    expect(html).toContain('Team Hafiz');
    expect(html).toContain('Team Amjad');

    // Table headers
    expect(html).toContain('BATSMAN');
    expect(html).toContain('DISMISSAL');

    // Batters rendered
    expect(html).toContain('Farhan Star');
    expect(html).toContain('Tariq Opener');
    expect(html).toContain('b Usman Spin');
    expect(html).toContain('Hamza Striker');
    expect(html).toContain('Amjad Leader');
    expect(html).toContain('c Farhan Star b Hafiz Captain');

    // Bowling section headers (React SSR inserts <!-- --> between text and {expression})
    expect(html).toContain('BOWLING (');
    expect(html).toContain('TEAM AMJAD');
    expect(html).toContain('TEAM HAFIZ');

    // Performance highlights (uppercase in reference design)
    expect(html).toContain('TOP SCORER');
    expect(html).toContain('BEST BOWLER');

    // Modal UI elements
    expect(html).toContain('Cricket Scorecard PNG');
    expect(html).toContain('Download PNG');
    expect(html).toContain('Share');
  });

  it('handles empty match state gracefully without crashing', () => {
    const emptyMatch = {
      code: '',
      innings: []
    };

    const html = renderToString(
      <ScorecardPNGGenerator
        matchState={emptyMatch}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).toContain('SMARTCRICKET');
    // MATCH # + code rendered separately in JSX (React SSR inserts <!-- --> between dynamic nodes)
    expect(html).toContain('MATCH #');
    expect(html).toContain('Yet to bat');  });

  it('handles long player names and custom overs gracefully', () => {
    const longNameMatch = {
      code: 'LNGNAM',
      status: 'completed',
      overs: 10,
      playersPerTeam: 11,
      teams: [
        {
          name: 'Super Giants Royal Cricket Club',
          players: ['Syed Muhammad Abdullah Al-Hussaini', 'Rana Naveed-ul-Hasan Junior']
        },
        {
          name: 'Peshawar Zalmi Academy XI',
          players: ['Mohammad Rizwanullah Khan Khattak', 'Shaheen Shah Afridi The Third']
        }
      ],
      innings: [
        {
          battingTeam: 'Super Giants Royal Cricket Club',
          bowlingTeam: 'Peshawar Zalmi Academy XI',
          score: 85,
          wickets: 1,
          legalBalls: 60,
          balls: [
            {
              striker: 'Syed Muhammad Abdullah Al-Hussaini',
              nonStriker: 'Rana Naveed-ul-Hasan Junior',
              bowler: 'Mohammad Rizwanullah Khan Khattak',
              runs: 6,
              isLegal: true,
              isWicket: false
            }
          ]
        },
        {
          battingTeam: 'Peshawar Zalmi Academy XI',
          bowlingTeam: 'Super Giants Royal Cricket Club',
          score: 100,
          wickets: 2,
          legalBalls: 60,
          balls: [
            {
              striker: 'Mohammad Rizwanullah Khan Khattak',
              nonStriker: 'Shaheen Shah Afridi The Third',
              bowler: 'Syed Muhammad Abdullah Al-Hussaini',
              runs: 4,
              isLegal: true,
              isWicket: false
            }
          ]
        }
      ]
    };

    const html = renderToString(
      <ScorecardPNGGenerator
        matchState={longNameMatch}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(html).toContain('Syed Muhammad Abdullah Al-Hussaini');
    expect(html).toContain('Rana Naveed-ul-Hasan Junior');
    expect(html).toContain('Mohammad Rizwanullah Khan Khattak');
    // React SSR inserts <!-- --> between adjacent expressions, so test separately
    expect(html).toContain('10');
    expect(html).toContain('OVERS MATCH');
    // Inn2 (100) > Inn1 (85): Peshawar won
    expect(html).toContain('WON BY');
  });

  it('strips asterisks from all player names', () => {
    const asteriskMatch = {
      code: 'ASTX',
      overs: 20,
      playersPerTeam: 11,
      teams: [
        { name: '*Team Alpha*', players: ['*Player One*', '*Player Two*'] },
        { name: '*Team Beta*', players: ['*Player Three*', '*Player Four*'] }
      ],
      innings: [
        {
          battingTeam: '*Team Alpha*',
          bowlingTeam: '*Team Beta*',
          score: 100, wickets: 5, legalBalls: 72,
          balls: [{
            striker: '*Player One*',
            nonStriker: '*Player Two*',
            bowler: '*Player Three*',
            runs: 4, isLegal: true, isWicket: false
          }]
        },
        {
          battingTeam: '*Team Beta*',
          bowlingTeam: '*Team Alpha*',
          score: 80, wickets: 10, legalBalls: 72,
          balls: []
        }
      ]
    };

    const html = renderToString(
      <ScorecardPNGGenerator
        matchState={asteriskMatch}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // No asterisks in output
    expect(html).not.toContain('*Player One*');
    expect(html).not.toContain('*Team Alpha*');
    // Stripped names present
    expect(html).toContain('Player One');
    expect(html).toContain('Team Alpha');
  });

  it('computes "not out" in green for not-dismissed batters', () => {
    const html = renderToString(
      <ScorecardPNGGenerator
        matchState={sampleMatch}
        isOpen={true}
        onClose={() => {}}
      />
    );
    // Not-out color #22C55E
    expect(html).toContain('22C55E');
    expect(html).toContain('not out');
  });

  it('matches EXPECTED OUTPUT exactly for SmartCricket_JTTD5S.json', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const jsonPath = path.resolve(__dirname, '../../SmartCricket_JTTD5S.json');
    if (!fs.existsSync(jsonPath)) return;

    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const { computeInningsData, computeResult } = await import('../components/ScorecardPNGGenerator.jsx');
    const ms = raw.matchState;

    // 1. Result Banner
    const result = computeResult(ms.innings[0], ms.innings[1], ms.playersPerTeam, ms.status);
    expect(result).toBe('TEAM AMJAD WON BY 6 WICKETS');

    // 2. Innings 1
    const inn1 = computeInningsData(ms.innings[0]);
    expect(inn1.topScorer.name).toBe('Saptain');
    expect(inn1.topScorer.runs).toBe(45);
    expect(inn1.bestBowler.name).toBe('Rizwan( Wajid Bhai Ka Friend)');
    expect(inn1.bestBowler.wickets).toBe(4);
    expect(inn1.bestBowler.runs).toBe(22);
    expect(inn1.extras.total).toBe(19);
    expect(inn1.extras.wides).toBe(19);

    // Batters check
    const b1 = inn1.batters;
    expect(b1[0].name).toBe('Ahil');
    expect(b1[0].runs).toBe(6);
    expect(b1[0].balls).toBe(2);
    expect(b1[0].fours).toBe(0);
    expect(b1[0].sixes).toBe(1);
    expect(b1[0].dismissal).toBe('c Mehdi b Hafiz Captain');

    expect(b1[1].name).toBe('Abdullah');
    expect(b1[1].runs).toBe(36);
    expect(b1[1].balls).toBe(26);
    expect(b1[1].fours).toBe(1);
    expect(b1[1].sixes).toBe(3);
    expect(b1[1].dismissal).toBe('c Amjad Captain b Rizwan( Wajid Bhai Ka Friend)');

    expect(b1[2].name).toBe('Saptain');
    expect(b1[2].runs).toBe(45);
    expect(b1[2].balls).toBe(16);
    expect(b1[2].fours).toBe(0);
    expect(b1[2].sixes).toBe(5);
    expect(b1[2].dismissal).toBe('c Zain b Mehdi');

    expect(b1[9].name).toBe('Malik Shehzad');
    expect(b1[9].runs).toBe(6);
    expect(b1[9].balls).toBe(3);
    expect(b1[9].fours).toBe(1);
    expect(b1[9].sixes).toBe(0);
    expect(b1[9].dismissal).toBe('not out');

    // Bowlers check
    const bw1 = inn1.bowlers;
    expect(bw1.find(b => b.name === 'Hafiz Captain')).toMatchObject({ legalBalls: 6, runs: 13, wickets: 1 });
    expect(bw1.find(b => b.name === 'Rizwan( Wajid Bhai Ka Friend)')).toMatchObject({ legalBalls: 17, runs: 22, wickets: 4 });
    expect(bw1.find(b => b.name === 'Aftab')).toMatchObject({ legalBalls: 18, runs: 14, wickets: 1 });

    // 3. Innings 2
    const inn2 = computeInningsData(ms.innings[1]);
    expect(inn2.topScorer.name).toBe('Huzzy');
    expect(inn2.topScorer.runs).toBe(60);
    expect(inn2.bestBowler.name).toBe('Abdullah');
    expect(inn2.bestBowler.wickets).toBe(2);
    expect(inn2.bestBowler.runs).toBe(16);
    expect(inn2.extras.total).toBe(14);
    expect(inn2.extras.wides).toBe(12);
    expect(inn2.extras.noBalls).toBe(2);

    const b2 = inn2.batters;
    expect(b2[0].name).toBe('Mehdi');
    expect(b2[0].runs).toBe(55);
    expect(b2[0].balls).toBe(24);
    expect(b2[0].fours).toBe(4);
    expect(b2[0].sixes).toBe(5);
    expect(b2[0].dismissal).toBe('c Wajid b Abdullah');

    expect(b2[1].name).toBe('Hassan');
    expect(b2[1].runs).toBe(0);
    expect(b2[1].balls).toBe(1);
    expect(b2[1].dismissal).toBe('run out (direct hit)');

    expect(b2[2].name).toBe('Huzzy');
    expect(b2[2].runs).toBe(60);
    expect(b2[2].balls).toBe(29);
    expect(b2[2].fours).toBe(1);
    expect(b2[2].sixes).toBe(8);
    expect(b2[2].dismissal).toBe('not out');

    // Bowlers Inn 2 check
    const bw2 = inn2.bowlers;
    expect(bw2.find(b => b.name === 'Abdullah')).toMatchObject({ legalBalls: 12, runs: 16, wickets: 2 });
    expect(bw2.find(b => b.name === 'Wajid')).toMatchObject({ legalBalls: 12, runs: 48, wickets: 1 });

    // Render full HTML
    const html = renderToString(<ScorecardPNGGenerator matchState={raw} isOpen={true} onClose={() => {}} />);
    expect(html).toContain('TEAM AMJAD WON BY 6 WICKETS');
    expect(html).toContain('Saptain (45)');
    expect(html).toContain('Huzzy (60)');
    expect(html).toContain('Abdullah (2/16)');
    expect(html).toContain('Rizwan( Wajid Bhai Ka Friend) (4/22)');
  });
});
