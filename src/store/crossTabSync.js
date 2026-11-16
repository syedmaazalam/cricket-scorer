/**
 * Phase 6: Cross-Tab Sync & Multi-Tab Web Locking
 * 1. BroadcastChannel('smartcricket_events') for 0ms cross-tab event notification.
 * 2. Web Locks API (navigator.locks) to enforce single active scoring tab per match.
 */

let broadcastChannel = null;
let currentTabId = null;

export function getTabId() {
  if (!currentTabId) {
    currentTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
  return currentTabId;
}

/**
 * Returns a singleton BroadcastChannel instance for smartcricket_events.
 */
export function getEventsBroadcastChannel() {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel('smartcricket_events');
    } catch (e) {
      console.warn('BroadcastChannel creation failed:', e);
      return null;
    }
  }
  return broadcastChannel;
}

/**
 * Phase 6 Requirement 1:
 * Broadcasts an event (e.g. BALL_SCORED, UNDO, STATE_UPDATED) across all other open tabs.
 */
export function postCrossTabEvent(message = {}) {
  try {
    const channel = getEventsBroadcastChannel();
    if (channel) {
      channel.postMessage({
        ...message,
        sourceTabId: getTabId(),
        ts: Date.now()
      });
    }
  } catch (e) {
    console.warn('postCrossTabEvent error:', e);
  }
}

/**
 * Phase 6 Requirement 1:
 * Subscribes to events from other tabs. Ignores messages sent from the current tab.
 */
export function subscribeCrossTabEvents(onMessage) {
  const channel = getEventsBroadcastChannel();
  if (!channel) return () => {};

  const handler = (event) => {
    try {
      if (event?.data && event.data.sourceTabId !== getTabId()) {
        onMessage(event.data);
      }
    } catch (e) {
      console.warn('Cross-tab message handler error:', e);
    }
  };

  channel.addEventListener('message', handler);
  return () => {
    try {
      channel.removeEventListener('message', handler);
    } catch {}
  };
}

/**
 * Phase 6 Requirement 2:
 * Uses the Web Locks API so only one tab can score a given match.
 * If another tab already holds the lock, lock is null and tab opens in read-only mode.
 * Returns { release: () => void, isAcquired: boolean }.
 */
export async function acquireScoringTabLock(matchId, onLockStatusChanged) {
  if (!matchId) {
    onLockStatusChanged?.(true);
    return { release: () => {}, isAcquired: true };
  }

  // Graceful fallback when Web Locks API is not supported (e.g. Node tests or legacy WebView)
  if (typeof navigator === 'undefined' || !navigator.locks || typeof navigator.locks.request !== 'function') {
    onLockStatusChanged?.(true);
    return { release: () => {}, isAcquired: true };
  }

  const lockName = `score_lock_${matchId}`;
  let releaseLock = () => {};
  const lockHeldPromise = new Promise((resolve) => {
    releaseLock = resolve;
  });

  try {
    navigator.locks.request(lockName, { ifAvailable: true }, async (lock) => {
      if (!lock) {
        // Another tab is actively scoring this match: this tab is read-only
        onLockStatusChanged?.(false);
        return;
      }

      // Lock successfully acquired: this tab is the active scoring tab
      onLockStatusChanged?.(true);

      // Keep lock held open until release is requested (tab unmount or match switch)
      await lockHeldPromise;
      onLockStatusChanged?.(false);
    }).catch((err) => {
      console.warn('Web Locks request error:', err);
      onLockStatusChanged?.(true);
    });

    return {
      release: () => {
        releaseLock();
      },
      isAcquired: true
    };
  } catch (err) {
    console.warn('acquireScoringTabLock error:', err);
    onLockStatusChanged?.(true);
    return { release: () => {}, isAcquired: true };
  }
}
