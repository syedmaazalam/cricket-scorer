import { describe, it, expect } from 'vitest';
import {
  DARK_THEME_CHIPS,
  LIGHT_THEME_CHIPS,
  getBallChipConfig
} from '../engine/ballChipStyles.js';

describe('Ball Chip Styling & Color Config System', () => {
  it('correctly maps Dark Theme colors for 0..6 and extras', () => {
    // 0 (dot)
    expect(DARK_THEME_CHIPS['0'].bg).toBe('#14224F');
    expect(DARK_THEME_CHIPS['0'].text).toBe('#8FA3D9');
    expect(DARK_THEME_CHIPS['0'].border).toBe('1.5px solid #3A4C8A');

    // 1
    expect(DARK_THEME_CHIPS['1'].bg).toBe('#5B8DEF');
    expect(DARK_THEME_CHIPS['1'].text).toBe('#FFFFFF');

    // 2
    expect(DARK_THEME_CHIPS['2'].bg).toBe('#38BDF8');
    expect(DARK_THEME_CHIPS['2'].text).toBe('#06223A');

    // 3
    expect(DARK_THEME_CHIPS['3'].bg).toBe('#2DD4BF');
    expect(DARK_THEME_CHIPS['3'].text).toBe('#04302B');

    // 4
    expect(DARK_THEME_CHIPS['4'].bg).toBe('#22C55E');
    expect(DARK_THEME_CHIPS['4'].text).toBe('#04210F');

    // 5
    expect(DARK_THEME_CHIPS['5'].bg).toBe('#F59E0B');
    expect(DARK_THEME_CHIPS['5'].text).toBe('#2B1700');

    // 6 (plus glow)
    expect(DARK_THEME_CHIPS['6'].bg).toBe('#A855F7');
    expect(DARK_THEME_CHIPS['6'].text).toBe('#FFFFFF');
    expect(DARK_THEME_CHIPS['6'].boxShadow).toContain('rgba(168, 85, 247, 0.67)');

    // Wicket (W)
    expect(DARK_THEME_CHIPS['W'].bg).toBe('#EF4444');
    expect(DARK_THEME_CHIPS['W'].text).toBe('#FFFFFF');

    // Wide (Wd)
    expect(DARK_THEME_CHIPS['Wd'].bg).toBe('transparent');
    expect(DARK_THEME_CHIPS['Wd'].border).toBe('1.5px solid #FACC15');
    expect(DARK_THEME_CHIPS['Wd'].text).toBe('#FACC15');

    // No ball (Nb)
    expect(DARK_THEME_CHIPS['Nb'].bg).toBe('#FB923C');
    expect(DARK_THEME_CHIPS['Nb'].text).toBe('#2B1100');

    // Byes / Leg Byes
    expect(DARK_THEME_CHIPS['B_LB'].bg).toBe('#475569');
    expect(DARK_THEME_CHIPS['B_LB'].text).toBe('#E2E8F0');
  });

  it('correctly maps Light Theme colors with white text on all filled chips', () => {
    // 0 dot
    expect(LIGHT_THEME_CHIPS['0'].bg).toBe('#E8EEFC');
    expect(LIGHT_THEME_CHIPS['0'].border).toBe('1.5px solid #9FB0DC');
    expect(LIGHT_THEME_CHIPS['0'].text).toBe('#4A5D94');

    // Filled chips have white text
    expect(LIGHT_THEME_CHIPS['1'].bg).toBe('#3B6FD4');
    expect(LIGHT_THEME_CHIPS['1'].text).toBe('#FFFFFF');

    expect(LIGHT_THEME_CHIPS['2'].bg).toBe('#0EA5E9');
    expect(LIGHT_THEME_CHIPS['2'].text).toBe('#FFFFFF');

    expect(LIGHT_THEME_CHIPS['3'].bg).toBe('#14B8A6');
    expect(LIGHT_THEME_CHIPS['3'].text).toBe('#FFFFFF');

    expect(LIGHT_THEME_CHIPS['4'].bg).toBe('#16A34A');
    expect(LIGHT_THEME_CHIPS['4'].text).toBe('#FFFFFF');

    expect(LIGHT_THEME_CHIPS['5'].bg).toBe('#D97706');
    expect(LIGHT_THEME_CHIPS['5'].text).toBe('#FFFFFF');

    expect(LIGHT_THEME_CHIPS['6'].bg).toBe('#9333EA');
    expect(LIGHT_THEME_CHIPS['6'].text).toBe('#FFFFFF');

    expect(LIGHT_THEME_CHIPS['W'].bg).toBe('#DC2626');
    expect(LIGHT_THEME_CHIPS['W'].text).toBe('#FFFFFF');

    expect(LIGHT_THEME_CHIPS['Nb'].bg).toBe('#EA580C');
    expect(LIGHT_THEME_CHIPS['Nb'].text).toBe('#FFFFFF');

    expect(LIGHT_THEME_CHIPS['B_LB'].bg).toBe('#64748B');
    expect(LIGHT_THEME_CHIPS['B_LB'].text).toBe('#FFFFFF');

    // Wide transparent in light theme
    expect(LIGHT_THEME_CHIPS['Wd'].bg).toBe('transparent');
    expect(LIGHT_THEME_CHIPS['Wd'].border).toBe('1.5px solid #CA8A04');
    expect(LIGHT_THEME_CHIPS['Wd'].text).toBe('#CA8A04');
  });

  it('handles Combined Events: no-ball + 4 runs with run fill, 2px orange ring and Nb+4 label', () => {
    const combinedBall = { runs: 4, extraType: 'no_ball' };
    const darkResult = getBallChipConfig(combinedBall, true);

    expect(darkResult.isCombined).toBe(true);
    expect(darkResult.label).toBe('Nb+4');
    expect(darkResult.style.backgroundColor).toBe('#22C55E'); // 4 runs fill
    expect(darkResult.style.boxShadow).toBe('0 0 0 2px #FB923C'); // 2px orange ring
    expect(darkResult.style.border).toBe('none');

    const lightResult = getBallChipConfig(combinedBall, false);
    expect(lightResult.isCombined).toBe(true);
    expect(lightResult.label).toBe('Nb+4');
    expect(lightResult.style.backgroundColor).toBe('#16A34A'); // light 4 runs fill
    expect(lightResult.style.boxShadow).toBe('0 0 0 2px #FB923C');
  });

  it('provides explicit text labels W and Wd for color-blind accessibility', () => {
    const wicketBall = { isWicket: true, runs: 0 };
    const resW = getBallChipConfig(wicketBall, true);
    expect(resW.label).toBe('W');
    expect(resW.style.backgroundColor).toBe('#EF4444');

    const wideBall = { extraType: 'wide', runs: 0 };
    const resWd = getBallChipConfig(wideBall, true);
    expect(resWd.label).toBe('Wd');
    expect(resWd.style.color).toBe('#FACC15');
  });

  it('formats byes and leg byes with B1 or LB2 labels', () => {
    const byeBall = { extraType: 'bye', runs: 1 };
    const resBye = getBallChipConfig(byeBall, true);
    expect(resBye.label).toBe('B1');
    expect(resBye.style.backgroundColor).toBe('#475569');

    const legByeBall = { extraType: 'leg_bye', runs: 2 };
    const resLegBye = getBallChipConfig(legByeBall, true);
    expect(resLegBye.label).toBe('LB2');
    expect(resLegBye.style.backgroundColor).toBe('#475569');
  });

  it('enforces fontWeight 600, lineHeight 1, and 150ms transition', () => {
    const normalBall = { runs: 6 };
    const res = getBallChipConfig(normalBall, true);
    expect(res.style.fontWeight).toBe(600);
    expect(res.style.lineHeight).toBe(1);
    expect(res.style.transition).toBe('all 150ms ease-in-out');
  });
});
