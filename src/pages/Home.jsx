import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  ArrowRight,
  Play,
  Search,
  Loader2,
  Copy,
  Lock,
  Radio,
  ChevronRight,
  ArrowLeft,
  Eye,
  RefreshCw
} from 'lucide-react';
import { getAllLocalMatches } from '../store/localDb.js';
import { deriveMatchDisplayScore, getMatchStatusMeta } from '../firebase/matches.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import AuthModal from '../components/AuthModal.jsx';
import {
  PullToRefreshIndicator,
  SkeletonCard
} from '../components/ui/LoadingPrimitives.jsx';

export default function Home({ onNavigate, onResumeMatch, onWatchLive, onOpenDeveloper }) {
  const [searchInput, setSearchInput] = useState('');
  const [localMatches, setLocalMatches] = useState([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [visibleCount, setVisibleCount] = useState(8);
  const [showMatches, setShowMatches] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const listContainerRef = useRef(null);

  const [managerUser, setManagerUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cricket_manager_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

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
      }, 400);
    }
  };

  const handleTouchStart = (e) => {
    if (listContainerRef.current && listContainerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.45, 90));
    }
  };

  const handleTouchEnd = () => {
    if (isPulling.current) {
      if (pullDistance > 55) {
        handleRefresh();
      }
      setPullDistance(0);
      isPulling.current = false;
    }
  };

  const handleListScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      if (visibleCount < filteredLocalMatches.length) {
        setVisibleCount((prev) => Math.min(prev + 6, filteredLocalMatches.length));
      }
    }
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

  // Filter local matches based on search
  const filteredLocalMatches = localMatches.filter((m) => {
    if (!searchInput.trim()) return true;
    const clean = searchInput.trim().toLowerCase();
    const t1 = (m.teams?.[0]?.name || '').toLowerCase();
    const t2 = (m.teams?.[1]?.name || '').toLowerCase();
    const c = (m.code || '').toLowerCase();
    return t1.includes(clean) || t2.includes(clean) || c.includes(clean);
  });

  const displayedMatches = filteredLocalMatches.slice(0, visibleCount);

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col px-2 sm:px-6 md:px-8 py-3 w-full max-w-xl mx-auto select-none transition-colors"
    >
      {/* 1. Top Navigation Bar with Back, glowing "View the Matches" switch, and ThemeToggle */}
      <header className="flex items-center justify-between pt-2 pb-3 w-full">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history?.length > 1) {
              window.history.back();
            }
          }}
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
          className="w-10 h-10 rounded-full border flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] active:scale-95 transition-all shadow-sm"
          title="Go back"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Glowing Pill Switch: "View the Matches" */}
        <button
          type="button"
          onClick={() => setShowMatches((prev) => !prev)}
          style={{
            backgroundColor: showMatches ? 'rgba(34, 197, 94, 0.15)' : 'var(--card)',
            borderColor: '#22C55E',
            boxShadow: '0 0 16px rgba(34, 197, 94, 0.55)'
          }}
          className="px-4 py-1.5 rounded-full border-2 flex items-center gap-2 text-xs font-bold text-white transition-all cursor-pointer active:scale-95"
          title="Toggle view matches under search bar"
        >
          <Eye className="w-4 h-4 text-[#22C55E]" />
          <span>View the Matches</span>
          <ChevronRight className={`w-3.5 h-3.5 text-[#22C55E] transition-transform ${showMatches ? 'rotate-90' : ''}`} />
        </button>

        <ThemeToggle />
      </header>

      {/* 2. Brand Identity Header */}
      <div className="relative py-4 sm:py-5 flex flex-col items-center text-center">
        {/* Glowing Cricket Bat/Ball Icon */}
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderColor: '#22C55E',
            boxShadow: '0 0 24px rgba(34, 197, 94, 0.35), inset 0 0 12px rgba(34, 197, 94, 0.15)'
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
        <p className="relative z-10 text-xs sm:text-sm mt-1.5 max-w-sm font-medium leading-relaxed" style={{ color: 'var(--muted)' }}>
          Offline-first, event-sourced live cricket scoring and real-time match streaming.
        </p>
      </div>

      {/* 3. Prominent CTA Button: Create New Match */}
      <div className="w-full my-3">
        <button
          type="button"
          onClick={() => onNavigate('setup')}
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
      </div>

      {/* 4. Unified Search Card: SEARCH ON THIS DEVICE & Matches list underneath */}
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}
        className="app-card w-full p-4 sm:p-5 flex flex-col gap-3 shadow-sm rounded-2xl border transition-all mt-1 mb-6"
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
                className="p-6 text-center text-xs rounded-xl border mt-1"
              >
                {searchInput.trim()
                  ? `No matches found matching "${searchInput}".`
                  : 'No matches found on this device. Tap "Create New Match" to get started!'}
              </div>
            ) : (
              <div
                ref={listContainerRef}
                onScroll={handleListScroll}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="flex flex-col gap-2.5 max-h-[440px] overflow-y-auto w-full pr-1 pt-1"
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
                      className="w-full p-3.5 rounded-xl border flex items-center justify-between cursor-pointer hover:border-[#22C55E] active:scale-[0.99] transition-all shadow-sm"
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
                              title="Copy match code"
                              style={{
                                backgroundColor: 'var(--card)',
                                borderColor: 'var(--border)',
                                color: 'var(--muted)'
                              }}
                              className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border flex items-center gap-1 hover:text-[var(--text)] transition-colors shrink-0"
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

                        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--muted)' }}>
                          <span>{scoreDerived.scoreLine}</span>
                          <span>•</span>
                          <span className={`font-semibold ${isCompleted ? 'text-[var(--muted)]' : 'text-[#22C55E]'}`}>
                            {statusMeta.statusText}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onWatchLive) onWatchLive(code || m.matchId);
                          }}
                          style={{
                            backgroundColor: 'transparent',
                            borderColor: 'var(--border)',
                            color: 'var(--text)'
                          }}
                          className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold hover:border-[#3B82F6] hover:text-[#3B82F6] flex items-center gap-1 transition-all"
                        >
                          <Radio className="w-3 h-3 text-[#3B82F6]" />
                          <span>Watch</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onResumeMatch(m.matchId)}
                          style={{
                            backgroundColor: 'var(--primary)',
                            color: '#FFFFFF'
                          }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 hover:brightness-105 active:scale-95 transition-all shadow-sm"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Score</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {visibleCount < filteredLocalMatches.length && (
                  <div className="py-2 flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#22C55E]" />
                    <span>Scroll to view more matches...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auth Modal (if user wants manager registration) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(userData) => {
          setManagerUser(userData);
          setIsAuthModalOpen(false);
        }}
      />

      {/* Footer Attribution & Developer Console Link */}
      <footer
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        className="mt-auto pt-6 pb-4 text-xs border-t flex flex-col items-center justify-center gap-2 text-center"
      >
        <span>© 2026 SmartCricket – All rights reserved</span>
        <button
          type="button"
          onClick={onOpenDeveloper}
          style={{ color: 'var(--muted)' }}
          className="text-xs font-medium hover:text-[#22C55E] flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
        >
          <Lock className="w-3 h-3" />
          <span>Developer Console</span>
        </button>
      </footer>
    </div>
  );
}
