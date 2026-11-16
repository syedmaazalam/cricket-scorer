import { describe, it, expect, beforeEach, vi } from 'vitest';

// Cross-tab broadcast mock
class MockBroadcastChannel {
  static channels = new Map();

  constructor(name) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name).add(this);
    this.listeners = new Set();
  }

  postMessage(message) {
    const peers = MockBroadcastChannel.channels.get(this.name) || new Set();
    peers.forEach(peer => {
      if (peer !== this) {
        peer.listeners.forEach(fn => fn({ data: message }));
      }
    });
  }

  addEventListener(type, fn) {
    if (type === 'message') this.listeners.add(fn);
  }

  removeEventListener(type, fn) {
    if (type === 'message') this.listeners.delete(fn);
  }

  close() {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (peers) peers.delete(this);
  }
}

globalThis.BroadcastChannel = MockBroadcastChannel;

const mockStore = {};
globalThis.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => { mockStore[k] = String(v); globalThis.localStorage[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; delete globalThis.localStorage[k]; },
  clear: () => {
    Object.keys(mockStore).forEach(k => {
      delete mockStore[k];
      delete globalThis.localStorage[k];
    });
  },
  get length() { return Object.keys(mockStore).length; },
  key: (i) => Object.keys(mockStore)[i] || null
};

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
}

import {
  subscribeCrossTabEvents,
  acquireScoringTabLock,
  getTabId
} from '../store/crossTabSync.js';

describe('Phase 6: Cross-Tab Sync & Multi-Tab Web Locking', () => {
  beforeEach(() => {
    MockBroadcastChannel.channels.clear();
    globalThis.localStorage.clear();
  });

  describe('1. Cross-Tab Event Broadcasting (BroadcastChannel)', () => {
    it('notifies other open tabs when an event is posted', async () => {
      const receivedMessages = [];
      const unsubscribe = subscribeCrossTabEvents((msg) => {
        receivedMessages.push(msg);
      });

      // Post event from simulated external tab
      const externalChannel = new MockBroadcastChannel('smartcricket_events');
      externalChannel.postMessage({
        type: 'BALL_SCORED',
        matchId: 'match_tab_1',
        seq: 5,
        sourceTabId: 'external_tab_999'
      });

      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].type).toBe('BALL_SCORED');
      expect(receivedMessages[0].matchId).toBe('match_tab_1');
      expect(receivedMessages[0].seq).toBe(5);

      unsubscribe();
    });

    it('ignores messages originating from the current tab to prevent redundant refreshes', () => {
      const receivedMessages = [];
      const unsubscribe = subscribeCrossTabEvents((msg) => {
        receivedMessages.push(msg);
      });

      // Post message with our own tab ID
      const ownChannel = new MockBroadcastChannel('smartcricket_events');
      ownChannel.postMessage({
        type: 'BALL_SCORED',
        matchId: 'match_tab_1',
        seq: 6,
        sourceTabId: getTabId()
      });

      expect(receivedMessages.length).toBe(0);

      unsubscribe();
    });
  });

  describe('2. Multi-Tab Web Locks API', () => {
    it('grants scoring lock when no other tab is scoring the match', async () => {
      const lockGranted = vi.fn();
      const mockRequest = vi.fn((name, opts, cb) => {
        const mockLock = { name };
        return cb(mockLock);
      });

      const spy = vi.spyOn(navigator, 'locks', 'get').mockReturnValue({
        request: mockRequest
      });

      const controller = await acquireScoringTabLock('match_lock_101', lockGranted);
      expect(lockGranted).toHaveBeenCalledWith(true);
      expect(mockRequest).toHaveBeenCalledWith(
        'score_lock_match_lock_101',
        { ifAvailable: true },
        expect.any(Function)
      );

      controller.release();
      spy.mockRestore();
    });

    it('denies lock and activates read-only mode when another tab already holds the scoring lock', async () => {
      const lockStatus = vi.fn();
      const mockRequest = vi.fn((name, opts, cb) => {
        return cb(null); // lock is null when unavailable
      });

      const spy = vi.spyOn(navigator, 'locks', 'get').mockReturnValue({
        request: mockRequest
      });

      await acquireScoringTabLock('match_lock_contested', lockStatus);
      expect(lockStatus).toHaveBeenCalledWith(false);
      spy.mockRestore();
    });

    it('gracefully grants scoring when navigator.locks is unsupported', async () => {
      const lockStatus = vi.fn();
      const spy = vi.spyOn(navigator, 'locks', 'get').mockReturnValue(undefined);

      const controller = await acquireScoringTabLock('match_fallback', lockStatus);
      expect(lockStatus).toHaveBeenCalledWith(true);
      expect(controller.isAcquired).toBe(true);
      spy.mockRestore();
    });
  });
});
