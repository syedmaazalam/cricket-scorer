import React, { useState } from 'react';
import { ArrowLeft, Share2, FileText, Check, Trophy } from 'lucide-react';
import SyncBadge from '../components/SyncBadge.jsx';
import RunPad from '../components/RunPad.jsx';
import WicketModal from '../components/WicketModal.jsx';
import BowlerModal from '../components/BowlerModal.jsx';
import NewBatterModal from '../components/NewBatterModal.jsx';
import InningsBreakModal from '../components/InningsBreakModal.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { computeInningsStats, getScoreAtLegalBalls } from '../engine/stats.js';
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

  const prevInnings = curInnIndex === 1 ? matchState.innings?.[0] : null;

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

  const dismissedBatters = innStats.fow.map(f => f.playerOut);
  const activeBatters = [matchState.striker, matchState.nonStriker].filter(Boolean);
  const availableBatters = battingSquad.filter(p => !dismissedBatters.includes(p) && !activeBatters.includes(p));

  // Run rates
  const crr = calculateCRR(currentInnings.score, currentInnings.legalBalls);
  const rrr = matchState.target ? calculateRRR(matchState.target, currentInnings.score, currentInnings.legalBalls, matchState.overs) : null;

  const totalBallsAllowed = matchState.overs * 6;
  const ballsRemaining = Math.max(0, totalBallsAllowed - currentInnings.legalBalls);
  const runsNeeded = matchState.target ? Math.max(0, matchState.target - currentInnings.score) : null;

  const recentBalls = (currentInnings.balls || []).slice(-8);

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
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col justify-between max-w-lg mx-auto select-none transition-colors"
    >
      {/* 1. Header Bar */}
      <div
        style={{ borderColor: 'var(--border)' }}
        className="p-3 border-b flex items-center justify-between gap-2"
      >
        <button
          onClick={() => onNavigate('home')}
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
          className="p-2 rounded-xl border transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Match Code Pill */}
        <button
          onClick={handleShareLink}
          title="Click to copy live shareable link"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--orange)'
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-mono font-bold"
        >
          <span>{matchState.code || 'MATCH'}</span>
          {copiedCode ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} /> : <Share2 className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />}
        </button>

        {/* Sync Status Badge */}
        <SyncBadge syncStatus={syncStatus} scorerOfflineInfo={scorerOfflineInfo} />

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {/* Scorecard Button */}
          <button
            onClick={onOpenScorecard}
            style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
            className="p-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
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
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-3 text-center flex flex-col items-center gap-0.5"
          >
            <div style={{ color: 'var(--orange)' }} className="flex items-center justify-center gap-1.5 font-extrabold text-sm uppercase">
              <Trophy className="w-4 h-4" />
              <span>Match Finished</span>
            </div>
            <div style={{ color: 'var(--text)' }} className="text-base font-black mt-0.5">{matchState.resultSummary}</div>
          </div>
        )}

        {/* Primary Score Board (Solid --card, no gradients) */}
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
          className="app-card p-4 flex flex-col gap-1.5"
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider pb-1">
            <span style={{ color: 'var(--text)' }}>
              {currentInnings.battingTeam} · Innings {curInnIndex + 1}
            </span>
            <span style={{ color: 'var(--muted)' }}>Max Wickets: {maxWickets}</span>
          </div>

          {/* Score numbers: Score in --text, /wickets in --red, overs in --orange */}
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

          {/* Previous Team Batting Score in 2nd Innings & comparative score at this point */}
          {prevInnings && (
            <div
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              className="py-1 px-3 rounded-xl border text-xs flex items-center justify-between font-semibold"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span style={{ color: 'var(--muted)' }}>1st Inn: {prevInnings.battingTeam}</span>
                <span style={{ color: 'var(--blue)' }} className="font-bold">
                  {prevInnings.score}/{prevInnings.wickets} ({formatOvers(prevInnings.legalBalls)} ov)
                </span>
              </div>
              {currentInnings.legalBalls > 0 && (
                <div className="text-right text-[11px] shrink-0 font-medium" style={{ color: 'var(--muted)' }}>
                  At {formatOvers(currentInnings.legalBalls)} ov:{' '}
                  <strong style={{ color: 'var(--orange)' }}>
                    {getScoreAtLegalBalls(prevInnings, currentInnings.legalBalls).score}/{getScoreAtLegalBalls(prevInnings, currentInnings.legalBalls).wickets}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* CRR & RRR / Target info */}
          <div
            style={{ borderColor: 'var(--border)' }}
            className="flex items-center justify-between pt-2 border-t text-xs font-semibold"
          >
            <div>
              <span style={{ color: 'var(--muted)' }}>CRR: </span>
              <strong style={{ color: 'var(--text)' }}>{crr}</strong>
            </div>

            {matchState.target ? (
              <div>
                <span style={{ color: 'var(--muted)' }}>Need </span>
                <strong style={{ color: 'var(--red)' }}>{runsNeeded}</strong>
                <span style={{ color: 'var(--muted)' }}> from </span>
                <strong style={{ color: 'var(--orange)' }}>{ballsRemaining}b</strong>
                <span style={{ color: 'var(--muted)' }}> (RRR </span>
                <strong style={{ color: 'var(--primary)' }}>{rrr}</strong>
                <span style={{ color: 'var(--muted)' }}>)</span>
              </div>
            ) : (
              <div>
                <span style={{ color: 'var(--muted)' }}>Projected: </span>
                <strong style={{ color: 'var(--text)' }}>{Math.round(crr * matchState.overs)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* 3. Batters Card (Solid --card) */}
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
          className="app-card p-3 flex flex-col gap-2"
        >
          <div
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider pb-1 border-b"
          >
            <span className="col-span-6">BATTER</span>
            <span className="col-span-2 text-right">R</span>
            <span className="col-span-2 text-right">B</span>
            <span className="col-span-1 text-right">4S</span>
            <span className="col-span-1 text-right">6S</span>
          </div>

          {/* Striker: --green 15% opacity bg, name in --green */}
          <div
            style={{
              backgroundColor: 'color-mix(in srgb, var(--green) 15%, transparent)',
              borderColor: 'color-mix(in srgb, var(--green) 30%, transparent)'
            }}
            className="grid grid-cols-12 items-center text-xs py-1.5 px-2 rounded-xl border"
          >
            <div
              style={{ color: 'var(--green)' }}
              className="col-span-6 font-bold flex items-center gap-1.5 truncate"
            >
              <span>🏏</span>
              <span className="truncate">{matchState.striker || 'Select Striker'}</span>
              <span className="text-[9px] font-bold px-1 py-0.2 rounded">*</span>
            </div>
            <span style={{ color: 'var(--text)' }} className="col-span-2 text-right font-black">{strikerStat.runs}</span>
            <span style={{ color: 'var(--muted)' }} className="col-span-2 text-right">{strikerStat.balls}</span>
            <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">{strikerStat.fours}</span>
            <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">{strikerStat.sixes}</span>
          </div>

          {/* Non-Striker: --card-alt bg */}
          <div
            style={{
              backgroundColor: 'var(--card-alt)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
            className="grid grid-cols-12 items-center text-xs py-1.5 px-2 rounded-xl border"
          >
            <div className="col-span-6 font-semibold truncate">
              <span className="truncate">{matchState.nonStriker || 'Select Non-Striker'}</span>
            </div>
            <span className="col-span-2 text-right font-bold">{nonStrikerStat.runs}</span>
            <span style={{ color: 'var(--muted)' }} className="col-span-2 text-right">{nonStrikerStat.balls}</span>
            <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">{nonStrikerStat.fours}</span>
            <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">{nonStrikerStat.sixes}</span>
          </div>

          {/* Current Partnership */}
          <div
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            className="text-[11px] flex items-center justify-between pt-1 border-t"
          >
            <span>Partnership: <strong style={{ color: 'var(--text)' }}>{innStats.partnership.runs}</strong> runs ({innStats.partnership.balls}b)</span>
            <span>Extras: <strong style={{ color: 'var(--text)' }}>{innStats.extras.total}</strong></span>
          </div>
        </div>

        {/* 4. Current Bowler Card (Solid --card): Bowler name in --blue, wickets in --red */}
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
          className="app-card p-3 flex flex-col gap-1.5"
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
              {matchState.currentBowler || 'Select Bowler'}
            </div>
            <span style={{ color: 'var(--text)' }} className="col-span-2 text-right font-mono">{bowlerStat.overs}</span>
            <span style={{ color: 'var(--muted)' }} className="col-span-1 text-right">{bowlerStat.maidens}</span>
            <span style={{ color: 'var(--text)' }} className="col-span-2 text-right">{bowlerStat.runsConceded}</span>
            <span style={{ color: 'var(--red)' }} className="col-span-2 text-right font-black">{bowlerStat.wickets}</span>
          </div>
        </div>

        {/* 5. Recent Deliveries Strip */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span style={{ color: 'var(--muted)' }} className="text-[10px] font-bold uppercase tracking-wider shrink-0">Recent:</span>
          {recentBalls.length === 0 ? (
            <span style={{ color: 'var(--muted)' }} className="text-xs">No balls yet in this innings</span>
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
                    : 'var(--card-alt)',
                  color: b.runs === 0 && !b.extraType && !b.isWicket ? 'var(--muted)' : '#FFFFFF',
                  borderColor: 'var(--border)'
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border"
              >
                {b.shortLabel}
              </div>
            ))
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
