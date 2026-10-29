import React, { useState, useEffect } from 'react';
import Home from './pages/Home.jsx';
import Setup from './pages/Setup.jsx';
import Scoring from './pages/Scoring.jsx';
import Scorecard from './pages/Scorecard.jsx';
import Live from './pages/Live.jsx';
import { useMatch } from './store/useMatch.js';
import { createMatchInCloud } from './firebase/matches.js';

export default function App() {
  // Read initial route from URL parameters or localStorage (prevents refresh bug!)
  const getInitialRouting = () => {
    const params = new URLSearchParams(window.location.search);
    const watchCode = params.get('watch') || params.get('match') || params.get('code');
    if (watchCode) {
      return { page: 'live', matchId: null, liveCode: watchCode.toUpperCase() };
    }

    const savedPage = localStorage.getItem('cricket_current_page');
    const savedMatchId = localStorage.getItem('cricket_active_match_id');
    const savedLiveCode = localStorage.getItem('cricket_live_code');

    if (savedPage && (savedMatchId || savedLiveCode)) {
      return { page: savedPage, matchId: savedMatchId, liveCode: savedLiveCode };
    }

    return { page: 'home', matchId: null, liveCode: null };
  };

  const initial = getInitialRouting();
  const [page, setPage] = useState(initial.page);
  const [activeMatchId, setActiveMatchId] = useState(initial.matchId);
  const [liveCodeOrId, setLiveCodeOrId] = useState(initial.liveCode);
  const [previousPage, setPreviousPage] = useState('home');

  // Persist routing to localStorage so refreshing browser stays on current match!
  useEffect(() => {
    localStorage.setItem('cricket_current_page', page);
    if (activeMatchId) localStorage.setItem('cricket_active_match_id', activeMatchId);
    if (liveCodeOrId) localStorage.setItem('cricket_live_code', liveCodeOrId);
  }, [page, activeMatchId, liveCodeOrId]);

  const {
    matchState,
    syncStatus,
    scorerOfflineInfo,
    startMatch,
    recordBall,
    swapBatter,
    changeBowler,
    addNewBatter,
    retireBatter,
    endInnings,
    undo
  } = useMatch(activeMatchId);

  // Starts a new match from Setup wizard
  const handleStartMatch = async (matchId, code, initEvent) => {
    setActiveMatchId(matchId);
    localStorage.setItem('cricket_active_match_id', matchId);

    // 1. Zero-lag synchronous initial state creation for the Manager
    await startMatch(matchId, code, initEvent.payload);

    // 2. Background Firestore match document creation
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

  // Resumes an existing match
  const handleResumeMatch = (matchId) => {
    setActiveMatchId(matchId);
    setPage('scoring');
  };

  // Opens live viewer for a match code
  const handleWatchLive = (code) => {
    setLiveCodeOrId(code);
    setPage('live');
  };

  const handleOpenScorecard = () => {
    setPreviousPage(page);
    setPage('scorecard');
  };

  const handleGoHome = () => {
    // Clean URL query params if returning to home
    if (window.history.pushState) {
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({ path: cleanUrl }, '', cleanUrl);
    }
    setPage('home');
  };

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-900 font-sans transition-colors">
      {page === 'home' && (
        <Home
          onNavigate={(p) => setPage(p)}
          onResumeMatch={handleResumeMatch}
          onWatchLive={handleWatchLive}
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
          scorerOfflineInfo={scorerOfflineInfo}
          onRecordBall={recordBall}
          onSwapBatter={swapBatter}
          onChangeBowler={changeBowler}
          onAddNewBatter={addNewBatter}
          onEndInnings={endInnings}
          onUndo={undo}
          onNavigate={handleGoHome}
          onOpenScorecard={handleOpenScorecard}
        />
      )}

      {page === 'scorecard' && (
        <Scorecard
          matchState={matchState}
          onBack={() => setPage(previousPage || 'scoring')}
        />
      )}

      {page === 'live' && (
        <Live
          matchCodeOrId={liveCodeOrId}
          onBack={handleGoHome}
          onOpenScorecard={handleOpenScorecard}
        />
      )}
    </div>
  );
}
