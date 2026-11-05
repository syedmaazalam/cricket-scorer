import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Share2,
  FileText,
  Check,
  Trophy,
  Users,
  Clock,
  Radio,
  FileSpreadsheet,
  MoreVertical,
  Flag,
  Moon,
  Sun,
  TrendingUp,
  Target,
  User,
  Shield,
  Zap,
  MessageSquare,
  Copy,
  Edit3,
  Activity
} from 'lucide-react';
import SyncBadge from '../components/SyncBadge.jsx';
import RunPad from '../components/RunPad.jsx';
import WicketModal from '../components/WicketModal.jsx';
import BowlerModal from '../components/BowlerModal.jsx';
import NewBatterModal from '../components/NewBatterModal.jsx';
import InningsBreakModal from '../components/InningsBreakModal.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import BatterDetailsModal from '../components/BatterDetailsModal.jsx';
import TimeDeclareModal from '../components/TimeDeclareModal.jsx';
import SquadModal from '../components/SquadModal.jsx';
import MatchCharts from '../components/MatchCharts.jsx';
import CelebrationModal from '../components/CelebrationModal.jsx';
import AddPreviousOverBallModal from '../components/AddPreviousOverBallModal.jsx';
import BottomNavBar from '../components/BottomNavBar.jsx';
import PlayersHeadToHead from '../components/PlayersHeadToHead.jsx';
import PointingCriteriaModal from '../components/PointingCriteriaModal.jsx';
import ActionLogsModal from '../components/ActionLogsModal.jsx';
import ScoreAnimation from '../components/ScoreAnimation.jsx';
import AbdullahMotivationModal, { isAbdullah, isHassan, isAbdullahMessagesEnabled } from '../components/AbdullahMotivationModal.jsx';
import DeveloperScorerChatModal from '../components/DeveloperScorerChatModal.jsx';
import OverthrowModal from '../components/OverthrowModal.jsx';
import EditBallModal from '../components/EditBallModal.jsx';
import MoreMenuModal from '../components/MoreMenuModal.jsx';
import { subscribeMatchMessages } from '../firebase/matches.js';
import { TabSkeleton } from '../components/ui/LoadingPrimitives.jsx';
import Scorecard from './Scorecard.jsx';
import MatchSummary from './MatchSummary.jsx';
import Settings from './Settings.jsx';
import { computeInningsStats, getScoreAtLegalBalls } from '../engine/stats.js';
import { formatOvers, calculateCRR, calculateRRR, getMaxWickets, checkBattingMilestone, checkBowlerHatTrick } from '../engine/rules.js';
import { getShareUrl } from '../engine/constants.js';

