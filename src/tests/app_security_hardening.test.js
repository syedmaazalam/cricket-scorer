import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { escapeHtml } from '../services/emailService.js';

describe('Application Security Hardening (SEC-07, SEC-08, SEC-09)', () => {
  it('verifies escapeHtml sanitizes dangerous HTML characters properly', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    expect(escapeHtml("John 'Scorer' & Co.")).toBe('John &#039;Scorer&#039; &amp; Co.');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(12345)).toBe('12345');
  });

  it('verifies emailService sanitizes input names before HTML template insertion', () => {
    const emailServicePath = path.resolve(__dirname, '../services/emailService.js');
    const code = fs.readFileSync(emailServicePath, 'utf-8');

    expect(code).toContain('export function escapeHtml');
    expect(code).toContain('const safeName = escapeHtml(name || \'Scorer\');');
    expect(code).toContain('Hello ${safeName}, thank you for registering.');
    // Raw unsanitized name must not be used in HTML body
    expect(code).not.toContain('Hello ${name}, thank you for registering.');
  });

  it('verifies AndroidManifest.xml disables allowBackup to protect local app sandbox', () => {
    const manifestPath = path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml');
    const manifest = fs.readFileSync(manifestPath, 'utf-8');

    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).not.toContain('android:allowBackup="true"');
  });

  it('verifies firebase.json configures industry-standard HTTP security headers', () => {
    const firebaseJsonPath = path.resolve(__dirname, '../../firebase.json');
    const content = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf-8'));

    const globalHeadersConfig = content.hosting.headers.find(h => h.source === '**');
    expect(globalHeadersConfig).toBeDefined();

    const headerKeys = globalHeadersConfig.headers.map(h => h.key);
    expect(headerKeys).toContain('X-Frame-Options');
    expect(headerKeys).toContain('X-Content-Type-Options');
    expect(headerKeys).toContain('Referrer-Policy');
    expect(headerKeys).toContain('Strict-Transport-Security');
    expect(headerKeys).toContain('Permissions-Policy');

    const getHeader = (k) => globalHeadersConfig.headers.find(h => h.key === k)?.value;
    expect(getHeader('X-Frame-Options')).toBe('DENY');
    expect(getHeader('X-Content-Type-Options')).toBe('nosniff');
    expect(getHeader('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(getHeader('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
  });
});
