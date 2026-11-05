import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import WicketModal from '../components/WicketModal.jsx';
import BowlerModal from '../components/BowlerModal.jsx';
import NewBatterModal from '../components/NewBatterModal.jsx';
import InningsBreakModal from '../components/InningsBreakModal.jsx';
import OverthrowModal from '../components/OverthrowModal.jsx';
import TimeDeclareModal from '../components/TimeDeclareModal.jsx';

describe('UI Verification: Core Match Modals & Dialogs', () => {
  describe('WicketModal', () => {
    it('returns empty string when closed', () => {
      const html = renderToString(
        <WicketModal
          isOpen={false}
          onClose={() => {}}
          striker="Babar"
          nonStriker="Rizwan"
          bowler="Shaheen"
          onConfirmWicket={() => {}}
        />
      );
      expect(html).toBe('');
    });

    it('renders dismissal options when open', () => {
      const html = renderToString(
        <WicketModal
          isOpen={true}
          onClose={() => {}}
          striker="Babar"
          nonStriker="Rizwan"
          bowler="Shaheen"
          bowlingTeamPlayers={['Shaheen', 'Naseem', 'Haris']}
          availableBatters={['Fakhar', 'Shadab']}
          isFreeHit={false}
          onConfirmWicket={() => {}}
        />
      );

      expect(html).toContain('Record Wicket');
      expect(html).toContain('Bowled');
      expect(html).toContain('Caught');
      expect(html).toContain('LBW');
      expect(html).toContain('Run Out');
      expect(html).toContain('Stumped');
      expect(html).toContain('Babar');
      expect(html).toContain('Rizwan');
    });

    it('displays free hit warning and disables non-run-out wickets during Free Hit', () => {
      const html = renderToString(
        <WicketModal
          isOpen={true}
          onClose={() => {}}
          striker="Babar"
          nonStriker="Rizwan"
          bowler="Shaheen"
          isFreeHit={true}
          onConfirmWicket={() => {}}
        />
      );

      expect(html).toContain('Free hit active: Only Run Out');
      expect(html).toContain('line-through');
    });
  });

  describe('BowlerModal', () => {
    it('returns empty string when closed', () => {
      const html = renderToString(
        <BowlerModal
          isOpen={false}
          bowlers={['Shaheen', 'Naseem']}
          onSelectBowler={() => {}}
        />
      );
      expect(html).toBe('');
    });

    it('renders candidate bowlers and prevents consecutive over by previous bowler', () => {
      const html = renderToString(
        <BowlerModal
          isOpen={true}
          bowlers={['Shaheen', 'Naseem', 'Haris']}
          previousBowler="Shaheen"
          onSelectBowler={() => {}}
        />
      );

      expect(html).toContain('Select Next Bowler');
      expect(html).toContain('Naseem');
      expect(html).toContain('Haris');
      expect(html).toContain('Last Over');
      expect(html).toContain('Add / Type Different Bowler');
    });
  });

  describe('NewBatterModal', () => {
    it('returns empty string when closed', () => {
      const html = renderToString(
        <NewBatterModal
          isOpen={false}
          vacantSlot="striker"
          availableBatters={['Fakhar', 'Iftikhar']}
          onSelectBatter={() => {}}
        />
      );
      expect(html).toBe('');
    });

    it('renders vacant slot label and candidate batters', () => {
      const htmlStriker = renderToString(
        <NewBatterModal
          isOpen={true}
          vacantSlot="striker"
          availableBatters={['Fakhar', 'Iftikhar']}
          onSelectBatter={() => {}}
        />
      );
      expect(htmlStriker).toContain('Select Incoming Batter');
      expect(htmlStriker).toContain("Striker&#x27;s end");
      expect(htmlStriker).toContain('Fakhar');
      expect(htmlStriker).toContain('Iftikhar');

      const htmlNonStriker = renderToString(
        <NewBatterModal
          isOpen={true}
          vacantSlot="nonStriker"
          availableBatters={['Fakhar']}
          onSelectBatter={() => {}}
          onUndoWicket={() => {}}
        />
      );
      expect(htmlNonStriker).toContain("Non-Striker&#x27;s end");
      expect(htmlNonStriker).toContain('Undo Wicket');
    });
  });

  describe('InningsBreakModal', () => {
    it('returns empty string when closed', () => {
      const html = renderToString(
        <InningsBreakModal
          isOpen={false}
          firstInnings={{ score: 180, wickets: 4, legalBalls: 120 }}
          target={181}
          battingTeam="Lahore Qalandars"
          bowlingTeam="Karachi Kings"
          onStartSecondInnings={() => {}}
        />
      );
      expect(html).toBe('');
    });

    it('displays target, required run rate and 2nd innings lineup inputs', () => {
      const html = renderToString(
        <InningsBreakModal
          isOpen={true}
          firstInnings={{ score: 180, wickets: 4, legalBalls: 120, maxOvers: 20 }}
          target={181}
          battingTeam="Karachi Kings"
          bowlingTeam="Lahore Qalandars"
          battingTeamSquad={['Shan Masood', 'James Vince', 'Shoaib Malik']}
          bowlingTeamSquad={['Shaheen Afridi', 'Haris Rauf', 'Zaman Khan']}
          onStartSecondInnings={() => {}}
        />
      );

      expect(html).toContain('Innings Break');
      expect(html).toContain('181');
      expect(html).toContain('runs');
      expect(html).toContain('Opening Striker');
      expect(html).toContain('Opening Non-Striker');
      expect(html).toContain('Opening Bowler');
      expect(html).toContain('Start 2nd Innings');
    });
  });

  describe('OverthrowModal', () => {
    it('returns empty string when closed', () => {
      const html = renderToString(
        <OverthrowModal
          isOpen={false}
          onClose={() => {}}
          onScoreBall={() => {}}
          striker="Babar"
          nonStriker="Rizwan"
          currentBowler="Shaheen"
        />
      );
      expect(html).toBe('');
    });

    it('renders physical runs, overthrow choices, and delivery types', () => {
      const html = renderToString(
        <OverthrowModal
          isOpen={true}
          onClose={() => {}}
          onScoreBall={() => {}}
          striker="Babar"
          nonStriker="Rizwan"
          currentBowler="Shaheen"
        />
      );

      expect(html).toContain('Record Overthrow Delivery');
      expect(html).toContain('1. Delivery Type');
      expect(html).toContain('Off Bat');
      expect(html).toContain('Wide');
      expect(html).toContain('No Ball');
      expect(html).toContain('Runs Overthrow');
    });
  });

  describe('TimeDeclareModal', () => {
    it('returns empty string when closed or missing match state', () => {
      const html = renderToString(
        <TimeDeclareModal
          isOpen={false}
          matchState={null}
          onClose={() => {}}
          onConfirmRetire={() => {}}
        />
      );
      expect(html).toBe('');
    });

    it('renders retiring batsman selection and bench players', () => {
      const mockMatchState = {
        striker: 'Babar Azam',
        nonStriker: 'Mohammad Rizwan',
        currentInningsIndex: 0,
        teams: [
          { name: 'Team Green', players: ['Babar Azam', 'Mohammad Rizwan', 'Fakhar Zaman', 'Saim Ayub'] },
          { name: 'Team Blue', players: ['Player X', 'Player Y'] }
        ],
        innings: [
          {
            battingTeam: 'Team Green',
            balls: []
          }
        ]
      };

      const html = renderToString(
        <TimeDeclareModal
          isOpen={true}
          matchState={mockMatchState}
          onClose={() => {}}
          onConfirmRetire={() => {}}
        />
      );

      expect(html).toContain('1. Choose Batter Retiring');
      expect(html).toContain('Babar Azam');
      expect(html).toContain('Mohammad Rizwan');
      expect(html).toContain('3. Select Incoming Batter');
      expect(html).toContain('Fakhar Zaman');
      expect(html).toContain('Saim Ayub');
    });
  });
});
