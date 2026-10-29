import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('cricket_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cricket_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('cricket_theme', nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        color: 'var(--text)'
      }}
      className="p-2 rounded-2xl border transition-all active:scale-95 flex items-center justify-center shadow-sm"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4" style={{ color: 'var(--orange)' }} />
      ) : (
        <Moon className="w-4 h-4" style={{ color: 'var(--purple)' }} />
      )}
    </button>
  );
}
