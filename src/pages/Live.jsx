import React, { useState, useEffect } from 'react';
import { ArrowLeft, Radio, FileText, WifiOff, Share2, Check } from 'lucide-react';
import { useMatch } from '../store/useMatch.js';
import { findMatchByCode } from '../firebase/matches.js';
import { computeInningsStats, getScoreAtLegalBalls } from '../engine/stats.js';
import { formatOvers, calculateCRR, calculateRRR } from '../engine/rules.js';
import MatchCharts from '../components/MatchCharts.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

export default function Live({
  matchCodeOrId,
  matchState: propMatchState,
  scorerOfflineInfo: propOfflineInfo,
  onBack,
  onOpenScorecard,
  onMatchResolved
}) {
  const [resolvedMatchId, setResolvedMatchId] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function resolve() {
      if (!matchCodeOrId) return;
      if (matchCodeOrId.length === 6) {
        try {
          const matchData = await findMatchByCode(matchCodeOrId);
          if (matchData) {
            setResolvedMatchId(matchData.matchId);
            onMatchResolved?.(matchData.matchId, matchData.code);
          } else {
            setResolvedMatchId(matchCodeOrId);
            onMatchResolved?.(matchCodeOrId, null);
          }
        } catch (e) {
          setResolvedMatchId(matchCodeOrId);
        }
      } else {
        setResolvedMatchId(matchCodeOrId);
        onMatchResolved?.(matchCodeOrId, null);
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
  const recentBalls = (currentInnings.balls || []).slice(-8);

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

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col p-4 max-w-lg mx-auto select-none transition-colors"
    >
      {/* 1. Top Header */}
      <div
        style={{ borderColor: 'var(--border)' }}
        className="flex items-center justify-between pb-3 border-b"
      >
        <button
          onClick={onBack}
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
          className="p-2 rounded-2xl border transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {/* LIVE VIEW badge: --red 15% opacity bg, solid text in --red */}
          <div
            style={{
              backgroundColor: 'color-mix(in srgb, var(--red) 15%, transparent)',
              borderColor: 'color-mix(in srgb, var(--red) 30%, transparent)',
              color: 'var(--red)'
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
          >
            <span
              style={{ backgroundColor: 'var(--red)' }}
              className="w-2 h-2 rounded-full animate-ping"
            />
            <Radio className="w-3.5 h-3.5" style={{ color: 'var(--red)' }} />
            <span>LIVE VIEW</span>
          </div>

          <button
            onClick={handleShare}
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--orange)'
            }}
            className="flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded-xl border"
          >
            <span>{matchState.code || matchCodeOrId || 'MATCH'}</span>
            {copied ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--green)' }} /> : <Share2 className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {/* Scorecard button: --primary bg, white text */}
          <button
            onClick={() => onOpenScorecard(matchState)}
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

      {/* Offline banner: --orange 15% opacity bg, solid text in --orange */}
      {scorerOfflineInfo && (
        <div
          style={{
            backgroundColor: 'color-mix(in srgb, var(--orange) 15%, transparent)',
            borderColor: 'color-mix(in srgb, var(--orange) 30%, transparent)',
            color: 'var(--orange)'
          }}
          className="mt-3 flex items-center gap-2 rounded-2xl p-3 text-xs font-semibold border animate-pulse"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>{scorerOfflineInfo}. Live score will catch up automatically when online.</span>
        </div>
      )}

      {/* 2. Main Score Card (Solid --card, no gradients) */}
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}
        className="app-card mt-3 p-5 flex flex-col gap-2"
      >
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider pb-1">
          <span style={{ color: 'var(--text)' }}>
            {currentInnings.battingTeam || 'Batting Team'} · Innings {curInnIndex + 1}
          </span>
          {/* "VS Team" label in --primary */}
          <span style={{ color: 'var(--primary)' }} className="font-extrabold">
            vs {currentInnings.bowlingTeam || 'Bowling Team'}
          </span>
        </div>

        {/* Score row: Score number in --text, wickets "/5" in --red, overs in --orange */}
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

        {/* Previous Team Batting Score & comparative score at this point */}
        {prevInnings && (
          <div
            style={{
              backgroundColor: 'var(--card-alt)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
            className="py-1.5 px-3 rounded-xl border text-xs flex items-center justify-between font-semibold"
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

        {/* CRR / Projected labels in --muted, values in --text */}
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
              <span style={{ color: 'var(--muted)' }}>Target: </span>
              <strong style={{ color: 'var(--orange)' }}>{matchState.target}</strong>
              <span style={{ color: 'var(--muted)' }}> (RRR: </span>
              <strong style={{ color: 'var(--red)' }}>{rrr}</strong>
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
        className="app-card mt-3 p-3 flex flex-col gap-2"
      >
        <div
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          className="grid grid-cols-12 text-[10px] font-bold uppercase tracking-wider pb-1 border-b"
        >
          <span className="col-span-6">BATTER</span>
          <span className="col-span-2 text-right">R</span>
          <span className="col-span-2 text-right">B</span>
          <span className="col-span-2 text-right">SR</span>
        </div>

        {/* Striker row: --green 15% opacity bg, name in --green */}
        <div
          style={{
            backgroundColor: 'color-mix(in srgb, var(--green) 15%, transparent)',
            borderColor: 'color-mix(in srgb, var(--green) 30%, transparent)'
          }}
          className="grid grid-cols-12 items-center text-xs py-1.5 px-2 rounded-xl border"
        >
          <div
            style={{ color: 'var(--green)' }}
            className="col-span-6 font-bold truncate flex items-center gap-1.5"
          >
            <span>🏏</span>
            <span className="truncate">{matchState.striker || 'Striker'}</span>
          </div>
          <span style={{ color: 'var(--text)' }} className="col-span-2 text-right font-black">
            {strikerStat.runs}
          </span>
          <span style={{ color: 'var(--muted)' }} className="col-span-2 text-right">
            {strikerStat.balls}
          </span>
          <span style={{ color: 'var(--muted)' }} className="col-span-2 text-right">
            {strikerStat.strikeRate}
          </span>
        </div>

        {/* Non-striker row: --card-alt bg */}
        <div
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
          className="grid grid-cols-12 items-center text-xs py-1.5 px-2 rounded-xl border"
        >
          <div className="col-span-6 font-semibold truncate">
            {matchState.nonStriker || 'Non-Striker'}
          </div>
          <span className="col-span-2 text-right font-bold">
            {nonStrikerStat.runs}
          </span>
          <span style={{ color: 'var(--muted)' }} className="col-span-2 text-right">
            {nonStrikerStat.balls}
          </span>
          <span style={{ color: 'var(--muted)' }} className="col-span-2 text-right">
            {nonStrikerStat.strikeRate}
          </span>
        </div>
      </div>

      {/* 4. Bowler Card (Solid --card): Bowler name in --blue, bowler W in --red */}
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}
        className="app-card mt-3 p-3 flex flex-col gap-1.5"
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

      {/* 5. Match Charts: Over-by-Over & Worm Comparison */}
      <div className="mt-3">
        <MatchCharts matchState={matchState} />
      </div>

      {/* 6. Recent Deliveries */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto py-1">
        <span style={{ color: 'var(--muted)' }} className="text-[10px] font-bold uppercase tracking-wider shrink-0">
          Recent:
        </span>
        {recentBalls.length === 0 ? (
          <span style={{ color: 'var(--muted)' }} className="text-xs">Waiting for first delivery...</span>
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

      {/* Footer Branding */}
      <footer
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        className="mt-8 pt-4 pb-4 text-center text-xs border-t"
      >
        Cricket Scorer • Developed with 🏏 by <span style={{ color: 'var(--text)' }} className="font-bold">Syed Maaz Alam</span>
      </footer>
    </div>
  );
}
