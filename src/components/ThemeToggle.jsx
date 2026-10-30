import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
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
      className={`w-10 h-10 rounded-full border transition-all active:scale-95 flex items-center justify-center shadow-sm hover:border-[var(--primary)] ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-emerald-400" />
      ) : (
        <Moon className="w-4 h-4 text-emerald-600" />
      )}
    </button>
  );
}
