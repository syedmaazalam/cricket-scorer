import React, { useState } from 'react';
import { RotateCcw, ArrowLeftRight, Zap } from 'lucide-react';
import { EXTRA_TYPES } from '../engine/constants.js';

export default function RunPad({
  onScoreBall,
  onOpenWicket,
  onSwapBatter,
  onUndo,
  isFreeHit,
  disabled
}) {
  const [extraMode, setExtraMode] = useState(null);

  const handleRunClick = (runs) => {
    if (disabled) return;

    if (!extraMode) {
      onScoreBall({
        runs,
        extraType: null,
        extraRuns: 0,
        isWicket: false
      });
      return;
    }

    if (extraMode === EXTRA_TYPES.WIDE) {
      onScoreBall({
        runs: 0,
        extraType: EXTRA_TYPES.WIDE,
        extraRuns: 1 + runs,
        isWicket: false
      });
    } else if (extraMode === EXTRA_TYPES.NO_BALL) {
      onScoreBall({
        runs,
        extraType: EXTRA_TYPES.NO_BALL,
        extraRuns: 1,
        isWicket: false
      });
    } else if (extraMode === EXTRA_TYPES.BYE) {
      onScoreBall({
        runs: 0,
        extraType: EXTRA_TYPES.BYE,
        extraRuns: runs,
        isWicket: false
      });
    } else if (extraMode === EXTRA_TYPES.LEG_BYE) {
      onScoreBall({
        runs: 0,
        extraType: EXTRA_TYPES.LEG_BYE,
        extraRuns: runs,
        isWicket: false
      });
    }

    setExtraMode(null);
  };

  const handleQuickExtra = (type) => {
    if (disabled) return;
    if (extraMode === type) {
      setExtraMode(null);
      return;
    }
    setExtraMode(type);
  };

  return (
    <div className="flex flex-col gap-2 select-none touch-manipulation">
      {/* Active Extra Mode indicator banner */}
      {extraMode && (
        <div
          style={{
            backgroundColor: 'var(--green-15)',
            borderColor: 'var(--primary)',
            color: 'var(--primary)'
          }}
          className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between animate-pulse"
        >
          <span>Active: {extraMode.toUpperCase()} — Now tap runs (0 to 6)</span>
          <button
            onClick={() => setExtraMode(null)}
            className="text-[10px] uppercase font-bold underline ml-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Free Hit Banner */}
      {isFreeHit && (
        <div
          style={{
            backgroundColor: 'var(--green-15)',
            borderColor: 'var(--primary)',
            color: 'var(--primary)'
          }}
          className="px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <Zap className="w-4 h-4 text-emerald-500 animate-bounce" />
          <span>FREE HIT BALL</span>
        </div>
      )}

      {/* Row 1: Runs 0, 1, 2, 3, 4, 6 */}
      <div className="grid grid-cols-6 gap-1.5">
        {/* 0 (DOT) */}
        <button
          disabled={disabled}
          onClick={() => handleRunClick(0)}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--muted)'
          }}
          className="h-11 sm:h-12 rounded-xl border flex flex-col items-center justify-center font-bold text-xs active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
        >
          <span className="text-sm font-semibold">0</span>
          <span className="text-[8px] font-medium tracking-wider -mt-0.5">DOT</span>
        </button>

        {/* 1 */}
        <button
          disabled={disabled}
          onClick={() => handleRunClick(1)}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
          className="h-11 sm:h-12 rounded-xl border flex items-center justify-center font-bold text-base active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
        >
          1
        </button>

        {/* 2 */}
        <button
          disabled={disabled}
          onClick={() => handleRunClick(2)}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
          className="h-11 sm:h-12 rounded-xl border flex items-center justify-center font-bold text-base active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
        >
          2
        </button>

        {/* 3 */}
        <button
          disabled={disabled}
          onClick={() => handleRunClick(3)}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
          className="h-11 sm:h-12 rounded-xl border flex items-center justify-center font-bold text-base active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
        >
          3
        </button>

        {/* 4 (FOUR) */}
        <button
          disabled={disabled}
          onClick={() => handleRunClick(4)}
          style={{
            backgroundColor: 'var(--primary)',
            color: '#FFFFFF'
          }}
          className="h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center font-bold text-base active:scale-95 transition-all shadow-sm hover:brightness-105"
        >
          <span>4</span>
          <span className="text-[8px] font-semibold uppercase tracking-wider -mt-1 opacity-90">FOUR</span>
        </button>

        {/* 6 (SIX) */}
        <button
          disabled={disabled}
          onClick={() => handleRunClick(6)}
          style={{
            backgroundColor: '#16A34A',
            color: '#FFFFFF'
          }}
          className="h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center font-bold text-base active:scale-95 transition-all shadow-sm hover:brightness-105"
        >
          <span>6</span>
          <span className="text-[8px] font-semibold uppercase tracking-wider -mt-1 opacity-90">SIX</span>
        </button>
      </div>

      {/* Row 2: WD, NB, BYE, LB, OUT */}
      <div className="grid grid-cols-5 gap-1.5">
        {/* WD */}
        <button
          disabled={disabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.WIDE)}
          style={{
            backgroundColor: extraMode === EXTRA_TYPES.WIDE ? 'var(--primary)' : 'var(--card-alt)',
            color: extraMode === EXTRA_TYPES.WIDE ? '#FFFFFF' : 'var(--text)',
            borderColor: extraMode === EXTRA_TYPES.WIDE ? 'var(--primary)' : 'var(--border)'
          }}
          className="h-10 sm:h-11 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm"
        >
          <span>WD</span>
          <span className="text-[8px] font-medium opacity-80 -mt-0.5">WIDE</span>
        </button>

        {/* NB */}
        <button
          disabled={disabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.NO_BALL)}
          style={{
            backgroundColor: extraMode === EXTRA_TYPES.NO_BALL ? 'var(--primary)' : 'var(--card-alt)',
            color: extraMode === EXTRA_TYPES.NO_BALL ? '#FFFFFF' : 'var(--text)',
            borderColor: extraMode === EXTRA_TYPES.NO_BALL ? 'var(--primary)' : 'var(--border)'
          }}
          className="h-10 sm:h-11 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm"
        >
          <span>NB</span>
          <span className="text-[8px] font-medium opacity-80 -mt-0.5">NO BALL</span>
        </button>

        {/* BYE */}
        <button
          disabled={disabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.BYE)}
          style={{
            backgroundColor: extraMode === EXTRA_TYPES.BYE ? 'var(--primary)' : 'var(--card-alt)',
            color: extraMode === EXTRA_TYPES.BYE ? '#FFFFFF' : 'var(--text)',
            borderColor: extraMode === EXTRA_TYPES.BYE ? 'var(--primary)' : 'var(--border)'
          }}
          className="h-10 sm:h-11 rounded-xl border text-[11px] font-semibold flex items-center justify-center active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
        >
          BYE
        </button>

        {/* LB */}
        <button
          disabled={disabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.LEG_BYE)}
          style={{
            backgroundColor: extraMode === EXTRA_TYPES.LEG_BYE ? 'var(--primary)' : 'var(--card-alt)',
            color: extraMode === EXTRA_TYPES.LEG_BYE ? '#FFFFFF' : 'var(--text)',
            borderColor: extraMode === EXTRA_TYPES.LEG_BYE ? 'var(--primary)' : 'var(--border)'
          }}
          className="h-10 sm:h-11 rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
        >
          <span>LB</span>
          <span className="text-[7px] font-medium opacity-80 -mt-0.5">LEG BYE</span>
        </button>

        {/* OUT */}
        <button
          disabled={disabled}
          onClick={onOpenWicket}
          style={{
            backgroundColor: 'var(--red)',
            color: '#FFFFFF'
          }}
          className="h-10 sm:h-11 rounded-xl flex items-center justify-center gap-1 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all shadow-sm hover:brightness-110"
        >
          <Zap className="w-3.5 h-3.5 fill-white text-white" />
          <span>OUT</span>
        </button>
      </div>

      {/* Row 3: Swap Batter & Undo */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onSwapBatter}
          disabled={disabled}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
          className="py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
          <span>Swap Batter</span>
        </button>

        <button
          onClick={onUndo}
          disabled={disabled}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--muted)'
          }}
          className="py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-sm hover:border-[var(--red)] hover:text-[var(--red)]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Undo Ball</span>
        </button>
      </div>
    </div>
  );
}
