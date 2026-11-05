import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Radio, FileText, WifiOff, Share2, Check, Users, FileSpreadsheet, Lock, User, Trophy, Zap, MessageSquare, MoreVertical, Activity } from 'lucide-react';
import { useMatch } from '../store/useMatch.js';
import { findMatchByCode, subscribeMatchMessages } from '../firebase/matches.js';
import { computeInningsStats, getScoreAtLegalBalls } from '../engine/stats.js';
import { formatOvers, calculateCRR, calculateRRR, getMaxWickets, checkBattingMilestone, checkBowlerHatTrick } from '../engine/rules.js';
import { getShareUrl } from '../engine/constants.js';
import MatchCharts from '../components/MatchCharts.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import BatterDetailsModal from '../components/BatterDetailsModal.jsx';
import SquadModal from '../components/SquadModal.jsx';
import ScoreAnimation from '../components/ScoreAnimation.jsx';
import AbdullahMotivationModal, { isAbdullah, isHassan, isAbdullahMessagesEnabled } from '../components/AbdullahMotivationModal.jsx';
import DeveloperScorerChatModal from '../components/DeveloperScorerChatModal.jsx';
import CelebrationModal from '../components/CelebrationModal.jsx';
import BottomNavBar from '../components/BottomNavBar.jsx';
import PlayersHeadToHead from '../components/PlayersHeadToHead.jsx';
import PointingCriteriaModal from '../components/PointingCriteriaModal.jsx';
import MoreMenuModal from '../components/MoreMenuModal.jsx';
import Scorecard from './Scorecard.jsx';
import MatchSummary from './MatchSummary.jsx';
import Settings from './Settings.jsx';
import { TabSkeleton } from '../components/ui/LoadingPrimitives.jsx';

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
  const [isPointingCriteriaOpen, setIsPointingCriteriaOpen] = useState(false);
  const [isMorePopupOpen, setIsMorePopupOpen] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState(null);
  const [abdullahEvent, setAbdullahEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('score');
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [isDevChatOpen, setIsDevChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const prevBallCountRef = useRef(null);
  const lastSeenDevMsgCountRef = useRef(0);

  const handleSelectTab = (tab) => {
    if (tab === activeTab) return;
    setIsTabTransitioning(true);
    setActiveTab(tab);
    setTimeout(() => {
      setIsTabTransitioning(false);
    }, 220);
  };

  // Fallback internal listener if parent did not stream matchState
  const { matchState: fallbackState, scorerOfflineInfo: fallbackOffline } = useMatch(
    propMatchState?.teams?.length > 0 ? null : resolvedMatchId,
    true
  );

  const matchState = (propMatchState && (propMatchState.teams?.length > 0 || propMatchState.code))
    ? propMatchState
    : fallbackState;

  const isDevAuthed = typeof window !== 'undefined' && (
    sessionStorage.getItem('dev_auth') === 'true' ||
    localStorage.getItem('cricket_is_developer') === 'true'
  );

  // Subscribe to chat if developer is watching
  useEffect(() => {
    const effectiveMatchId = matchState?.matchId || resolvedMatchId;
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
  }, [matchState?.matchId, resolvedMatchId, isDevAuthed, isDevChatOpen]);

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

  const scorerOfflineInfo = propOfflineInfo || fallbackOffline;

  const curInnIndex = matchState?.currentInningsIndex || 0;
  const currentInnings = matchState?.innings?.[curInnIndex] || {
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
  const runsNeeded = matchState.target ? Math.max(0, matchState.target - currentInnings.score) : null;
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

  const shareUrl = getShareUrl('watch', matchState.code || matchCodeOrId || '');

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

  const handleCopyCode = () => {
    const code = matchState.code || matchCodeOrId || '';
    if (code) {
      navigator.clipboard?.writeText(code);
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
        const strikerName = latestBall.striker || currentInnings.striker;
        const bowlerName = latestBall.bowler || currentInnings.bowler;
        const dismissedPlayer = latestBall.dismissedPlayer || strikerName;

        const strikerStat = currentInnings?.batters?.find((b) => b.name === strikerName);
        const currentBatterRuns = strikerStat ? (strikerStat.runs || 0) : 0;
        const batRuns = (extraType === null || extraType === 'no_ball') ? runs : 0;
        const prevRuns = Math.max(0, currentBatterRuns - batRuns);
        const milestone = checkBattingMilestone(prevRuns, batRuns);
        const isHatTrick = isWicket && checkBowlerHatTrick(balls.slice(0, -1), bowlerName, true);

        // 1. Abdullah & Hassan motivational brother messages check (4-second unskippable)
        if (isAbdullahMessagesEnabled()) {
          if (isHatTrick && isAbdullah(bowlerName)) {
            setAbdullahEvent({ type: 'hat_trick', playerName: 'Abdullah' });
          } else if (isHatTrick && isHassan(bowlerName)) {
            setAbdullahEvent({ type: 'hat_trick', playerName: 'Hassan' });
          } else if (milestone === 'century' && isAbdullah(strikerName)) {
            setAbdullahEvent({ type: 'century', playerName: 'Abdullah' });
          } else if (milestone === 'century' && isHassan(strikerName)) {
            setAbdullahEvent({ type: 'century', playerName: 'Hassan' });
          } else if (milestone === 'fifty' && isAbdullah(strikerName)) {
            setAbdullahEvent({ type: 'fifty', playerName: 'Abdullah' });
          } else if (milestone === 'fifty' && isHassan(strikerName)) {
            setAbdullahEvent({ type: 'fifty', playerName: 'Hassan' });
          } else if (isWicket && isAbdullah(bowlerName)) {
            setAbdullahEvent({ type: 'wicket_taken', playerName: 'Abdullah' });
          } else if (isWicket && isHassan(bowlerName)) {
            setAbdullahEvent({ type: 'wicket_taken', playerName: 'Hassan' });
          } else if (isWicket && (isAbdullah(dismissedPlayer) || isAbdullah(strikerName))) {
            const abdullahBatter = currentInnings?.batters?.find((b) => isAbdullah(b.name));
            setAbdullahEvent({ type: 'out', score: abdullahBatter?.runs || 0, playerName: 'Abdullah' });
          } else if (isWicket && (isHassan(dismissedPlayer) || isHassan(strikerName))) {
            const hassanBatter = currentInnings?.batters?.find((b) => isHassan(b.name));
            setAbdullahEvent({ type: 'out', score: hassanBatter?.runs || 0, playerName: 'Hassan' });
          } else if (runs === 6 && isAbdullah(strikerName)) {
            setAbdullahEvent({ type: 'six', playerName: 'Abdullah' });
          } else if (runs === 6 && isHassan(strikerName)) {
            setAbdullahEvent({ type: 'six', playerName: 'Hassan' });
          } else if (runs === 4 && isAbdullah(strikerName)) {
            setAbdullahEvent({ type: 'four', playerName: 'Abdullah' });
          } else if (runs === 4 && isHassan(strikerName)) {
            setAbdullahEvent({ type: 'four', playerName: 'Hassan' });
          }
        }

        // 2. Standard 2-second event popups (hat-trick, 50, 100, wide, no ball, four, six, wicket, extra)
        if (isHatTrick) {
          setActiveAnimation({
            type: 'hat_trick',
            text: 'HAT-TRICK! (3 IN 3)',
            subtext: `${bowlerName || 'Bowler'} TAKES 3 WICKETS IN 3 BALLS!`
          });
        } else if (milestone === 'century') {
          setActiveAnimation({
            type: 'century',
            text: 'CENTURY! (100 RUNS)',
            subtext: `${strikerName || 'Batter'} SCORES A MAGNIFICENT 100!`
          });
        } else if (milestone === 'fifty') {
          setActiveAnimation({
            type: 'fifty',
            text: 'HALF CENTURY! (50 RUNS)',
            subtext: `${strikerName || 'Batter'} REACHES 50 RUNS!`
          });
        } else if (isWicket) {
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

  // Check if developer has restricted viewers for this match
  if (matchState?.isViewerRestricted || matchState?.maxViewers === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center select-none text-[var(--text)]">
        <div className="card w-full max-w-sm p-6 shadow-2xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-[var(--well)] border border-[var(--b)] text-[var(--pri)] flex items-center justify-center text-2xl">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-[var(--text)]">
            Viewing Restricted
          </h2>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Live viewer access for this match has been restricted by the match administrator.
          </p>
          <button
            onClick={onBack}
            className="btn btn-p w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider mt-2 active:scale-95 transition-all shadow-md"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-start w-full max-w-lg lg:max-w-6xl mx-auto px-1 sm:px-3 lg:pl-28 lg:pr-8 pb-24 select-none safe-top text-[var(--text)]">
      {/* 1. Top Header */}
      <header className="w-full flex items-center justify-between gap-2 py-2 shrink-0 relative z-30">
        {/* Left: Brand title on desktop, Back button & Match Code & Live */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="hidden lg:flex items-center gap-1.5 mr-2 font-serif font-black text-lg text-[var(--pri)] tracking-tight">
            <span>SmartCricket</span>
          </div>

          <button
            onClick={onBack}
            className="ib shrink-0"
            title="Go Back"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopyCode}
            className="code flex items-center gap-1.5 shrink-0"
            title="Click to copy match code"
            aria-label="Copy match code"
          >
            <span>#{matchState.code || matchCodeOrId || 'LIVE'}</span>
            {copied ? <Check className="w-3 h-3 text-[var(--ok)]" /> : null}
          </button>

          <span className="pill live flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)] animate-ping" />
            LIVE
          </span>
        </div>

        {/* Right: Developer Chat, More Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isDevAuthed && (
            <button
              onClick={() => {
                setIsDevChatOpen(true);
                setUnreadChatCount(0);
              }}
              className="ib relative"
              title="Chat with Scorer as Developer"
              aria-label="Chat with Scorer as Developer"
            >
              <MessageSquare className="w-4 h-4 text-[var(--ok)]" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[var(--ok)] text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {unreadChatCount}
                </span>
              )}
            </button>
          )}

          {/* Three-dots menu for Share & Theme */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="ib"
              title="More Options"
              aria-label="More Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--bd)',
                    color: 'var(--t1)'
                  }}
                  className="absolute right-0 top-11 z-50 min-w-[180px] p-2 rounded-2xl border shadow-2xl flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                >
                  <button
                    onClick={() => {
                      handleShare();
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 text-xs font-semibold transition-colors text-left text-[var(--text)]"
                  >
                    <span className="flex items-center gap-2">
                      <Share2 className="w-3.5 h-3.5 text-[var(--ok)]" />
                      <span>Share Match</span>
                    </span>
                    {copied && <Check className="w-3.5 h-3.5 text-[var(--ok)]" />}
                  </button>

                  <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 text-xs font-semibold text-[var(--text)]">
                    <span>Theme</span>
                    <ThemeToggle />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Offline banner */}
      {scorerOfflineInfo && (
        <div className="w-full card border-[var(--warn)] bg-[var(--well)] px-3 py-1.5 text-center text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis animate-pulse my-2 text-[var(--warn)]">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{scorerOfflineInfo}. Live score will catch up automatically when online.</span>
        </div>
      )}

      {/* Innings Break Banner for Viewer */}
      {curInnIndex === 0 && (currentInnings.isCompleted || matchState.status === 'innings_break') && (
        <div className="card p-4 text-center flex flex-col items-center gap-1.5 my-2 shadow-md animate-in fade-in border-[var(--warn)]">
          <span className="text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 text-[var(--pri)]">
            <Trophy className="w-3.5 h-3.5 text-[var(--ok)]" />
            <span>1st Innings Concluded ({currentInnings.score}/{currentInnings.wickets})</span>
          </span>
          <span className="text-sm font-extrabold text-[var(--text)]">
            Target: {matchState.target || currentInnings.score + 1} runs ({matchState.teams?.[1]?.name || 'Chasing Team'} needs {matchState.target || currentInnings.score + 1} from {matchState.overs} ov)
          </span>
          <span className="text-xs text-[var(--muted)]">
            Second innings will begin shortly...
          </span>
        </div>
      )}

      {/* Main Tab Routing with Zero-Lag Shimmer Skeleton Transition */}
      {isTabTransitioning ? (
        <div className="w-full flex-1 py-3 pb-20">
          <TabSkeleton tab={activeTab} />
        </div>
      ) : (
        <>
          {activeTab === 'score' && (
            <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 py-3 flex-1 pb-20 items-start">
              {/* Left Column on Desktop: Score Card, Batters, Bowler */}
              <div className="flex flex-col gap-3.5 w-full min-w-0 lg:col-span-7">
                {/* Main Score Card */}
                <div className="glass-hero card p-4 sm:p-5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider pb-1">
                  <span className="text-[var(--text)]">
                    {currentInnings.battingTeam || 'Batting Team'} · Innings {curInnIndex + 1}
              </span>
              <span className="text-[var(--pri)] font-extrabold">
                vs {currentInnings.bowlingTeam || 'Bowling Team'}
              </span>
            </div>

            {/* Score row */}
            <div className="flex items-baseline justify-between py-1">
              <div className="big flex items-baseline">
                <span className="text-3xl sm:text-4xl font-extrabold text-[var(--t1)] font-mono tracking-tight">
                  {currentInnings.score}
                </span>
                <span className="text-[var(--danger)] text-3xl sm:text-4xl font-extrabold font-mono tracking-tight">
                  /{currentInnings.wickets}
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black font-mono text-[var(--warn)]">
                  {formatOvers(currentInnings.legalBalls)}{' '}
                  <span className="text-sm font-normal text-[var(--muted)]">
                    / {matchState.overs} ov
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar & Max Wickets */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 h-2 rounded-full overflow-hidden bg-[var(--well)]">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="h-full rounded-full bg-[var(--ok)] transition-all duration-300"
                />
              </div>
              <span className="pill text-[10px] font-mono font-bold shrink-0 uppercase">
                Max Wickets: {maxWickets}
              </span>
            </div>

            {/* Previous Team Batting Score */}
            {prevInnings && (
              <div className="py-2 px-3 rounded-xl bg-[var(--well)] border border-[var(--b)] text-xs flex items-center justify-between font-semibold mt-1">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-[var(--muted)]">1st Innings: {prevInnings.battingTeam}</span>
                  <span className="text-[var(--pri)] font-bold">
                    {prevInnings.score}/{prevInnings.wickets} ({formatOvers(prevInnings.legalBalls)} ov)
                  </span>
                </div>
                {prevInningsAtPoint && (
                  <div className="text-right text-[11px] shrink-0 font-medium text-[var(--muted)]">
                    At {formatOvers(currentInnings.legalBalls)} ov:{' '}
                    <strong className="text-[var(--warn)]">
                      {prevInningsAtPoint.score}/{prevInningsAtPoint.wickets}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* CRR / Projected labels */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--b)] text-xs font-semibold">
              <div>
                <span className="text-[var(--muted)]">CRR: </span>
                <strong className="text-[var(--text)]">{crr}</strong>
              </div>
              {curInnIndex === 1 && matchState.target ? (
                <div>
                  {matchState.status === 'completed' ? (
                    <span className="text-[var(--warn)] font-bold">Match Completed</span>
                  ) : (
                    <>
                      <span className="text-[var(--muted)]">Need: </span>
                      <strong className="text-[var(--danger)]">{Math.max(0, matchState.target - currentInnings.score)}</strong>
                      <span className="text-[var(--muted)]"> (RRR: </span>
                      <strong className="text-[var(--danger)]">{rrr}</strong>
                      <span className="text-[var(--muted)]">)</span>
                    </>
                  )}
                </div>
              ) : isFirstInningsEnded ? (
                <div>
                  <span className="text-[var(--muted)]">Target for Inn 2: </span>
                  <strong className="text-[var(--warn)]">{matchState.target || currentInnings.score + 1}</strong>
                </div>
              ) : (
                <div>
                  <span className="text-[var(--muted)]">Projected: </span>
                  <strong className="text-[var(--text)]">{Math.round(crr * matchState.overs) || 0}</strong>
                </div>
              )}
            </div>

            {/* Broadcast Chase Momentum Gauge (2nd Innings Active) */}
            {curInnIndex === 1 && matchState.target && matchState.status !== 'completed' && (
              <div
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--well) 70%, transparent)',
                  borderColor: 'var(--bda)'
                }}
                className="rounded-2xl border p-3 flex flex-col gap-2 shadow-sm mt-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[var(--pri)] animate-pulse" />
                    <span className="text-xs font-black tracking-wide uppercase" style={{ color: 'var(--t1)' }}>
                      Chase Momentum
                    </span>
                  </div>
                  <span
                    style={{
                      backgroundColor: Number(crr) >= Number(rrr) ? 'color-mix(in srgb, var(--ok) 18%, transparent)' : 'color-mix(in srgb, var(--bad) 18%, transparent)',
                      color: Number(crr) >= Number(rrr) ? 'var(--ok)' : 'var(--bad)'
                    }}
                    className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                    {Number(crr) >= Number(rrr) ? 'Batting Ahead' : 'Bowling Pressure'}
                  </span>
                </div>

                {/* Progress Track: Target Completion */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span style={{ color: 'var(--t2)' }}>
                      Progress: <b style={{ color: 'var(--t1)' }}>{currentInnings.score}</b> / {matchState.target}
                    </span>
                    <span style={{ color: 'var(--pri)' }}>
                      {Math.min(100, Math.round(((currentInnings.score || 0) / matchState.target) * 100))}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bd)] overflow-hidden flex">
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(2, Math.round(((currentInnings.score || 0) / matchState.target) * 100)))}%`,
                        backgroundColor: Number(crr) >= Number(rrr) ? 'var(--ok)' : 'var(--pri)',
                        transition: 'width 0.4s ease'
                      }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>

                {/* Equation Strip */}
                <div className="grid grid-cols-3 gap-2 pt-0.5 text-center">
                  <div className="flex flex-col items-center p-1.5 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
                    <span className="text-[10px] text-[var(--t2)] uppercase font-semibold">Need</span>
                    <span className="text-xs font-black text-[var(--bad)] font-mono">{runsNeeded}</span>
                    <span className="text-[9px] text-[var(--t3)]">from {Math.max(0, (matchState.overs * 6) - (currentInnings.legalBalls || 0))}b</span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
                    <span className="text-[10px] text-[var(--t2)] uppercase font-semibold">CRR</span>
                    <span className="text-xs font-black text-[var(--ok)] font-mono">{crr}</span>
                    <span className="text-[9px] text-[var(--t3)]">Current</span>
                  </div>
                  <div className="flex flex-col items-center p-1.5 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
                    <span className="text-[10px] text-[var(--t2)] uppercase font-semibold">Req RR</span>
                    <span
                      className={`text-xs font-black font-mono ${Number(rrr) > Number(crr) ? 'text-[var(--bad)]' : 'text-[var(--t1)]'}`}
                    >
                      {rrr}
                    </span>
                    <span className="text-[9px] text-[var(--t3)]">Required</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Batters Card */}
          <div className="card p-3 sm:p-4 flex flex-col gap-2">
            <div className="overflow-x-auto -mx-1">
              <table className="t w-full">
                <thead>
                  <tr>
                    <th className="text-left font-sans text-[10px]">BATTER (TAP FOR STATS)</th>
                    <th className="text-right text-[10px]">R</th>
                    <th className="text-right text-[10px]">B</th>
                    <th className="text-right text-[10px]">4s</th>
                    <th className="text-right text-[10px]">6s</th>
                    <th className="text-right text-[10px]">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Striker row */}
                  <tr
                    onClick={() => setSelectedBatterDetails(matchState.striker)}
                    className="hl cursor-pointer"
                    title="Click to view complete batter innings & bowler match-ups"
                  >
                    <td>
                      <div className="flex items-center gap-1.5 font-sans font-bold">
                        <User className="w-4 h-4 text-[var(--ok)] shrink-0" />
                        <div className="truncate">
                          <div className="flex items-center gap-1">
                            <span className="truncate">{matchState.striker || 'Striker'}</span>
                            <span className="pill text-[9px] py-0 px-1.5 leading-none font-bold">*</span>
                          </div>
                          <span className="text-[9px] block font-normal opacity-80">Tap for stats</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right font-black text-xs sm:text-sm">{strikerStat.runs}</td>
                    <td className="text-right text-xs text-[var(--muted)]">{strikerStat.balls}</td>
                    <td className="text-right text-xs text-[var(--muted)]">{strikerStat.fours}</td>
                    <td className="text-right text-xs text-[var(--muted)] font-semibold">{strikerStat.sixes}</td>
                    <td className="text-right text-xs font-bold text-[var(--muted)]">{Math.round(strikerStat.strikeRate || 0)}</td>
                  </tr>
                  {/* Non-striker row */}
                  <tr
                    onClick={() => setSelectedBatterDetails(matchState.nonStriker)}
                    className="cursor-pointer"
                    title="Click to view complete batter innings & bowler match-ups"
                  >
                    <td>
                      <div className="flex items-center gap-1.5 font-sans font-semibold">
                        <User className="w-4 h-4 opacity-50 shrink-0" />
                        <div className="truncate">
                          <span className="truncate">{matchState.nonStriker || 'Non-Striker'}</span>
                          <span className="text-[9px] block font-normal text-[var(--muted)]">Tap for stats</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right font-bold text-xs sm:text-sm">{nonStrikerStat.runs}</td>
                    <td className="text-right text-xs text-[var(--muted)]">{nonStrikerStat.balls}</td>
                    <td className="text-right text-xs text-[var(--muted)]">{nonStrikerStat.fours}</td>
                    <td className="text-right text-xs text-[var(--muted)] font-semibold">{nonStrikerStat.sixes}</td>
                    <td className="text-right text-xs font-bold text-[var(--muted)]">{Math.round(nonStrikerStat.strikeRate || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bowler Card */}
          <div className="card p-3 sm:p-4 flex flex-col gap-1.5">
            <div className="overflow-x-auto -mx-1">
              <table className="t w-full">
                <thead>
                  <tr>
                    <th className="text-left font-sans text-[10px]">BOWLER</th>
                    <th className="text-right text-[10px]">O</th>
                    <th className="text-right text-[10px]">M</th>
                    <th className="text-right text-[10px]">R</th>
                    <th className="text-right text-[10px]">W</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold text-[var(--pri)] truncate">{matchState.currentBowler || 'Bowler'}</td>
                    <td className="text-right font-mono">{bowlerStat.overs}</td>
                    <td className="text-right text-[var(--muted)]">{bowlerStat.maidens}</td>
                    <td className="text-right font-semibold">{bowlerStat.runsConceded}</td>
                    <td className="text-right font-black text-[var(--danger)]">{bowlerStat.wickets}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column on Desktop: Recent Deliveries & Charts */}
        <div className="flex flex-col gap-3.5 w-full min-w-0 lg:col-span-5">
            {/* Recent Deliveries */}
            <div className="card p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="lbl">Recent Deliveries</span>
                <span className="text-[11px] text-[var(--muted)] font-mono">{recentBalls.length} balls</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {recentBalls.length === 0 ? (
                  <span className="text-xs text-[var(--muted)] py-1">Waiting for deliveries...</span>
                ) : (
                  recentBalls.map((b, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: b.isWicket
                          ? '#DC2626'
                          : b.runs === 6
                          ? 'var(--pri)'
                          : b.runs === 4
                          ? 'var(--accent)'
                          : b.extraType
                          ? 'var(--warn)'
                          : b.runs > 0
                          ? 'var(--ball-run-bg)'
                          : 'var(--well)',
                        color: b.isWicket
                          ? '#FFFFFF'
                          : b.runs === 0 && !b.extraType && !b.isWicket
                          ? 'var(--muted)'
                          : b.runs > 0 && !b.extraType && !b.isWicket
                          ? 'var(--ball-run-text)'
                          : '#FFFFFF',
                        borderColor: b.isWicket
                          ? '#EF4444'
                          : b.runs > 0 && !b.extraType && !b.isWicket
                          ? 'var(--ball-run-border)'
                          : 'var(--b)'
                      }}
                      className="bl shrink-0 border shadow-sm font-black text-xs"
                    >
                      {b.shortLabel}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Over & Worm Charts */}
            <MatchCharts matchState={matchState} />
          </div>
        </div>
      )}

      {/* Scorecard Tab */}
      {activeTab === 'scorecard' && (
        <div className="w-full flex-1 pt-1">
          <Scorecard matchState={matchState} onBack={() => setActiveTab('score')} onOpenSummary={() => setActiveTab('summary')} />
        </div>
      )}

      {/* Teams / Head-to-Head Tab */}
      {activeTab === 'teams' && (
        <div className="w-full flex-1 pt-1">
          <PlayersHeadToHead matchState={matchState} />
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="w-full flex-1 pt-1">
          <Settings onBack={() => setActiveTab('score')} />
        </div>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="w-full flex-1 pt-1">
          <MatchSummary matchState={matchState} onBack={() => setActiveTab('score')} />
        </div>
      )}
        </>
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
      <footer className="mt-8 pt-4 pb-24 text-center text-xs border-t border-[var(--b)] text-[var(--muted)] leading-normal">
        © 2026 SmartCricket · Live Spectator Console
      </footer>

      {/* Pointing System Criteria Modal */}
      <PointingCriteriaModal
        isOpen={isPointingCriteriaOpen}
        onClose={() => setIsPointingCriteriaOpen(false)}
      />

      {/* Premium More Popup Interface */}
      <MoreMenuModal
        isOpen={isMorePopupOpen}
        onClose={() => setIsMorePopupOpen(false)}
        onOpenSummary={() => setActiveTab('summary')}
        onOpenSquad={() => setIsSquadModalOpen(true)}
        onOpenPointingCriteria={() => setIsPointingCriteriaOpen(true)}
        isFirstInningsEnded={isFirstInningsEnded}
        isViewer={true}
      />

      {/* Persistent Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isMoreOpen={isMorePopupOpen}
        onToggleMore={() => setIsMorePopupOpen(!isMorePopupOpen)}
      />
    </div>
  );
}
