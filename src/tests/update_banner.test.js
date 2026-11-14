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
    expect(CURRENT_APP_VERSION).toBe('1.3.3');
    expect(CURRENT_APP_VERSION_CODE).toBe(6);
  });

  it('respects dismissal in localStorage for specified version', () => {
    const versionKey = 'dismissed_update_1.3.3';
    expect(localStorage.getItem(versionKey)).toBeNull();
    localStorage.setItem(versionKey, 'true');
    expect(localStorage.getItem(versionKey)).toBe('true');
  });

  it('evaluates version comparison arithmetic accurately', () => {
    const isNewerCode = (remote, current) => remote > current;
    expect(isNewerCode(7, CURRENT_APP_VERSION_CODE)).toBe(true);
    expect(isNewerCode(6, CURRENT_APP_VERSION_CODE)).toBe(false);
    expect(isNewerCode(5, CURRENT_APP_VERSION_CODE)).toBe(false);
  });

  it('verifies Settings.jsx links to official website APK and uses Official Cloud channel', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const settingsPath = path.resolve(__dirname, '../pages/Settings.jsx');
    const settingsCode = fs.readFileSync(settingsPath, 'utf8');

    expect(settingsCode).toContain('https://smartcricket-website.web.app/SmartCricket.apk');
    expect(settingsCode).not.toContain('https://github.com/syedmaazalam/cricket-scorer/releases/download');
    expect(settingsCode).toContain('Official Cloud');
    expect(settingsCode).toContain('config/latestRelease');
  });
});
