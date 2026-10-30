import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
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
  Sun
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
import { computeInningsStats, getScoreAtLegalBalls } from '../engine/stats.js';
import { formatOvers, calculateCRR, calculateRRR, getMaxWickets } from '../engine/rules.js';

export default function Scoring({
  matchState,
  syncStatus,
  onRecordBall,
  onSwapBatter,
  onChangeBowler,
  onAddNewBatter,
  onRetireBatter,
  onEditPlayer,
  onEndInnings,
  onUndo,
  onNavigate,
  onOpenScorecard,
  onOpenSummary
}) {
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [isTimeDeclareOpen, setIsTimeDeclareOpen] = useState(false);
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [selectedBatterDetails, setSelectedBatterDetails] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isManualBreakOpen, setIsManualBreakOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Enforce dark theme on the manager end as required
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('cricket_theme', 'dark');
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

  // Filter current over balls only (including legal, wides, and no-balls)
  const currentOverBalls = (() => {
    const balls = currentInnings.balls || [];
    if (balls.length === 0) return [];

    let targetLegalThreshold;
    if (matchState.needsBowlerChange && currentInnings.legalBalls > 0 && currentInnings.legalBalls % 6 === 0) {
      targetLegalThreshold = currentInnings.legalBalls - 6;
    } else {
      targetLegalThreshold = Math.floor(currentInnings.legalBalls / 6) * 6;
    }

    let legalCount = 0;
    const overBalls = [];

    for (const b of balls) {
      if (legalCount >= targetLegalThreshold) {
        overBalls.push(b);
      }
      if (b.isLegal) {
        legalCount++;
      }
    }
    return overBalls;
  })();

  const shareUrl = `${window.location.origin}/?watch=${matchState.code || ''}`;

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

  const handleScoreBall = (ballData) => {
    onRecordBall(ballData);
  };

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col justify-between max-w-6xl mx-auto w-full box-border min-w-0 overflow-x-hidden p-2 sm:p-4 select-none"
    >
      {/* 1. Header Bar: Compact, responsive, no horizontal clipping */}
      <div
        style={{ borderColor: 'var(--border)' }}
        className="p-2 sm:p-3 border-b flex items-center justify-between gap-1.5 sm:gap-2 w-full min-w-0 shrink-0"
      >
        {/* Left: Back button & Match Code */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => onNavigate('home')}
            title="Back to Home"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="p-2 rounded-xl border transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleShareLink}
            title="Click to copy live shareable link"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--orange)'
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold shadow-sm"
          >
            <span>{matchState.code || 'MATCH'}</span>
            {copiedCode ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} /> : <Share2 className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />}
          </button>
        </div>

        {/* Center: Live indicator & Sync badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            style={{
              backgroundColor: 'var(--green-15)',
              borderColor: 'var(--green-30)',
              color: 'var(--green)'
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
          >
            <span style={{ backgroundColor: 'var(--green)' }} className="w-2 h-2 rounded-full animate-ping" />
            <Radio className="w-3 h-3" />
            <span className="hidden xs:inline">Live</span>
          </div>

          <SyncBadge syncStatus={syncStatus} />
        </div>

        {/* Right: Scorecard button & More Menu Toggle */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          <button
            onClick={onOpenScorecard}
            style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
            className="px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scorecard</span>
          </button>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="p-2 rounded-xl border shadow-sm active:scale-95 transition-all"
            title="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* More Dropdown Menu */}
          {isMenuOpen && (
            <div
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              className="absolute right-0 top-11 z-50 w-52 rounded-2xl border shadow-2xl p-1.5 flex flex-col gap-1 text-xs font-bold animate-in fade-in zoom-in-95 duration-150"
            >
              {onOpenSummary && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSummary(matchState);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--card-alt)] transition-colors text-left"
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
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--card-alt)] transition-colors text-left"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Squad & Edit Players</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsTimeDeclareOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--card-alt)] transition-colors text-left"
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
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[var(--card-alt)] transition-colors text-left text-orange-400"
                >
                  <Flag className="w-4 h-4" />
                  <span>Declare 1st Innings</span>
                </button>
              )}

              <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />

              <div className="px-3 py-1 flex items-center justify-between text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
                <span>Theme Mode</span>
                <ThemeToggle />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Responsive Grid: 2 columns on Desktop (lg:), 1 column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 py-2 flex-1 items-start w-full min-w-0">
        {/* LEFT COLUMN: Main Scorecard, Batters, Bowler, Current Over Strip */}
        <div className="flex flex-col gap-2.5 w-full min-w-0">
          {/* Main Score Card */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-3 sm:p-4 flex flex-col gap-2 w-full box-border"
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span style={{ color: 'var(--text)' }} className="truncate">
                {currentInnings.battingTeam || 'Batting Team'} · INN {curInnIndex + 1}
              </span>
              <span style={{ color: 'var(--primary)' }} className="font-extrabold truncate">
                vs {currentInnings.bowlingTeam || 'Bowling Team'}
              </span>
            </div>

            {/* Score row */}
            <div className="flex items-baseline justify-between py-0.5">
              <div className="flex items-baseline gap-1.5">
                <span style={{ color: 'var(--text)' }} className="text-4xl sm:text-5xl font-black tracking-tight">
                  {currentInnings.score}
                </span>
                <span style={{ color: 'var(--red)' }} className="text-2xl sm:text-3xl font-extrabold">
                  /{currentInnings.wickets}
                </span>
              </div>
              <div className="text-right">
                <div style={{ color: 'var(--orange)' }} className="text-xl sm:text-2xl font-black font-mono">
                  {formatOvers(currentInnings.legalBalls)}{' '}
                  <span style={{ color: 'var(--muted)' }} className="text-xs sm:text-sm font-normal">
                    / {matchState.overs} ov
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar & Wickets Left Pill */}
            <div className="flex items-center gap-2.5 pt-0.5">
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
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0"
              >
                Wickets left: <strong style={{ color: 'var(--text)' }}>{wicketsLeft}</strong>
              </span>
            </div>

            {/* CRR & Projected / Target Pill Badges */}
            <div className="flex items-center gap-2 pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
              <div
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="flex-1 py-1 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <span style={{ color: 'var(--green)' }}>📈</span>
                <span style={{ color: 'var(--muted)' }}>CRR</span>
                <strong style={{ color: 'var(--green)' }}>{crr}</strong>
              </div>

              {matchState.target ? (
                <div
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="flex-1 py-1 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <span style={{ color: 'var(--orange)' }}>🎯</span>
                  <span style={{ color: 'var(--muted)' }}>Need</span>
                  <strong style={{ color: 'var(--red)' }}>{runsNeeded}</strong>
                  <span style={{ color: 'var(--muted)' }} className="text-[10px]">({rrr} RRR)</span>
                </div>
              ) : (
                /* Hide Projected until at least 2 overs (12 legal balls) are bowled per spec */
                currentInnings.legalBalls >= 12 && (
                  <div
                    style={{
                      backgroundColor: 'var(--card-alt)',
                      borderColor: 'var(--border)',
                      color: 'var(--text)'
                    }}
                    className="flex-1 py-1 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <span style={{ color: 'var(--blue)' }}>🎯</span>
                    <span style={{ color: 'var(--muted)' }}>Projected</span>
                    <strong style={{ color: 'var(--blue)' }}>{Math.round(crr * matchState.overs)}</strong>
                  </div>
                )
              )}
            </div>

            {/* Previous Team Batting Score */}
            {prevInnings && (
              <div
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="py-1 px-2.5 rounded-xl border text-[11px] flex items-center justify-between font-semibold mt-0.5"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span style={{ color: 'var(--muted)' }}>1st Inn: {prevInnings.battingTeam}</span>
                  <span style={{ color: 'var(--blue)' }} className="font-bold">
                    {prevInnings.score}/{prevInnings.wickets} ({formatOvers(prevInnings.legalBalls)} ov)
                  </span>
                </div>
                {currentInnings.legalBalls > 0 && (
                  <div className="text-right text-[10px] shrink-0 font-medium" style={{ color: 'var(--muted)' }}>
                    At {formatOvers(currentInnings.legalBalls)} ov:{' '}
                    <strong style={{ color: 'var(--orange)' }}>
                      {getScoreAtLegalBalls(prevInnings, currentInnings.legalBalls).score}/{getScoreAtLegalBalls(prevInnings, currentInnings.legalBalls).wickets}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Batters Card */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-2.5 sm:p-3 flex flex-col gap-1.5 w-full box-border"
          >
            <div
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider pb-1 border-b"
            >
              <span className="col-span-6">BATTER</span>
              <span className="col-span-2 text-right">R</span>
              <span className="col-span-1 text-right">B</span>
              <span className="col-span-1 text-right">4s</span>
              <span className="col-span-1 text-right">6s</span>
              <span className="col-span-1 text-right">SR</span>
            </div>

            {/* Striker Row */}
            <div
              onClick={() => setSelectedBatterDetails(matchState.striker)}
              title="Click for complete breakdown"
              style={{
                backgroundColor: 'var(--green-15)',
                borderColor: 'var(--green-30)'
              }}
              className="grid grid-cols-12 items-center text-xs py-1.5 px-2 rounded-xl border cursor-pointer hover:brightness-105 active:scale-99 transition-all shadow-sm"
            >
              <div style={{ color: 'var(--green)' }} className="col-span-6 font-bold truncate flex items-center gap-1.5">
                <span className="text-sm">🏏</span>
                <div className="truncate">
                  <div className="font-extrabold truncate">{matchState.striker || 'Select Striker'}</div>
                  <div className="text-[8px] font-normal opacity-80">(Striker) • Tap for stats</div>
                </div>
              </div>
              <span style={{ color: 'var(--text)' }} className="col-span-2 text-right font-black text-sm">
                {strikerStat.runs}
              </span>
              <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">
                {strikerStat.balls}
              </span>
              <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">
                {strikerStat.fours}
              </span>
              <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">
                {strikerStat.sixes}
              </span>
              <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right font-mono">
                {strikerStat.strikeRate}
              </span>
            </div>

            {/* Non-Striker Row */}
            <div
              onClick={() => setSelectedBatterDetails(matchState.nonStriker)}
              title="Click for complete breakdown"
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)'
              }}
              className="grid grid-cols-12 items-center text-xs py-1.5 px-2 rounded-xl border cursor-pointer hover:border-[var(--primary)] active:scale-99 transition-all shadow-sm"
            >
              <div className="col-span-6 font-semibold truncate flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                <span className="text-sm">⛑️</span>
                <div className="truncate">
                  <div className="font-bold truncate">{matchState.nonStriker || 'Select Non-Striker'}</div>
                  <div className="text-[8px] font-normal" style={{ color: 'var(--muted)' }}>(Non-Striker) • Tap for stats</div>
                </div>
              </div>
              <span style={{ color: 'var(--text)' }} className="col-span-2 text-right font-black text-sm">
                {nonStrikerStat.runs}
              </span>
              <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">
                {nonStrikerStat.balls}
              </span>
              <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">
                {nonStrikerStat.fours}
              </span>
              <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">
                {nonStrikerStat.sixes}
              </span>
              <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right font-mono">
                {nonStrikerStat.strikeRate}
              </span>
            </div>

            {/* Partnership & Extras Bottom Strip */}
            <div
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--card-alt)',
                color: 'var(--muted)'
              }}
              className="flex items-center justify-between text-[11px] py-1 px-2.5 rounded-xl border font-medium mt-0.5"
            >
              <span>
                👥 Partnership:{' '}
                <strong style={{ color: 'var(--text)' }}>
                  {innStats.partnership?.runs || 0} ({innStats.partnership?.balls || 0})
                </strong>
              </span>
              <span>
                Extras:{' '}
                <strong style={{ color: 'var(--text)' }}>
                  {innStats.extras.total} (b {innStats.extras.byes}, lb {innStats.extras.legByes}, wd {innStats.extras.wides}, nb {innStats.extras.noBalls})
                </strong>
              </span>
            </div>
          </div>

          {/* Bowler Card */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-2.5 sm:p-3 flex flex-col gap-1 w-full box-border"
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

            <div className="grid grid-cols-12 items-center text-xs py-1">
              <div className="col-span-5 truncate flex items-center gap-1.5">
                <span className="text-sm">🎯</span>
                <div className="truncate">
                  <div style={{ color: 'var(--blue)' }} className="font-bold truncate">
                    {matchState.currentBowler || 'Select Bowler'}
                  </div>
                  <div className="text-[8px]" style={{ color: 'var(--muted)' }}>Active Bowler</div>
                </div>
              </div>
              <span style={{ color: 'var(--text)' }} className="col-span-2 text-right font-mono font-bold">
                {bowlerStat.overs}
              </span>
              <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">
                {bowlerStat.maidens}
              </span>
              <span style={{ color: 'var(--text)' }} className="col-span-2 text-right font-bold">
                {bowlerStat.runsConceded}
              </span>
              <span style={{ color: 'var(--red)' }} className="col-span-2 text-right font-black text-sm">
                {bowlerStat.wickets}
              </span>
            </div>
          </div>

          {/* Ball Strip: ONLY Current Over's Deliveries, Wrapped Horizontally, Never Clipped */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-2 sm:p-2.5 flex flex-col gap-1.5 w-full box-border"
          >
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              <span>CURRENT OVER ({formatOvers(currentInnings.legalBalls)} OV):</span>
              <span>{currentOverBalls.length} ball{currentOverBalls.length === 1 ? '' : 's'}</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {currentOverBalls.length === 0 ? (
                <span style={{ color: 'var(--muted)' }} className="text-xs py-1">No balls bowled in this over yet</span>
              ) : (
                currentOverBalls.map((b, i) => (
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
                        : 'var(--card-alt)',
                      color: b.runs === 0 && !b.extraType && !b.isWicket ? 'var(--muted)' : '#FFFFFF',
                      borderColor: 'var(--border)'
                    }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border shadow-sm transition-transform hover:scale-105"
                  >
                    {b.shortLabel}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RunPad & Desktop Charts */}
        <div className="flex flex-col gap-2.5 w-full min-w-0">
          {/* Scoring RunPad: Sticky pinned on mobile bottom so all buttons fit on 360x640 screen */}
          <div className="sticky bottom-0 z-30 lg:static w-full">
            <RunPad
              onScoreBall={handleScoreBall}
              onOpenWicket={() => setIsWicketModalOpen(true)}
              onSwapBatter={onSwapBatter}
              onUndo={onUndo}
              isFreeHit={matchState.isFreeHit}
              disabled={Boolean(matchState.needsBowlerChange || matchState.needsNewBatter || matchState.status === 'completed')}
            />
          </div>

          {/* Desktop Over & Worm Charts */}
          <div className="hidden lg:block mt-1">
            <MatchCharts matchState={matchState} />
          </div>
        </div>
      </div>

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

      {/* 5. Bowler Modal (Over end) */}
      {matchState.needsBowlerChange && (
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
          onSelectBatter={onAddNewBatter}
        />
      )}

      {/* 7. Manual Innings Break / Declare Modal */}
      {isManualBreakOpen && (
        <InningsBreakModal
          isOpen={isManualBreakOpen}
          matchState={matchState}
          onClose={() => setIsManualBreakOpen(false)}
          onStartSecondInnings={(payload) => {
            onEndInnings?.(payload);
            setIsManualBreakOpen(false);
          }}
        />
      )}

      {/* 8. Celebration & Party Poppers Victory Modal */}
      <CelebrationModal
        matchState={matchState}
        onOpenScorecard={onOpenScorecard}
        onOpenSummary={onOpenSummary}
      />
    </div>
  );
}
