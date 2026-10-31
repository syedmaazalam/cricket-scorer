import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Radio, FileText, WifiOff, Share2, Check, Users, FileSpreadsheet, Lock, User, Trophy, Zap, MessageSquare } from 'lucide-react';
import { useMatch } from '../store/useMatch.js';
import { findMatchByCode, subscribeMatchMessages } from '../firebase/matches.js';
import { computeInningsStats, getScoreAtLegalBalls } from '../engine/stats.js';
import { formatOvers, calculateCRR, calculateRRR, getMaxWickets } from '../engine/rules.js';
import MatchCharts from '../components/MatchCharts.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import BatterDetailsModal from '../components/BatterDetailsModal.jsx';
import SquadModal from '../components/SquadModal.jsx';
import ScoreAnimation from '../components/ScoreAnimation.jsx';
import AbdullahMotivationModal, { isAbdullah, isAbdullahMessagesEnabled } from '../components/AbdullahMotivationModal.jsx';
import DeveloperScorerChatModal from '../components/DeveloperScorerChatModal.jsx';
import CelebrationModal from '../components/CelebrationModal.jsx';
import BottomNavBar from '../components/BottomNavBar.jsx';
import PlayersHeadToHead from '../components/PlayersHeadToHead.jsx';
import Scorecard from './Scorecard.jsx';
import MatchSummary from './MatchSummary.jsx';

