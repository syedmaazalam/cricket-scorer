/**
 * Centralized Navigation History & Back-Button Manager
 *
 * Implements a luxury app navigation stack with:
 * 1. Deep screen history stack with exact route state preservation.
 * 2. LIFO modal / overlay back-handler registration (closing modals before navigating).
 * 3. Double-tap to exit protection with a 2-second grace period and sleek toast trigger.
 * 4. Reactive subscribers for route transitions and exit prompts.
 */

let historyStack = [
  {
    page: 'home',
    activeMatchId: null,
    liveCodeOrId: null,
    isManager: false,
    viewedMatchState: null
  }
];

const modalHandlers = [];
const navigationListeners = new Set();
const exitToastListeners = new Set();
const exitAppListeners = new Set();

let lastBackPressTime = 0;
let exitToastTimer = null;
const EXIT_WINDOW_MS = 2000;

function notifyNavigation() {
  const current = getCurrentScreen();
  navigationListeners.forEach(listener => {
    try {
      listener(current, [...historyStack]);
    } catch (err) {
      console.warn('Navigation listener error:', err);
    }
  });
}

function notifyExitToast(show) {
  exitToastListeners.forEach(listener => {
    try {
      listener(show);
    } catch (err) {
      console.warn('Exit toast listener error:', err);
    }
  });
}

function notifyExitApp() {
  exitAppListeners.forEach(listener => {
    try {
      listener();
    } catch (err) {
      console.warn('Exit app listener error:', err);
    }
  });
}

/**
 * Initialize or reset navigation with an initial state
 */
export function initNavigation(initialState) {
  lastBackPressTime = 0;
  if (exitToastTimer) {
    clearTimeout(exitToastTimer);
    exitToastTimer = null;
  }
  notifyExitToast(false);

  if (initialState && initialState.page) {
    historyStack = [{
      page: initialState.page || 'home',
      activeMatchId: initialState.activeMatchId || null,
      liveCodeOrId: initialState.liveCodeOrId || null,
      isManager: Boolean(initialState.isManager),
      viewedMatchState: initialState.viewedMatchState || null
    }];
  } else {
    historyStack = [{
      page: 'home',
      activeMatchId: null,
      liveCodeOrId: null,
      isManager: false,
      viewedMatchState: null
    }];
  }
  notifyNavigation();
  return getCurrentScreen();
}

/**
 * Push a new screen onto the history stack
 */
export function pushScreen(screenState) {
  if (!screenState || !screenState.page) return getCurrentScreen();

  const current = getCurrentScreen();
  // Prevent duplicate consecutive pushes of identical page & matchId
  if (
    current &&
    current.page === screenState.page &&
    (current.activeMatchId || null) === (screenState.activeMatchId || null) &&
    (current.liveCodeOrId || null) === (screenState.liveCodeOrId || null) &&
    Boolean(current.isManager) === Boolean(screenState.isManager)
  ) {
    return current;
  }

  const newEntry = {
    page: screenState.page,
    activeMatchId: screenState.activeMatchId || null,
    liveCodeOrId: screenState.liveCodeOrId || null,
    isManager: Boolean(screenState.isManager),
    viewedMatchState: screenState.viewedMatchState || null
  };

  historyStack.push(newEntry);
  notifyNavigation();
  return newEntry;
}

/**
 * Pop the current screen and navigate back to the previous screen
 */
export function popScreen() {
  if (historyStack.length <= 1) {
    return { popped: false, screen: getCurrentScreen() };
  }

  historyStack.pop();
  const previousScreen = getCurrentScreen();
  notifyNavigation();
  return { popped: true, screen: previousScreen };
}

/**
 * Get current active screen state
 */
export function getCurrentScreen() {
  return historyStack[historyStack.length - 1] || {
    page: 'home',
    activeMatchId: null,
    liveCodeOrId: null,
    isManager: false,
    viewedMatchState: null
  };
}

/**
 * Check if the stack can navigate backwards
 */
export function canGoBack() {
  return historyStack.length > 1;
}

/**
 * Return current history stack (shallow copy)
 */
export function getHistoryStack() {
  return [...historyStack];
}

/**
 * Clear history and navigate to Home
 */
export function resetToHome() {
  lastBackPressTime = 0;
  if (exitToastTimer) {
    clearTimeout(exitToastTimer);
    exitToastTimer = null;
  }
  notifyExitToast(false);

  historyStack = [{
    page: 'home',
    activeMatchId: null,
    liveCodeOrId: null,
    isManager: false,
    viewedMatchState: null
  }];
  notifyNavigation();
  return getCurrentScreen();
}

/**
 * Register a modal / bottom sheet / drawer back handler
 * Returns an unregister function.
 */
export function registerModalHandler(handlerFn) {
  if (typeof handlerFn !== 'function') return () => {};
  modalHandlers.push(handlerFn);
  return () => {
    const idx = modalHandlers.lastIndexOf(handlerFn);
    if (idx !== -1) {
      modalHandlers.splice(idx, 1);
    }
  };
}

/**
 * Check if any modal is currently active
 */
export function hasActiveModals() {
  return modalHandlers.length > 0;
}

/**
 * Core back-button dispatcher
 * Handles:
 * 1. Topmost open modal closure (highest priority)
 * 2. Hierarchical screen navigation pop
 * 3. Double-back exit confirmation with toast
 */
