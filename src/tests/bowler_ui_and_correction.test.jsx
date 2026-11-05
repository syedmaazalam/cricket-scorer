import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import BowlerModal from '../components/BowlerModal.jsx';
import EditBallModal from '../components/EditBallModal.jsx';
import RunPad from '../components/RunPad.jsx';

describe('Chunks 2, 3 & 4: Bowler UI, Mandatory Modal & EditBallModal', () => {
  describe('BowlerModal Enhancements (Chunks 2 & 3)', () => {
    it('renders blocking mandatory modal at over end with Undo Last Ball option and no close button', () => {
      const html = renderToString(
        <BowlerModal
          isOpen={true}
          bowlers={['Shaheen', 'Naseem', 'Haris']}
          bowlersSquad={['Shaheen', 'Naseem', 'Haris']}
          previousBowler="Shaheen"
          onSelectBowler={() => {}}
          onUndo={() => {}}
          isMandatory={true}
        />
      );

      expect(html).toContain('Over Complete — Select Next Bowler');
      expect(html).toContain('Undo Last Ball (Reopen Over)');
      // Cannot bowl consecutive overs: Shaheen is marked Last Over and disabled
      expect(html).toContain('Last Over');
      expect(html).toContain('Naseem');
      expect(html).toContain('Haris');
      // No close button when mandatory
      expect(html).not.toContain('aria-label="Close"');
    });

    it('renders non-mandatory modal with close button when opened voluntarily mid-over', () => {
      const html = renderToString(
        <BowlerModal
          isOpen={true}
          bowlers={['Shaheen', 'Naseem', 'Haris']}
          bowlersSquad={['Shaheen', 'Naseem', 'Haris']}
          previousBowler="Shaheen"
          title="Select Replacement Bowler (Split Over)"
          onSelectBowler={() => {}}
          onClose={() => {}}
          isMandatory={false}
        />
      );

      expect(html).toContain('Select Replacement Bowler (Split Over)');
      expect(html).toContain('aria-label="Close"');
    });
  });

  describe('RunPad Lockout & Cross-Over Undo (Chunk 2)', () => {
    it('disables scoring keys while allowing Undo when needsBowlerChange is active', () => {
      const html = renderToString(
        <RunPad
          onScoreBall={() => {}}
          onOpenWicket={() => {}}
          onOpenOverthrow={() => {}}
          onSwapBatter={() => {}}
          onUndo={() => {}}
          isFreeHit={false}
          disabled={true} // Scoring disabled because needsBowlerChange or no bowler
          disableUndo={false} // Undo explicitly enabled
        />
      );

      // Scoring buttons should be disabled
      expect(html).toContain('disabled=""');
      // Undo button is present and not disabled
      expect(html).toContain('Undo');
      expect(html).toContain('aria-label="Undo last ball"');
    });
  });

  describe('EditBallModal with Editable Bowler Dropdown (Chunk 4)', () => {
    it('renders bowler as an editable select dropdown populated from bowlingSquad', () => {
      const sampleBall = {
        ballId: 'ball_1',
        seq: 1,
        bowler: 'Shaheen',
        striker: 'Rohit',
        nonStriker: 'Gill',
        runs: 4,
        extraType: null,
        extraRuns: 0,
        isLegal: true,
        isWicket: false,
        shortLabel: '4'
      };

      const html = renderToString(
        <EditBallModal
          isOpen={true}
          onClose={() => {}}
          initialBall={sampleBall}
          allBalls={[sampleBall]}
          onSaveBall={() => {}}
          strikerSquad={['Rohit', 'Gill', 'Kohli']}
          bowlingSquad={['Shaheen', 'Naseem', 'Haris', 'Shadab']}
        />
      );

      expect(html).toContain('Edit Ball Score');
      expect(html).toContain('Bowler:');
      expect(html).toContain('+ Custom Bowler');
      // Dropdown contains bowling squad options
      expect(html).toContain('<select');
      expect(html).toContain('value="Shaheen"');
      expect(html).toContain('Shaheen');
      expect(html).toContain('(Original)');
      expect(html).toContain('Naseem');
      expect(html).toContain('Haris');
      expect(html).toContain('Shadab');
    });
  });
});
