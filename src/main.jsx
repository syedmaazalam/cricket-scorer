import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { clearAllPreviousData, requestStoragePersistence, migrateLegacyMatchState } from './store/localDb.js'
import { initSyncSystem } from './store/sync.js'

// Phase 1 Requirement 4: Initialize single-flight queue drainer & multi-trigger listeners on app boot
initSyncSystem();

// Phase 4 Requirement 4: Call navigator.storage.persist() on boot to protect data from browser eviction
requestStoragePersistence().catch(err => console.warn('Storage persistence request failed:', err));

// Phase 4 Requirement 5: Migrate old cricket_match_state once safely into IndexedDB
migrateLegacyMatchState().catch(err => console.warn('Legacy match state migration failed:', err));

// One-time complete data wipe per user request for fresh clean slate
try {
  if (localStorage.getItem('cricket_clean_slate_done') !== 'true') {
    clearAllPreviousData();
    localStorage.setItem('cricket_clean_slate_done', 'true');
  }
} catch {}

// Initialize user settings from localStorage on startup
try {
  const theme = localStorage.getItem('cricket_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');

  if (localStorage.getItem('setting_glass_blur') === 'false') {
    document.documentElement.classList.add('no-glass');
  }
  if (localStorage.getItem('setting_reduce_motion') === 'true') {
    document.documentElement.setAttribute('data-reduce-motion', 'true');
  }
  const textScale = localStorage.getItem('setting_text_size') || 'normal';
  document.documentElement.setAttribute('data-text-scale', textScale);
} catch {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
