import React, { useState, useEffect } from 'react';
import Home from './pages/Home.jsx';
import Setup from './pages/Setup.jsx';
import Scoring from './pages/Scoring.jsx';
import Scorecard from './pages/Scorecard.jsx';
import Live from './pages/Live.jsx';
import MatchSummary from './pages/MatchSummary.jsx';
import DeveloperDashboard from './pages/DeveloperDashboard.jsx';
import UpdateNotificationBanner from './components/UpdateNotificationBanner.jsx';
import { TopProgressBar } from './components/ui/LoadingPrimitives.jsx';
import { useMatch } from './store/useMatch.js';
import { createMatchInCloud, findMatchByCode } from './firebase/matches.js';
import { getMatchSnapshot } from './store/localDb.js';
import {
  initNavigation,
  pushScreen,
  handleBackPress,
  resetToHome,
  subscribeToNavigation,
  subscribeToExitToast,
  initHardwareAndBrowserBack
} from './services/navigationManager.js';

export default function App() {
  const getInitialRouting = () => {
    if (typeof window !== 'undefined') {
      const bridgeCode = window.ScorecardBridge?.getPendingDeepLink?.();
      const pendingCode = bridgeCode || window.__pendingDeepLink;
      if (pendingCode) {
        return {
          page: 'live',
          matchId: null,
          liveCode: pendingCode.trim().toUpperCase(),
          isManager: false,
          initialPortal: 'stream'
        };
      }

      const path = (window.location.pathname || '').trim();

      if (path === '/developer') {
        return { page: 'developer', matchId: null, liveCode: null, isManager: false, initialPortal: 'choose' };
      }

      if (path === '/scorer') {
        return { page: 'home', matchId: null, liveCode: null, isManager: true, initialPortal: 'create' };
      }

      if (path === '/setup') {
        return { page: 'setup', matchId: null, liveCode: null, isManager: true, initialPortal: 'create' };
      }

      const liveMatch = path.match(/^\/live\/([^/?#]+)/i);
      if (liveMatch && liveMatch[1]) {
        return {
          page: 'live',
          matchId: null,
          liveCode: liveMatch[1].trim().toUpperCase(),
          isManager: false,
          initialPortal: 'stream'
        };
      }

      const matchRoute = path.match(/^\/match\/([^/?#]+)/i);
      if (matchRoute && matchRoute[1]) {
        const idOrCode = matchRoute[1].trim();
        const isManagerSaved = typeof localStorage !== 'undefined' && localStorage.getItem('cricket_is_manager') === 'true';
        return {
          page: isManagerSaved ? 'scoring' : 'live',
          matchId: idOrCode,
          liveCode: idOrCode.toUpperCase(),
          isManager: isManagerSaved,
          initialPortal: isManagerSaved ? 'create' : 'stream'
        };
      }

      const summaryMatch = path.match(/^\/summary\/([^/?#]+)/i);
      if (summaryMatch && summaryMatch[1]) {
        return {
          page: 'summary',
          matchId: summaryMatch[1].trim(),
          liveCode: summaryMatch[1].trim().toUpperCase(),
          isManager: false,
          initialPortal: 'stream'
        };
      }

      const scorecardMatch = path.match(/^\/scorecard\/([^/?#]+)/i);
      if (scorecardMatch && scorecardMatch[1]) {
        return {
          page: 'scorecard',
          matchId: scorecardMatch[1].trim(),
          liveCode: scorecardMatch[1].trim().toUpperCase(),
          isManager: false,
          initialPortal: 'stream'
        };
      }
    }

    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    if (params.get('dev') === 'true') {
      return {
        page: 'developer',
        matchId: null,
        liveCode: null,
        isManager: false,
        initialPortal: 'choose'
      };
    }

    const summaryCode = params.get('summary');
    if (summaryCode) {
      return {
        page: 'summary',
        matchId: null,
        liveCode: summaryCode.toUpperCase(),
        isManager: false,
        initialPortal: 'stream'
      };
    }

    const watchCode = params.get('watch') || params.get('match') || params.get('code');
    if (watchCode) {
      return {
        page: 'live',
        matchId: null,
        liveCode: watchCode.toUpperCase(),
        isManager: false,
        initialPortal: 'stream'
      };
    }

    // Default: home
    return { page: 'home', matchId: null, liveCode: null, isManager: false };
  };

  const initial = getInitialRouting();
  const [page, setPage] = useState(initial.page);
  const [activeMatchId, setActiveMatchId] = useState(initial.matchId);
  const [liveCodeOrId, setLiveCodeOrId] = useState(initial.liveCode);
  const [isManager, setIsManager] = useState(initial.isManager);
  const [homePortal, setHomePortal] = useState(initial.initialPortal || 'choose');
  const [viewedMatchState, setViewedMatchState] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);

  const updateBrowserUrl = (screen) => {
    if (typeof window === 'undefined' || !window.history?.replaceState) return;
    let targetPath = '/';
    if (screen.page === 'developer') {
      targetPath = '/developer';
    } else if (screen.page === 'setup') {
      targetPath = '/setup';
    } else if (screen.page === 'scoring' && screen.activeMatchId) {
      targetPath = `/match/${screen.activeMatchId}`;
    } else if (screen.page === 'live' && (screen.liveCodeOrId || screen.activeMatchId)) {
      targetPath = `/live/${screen.liveCodeOrId || screen.activeMatchId}`;
    } else if (screen.page === 'summary' && (screen.liveCodeOrId || screen.activeMatchId)) {
      targetPath = `/summary/${screen.liveCodeOrId || screen.activeMatchId}`;
    } else if (screen.page === 'scorecard' && (screen.liveCodeOrId || screen.activeMatchId)) {
      targetPath = `/scorecard/${screen.liveCodeOrId || screen.activeMatchId}`;
    } else if (screen.page === 'home') {
      targetPath = (screen.isManager || screen.initialPortal === 'create') ? '/scorer' : '/';
    }

    if (window.location.pathname !== targetPath) {
      try {
        window.history.pushState({ ...screen }, '', targetPath);
      } catch {}
    }
  };

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 280);
    return () => clearTimeout(timer);
  }, [page]);

  // Persist state across refresh so match is never lost
  useEffect(() => {
    localStorage.setItem('cricket_current_page', page);
    if (activeMatchId) localStorage.setItem('cricket_active_match_id', activeMatchId);
    if (liveCodeOrId) localStorage.setItem('cricket_live_code', liveCodeOrId);
    localStorage.setItem('cricket_is_manager', isManager ? 'true' : 'false');
  }, [page, activeMatchId, liveCodeOrId, isManager]);

  // Initialize navigation manager, hardware back listener and exit toast subscriber
  useEffect(() => {
    initNavigation(initial);
    const cleanupHardware = initHardwareAndBrowserBack();
    const unsubNav = subscribeToNavigation((currentScreen) => {
      setPage(currentScreen.page);
      setActiveMatchId(currentScreen.activeMatchId);
      setLiveCodeOrId(currentScreen.liveCodeOrId);
      setIsManager(currentScreen.isManager);
      if (currentScreen.initialPortal) {
        setHomePortal(currentScreen.initialPortal);
      } else if (currentScreen.isManager) {
        setHomePortal('create');
      }
      if (currentScreen.viewedMatchState !== undefined) {
        setViewedMatchState(currentScreen.viewedMatchState);
      }
      updateBrowserUrl(currentScreen);
    });
    const unsubToast = subscribeToExitToast((show) => {
      setShowExitToast(show);
    });

    const handlePopState = () => {
      const nextRoute = getInitialRouting();
      pushScreen(nextRoute);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      cleanupHardware();
      unsubNav();
      unsubToast();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Handle incoming Android deep links (cold launch or runtime resume)
  useEffect(() => {
    const handleIncomingMatchCode = (code) => {
      if (!code) return;
      const cleanCode = code.trim().toUpperCase();
      setIsManager(false);
      setLiveCodeOrId(cleanCode);
      setActiveMatchId(cleanCode);
      pushScreen({
        page: 'live',
        activeMatchId: cleanCode,
        liveCodeOrId: cleanCode,
        isManager: false,
        viewedMatchState: null
      });
    };

    window.handleDeepLink = handleIncomingMatchCode;

    const onCustomDeepLink = (event) => {
      const code = event?.detail?.matchCode;
      if (code) handleIncomingMatchCode(code);
    };
    window.addEventListener('smartcricket:deeplink', onCustomDeepLink);

    // Also check if native bridge has a queued deep link code
    if (window.ScorecardBridge?.getPendingDeepLink) {
      const nativeCode = window.ScorecardBridge.getPendingDeepLink();
      if (nativeCode) handleIncomingMatchCode(nativeCode);
    } else if (window.__pendingDeepLink) {
      handleIncomingMatchCode(window.__pendingDeepLink);
      window.__pendingDeepLink = null;
    }

    return () => {
      window.removeEventListener('smartcricket:deeplink', onCustomDeepLink);
      delete window.handleDeepLink;
    };
  }, []);

  // Eagerly resolve match code to matchId for live spectator
  useEffect(() => {
    let isCancelled = false;
    async function resolveLiveCode() {
      if (!liveCodeOrId) return;
      const cleanCode = liveCodeOrId.trim().toUpperCase();
      try {
        const matchData = await findMatchByCode(cleanCode);
        if (matchData?.matchId && !isCancelled) {
          setActiveMatchId(matchData.matchId);
          localStorage.setItem('cricket_active_match_id', matchData.matchId);
        } else if (!activeMatchId && !isCancelled) {
          setActiveMatchId(cleanCode);
        }
      } catch (e) {
        console.warn('Could not resolve match code:', e);
        if (!activeMatchId && !isCancelled) {
          setActiveMatchId(cleanCode);
        }
      }
    }

    if (!isManager && liveCodeOrId && (!activeMatchId || activeMatchId.length === 6 || activeMatchId === liveCodeOrId)) {
      resolveLiveCode();
    }

    return () => {
      isCancelled = true;
    };
  }, [liveCodeOrId, isManager, activeMatchId]);

  // Top-level match subscription: Scorer mode gets full write API; Spectator mode streams events
  const isSpectator = !isManager && (page === 'live' || page === 'scorecard' || page === 'summary');
  const {
    matchState,
    syncStatus,
    scorerOfflineInfo,
    leaseConflict,
    tabLockConflict,
    isReconciling,
    loadFullMatchEvents,
    takeOverScoring,
    startMatch,
    recordBall,
    editBall,
    swapBatter,
    changeBowler,
    addNewBatter,
    retireBatter,
    editPlayer,
    endInnings,
    addBallToPreviousOver,
    reopenPreviousOver,
    undo
  } = useMatch(activeMatchId, isSpectator);

  // Starts a new match from Setup wizard (Manager side)
  const handleStartMatch = async (matchId, code, initEvent) => {
    setIsManager(true);
    localStorage.setItem('cricket_is_manager', 'true');
    setActiveMatchId(matchId);
    localStorage.setItem('cricket_active_match_id', matchId);
    setLiveCodeOrId(code);
    localStorage.setItem('cricket_live_code', code);

    await startMatch(matchId, code, initEvent.payload);

    createMatchInCloud(matchId, {
      code,
      overs: initEvent.payload.overs,
      playersPerTeam: initEvent.payload.playersPerTeam,
      teams: initEvent.payload.teams,
      toss: initEvent.payload.toss,
      status: 'in_progress',
      striker: initEvent.payload.striker,
      nonStriker: initEvent.payload.nonStriker,
      currentBowler: initEvent.payload.bowler,
      updatedAt: Date.now()
    }).catch(err => console.warn('Cloud match creation fallback:', err));

    pushScreen({
      page: 'scoring',
      activeMatchId: matchId,
      liveCodeOrId: code,
      isManager: true,
      viewedMatchState: null
    });
  };

  const handleResumeMatch = (matchId) => {
    setIsManager(true);
    localStorage.setItem('cricket_is_manager', 'true');
    setActiveMatchId(matchId);
    localStorage.setItem('cricket_active_match_id', matchId);
    pushScreen({
      page: 'scoring',
      activeMatchId: matchId,
      liveCodeOrId,
      isManager: true,
      viewedMatchState: null
    });
  };

  const handleWatchLive = async (targetIdOrCode, targetCode = null) => {
    const rawTarget = (targetIdOrCode || '').trim();
    const isFullMatchId = rawTarget.startsWith('match_') || rawTarget.length > 6;
    const cleanCode = (targetCode || (isFullMatchId ? '' : rawTarget)).trim().toUpperCase();
    const effectiveMatchId = isFullMatchId ? rawTarget : null;

    setIsManager(false);
    localStorage.setItem('cricket_is_manager', 'false');

    const effectiveCode = cleanCode || rawTarget;
    const effectiveId = effectiveMatchId || cleanCode || rawTarget;

    if (cleanCode) {
      setLiveCodeOrId(cleanCode);
      localStorage.setItem('cricket_live_code', cleanCode);
    } else {
      setLiveCodeOrId(rawTarget);
    }

    if (effectiveMatchId) {
      setActiveMatchId(effectiveMatchId);
      localStorage.setItem('cricket_active_match_id', effectiveMatchId);
    } else {
      setActiveMatchId(effectiveId);
    }

    pushScreen({
      page: 'live',
      activeMatchId: effectiveId,
      liveCodeOrId: effectiveCode,
      isManager: false,
      viewedMatchState: null
    });

    // Eagerly resolve if we only had a 6-char code
    if (!effectiveMatchId && cleanCode) {
      try {
        const localSnap = await getMatchSnapshot(cleanCode);
        if (localSnap?.matchId) {
          setActiveMatchId(localSnap.matchId);
          localStorage.setItem('cricket_active_match_id', localSnap.matchId);
          return;
        }

        const matchData = await findMatchByCode(cleanCode);
        if (matchData?.matchId) {
          setActiveMatchId(matchData.matchId);
          localStorage.setItem('cricket_active_match_id', matchData.matchId);
        }
      } catch (e) {
        console.warn('Could not resolve match code:', e);
      }
    }
  };

  const handleOpenScorecard = async (incomingState) => {
    let nextState = (incomingState && (incomingState.code || incomingState.innings?.length > 0))
      ? incomingState
      : viewedMatchState;
    if (isSpectator && typeof loadFullMatchEvents === 'function') {
      const full = await loadFullMatchEvents();
      if (full) nextState = full;
    }
    if (nextState) {
      setViewedMatchState(nextState);
    }
    pushScreen({
      page: 'scorecard',
      activeMatchId,
      liveCodeOrId,
      isManager,
      viewedMatchState: nextState
    });
  };

  const handleOpenSummary = async (incomingState) => {
    let nextState = (incomingState && (incomingState.code || incomingState.innings?.length > 0))
      ? incomingState
      : viewedMatchState;
    if (isSpectator && typeof loadFullMatchEvents === 'function') {
      const full = await loadFullMatchEvents();
      if (full) nextState = full;
    }
    if (nextState) {
      setViewedMatchState(nextState);
    }
    pushScreen({
      page: 'summary',
      activeMatchId,
      liveCodeOrId,
      isManager,
      viewedMatchState: nextState
    });
  };

  const handleBack = () => {
    handleBackPress();
  };

  const handleBackFromScoring = () => {
    pushScreen({
      page: 'home',
      activeMatchId: null,
      liveCodeOrId: null,
      isManager: true,
      initialPortal: 'create',
      viewedMatchState: null
    });
  };

  const handleBackFromSetup = () => {
    pushScreen({
      page: 'home',
      activeMatchId: null,
      liveCodeOrId: null,
      isManager: true,
      initialPortal: 'create',
      viewedMatchState: null
    });
  };

  const handleBackFromLive = () => {
    pushScreen({
      page: 'home',
      activeMatchId: null,
      liveCodeOrId: null,
      isManager: false,
      initialPortal: 'stream',
      viewedMatchState: null
    });
  };

  // Determine active match state for scorecard & summary
  const effectiveScorecardState = (matchState && matchState.teams?.length > 0)
    ? matchState
    : (viewedMatchState || matchState);

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen font-sans transition-colors relative"
    >
      {/* Real-time In-App Update Notification Banner */}
      <UpdateNotificationBanner />

      {/* Zero-Lag Route Transition Progress Bar */}
      <TopProgressBar active={isNavigating} />

      {/* Ambient background SVG layer */}
      <div className="bgfx" aria-hidden="true">
        <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
          <defs>
            <linearGradient id="bg_g1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--sec)" stopOpacity="0.5" />
              <stop offset="1" stopColor="var(--pri)" stopOpacity="0.06" />
            </linearGradient>
            <filter id="bg_bl"><feGaussianBlur stdDeviation="16" /></filter>
          </defs>
          <path d="M0 0H300C250 90 170 70 120 150S40 260 0 230Z" fill="url(#bg_g1)" />
          <path d="M400 430C320 470 290 580 220 650S90 790 60 800H400Z" fill="url(#bg_g1)" />
          <path d="M0 560C80 540 140 620 200 700S320 790 400 770" fill="none" stroke="var(--sec)" strokeOpacity="0.3" strokeWidth="2" />
          <path d="M0 600C90 580 150 660 210 740S330 800 400 800" fill="none" stroke="var(--pri)" strokeOpacity="0.2" strokeWidth="1.5" />
          <g filter="url(#bg_bl)">
            <g className="o"><circle cx="330" cy="130" r="60" fill="var(--pri)" opacity="0.3" /></g>
            <circle cx="30" cy="470" r="50" fill="var(--sec)" opacity="0.28" />
            <circle cx="350" cy="700" r="70" fill="var(--pri)" opacity="0.25" />
          </g>
        </svg>
      </div>
      {page === 'home' && (
        <Home
          initialPortal={homePortal}
          onNavigate={(p) => pushScreen({ page: p, activeMatchId, liveCodeOrId, isManager, viewedMatchState })}
          onResumeMatch={handleResumeMatch}
          onWatchLive={handleWatchLive}
          onOpenDeveloper={() => pushScreen({ page: 'developer', activeMatchId, liveCodeOrId, isManager, viewedMatchState })}
        />
      )}

      {page === 'developer' && (
        <DeveloperDashboard
          onBack={handleBack}
          onOpenMatch={(target) => {
            const mid = typeof target === 'string' ? target : (target?.matchId || target?.code);
            const code = typeof target === 'string' && target.length === 6 ? target : (target?.code || null);
            setIsManager(true);
            localStorage.setItem('cricket_is_manager', 'true');
            setActiveMatchId(mid);
            localStorage.setItem('cricket_active_match_id', mid);
            if (code) {
              setLiveCodeOrId(code);
              localStorage.setItem('cricket_live_code', code);
            }
            pushScreen({
              page: 'scoring',
              activeMatchId: mid,
              liveCodeOrId: code || liveCodeOrId,
              isManager: true,
              viewedMatchState: null
            });
          }}
        />
      )}

      {page === 'setup' && (
        <Setup
          onStartMatch={handleStartMatch}
          onBack={handleBackFromSetup}
        />
      )}

      {page === 'scoring' && (
        <Scoring
          matchState={matchState}
          syncStatus={syncStatus}
          leaseConflict={leaseConflict}
          tabLockConflict={tabLockConflict}
          isReconciling={isReconciling}
          onTakeOverScoring={takeOverScoring}
          onRecordBall={recordBall}
          onEditBall={editBall}
          onSwapBatter={swapBatter}
          onChangeBowler={changeBowler}
          onAddNewBatter={addNewBatter}
          onRetireBatter={retireBatter}
          onEditPlayer={editPlayer}
          onEndInnings={endInnings}
          onAddBallToPreviousOver={addBallToPreviousOver}
          onReopenPreviousOver={reopenPreviousOver}
          onUndo={undo}
          onNavigate={handleBackFromScoring}
          onBack={handleBackFromScoring}
          onOpenScorecard={() => handleOpenScorecard(matchState)}
          onOpenSummary={() => handleOpenSummary(matchState)}
        />
      )}

      {page === 'scorecard' && (
        <Scorecard
          matchState={effectiveScorecardState}
          onBack={handleBack}
          onOpenSummary={() => handleOpenSummary(effectiveScorecardState)}
        />
      )}

      {page === 'summary' && (
        <MatchSummary
          matchState={effectiveScorecardState}
          onBack={handleBack}
        />
      )}

      {page === 'live' && (
        <Live
          matchCodeOrId={activeMatchId || liveCodeOrId}
          matchState={matchState}
          scorerOfflineInfo={scorerOfflineInfo}
          onBack={handleBackFromLive}
          onOpenScorecard={handleOpenScorecard}
          onOpenSummary={handleOpenSummary}
          onMatchResolved={(id, code) => {
            setActiveMatchId(id);
            localStorage.setItem('cricket_active_match_id', id);
            if (code) {
              setLiveCodeOrId(code);
              localStorage.setItem('cricket_live_code', code);
            }
          }}
        />
      )}

      {/* Luxury double-back exit confirmation toast */}
      {showExitToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.5), 0 0 15px rgba(34, 197, 94, 0.15)'
            }}
            className="px-5 py-2.5 rounded-full flex items-center gap-2.5 text-white shadow-2xl"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide text-slate-200">
              Press back again to exit
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
