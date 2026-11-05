import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import RunPad from '../components/RunPad.jsx';
import BottomNavBar from '../components/BottomNavBar.jsx';
import SyncBadge from '../components/SyncBadge.jsx';
import MoreMenuModal from '../components/MoreMenuModal.jsx';

describe('UI Verification: Navigation, RunPad & Interactive Controls', () => {
  describe('RunPad Component', () => {
    it('renders standard run keypad (0, 1, 2, 3, 4, 6)', () => {
      const html = renderToString(
        <RunPad
          onScoreBall={() => {}}
          onOpenWicket={() => {}}
          onOpenOverthrow={() => {}}
          onSwapBatter={() => {}}
          onUndo={() => {}}
        />
      );

      expect(html).toContain('0 runs dot');
      expect(html).toContain('1 run');
      expect(html).toContain('2 runs');
      expect(html).toContain('3 runs');
      expect(html).toContain('4 runs');
      expect(html).toContain('6 runs');
    });

    it('renders control buttons (Wicket, Overthrow, Undo, Swap)', () => {
      const html = renderToString(
        <RunPad
          onScoreBall={() => {}}
          onOpenWicket={() => {}}
          onOpenOverthrow={() => {}}
          onSwapBatter={() => {}}
          onUndo={() => {}}
        />
      );

      expect(html).toContain('Wicket');
      expect(html).toContain('Overthrow');
      expect(html).toContain('Undo');
      expect(html).toContain('Swap');
    });

    it('renders Free Hit banner when isFreeHit is true', () => {
      const html = renderToString(
        <RunPad
          isFreeHit={true}
          onScoreBall={() => {}}
        />
      );

      expect(html).toContain('FREE HIT BALL');
    });

    it('renders cooldown banner and disables keypad when cooldownSeconds > 0', () => {
      const html = renderToString(
        <RunPad
          cooldownSeconds={7}
          onSkipCooldown={() => {}}
          onScoreBall={() => {}}
        />
      );

      expect(html).toContain('10-second waiting time active');
      expect(html).toContain('7');
      expect(html).toContain('Next ball in');
      expect(html).toContain('Skip');
      expect(html).toContain('disabled=""');
    });

    it('disables all buttons when disabled prop is true', () => {
      const html = renderToString(
        <RunPad
          disabled={true}
          onScoreBall={() => {}}
        />
      );

      expect(html).toContain('disabled=""');
      expect(html).toContain('opacity-50');
    });
  });

  describe('BottomNavBar Component', () => {
    it('renders all 5 navigation tabs', () => {
      const html = renderToString(
        <BottomNavBar
          activeTab="score"
          onSelectTab={() => {}}
        />
      );

      expect(html).toContain('Score');
      expect(html).toContain('Scorecard');
      expect(html).toContain('More');
      expect(html).toContain('Teams');
      expect(html).toContain('Settings');
    });

    it('sets aria-current="page" on active tab', () => {
      const htmlScorecard = renderToString(
        <BottomNavBar
          activeTab="scorecard"
          onSelectTab={() => {}}
        />
      );

      expect(htmlScorecard).toContain('aria-current="page"');
    });

    it('highlights More tab when isMoreOpen is true', () => {
      const htmlMore = renderToString(
        <BottomNavBar
          activeTab="score"
          isMoreOpen={true}
          onToggleMore={() => {}}
        />
      );

      expect(htmlMore).toContain('aria-current="page"');
    });
  });

  describe('SyncBadge Component', () => {
    it('renders Live state when synchronized', () => {
      const html = renderToString(
        <SyncBadge syncStatus={{ status: 'synced', pendingCount: 0 }} />
      );

      expect(html).toContain('Live');
      expect(html).toContain('animate-ping');
    });

    it('renders Syncing state with pending count and spinner', () => {
      const html = renderToString(
        <SyncBadge syncStatus={{ status: 'syncing', pendingCount: 3 }} />
      );

      expect(html).toContain('Syncing');
      expect(html).toContain('3');
      expect(html).toContain('animate-spin');
    });

    it('renders Offline state with pending count and WifiOff icon', () => {
      const html = renderToString(
        <SyncBadge syncStatus={{ status: 'offline', pendingCount: 5 }} />
      );

      expect(html).toContain('Offline');
      expect(html).toContain('5');
    });
  });

  describe('MoreMenuModal Component', () => {
    it('returns empty string when closed', () => {
      const html = renderToString(
        <MoreMenuModal isOpen={false} onClose={() => {}} />
      );
      expect(html).toBe('');
    });

    it('renders all scorer tools with plain-English descriptive subtitles for scorers', () => {
      const html = renderToString(
        <MoreMenuModal
          isOpen={true}
          onClose={() => {}}
          isViewer={false}
        />
      );

      expect(html).toContain('Scorer Controls &amp; Tools');
      expect(html).toContain('Edit Ball Score');
      expect(html).toContain('Fix runs, extras, or wickets on previous balls');
      expect(html).toContain('Action Audit Logs');
      expect(html).toContain('Review complete history of undos and ball events');
      expect(html).toContain('Pointing System Criteria');
    });

    it('hides scorer-only controls (Edit Ball, Action Logs, Time Declare, Declare Innings) in Spectator/Live view', () => {
      const html = renderToString(
        <MoreMenuModal
          isOpen={true}
          onClose={() => {}}
          isViewer={true}
        />
      );

      expect(html).toContain('Match Options');
      expect(html).toContain('Match Summary');
      expect(html).toContain('Squad &amp; Players');
      expect(html).toContain('Pointing System Criteria');

      // Scorer-only editing actions must be absent for spectators
      expect(html).not.toContain('Edit Ball Score');
      expect(html).not.toContain('Action Audit Logs');
      expect(html).not.toContain('Time Declare');
      expect(html).not.toContain('Declare 1st Innings');
    });
  });
});