export default function Live({
  matchCodeOrId,
  matchState: propMatchState,
  scorerOfflineInfo: propOfflineInfo,
  onBack,
  onOpenScorecard,
  onOpenSummary,
  onMatchResolved
}) {
  const [resolvedMatchId, setResolvedMatchId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedBatterDetails, setSelectedBatterDetails] = useState(null);
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState(null);
  const [abdullahEvent, setAbdullahEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('score');
  const [isDevChatOpen, setIsDevChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const prevBallCountRef = useRef(null);
  const lastSeenDevMsgCountRef = useRef(0);

  const isDevAuthed = typeof window !== 'undefined' && (
    sessionStorage.getItem('dev_auth') === 'true' ||
    localStorage.getItem('cricket_is_developer') === 'true'
  );

  // Subscribe to chat if developer is watching
  useEffect(() => {
    const effectiveMatchId = matchState.matchId || resolvedMatchId;
    if (!isDevAuthed || !effectiveMatchId) return;

    const unsub = subscribeMatchMessages(effectiveMatchId, (msgs) => {
      if (!Array.isArray(msgs)) return;
      if (lastSeenDevMsgCountRef.current > 0 && msgs.length > lastSeenDevMsgCountRef.current) {
        const newest = msgs[msgs.length - 1];
        if (newest && newest.sender === 'scorer' && !isDevChatOpen) {
          setUnreadChatCount((prev) => prev + 1);
        }
      }
      lastSeenDevMsgCountRef.current = msgs.length;
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [matchState.matchId, resolvedMatchId, isDevAuthed, isDevChatOpen]);

  useEffect(() => {
    async function resolve() {
      if (!matchCodeOrId) return;
      const clean = matchCodeOrId.trim().toUpperCase();
      try {
        const matchData = await findMatchByCode(clean);
        if (matchData) {
          setResolvedMatchId(matchData.matchId);
          onMatchResolved?.(matchData.matchId, matchData.code);
        } else {
          setResolvedMatchId(clean);
          onMatchResolved?.(clean, null);
        }
      } catch (e) {
        setResolvedMatchId(clean);
      }
    }
    resolve();
  }, [matchCodeOrId]);

  // Fallback internal listener if parent did not stream matchState
  const { matchState: fallbackState, scorerOfflineInfo: fallbackOffline } = useMatch(
    propMatchState?.teams?.length > 0 ? null : resolvedMatchId,
    true
  );

  const matchState = (propMatchState && (propMatchState.teams?.length > 0 || propMatchState.code))
    ? propMatchState
    : fallbackState;

  // Check if developer has restricted viewers for this match
  if (matchState?.isViewerRestricted || matchState?.maxViewers === 0) {
    return (
      <div
        style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
        className="min-h-screen flex flex-col items-center justify-center p-4 text-center select-none"
      >
        <div
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          className="w-full max-w-sm rounded-3xl border p-6 shadow-2xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl">
            <Lock className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>
            Viewing Restricted
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Live viewer access for this match has been restricted by the match administrator.
          </p>
          <button
            onClick={onBack}
            style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
            className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider mt-2 active:scale-95 transition-all shadow-md"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const scorerOfflineInfo = propOfflineInfo || fallbackOffline;

  const curInnIndex = matchState.currentInningsIndex || 0;
  const currentInnings = matchState.innings?.[curInnIndex] || {
    score: 0,
    wickets: 0,
    legalBalls: 0,
    balls: [],
    battingTeam: '',
    bowlingTeam: ''
  };

  const prevInnings = curInnIndex === 1 ? matchState.innings?.[0] : null;
  const prevInningsAtPoint = (prevInnings && currentInnings.legalBalls > 0)
    ? getScoreAtLegalBalls(prevInnings, currentInnings.legalBalls)
    : null;

  const innStats = computeInningsStats(currentInnings);
  const strikerStat = innStats.batting[matchState.striker] || { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
  const nonStrikerStat = innStats.batting[matchState.nonStriker] || { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
  const bowlerStat = innStats.bowling[matchState.currentBowler] || { overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, economy: 0 };

  const crr = calculateCRR(currentInnings.score, currentInnings.legalBalls);
  const rrr = matchState.target ? calculateRRR(matchState.target, currentInnings.score, currentInnings.legalBalls, matchState.overs) : null;
  const recentBalls = (currentInnings.balls || []).slice(-10);

  const maxWickets = getMaxWickets(matchState.playersPerTeam || 11);
  const totalBallsAllowed = (matchState.overs || 20) * 6;
  const progressPercent = Math.min(100, Math.round((currentInnings.legalBalls / Math.max(1, totalBallsAllowed)) * 100));

  const isFirstInningsEnded = curInnIndex === 0 && (
    currentInnings.isCompleted ||
    matchState.status === 'innings_break' ||
    (matchState.overs && currentInnings.legalBalls >= matchState.overs * 6) ||
    currentInnings.wickets >= maxWickets
  );

  const shareUrl = `${window.location.origin}/?watch=${matchState.code || matchCodeOrId || ''}`;

  const handleShare = () => {
    const title = `Live Cricket: ${matchState.teams?.[0]?.name || 'Match'} vs ${matchState.teams?.[1]?.name || 'Live'}`;
    const text = `Watch live score: ${currentInnings.battingTeam || 'Batting'} ${currentInnings.score}/${currentInnings.wickets}\nMatch Code: ${matchState.code || matchCodeOrId}`;

    if (navigator.share) {
      navigator.share({ title, text, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Trigger animations & special messages on spectator / watcher end
  useEffect(() => {
    const balls = currentInnings.balls || [];
    if (prevBallCountRef.current !== null && balls.length > prevBallCountRef.current) {
      const latestBall = balls[balls.length - 1];
      if (latestBall) {
        const isWicket = Boolean(latestBall.isWicket);
        const runs = Number(latestBall.runs || 0);
        const extraType = latestBall.extraType;

        // 1. Abdullah motivational messages check (4-second unskippable)
        if (isAbdullahMessagesEnabled()) {
          if (isWicket && isAbdullah(latestBall.bowler || currentInnings.bowler)) {
            setAbdullahEvent({ type: 'wicket_taken' });
          } else if (isWicket && (isAbdullah(latestBall.dismissedPlayer) || isAbdullah(latestBall.striker || currentInnings.striker))) {
            const abdullahBatter = currentInnings?.batters?.find((b) => isAbdullah(b.name));
            setAbdullahEvent({ type: 'out', score: abdullahBatter?.runs || 0 });
          } else if (runs === 6 && isAbdullah(latestBall.striker || currentInnings.striker)) {
            setAbdullahEvent({ type: 'six' });
          } else if (runs === 4 && isAbdullah(latestBall.striker || currentInnings.striker)) {
            setAbdullahEvent({ type: 'four' });
          }
        }

        // 2. Standard 2-second event popups (wide, no ball, four, six, wicket, extra)
        if (isWicket) {
          setActiveAnimation({ type: 'wicket', text: 'WICKET!', subtext: 'BATTER OUT!' });
        } else if (runs === 6) {
          setActiveAnimation({ type: 'six', text: '+6 MAXIMUM!', subtext: 'HUGE SIX!' });
        } else if (runs === 4) {
          setActiveAnimation({ type: 'four', text: '+4 BOUNDARY!', subtext: 'FOUR RUNS!' });
        } else if (extraType === 'wide') {
          const totalWideRuns = (latestBall.extraRuns || 0) + 1;
          setActiveAnimation({
            type: 'wide',
            text: `+${totalWideRuns} WIDE`,
            subtext: 'WIDE BALL'
          });
        } else if (extraType === 'no_ball') {
          setActiveAnimation({
            type: 'no_ball',
            text: '+1 NO BALL',
            subtext: 'Free Hit next!'
          });
        } else if (extraType) {
          setActiveAnimation({
            type: 'extra',
            text: `+${latestBall.extraRuns || 1} ${extraType.toUpperCase()}`,
            subtext: 'Extra delivery'
          });
        } else if (runs === 0) {
          setActiveAnimation({ type: 'dot', text: 'DOT BALL', subtext: 'No run conceded' });
        } else if (runs === 1) {
          setActiveAnimation({ type: 'run', text: '+1 SINGLE', subtext: 'Strike rotated' });
        } else if (runs === 2) {
          setActiveAnimation({ type: 'run', text: '+2 DOUBLE', subtext: 'Good running!' });
        } else if (runs === 3) {
          setActiveAnimation({ type: 'run', text: '+3 THREE RUNS', subtext: 'Superb running!' });
        }
      }
    }
    prevBallCountRef.current = balls.length;
  }, [currentInnings.balls?.length]);

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col p-2 sm:p-4 max-w-6xl mx-auto select-none transition-colors"
    >
      {/* 1. Top Header matching user screenshot */}
      <div
        style={{ borderColor: 'var(--border)' }}
        className="flex items-center justify-between pb-3 border-b"
      >
        <button
          onClick={onBack}
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
          className="p-2 rounded-2xl border transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Center: Green Pill with Team A vs Team B + LIVE badge */}
        <div className="flex items-center gap-2">
          <div
            style={{
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF'
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black shadow-sm truncate max-w-[130px] sm:max-w-[220px]"
          >
            <span className="truncate">
              {matchState.teams?.[0]?.name || 'Team 1'} vs {matchState.teams?.[1]?.name || 'Team 2'}
            </span>
          </div>

          <div
            style={{
              backgroundColor: 'var(--green-15)',
              borderColor: 'var(--green-30)',
              color: 'var(--green)'
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
          >
            <span style={{ backgroundColor: 'var(--green)' }} className="w-2 h-2 rounded-full animate-ping" />
            <Radio className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} />
            <span>Live</span>
          </div>
        </div>

        {/* Right: Developer Chat, Theme Toggle & Share */}
        <div className="flex items-center gap-1.5">
          {isDevAuthed && (
            <button
              onClick={() => {
                setIsDevChatOpen(true);
                setUnreadChatCount(0);
              }}
              style={{
                backgroundColor: unreadChatCount > 0 ? 'rgba(34, 197, 94, 0.15)' : 'var(--card)',
                borderColor: unreadChatCount > 0 ? '#22C55E' : 'var(--border)',
                color: unreadChatCount > 0 ? '#22C55E' : 'var(--text)'
              }}
              className="p-2 rounded-2xl border shadow-sm active:scale-95 transition-all relative flex items-center gap-1"
              title="Chat with Scorer as Developer"
            >
              <MessageSquare className="w-4 h-4 text-[#22C55E]" />
              <span className="hidden sm:inline text-xs font-bold text-[#22C55E]">Chat</span>
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#22C55E] text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {unreadChatCount}
                </span>
              )}
            </button>
          )}
          <ThemeToggle />
          <button
            onClick={handleShare}
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--orange)'
            }}
            className="p-2 rounded-2xl border shadow-sm active:scale-95 transition-all"
            title="Share match link"
          >
            {copied ? <Check className="w-4 h-4" style={{ color: 'var(--green)' }} /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Offline banner: slim full-width single line strip under header */}
      {scorerOfflineInfo && (
        <div
          style={{
            backgroundColor: 'var(--orange-15)',
            borderColor: 'var(--orange-30)',
            color: 'var(--orange)'
          }}
          className="w-full border-b px-3 py-1.5 text-center text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis animate-pulse"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{scorerOfflineInfo}. Live score will catch up automatically when online.</span>
        </div>
      )}

      {/* Innings Break Banner for Viewer */}
      {curInnIndex === 0 && (currentInnings.isCompleted || matchState.status === 'innings_break') && (
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--orange)'
          }}
          className="p-4 rounded-3xl border-2 text-center flex flex-col items-center gap-1.5 my-2 shadow-md animate-in fade-in"
        >
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5" style={{ color: 'var(--primary)' }}>
            <Trophy className="w-3.5 h-3.5 text-emerald-500" />
            <span>1st Innings Concluded ({currentInnings.score}/{currentInnings.wickets})</span>
          </span>
          <span className="text-sm font-extrabold" style={{ color: 'var(--text)' }}>
            Target: {matchState.target || currentInnings.score + 1} runs ({matchState.teams?.[1]?.name || 'Chasing Team'} needs {matchState.target || currentInnings.score + 1} from {matchState.overs} ov)
          </span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            Second innings will begin shortly...
          </span>
        </div>
      )}

      {/* Main Tab Routing */}
      {activeTab === 'score' && (
        /* Main Responsive Grid: 2 columns on Desktop (lg:), 1 column on Mobile */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-3 flex-1 items-start pb-20">
          {/* LEFT COLUMN: Main Scorecard, Batters, Bowler, Recent */}
          <div className="flex flex-col gap-3">
            {/* Main Score Card (Solid --card, matching image) */}
            <div
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
              className="app-card p-4 sm:p-5 flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider pb-1">
              <span style={{ color: 'var(--text)' }}>
                {currentInnings.battingTeam || 'Batting Team'} · Innings {curInnIndex + 1}
              </span>
              <span style={{ color: 'var(--primary)' }} className="font-extrabold">
                vs {currentInnings.bowlingTeam || 'Bowling Team'}
              </span>
            </div>

            {/* Score row: Score in --text, wickets in --red, overs in --orange */}
            <div className="flex items-baseline justify-between py-1">
              <div className="flex items-baseline gap-2">
                <span style={{ color: 'var(--text)' }} className="text-5xl font-black tracking-tight">
                  {currentInnings.score}
                </span>
                <span style={{ color: 'var(--red)' }} className="text-3xl font-extrabold">
                  /{currentInnings.wickets}
                </span>
              </div>
              <div className="text-right">
                <div style={{ color: 'var(--orange)' }} className="text-2xl font-black font-mono">
                  {formatOvers(currentInnings.legalBalls)}{' '}
                  <span style={{ color: 'var(--muted)' }} className="text-sm font-normal">
                    / {matchState.overs} ov
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar & Max Wickets */}
            <div className="flex items-center gap-3 pt-1">
              <div
                style={{ backgroundColor: 'var(--card-alt)' }}
                className="flex-1 h-2 rounded-full overflow-hidden"
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: 'var(--green)'
                  }}
                  className="h-full rounded-full transition-all duration-300"
                />
              </div>
              <span
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--muted)'
                }}
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 uppercase"
              >
                Max Wickets: {maxWickets}
              </span>
            </div>

            {/* Previous Team Batting Score & comparative score at this point */}
            {prevInnings && (
              <div
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="py-1.5 px-3 rounded-xl border text-xs flex items-center justify-between font-semibold mt-1"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span style={{ color: 'var(--muted)' }}>1st Innings: {prevInnings.battingTeam}</span>
                  <span style={{ color: 'var(--blue)' }} className="font-bold">
                    {prevInnings.score}/{prevInnings.wickets} ({formatOvers(prevInnings.legalBalls)} ov)
                  </span>
                </div>
                {prevInningsAtPoint && (
                  <div className="text-right text-[11px] shrink-0 font-medium" style={{ color: 'var(--muted)' }}>
                    At {formatOvers(currentInnings.legalBalls)} ov:{' '}
                    <strong style={{ color: 'var(--orange)' }}>
                      {prevInningsAtPoint.score}/{prevInningsAtPoint.wickets}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* CRR / Projected labels */}
            <div
              style={{ borderColor: 'var(--border)' }}
              className="flex items-center justify-between pt-2 border-t text-xs font-semibold"
            >
              <div>
                <span style={{ color: 'var(--muted)' }}>CRR: </span>
                <strong style={{ color: 'var(--text)' }}>{crr}</strong>
              </div>
              {curInnIndex === 1 && matchState.target ? (
                <div>
                  {matchState.status === 'completed' ? (
                    <span style={{ color: 'var(--orange)' }} className="font-bold">Match Completed</span>
                  ) : (
                    <>
                      <span style={{ color: 'var(--muted)' }}>Need: </span>
                      <strong style={{ color: 'var(--red)' }}>{Math.max(0, matchState.target - currentInnings.score)}</strong>
                      <span style={{ color: 'var(--muted)' }}> (RRR: </span>
                      <strong style={{ color: 'var(--red)' }}>{rrr}</strong>
                      <span style={{ color: 'var(--muted)' }}>)</span>
                    </>
                  )}
                </div>
              ) : isFirstInningsEnded ? (
                <div>
                  <span style={{ color: 'var(--muted)' }}>Target for Inn 2: </span>
                  <strong style={{ color: 'var(--orange)' }}>{matchState.target || currentInnings.score + 1}</strong>
                </div>
              ) : (
                <div>
                  <span style={{ color: 'var(--muted)' }}>Projected: </span>
                  <strong style={{ color: 'var(--text)' }}>{Math.round(crr * matchState.overs) || 0}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Batters Card (Solid --card, clickable for breakdown) */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-3 sm:p-4 flex flex-col gap-2"
          >
            <div
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              className="grid grid-cols-[1fr_36px_36px_32px_32px_44px] items-center text-[10px] font-bold uppercase tracking-wider pb-1.5 border-b px-2 gap-1 font-mono"
            >
              <span className="truncate font-sans">BATTER (TAP FOR STATS)</span>
              <span className="text-right">R</span>
              <span className="text-right">B</span>
              <span className="text-right">4s</span>
              <span className="text-right">6s</span>
              <span className="text-right min-w-[36px] pl-2">SR</span>
            </div>

            {/* Striker row: Clickable to inspect complete career & bowler match-up */}
            <div
              onClick={() => setSelectedBatterDetails(matchState.striker)}
              title="Click to view complete batter innings & bowler match-ups"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--green) 15%, transparent)',
                borderColor: 'color-mix(in srgb, var(--green) 30%, transparent)'
              }}
              className="grid grid-cols-[1fr_36px_36px_32px_32px_44px] items-center text-xs py-2 px-2 rounded-xl border cursor-pointer hover:brightness-105 active:scale-99 transition-all gap-1 font-mono"
            >
              <div
                style={{ color: 'var(--green)' }}
                className="min-w-0 pr-1 font-bold truncate flex items-center gap-1.5 font-sans"
              >
                <User className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="truncate">
                  <span className="truncate">{matchState.striker || 'Striker'}</span>
                  <span className="text-[9px] block font-normal opacity-80">Tap for stats</span>
                </div>
              </div>
              <span style={{ color: 'var(--text)' }} className="text-right font-black text-xs sm:text-sm font-sans tabular-nums">
                {strikerStat.runs}
              </span>
              <span style={{ color: 'var(--muted)' }} className="text-right text-xs tabular-nums">
                {strikerStat.balls}
              </span>
              <span style={{ color: 'var(--muted)' }} className="text-right text-xs tabular-nums">
                {strikerStat.fours}
              </span>
              <span style={{ color: 'var(--muted)' }} className="text-right text-xs tabular-nums font-semibold">
                {strikerStat.sixes}
              </span>
              <span style={{ color: 'var(--muted)' }} className="text-right text-xs font-bold tabular-nums min-w-[36px] pl-2">
                {Math.round(strikerStat.strikeRate || 0)}
              </span>
            </div>

            {/* Non-striker row: Clickable */}
            <div
              onClick={() => setSelectedBatterDetails(matchState.nonStriker)}
              title="Click to view complete batter innings & bowler match-ups"
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              className="grid grid-cols-[1fr_36px_36px_32px_32px_44px] items-center text-xs py-2 px-2 rounded-xl border cursor-pointer hover:border-[var(--primary)] active:scale-99 transition-all gap-1 font-mono"
            >
              <div className="min-w-0 pr-1 font-semibold truncate flex items-center gap-1.5 font-sans">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="truncate">
                  <span className="truncate">{matchState.nonStriker || 'Non-Striker'}</span>
                  <span className="text-[9px] block font-normal" style={{ color: 'var(--muted)' }}>Tap for stats</span>
                </div>
              </div>
              <span className="text-right font-bold text-xs sm:text-sm font-sans tabular-nums">
                {nonStrikerStat.runs}
              </span>
              <span style={{ color: 'var(--muted)' }} className="text-right text-xs tabular-nums">
                {nonStrikerStat.balls}
              </span>
              <span style={{ color: 'var(--muted)' }} className="text-right text-xs tabular-nums">
                {nonStrikerStat.fours}
              </span>
              <span style={{ color: 'var(--muted)' }} className="text-right text-xs tabular-nums font-semibold">
                {nonStrikerStat.sixes}
              </span>
              <span style={{ color: 'var(--muted)' }} className="text-right text-xs font-bold tabular-nums min-w-[36px] pl-2">
                {Math.round(nonStrikerStat.strikeRate || 0)}
              </span>
            </div>
          </div>

          {/* Bowler Card */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-3 sm:p-4 flex flex-col gap-1.5"
          >
            <div
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider pb-1 border-b"
            >
              <span className="col-span-5">BOWLER</span>
              <span className="col-span-2 text-right">O</span>
              <span className="col-span-1 text-right">M</span>
              <span className="col-span-2 text-right">R</span>
              <span className="col-span-2 text-right">W</span>
            </div>
            <div className="grid grid-cols-12 items-center text-xs py-0.5">
              <div style={{ color: 'var(--blue)' }} className="col-span-5 font-bold truncate">
                {matchState.currentBowler || 'Bowler'}
              </div>
              <span style={{ color: 'var(--text)' }} className="col-span-2 text-right font-mono">
                {bowlerStat.overs}
              </span>
              <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">
                {bowlerStat.maidens}
              </span>
              <span style={{ color: 'var(--text)' }} className="col-span-2 text-right">
                {bowlerStat.runsConceded}
              </span>
              <span style={{ color: 'var(--red)' }} className="col-span-2 text-right font-black">
                {bowlerStat.wickets}
              </span>
            </div>
          </div>

          {/* Recent Deliveries */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span style={{ color: 'var(--muted)' }} className="text-[10px] font-bold uppercase tracking-wider shrink-0">
              Recent:
            </span>
            {recentBalls.length === 0 ? (
              <span style={{ color: 'var(--muted)' }} className="text-xs">Waiting for deliveries...</span>
            ) : (
              recentBalls.map((b, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: b.isWicket
                      ? 'var(--red)'
                      : b.runs === 6
                      ? 'var(--purple)'
                      : b.runs === 4
                      ? 'var(--blue)'
                      : b.extraType
                      ? 'var(--orange)'
                      : b.runs > 0
                      ? 'var(--ball-run-bg)'
                      : 'var(--card-alt)',
                    color: b.runs === 0 && !b.extraType && !b.isWicket
                      ? 'var(--muted)'
                      : b.runs > 0 && !b.extraType && !b.isWicket
                      ? 'var(--ball-run-text)'
                      : '#FFFFFF',
                    borderColor: b.runs > 0 && !b.extraType && !b.isWicket
                      ? 'var(--ball-run-border)'
                      : 'var(--border)'
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border shadow-sm"
                >
                  {b.shortLabel}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Over & Worm Charts */}
        <div className="flex flex-col gap-3">
          <MatchCharts matchState={matchState} />
        </div>
      </div>
      )}

      {/* Scorecard Tab */}
      {activeTab === 'scorecard' && (
        <div className="w-full flex-1 pb-20">
          <Scorecard matchState={matchState} onBack={() => setActiveTab('score')} onOpenSummary={() => setActiveTab('summary')} />
        </div>
      )}

      {/* Teams / Head-to-Head Tab */}
      {activeTab === 'teams' && (
        <div className="w-full flex-1 pb-20">
          <PlayersHeadToHead matchState={matchState} />
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="w-full flex-1 pb-20">
          <MatchSummary matchState={matchState} onBack={() => setActiveTab('score')} />
        </div>
      )}

      {/* Floating Spectator Live Score Animation (2-second duration) */}
      <ScoreAnimation animationData={activeAnimation} />

      {/* Special Unskippable 4-Second Motivational Brother Message for Abdullah */}
      {abdullahEvent && (
        <AbdullahMotivationModal
          eventData={abdullahEvent}
          onClose={() => setAbdullahEvent(null)}
        />
      )}

      {/* Modals */}
      {/* 1. Batter Career & Detailed Breakdown Modal */}
      {selectedBatterDetails && (
        <BatterDetailsModal
          batterName={selectedBatterDetails}
          innings={currentInnings}
          onClose={() => setSelectedBatterDetails(null)}
        />
      )}

      {/* 2. Squad Modal */}
      <SquadModal
        isOpen={isSquadModalOpen}
        onClose={() => setIsSquadModalOpen(false)}
        matchState={matchState}
        isManager={false}
        onSelectBatterDetails={(playerName) => {
          setIsSquadModalOpen(false);
          setSelectedBatterDetails(playerName);
        }}
      />

      {/* 3. Celebration & Party Poppers Victory Modal */}
      <CelebrationModal
        matchState={matchState}
        onOpenScorecard={onOpenScorecard}
        onOpenSummary={onOpenSummary}
      />

      {/* Developer to Scorer Live Chat Modal while watching */}
      {isDevChatOpen && (
        <DeveloperScorerChatModal
          isOpen={isDevChatOpen}
          onClose={() => {
            setIsDevChatOpen(false);
            setUnreadChatCount(0);
          }}
          matchId={matchState.matchId || resolvedMatchId || matchCodeOrId}
          matchTitle={`${matchState.teams?.[0]?.name || 'Team 1'} vs ${matchState.teams?.[1]?.name || 'Team 2'} (${matchState.code || matchCodeOrId || ''})`}
          role="developer"
          senderName="Developer (Maaz)"
        />
      )}

      {/* Footer Branding */}
      <footer
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        className="mt-8 pt-4 pb-24 text-center text-xs border-t leading-normal"
      >
        {"© 2026 SmartCricket · Developed by "}
        <span style={{ color: 'var(--text)' }} className="font-bold">
          Syed Maaz Alam
        </span>
      </footer>

      {/* Persistent Bottom Navigation Bar */}
      <BottomNavBar activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
}
