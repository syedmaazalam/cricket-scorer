import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  History,
  ArrowRight,
  Play,
  Search,
  Loader2,
  Copy,
  Check,
  Lock,
  LogOut,
  ShieldCheck,
  Activity,
  Radio,
  Trophy,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Tv,
  RefreshCw
} from 'lucide-react';
import { getAllLocalMatches } from '../store/localDb.js';
import { searchMatches, deriveMatchDisplayScore, getMatchStatusMeta } from '../firebase/matches.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import AuthModal from '../components/AuthModal.jsx';
import {
  PullToRefreshIndicator,
  SkeletonCard,
  SkeletonBox,
  SegmentedCapsuleSpinner
} from '../components/ui/LoadingPrimitives.jsx';

export default function Home({ onNavigate, onResumeMatch, onWatchLive, onOpenDeveloper }) {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [localMatches, setLocalMatches] = useState([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [visibleCount, setVisibleCount] = useState(8);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [streamVisibleCount, setStreamVisibleCount] = useState(8);
  const [isStreamLoadingMore, setIsStreamLoadingMore] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const listContainerRef = useRef(null);
  const streamListContainerRef = useRef(null);

  const [managerUser, setManagerUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cricket_manager_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Active portal mode: 'choose' | 'create' | 'stream'
  const [activePortal, setActivePortal] = useState(() => {
    try {
      const saved = localStorage.getItem('cricket_manager_user');
      return saved ? 'create' : 'choose';
    } catch {
      return 'choose';
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cricket_manager_user');
      if (saved && !managerUser) {
        setManagerUser(JSON.parse(saved));
      }
    } catch (_) {}
  }, [managerUser]);

  const loadMatches = async (showSkeleton = false) => {
    if (showSkeleton) setIsLoadingMatches(true);
    try {
      const matches = await getAllLocalMatches();
      setLocalMatches(matches || []);
    } catch (e) {
      console.warn('Could not load local matches:', e);
    } finally {
      if (showSkeleton) setIsLoadingMatches(false);
    }
  };

  useEffect(() => {
    loadMatches(true);
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await loadMatches(false);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 350);
    }
  };

  const handleTouchStart = (e) => {
    const el = listContainerRef.current;
    if (el && el.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    } else {
      isPulling.current = false;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      const dist = Math.min(diff * 0.45, 90);
      setPullDistance(dist);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= 55) {
      await handleRefresh();
    } else {
      setPullDistance(0);
    }
  };

  useEffect(() => {
    setVisibleCount(8);
  }, [searchInput]);

  const handleListScroll = (e) => {
    const el = e.currentTarget;
    if (
      el.scrollTop + el.clientHeight >= el.scrollHeight - 50 &&
      visibleCount < filteredLocalMatches.length &&
      !isLoadingMore
    ) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + 6, filteredLocalMatches.length));
        setIsLoadingMore(false);
      }, 200);
    }
  };

  const handleStreamListScroll = (e) => {
    const el = e.currentTarget;
    if (
      el.scrollTop + el.clientHeight >= el.scrollHeight - 50 &&
      streamVisibleCount < localMatches.length &&
      !isStreamLoadingMore
    ) {
      setIsStreamLoadingMore(true);
      setTimeout(() => {
        setStreamVisibleCount((prev) => Math.min(prev + 6, localMatches.length));
        setIsStreamLoadingMore(false);
      }, 200);
    }
  };

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

  // Handle clicking "Create a Match"
  const handleSelectCreateMatch = () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine && !managerUser) {
      const offlineMgr = {
        uid: 'offline_' + Math.random().toString(36).substring(2, 9),
        name: 'Offline Manager',
        email: 'offline@scorer.local',
        isOffline: true
      };
      setManagerUser(offlineMgr);
      localStorage.setItem('cricket_manager_user', JSON.stringify(offlineMgr));
      localStorage.setItem('cricket_is_manager', 'true');
      setActivePortal('create');
      return;
    }

    if (!managerUser) {
      setIsAuthModalOpen(true);
    } else {
      setActivePortal('create');
    }
  };

  // Handle clicking "Stream a Match" (zero login asked)
  const handleSelectStreamMatch = () => {
    setActivePortal('stream');
  };

  const handleAuthSuccess = (userData) => {
    setManagerUser(userData);
    setActivePortal('create');
  };

  const handleLogoutManager = () => {
    localStorage.removeItem('cricket_manager_user');
    localStorage.setItem('cricket_is_manager', 'false');
    setManagerUser(null);
    setActivePortal('choose');
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

  // Filter local matches for the create section based on search
  const filteredLocalMatches = localMatches.filter(m => {
    if (!searchInput.trim()) return true;
    const clean = searchInput.trim().toLowerCase();
    const t1 = (m.teams?.[0]?.name || '').toLowerCase();
    const t2 = (m.teams?.[1]?.name || '').toLowerCase();
    const c = (m.code || '').toLowerCase();
    return t1.includes(clean) || t2.includes(clean) || c.includes(clean);
  });

  const displayedMatches = filteredLocalMatches.slice(0, visibleCount);
  const displayedStreamMatches = localMatches.slice(0, streamVisibleCount);

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col px-1.5 sm:px-5 md:px-8 py-4 w-full max-w-4xl lg:max-w-5xl mx-auto select-none transition-colors"
    >
      {/* 1. Formal Top Navigation Bar */}
      <header className="flex items-center justify-between pt-1 pb-4 border-b border-[var(--bd)] mb-4">
        <div className="flex items-center gap-2">
          {activePortal !== 'choose' && (
            <button
              onClick={() => setActivePortal('choose')}
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              className="p-2 rounded-xl border hover:text-[var(--text)] transition-colors flex items-center gap-1 text-xs"
              title="Back to portal selection"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">Portals</span>
            </button>
          )}

          {/* Portal Switcher when not on choice screen */}
          {activePortal !== 'choose' && (
            <div className="seg" role="group">
              <button
                type="button"
                onClick={handleSelectCreateMatch}
                className={activePortal === 'create' ? 'on' : ''}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
              <button
                type="button"
                onClick={handleSelectStreamMatch}
                className={activePortal === 'stream' ? 'on' : ''}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Stream</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 pr-1 sm:pr-0">
          {!managerUser && activePortal === 'choose' && (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all"
            >
              Manager Sign In
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* 2. Brand Identity Header */}
      <div className="relative py-4 sm:py-6 flex flex-col items-center text-center">
        {/* Faint green glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.14) 0%, rgba(34, 197, 94, 0) 70%)'
          }}
        />

        <div
          style={{
            backgroundColor: 'var(--card)',
            borderColor: '#22C55E',
            boxShadow: '0 0 24px rgba(34, 197, 94, 0.28), inset 0 0 12px rgba(34, 197, 94, 0.15)'
          }}
          className="relative z-10 w-16 h-16 rounded-2xl border-2 flex items-center justify-center mb-3 transition-transform hover:scale-105 shadow-lg"
        >
          <svg className="w-8 h-8 text-[#22C55E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2.5 19 7l-9.5 9.5-3.5.5.5-3.5Z" />
            <path d="m14 8 2 2" />
            <circle cx="5" cy="19" r="2" />
          </svg>
        </div>

        <h1 className="relative z-10 text-3xl sm:text-4xl font-extrabold tracking-tight m-0" style={{ color: 'var(--text)' }}>
          SmartCricket
        </h1>
        <p className="relative z-10 text-xs sm:text-sm mt-1.5 max-w-md font-medium leading-relaxed" style={{ color: 'var(--muted)' }}>
          Offline-first, event-sourced live cricket scoring and real-time match streaming.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN A: CLASSY & FORMAL FIRST SCREEN SELECTION                          */}
      {/* ========================================================================= */}
      {activePortal === 'choose' && (
        <div className="flex flex-col gap-4 max-w-xl mx-auto w-full my-auto py-2 animate-in fade-in duration-200">
          <div className="text-center mb-1">
            <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--t1)' }}>
              Choose your experience
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Select whether you want to organize a match or stream live cricket
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Option 1: Create a Match */}
            <div
              onClick={handleSelectCreateMatch}
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
              className="card glass-card p-5 sm:p-6 rounded-2xl border flex flex-col gap-3.5 cursor-pointer shadow-md hover:border-[#22C55E] hover:shadow-xl hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Trophy className="w-6 h-6 text-[#22C55E]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-[#22C55E] border border-emerald-500/30">
                      Manager Portal
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold mt-1 group-hover:text-[#22C55E] transition-colors" style={{ color: 'var(--text)' }}>
                      Do you want to create a match?
                    </h3>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-[var(--well)] border border-[var(--bd)] flex items-center justify-center text-[var(--muted)] group-hover:bg-[#22C55E] group-hover:text-white transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                Set up participating squads, customize match overs, and score live ball-by-ball with automated statistics and offline support. Requires manager login.
              </p>

              <div className="pt-2 border-t border-[var(--bd)] flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
                  {managerUser ? `Logged in as ${managerUser.name}` : 'Login required (kept logged in forever)'}
                </span>
                <span className="font-bold text-[#22C55E] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Enter Scorer Portal</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Option 2: Stream a Match */}
            <div
              onClick={handleSelectStreamMatch}
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
              className="card glass-card p-5 sm:p-6 rounded-2xl border flex flex-col gap-3.5 cursor-pointer shadow-md hover:border-[#3B82F6] hover:shadow-xl hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Radio className="w-6 h-6 text-[#3B82F6]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/15 text-[#3B82F6] border border-blue-500/30">
                      Instant Access
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold mt-1 group-hover:text-[#3B82F6] transition-colors" style={{ color: 'var(--text)' }}>
                      Do you want to stream a match?
                    </h3>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-[var(--well)] border border-[var(--bd)] flex items-center justify-center text-[var(--muted)] group-hover:bg-[#3B82F6] group-hover:text-white transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                Watch live scoreboards, ball-by-ball commentary, and interactive over comparison charts with zero-delay viewer sync. No sign in or registration required.
              </p>

              <div className="pt-2 border-t border-[var(--bd)] flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
                  Search any live match or enter 6-character match code
                </span>
                <span className="font-bold text-[#3B82F6] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Enter Live Stream</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN B: MANAGER CREATE & RESUME PORTAL                                   */}
      {/* ========================================================================= */}
      {activePortal === 'create' && (
        <div className="flex flex-col gap-5 mt-1 animate-in fade-in duration-200">
          {/* Prominent CTA "New Match" */}
          <button
            onClick={() => onNavigate('setup')}
            style={{
              background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)'
            }}
            className="w-full p-4 sm:p-5 rounded-2xl font-bold text-base flex items-center justify-between transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] shadow-lg"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <div className="font-bold text-base sm:text-lg leading-tight">Create New Match</div>
                <div className="text-xs font-normal opacity-90 leading-tight mt-0.5">
                  Configure teams, toss & match format
                </div>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </button>

          {/* Search Previous Matches Bar */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card w-full p-4 sm:p-5 flex flex-col gap-2.5 shadow-sm rounded-2xl border"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  SEARCH PREVIOUS MATCHES
                </span>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                {localMatches.length} on device
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[var(--muted)]" />
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-[#22C55E] transition-all"
              />
            </div>
          </div>

          {/* Previous Matches on This Device List */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#22C55E]" />
                <span>PREVIOUS MATCHES ON THIS DEVICE</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{filteredLocalMatches.length} found</span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh matches"
                  className="p-1 rounded hover:bg-[var(--well)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                  aria-label="Refresh matches"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#22C55E]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Pull to refresh visual indicator */}
            <PullToRefreshIndicator
              pullDistance={pullDistance}
              threshold={55}
              isRefreshing={isRefreshing}
            />

            {isLoadingMatches ? (
              <div className="flex flex-col gap-2.5 w-full">
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
              </div>
            ) : filteredLocalMatches.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--muted)'
                }}
                className="app-card p-8 text-center text-xs rounded-2xl border"
              >
                {searchInput.trim()
                  ? `No matches found matching "${searchInput}".`
                  : 'No previous matches found on this device. Tap "Create New Match" to get started!'}
              </div>
            ) : (
              <div
                ref={listContainerRef}
                onScroll={handleListScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto w-full pr-1"
              >
                {displayedMatches.map((m) => {
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
                      className="app-card w-full p-4 rounded-2xl border flex items-center justify-between cursor-pointer hover:border-[#22C55E] active:scale-[0.99] transition-all shadow-sm"
                    >
                      <div className="flex flex-col gap-1 pr-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-sm sm:text-base truncate" style={{ color: 'var(--text)' }}>
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

                        <div className="text-xs truncate font-mono" style={{ color: 'var(--muted)' }}>
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
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1"
                        >
                          {isLive && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isInningsBreak ? 'bg-[#EAB308]' : 'bg-[#22C55E]'} animate-pulse`}
                            />
                          )}
                          <span>{statusMeta.label}</span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onResumeMatch(m.matchId);
                          }}
                          style={{
                            backgroundColor: '#22C55E',
                            color: '#FFFFFF'
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-emerald-600 active:scale-95 transition-all shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Resume</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Infinite Scroll Trigger Indicator */}
                {visibleCount < filteredLocalMatches.length && (
                  <div className="py-3 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#22C55E]" />
                    <span>Loading more matches...</span>
                  </div>
                )}

                {visibleCount >= filteredLocalMatches.length && filteredLocalMatches.length > 8 && (
                  <div className="py-2 text-center text-[10px] text-[var(--muted)] font-medium">
                    All {filteredLocalMatches.length} matches loaded
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN C: VIEWER LIVE STREAM PORTAL (NO LOGIN REQUIRED)                    */}
      {/* ========================================================================= */}
      {activePortal === 'stream' && (
        <div className="flex flex-col gap-5 mt-1 animate-in fade-in duration-200">
          {/* Real-Time Live Match Search Card matching user reference image */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card w-full p-5 sm:p-6 flex flex-col gap-3.5 shadow-md rounded-3xl border"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1E6BFF]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6BFF]">
                  LIVE MATCH STREAM &amp; SEARCH
                </span>
              </div>
              <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                Zero sign in required
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-[#3B82F6]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search team name, player, or 6-char match code..."
                style={{
                  backgroundColor: 'color-mix(in srgb, #3B82F6 10%, var(--card))',
                  borderColor: 'color-mix(in srgb, #3B82F6 26%, var(--bd))',
                  color: 'var(--text)'
                }}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border text-xs sm:text-sm font-medium focus:outline-none focus:border-[#1E6BFF] transition-all"
                autoFocus
              />
            </div>

            {/* When Searching: Show centered 10-petal segmented capsule spinner */}
            {isSearching ? (
              <div className="py-12 sm:py-16 flex flex-col items-center justify-center animate-in fade-in duration-150">
                <SegmentedCapsuleSpinner size={64} />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="mt-1 flex flex-col gap-2 pt-2 border-t border-[var(--bd)] animate-in fade-in duration-150">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1" style={{ color: 'var(--muted)' }}>
                  Search Results ({searchResults.length}):
                </span>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {searchResults.map((m) => {
                    const t1 = m.teams?.[0]?.name || 'Team 1';
                    const t2 = m.teams?.[1]?.name || 'Team 2';
                    const code = m.code || '';
                    const scoreDerived = deriveMatchDisplayScore(m);
                    const statusMeta = getMatchStatusMeta(m);

                    return (
                      <div
                        key={m.matchId || m.code}
                        onClick={() => onWatchLive(code || m.matchId)}
                        style={{
                          backgroundColor: 'var(--card-alt)',
                          borderColor: 'var(--border)'
                        }}
                        className="w-full p-3.5 rounded-xl border flex items-center justify-between cursor-pointer hover:border-[#1E6BFF] transition-all"
                      >
                        <div className="flex flex-col">
                          <div className="font-bold text-xs flex items-center gap-2" style={{ color: 'var(--text)' }}>
                            <span>{t1} vs {t2}</span>
                            {code && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)] text-[#1E6BFF]">
                                #{code}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] mt-0.5 font-mono" style={{ color: 'var(--muted)' }}>
                            {scoreDerived.inn1Text} {scoreDerived.inn2Text ? `• ${scoreDerived.inn2Text}` : ''}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onWatchLive(code || m.matchId)}
                          style={{
                            backgroundColor: '#1E6BFF',
                            color: '#FFFFFF'
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-blue-700 transition-all shadow-sm"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Watch</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : searchInput.trim() ? (
              <div className="text-center py-8 text-xs text-[var(--muted)] border-t border-[var(--bd)] mt-1 animate-in fade-in duration-150">
                No active matches found matching "{searchInput}".
              </div>
            ) : null}
          </div>

          {/* Directory of Matches Available to Stream */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-1 text-[#3B82F6]">
              <Tv className="w-4 h-4" />
              <span>MATCHES AVAILABLE TO STREAM</span>
            </div>

            {isLoadingMatches ? (
              <div className="flex flex-col gap-2.5 w-full">
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
              </div>
            ) : localMatches.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--muted)'
                }}
                className="app-card p-8 text-center text-xs rounded-2xl border"
              >
                No active matches found. Enter a 6-character match code above to watch live!
              </div>
            ) : (
              <div
                ref={streamListContainerRef}
                onScroll={handleStreamListScroll}
                className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto w-full pr-1"
              >
                {displayedStreamMatches.map((m) => {
                  const teamA = m.teams?.[0]?.name || 'Team 1';
                  const teamB = m.teams?.[1]?.name || 'Team 2';
                  const scoreDerived = deriveMatchDisplayScore(m);
                  const statusMeta = getMatchStatusMeta(m);
                  const code = m.code || '';

                  return (
                    <div
                      key={m.matchId}
                      onClick={() => onWatchLive(code || m.matchId)}
                      style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)'
                      }}
                      className="app-card w-full p-4 rounded-2xl border flex items-center justify-between cursor-pointer hover:border-[#3B82F6] transition-all shadow-sm"
                    >
                      <div className="flex flex-col gap-1 pr-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-sm sm:text-base truncate" style={{ color: 'var(--text)' }}>
                            {teamA} vs {teamB}
                          </span>
                          {code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--well)] border border-[var(--border)] text-[#3B82F6]">
                              #{code}
                            </span>
                          )}
                        </div>

                        <div className="text-xs truncate font-mono" style={{ color: 'var(--muted)' }}>
                          {scoreDerived.isStarted ? (
                            <span>
                              {scoreDerived.inn1Text} {scoreDerived.inn2Text ? `• ${scoreDerived.inn2Text}` : ''}
                            </span>
                          ) : (
                            <span>Not started</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          style={{
                            backgroundColor: statusMeta.isCompleted
                              ? 'rgba(148, 163, 184, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                            color: statusMeta.isCompleted ? 'var(--muted)' : '#3B82F6',
                            borderColor: statusMeta.isCompleted ? 'var(--border)' : 'rgba(59, 130, 246, 0.3)'
                          }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1"
                        >
                          {!statusMeta.isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />}
                          <span>{statusMeta.label}</span>
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onWatchLive(code || m.matchId);
                          }}
                          style={{
                            backgroundColor: '#3B82F6',
                            color: '#FFFFFF'
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-blue-600 transition-all shadow-sm"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Watch Stream</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Stream infinite scroll loading indicator */}
                {streamVisibleCount < localMatches.length && (
                  <div className="py-3 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#3B82F6]" />
                    <span>Loading more matches...</span>
                  </div>
                )}

                {streamVisibleCount >= localMatches.length && localMatches.length > 8 && (
                  <div className="py-2 text-center text-[10px] text-[var(--muted)] font-medium">
                    All {localMatches.length} matches loaded
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal for Manager Registration */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Footer Attribution & Developer Console Link */}
      <footer
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        className="mt-auto pt-6 pb-2 text-xs border-t flex flex-col sm:flex-row items-center justify-between gap-2"
      >
        <span>
          © 2026 SmartCricket · All rights reserved
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
