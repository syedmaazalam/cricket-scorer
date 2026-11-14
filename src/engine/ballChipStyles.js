import { useState, useEffect } from 'react';

/**
 * Ball Chip Styling System & Configuration
 * Provides unified, score-based color themes for deliveries, Recent Deliveries,
 * and player innings timelines per specification.
 */

export const DARK_THEME_CHIPS = {
  '0': {
    bg: '#14224F',
    border: '1.5px solid #3A4C8A',
    text: '#8FA3D9',
    boxShadow: 'none'
  },
  '1': {
    bg: '#5B8DEF',
    border: 'none',
    text: '#FFFFFF',
    boxShadow: 'none'
  },
  '2': {
    bg: '#38BDF8',
    border: 'none',
    text: '#06223A',
    boxShadow: 'none'
  },
  '3': {
    bg: '#2DD4BF',
    border: 'none',
    text: '#04302B',
    boxShadow: 'none'
  },
  '4': {
    bg: '#22C55E',
    border: 'none',
    text: '#04210F',
    boxShadow: 'none'
  },
  '5': {
    bg: '#F59E0B',
    border: 'none',
    text: '#2B1700',
    boxShadow: 'none'
  },
  '6': {
    bg: '#A855F7',
    border: 'none',
    text: '#FFFFFF',
    boxShadow: '0 0 10px rgba(168, 85, 247, 0.67)'
  },
  'W': {
    bg: '#EF4444',
    border: 'none',
    text: '#FFFFFF',
    boxShadow: 'none'
  },
  'Wd': {
    bg: 'transparent',
    border: '1.5px solid #FACC15',
    text: '#FACC15',
    boxShadow: 'none'
  },
  'Nb': {
    bg: '#FB923C',
    border: 'none',
    text: '#2B1100',
    boxShadow: 'none'
  },
  'B_LB': {
    bg: '#475569',
    border: 'none',
    text: '#E2E8F0',
    boxShadow: 'none'
  }
};

export const LIGHT_THEME_CHIPS = {
  '0': {
    bg: '#E8EEFC',
    border: '1.5px solid #9FB0DC',
    text: '#4A5D94',
    boxShadow: 'none'
  },
  '1': {
    bg: '#3B6FD4',
    border: 'none',
    text: '#FFFFFF',
    boxShadow: 'none'
  },
  '2': {
    bg: '#0EA5E9',
    border: 'none',
    text: '#FFFFFF',
    boxShadow: 'none'
  },
  '3': {
    bg: '#14B8A6',
    border: 'none',
    text: '#FFFFFF',
    boxShadow: 'none'
  },
  '4': {
    bg: '#16A34A',
    border: 'none',
    text: '#FFFFFF',
    boxShadow: 'none'
  },
  '5': {
    bg: '#D97706',
    border: 'none',
    text: '#FFFFFF',
    boxShadow: 'none'
  },
  '6': {
    bg: '#9333EA',
    border: 'none',
    text: '#FFFFFF',
    boxShadow: '0 0 10px rgba(147, 51, 234, 0.5)'
  },
  'W': {
    bg: '#DC2626',
    border: 'none',
    text: '#FFFFFF',
    boxShadow: 'none'
  },
  'Wd': {
    bg: 'transparent',
    border: '1.5px solid #CA8A04',
    text: '#CA8A04',
    boxShadow: 'none'
  },
  'Nb': {
    bg: '#EA580C',
    border: 'none',
    text: '#FFFFFF',
    boxShadow: 'none'
  },
  'B_LB': {
    bg: '#64748B',
    border: 'none',
    text: '#FFFFFF',
    boxShadow: 'none'
  }
};

/**
 * Returns the exact style object, text label, and metadata for a ball chip.
 *
 * @param {Object} ball - Ball delivery object with runs, extraType, isWicket, shortLabel, etc.
 * @param {boolean} isDark - Whether the dark theme is active
 * @returns {{ style: Object, label: string, isCombined: boolean, key: string }}
 */
