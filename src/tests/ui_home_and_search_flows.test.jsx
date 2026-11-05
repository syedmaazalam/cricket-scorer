import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Home from '../pages/Home.jsx';
import AuthModal from '../components/AuthModal.jsx';

describe('UI Verification: Home Experience & Auth Modals', () => {
  describe('Home Page Portals & Search Controls', () => {
    it('renders formal portal choice screen on initial load', () => {
      const html = renderToString(
        <Home
          onNavigate={() => {}}
          onResumeMatch={() => {}}
          onWatchLive={() => {}}
          onOpenDeveloper={() => {}}
        />
      );

      expect(html).toContain('Choose your experience');
      expect(html).toContain('Do you want to create a match?');
      expect(html).toContain('Do you want to stream a match?');
      expect(html).toContain('Manager Portal');
      expect(html).toContain('Instant Access');
      expect(html).toContain('SmartCricket');
      expect(html).toContain('Developer Console');
      expect(html).toContain('2026 SmartCricket');
    });

    it('renders create portal with View the Matches switch and Search on Device', () => {
      const html = renderToString(
        <Home
          onNavigate={() => {}}
          onResumeMatch={() => {}}
          onWatchLive={() => {}}
          onOpenDeveloper={() => {}}
          initialPortal="create"
        />
      );

      expect(html).toContain('View the Matches');
      expect(html).toContain('SmartCricket');
      expect(html).toContain('Create New Match');
      expect(html).toContain('SEARCH ON THIS DEVICE');
      expect(html).toContain('Search team, player, or 6-char code...');
    });
  });

  describe('AuthModal Component', () => {
    it('returns empty string when closed', () => {
      const html = renderToString(
        <AuthModal
          isOpen={false}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      );
      expect(html).toBe('');
    });

    it('renders registration and login tabs when open', () => {
      const html = renderToString(
        <AuthModal
          isOpen={true}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      );

      expect(html).toContain('Manager Registration');
      expect(html).toContain('Register Manager');
      expect(html).toContain('Sign In');
      expect(html).toContain('Continue Offline without Login');
    });
  });
});