export default function Scoring({
  matchState,
  syncStatus,
  onRecordBall,
  onEditBall,
  onSwapBatter,
  onChangeBowler,
  onAddNewBatter,
  onRetireBatter,
  onEditPlayer,
  onEndInnings,
  onAddBallToPreviousOver,
  onReopenPreviousOver,
  onUndo,
  onNavigate,
  onOpenScorecard,
  onOpenSummary
}) {
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [isOverthrowModalOpen, setIsOverthrowModalOpen] = useState(false);
  const [isEditBallModalOpen, setIsEditBallModalOpen] = useState(false);
  const [selectedBallForEdit, setSelectedBallForEdit] = useState(null);
  const [isTimeDeclareOpen, setIsTimeDeclareOpen] = useState(false);
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [isAddPrevOverBallOpen, setIsAddPrevOverBallOpen] = useState(false);
  const [selectedBatterDetails, setSelectedBatterDetails] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isManualBreakOpen, setIsManualBreakOpen] = useState(false);
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [isPointingCriteriaOpen, setIsPointingCriteriaOpen] = useState(false);
  const [isActionLogsOpen, setIsActionLogsOpen] = useState(false);
  const [isMorePopupOpen, setIsMorePopupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('score');
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSelectTab = (tab) => {
    if (tab === activeTab) return;
    setIsTabTransitioning(true);
    setActiveTab(tab);
    setTimeout(() => {
      setIsTabTransitioning(false);
    }, 220);
  };
  const [scoreAnimationData, setScoreAnimationData] = useState(null);
  const [abdullahEvent, setAbdullahEvent] = useState(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [latestDevMessage, setLatestDevMessage] = useState(null);
  const lastSeenMsgCountRef = useRef(0);
  const hasGreetedAbdullahRef = useRef(new Set());

  const effectiveMatchId = matchState?.matchId || matchState?.code || matchState?.id || (typeof window !== 'undefined' ? localStorage.getItem('cricket_active_match_id') : null);

  // Real-time Developer to Scorer chat subscription
  useEffect(() => {
    if (!effectiveMatchId) return;
    const unsub = subscribeMatchMessages(effectiveMatchId, (msgs) => {
      if (!Array.isArray(msgs)) return;
      if (lastSeenMsgCountRef.current > 0 && msgs.length > lastSeenMsgCountRef.current) {
        const newest = msgs[msgs.length - 1];
        if (newest && newest.sender === 'developer' && !isChatModalOpen) {
          setUnreadChatCount((prev) => prev + 1);
          setLatestDevMessage(newest);
          setTimeout(() => setLatestDevMessage(null), 6000);
        }
      }
      lastSeenMsgCountRef.current = msgs.length;
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [effectiveMatchId, isChatModalOpen]);

  // Greet Abdullah & Hassan when they come to bat (once per innings)
  useEffect(() => {
    if (!isAbdullahMessagesEnabled()) return;
    const currentInningsNum = matchState.currentInnings || 1;
    const striker = matchState.striker;
    const nonStriker = matchState.nonStriker;

    if (isAbdullah(striker) && !hasGreetedAbdullahRef.current.has(`inn_${currentInningsNum}_${striker}`)) {
      hasGreetedAbdullahRef.current.add(`inn_${currentInningsNum}_${striker}`);
      setAbdullahEvent({ type: 'comes_to_bat', playerName: 'Abdullah' });
    } else if (isHassan(striker) && !hasGreetedAbdullahRef.current.has(`inn_${currentInningsNum}_${striker}`)) {
      hasGreetedAbdullahRef.current.add(`inn_${currentInningsNum}_${striker}`);
      setAbdullahEvent({ type: 'comes_to_bat', playerName: 'Hassan' });
    } else if (isAbdullah(nonStriker) && !hasGreetedAbdullahRef.current.has(`inn_${currentInningsNum}_${nonStriker}`)) {
      hasGreetedAbdullahRef.current.add(`inn_${currentInningsNum}_${nonStriker}`);
      setAbdullahEvent({ type: 'comes_to_bat', playerName: 'Abdullah' });
    } else if (isHassan(nonStriker) && !hasGreetedAbdullahRef.current.has(`inn_${currentInningsNum}_${nonStriker}`)) {
      hasGreetedAbdullahRef.current.add(`inn_${currentInningsNum}_${nonStriker}`);
      setAbdullahEvent({ type: 'comes_to_bat', playerName: 'Hassan' });
    }
  }, [matchState.striker, matchState.nonStriker, matchState.currentInnings]);

  // Default to dark theme if not explicitly chosen
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('cricket_theme');
      const effectiveTheme = savedTheme || 'dark';
      document.documentElement.setAttribute('data-theme', effectiveTheme);
      document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
      if (!savedTheme) {
        localStorage.setItem('cricket_theme', 'dark');
      }
    } catch (_) {}
  }, []);

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

  const maxWickets = getMaxWickets(matchState.playersPerTeam);
  const isFirstInningsEnded = curInnIndex === 0 && (
    currentInnings.isCompleted ||
    matchState.status === 'innings_break' ||
    (matchState.overs && currentInnings.legalBalls >= matchState.overs * 6) ||
    currentInnings.wickets >= maxWickets
  );

  // Automatically pop up innings break modal when innings 1 completes
  useEffect(() => {
    if (isFirstInningsEnded) {
      setIsBreakModalOpen(true);
    }
  }, [isFirstInningsEnded]);

  const wicketsLeft = Math.max(0, maxWickets - currentInnings.wickets);
  const innStats = computeInningsStats(currentInnings);

  // Batters stats
  const strikerStat = innStats.batting[matchState.striker] || { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
  const nonStrikerStat = innStats.batting[matchState.nonStriker] || { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };

  // Bowler stats
  const bowlerStat = innStats.bowling[matchState.currentBowler] || {
    overs: formatOvers(0),
    maidens: 0,
    runsConceded: 0,
    wickets: 0,
    economy: 0
  };

  // Squads
  const currentBattingTeamObj = matchState.teams?.find(t => t.name === currentInnings.battingTeam) || matchState.teams?.[curInnIndex] || matchState.teams?.[0];
  const currentBowlingTeamObj = matchState.teams?.find(t => t.name === currentInnings.bowlingTeam) || matchState.teams?.[curInnIndex === 0 ? 1 : 0] || matchState.teams?.[1];

  const battingSquad = currentBattingTeamObj?.players || [];
  const recordedBowlers = Object.keys(innStats.bowling || {});
  const bowlingSquad = Array.from(new Set([...(currentBowlingTeamObj?.players || []), ...recordedBowlers])).filter(Boolean);

  const dismissedBatters = innStats.fow.map(f => f.playerOut);
  const activeBatters = [matchState.striker, matchState.nonStriker].filter(Boolean);
  const availableBatters = battingSquad.filter(p => !dismissedBatters.includes(p) && !activeBatters.includes(p));

  // Run rates & overs progress
  const crr = calculateCRR(currentInnings.score, currentInnings.legalBalls);
  const rrr = matchState.target ? calculateRRR(matchState.target, currentInnings.score, currentInnings.legalBalls, matchState.overs) : null;

  const totalBallsAllowed = matchState.overs * 6;
  const progressPercent = Math.min(100, Math.round((currentInnings.legalBalls / Math.max(1, totalBallsAllowed)) * 100));
  const runsNeeded = matchState.target ? Math.max(0, matchState.target - currentInnings.score) : null;

  // Filter current over balls accurately (only deliveries strictly in this over)
  const currentOverData = (() => {
    const balls = currentInnings.balls || [];
    if (balls.length === 0) {
      return {
        overNumber: 1,
        balls: [],
        legalCount: 0,
        runs: 0,
        wickets: 0
      };
    }

    let targetStartLegal;
    let targetEndLegal;

    if (matchState.needsBowlerChange && currentInnings.legalBalls > 0 && currentInnings.legalBalls % 6 === 0) {
      targetStartLegal = currentInnings.legalBalls - 6;
      targetEndLegal = currentInnings.legalBalls;
    } else {
      targetStartLegal = Math.floor(currentInnings.legalBalls / 6) * 6;
      targetEndLegal = targetStartLegal + 6;
    }

    const overNumber = Math.floor(targetStartLegal / 6) + 1;
    let runningLegal = 0;
    const overBalls = [];

    for (const b of balls) {
      const legalBefore = runningLegal;
      if (b.isLegal) {
        runningLegal++;
      }
      if (legalBefore >= targetStartLegal && legalBefore < targetEndLegal) {
        overBalls.push(b);
      }
    }

    const overRuns = overBalls.reduce((acc, b) => {
      const runsBat = Number(b.runs) || 0;
      const exRuns = Number(b.extraRuns) || 0;
      const penalty = (b.extraType === 'wide' || b.extraType === 'no_ball') ? 1 : 0;
      return acc + runsBat + exRuns + penalty;
    }, 0);

    const overWickets = overBalls.filter((b) => b.isWicket).length;
    const overLegalCount = overBalls.filter((b) => b.isLegal).length;

    return {
      overNumber,
      balls: overBalls,
      legalCount: overLegalCount,
      runs: overRuns,
      wickets: overWickets
    };
  })();

  const currentOverBalls = currentOverData.balls;

  const shareUrl = getShareUrl('watch', matchState.code || '');

  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: `Live Match: ${matchState.teams?.[0]?.name} vs ${matchState.teams?.[1]?.name}`,
        text: `Watch live cricket! ${currentInnings.battingTeam} ${currentInnings.score}/${currentInnings.wickets}\nMatch Code: ${matchState.code}`,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // 10 seconds waiting time timer after every ball scored
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleScoreBall = (ballData) => {
    const isWicket = Boolean(ballData.isWicket);
    const runs = Number(ballData.runs || 0);
    const extraType = ballData.extraType;
    const currentBowler = matchState.currentBowler;
    const currentStriker = matchState.striker;
    const dismissedPlayer = ballData.dismissedPlayer || currentStriker;

    // 1. Abdullah & Hassan motivational brother messages check & milestones
    const strikerStat = currentInnings?.batters?.find((b) => b.name === currentStriker);
    const prevRuns = strikerStat ? (strikerStat.runs || 0) : 0;
    const batRuns = (extraType === null || extraType === 'no_ball') ? runs : 0;
    const milestone = checkBattingMilestone(prevRuns, batRuns);
    const isHatTrick = isWicket && checkBowlerHatTrick(currentInnings?.balls || [], currentBowler, true);

    if (isAbdullahMessagesEnabled()) {
      if (isHatTrick && isAbdullah(currentBowler)) {
        setAbdullahEvent({ type: 'hat_trick', playerName: 'Abdullah' });
      } else if (isHatTrick && isHassan(currentBowler)) {
        setAbdullahEvent({ type: 'hat_trick', playerName: 'Hassan' });
      } else if (milestone === 'century' && isAbdullah(currentStriker)) {
        setAbdullahEvent({ type: 'century', playerName: 'Abdullah' });
      } else if (milestone === 'century' && isHassan(currentStriker)) {
        setAbdullahEvent({ type: 'century', playerName: 'Hassan' });
      } else if (milestone === 'fifty' && isAbdullah(currentStriker)) {
        setAbdullahEvent({ type: 'fifty', playerName: 'Abdullah' });
      } else if (milestone === 'fifty' && isHassan(currentStriker)) {
        setAbdullahEvent({ type: 'fifty', playerName: 'Hassan' });
      } else if (isWicket && isAbdullah(currentBowler)) {
        // When he takes a wicket
        setAbdullahEvent({ type: 'wicket_taken', playerName: 'Abdullah' });
      } else if (isWicket && isHassan(currentBowler)) {
        setAbdullahEvent({ type: 'wicket_taken', playerName: 'Hassan' });
      } else if (isWicket && (isAbdullah(dismissedPlayer) || isAbdullah(currentStriker))) {
        // When he gets out on some score
        const abdullahBatter = currentInnings?.batters?.find((b) => isAbdullah(b.name));
        const finalScore = abdullahBatter ? (abdullahBatter.runs || 0) : 0;
        setAbdullahEvent({ type: 'out', score: finalScore, playerName: 'Abdullah' });
      } else if (isWicket && (isHassan(dismissedPlayer) || isHassan(currentStriker))) {
        const hassanBatter = currentInnings?.batters?.find((b) => isHassan(b.name));
        const finalScore = hassanBatter ? (hassanBatter.runs || 0) : 0;
        setAbdullahEvent({ type: 'out', score: finalScore, playerName: 'Hassan' });
      } else if (runs === 6 && isAbdullah(currentStriker)) {
        // Hits a six
        setAbdullahEvent({ type: 'six', playerName: 'Abdullah' });
      } else if (runs === 6 && isHassan(currentStriker)) {
        setAbdullahEvent({ type: 'six', playerName: 'Hassan' });
      } else if (runs === 4 && isAbdullah(currentStriker)) {
        // Hits a four
        setAbdullahEvent({ type: 'four', playerName: 'Abdullah' });
      } else if (runs === 4 && isHassan(currentStriker)) {
        setAbdullahEvent({ type: 'four', playerName: 'Hassan' });
      }
    }

    // 2. Standard 2-second event pop-up messages (hat-trick, 50, 100, wide, no ball, 4, 6, wicket)
    if (isHatTrick) {
      setScoreAnimationData({
        type: 'hat_trick',
        text: 'HAT-TRICK! (3 IN 3)',
        subtext: `${currentBowler || 'Bowler'} TAKES 3 WICKETS IN 3 BALLS!`
      });
    } else if (milestone === 'century') {
      setScoreAnimationData({
        type: 'century',
        text: 'CENTURY! (100 RUNS)',
        subtext: `${currentStriker || 'Batter'} SCORES A MAGNIFICENT 100!`
      });
    } else if (milestone === 'fifty') {
      setScoreAnimationData({
        type: 'fifty',
        text: 'HALF CENTURY! (50 RUNS)',
        subtext: `${currentStriker || 'Batter'} REACHES 50 RUNS!`
      });
    } else if (isWicket) {
      setScoreAnimationData({ type: 'wicket', text: 'WICKET!', subtext: 'BATTER OUT!' });
    } else if (runs === 6) {
      setScoreAnimationData({ type: 'six', text: '+6 MAXIMUM!', subtext: 'HUGE SIX!' });
    } else if (runs === 4) {
      setScoreAnimationData({ type: 'four', text: '+4 BOUNDARY!', subtext: 'FOUR RUNS!' });
    } else if (extraType === 'wide') {
      const extraRuns = ballData.extraRuns || 1;
      setScoreAnimationData({ type: 'wide', text: `+${extraRuns} WIDE`, subtext: 'WIDE BALL' });
    } else if (extraType === 'no_ball') {
      setScoreAnimationData({ type: 'no_ball', text: '+1 NO BALL', subtext: 'FREE HIT NEXT!' });
    } else if (extraType) {
      setScoreAnimationData({
        type: 'extra',
        text: `+${ballData.extraRuns || 1} ${String(extraType).toUpperCase()}`,
        subtext: 'EXTRA DELIVERY'
      });
    }

    onRecordBall(ballData);
    setCooldownSeconds(10);
  };

  const handleUndo = () => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('setting_confirm_undo') === 'true') {
      const confirmed = window.confirm('Are you sure you want to undo the last ball?');
      if (!confirmed) return;
    }
    setCooldownSeconds(0);
    onUndo();
  };

  const isAnyModalOpen = Boolean(
    isWicketModalOpen ||
    isOverthrowModalOpen ||
    isEditBallModalOpen ||
    isTimeDeclareOpen ||
    isSquadModalOpen ||
    isAddPrevOverBallOpen ||
    selectedBatterDetails ||
    isManualBreakOpen ||
    isBreakModalOpen ||
    isPointingCriteriaOpen ||
    isActionLogsOpen ||
    isMorePopupOpen ||
    isMenuOpen ||
    isChatModalOpen ||
    matchState?.needsBowlerChange ||
    matchState?.needsNewBatter
  );

  // Desktop physical keyboard shortcuts for rapid scoring
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeTab !== 'score') return;
      if (matchState?.isCompleted || currentInnings?.isCompleted) return;
      if (isAnyModalOpen) return;

      // Ignore if typing inside text inputs, textareas, selects, or contenteditable
      const targetTag = e.target?.tagName?.toUpperCase();
      if (
        targetTag === 'INPUT' ||
        targetTag === 'TEXTAREA' ||
        targetTag === 'SELECT' ||
        e.target?.isContentEditable
      ) {
        return;
      }

      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Runs 0-6 (Number row or NumPad)
      if (['0', '1', '2', '3', '4', '5', '6'].includes(e.key)) {
        if (cooldownSeconds > 0) return;
        e.preventDefault();
        handleScoreBall({
          runs: parseInt(e.key, 10),
          extraType: null,
          extraRuns: 0,
          isWicket: false
        });
        return;
      }

      // 'w' or 'W' for Wicket Out
      if (e.key === 'w' || e.key === 'W') {
        if (cooldownSeconds > 0) return;
        e.preventDefault();
        setIsWicketModalOpen(true);
        return;
      }

      // 'u' or 'U' for Undo
      if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // 's' or 'S' or Space for Swap Strike
      if (e.key === 's' || e.key === 'S' || e.key === ' ') {
        e.preventDefault();
        if (onSwapBatter) onSwapBatter();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTab,
    isAnyModalOpen,
    cooldownSeconds,
    matchState?.isCompleted,
    currentInnings?.isCompleted,
    handleScoreBall,
    handleUndo,
    onSwapBatter
  ]);

  return (
    <div
      style={{ color: 'var(--t1)' }}
      className="min-h-screen flex flex-col justify-start w-full max-w-lg lg:max-w-6xl mx-auto px-1 sm:px-3 lg:pl-28 lg:pr-8 pb-24 select-none safe-top"
    >
      {/* 1. Header Bar: Redesigned sticky glass chrome */}
      <header className="top w-full sticky top-0 z-20 flex items-center justify-between gap-1.5 py-3 shrink-0">
        {/* Left: Brand title on desktop, Back button & Match Code */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 mr-2 font-serif font-black text-lg text-[var(--pri)] tracking-tight">
            <span>SmartCricket</span>
          </div>

          <button
            onClick={() => onNavigate('home')}
            title="Back to Home"
            className="ib"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleShareLink}
            title="Click to copy live shareable link"
            className="code"
            aria-label="Copy match code"
          >
            <span>#{matchState.code || 'MATCH'}</span>
            {copiedCode ? <Check className="w-3.5 h-3.5 text-[var(--ok)]" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
          </button>
        </div>

        {/* Center: Flexible spacer */}
        <div className="flex-1" />

        {/* Right: Chat button, SyncBadge & More Menu Toggle */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          <button
            onClick={() => {
              setIsChatModalOpen(true);
              setUnreadChatCount(0);
              setLatestDevMessage(null);
            }}
            className={`ib relative ${unreadChatCount > 0 ? '!border-[var(--ok)] text-[var(--ok)]' : ''}`}
            title="Chat with Developer (Maaz)"
            aria-label="Chat with Developer"
          >
            <MessageSquare className="w-4 h-4 text-[var(--ok)]" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[var(--ok)] text-[var(--onpri)] text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                {unreadChatCount}
              </span>
            )}
          </button>
          <SyncBadge syncStatus={syncStatus} />
          <ThemeToggle />
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="ib"
            title="More Options"
            aria-label="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* More Dropdown Menu */}
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
                className="absolute right-0 top-12 z-50 w-56 rounded-2xl border shadow-2xl p-1.5 flex flex-col gap-1 text-xs font-bold animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
              >
              {onOpenSummary && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSummary(matchState);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--well)] transition-colors text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  <span>Match Summary</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsSquadModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--well)] transition-colors text-left"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Squad & Edit Players</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsTimeDeclareOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--well)] transition-colors text-left"
              >
                <Clock className="w-4 h-4 text-orange-400" />
                <span>Time Declare / Retire</span>
              </button>

              {curInnIndex === 0 && matchState.status === 'in_progress' && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsManualBreakOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--well)] transition-colors text-left text-[var(--warn)]"
                >
                  <Flag className="w-4 h-4" />
                  <span>Declare 1st Innings</span>
                </button>
              )}

              {currentInnings.legalBalls >= 6 && matchState.status !== 'completed' && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsAddPrevOverBallOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--well)] transition-colors text-left text-amber-400"
                >
                  <Clock className="w-4 h-4" />
                  <span>+ Ball to Previous Over</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  const allBallsList = currentInnings?.balls || [];
                  setSelectedBallForEdit(allBallsList.length > 0 ? allBallsList[allBallsList.length - 1] : null);
                  setIsEditBallModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--well)] transition-colors text-left text-[var(--pri)] font-bold"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Ball Score</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsActionLogsOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--well)] transition-colors text-left text-[var(--pri)]"
              >
                <FileText className="w-4 h-4" />
                <span>Action Audit Logs (Undos)</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsPointingCriteriaOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--well)] transition-colors text-left text-purple-400"
              >
                <Trophy className="w-4 h-4" />
                <span>Pointing System Criteria</span>
              </button>

              <div className="border-t my-1" style={{ borderColor: 'var(--bd)' }} />

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleShareLink();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--well)] transition-colors text-left text-[var(--warn)] font-bold"
              >
                <Share2 className="w-4 h-4 text-[var(--warn)]" />
                <span>Share Match Link</span>
              </button>

              <div className="px-3 py-1 flex items-center justify-between text-[11px] font-medium" style={{ color: 'var(--t2)' }}>
                <span>Theme Mode</span>
                <ThemeToggle />
              </div>
            </div>
          </>
        )}
        </div>
      </header>

      {/* Real-time Developer Message Toast Notification */}
      {latestDevMessage && !isChatModalOpen && (
        <div
          onClick={() => {
            setIsChatModalOpen(true);
            setUnreadChatCount(0);
            setLatestDevMessage(null);
          }}
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            borderColor: '#22C55E',
            color: 'var(--text)'
          }}
          className="mx-auto w-full max-w-xl my-2 p-3 rounded-xl border flex items-center justify-between gap-3 shadow-lg cursor-pointer animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-ping shrink-0" />
            <div className="truncate text-xs">
              <span className="font-bold text-[#22C55E]">{latestDevMessage.senderName || 'Developer'}: </span>
              <span className="opacity-90">{latestDevMessage.text}</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#22C55E] uppercase shrink-0 px-2.5 py-1 rounded-lg bg-[#22C55E]/20">
            Open Chat
          </span>
        </div>
      )}

      {/* Main Content by Tab with Tab Shift Shimmer Skeleton */}
      {isTabTransitioning ? (
        <div className="w-full flex-1 py-2">
          <TabSkeleton tab={activeTab} />
        </div>
      ) : (
        <>
          {activeTab === 'score' && (
            <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 py-2 flex-1 w-full min-w-0 items-start">
              {/* Left Column on Desktop: Score Card, Batters, Bowler, RunPad */}
              <div className="flex flex-col gap-3.5 w-full min-w-0 lg:col-span-7">
                {/* Main Score Card */}
                <section className="glass-hero card">
              <div className="row bt">
                <span className="lbl truncate">
                  {currentInnings.battingTeam || 'Batting Team'} · Inn {curInnIndex + 1}
                </span>
                <span className="lbl ac truncate">
                  vs {currentInnings.bowlingTeam || 'Bowling Team'}
                </span>
              </div>

              {/* Score row */}
              <div className="row bt" style={{ margin: '12px 0 14px', alignItems: 'flex-end' }}>
                <div className="big flex items-baseline">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[var(--t1)] font-mono tracking-tight">
                    {currentInnings.score}
                  </span>
                  <span className="text-[var(--bad)] text-3xl sm:text-4xl font-extrabold font-mono tracking-tight">
                    /{currentInnings.wickets}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <b className="ok mono" style={{ fontSize: '22px' }}>
                    {formatOvers(currentInnings.legalBalls)}
                  </b>
                  <span className="mu"> / {matchState.overs} ov</span>
                </div>
              </div>

              {/* Progress Bar & Wickets Left Pill */}
              <div className="row">
                <div className="bar" role="progressbar" aria-valuenow={progressPercent}>
                  <i style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="pill mono shrink-0">
                  Wickets left: <strong style={{ color: 'var(--t1)' }}>{wicketsLeft}</strong>
                </span>
              </div>

              {/* CRR & Projected / Target Pill Badges */}
              <div className="row" style={{ marginTop: '12px', gap: '8px' }}>
                <span className="pill" style={{ flex: 1, justifyContent: 'center' }}>
                  <TrendingUp className="w-3.5 h-3.5 text-[var(--ok)]" />
                  <span className="mu">CRR</span>
                  <b className="ok">{crr}</b>
                </span>

                {curInnIndex === 1 && matchState.target ? (
                  <span className="pill" style={{ flex: 1, justifyContent: 'center' }}>
                    {matchState.status === 'completed' ? (
                      <>
                        <Trophy className="w-3.5 h-3.5 text-[var(--ok)]" />
                        <b className="ok">Match Completed</b>
                      </>
                    ) : (
                      <>
                        <Target className="w-3.5 h-3.5 text-[var(--ok)]" />
                        <span className="mu">Need</span>
                        <b className="ok">{runsNeeded}</b>
                        <small className="mu">({rrr} RRR)</small>
                      </>
                    )}
                  </span>
                ) : isFirstInningsEnded ? (
                  <span className="pill" style={{ flex: 1, justifyContent: 'center' }}>
                    <Target className="w-3.5 h-3.5 text-[var(--ok)]" />
                    <span className="mu">Target</span>
                    <b className="ok">{matchState.target || currentInnings.score + 1}</b>
                  </span>
                ) : (
                  <span className="pill" style={{ flex: 1, justifyContent: 'center' }}>
                    <Target className="w-3.5 h-3.5 text-[var(--ok)]" />
                    <span className="mu">Projected</span>
                    <b className="ok">{Math.round(crr * matchState.overs) || 0}</b>
                  </span>
                )}
              </div>

              {/* Previous Team Batting Score */}
              {prevInnings && (
                <div
                  style={{
                    backgroundColor: 'var(--well)',
                    borderColor: 'var(--bd)'
                  }}
                  className="py-1 px-2.5 rounded-xl border text-[11px] flex items-center justify-between font-semibold mt-1"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="mu">1st Inn: {prevInnings.battingTeam}</span>
                    <b className="ok">
                      {prevInnings.score}/{prevInnings.wickets} ({formatOvers(prevInnings.legalBalls)} ov)
                    </b>
                  </div>
                  {currentInnings.legalBalls > 0 && (
                    <div className="text-right text-[10px] shrink-0 font-medium mu">
                      At {formatOvers(currentInnings.legalBalls)} ov:{' '}
                      <strong style={{ color: 'var(--warn)' }}>
                        {getScoreAtLegalBalls(prevInnings, currentInnings.legalBalls).score}/{getScoreAtLegalBalls(prevInnings, currentInnings.legalBalls).wickets}
                      </strong>
                    </div>
                  )}
                </div>
              )}

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
            </section>

            {/* PROMINENT ACTION CARD: Proceed to 2nd Innings OR End Innings early */}
            {isFirstInningsEnded ? (
              <section
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--warn) 14%, var(--card))',
                  borderColor: 'var(--warn)'
                }}
                className="card text-center flex flex-col items-center gap-2 animate-in zoom-in-95 my-1"
              >
                <div className="flex items-center gap-2 text-xs font-black uppercase text-[var(--warn)]">
                  <Trophy className="w-4 h-4 animate-bounce" />
                  <span>1st Innings Completed ({currentInnings.score}/{currentInnings.wickets})</span>
                </div>
                <div className="text-sm font-black" style={{ color: 'var(--t1)' }}>
                  Target for {matchState.teams?.[1]?.name || '2nd Team'}: <span className="ok">{matchState.target || currentInnings.score + 1} runs</span>
                </div>
                <button
                  onClick={() => setIsBreakModalOpen(true)}
                  className="btn p"
                  style={{ marginTop: '4px' }}
                >
                  <span>Proceed to 2nd Innings</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </section>
            ) : curInnIndex === 0 && matchState.status === 'in_progress' ? (
              <button
                onClick={() => setIsBreakModalOpen(true)}
                className="btn"
                style={{ color: 'var(--ok)' }}
                title="End or declare 1st innings early"
              >
                <Flag className="w-4 h-4" />
                <span>End Innings / Declare Early</span>
              </button>
            ) : null}

            {/* Batters Card */}
            <section className="card">
              <div className="sx">
                <table className="t">
                  <thead>
                    <tr>
                      <th>BATTER</th>
                      <th className="r">R</th>
                      <th className="r">B</th>
                      <th className="r">4S</th>
                      <th className="r">6S</th>
                      <th className="r">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Striker Row */}
                    <tr
                      onClick={() => setSelectedBatterDetails(matchState.striker)}
                      title="Click for complete breakdown"
                      className="hl cursor-pointer"
                    >
                      <td>
                        <b className="ac flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{matchState.striker || 'Select Striker'}</span>
                        </b>
                        <small>Striker</small>
                      </td>
                      <td className="r"><b>{strikerStat.runs}</b></td>
                      <td className="r m">{strikerStat.balls}</td>
                      <td className="r m">{strikerStat.fours}</td>
                      <td className="r m">{strikerStat.sixes}</td>
                      <td className="r mono">{Math.round(strikerStat.strikeRate || 0)}</td>
                    </tr>

                    {/* Non-Striker Row */}
                    <tr
                      onClick={() => setSelectedBatterDetails(matchState.nonStriker)}
                      title="Click for complete breakdown"
                      className="cursor-pointer"
                    >
                      <td>
                        <b className="flex items-center gap-1.5 truncate" style={{ color: 'var(--t1)' }}>
                          <User className="w-3.5 h-3.5 text-[var(--t2)] shrink-0" />
                          <span className="truncate">{matchState.nonStriker || 'Select Non-Striker'}</span>
                        </b>
                        <small style={{ background: 'var(--well)', color: 'var(--t2)' }}>Non-striker</small>
                      </td>
                      <td className="r"><b>{nonStrikerStat.runs}</b></td>
                      <td className="r m">{nonStrikerStat.balls}</td>
                      <td className="r m">{nonStrikerStat.fours}</td>
                      <td className="r m">{nonStrikerStat.sixes}</td>
                      <td className="r mono">{Math.round(nonStrikerStat.strikeRate || 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Partnership & Extras Bottom Strip */}
              <div
                style={{
                  backgroundColor: 'var(--well)',
                  borderColor: 'var(--bd)'
                }}
                className="row bt wrap mt-2.5 p-2.5 rounded-xl border text-xs"
              >
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[var(--ok)] inline" /> Partnership <b>{innStats.partnership?.runs || 0} ({innStats.partnership?.balls || 0})</b>
                </span>
                <span>
                  Extras <b>{innStats.extras.total}</b> <span className="mu">(b {innStats.extras.byes}, lb {innStats.extras.legByes}, wd {innStats.extras.wides}, nb {innStats.extras.noBalls})</span>
                </span>
              </div>
            </section>

            {/* Bowler Card */}
            <section className="card">
              <div className="sx">
                <table className="t">
                  <thead>
                    <tr>
                      <th>BOWLER</th>
                      <th className="r">O</th>
                      <th className="r">M</th>
                      <th className="r">R</th>
                      <th className="r">W</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <b className="ok flex items-center gap-1.5 truncate">
                          <Target className="w-3.5 h-3.5 shrink-0 text-[var(--ok)]" />
                          <span className="truncate">{matchState.currentBowler || 'Select Bowler'}</span>
                        </b>
                        <small>Active bowler</small>
                      </td>
                      <td className="r mono">{bowlerStat.overs}</td>
                      <td className="r m">{bowlerStat.maidens}</td>
                      <td className="r"><b>{bowlerStat.runsConceded}</b></td>
                      <td className="r bad"><b>{bowlerStat.wickets}</b></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Scoring RunPad */}
            <div className="w-full">
              <RunPad
                onScoreBall={handleScoreBall}
                onOpenWicket={() => setIsWicketModalOpen(true)}
                onOpenOverthrow={() => setIsOverthrowModalOpen(true)}
                onSwapBatter={onSwapBatter}
                onUndo={handleUndo}
                isFreeHit={matchState.isFreeHit}
                disabled={Boolean(isFirstInningsEnded || matchState.needsBowlerChange || matchState.needsNewBatter || matchState.status === 'completed')}
                cooldownSeconds={cooldownSeconds}
                onSkipCooldown={() => setCooldownSeconds(0)}
              />

              {/* Desktop Quick Shortcuts Hint Bar */}
              <div className="hidden lg:flex items-center justify-center gap-4 text-[11px] text-[var(--t3)] font-mono pt-2.5 pb-1 select-none">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--well)] border border-[var(--bd)] text-[var(--t1)] font-bold text-[10px]">0-6</kbd>
                  <span>Score</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--well)] border border-[var(--bd)] text-[var(--bad)] font-bold text-[10px]">W</kbd>
                  <span>Wicket</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--well)] border border-[var(--bd)] text-[var(--t1)] font-bold text-[10px]">U</kbd>
                  <span>Undo</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--well)] border border-[var(--bd)] text-[var(--pri)] font-bold text-[10px]">Space / S</kbd>
                  <span>Swap</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Column on Desktop: Current Over Deliveries & MatchCharts */}
          <div className="flex flex-col gap-3.5 w-full min-w-0 lg:col-span-5">
            {/* Ball Strip: Current Over's Deliveries */}
            <section className="card">
              <div className="row bt">
                <span className="lbl font-bold">
                  OVER {currentOverData.overNumber} ({currentOverData.legalCount}/6 balls • {currentOverData.runs} run{currentOverData.runs === 1 ? '' : 's'}{currentOverData.wickets > 0 ? ` • ${currentOverData.wickets} wkt${currentOverData.wickets > 1 ? 's' : ''}` : ''}):
                </span>
                <span className="pill">{currentOverBalls.length} ball{currentOverBalls.length === 1 ? '' : 's'}</span>
              </div>

              <div className="row wrap" style={{ margin: '12px 0', gap: '6px' }}>
                {currentOverBalls.length === 0 ? (
                  <span className="mu text-xs py-1">No balls bowled in this over yet</span>
                ) : (
                  currentOverBalls.map((b, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedBallForEdit(b);
                        setIsEditBallModalOpen(true);
                      }}
                      title={`Click to edit ball ${b.shortLabel || b.runs}`}
                      style={{
                        backgroundColor: b.isWicket
                          ? '#DC2626'
                          : b.runs === 6
                          ? 'var(--purple)'
                          : b.runs === 4
                          ? 'var(--blue)'
                          : b.extraType
                          ? 'var(--orange)'
                          : b.runs > 0
                          ? 'var(--ball-run-bg)'
                          : 'var(--well)',
                        color: b.isWicket
                          ? '#FFFFFF'
                          : b.runs === 0 && !b.extraType
                          ? 'var(--t2)'
                          : b.runs > 0 && !b.extraType
                          ? 'var(--ball-run-text)'
                          : '#FFFFFF',
                        borderColor: b.isWicket
                          ? '#EF4444'
                          : b.runs > 0 && !b.extraType
                          ? 'var(--bda)'
                          : 'var(--bd)'
                      }}
                      className="bl cursor-pointer hover:scale-110 active:scale-90 transition-transform font-black"
                    >
                      {b.shortLabel}
                    </button>
                  ))
                )}
              </div>

              {currentInnings.legalBalls >= 6 && matchState.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => setIsAddPrevOverBallOpen(true)}
                  className="btn s"
                  style={{ marginTop: '8px' }}
                  title="Add missed ball to previous over"
                >
                  + Prev over ball
                </button>
              )}
            </section>

            {/* Desktop Live Charts */}
            <div className="hidden lg:block w-full">
              <MatchCharts matchState={matchState} />
            </div>
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
          <PlayersHeadToHead matchState={matchState} onEditPlayer={onEditPlayer} />
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

      {/* Modals */}
      {/* 1. Batter Career & Detailed Breakdown Modal */}
      {selectedBatterDetails && (
        <BatterDetailsModal
          batterName={selectedBatterDetails}
          innings={currentInnings}
          onClose={() => setSelectedBatterDetails(null)}
        />
      )}

      {/* 2. Time Declare / Retire Batter Modal */}
      <TimeDeclareModal
        isOpen={isTimeDeclareOpen}
        onClose={() => setIsTimeDeclareOpen(false)}
        matchState={matchState}
        onConfirmRetire={(batter, reason, nextBatter) => {
          onRetireBatter?.(batter, reason, nextBatter);
        }}
      />

      {/* 3. Squad & Edit Players Modal */}
      <SquadModal
        isOpen={isSquadModalOpen}
        onClose={() => setIsSquadModalOpen(false)}
        matchState={matchState}
        isManager={true}
        onEditPlayer={(oldName, newName) => {
          onEditPlayer?.(oldName, newName);
        }}
        onSelectBatterDetails={(playerName) => {
          setIsSquadModalOpen(false);
          setSelectedBatterDetails(playerName);
        }}
      />

      {/* 4. Wicket Modal */}
      {isWicketModalOpen && (
        <WicketModal
          isOpen={isWicketModalOpen}
          onClose={() => setIsWicketModalOpen(false)}
          striker={matchState.striker}
          nonStriker={matchState.nonStriker}
          bowler={matchState.currentBowler}
          bowlingTeamPlayers={bowlingSquad}
          availableBatters={availableBatters}
          isFreeHit={matchState.isFreeHit}
          onConfirmWicket={(wicketData) => {
            handleScoreBall({
              runs: wicketData.runs || wicketData.runsOffBat || 0,
              extraType: wicketData.extraType || null,
              extraRuns: wicketData.extraRuns || 0,
              isWicket: true,
              wicket: wicketData.wicket,
              wicketType: wicketData.wicket?.type || wicketData.wicketType,
              dismissedPlayer: wicketData.wicket?.playerOut || wicketData.dismissedPlayer || wicketData.dismissedBatter,
              fielder: wicketData.wicket?.fielder || wicketData.fielder || null,
              nextBatter: wicketData.nextBatter || wicketData.newBatter || null
            });
            setIsWicketModalOpen(false);
          }}
        />
      )}

      {/* 5. Bowler Modal (Over end - never shown if innings/match completed) */}
      {matchState.needsBowlerChange && matchState.status !== 'completed' && !currentInnings.isCompleted && (
        <BowlerModal
          isOpen={matchState.needsBowlerChange}
          bowlingTeam={currentInnings.bowlingTeam}
          bowlers={bowlingSquad}
          bowlersSquad={bowlingSquad}
          previousBowler={matchState.previousBowler || matchState.currentBowler}
          onSelectBowler={onChangeBowler}
        />
      )}

      {/* 6. New Batter Modal (Fall of Wicket) */}
      {matchState.needsNewBatter && (
        <NewBatterModal
          isOpen={matchState.needsNewBatter}
          battingTeam={currentInnings.battingTeam}
          availableBatters={availableBatters}
          onUndoWicket={handleUndo}
          onSelectBatter={(batterName) => {
            if (isAbdullahMessagesEnabled()) {
              if (isAbdullah(batterName)) {
                setAbdullahEvent({ type: 'comes_to_bat', playerName: 'Abdullah' });
              } else if (isHassan(batterName)) {
                setAbdullahEvent({ type: 'comes_to_bat', playerName: 'Hassan' });
              }
            }
            onAddNewBatter(batterName);
          }}
        />
      )}

      {/* 7. Innings Break Modal */}
      {(isBreakModalOpen || isManualBreakOpen) && (() => {
        const inn1 = matchState.innings?.[0];
        const chasingTeamName = inn1?.bowlingTeam || matchState.teams?.[1]?.name || 'Chasing Team';
        const defendingTeamName = inn1?.battingTeam || matchState.teams?.[0]?.name || 'Defending Team';
        const chasingTeamObj = matchState.teams?.find(t => t.name === chasingTeamName) || matchState.teams?.[1];
        const defendingTeamObj = matchState.teams?.find(t => t.name === defendingTeamName) || matchState.teams?.[0];

        return (
          <InningsBreakModal
            isOpen={isBreakModalOpen || isManualBreakOpen}
            firstInnings={inn1}
            innings1={inn1}
            battingTeam={chasingTeamName}
            bowlingTeam={defendingTeamName}
            target={matchState.target || (inn1?.score || 0) + 1}
            battingTeamSquad={chasingTeamObj?.players || []}
            bowlingTeamSquad={defendingTeamObj?.players || []}
            onClose={() => {
              setIsBreakModalOpen(false);
              setIsManualBreakOpen(false);
            }}
            onStartSecondInnings={(payload) => {
              if (isAbdullahMessagesEnabled()) {
                if (isAbdullah(payload?.striker) || isAbdullah(payload?.nonStriker)) {
                  setAbdullahEvent({ type: 'comes_to_bat', playerName: 'Abdullah' });
                } else if (isHassan(payload?.striker) || isHassan(payload?.nonStriker)) {
                  setAbdullahEvent({ type: 'comes_to_bat', playerName: 'Hassan' });
                }
              }
              onEndInnings?.(payload);
              setIsBreakModalOpen(false);
              setIsManualBreakOpen(false);
            }}
          />
        );
      })()}

      {/* 8. Celebration & Party Poppers Victory Modal */}
      <CelebrationModal
        matchState={matchState}
        onOpenScorecard={onOpenScorecard}
        onOpenSummary={onOpenSummary}
      />

      {/* 9. Add Ball to Previous Over Modal */}
      {isAddPrevOverBallOpen && (
        <AddPreviousOverBallModal
          isOpen={isAddPrevOverBallOpen}
          onClose={() => setIsAddPrevOverBallOpen(false)}
          previousBowler={matchState.previousBowler}
          striker={matchState.striker}
          nonStriker={matchState.nonStriker}
          onAddBall={(payload) => {
            onAddBallToPreviousOver?.(payload);
          }}
          onReopenOver={() => {
            onReopenPreviousOver?.();
          }}
        />
      )}

      {/* 10. Official Pointing System Criteria Modal */}
      <PointingCriteriaModal
        isOpen={isPointingCriteriaOpen}
        onClose={() => setIsPointingCriteriaOpen(false)}
      />

      {/* 11. Action Audit Logs Modal (User pressed 6 then undid that with timestamps) */}
      <ActionLogsModal
        isOpen={isActionLogsOpen}
        onClose={() => setIsActionLogsOpen(false)}
        matchId={matchState.matchId}
      />

      {/* 12. 2-Second Scoring & Extras Animation Modal */}
      <ScoreAnimation animationData={scoreAnimationData} />

      {/* 13. Special Unskippable 4-Second Motivational Brother Message for Abdullah */}
      {abdullahEvent && (
        <AbdullahMotivationModal
          eventData={abdullahEvent}
          onClose={() => setAbdullahEvent(null)}
        />
      )}

      {/* 14. Real-time Developer to Scorer Chat Modal */}
      {isChatModalOpen && (
        <DeveloperScorerChatModal
          isOpen={isChatModalOpen}
          onClose={() => {
            setIsChatModalOpen(false);
            setUnreadChatCount(0);
          }}
          matchId={effectiveMatchId}
          matchTitle={`${matchState.teams?.[0]?.name || 'Team 1'} vs ${matchState.teams?.[1]?.name || 'Team 2'} (${matchState.code || ''})`}
          role="scorer"
          senderName="Match Scorer"
        />
      )}

      {/* 15. Overthrow Modal */}
      {isOverthrowModalOpen && (
        <OverthrowModal
          isOpen={isOverthrowModalOpen}
          onClose={() => setIsOverthrowModalOpen(false)}
          onScoreBall={handleScoreBall}
          striker={matchState.striker}
          nonStriker={matchState.nonStriker}
          currentBowler={matchState.currentBowler}
        />
      )}

      {/* 16. Edit Ball Score Modal */}
      {isEditBallModalOpen && (
        <EditBallModal
          isOpen={isEditBallModalOpen}
          onClose={() => {
            setIsEditBallModalOpen(false);
            setSelectedBallForEdit(null);
          }}
          initialBall={selectedBallForEdit}
          allBalls={currentInnings?.balls || []}
          onSaveBall={(ballId, updatedPayload) => {
            if (onEditBall) {
              onEditBall(ballId, updatedPayload);
            }
          }}
          strikerSquad={battingSquad}
          bowlingSquad={bowlingSquad}
        />
      )}

      {/* 17. Premium More Popup Interface */}
      <MoreMenuModal
        isOpen={isMorePopupOpen}
        onClose={() => setIsMorePopupOpen(false)}
        onOpenSummary={() => {
          setActiveTab('summary');
          if (onOpenSummary) onOpenSummary(matchState);
        }}
        onOpenSquad={() => setIsSquadModalOpen(true)}
        onOpenTimeDeclare={() => setIsTimeDeclareOpen(true)}
        onOpenDeclareInnings={() => setIsBreakModalOpen(true)}
        onOpenBallEditor={() => {
          const allBallsList = currentInnings?.balls || [];
          setSelectedBallForEdit(allBallsList.length > 0 ? allBallsList[allBallsList.length - 1] : null);
          setIsEditBallModalOpen(true);
        }}
        onOpenActionLogs={() => setIsActionLogsOpen(true)}
        onOpenPointingCriteria={() => setIsPointingCriteriaOpen(true)}
        isFirstInningsEnded={isFirstInningsEnded}
        isViewer={false}
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
