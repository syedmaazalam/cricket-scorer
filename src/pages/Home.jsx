import React, { useState, useEffect } from 'react';
import { Plus, History, ArrowRight, Play, Search, Loader2, Copy, Check, Lock, LogOut, ShieldCheck, Activity } from 'lucide-react';
import { getAllLocalMatches } from '../store/localDb.js';
import { searchMatches, deriveMatchDisplayScore, getMatchStatusMeta } from '../firebase/matches.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import AuthModal from '../components/AuthModal.jsx';

export default function Home({ onNavigate, onResumeMatch, onWatchLive, onOpenDeveloper }) {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [localMatches, setLocalMatches] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

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

  // Real-time instant search as user types
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
          const p1 = (m.teams?.[0]?.players || []).some(p => (typeof p === 'string' ? p : p.name || '').toLowerCase().includes(clean));
          const p2 = (m.teams?.[1]?.players || []).some(p => (typeof p === 'string' ? p : p.name || '').toLowerCase().includes(clean));
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
    }, 220);

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

  const handleCopyCode = (e, code) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col p-4 max-w-xl mx-auto select-none transition-colors"
    >
      {/* 1. Top Bar */}
      <div className="flex items-center justify-between pt-1 pb-4">
        {managerUser ? (
          <div className="flex items-center gap-2">
            <div
              style={{
                backgroundColor: 'var(--green-15)',
                color: 'var(--primary)',
                borderColor: 'var(--border)'
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="truncate max-w-[140px]">{managerUser.name || 'Manager'}</span>
            </div>
            <button
              onClick={handleLogoutManager}
              title="Sign Out Manager"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              className="p-2 rounded-lg border hover:text-[var(--red)] transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            style={{
              backgroundColor: 'transparent',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
            className="px-3 py-2 rounded-lg text-xs font-medium border hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
          >
            Manager Sign In
          </button>
        )}

        <ThemeToggle />
      </div>

      {/* 2. Header with Faint Radial Green Glow */}
      <div className="relative py-6 flex flex-col items-center text-center">
        {/* Faint radial green glow behind the logo */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0) 70%)'
          }}
        />

        {/* 64px rounded-square logo tile with bat icon and glowing green border */}
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderColor: '#22C55E',
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.25), inset 0 0 12px rgba(34, 197, 94, 0.15)'
          }}
          className="relative z-10 w-16 h-16 rounded-xl border-2 flex items-center justify-center mb-3 transition-transform hover:scale-105"
        >
          {/* Custom vector cricket bat icon */}
          <svg className="w-8 h-8 text-[#22C55E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2.5 19 7l-9.5 9.5-3.5.5.5-3.5Z" />
            <path d="m14 8 2 2" />
            <circle cx="5" cy="19" r="2" />
          </svg>
        </div>

        <h1 className="relative z-10 text-3xl font-bold tracking-tight m-0" style={{ color: 'var(--text)' }}>
          SmartCricket
        </h1>
        <p className="relative z-10 text-xs mt-1.5 max-w-[320px] font-normal leading-relaxed text-[#CBD5E1]">
          Offline-first, event-sourced live cricket scoring with zero-delay viewer sync.
        </p>
      </div>

      {/* Main Actions Container */}
      <div className="flex flex-col gap-5 mt-2">
        {/* 3. CTA "New Match (Manager)" */}
        <button
          onClick={handleCreateMatchClick}
          style={{
            background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)'
          }}
          className="w-full p-4 rounded-xl font-semibold text-base flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-base leading-tight">New Match (Manager)</div>
              <div className="text-xs font-normal opacity-90 leading-tight mt-0.5">
                {managerUser ? `Logged in as ${managerUser.name}` : 'Registration required to manage'}
              </div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </button>

        {/* 4. Search Card */}
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
          className="app-card p-4 flex flex-col gap-2.5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              REAL-TIME MATCH SEARCH
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search team, player, or 6-char code..."
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border text-xs font-normal focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] transition-all"
            />
            {isSearching && (
              <Loader2 className="w-4 h-4 animate-spin absolute right-3.5 top-3 text-[#22C55E]" />
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-1 flex flex-col gap-1.5 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-medium uppercase" style={{ color: 'var(--muted)' }}>
                Found Matches ({searchResults.length}):
              </span>
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {searchResults.map((m) => {
                  const t1 = m.teams?.[0]?.name || 'Team 1';
                  const t2 = m.teams?.[1]?.name || 'Team 2';
                  const code = m.code || '';
                  const scoreDerived = deriveMatchDisplayScore(m);
                  const statusMeta = getMatchStatusMeta(m);
                  const isCompleted = statusMeta.isCompleted;
                  const isInningsBreak = statusMeta.isInningsBreak;
                  const isLive = !isCompleted;

                  return (
                    <div
                      key={m.matchId || m.code}
                      onClick={() => onWatchLive(code || m.matchId)}
                      style={{
                        backgroundColor: 'var(--card-alt)',
                        borderColor: 'var(--border)'
                      }}
                      className="p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:border-[#22C55E] transition-all"
                    >
                      <div className="flex flex-col">
                        <div className="font-semibold text-xs flex items-center gap-2" style={{ color: 'var(--text)' }}>
                          <span>{t1} vs {t2}</span>
                          {code && (
                            <button
                              onClick={(e) => handleCopyCode(e, code)}
                              style={{
                                backgroundColor: 'var(--card)',
                                borderColor: 'var(--border)',
                                color: 'var(--muted)'
                              }}
                              className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md border flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                            >
                              <span>{code}</span>
                              {copiedCode === code ? (
                                <span className="text-[9px] text-[#22C55E]">Copied</span>
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                          {scoreDerived.inn1Text} {scoreDerived.inn2Text ? `• ${scoreDerived.inn2Text}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            backgroundColor: isCompleted
                              ? 'rgba(148, 163, 184, 0.15)'
                              : isInningsBreak
                              ? 'rgba(234, 179, 8, 0.15)'
                              : 'rgba(34, 197, 94, 0.15)',
                            color: isCompleted
                              ? 'var(--muted)'
                              : isInningsBreak
                              ? '#EAB308'
                              : '#22C55E',
                            borderColor: isCompleted
                              ? 'var(--border)'
                              : isInningsBreak
                              ? 'rgba(234, 179, 8, 0.3)'
                              : 'rgba(34, 197, 94, 0.3)'
                          }}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1"
                        >
                          {isLive && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isInningsBreak ? 'bg-[#EAB308]' : 'bg-[#22C55E]'} animate-pulse`}
                            />
                          )}
                          <span>{statusMeta.label}</span>
                        </span>
                      </div>
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

        {/* 5. Section Label & 6. Match Cards */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider px-1" style={{ color: 'var(--muted)' }}>
            <History className="w-4 h-4 text-[#22C55E]" />
            <span>RECENT MATCHES ON THIS DEVICE</span>
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
            <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
              {localMatches.map((m) => {
                const teamA = m.teams?.[0]?.name || 'Team 1';
                const teamB = m.teams?.[1]?.name || 'Team 2';
                const scoreDerived = deriveMatchDisplayScore(m);
                const statusMeta = getMatchStatusMeta(m);
                const isCompleted = statusMeta.isCompleted;
                const isInningsBreak = statusMeta.isInningsBreak;
                const isLive = !isCompleted;
                const code = m.code || '';

                return (
                  <div
                    key={m.matchId}
                    onClick={() => onResumeMatch(m.matchId)}
                    style={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)'
                    }}
                    className="app-card p-3.5 flex items-center justify-between cursor-pointer hover:border-[#22C55E] active:scale-[0.99] transition-all shadow-sm"
                  >
                    <div className="flex flex-col gap-1 pr-2 min-w-0">
                      {/* Stacked team names (600) */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                          {teamA} vs {teamB}
                        </span>
                        {code && (
                          <button
                            onClick={(e) => handleCopyCode(e, code)}
                            title="Copy match code"
                            style={{
                              backgroundColor: 'var(--card-alt)',
                              borderColor: 'var(--border)',
                              color: 'var(--muted)'
                            }}
                            className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md border flex items-center gap-1 hover:text-[var(--text)] transition-colors shrink-0"
                          >
                            <span>{code}</span>
                            {copiedCode === code ? (
                              <span className="text-[9px] text-[#22C55E]">Copied</span>
                            ) : (
                              <Copy className="w-2.5 h-2.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Muted score line */}
                      <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                        {scoreDerived.isStarted ? (
                          <span>
                            {scoreDerived.inn1Text} {scoreDerived.inn2Text ? `• ${scoreDerived.inn2Text}` : ''}
                          </span>
                        ) : (
                          <span>Not started</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Status chip */}
                      <span
                        style={{
                          backgroundColor: isCompleted
                            ? 'rgba(148, 163, 184, 0.15)'
                            : isInningsBreak
                            ? 'rgba(234, 179, 8, 0.15)'
                            : 'rgba(34, 197, 94, 0.15)',
                          color: isCompleted
                            ? 'var(--muted)'
                            : isInningsBreak
                            ? '#EAB308'
                            : '#22C55E',
                          borderColor: isCompleted
                            ? 'var(--border)'
                            : isInningsBreak
                            ? 'rgba(234, 179, 8, 0.3)'
                            : 'rgba(34, 197, 94, 0.3)'
                        }}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1"
                      >
                        {isLive && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isInningsBreak ? 'bg-[#EAB308]' : 'bg-[#22C55E]'} animate-pulse`}
                          />
                        )}
                        <span>{statusMeta.label}</span>
                      </span>

                      {/* Outlined green "Resume" button with Play icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResumeMatch(m.matchId);
                        }}
                        style={{
                          borderColor: '#22C55E',
                          color: '#22C55E',
                          backgroundColor: 'transparent'
                        }}
                        className="px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 hover:bg-[#22C55E]/10 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-[#22C55E]" />
                        <span>Resume</span>
                      </button>
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

      {/* 7. Footer */}
      <footer
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        className="mt-auto pt-6 pb-2 text-xs border-t flex flex-col sm:flex-row items-center justify-between gap-2"
      >
        <span>
          {"© 2026 SmartCricket · Developed by "}
          <span className="text-[#F8FAFC] font-semibold">
            Syed Maaz Alam
          </span>
        </span>
        <button
          onClick={onOpenDeveloper}
          style={{ color: 'var(--muted)' }}
          className="text-xs font-medium hover:text-[#22C55E] flex items-center gap-1 active:scale-95 transition-all"
        >
          <Lock className="w-3 h-3" />
          <span>Developer Console</span>
        </button>
      </footer>
    </div>
  );
}
