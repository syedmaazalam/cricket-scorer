import React, { useState } from 'react';
import { RotateCcw, ArrowLeftRight, Zap, Clock } from 'lucide-react';
import { EXTRA_TYPES } from '../engine/constants.js';

export default function RunPad({
  onScoreBall,
  onOpenWicket,
  onSwapBatter,
  onUndo,
  isFreeHit,
  disabled,
  cooldownSeconds = 0,
  onSkipCooldown
}) {
  const [extraMode, setExtraMode] = useState(null);

  const isScoringDisabled = Boolean(disabled || cooldownSeconds > 0);

  const handleRunClick = (runs) => {
    if (isScoringDisabled) return;

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
    if (isScoringDisabled) return;
    if (extraMode === type) {
      setExtraMode(null);
      return;
    }
    setExtraMode(type);
  };

  return (
    <div className="flex flex-col gap-2 select-none touch-manipulation">
      {/* 10-Second Waiting Time / Cooldown Banner */}
      {cooldownSeconds > 0 && (
        <div
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: '#22C55E'
          }}
          className="px-3 py-2 rounded-xl border flex items-center justify-between shadow-sm animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#22C55E] animate-pulse shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                Next ball in <span className="font-mono text-[#22C55E] font-bold text-sm">{cooldownSeconds}s</span>
              </span>
              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                10-second waiting time active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-16 h-1.5 rounded-full bg-slate-700/30 overflow-hidden">
              <div
                style={{
                  width: `${(cooldownSeconds / 10) * 100}%`,
                  backgroundColor: '#22C55E',
                  transition: 'width 1s linear'
                }}
                className="h-full rounded-full"
              />
            </div>

            {onSkipCooldown && (
              <button
                type="button"
                onClick={onSkipCooldown}
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--muted)'
                }}
                className="px-2 py-0.5 rounded-md border text-[10px] font-semibold hover:text-[var(--text)] hover:border-[#22C55E] transition-all shrink-0"
                title="Skip waiting time"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      )}

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
      <div className={`grid grid-cols-6 gap-1.5 transition-opacity duration-200 ${isScoringDisabled ? 'opacity-50' : 'opacity-100'}`}>
        {/* 0 (DOT) */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleRunClick(0)}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--muted)'
          }}
          className="h-11 sm:h-12 rounded-xl border flex flex-col items-center justify-center font-bold text-xs active:scale-95 transition-all shadow-sm hover:border-[var(--primary)] disabled:cursor-not-allowed"
        >
          <span className="text-sm font-semibold">0</span>
          <span className="text-[8px] font-medium tracking-wider -mt-0.5">DOT</span>
        </button>

        {/* 1 */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleRunClick(1)}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
          className="h-11 sm:h-12 rounded-xl border flex items-center justify-center font-bold text-base active:scale-95 transition-all shadow-sm hover:border-[var(--primary)] disabled:cursor-not-allowed"
        >
          1
        </button>

        {/* 2 */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleRunClick(2)}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
          className="h-11 sm:h-12 rounded-xl border flex items-center justify-center font-bold text-base active:scale-95 transition-all shadow-sm hover:border-[var(--primary)] disabled:cursor-not-allowed"
        >
          2
        </button>

        {/* 3 */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleRunClick(3)}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
          className="h-11 sm:h-12 rounded-xl border flex items-center justify-center font-bold text-base active:scale-95 transition-all shadow-sm hover:border-[var(--primary)] disabled:cursor-not-allowed"
        >
          3
        </button>

        {/* 4 (FOUR) */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleRunClick(4)}
          style={{
            backgroundColor: 'var(--primary)',
            color: '#FFFFFF'
          }}
          className="h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center font-bold text-base active:scale-95 transition-all shadow-sm hover:brightness-105 disabled:cursor-not-allowed"
        >
          <span>4</span>
          <span className="text-[8px] font-semibold uppercase tracking-wider -mt-1 opacity-90">FOUR</span>
        </button>

        {/* 6 (SIX) */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleRunClick(6)}
          style={{
            backgroundColor: '#16A34A',
            color: '#FFFFFF'
          }}
          className="h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center font-bold text-base active:scale-95 transition-all shadow-sm hover:brightness-105 disabled:cursor-not-allowed"
        >
          <span>6</span>
          <span className="text-[8px] font-semibold uppercase tracking-wider -mt-1 opacity-90">SIX</span>
        </button>
      </div>

      {/* Row 2: WD, NB, BYE, LB, OUT */}
      <div className={`grid grid-cols-5 gap-1.5 transition-opacity duration-200 ${isScoringDisabled ? 'opacity-50' : 'opacity-100'}`}>
        {/* WD */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.WIDE)}
          style={{
            backgroundColor: extraMode === EXTRA_TYPES.WIDE ? 'var(--primary)' : 'var(--card-alt)',
            color: extraMode === EXTRA_TYPES.WIDE ? '#FFFFFF' : 'var(--text)',
            borderColor: extraMode === EXTRA_TYPES.WIDE ? 'var(--primary)' : 'var(--border)'
          }}
          className="h-10 sm:h-11 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm disabled:cursor-not-allowed"
        >
          <span>WD</span>
          <span className="text-[8px] font-medium opacity-80 -mt-0.5">WIDE</span>
        </button>

        {/* NB */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.NO_BALL)}
          style={{
            backgroundColor: extraMode === EXTRA_TYPES.NO_BALL ? 'var(--primary)' : 'var(--card-alt)',
            color: extraMode === EXTRA_TYPES.NO_BALL ? '#FFFFFF' : 'var(--text)',
            borderColor: extraMode === EXTRA_TYPES.NO_BALL ? 'var(--primary)' : 'var(--border)'
          }}
          className="h-10 sm:h-11 rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm disabled:cursor-not-allowed"
        >
          <span>NB</span>
          <span className="text-[8px] font-medium opacity-80 -mt-0.5">NO BALL</span>
        </button>

        {/* BYE */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.BYE)}
          style={{
            backgroundColor: extraMode === EXTRA_TYPES.BYE ? 'var(--primary)' : 'var(--card-alt)',
            color: extraMode === EXTRA_TYPES.BYE ? '#FFFFFF' : 'var(--text)',
            borderColor: 'var(--border)'
          }}
          className="h-10 sm:h-11 rounded-xl border text-[11px] font-semibold flex items-center justify-center active:scale-95 transition-all shadow-sm hover:border-[var(--primary)] disabled:cursor-not-allowed"
        >
          BYE
        </button>

        {/* LB */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.LEG_BYE)}
          style={{
            backgroundColor: extraMode === EXTRA_TYPES.LEG_BYE ? 'var(--primary)' : 'var(--card-alt)',
            color: extraMode === EXTRA_TYPES.LEG_BYE ? '#FFFFFF' : 'var(--text)',
            borderColor: extraMode === EXTRA_TYPES.LEG_BYE ? 'var(--primary)' : 'var(--border)'
          }}
          className="h-10 sm:h-11 rounded-xl border text-[11px] font-semibold flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm hover:border-[var(--primary)] disabled:cursor-not-allowed"
        >
          <span>LB</span>
          <span className="text-[7px] font-medium opacity-80 -mt-0.5">LEG BYE</span>
        </button>

        {/* OUT */}
        <button
          disabled={isScoringDisabled}
          onClick={onOpenWicket}
          style={{
            backgroundColor: 'var(--red)',
            color: '#FFFFFF'
          }}
          className="h-10 sm:h-11 rounded-xl flex items-center justify-center gap-1 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all shadow-sm hover:brightness-110 disabled:cursor-not-allowed"
        >
          <Zap className="w-3.5 h-3.5 fill-white text-white" />
          <span>OUT</span>
        </button>
      </div>

      {/* Row 3: Swap Batter & Undo (Always available during cooldown so mistakes can be undone immediately) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onSwapBatter}
          disabled={disabled}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
          className="py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-sm hover:border-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-sm hover:border-[var(--red)] hover:text-[var(--red)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Undo Ball</span>
        </button>
      </div>
    </div>
  );
}