export function handleBackPress() {
  // 1. Check open modals (LIFO)
  while (modalHandlers.length > 0) {
    const handler = modalHandlers.pop();
    try {
      const result = handler();
      // If handler returns false explicitly, continue down the stack; otherwise treat as handled
      if (result !== false) {
        return { handled: true, action: 'modal_closed' };
      }
    } catch (e) {
      console.warn('Modal back handler error:', e);
      return { handled: true, action: 'modal_closed' };
    }
  }

  // 2. Check screen history stack
  if (canGoBack()) {
    const { screen } = popScreen();
    // Reset exit timer if navigating screens
    lastBackPressTime = 0;
    if (exitToastTimer) {
      clearTimeout(exitToastTimer);
      exitToastTimer = null;
      notifyExitToast(false);
    }
    return { handled: true, action: 'navigated_back', screen };
  }

  // 3. User is on Root Screen (Home) -> Double-tap to exit logic
  const now = Date.now();
  if (now - lastBackPressTime < EXIT_WINDOW_MS) {
    // Second back press within grace period -> Exit app
    if (exitToastTimer) {
      clearTimeout(exitToastTimer);
      exitToastTimer = null;
    }
    notifyExitToast(false);
    notifyExitApp();
    return { handled: true, action: 'exit_app' };
  }

  // First back press -> Show luxury exit toast prompt
  lastBackPressTime = now;
  notifyExitToast(true);

  if (exitToastTimer) clearTimeout(exitToastTimer);
  exitToastTimer = setTimeout(() => {
    lastBackPressTime = 0;
    notifyExitToast(false);
    exitToastTimer = null;
  }, EXIT_WINDOW_MS);

  return { handled: true, action: 'exit_prompt_shown' };
}

import { useEffect } from 'react';

/**
 * React hook to register an active modal/sheet for hardware/browser back closure
 */
export function useModalBackHandler(isOpen, onClose) {
  useEffect(() => {
    if (isOpen && typeof onClose === 'function') {
      return registerModalHandler(() => {
        onClose();
        return true;
      });
    }
  }, [isOpen, onClose]);
}

/**
 * Subscriptions
 */
export function subscribeToNavigation(listener) {
  navigationListeners.add(listener);
  return () => navigationListeners.delete(listener);
}

export function subscribeToExitToast(listener) {
  exitToastListeners.add(listener);
  return () => exitToastListeners.delete(listener);
}

export function subscribeToExitApp(listener) {
  exitAppListeners.add(listener);
  return () => exitAppListeners.delete(listener);
}

let isBackListenerInitialized = false;

/**
 * Initialize Android hardware and web browser back-button listeners
 */
export function initHardwareAndBrowserBack() {
  if (typeof window === 'undefined') return () => {};
  if (isBackListenerInitialized) return () => {};
  isBackListenerInitialized = true;

  // 1. Android Native & Global window hook
  window.handleHardwareBack = () => {
    return handleBackPress();
  };

  const onCustomHardwareBack = () => {
    handleBackPress();
  };
  window.addEventListener('smartcricket:hardwareback', onCustomHardwareBack);

  // 2. Capacitor Android Hardware Back Button Listener (Lazy loaded to avoid SSR/Node issues)
  let capListenerRemove = null;
  if (typeof document !== 'undefined') {
    import('@capacitor/app').then(({ App: CapApp }) => {
      try {
        if (CapApp && typeof CapApp.addListener === 'function') {
          const handleCapBackButton = CapApp.addListener('backButton', () => {
            handleBackPress();
          });
          if (handleCapBackButton && typeof handleCapBackButton.then === 'function') {
            handleCapBackButton.then(handler => {
              capListenerRemove = () => handler?.remove?.();
            });
          }
        }
      } catch (err) {
        console.warn('Capacitor backButton registration notice:', err);
      }
    }).catch(() => {});
  }

  // 3. Exit App Subscriber: Triggers native finish or window exit
  const unsubExit = subscribeToExitApp(() => {
    try {
      if (window.ScorecardBridge?.exitApp) {
        window.ScorecardBridge.exitApp();
        return;
      }
    } catch (e) {
      console.warn('ScorecardBridge exit notice:', e);
    }

    if (typeof document !== 'undefined') {
      import('@capacitor/app').then(({ App: CapApp }) => {
        try {
          if (CapApp?.exitApp) {
            CapApp.exitApp();
          }
        } catch (e) {
          console.warn('CapApp exit notice:', e);
        }
      }).catch(() => {});
    }
  });

  // 4. Web Browser popstate integration
  try {
    if (window.history && window.history.pushState) {
      window.history.pushState({ cricketState: true, depth: historyStack.length }, '');
    }
  } catch (e) {
    console.warn('History pushState error:', e);
  }

  const onPopState = () => {
    const result = handleBackPress();
    if (result.action !== 'exit_app' && window.history && window.history.pushState) {
      window.history.pushState({ cricketState: true, depth: historyStack.length }, '');
    }
  };
  window.addEventListener('popstate', onPopState);

  return () => {
    isBackListenerInitialized = false;
    delete window.handleHardwareBack;
    window.removeEventListener('smartcricket:hardwareback', onCustomHardwareBack);
    window.removeEventListener('popstate', onPopState);
    if (capListenerRemove) capListenerRemove();
    unsubExit();
  };
}