export function getBallChipConfig(ball, isDark = true) {
  if (!ball) {
    const palette = isDark ? DARK_THEME_CHIPS : LIGHT_THEME_CHIPS;
    return {
      key: '0',
      label: '•',
      isCombined: false,
      style: {
        backgroundColor: palette['0'].bg,
        border: palette['0'].border,
        color: palette['0'].text,
        boxShadow: palette['0'].boxShadow,
        fontWeight: 600,
        lineHeight: 1,
        transition: 'all 150ms ease-in-out'
      }
    };
  }

  const palette = isDark ? DARK_THEME_CHIPS : LIGHT_THEME_CHIPS;
  const runs = Number(ball.runs) || 0;
  const extraType = (ball.extraType || '').toLowerCase();
  const isWicket = Boolean(ball.isWicket);

  // 1. WICKET has highest priority for color-blind clarity
  if (isWicket) {
    const cfg = palette['W'];
    return {
      key: 'W',
      label: 'W',
      isCombined: false,
      style: {
        backgroundColor: cfg.bg,
        border: cfg.border,
        color: cfg.text,
        boxShadow: cfg.boxShadow,
        fontWeight: 600,
        lineHeight: 1,
        transition: 'all 150ms ease-in-out'
      }
    };
  }

  // 2. WIDE
  if (extraType === 'wide' || extraType === 'wd') {
    const cfg = palette['Wd'];
    const label = runs > 0 ? `Wd+${runs}` : 'Wd';
    return {
      key: 'Wd',
      label,
      isCombined: false,
      style: {
        backgroundColor: cfg.bg,
        border: cfg.border,
        color: cfg.text,
        boxShadow: cfg.boxShadow,
        fontWeight: 600,
        lineHeight: 1,
        transition: 'all 150ms ease-in-out'
      }
    };
  }

  // 3. NO BALL
  if (extraType === 'no_ball' || extraType === 'nb') {
    // Combined event rule: e.g. no-ball + 4 runs:
    // "use the run color as the fill, add a 2px orange ring (#FB923C), and label it 'Nb+4'"
    if (runs > 0) {
      const runKey = String(Math.min(6, Math.max(1, runs)));
      const runCfg = palette[runKey] || palette['1'];
      return {
        key: `Nb+${runs}`,
        label: `Nb+${runs}`,
        isCombined: true,
        style: {
          backgroundColor: runCfg.bg,
          border: 'none',
          boxShadow: '0 0 0 2px #FB923C',
          color: runCfg.text,
          fontWeight: 600,
          lineHeight: 1,
          transition: 'all 150ms ease-in-out'
        }
      };
    }

    const cfg = palette['Nb'];
    return {
      key: 'Nb',
      label: 'Nb',
      isCombined: false,
      style: {
        backgroundColor: cfg.bg,
        border: cfg.border,
        color: cfg.text,
        boxShadow: cfg.boxShadow,
        fontWeight: 600,
        lineHeight: 1,
        transition: 'all 150ms ease-in-out'
      }
    };
  }

  // 4. BYES & LEG BYES
  if (extraType === 'bye' || extraType === 'leg_bye' || extraType === 'b' || extraType === 'lb') {
    const isBye = extraType === 'bye' || extraType === 'b';
    const totalExtraRuns = runs > 0 ? runs : (ball.extraRuns || 1);
    const label = isBye ? `B${totalExtraRuns}` : `LB${totalExtraRuns}`;
    const cfg = palette['B_LB'];
    return {
      key: 'B_LB',
      label,
      isCombined: false,
      style: {
        backgroundColor: cfg.bg,
        border: cfg.border,
        color: cfg.text,
        boxShadow: cfg.boxShadow,
        fontWeight: 600,
        lineHeight: 1,
        transition: 'all 150ms ease-in-out'
      }
    };
  }

  // 5. REGULAR RUNS (0, 1, 2, 3, 4, 5, 6)
  const runKey = runs >= 6 ? '6' : String(runs);
  const cfg = palette[runKey] || (runs === 0 ? palette['0'] : palette['1']);
  const label = runs === 0 ? '0' : String(runs);

  return {
    key: runKey,
    label,
    isCombined: false,
    style: {
      backgroundColor: cfg.bg,
      border: cfg.border,
      color: cfg.text,
      boxShadow: cfg.boxShadow,
      fontWeight: 600,
      lineHeight: 1,
      transition: 'all 150ms ease-in-out'
    }
  };
}

/**
 * Hook to reactively determine if the current theme is dark.
 * Observes data-theme attribute, dark class, and cricket_theme_changed events.
 */
export function useIsDark() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return true;
    const dt = document.documentElement.getAttribute('data-theme');
    if (dt) return dt === 'dark';
    if (document.documentElement.classList.contains('dark')) return true;
    try {
      return (localStorage.getItem('cricket_theme') || 'dark') === 'dark';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateTheme = () => {
      const dt = document.documentElement.getAttribute('data-theme');
      if (dt) {
        setIsDark(dt === 'dark');
        return;
      }
      if (document.documentElement.classList.contains('dark')) {
        setIsDark(true);
        return;
      }
      try {
        setIsDark((localStorage.getItem('cricket_theme') || 'dark') === 'dark');
      } catch {
        setIsDark(true);
      }
    };

    updateTheme();
    window.addEventListener('cricket_theme_changed', updateTheme);
    window.addEventListener('storage', updateTheme);

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    });

    return () => {
      window.removeEventListener('cricket_theme_changed', updateTheme);
      window.removeEventListener('storage', updateTheme);
      observer.disconnect();
    };
  }, []);

  return isDark;
}
