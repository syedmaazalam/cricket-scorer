import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  ArrowRight,
  Play,
  Search,
  Loader2,
  Copy,
  Check,
  Lock,
  LogOut,
  Radio,
  ChevronRight,
  ArrowLeft,
  Eye,
  RefreshCw,
  Trophy,
  Tv,
  History,
  ShieldCheck
} from 'lucide-react';
import { getAllLocalMatches } from '../store/localDb.js';
import { searchMatches, deriveMatchDisplayScore, getMatchStatusMeta } from '../firebase/matches.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import AuthModal from '../components/AuthModal.jsx';
import {
  PullToRefreshIndicator,
  SkeletonCard,
  SegmentedCapsuleSpinner
} from '../components/ui/LoadingPrimitives.jsx';

export default function Home({ onNavigate, onResumeMatch, onWatchLive, onOpenDeveloper, initialPortal = 'choose' }) {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [localMatches, setLocalMatches] = useState([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [visibleCount, setVisibleCount] = useState(8);
  const [streamVisibleCount, setStreamVisibleCount] = useState(8);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isStreamLoadingMore, setIsStreamLoadingMore] = useState(false);
  const [showMatches, setShowMatches] = useState(true);
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
    } catch {
      return null;
    }
  });

  // Active portal mode: 'choose' | 'create' | 'stream'
  const [activePortal, setActivePortal] = useState(initialPortal);

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
      setPullDistance(Math.min(diff * 0.45, 90));
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

  // Real-time search for stream portal
  useEffect(() => {
    if (activePortal !== 'stream') return;
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
        const localFiltered = localMatches.filter((m) => {
          const t1 = (m.teams?.[0]?.name || '').toLowerCase();
          const t2 = (m.teams?.[1]?.name || '').toLowerCase();
          const c = (m.code || '').toLowerCase();
          const p1 = (m.teams?.[0]?.players || []).some((p) =>
            (typeof p === 'string' ? p : p.name || '').toLowerCase().includes(clean)
          );
          const p2 = (m.teams?.[1]?.players || []).some((p) =>
            (typeof p === 'string' ? p : p.name || '').toLowerCase().includes(clean)
          );
          return t1.includes(clean) || t2.includes(clean) || c.includes(clean) || p1 || p2;
        });

        const map = new Map();
        [...cloudMatches, ...localFiltered].forEach((m) => {
          const codeKey = m.code ? `code_${String(m.code).trim().toUpperCase()}` : null;
          const idKey = m.matchId || m.id;
          if (codeKey && map.has(codeKey)) return;
          if (idKey && map.has(idKey)) return;

          if (codeKey) map.set(codeKey, m);
          if (idKey) map.set(idKey, m);
        });

        const uniqueResults = Array.from(new Set(map.values()));
        setSearchResults(uniqueResults);
      } catch (err) {
        console.warn('Real-time search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(delayTimer);
  }, [searchInput, localMatches, activePortal]);

  // Handle clicking "Create a Match" -> strictly requires manager login
  const handleSelectCreateMatch = () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine && !managerUser) {
      const offlineMgr = {
        uid: 'offline_' + Math.random().toString(36).substring(2, 9),
        name: 'Offline Manager',
        email: 'offline@scorer.local',
        isOffline: true
      };
      setManagerUser(offlineMgr);
      try {
        localStorage.setItem('cricket_manager_user', JSON.stringify(offlineMgr));
        localStorage.setItem('cricket_is_manager', 'true');
      } catch {}
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
    try {
      localStorage.setItem('cricket_manager_user', JSON.stringify(userData));
      localStorage.setItem('cricket_is_manager', 'true');
    } catch {}
    setActivePortal('create');
  };

  const handleLogoutManager = () => {
    try {
      localStorage.removeItem('cricket_manager_user');
      localStorage.setItem('cricket_is_manager', 'false');
    } catch {}
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

  // Filter local matches for create portal search
  const filteredLocalMatches = localMatches.filter((m) => {
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
      className="min-h-screen flex flex-col px-2 sm:px-6 md:px-8 py-3 w-full max-w-xl mx-auto select-none transition-colors"
    >
      {/* 1. Formal Top Navigation Bar */}
      <header className="flex items-center justify-between pt-1 pb-3 w-full border-b border-[var(--border)] mb-3">
        <div className="flex items-center gap-2">
          {activePortal !== 'choose' && (
            <button
              type="button"
              onClick={() => setActivePortal('choose')}
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
              className="p-2 rounded-xl border flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--text)] active:scale-95 transition-all shadow-sm"
              title="Back to portal selection"
              aria-label="Back to portal selection"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-semibold text-xs">Portals</span>
            </button>
          )}
        </div>

        {/* Center Pill Switch: "View the Matches" (shown in create portal) - High Contrast in Light & Dark Mode */}
        {activePortal === 'create' && (
          <button
            type="button"
            onClick={() => setShowMatches((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-full border-2 transition-all cursor-pointer active:scale-95 shrink-0 flex items-center gap-1.5 text-xs font-extrabold shadow-sm ${
              showMatches
                ? 'bg-[#15803D] text-white border-[#15803D] dark:bg-emerald-500/25 dark:text-emerald-100 dark:border-[#22C55E] dark:shadow-[0_0_16px_rgba(34,197,94,0.45)]'
                : 'bg-emerald-50 text-[#15803D] border-emerald-600 dark:bg-[var(--card)] dark:text-emerald-400 dark:border-[#22C55E]/60'
            }`}
            title="Toggle view matches under search bar"
          >
            <Eye className={`w-3.5 h-3.5 ${showMatches ? 'text-white dark:text-[#22C55E]' : 'text-[#15803D] dark:text-[#22C55E]'}`} />
            <span className="text-[11px] sm:text-xs tracking-tight">View the Matches</span>
            <ChevronRight className={`w-3 h-3 transition-transform ${showMatches ? 'rotate-90 text-white dark:text-[#22C55E]' : 'text-[#15803D] dark:text-[#22C55E]'}`} />
          </button>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {!managerUser && activePortal === 'choose' && (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border hover:border-[#22C55E] hover:text-[#22C55E] transition-all"
            >
              Manager Sign In
            </button>
          )}

          {managerUser && (
            <button
              type="button"
              onClick={handleLogoutManager}
              style={{ borderColor: 'var(--border)' }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1 text-[var(--muted)] hover:text-red-400 transition-all"
              title={`Logged in as ${managerUser.name}. Tap to log out.`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}

          <ThemeToggle />
        </div>
      </header>

      {/* 2. Brand Identity Header */}
      <div className="relative py-3 sm:py-4 flex flex-col items-center text-center">
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderColor: '#22C55E',
            boxShadow: '0 0 24px rgba(34, 197, 94, 0.35), inset 0 0 12px rgba(34, 197, 94, 0.15)'
          }}
          className="relative z-10 w-16 h-16 rounded-2xl border-2 flex items-center justify-center mb-2.5 transition-transform hover:scale-105 shadow-lg overflow-hidden"
        >
          <img src="/logo.png" alt="SmartCricket Logo" className="w-full h-full object-cover rounded-xl" />
        </div>

        <h1 className="relative z-10 text-3xl sm:text-4xl font-extrabold tracking-tight m-0" style={{ color: 'var(--text)' }}>
          SmartCricket
        </h1>
        <p className="relative z-10 text-xs sm:text-sm mt-1 max-w-sm font-medium leading-relaxed" style={{ color: 'var(--muted)' }}>
          Offline-first, event-sourced live cricket scoring and real-time match streaming.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN A: FORMAL PORTAL SELECTION (Choose Experience)                    */}
      {/* ========================================================================= */}
      {activePortal === 'choose' && (
        <div className="flex flex-col gap-4 max-w-xl mx-auto w-full my-auto py-2 animate-in fade-in duration-200">
          <div className="text-center mb-1">
            <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>
              Choose your experience
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Select whether you want to organize a match or stream live cricket
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Option 1: Create a Match (Manager Portal - STRICTLY REQUIRES MANAGER LOGIN) */}
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
                <div className="w-9 h-9 rounded-full bg-[var(--well)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover:bg-[#22C55E] group-hover:text-white transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                Set up participating squads, customize match overs, and score live ball-by-ball with automated statistics and offline support. Requires manager login.
              </p>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
                  {managerUser ? `Logged in as ${managerUser.name}` : 'Login required (kept logged in forever)'}
                </span>
                <span className="font-bold text-[#22C55E] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Enter Scorer Portal</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Option 2: Stream a Match (Viewer Portal - ZERO LOGIN REQUIRED) */}
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
                <div className="w-9 h-9 rounded-full bg-[var(--well)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)] group-hover:bg-[#3B82F6] group-hover:text-white transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                Watch live scoreboards, ball-by-ball commentary, and interactive over comparison charts with zero-delay viewer sync. No sign in or registration required.
              </p>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs">
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
      {/* SCREEN B: MANAGER CREATE & RESUME PORTAL (Matches under search bar)       */}
      {/* ========================================================================= */}
      {activePortal === 'create' && (
        <div className="flex flex-col gap-4 mt-1 animate-in fade-in duration-200">
          {/* Prominent CTA "Create New Match" */}
          <button
            type="button"
            onClick={() => {
              if (!managerUser) {
                setIsAuthModalOpen(true);
              } else {
                onNavigate('setup');
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(34, 197, 94, 0.35)'
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

          {/* Unified Search Card: SEARCH ON THIS DEVICE & Matches List Directly Underneath */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card w-full p-4 sm:p-5 flex flex-col gap-3 shadow-sm rounded-2xl border transition-all mb-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  SEARCH ON THIS DEVICE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  {localMatches.length} on device
                </span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh matches list"
                  className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[#22C55E]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Search Input */}
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-[#22C55E] transition-all font-medium"
              />
            </div>

            {/* Matches list rendered directly under the search bar */}
            {showMatches && (
              <div className="mt-1 flex flex-col gap-2.5">
                <PullToRefreshIndicator
                  pullDistance={pullDistance}
                  threshold={55}
                  isRefreshing={isRefreshing}
                />

                {isLoadingMatches ? (
                  <div className="flex flex-col gap-2 w-full pt-1">
                    <SkeletonCard lines={2} />
                    <SkeletonCard lines={2} />
                  </div>
                ) : filteredLocalMatches.length === 0 ? (
                  <div
                    style={{
                      backgroundColor: 'var(--card-alt)',
                      borderColor: 'var(--border)',
                      color: 'var(--muted)'
                    }}
                    className="p-6 text-center text-xs rounded-xl border font-medium"
                  >
                    {searchInput.trim()
                      ? `No matches found matching "${searchInput}".`
                      : 'No previous matches found on this device.'}
                  </div>
                ) : (
                  <div
                    ref={listContainerRef}
                    onScroll={handleListScroll}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto w-full pr-0.5"
                  >
                    {displayedMatches.map((m) => {
                      const teamA = m.teams?.[0]?.name || 'Team 1';
                      const teamB = m.teams?.[1]?.name || 'Team 2';
                      const scoreDerived = deriveMatchDisplayScore(m);
                      const statusMeta = getMatchStatusMeta(m);
                      const isCompleted = statusMeta.isCompleted;
                      const code = m.code || '';

                      return (
                        <div
                          key={m.matchId}
                          onClick={() => onResumeMatch(m.matchId)}
                          style={{
                            backgroundColor: 'var(--card-alt)',
                            borderColor: 'var(--border)'
                          }}
                          className="app-card w-full p-3.5 rounded-xl border flex items-center justify-between cursor-pointer hover:border-[#22C55E] transition-all shadow-sm group"
                        >
                          <div className="flex flex-col gap-1 pr-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-xs sm:text-sm truncate" style={{ color: 'var(--text)' }}>
                                {teamA} vs {teamB}
                              </span>
                              {code && (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyCode(e, code)}
                                  style={{
                                    backgroundColor: 'var(--card)',
                                    borderColor: 'var(--border)'
                                  }}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-[#22C55E] flex items-center gap-1 hover:border-[#22C55E] transition-colors"
                                  title="Copy match code"
                                >
                                  <span>#{code}</span>
                                  {copiedCode === code ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5 opacity-60" />}
                                </button>
                              )}
                            </div>

                            <div className="text-[11px] truncate font-mono" style={{ color: 'var(--muted)' }}>
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
                                backgroundColor: isCompleted
                                  ? 'rgba(148, 163, 184, 0.15)'
                                  : 'rgba(34, 197, 94, 0.15)',
                                color: isCompleted ? 'var(--muted)' : '#22C55E',
                                borderColor: isCompleted ? 'var(--border)' : 'rgba(34, 197, 94, 0.3)'
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1"
                            >
                              {!isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />}
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
                              className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-emerald-600 transition-all shadow-sm"
                            >
                              <Play className="w-3 h-3" />
                              <span>Score</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onWatchLive(m.matchId, code);
                              }}
                              style={{
                                backgroundColor: 'var(--card)',
                                borderColor: 'var(--border)',
                                color: 'var(--text)'
                              }}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 hover:border-[#3B82F6] hover:text-[#3B82F6] transition-all shadow-sm"
                            >
                              <Radio className="w-3 h-3 text-[#3B82F6]" />
                              <span>Watch</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {visibleCount < filteredLocalMatches.length && (
                      <div className="py-2.5 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#22C55E]" />
                        <span>Loading more matches...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN C: VIEWER LIVE STREAM PORTAL (Zero Login Required)                  */}
      {/* ========================================================================= */}
      {activePortal === 'stream' && (
        <div className="flex flex-col gap-4 mt-1 animate-in fade-in duration-200">
          {/* Real-Time Live Match Search Card */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card w-full p-4 sm:p-5 flex flex-col gap-3 shadow-md rounded-2xl border"
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
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium focus:outline-none focus:border-[#1E6BFF] transition-all"
                autoFocus
              />
            </div>

            {/* When Searching: Show centered segmented capsule spinner */}
            {isSearching ? (
              <div className="py-8 flex flex-col items-center justify-center animate-in fade-in duration-150">
                <SegmentedCapsuleSpinner size={48} />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="mt-1 flex flex-col gap-2 pt-2 border-t border-[var(--border)] animate-in fade-in duration-150">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1" style={{ color: 'var(--muted)' }}>
                  Search Results ({searchResults.length}):
                </span>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {searchResults.map((m) => {
                    const t1 = m.teams?.[0]?.name || 'Team 1';
                    const t2 = m.teams?.[1]?.name || 'Team 2';
                    const code = m.code || '';
                    const scoreDerived = deriveMatchDisplayScore(m);

                    return (
                      <div
                        key={m.matchId || m.code}
                        onClick={() => onWatchLive(m.matchId, code)}
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
                          onClick={() => onWatchLive(m.matchId, code)}
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
              <div className="text-center py-6 text-xs text-[var(--muted)] border-t border-[var(--border)] mt-1 animate-in fade-in duration-150">
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
                className="app-card p-6 text-center text-xs rounded-xl border"
              >
                No active matches found. Enter a 6-character match code above to watch live!
              </div>
            ) : (
              <div
                ref={streamListContainerRef}
                onScroll={handleStreamListScroll}
                className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto w-full pr-1"
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
                      onClick={() => onWatchLive(m.matchId, code)}
                      style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)'
                      }}
                      className="app-card w-full p-4 rounded-xl border flex items-center justify-between cursor-pointer hover:border-[#3B82F6] transition-all shadow-sm"
                    >
                      <div className="flex flex-col gap-1 pr-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-xs sm:text-sm truncate" style={{ color: 'var(--text)' }}>
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
                            onWatchLive(m.matchId, code);
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

                {streamVisibleCount < localMatches.length && (
                  <div className="py-2.5 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3B82F6]" />
                    <span>Loading more matches...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal for Manager Registration / Login */}
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
          type="button"
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
