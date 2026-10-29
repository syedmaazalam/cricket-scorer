import React, { useState } from 'react';
import { ArrowLeft, Share2, FileText, Check, Trophy, ShieldAlert } from 'lucide-react';
import SyncBadge from '../components/SyncBadge.jsx';
import RunPad from '../components/RunPad.jsx';
import WicketModal from '../components/WicketModal.jsx';
import BowlerModal from '../components/BowlerModal.jsx';
import NewBatterModal from '../components/NewBatterModal.jsx';
import InningsBreakModal from '../components/InningsBreakModal.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { computeInningsStats } from '../engine/stats.js';
import { formatOvers, calculateCRR, calculateRRR, getMaxWickets } from '../engine/rules.js';

export default function Scoring({
  matchState,
  syncStatus,
  scorerOfflineInfo,
  onRecordBall,
  onSwapBatter,
  onChangeBowler,
  onAddNewBatter,
  onEndInnings,
  onUndo,
  onNavigate,
  onOpenScorecard
}) {
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const curInnIndex = matchState.currentInningsIndex || 0;
  const currentInnings = matchState.innings?.[curInnIndex] || {
    score: 0,
    wickets: 0,
    legalBalls: 0,
    balls: [],
    battingTeam: '',
    bowlingTeam: ''
  };

  const maxWickets = getMaxWickets(matchState.playersPerTeam);
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
  const currentBattingTeamObj = matchState.teams?.find(t => t.name === currentInnings.battingTeam);
  const currentBowlingTeamObj = matchState.teams?.find(t => t.name === currentInnings.bowlingTeam);

  const battingSquad = currentBattingTeamObj?.players || [];
  const bowlingSquad = currentBowlingTeamObj?.players || [];

  // Available bench batters
  const dismissedBatters = innStats.fow.map(f => f.playerOut);
  const activeBatters = [matchState.striker, matchState.nonStriker].filter(Boolean);
  const availableBatters = battingSquad.filter(p => !dismissedBatters.includes(p) && !activeBatters.includes(p));

  // Run rates
  const crr = calculateCRR(currentInnings.score, currentInnings.legalBalls);
  const rrr = matchState.target ? calculateRRR(matchState.target, currentInnings.score, currentInnings.legalBalls, matchState.overs) : null;

  // Balls remaining in 2nd innings
  const totalBallsAllowed = matchState.overs * 6;
  const ballsRemaining = Math.max(0, totalBallsAllowed - currentInnings.legalBalls);
  const runsNeeded = matchState.target ? Math.max(0, matchState.target - currentInnings.score) : null;

  // Recent 8 balls
  const recentBalls = (currentInnings.balls || []).slice(-8);

  // Direct share link
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

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-900 flex flex-col justify-between max-w-lg mx-auto select-none transition-colors">
      {/* 1. Header Bar */}
      <div className="p-3 bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border-b border-slate-800 dark:border-slate-800 light:border-slate-200 flex items-center justify-between gap-2">
        <button
          onClick={() => onNavigate('home')}
          className="p-2 rounded-xl bg-slate-800 dark:bg-slate-800 light:bg-slate-100 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Match Code & Direct Link Pill */}
        <button
          onClick={handleShareLink}
          title="Click to copy live shareable link"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-100 border border-slate-700 dark:border-slate-700 light:border-slate-300 text-xs font-mono font-bold text-amber-400 hover:bg-slate-800"
        >
          <span>{matchState.code || 'MATCH'}</span>
          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {/* Sync Status Badge */}
        <SyncBadge syncStatus={syncStatus} scorerOfflineInfo={scorerOfflineInfo} />

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {/* Scorecard Button */}
          <button
            onClick={onOpenScorecard}
            className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold flex items-center gap-1"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Scorecard</span>
          </button>
        </div>
      </div>

      {/* 2. Main Match Score Display */}
      <div className="p-4 flex flex-col gap-3">
        {/* Match Result Banner if finished */}
        {matchState.status === 'completed' && (
          <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border border-amber-500/40 rounded-2xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-extrabold text-sm uppercase">
              <Trophy className="w-4 h-4" />
              <span>Match Finished</span>
            </div>
            <div className="text-base font-black text-white dark:text-white light:text-slate-900 mt-0.5">{matchState.resultSummary}</div>
          </div>
        )}

        {/* Primary Score Board */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-920 dark:from-slate-900 dark:to-slate-920 light:from-white light:to-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-3xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider pb-1">
            <span>{currentInnings.battingTeam} · Innings {curInnIndex + 1}</span>
            <span className="text-slate-500">Max Wickets: {maxWickets}</span>
          </div>

          <div className="flex items-baseline justify-between py-1">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white dark:text-white light:text-slate-900 tracking-tight">
                {currentInnings.score}
              </span>
              <span className="text-3xl font-extrabold text-rose-500">
                / {currentInnings.wickets}
              </span>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-amber-400 font-mono">
                {formatOvers(currentInnings.legalBalls)} <span className="text-sm text-slate-400 font-normal">/ {matchState.overs} ov</span>
              </div>
            </div>
          </div>

          {/* CRR & RRR / Target info */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 text-xs font-semibold">
            <div className="text-slate-400">
              CRR: <strong className="text-white dark:text-white light:text-slate-900">{crr}</strong>
            </div>

            {matchState.target ? (
              <div className="text-amber-400 font-bold">
                Need {runsNeeded} runs from {ballsRemaining} balls (RRR {rrr})
              </div>
            ) : (
              <div className="text-slate-400">
                Projected: <strong className="text-white dark:text-white light:text-slate-900">{Math.round(crr * matchState.overs)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* 3. Batters Card */}
        <div className="bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-3 flex flex-col gap-2 shadow-sm">
          <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
            <span className="col-span-6">Batter</span>
            <span className="col-span-2 text-right">R</span>
            <span className="col-span-2 text-right">B</span>
            <span className="col-span-1 text-right">4s</span>
            <span className="col-span-1 text-right">6s</span>
          </div>

          {/* Striker */}
          <div className="grid grid-cols-12 items-center text-xs py-1 px-2 rounded-xl bg-emerald-950/40 dark:bg-emerald-950/40 light:bg-emerald-50 border border-emerald-500/30">
            <div className="col-span-6 font-bold text-emerald-400 dark:text-emerald-300 light:text-emerald-700 flex items-center gap-1.5 truncate">
              <span>🏏</span>
              <span className="truncate">{matchState.striker || 'Select Striker'}</span>
              <span className="text-[9px] font-bold bg-emerald-500/20 px-1 py-0.2 rounded">*</span>
            </div>
            <span className="col-span-2 text-right font-black text-white dark:text-white light:text-slate-900">{strikerStat.runs}</span>
            <span className="col-span-2 text-right text-slate-400">{strikerStat.balls}</span>
            <span className="col-span-1 text-right text-slate-400">{strikerStat.fours}</span>
            <span className="col-span-1 text-right text-slate-400">{strikerStat.sixes}</span>
          </div>

          {/* Non-Striker */}
          <div className="grid grid-cols-12 items-center text-xs py-1 px-2 rounded-xl bg-slate-800/40 dark:bg-slate-800/40 light:bg-slate-100">
            <div className="col-span-6 font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800 truncate">
              <span className="truncate">{matchState.nonStriker || 'Select Non-Striker'}</span>
            </div>
            <span className="col-span-2 text-right font-bold text-white dark:text-white light:text-slate-900">{nonStrikerStat.runs}</span>
            <span className="col-span-2 text-right text-slate-400">{nonStrikerStat.balls}</span>
            <span className="col-span-1 text-right text-slate-400">{nonStrikerStat.fours}</span>
            <span className="col-span-1 text-right text-slate-400">{nonStrikerStat.sixes}</span>
          </div>

          {/* Current Partnership */}
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
            <span>Partnership: <strong className="text-white dark:text-white light:text-slate-900">{innStats.partnership.runs}</strong> runs ({innStats.partnership.balls}b)</span>
            <span>Extras: <strong className="text-white dark:text-white light:text-slate-900">{innStats.extras.total}</strong></span>
          </div>
        </div>

        {/* 4. Current Bowler Card */}
        <div className="bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-2xl p-3 flex flex-col gap-1.5 shadow-sm">
          <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800 dark:border-slate-800 light:border-slate-200">
            <span className="col-span-5">Bowler</span>
            <span className="col-span-2 text-right">O</span>
            <span className="col-span-1 text-right">M</span>
            <span className="col-span-2 text-right">R</span>
            <span className="col-span-2 text-right">W</span>
          </div>

          <div className="grid grid-cols-12 items-center text-xs py-0.5">
            <div className="col-span-5 font-bold text-cyan-400 dark:text-cyan-300 light:text-cyan-700 truncate">
              {matchState.currentBowler || 'Select Bowler'}
            </div>
            <span className="col-span-2 text-right font-mono text-white dark:text-white light:text-slate-900">{bowlerStat.overs}</span>
            <span className="col-span-1 text-right text-slate-400">{bowlerStat.maidens}</span>
            <span className="col-span-2 text-right text-slate-300 dark:text-slate-300 light:text-slate-700">{bowlerStat.runsConceded}</span>
            <span className="col-span-2 text-right font-black text-rose-500">{bowlerStat.wickets}</span>
          </div>
        </div>

        {/* 5. Recent Deliveries Strip */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">Recent:</span>
          {recentBalls.length === 0 ? (
            <span className="text-xs text-slate-500">No balls yet in this innings</span>
          ) : (
            recentBalls.map((b, i) => {
              const isW = b.isWicket;
              const is4 = b.runs === 4 && !b.extraType;
              const is6 = b.runs === 6 && !b.extraType;
              const isEx = Boolean(b.extraType);
              return (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    isW
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-900'
                      : is6
                      ? 'bg-purple-600 text-white'
                      : is4
                      ? 'bg-blue-600 text-white'
                      : isEx
                      ? 'bg-amber-600 text-white'
                      : b.runs === 0
                      ? 'bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-slate-400 border border-slate-700 dark:border-slate-700 light:border-slate-300'
                      : 'bg-slate-700 dark:bg-slate-700 light:bg-slate-300 text-white dark:text-white light:text-slate-900'
                  }`}
                >
                  {b.shortLabel}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Run Pad (Manager Touch Controls) */}
      <RunPad
        onScoreBall={onRecordBall}
        onOpenWicket={() => setIsWicketModalOpen(true)}
        onSwapBatter={onSwapBatter}
        onUndo={onUndo}
        isFreeHit={matchState.isFreeHit}
        disabled={matchState.status === 'completed' || matchState.status === 'innings_break'}
      />

      {/* Modals */}
      <WicketModal
        isOpen={isWicketModalOpen}
        onClose={() => setIsWicketModalOpen(false)}
        striker={matchState.striker}
        nonStriker={matchState.nonStriker}
        bowler={matchState.currentBowler}
        bowlingTeamPlayers={bowlingSquad}
        availableBatters={availableBatters}
        isFreeHit={matchState.isFreeHit}
        onConfirmWicket={(payload) => {
          onRecordBall(payload);
          setIsWicketModalOpen(false);
        }}
      />

      <BowlerModal
        isOpen={Boolean(matchState.needsBowlerChange && matchState.status === 'in_progress')}
        bowlers={bowlingSquad}
        previousBowler={matchState.previousBowler}
        onSelectBowler={onChangeBowler}
      />

      <NewBatterModal
        isOpen={Boolean(matchState.needsNewBatter && matchState.status === 'in_progress')}
        vacantSlot={matchState.vacantBatterSlot}
        availableBatters={availableBatters}
        onSelectBatter={onAddNewBatter}
      />

      <InningsBreakModal
        isOpen={matchState.status === 'innings_break'}
        firstInnings={matchState.innings?.[0]}
        battingTeam={matchState.teams?.[1]?.name}
        bowlingTeam={matchState.teams?.[0]?.name}
        target={matchState.target}
        battingTeamSquad={matchState.teams?.[1]?.players || []}
        bowlingTeamSquad={matchState.teams?.[0]?.players || []}
        onStartSecondInnings={onEndInnings}
      />
    </div>
  );
}
