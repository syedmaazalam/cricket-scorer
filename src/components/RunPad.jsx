import React, { useState } from 'react';
import { RotateCcw, ArrowLeftRight, AlertCircle, ShieldAlert } from 'lucide-react';
import { EXTRA_TYPES } from '../engine/constants.js';

export default function RunPad({
  onScoreBall,
  onOpenWicket,
  onSwapBatter,
  onUndo,
  isFreeHit,
  disabled
}) {
  const [extraMode, setExtraMode] = useState(null); // 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null

  // Quick 1-tap runs
  const handleRunClick = (runs) => {
    if (disabled) return;

    if (!extraMode) {
      // Direct 1-tap normal runs
      onScoreBall({
        runs,
        extraType: null,
        extraRuns: 0,
        isWicket: false
      });
    } else if (extraMode === EXTRA_TYPES.WIDE) {
      // Wide with additional runs (2 taps total)
      onScoreBall({
        runs: 0,
        extraType: EXTRA_TYPES.WIDE,
        extraRuns: runs, // additional overthrows/byes
        isWicket: false
      });
      setExtraMode(null);
    } else if (extraMode === EXTRA_TYPES.NO_BALL) {
      // No ball with bat runs
      onScoreBall({
        runs: runs,
        extraType: EXTRA_TYPES.NO_BALL,
        extraRuns: 0,
        isWicket: false
      });
      setExtraMode(null);
    } else if (extraMode === EXTRA_TYPES.BYE) {
      onScoreBall({
        runs: 0,
        extraType: EXTRA_TYPES.BYE,
        extraRuns: runs,
        isWicket: false
      });
      setExtraMode(null);
    } else if (extraMode === EXTRA_TYPES.LEG_BYE) {
      onScoreBall({
        runs: 0,
        extraType: EXTRA_TYPES.LEG_BYE,
        extraRuns: runs,
        isWicket: false
      });
      setExtraMode(null);
    }
  };

  // Quick single tap extra (1 Wide or 1 No Ball)
  const handleQuickExtra = (type) => {
    if (disabled) return;
    if (extraMode === type) {
      setExtraMode(null);
    } else {
      setExtraMode(type);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border-t border-slate-800 p-3 pb-6 flex flex-col gap-2.5 backdrop-blur-md">
      {/* Free Hit Banner if active */}
      {isFreeHit && (
        <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border border-amber-400/40 rounded-xl py-1.5 px-3 text-amber-300 font-bold text-xs tracking-wider uppercase animate-pulse">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>FREE HIT DELIVERY — No dismissal except Run Out</span>
        </div>
      )}

      {/* Extra selection prompt when extraMode is active */}
      {extraMode && (
        <div className="flex items-center justify-between bg-indigo-950/80 border border-indigo-500/30 rounded-xl px-3 py-1.5 text-xs text-indigo-200">
          <span className="font-medium">
            Select additional runs for <strong className="text-white uppercase">{extraMode.replace('_', ' ')}</strong>:
          </span>
          <button
            onClick={() => setExtraMode(null)}
            className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Primary Run Grid (0, 1, 2, 3, 4, 6) */}
      <div className="grid grid-cols-6 gap-2">
        {[0, 1, 2, 3, 4, 6].map((run) => {
          const isFour = run === 4;
          const isSix = run === 6;
          return (
            <button
              key={run}
              disabled={disabled}
              onClick={() => handleRunClick(run)}
              className={`h-16 rounded-2xl font-black text-2xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg select-none ${
                isSix
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-purple-900/30 hover:brightness-110'
                  : isFour
                  ? 'bg-gradient-to-br from-blue-600 to-cyan-700 text-white shadow-blue-900/30 hover:brightness-110'
                  : run === 0
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/60'
                  : 'bg-slate-700 hover:bg-slate-650 text-white border border-slate-600/60'
              } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span>{run}</span>
              {run === 0 && <span className="text-[10px] font-normal text-slate-400 -mt-1">DOT</span>}
              {isFour && <span className="text-[10px] font-bold text-cyan-200 -mt-1">FOUR</span>}
              {isSix && <span className="text-[10px] font-bold text-purple-200 -mt-1">SIX</span>}
            </button>
          );
        })}
      </div>

      {/* Extras & Action Row */}
      <div className="grid grid-cols-5 gap-2">
        {/* Wide button */}
        <button
          disabled={disabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.WIDE)}
          className={`h-12 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
            extraMode === EXTRA_TYPES.WIDE
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold ring-2 ring-amber-400/50'
              : 'bg-slate-800/80 text-amber-300 border-amber-500/30 hover:bg-slate-800'
          }`}
        >
          WD
        </button>

        {/* No Ball button */}
        <button
          disabled={disabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.NO_BALL)}
          className={`h-12 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
            extraMode === EXTRA_TYPES.NO_BALL
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold ring-2 ring-amber-400/50'
              : 'bg-slate-800/80 text-amber-300 border-amber-500/30 hover:bg-slate-800'
          }`}
        >
          NB
        </button>

        {/* Bye button */}
        <button
          disabled={disabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.BYE)}
          className={`h-12 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
            extraMode === EXTRA_TYPES.BYE
              ? 'bg-indigo-500 text-white border-indigo-400 font-extrabold ring-2 ring-indigo-400/50'
              : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-800'
          }`}
        >
          BYE
        </button>

        {/* Leg Bye button */}
        <button
          disabled={disabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.LEG_BYE)}
          className={`h-12 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
            extraMode === EXTRA_TYPES.LEG_BYE
              ? 'bg-indigo-500 text-white border-indigo-400 font-extrabold ring-2 ring-indigo-400/50'
              : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-800'
          }`}
        >
          LB
        </button>

        {/* Wicket button */}
        <button
          disabled={disabled}
          onClick={onOpenWicket}
          className="h-12 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 text-white text-xs font-extrabold tracking-wider border border-rose-500/40 shadow-lg shadow-rose-900/40 active:scale-95 hover:brightness-110 flex items-center justify-center gap-1"
        >
          <span>OUT</span>
        </button>
      </div>

      {/* Utility Controls: 1-Tap Swap Batter & 1-Tap Undo */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <button
          onClick={onSwapBatter}
          disabled={disabled}
          className="h-11 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
        >
          <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
          <span>Swap Batter (1-Tap)</span>
        </button>

        <button
          onClick={onUndo}
          disabled={disabled}
          className="h-11 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span>Undo Last Ball</span>
        </button>
      </div>
    </div>
  );
}
