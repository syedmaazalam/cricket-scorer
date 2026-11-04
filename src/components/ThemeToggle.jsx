import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('cricket_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Keep state synchronized with DOM and external changes (e.g., Settings screen)
  const applyTheme = useCallback((newTheme) => {
    setTheme(newTheme);
    try {
      document.documentElement.setAttribute('data-theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      localStorage.setItem('cricket_theme', newTheme);
    } catch (_) {}
  }, []);

  useEffect(() => {
    const handleCustomChange = (e) => {
      const nextTheme = e?.detail || document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(nextTheme);
    };

    const handleStorage = (e) => {
      if (e.key === 'cricket_theme' && e.newValue) {
        setTheme(e.newValue);
        document.documentElement.setAttribute('data-theme', e.newValue);
        document.documentElement.classList.toggle('dark', e.newValue === 'dark');
      }
    };

    window.addEventListener('cricket_theme_changed', handleCustomChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('cricket_theme_changed', handleCustomChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    try {
      window.dispatchEvent(new CustomEvent('cricket_theme_changed', { detail: nextTheme }));
    } catch (_) {}
  };

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Dark Theme (Click to switch to Light)' : 'Light Theme (Click to switch to Dark)'}
      aria-label={isDark ? 'Dark Theme (Click to switch to Light)' : 'Light Theme (Click to switch to Dark)'}
      className={`ib transition-all ${className}`}
      data-testid="theme-toggle-button"
    >
      {isDark ? (
        <Moon className="w-4 h-4 text-[#60A5FA] drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]" aria-hidden="true" />
      ) : (
        <Sun className="w-4 h-4 text-[#F59E0B] drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]" aria-hidden="true" />
      )}
    </button>
  );
}
