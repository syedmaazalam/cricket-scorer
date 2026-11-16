import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { escapeHtml } from '../services/emailService.js';

describe('White-Box Security Audit Remediations Comprehensive Suite (SEC-01 through SEC-10)', () => {

  const rootDir = path.resolve(__dirname, '../../');
  const srcDir = path.resolve(__dirname, '../');

  // SEC-01 & SEC-02: Hardcoded Credentials & Client-Side Auth Bypass
  it('SEC-01 & SEC-02: verifies hardcoded master credentials and sessionStorage dev_auth bypass are completely eliminated', () => {
    const devDash = fs.readFileSync(path.join(srcDir, 'pages/DeveloperDashboard.jsx'), 'utf-8');
    const matches = fs.readFileSync(path.join(srcDir, 'firebase/matches.js'), 'utf-8');

    // Hardcoded password Silicon123@ must never appear in any code
    expect(devDash).not.toContain('Silicon123@');
    expect(matches).not.toContain('Silicon123@');

    // Spoofable sessionStorage bypass must not exist
    expect(devDash).not.toContain("sessionStorage.getItem('dev_auth')");
    expect(devDash).not.toContain("sessionStorage.setItem('dev_auth'");

    // Must authenticate via Firebase Auth
    expect(devDash).toContain('signInWithEmailAndPassword');
    expect(devDash).toContain('checkIsDeveloper');
  });

  // SEC-04: Plaintext Passwords in Firestore & LocalStorage
  it('SEC-04: verifies manager profiles never persist or display plaintext passwords', () => {
    const authModal = fs.readFileSync(path.join(srcDir, 'components/AuthModal.jsx'), 'utf-8');
    const matches = fs.readFileSync(path.join(srcDir, 'firebase/matches.js'), 'utf-8');
    const localDb = fs.readFileSync(path.join(srcDir, 'store/localDb.js'), 'utf-8');
    const devDash = fs.readFileSync(path.join(srcDir, 'pages/DeveloperDashboard.jsx'), 'utf-8');

    // AuthModal: managerData must not store password
    expect(authModal).not.toMatch(/managerData\s*=\s*\{[^}]*password:\s*cleanPassword/);
    expect(authModal).not.toMatch(/updatedManager\s*=\s*\{[^}]*password:\s*cleanPass/);
    expect(authModal).not.toMatch(/offlineMgr\s*=\s*\{[^}]*password:/);

    // matches.js: saveManagerProfileToCloud & updateManagerCredentialsInCloud must strip password
    expect(matches).not.toContain('password: managerData.password');

    // localDb.js: saveManagerLocally & updateManagerLocally must not store password
    expect(localDb).not.toContain('password: managerData.password');

    // DeveloperDashboard: must not render plaintext passwords or edit manager passwords directly
    expect(devDash).not.toContain('mgr.password');
    expect(devDash).toContain('Protected via Firebase Auth');
    expect(devDash).toContain('handleSendManagerPasswordReset');
  });

  // SEC-03 & SEC-06: Firestore Security Rules Backdoors & Mail Relay
  it('SEC-03 & SEC-06: verifies firestore.rules has no || true backdoors and prevents open mail relay', () => {
    const rules = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf-8');

    // Managers collection must not have || true
    const mgrMatch = rules.match(/match \/managers\/\{managerId\} \{([^}]+)\}/);
    expect(mgrMatch).not.toBeNull();
    expect(mgrMatch[1]).not.toContain('|| true');

    // Config collection must be read-only for public and developer-only write
    const configMatch = rules.match(/match \/config\/\{configId\} \{([^}]+)\}/);
    expect(configMatch).not.toBeNull();
    expect(configMatch[1]).not.toContain('|| true');
    expect(configMatch[1]).toContain('allow write: if isDeveloper();');

    // Mail collection must not be open to arbitrary spam/relay
    const mailMatch = rules.match(/match \/mail\/\{mailId\} \{([^}]+)\}/);
    expect(mailMatch).not.toBeNull();
    expect(mailMatch[1]).not.toContain('allow create: if true;');
    expect(mailMatch[1]).toContain('SmartCricket .*');

    // Matches collection requires authentication to create, with owner-restricted updates
    expect(rules).toContain('allow create: if isAuthenticated();');
    expect(rules).toContain('allow update: if isAuthenticated()');
  });

  // SEC-07: HTML Injection in Email Templates
  it('SEC-07: verifies escapeHtml utility neutralizes HTML/script injection in email templates', () => {
    const emailService = fs.readFileSync(path.join(srcDir, 'services/emailService.js'), 'utf-8');

    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('" onclick="steal()')).toBe('&quot; onclick=&quot;steal()');
    expect(escapeHtml('& < > " \'')).toBe('&amp; &lt; &gt; &quot; &#039;');

    expect(emailService).toContain('const safeName = escapeHtml(name || \'Scorer\');');
    expect(emailService).toContain('Hello ${safeName}, thank you for registering.');
    expect(emailService).not.toContain('Hello ${name}, thank you for registering.');
  });

  // SEC-08: Insecure Android Application Backup
  it('SEC-08: verifies AndroidManifest.xml has android:allowBackup="false"', () => {
    const manifest = fs.readFileSync(path.join(rootDir, 'android/app/src/main/AndroidManifest.xml'), 'utf-8');
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).not.toContain('android:allowBackup="true"');
  });

  // SEC-09: Missing Modern HTTP Security Headers
  it('SEC-09: verifies firebase.json includes clickjacking, nosniff, referrer, and HSTS headers', () => {
    const firebaseJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'firebase.json'), 'utf-8'));
    const globalHeaderBlock = firebaseJson.hosting.headers.find(h => h.source === '**');
    expect(globalHeaderBlock).toBeDefined();

    const headersMap = {};
    globalHeaderBlock.headers.forEach(h => {
      headersMap[h.key] = h.value;
    });

    expect(headersMap['X-Frame-Options']).toBe('DENY');
    expect(headersMap['X-Content-Type-Options']).toBe('nosniff');
    expect(headersMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headersMap['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
    expect(headersMap['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
  });

  // Zero-Emoji Compliance
  it('Zero-Emoji Compliance: verifies no emoji Unicode characters remain in src/', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    function walkDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const hasEmoji = emojiRegex.test(content);
          expect(hasEmoji, `File contains emoji: ${fullPath}`).toBe(false);
        }
      }
    }

    walkDir(srcDir);
  });
});
