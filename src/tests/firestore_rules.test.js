import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Firestore Security Rules Lockdown (SEC-03, SEC-06)', () => {
  const rulesPath = path.resolve(__dirname, '../../firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf-8');

  it('validates rules version and basic structure', () => {
    expect(rules).toContain("rules_version = '2';");
    expect(rules).toContain('service cloud.firestore');
    expect(rules).toContain('function isAuthenticated()');
    expect(rules).toContain('function isDeveloper()');
    expect(rules).toContain('function isOwner(userId)');
  });

  it('verifies /managers collection has no || true backdoor', () => {
    // Locate the match /managers block
    const managersBlock = rules.match(/match \/managers\/\{managerId\} \{([^}]+)\}/);
    expect(managersBlock).not.toBeNull();
    const content = managersBlock[1];
    expect(content).not.toContain('|| true');
    expect(content).toContain('allow list: if isDeveloper();');
    expect(content).toContain('allow get: if isDeveloper() || isOwner(managerId);');
    expect(content).toContain('allow write: if isDeveloper() || isOwner(managerId);');
  });

  it('verifies /config collection is read-only for public and writeable only by developers', () => {
    const configBlock = rules.match(/match \/config\/\{configId\} \{([^}]+)\}/);
    expect(configBlock).not.toBeNull();
    const content = configBlock[1];
    expect(content).not.toContain('|| true');
    expect(content).toContain('allow read: if true;');
    expect(content).toContain('allow write: if isDeveloper();');
  });

  it('verifies /mail collection is not an open relay', () => {
    const mailBlock = rules.match(/match \/mail\/\{mailId\} \{([^}]+)\}/);
    expect(mailBlock).not.toBeNull();
    const content = mailBlock[1];
    // Must not allow open create to anyone without constraints
    expect(content).not.toContain('allow create: if true;');
    expect(content).toContain('SmartCricket .*');
    expect(content).toContain('allow read, update, delete: if isDeveloper();');
  });

  it('verifies /matches collection enforces owner write authorization, create-only events, and prevents arbitrary deletion', () => {
    expect(rules).toContain('allow create: if isAuthenticated();');
    expect(rules).toContain('resource.data.ownerUid == request.auth.uid');
    expect(rules).toContain('match /events/{eventId}');
    expect(rules).toContain('allow update, delete: if false;');
    expect(rules).toContain("eventId == matchId + '_' + string(request.resource.data.seq)");
    expect(rules).toContain('match /actionLogs/{logId}');
    expect(rules).toContain('match /messages/{messageId}');
  });
});
