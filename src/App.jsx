import React, { useState, useEffect, useCallback } from 'react';
import Home from './pages/Home.jsx';
import Setup from './pages/Setup.jsx';
import Scoring from './pages/Scoring.jsx';
import Scorecard from './pages/Scorecard.jsx';
import Live from './pages/Live.jsx';
import MatchSummary from './pages/MatchSummary.jsx';
import DeveloperDashboard from './pages/DeveloperDashboard.jsx';
import { useMatch } from './store/useMatch.js';
import { createMatchInCloud, findMatchByCode } from './firebase/matches.js';

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
          isManager: false
        };
      }

      const path = window.location.pathname || '';
      const pathMatch = path.match(/\/(?:match|m)\/([^/?#]+)/i);
      if (pathMatch && pathMatch[1]) {
        return {
          page: 'live',
          matchId: null,
          liveCode: pathMatch[1].trim().toUpperCase(),
          isManager: false
        };
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === 'true') {
      return {
        page: 'developer',
        matchId: null,
        liveCode: null,
        isManager: false
      };
    }

    const summaryCode = params.get('summary');
    if (summaryCode) {
      return {
        page: 'summary',
        matchId: null,
        liveCode: summaryCode.toUpperCase(),
        isManager: false
      };
    }

    const watchCode = params.get('watch') || params.get('match') || params.get('code');
    if (watchCode) {
      return {
        page: 'live',
        matchId: null,
        liveCode: watchCode.toUpperCase(),
        isManager: false
      };
    }

    // User requirement: While opening the web, direct directly to the main page (home)
    return { page: 'home', matchId: null, liveCode: null, isManager: false };
  };

  const initial = getInitialRouting();
  const [page, setPage] = useState(initial.page);
  const [activeMatchId, setActiveMatchId] = useState(initial.matchId);
  const [liveCodeOrId, setLiveCodeOrId] = useState(initial.liveCode);
  const [isManager, setIsManager] = useState(initial.isManager);
  const [previousPage, setPreviousPage] = useState('home');
  const [viewedMatchState, setViewedMatchState] = useState(null);

  // Persist state across refresh so match is never lost
  useEffect(() => {
    localStorage.setItem('cricket_current_page', page);
    if (activeMatchId) localStorage.setItem('cricket_active_match_id', activeMatchId);
    if (liveCodeOrId) localStorage.setItem('cricket_live_code', liveCodeOrId);
    localStorage.setItem('cricket_is_manager', isManager ? 'true' : 'false');
  }, [page, activeMatchId, liveCodeOrId, isManager]);

  // Handle incoming Android deep links (cold launch or runtime resume)
  useEffect(() => {
    const handleIncomingMatchCode = (code) => {
      if (!code) return;
      const cleanCode = code.trim().toUpperCase();
      setIsManager(false);
      setLiveCodeOrId(cleanCode);
      setActiveMatchId(cleanCode);
      setPage('live');
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

    setPage('scoring');
  };

  const handleResumeMatch = (matchId) => {
    setIsManager(true);
    localStorage.setItem('cricket_is_manager', 'true');
    setActiveMatchId(matchId);
    localStorage.setItem('cricket_active_match_id', matchId);
    setPage('scoring');
  };

  const handleWatchLive = async (code) => {
    const cleanCode = (code || '').trim().toUpperCase();
    setIsManager(false);
    localStorage.setItem('cricket_is_manager', 'false');
    setLiveCodeOrId(cleanCode);
    localStorage.setItem('cricket_live_code', cleanCode);
    setPage('live');

    try {
      const matchData = await findMatchByCode(cleanCode);
      if (matchData?.matchId) {
        setActiveMatchId(matchData.matchId);
        localStorage.setItem('cricket_active_match_id', matchData.matchId);
      } else {
        setActiveMatchId(cleanCode);
      }
    } catch (e) {
      setActiveMatchId(cleanCode);
    }
  };

  const handleOpenScorecard = (incomingState) => {
    if (incomingState && (incomingState.code || incomingState.innings?.length > 0)) {
      setViewedMatchState(incomingState);
    }
    setPreviousPage(page);
    setPage('scorecard');
  };

  const handleOpenSummary = (incomingState) => {
    if (incomingState && (incomingState.code || incomingState.innings?.length > 0)) {
      setViewedMatchState(incomingState);
    }
    setPreviousPage(page);
    setPage('summary');
  };

  const handleGoHome = () => {
    if (window.history.pushState) {
      const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
      window.history.pushState({ path: cleanUrl }, '', cleanUrl);
    }
    setViewedMatchState(null);
    setPage('home');
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
          onNavigate={(p) => setPage(p)}
          onResumeMatch={handleResumeMatch}
          onWatchLive={handleWatchLive}
          onOpenDeveloper={() => setPage('developer')}
        />
      )}

      {page === 'developer' && (
        <DeveloperDashboard
          onBack={handleGoHome}
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
            setPage('scoring');
          }}
        />
      )}

      {page === 'setup' && (
        <Setup
          onStartMatch={handleStartMatch}
          onBack={handleGoHome}
        />
      )}

      {page === 'scoring' && (
        <Scoring
          matchState={matchState}
          syncStatus={syncStatus}
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
          onNavigate={handleGoHome}
          onOpenScorecard={() => handleOpenScorecard(matchState)}
          onOpenSummary={() => handleOpenSummary(matchState)}
        />
      )}

      {page === 'scorecard' && (
        <Scorecard
          matchState={effectiveScorecardState}
          onBack={() => {
            setPage(previousPage || (isManager ? 'scoring' : 'live'));
          }}
          onOpenSummary={() => handleOpenSummary(effectiveScorecardState)}
        />
      )}

      {page === 'summary' && (
        <MatchSummary
          matchState={effectiveScorecardState}
          onBack={() => {
            setPage(previousPage || 'home');
          }}
        />
      )}

      {page === 'live' && (
        <Live
          matchCodeOrId={liveCodeOrId}
          matchState={matchState}
          scorerOfflineInfo={scorerOfflineInfo}
          onBack={handleGoHome}
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
    </div>
  );
}
