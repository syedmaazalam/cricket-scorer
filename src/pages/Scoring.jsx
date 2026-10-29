import React, { useState } from 'react';
import { ArrowLeft, Share2, FileText, Check, Trophy, Users, Clock, ShieldCheck, Radio } from 'lucide-react';
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
import ScoreAnimation from '../components/ScoreAnimation.jsx';
import MatchCharts from '../components/MatchCharts.jsx';
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
  onRetireBatter,
  onEditPlayer,
  onEndInnings,
  onUndo,
  onNavigate,
  onOpenScorecard
}) {
  const [isWicketModalOpen, setIsWicketModalOpen] = useState(false);
  const [isTimeDeclareOpen, setIsTimeDeclareOpen] = useState(false);
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [selectedBatterDetails, setSelectedBatterDetails] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeAnimation, setActiveAnimation] = useState(null);

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

  // Run rates & overs progress
  const crr = calculateCRR(currentInnings.score, currentInnings.legalBalls);
  const rrr = matchState.target ? calculateRRR(matchState.target, currentInnings.score, currentInnings.legalBalls, matchState.overs) : null;

  const totalBallsAllowed = matchState.overs * 6;
  const progressPercent = Math.min(100, Math.round((currentInnings.legalBalls / Math.max(1, totalBallsAllowed)) * 100));
  const runsNeeded = matchState.target ? Math.max(0, matchState.target - currentInnings.score) : null;

  const recentBalls = (currentInnings.balls || []).slice(-10);

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

  // Intercept onRecordBall to trigger celebratory animations
  const handleScoreBallWithAnimation = (ballData) => {
    if (ballData.runs === 6) {
      setActiveAnimation({ type: 'six', text: '+6 MAXIMUM!', subtext: 'OUT OF THE PARK!' });
    } else if (ballData.runs === 4) {
      setActiveAnimation({ type: 'four', text: '+4 BOUNDARY!', subtext: 'CRACKING SHOT!' });
    } else if (ballData.isWicket) {
      setActiveAnimation({ type: 'wicket', text: 'WICKET!', subtext: 'DEPARTURE!' });
    } else if (ballData.extraRuns > 0 && ballData.extraType) {
      setActiveAnimation({ type: 'extra', text: `+${ballData.extraRuns + 1} ${ballData.extraType.toUpperCase()}` });
    } else if (ballData.runs > 0) {
      setActiveAnimation({ type: 'runs', text: `+${ballData.runs}` });
    }

    onRecordBall(ballData);
  };

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col justify-between max-w-6xl mx-auto select-none transition-colors p-2 sm:p-4"
    >
      {/* 1. Header Bar */}
      <div
        style={{ borderColor: 'var(--border)' }}
        className="p-3 border-b flex items-center justify-between gap-2"
      >
        <button
          onClick={() => onNavigate('home')}
          title="Back to Home"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
          className="p-2 rounded-2xl border transition-all active:scale-95 shadow-sm"
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-mono font-bold shadow-sm"
        >
          <span>{matchState.code || 'MATCH'}</span>
          {copiedCode ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} /> : <Share2 className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />}
        </button>

        {/* Live Indicator Badge (matching image) */}
        <div
          style={{
            backgroundColor: 'color-mix(in srgb, var(--green) 15%, transparent)',
            borderColor: 'color-mix(in srgb, var(--green) 30%, transparent)',
            color: 'var(--green)'
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
        >
          <span style={{ backgroundColor: 'var(--green)' }} className="w-2 h-2 rounded-full animate-ping" />
          <Radio className="w-3.5 h-3.5" />
          <span>Live</span>
        </div>

        {/* Sync Status Badge */}
        <SyncBadge syncStatus={syncStatus} scorerOfflineInfo={scorerOfflineInfo} />

        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          {/* Scorecard Button */}
          <button
            onClick={onOpenScorecard}
            style={{
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF'
            }}
            className="p-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Scorecard</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Grid: 2 columns on Desktop (lg:), 1 column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-3 flex-1 items-start">
        {/* LEFT COLUMN: Main Scorecard, Batters, Bowler, Recent */}
        <div className="flex flex-col gap-3">
          {/* Main Score Card (Solid --card, matching uploaded image) */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-4 sm:p-5 flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider pb-1">
              <span style={{ color: 'var(--text)' }}>
                {currentInnings.battingTeam || 'Batting Team'} · INNINGS {curInnIndex + 1}
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

            {/* Progress Bar & Max Wickets Pill (matching image) */}
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

            {/* CRR & Projected / Target Pill Badges (matching image) */}
            <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--green) 15%, var(--card-alt))',
                  borderColor: 'color-mix(in srgb, var(--green) 30%, var(--border))',
                  color: 'var(--text)'
                }}
                className="flex-1 py-1.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <span style={{ color: 'var(--green)' }}>📈</span>
                <span style={{ color: 'var(--muted)' }}>CRR</span>
                <strong style={{ color: 'var(--green)' }}>{crr}</strong>
              </div>

              {matchState.target ? (
                <div
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--orange) 15%, var(--card-alt))',
                    borderColor: 'color-mix(in srgb, var(--orange) 30%, var(--border))',
                    color: 'var(--text)'
                  }}
                  className="flex-1 py-1.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <span style={{ color: 'var(--orange)' }}>🎯</span>
                  <span style={{ color: 'var(--muted)' }}>Need</span>
                  <strong style={{ color: 'var(--red)' }}>{runsNeeded}</strong>
                  <span style={{ color: 'var(--muted)' }}>({rrr} RRR)</span>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--blue) 15%, var(--card-alt))',
                    borderColor: 'color-mix(in srgb, var(--blue) 30%, var(--border))',
                    color: 'var(--text)'
                  }}
                  className="flex-1 py-1.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <span style={{ color: 'var(--blue)' }}>🎯</span>
                  <span style={{ color: 'var(--muted)' }}>Projected</span>
                  <strong style={{ color: 'var(--blue)' }}>{Math.round(crr * matchState.overs)}</strong>
                </div>
              )}
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
          </div>

          {/* Batters Card (Solid --card, matching image) */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-3 sm:p-4 flex flex-col gap-2"
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

            {/* Striker Row (Bat icon, green highlight, clickable for breakdown) */}
            <div
              onClick={() => setSelectedBatterDetails(matchState.striker)}
              title="Click to view complete batter innings & bowler match-ups"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--green) 15%, transparent)',
                borderColor: 'color-mix(in srgb, var(--green) 35%, transparent)'
              }}
              className="grid grid-cols-12 items-center text-xs py-2 px-2.5 rounded-2xl border cursor-pointer hover:brightness-105 active:scale-99 transition-all shadow-sm"
            >
              <div
                style={{ color: 'var(--green)' }}
                className="col-span-6 font-bold truncate flex items-center gap-2"
              >
                <span className="text-base">🏏</span>
                <div className="truncate">
                  <div className="font-extrabold truncate">{matchState.striker || 'Select Striker'}</div>
                  <div className="text-[9px] font-normal opacity-80">(Striker) • Tap for stats</div>
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

            {/* Non-Striker Row (Helmet icon, clickable for breakdown) */}
            <div
              onClick={() => setSelectedBatterDetails(matchState.nonStriker)}
              title="Click to view complete batter innings & bowler match-ups"
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)'
              }}
              className="grid grid-cols-12 items-center text-xs py-2 px-2.5 rounded-2xl border cursor-pointer hover:border-[var(--primary)] active:scale-99 transition-all shadow-sm"
            >
              <div className="col-span-6 font-semibold truncate flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <span className="text-base">⛑️</span>
                <div className="truncate">
                  <div className="font-bold truncate">{matchState.nonStriker || 'Select Non-Striker'}</div>
                  <div className="text-[9px] font-normal" style={{ color: 'var(--muted)' }}>(Non-Striker) • Tap for stats</div>
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

            {/* Partnership & Extras Bottom Strip (matching image) */}
            <div
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--card-alt)',
                color: 'var(--muted)'
              }}
              className="flex items-center justify-between text-[11px] py-1.5 px-3 rounded-xl border font-medium mt-0.5"
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

          {/* Bowler Card (Solid --card, matching image) */}
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

            <div className="grid grid-cols-12 items-center text-xs py-1">
              <div className="col-span-5 truncate flex items-center gap-2">
                <span className="text-sm">🎯</span>
                <div className="truncate">
                  <div style={{ color: 'var(--blue)' }} className="font-bold truncate">
                    {matchState.currentBowler || 'Select Bowler'}
                  </div>
                  <div className="text-[9px]" style={{ color: 'var(--muted)' }}>Active Bowler</div>
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

          {/* Recent Deliveries Strip */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span style={{ color: 'var(--muted)' }} className="text-[10px] font-bold uppercase tracking-wider shrink-0">
              RECENT:
            </span>
            {recentBalls.length === 0 ? (
              <span style={{ color: 'var(--muted)' }} className="text-xs">No deliveries yet in this innings</span>
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
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border shadow-sm"
                >
                  {b.shortLabel}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RunPad, Actions, and Desktop Charts */}
        <div className="flex flex-col gap-3">
          {/* Interactive RunPad */}
          <RunPad
            onScoreBall={handleScoreBallWithAnimation}
            onOpenWicket={() => setIsWicketModalOpen(true)}
            onSwapBatter={onSwapBatter}
            onUndo={onUndo}
            onOpenTimeDeclare={() => setIsTimeDeclareOpen(true)}
            onOpenSquad={() => setIsSquadModalOpen(true)}
            isFreeHit={matchState.isFreeHit}
            disabled={Boolean(matchState.needsBowlerChange || matchState.needsNewBatter || matchState.status === 'completed')}
          />

          {/* Desktop Over & Worm Charts (shown directly beside scoring pad on desktop screens) */}
          <div className="hidden lg:block mt-1">
            <MatchCharts matchState={matchState} />
          </div>
        </div>
      </div>

      {/* Celebratory Floating Score Animation */}
      <ScoreAnimation animationData={activeAnimation} />

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
          availableBatters={availableBatters}
          isFreeHit={matchState.isFreeHit}
          onConfirmWicket={(wicketData) => {
            handleScoreBallWithAnimation({
              runs: wicketData.runsOffBat || 0,
              extraType: wicketData.extraType || null,
              extraRuns: wicketData.extraRuns || 0,
              isWicket: true,
              wicketType: wicketData.wicketType,
              dismissedPlayer: wicketData.dismissedBatter,
              fielder: wicketData.fielder || null,
              nextBatter: wicketData.newBatter || null
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
          bowlersSquad={bowlingSquad}
          previousBowler={matchState.currentBowler}
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

      {/* 7. Innings Break Modal */}
      {matchState.status === 'innings_break' && (
        <InningsBreakModal
          isOpen={matchState.status === 'innings_break'}
          innings1={matchState.innings[0]}
          target={matchState.target}
          bowlingTeamSquad={currentBowlingTeamObj?.players || []}
          battingTeamSquad={currentBattingTeamObj?.players || []}
          onStartInnings2={(openers) => {
            onEndInnings({
              reason: 'Innings completed',
              striker: openers.striker,
              nonStriker: openers.nonStriker,
              bowler: openers.bowler
            });
          }}
        />
      )}

      {/* Footer Branding */}
      <footer
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        className="mt-4 pt-3 pb-2 text-center text-xs border-t"
      >
        Cricket Scorer • Developed with 🏏 by <span style={{ color: 'var(--text)' }} className="font-bold">Syed Maaz Alam</span>
      </footer>
    </div>
  );
}
