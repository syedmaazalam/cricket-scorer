import React, { useState, useEffect } from 'react';
import { ArrowLeft, Radio, FileText, WifiOff } from 'lucide-react';
import { useMatch } from '../store/useMatch.js';
import { findMatchByCode } from '../firebase/matches.js';
import { computeInningsStats } from '../engine/stats.js';
import { formatOvers, calculateCRR, calculateRRR } from '../engine/rules.js';

export default function Live({ matchCodeOrId, onBack, onOpenScorecard }) {
  const [resolvedMatchId, setResolvedMatchId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function resolve() {
      if (!matchCodeOrId) return;
      if (matchCodeOrId.length === 6) {
        // Find by code
        try {
          const matchData = await findMatchByCode(matchCodeOrId);
          if (matchData) {
            setResolvedMatchId(matchData.matchId);
          } else {
            // Check if matchId is code itself
            setResolvedMatchId(matchCodeOrId);
          }
        } catch (e) {
          setResolvedMatchId(matchCodeOrId);
        }
      } else {
        setResolvedMatchId(matchCodeOrId);
      }
    }
    resolve();
  }, [matchCodeOrId]);

  const { matchState, scorerOfflineInfo, isLoading } = useMatch(resolvedMatchId, true);

  const curInnIndex = matchState.currentInningsIndex || 0;
  const currentInnings = matchState.innings?.[curInnIndex] || {
    score: 0,
    wickets: 0,
    legalBalls: 0,
    balls: [],
    battingTeam: '',
    bowlingTeam: ''
  };

  const innStats = computeInningsStats(currentInnings);
  const strikerStat = innStats.batting[matchState.striker] || { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
  const nonStrikerStat = innStats.batting[matchState.nonStriker] || { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0 };
  const bowlerStat = innStats.bowling[matchState.currentBowler] || { overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, economy: 0 };

  const crr = calculateCRR(currentInnings.score, currentInnings.legalBalls);
  const rrr = matchState.target ? calculateRRR(matchState.target, currentInnings.score, currentInnings.legalBalls, matchState.overs) : null;
  const recentBalls = (currentInnings.balls || []).slice(-8);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-lg mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <button
          onClick={onBack}
          className="p-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500" />
            <span>LIVE VIEW</span>
          </div>
          <span className="text-xs font-mono font-bold text-amber-300 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
            {matchState.code || matchCodeOrId}
          </span>
        </div>

        <button
          onClick={() => onOpenScorecard(matchState)}
          className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold flex items-center gap-1"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Scorecard</span>
        </button>
      </div>

      {/* Scorer Offline Warning Banner */}
      {scorerOfflineInfo && (
        <div className="mt-3 flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-300 font-semibold animate-pulse">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>{scorerOfflineInfo}. Live score will catch up automatically when online.</span>
        </div>
      )}

      {/* Main Score Board */}
      <div className="mt-3 bg-gradient-to-b from-slate-900 to-slate-920 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider pb-1">
          <span>{currentInnings.battingTeam} · Innings {curInnIndex + 1}</span>
          <span className="text-emerald-400">vs {currentInnings.bowlingTeam}</span>
        </div>

        <div className="flex items-baseline justify-between py-2">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-white tracking-tight">{currentInnings.score}</span>
            <span className="text-3xl font-extrabold text-rose-500">/ {currentInnings.wickets}</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-amber-400 font-mono">
              {formatOvers(currentInnings.legalBalls)} <span className="text-sm text-slate-400 font-normal">/ {matchState.overs} ov</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-semibold">
          <div className="text-slate-400">CRR: <strong className="text-white">{crr}</strong></div>
          {matchState.target ? (
            <div className="text-amber-300 font-bold">Target {matchState.target} (RRR {rrr})</div>
          ) : (
            <div className="text-slate-400">Projected: <strong className="text-white">{Math.round(crr * matchState.overs)}</strong></div>
          )}
        </div>
      </div>

      {/* Batters */}
      <div className="mt-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
        <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800">
          <span className="col-span-6">Batter</span>
          <span className="col-span-2 text-right">R</span>
          <span className="col-span-2 text-right">B</span>
          <span className="col-span-2 text-right">SR</span>
        </div>

        {/* Striker */}
        <div className="grid grid-cols-12 items-center text-xs py-1 px-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
          <div className="col-span-6 font-bold text-emerald-300 truncate flex items-center gap-1.5">
            <span>🏏</span>
            <span className="truncate">{matchState.striker || 'Striker'}</span>
          </div>
          <span className="col-span-2 text-right font-black text-white">{strikerStat.runs}</span>
          <span className="col-span-2 text-right text-slate-400">{strikerStat.balls}</span>
          <span className="col-span-2 text-right text-slate-400">{strikerStat.strikeRate}</span>
        </div>

        {/* Non-Striker */}
        <div className="grid grid-cols-12 items-center text-xs py-1 px-2 rounded-xl bg-slate-800/40">
          <div className="col-span-6 font-semibold text-slate-200 truncate">
            {matchState.nonStriker || 'Non-Striker'}
          </div>
          <span className="col-span-2 text-right font-bold text-white">{nonStrikerStat.runs}</span>
          <span className="col-span-2 text-right text-slate-400">{nonStrikerStat.balls}</span>
          <span className="col-span-2 text-right text-slate-400">{nonStrikerStat.strikeRate}</span>
        </div>
      </div>

      {/* Current Bowler */}
      <div className="mt-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1.5">
        <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800">
          <span className="col-span-5">Bowler</span>
          <span className="col-span-2 text-right">O</span>
          <span className="col-span-1 text-right">M</span>
          <span className="col-span-2 text-right">R</span>
          <span className="col-span-2 text-right">W</span>
        </div>
        <div className="grid grid-cols-12 items-center text-xs py-0.5">
          <div className="col-span-5 font-bold text-cyan-300 truncate">
            {matchState.currentBowler || 'Bowler'}
          </div>
          <span className="col-span-2 text-right font-mono text-white">{bowlerStat.overs}</span>
          <span className="col-span-1 text-right text-slate-400">{bowlerStat.maidens}</span>
          <span className="col-span-2 text-right text-slate-300">{bowlerStat.runsConceded}</span>
          <span className="col-span-2 text-right font-black text-rose-400">{bowlerStat.wickets}</span>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto py-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">Recent:</span>
        {recentBalls.map((b, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
              b.isWicket
                ? 'bg-rose-600 text-white'
                : b.runs === 6
                ? 'bg-purple-600 text-white'
                : b.runs === 4
                ? 'bg-blue-600 text-white'
                : b.extraType
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {b.shortLabel}
          </div>
        ))}
      </div>

      {/* Footer Branding */}
      <footer className="mt-8 pt-4 pb-4 text-center text-xs text-slate-500 border-t border-slate-900">
        Cricket Scorer • Developed with 🏏 by <span className="text-slate-300 font-bold">Syed Maaz Alam</span>
      </footer>
    </div>
  );
}
