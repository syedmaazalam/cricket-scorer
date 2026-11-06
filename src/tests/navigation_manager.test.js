import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initNavigation,
  pushScreen,
  popScreen,
  getCurrentScreen,
  canGoBack,
  getHistoryStack,
  resetToHome,
  registerModalHandler,
  hasActiveModals,
  handleBackPress,
  initHardwareAndBrowserBack,
  subscribeToNavigation,
  subscribeToExitToast,
  subscribeToExitApp
} from '../services/navigationManager.js';

describe('navigationManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetToHome();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with home page by default', () => {
    const screen = initNavigation();
    expect(screen.page).toBe('home');
    expect(canGoBack()).toBe(false);
    expect(getHistoryStack().length).toBe(1);
  });

  it('pushes new screens and tracks history stack', () => {
    initNavigation();
    pushScreen({ page: 'live', liveCodeOrId: 'ABC123' });
    expect(getCurrentScreen().page).toBe('live');
    expect(getCurrentScreen().liveCodeOrId).toBe('ABC123');
    expect(canGoBack()).toBe(true);
    expect(getHistoryStack().length).toBe(2);

    pushScreen({ page: 'scorecard', activeMatchId: 'match_1' });
    expect(getCurrentScreen().page).toBe('scorecard');
    expect(getHistoryStack().length).toBe(3);
  });

  it('prevents consecutive identical pushes', () => {
    initNavigation();
    pushScreen({ page: 'live', liveCodeOrId: 'XYZ999', isManager: false });
    pushScreen({ page: 'live', liveCodeOrId: 'XYZ999', isManager: false });
    expect(getHistoryStack().length).toBe(2);
  });

  it('pops screens in reverse order', () => {
    initNavigation();
    pushScreen({ page: 'developer' });
    pushScreen({ page: 'scoring', activeMatchId: 'm1', isManager: true });

    const pop1 = popScreen();
    expect(pop1.popped).toBe(true);
    expect(pop1.screen.page).toBe('developer');

    const pop2 = popScreen();
    expect(pop2.popped).toBe(true);
    expect(pop2.screen.page).toBe('home');

    const pop3 = popScreen();
    expect(pop3.popped).toBe(false);
    expect(pop3.screen.page).toBe('home');
  });

  it('prioritizes open modals before screen navigation on back press', () => {
    initNavigation();
    pushScreen({ page: 'scoring' });

    let modalClosed = false;
    const unregister = registerModalHandler(() => {
      modalClosed = true;
      return true;
    });

    expect(hasActiveModals()).toBe(true);

    const result = handleBackPress();
    expect(result.action).toBe('modal_closed');
    expect(modalClosed).toBe(true);
    // Page is still 'scoring' because the modal consumed the back event!
    expect(getCurrentScreen().page).toBe('scoring');
    expect(canGoBack()).toBe(true);

    // Next back press navigates back to 'home'
    const result2 = handleBackPress();
    expect(result2.action).toBe('navigated_back');
    expect(getCurrentScreen().page).toBe('home');

    unregister();
  });

  it('handles multiple modals in LIFO order', () => {
    initNavigation();
    const order = [];

    registerModalHandler(() => {
      order.push('first');
    });
    registerModalHandler(() => {
      order.push('second');
    });

    handleBackPress();
    expect(order).toEqual(['second']);

    handleBackPress();
    expect(order).toEqual(['second', 'first']);
  });

  it('triggers double-back exit flow when on root home screen', () => {
    initNavigation();
    const toastSpy = vi.fn();
    const exitSpy = vi.fn();

    const unsubToast = subscribeToExitToast(toastSpy);
    const unsubExit = subscribeToExitApp(exitSpy);

    // 1st back press on home: shows exit toast prompt
    const firstPress = handleBackPress();
    expect(firstPress.action).toBe('exit_prompt_shown');
    expect(toastSpy).toHaveBeenCalledWith(true);
    expect(exitSpy).not.toHaveBeenCalled();

    // 2nd back press within 2000ms: triggers exitApp
    vi.advanceTimersByTime(500);
    const secondPress = handleBackPress();
    expect(secondPress.action).toBe('exit_app');
    expect(exitSpy).toHaveBeenCalledTimes(1);

    unsubToast();
    unsubExit();
  });

  it('resets exit prompt if 2nd press occurs after 2000ms', () => {
    initNavigation();
    const exitSpy = vi.fn();
    const unsubExit = subscribeToExitApp(exitSpy);

    // 1st press
    handleBackPress();
    expect(exitSpy).not.toHaveBeenCalled();

    // Wait past 2000ms window
    vi.advanceTimersByTime(2500);

    // Press again -> should trigger exit prompt again, not exit app
    const res = handleBackPress();
    expect(res.action).toBe('exit_prompt_shown');
    expect(exitSpy).not.toHaveBeenCalled();

    unsubExit();
  });

  it('notifies navigation subscribers on state changes', () => {
    initNavigation();
    const navSpy = vi.fn();
    const unsub = subscribeToNavigation(navSpy);

    pushScreen({ page: 'setup' });
    expect(navSpy).toHaveBeenCalledWith(
      expect.objectContaining({ page: 'setup' }),
      expect.any(Array)
    );

    unsub();
  });

  it('initializes hardware and browser back listeners and responds to events', () => {
    const listeners = {};
    const mockWindow = {
      addEventListener: (evt, cb) => { listeners[evt] = cb; },
      removeEventListener: (evt) => { delete listeners[evt]; },
      dispatchEvent: (evt) => {
        if (listeners[evt.type]) listeners[evt.type](evt);
      },
      history: {
        pushState: vi.fn()
      }
    };
    vi.stubGlobal('window', mockWindow);
    initNavigation();
    const cleanup = initHardwareAndBrowserBack();

    expect(typeof mockWindow.handleHardwareBack).toBe('function');

    pushScreen({ page: 'live', liveCodeOrId: 'LIV123' });
    expect(getCurrentScreen().page).toBe('live');

    // Simulate native hardware back dispatch
    const handled = mockWindow.handleHardwareBack();
    expect(handled.action).toBe('navigated_back');
    expect(getCurrentScreen().page).toBe('home');

    cleanup();
    expect(mockWindow.handleHardwareBack).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
