import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Bug 1 & Bug 20: Developer Console Form Validation & Placeholders', () => {
  it('verifies generic email and password placeholders and required attributes in DeveloperDashboard.jsx source', () => {
    const devFilePath = path.resolve(__dirname, '../pages/DeveloperDashboard.jsx');
    const devCode = fs.readFileSync(devFilePath, 'utf-8');

    // 1. Generic developer email placeholder
    expect(devCode).toContain('placeholder="developer@example.com"');
    expect(devCode).toContain('type="email"');

    // 2. Generic password placeholder (no 8-dot placeholder hint)
    expect(devCode).toContain('placeholder="Password"');
    expect(devCode).not.toContain('placeholder="••••••••"');

    // 3. Ensure personal email is not used as a placeholder
    expect(devCode).not.toContain('placeholder="syedmaazalam2007@gmail.com"');

    // 4. Ensure required and type="email" on developer email input
    expect(devCode).toMatch(/<input\s+type="email"\s+placeholder="developer@example\.com"[\s\S]*?required/);
  });
});
