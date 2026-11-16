import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Chunk 4: Low Severity and Security Hardening', () => {
  it('Bug 32: Setup.jsx rejects decimal overs with Number.isInteger inline error', () => {
    const setupCode = fs.readFileSync(path.resolve(__dirname, '../pages/Setup.jsx'), 'utf8');
    expect(setupCode).toContain('!Number.isInteger(parsed)');
    expect(setupCode).toContain('Decimals are not allowed');
  });

  it('Bug 35: OverthrowModal fixes copy for 1 Run and Odd total runs', () => {
    const modalCode = fs.readFileSync(path.resolve(__dirname, '../components/OverthrowModal.jsx'), 'utf8');
    expect(modalCode).toContain("runsRan === 1 ? '1 Run' : `${runsRan} Runs`");
    expect(modalCode).toContain('Odd total runs:');
    expect(modalCode).toContain('Even total runs:');
    expect(modalCode).not.toContain('Odd total ran:');
  });

  it('Security: firestore.rules requires authenticated users for writes and restricts chat message length', () => {
    const rules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8');
    expect(rules).toContain('match /messages/{messageId}');
    expect(rules).toContain('request.resource.data.text.size() > 0');
    expect(rules).toContain('request.resource.data.text.size() <= 500');
    expect(rules).toContain('allow update: if isAuthenticated()');
    expect(rules).toContain('allow create: if isAuthenticated()');
    expect(rules).not.toContain('allow update, delete: if true');
  });

  it('Security: No hardcoded secrets exist in source code', () => {
    const devDashboard = fs.readFileSync(path.resolve(__dirname, '../pages/DeveloperDashboard.jsx'), 'utf8');
    expect(devDashboard).not.toContain('Silicon123@');

    const matchesJs = fs.readFileSync(path.resolve(__dirname, '../firebase/matches.js'), 'utf8');
    expect(matchesJs).not.toContain('Silicon123@');
  });
});
