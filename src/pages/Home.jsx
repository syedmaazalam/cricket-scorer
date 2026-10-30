import React, { useState, useEffect } from 'react';
import { PlusCircle, Radio, History, ArrowRight, Play, Search, Loader2, UserCheck, LogOut, ShieldCheck } from 'lucide-react';
import { getAllLocalMatches } from '../store/localDb.js';
import { searchMatches } from '../firebase/matches.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import AuthModal from '../components/AuthModal.jsx';

export default function Home({ onNavigate, onResumeMatch, onWatchLive, onOpenDeveloper }) {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [localMatches, setLocalMatches] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [managerUser, setManagerUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cricket_manager_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    async function loadMatches() {
      try {
        const matches = await getAllLocalMatches();
        setLocalMatches(matches);
      } catch (e) {
        console.warn('Could not load local matches:', e);
      }
    }
    loadMatches();
  }, []);

  // Real-time instant search as user types (no button click required!)
  useEffect(() => {
    const clean = searchInput.trim().toLowerCase();
    if (!clean) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayTimer = setTimeout(async () => {
      try {
        const cloudMatches = await searchMatches(clean);

        // Filter local matches
        const localFiltered = localMatches.filter(m => {
          const t1 = (m.teams?.[0]?.name || '').toLowerCase();
          const t2 = (m.teams?.[1]?.name || '').toLowerCase();
          const c = (m.code || '').toLowerCase();
          const p1 = (m.teams?.[0]?.players || []).some(p => p.toLowerCase().includes(clean));
          const p2 = (m.teams?.[1]?.players || []).some(p => p.toLowerCase().includes(clean));
          return t1.includes(clean) || t2.includes(clean) || c.includes(clean) || p1 || p2;
        });

        // Deduplicate
        const map = new Map();
        [...cloudMatches, ...localFiltered].forEach(m => {
          const key = m.matchId || m.id || m.code;
          if (key && !map.has(key)) {
            map.set(key, m);
          }
        });

        setSearchResults(Array.from(map.values()));
      } catch (err) {
        console.warn('Real-time search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 220); // 220ms debounce

    return () => clearTimeout(delayTimer);
  }, [searchInput, localMatches]);

  const handleCreateMatchClick = () => {
    if (!managerUser) {
      setIsAuthModalOpen(true);
    } else {
      onNavigate('setup');
    }
  };

  const handleAuthSuccess = (userData) => {
    setManagerUser(userData);
    onNavigate('setup');
  };

  const handleLogoutManager = () => {
    localStorage.removeItem('cricket_manager_user');
    localStorage.setItem('cricket_is_manager', 'false');
    setManagerUser(null);
  };

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col p-4 max-w-xl mx-auto select-none transition-colors"
    >
      {/* Top Bar with Manager status & Theme Toggle */}
      <div className="flex items-center justify-between pt-1 pb-3">
        {managerUser ? (
          <div className="flex items-center gap-2">
            <div
              style={{
                backgroundColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
                color: 'var(--primary)',
                borderColor: 'var(--border)'
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="truncate max-w-[130px]">{managerUser.name || 'Manager'}</span>
            </div>
            <button
              onClick={handleLogoutManager}
              title="Sign Out Manager"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              className="p-1 rounded-lg border hover:text-[var(--red)] transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--muted)'
            }}
            className="px-2.5 py-1 rounded-xl text-xs font-bold border hover:text-[var(--text)] transition-all"
          >
            Manager Sign In
          </button>
        )}

        <ThemeToggle />
      </div>

      {/* Header / Brand */}
      <div className="py-4 flex flex-col items-center text-center">
        <div
          style={{ backgroundColor: 'var(--primary)' }}
          className="w-16 h-16 rounded-3xl p-0.5 shadow-xl shadow-[var(--primary)]/20 mb-3 flex items-center justify-center"
        >
          <div
            style={{ backgroundColor: 'var(--card)' }}
            className="w-full h-full rounded-[22px] flex items-center justify-center"
          >
            <span className="text-3xl">🏏</span>
          </div>
        </div>
        <h1 className="text-3xl font-black tracking-tight m-0" style={{ color: 'var(--text)' }}>
          SmartCricket
        </h1>
        <p className="text-xs mt-1 max-w-xs font-medium" style={{ color: 'var(--muted)' }}>
          Offline-first, event-sourced live cricket scoring with zero-delay viewer sync.
        </p>
      </div>

      {/* Main Actions */}
      <div className="flex flex-col gap-4">
        {/* Create Match (Manager / Scorer - registration required) */}
        <button
          onClick={handleCreateMatchClick}
          style={{
            backgroundColor: 'var(--primary)',
            color: '#FFFFFF'
          }}
          className="w-full py-4 px-5 rounded-3xl font-extrabold text-base shadow-xl active:scale-98 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <PlusCircle className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="font-black text-base">New Match (Manager)</div>
              <div className="text-xs font-normal opacity-90">
                {managerUser ? `Logged in as ${managerUser.name}` : 'Registration required to manage'}
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 opacity-90" />
        </button>

        {/* Real-time Search for Match (Special database querying without clicking button) */}
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
          className="app-card p-4 flex flex-col gap-2.5 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--red)' }}>
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Real-Time Match Search</span>
            </div>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
              Instant Live As-You-Type
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search team name (e.g. India), player, or 6-char code..."
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 animate-spin absolute right-3.5 top-3" style={{ color: 'var(--primary)' }} />
            )}
          </div>

          {/* Real-time Instant Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted)' }}>
                Found Matches ({searchResults.length}):
              </span>
              <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                {searchResults.map((m) => {
                  const t1 = m.teams?.[0]?.name || 'Team 1';
                  const t2 = m.teams?.[1]?.name || 'Team 2';
                  const code = m.code || '';
                  const scoreInfo = m.summary ? `${m.summary.score}/${m.summary.wickets}` : '';

                  return (
                    <div
                      key={m.matchId || m.code}
                      onClick={() => onWatchLive(code || m.matchId)}
                      style={{
                        backgroundColor: 'var(--card-alt)',
                        borderColor: 'var(--border)'
                      }}
                      className="p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:border-[var(--primary)] transition-all"
                    >
                      <div>
                        <div className="font-bold text-xs flex items-center gap-2" style={{ color: 'var(--text)' }}>
                          <span>{t1} vs {t2}</span>
                          {code && (
                            <span
                              style={{
                                backgroundColor: 'var(--card)',
                                borderColor: 'var(--border)',
                                color: 'var(--orange)'
                              }}
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
                            >
                              {code}
                            </span>
                          )}
                        </div>
                        {scoreInfo && (
                          <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                            Score: {scoreInfo} ({m.summary?.battingTeam || ''})
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: '#FFFFFF'
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                      >
                        Watch Live
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {searchInput.trim() && searchResults.length === 0 && !isSearching && (
            <div className="text-center py-3 text-xs" style={{ color: 'var(--muted)' }}>
              No live matches matching "{searchInput}".
            </div>
          )}
        </div>

        {/* Saved / Recent Matches */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-1" style={{ color: 'var(--muted)' }}>
            <History className="w-4 h-4" style={{ color: 'var(--blue)' }} />
            <span>Recent Matches on this device</span>
          </div>

          {localMatches.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                color: 'var(--muted)'
              }}
              className="app-card p-6 text-center text-xs"
            >
              No local matches recorded yet. Tap "New Match" to start scoring!
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {localMatches.map((m) => {
                const curInn = m.innings?.[m.currentInningsIndex || 0];
                const teamA = m.teams?.[0]?.name || 'Team 1';
                const teamB = m.teams?.[1]?.name || 'Team 2';
                return (
                  <div
                    key={m.matchId}
                    onClick={() => onResumeMatch(m.matchId)}
                    style={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)'
                    }}
                    className="app-card p-3 flex items-center justify-between cursor-pointer hover:border-[var(--primary)] transition-all active:scale-98 shadow-sm"
                  >
                    <div>
                      <div className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
                        <span>{teamA} vs {teamB}</span>
                        {m.code && (
                          <span
                            style={{
                              backgroundColor: 'var(--card-alt)',
                              borderColor: 'var(--border)',
                              color: 'var(--orange)'
                            }}
                            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
                          >
                            {m.code}
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {curInn ? (
                          <span>
                            {curInn.battingTeam}: {curInn.score}/{curInn.wickets} ({Math.floor(curInn.legalBalls / 6)}.{curInn.legalBalls % 6} ov)
                          </span>
                        ) : (
                          <span>Status: {m.status || 'In Progress'}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold" style={{ color: 'var(--green)' }}>Resume</span>
                      <Play className="w-3.5 h-3.5" style={{ color: 'var(--green)', fill: 'var(--green)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal for Manager Registration */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Footer Branding & Developer Portal Link */}
      <footer
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        className="mt-auto pt-6 pb-2 text-center text-xs border-t flex flex-col sm:flex-row items-center justify-between gap-2"
      >
        <span>
          {"Cricket Scorer • Developed with 🏏 by "}
          <span style={{ color: 'var(--text)' }} className="font-bold">
            Syed Maaz Alam
          </span>
        </span>
        <button
          onClick={onOpenDeveloper}
          style={{ color: 'var(--primary)' }}
          className="text-xs font-bold hover:underline flex items-center gap-1 active:scale-95 transition-all"
        >
          <span>Developer Console 🔒</span>
        </button>
      </footer>
    </div>
  );
}
