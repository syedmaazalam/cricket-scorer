import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import AuthModal from '../components/AuthModal.jsx';

describe('AuthModal Unit Tests: Duplicate Protection, OTP Verification & Forgot Password', () => {
  it('renders initial registration view with tab controls', () => {
    const html = renderToString(
      <AuthModal
        isOpen={true}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );

    expect(html).toContain('Manager Registration');
    expect(html).toContain('Sign In');
    expect(html).toContain('Email Address');
    expect(html).toContain('Password');
    expect(html).toContain('Create Manager Account');
    expect(html).toContain('Continue Offline without Login');
  });

  it('renders nothing when closed', () => {
    const html = renderToString(
      <AuthModal
        isOpen={false}
        onClose={() => {}}
        onSuccess={() => {}}
      />
    );

    expect(html).toBe('');
  });

  it('includes OTP verification and Forgot Password UI tokens in source', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const authCode = fs.readFileSync(path.resolve(__dirname, '../components/AuthModal.jsx'), 'utf-8');

    // 1. Duplicate email prevention check
    expect(authCode).toContain('getAllLocalManagers');
    expect(authCode).toContain('This email is already registered. Please switch to Sign In or reset password.');

    // 2. OTP Registration System
    expect(authCode).toContain('createSixDigitOtp');
    expect(authCode).toContain('Verify Registration OTP');
    expect(authCode).toContain('Verify OTP &amp; Complete Registration');
    expect(authCode).toContain('Resend Code');
    expect(authCode).toContain('sendVerificationEmailOtp');
    expect(authCode).toContain('Verification Code Sent to Gmail');
    // Ensure OTP is sent to user email and NOT revealed in the app
    expect(authCode).not.toContain('OTP Verification Code:');
    expect(authCode).not.toContain('Auto-fill');

    // 3. Forgot Password section
    expect(authCode).toContain('Forgot Password?');
    expect(authCode).toContain('Reset Manager Password');
    expect(authCode).toContain('Send 6-Digit Reset Code');
    expect(authCode).toContain('Reset Code Sent to Gmail');
    expect(authCode).toContain('Save New Password &amp; Sign In');
  });

  it('Verifies manager profiles never store plaintext passwords (SEC-04)', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const authCode = fs.readFileSync(path.resolve(__dirname, '../components/AuthModal.jsx'), 'utf-8');
    const matchesCode = fs.readFileSync(path.resolve(__dirname, '../firebase/matches.js'), 'utf-8');
    const localDbCode = fs.readFileSync(path.resolve(__dirname, '../store/localDb.js'), 'utf-8');
    const devDashCode = fs.readFileSync(path.resolve(__dirname, '../pages/DeveloperDashboard.jsx'), 'utf-8');

    // 1. AuthModal must not store password in managerData or localStorage payloads
    expect(authCode).not.toMatch(/managerData\s*=\s*\{[^}]*password:\s*cleanPassword/);
    expect(authCode).not.toMatch(/updatedManager\s*=\s*\{[^}]*password:\s*cleanPass/);
    expect(authCode).not.toMatch(/offlineMgr\s*=\s*\{[^}]*password:/);

    // 2. matches.js must sanitize and never persist manager passwords to cloud
    expect(matchesCode).not.toContain('password: managerData.password');

    // 3. localDb.js must sanitize and never persist manager passwords to local storage or IndexedDB
    expect(localDbCode).not.toContain('password: managerData.password');

    // 4. DeveloperDashboard must not reveal or edit manager plaintext passwords
    expect(devDashCode).not.toContain('mgr.password');
    expect(devDashCode).toContain('Protected via Firebase Auth');
    expect(devDashCode).toContain('handleSendManagerPasswordReset');
  });
});
