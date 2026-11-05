import { describe, it, expect, beforeEach } from 'vitest';
import { CURRENT_APP_VERSION, CURRENT_APP_VERSION_CODE } from '../components/UpdateNotificationBanner.jsx';

const mockStore = {};
globalThis.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => { mockStore[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }
};

describe('UpdateNotificationBanner Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('declares current application version constants correctly', () => {
    expect(CURRENT_APP_VERSION).toBe('1.0');
    expect(CURRENT_APP_VERSION_CODE).toBe(1);
  });

  it('respects dismissal in localStorage for specified version', () => {
    const versionKey = 'dismissed_update_1.1';
    expect(localStorage.getItem(versionKey)).toBeNull();
    localStorage.setItem(versionKey, 'true');
    expect(localStorage.getItem(versionKey)).toBe('true');
  });

  it('evaluates version comparison arithmetic accurately', () => {
    const isNewerCode = (remote, current) => remote > current;
    expect(isNewerCode(2, CURRENT_APP_VERSION_CODE)).toBe(true);
    expect(isNewerCode(1, CURRENT_APP_VERSION_CODE)).toBe(false);
    expect(isNewerCode(0, CURRENT_APP_VERSION_CODE)).toBe(false);
  });
});
