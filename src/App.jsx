import React, { useState } from 'react';
import Home from './pages/Home.jsx';
import Setup from './pages/Setup.jsx';
import Scoring from './pages/Scoring.jsx';
import Scorecard from './pages/Scorecard.jsx';
import Live from './pages/Live.jsx';
import { useMatch } from './store/useMatch.js';
import { createMatchInCloud } from './firebase/matches.js';

export default function App() {
  const [page, setPage] = useState('home'); // 'home' | 'setup' | 'scoring' | 'scorecard' | 'live'
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [liveCodeOrId, setLiveCodeOrId] = useState(null);
  const [previousPage, setPreviousPage] = useState('home');

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

    // 1. Immediately create match state synchronously inside useMatch
    await startMatch(matchId, code, initEvent.payload);

    // 2. Create match cloud document in background
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

  // Resumes an existing match from local history
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
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
          onBack={() => setPage('home')}
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
          onNavigate={(p) => setPage(p)}
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
          onBack={() => setPage('home')}
          onOpenScorecard={handleOpenScorecard}
        />
      )}
    </div>
  );
}
