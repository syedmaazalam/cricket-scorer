import React, { useState } from 'react';
import { RotateCcw, ArrowLeftRight, ShieldAlert, Users, Clock } from 'lucide-react';
import { EXTRA_TYPES } from '../engine/constants.js';

export default function RunPad({
  onScoreBall,
  onOpenWicket,
  onSwapBatter,
  onUndo,
  onOpenTimeDeclare,
  onOpenSquad,
  isFreeHit,
  disabled
}) {
  const [extraMode, setExtraMode] = useState(null); // 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null

  // 1-tap run handler
  const handleRunClick = (runs) => {
    if (disabled) return;

    if (!extraMode) {
      onScoreBall({
        runs,
        extraType: null,
        extraRuns: 0,
        isWicket: false
      });
    } else if (extraMode === EXTRA_TYPES.WIDE) {
      onScoreBall({
        runs: 0,
        extraType: EXTRA_TYPES.WIDE,
        extraRuns: runs,
        isWicket: false
      });
      setExtraMode(null);
    } else if (extraMode === EXTRA_TYPES.NO_BALL) {
      onScoreBall({
        runs,
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

  const handleQuickExtra = (type) => {
    if (disabled) return;
    setExtraMode(extraMode === type ? null : type);
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)'
      }}
      className="w-full border-t p-3 sm:p-4 pb-6 flex flex-col gap-2.5 shadow-lg backdrop-blur-md rounded-t-3xl"
    >
      {/* Free Hit Banner */}
      {isFreeHit && (
        <div
          style={{
            backgroundColor: 'color-mix(in srgb, var(--orange) 20%, transparent)',
            borderColor: 'var(--orange)',
            color: 'var(--orange)'
          }}
          className="flex items-center justify-center gap-2 border rounded-xl py-1.5 px-3 font-bold text-xs tracking-wider uppercase animate-pulse"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>FREE HIT DELIVERY — No dismissal except Run Out</span>
        </div>
      )}

      {/* Extra selection prompt */}
      {extraMode && (
        <div
          style={{
            backgroundColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
            borderColor: 'var(--primary)',
            color: 'var(--text)'
          }}
          className="flex items-center justify-between border rounded-xl px-3 py-1.5 text-xs font-semibold"
        >
          <span>
            Select additional runs for <strong className="uppercase" style={{ color: 'var(--orange)' }}>{extraMode.replace('_', ' ')}</strong>:
          </span>
          <button
            onClick={() => setExtraMode(null)}
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}
            className="text-xs px-2 py-0.5 rounded-lg border font-bold hover:text-[var(--text)]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Row 1: 0 (DOT), 1, 2, 3, 4 (FOUR), 6 (SIX) - Matching Image */}
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {/* DOT */}
        <button
          disabled={disabled}
          onClick={() => handleRunClick(0)}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
          className="h-16 rounded-2xl border flex flex-col items-center justify-center font-black text-xl active:scale-95 transition-all shadow-sm group hover:border-[var(--primary)]"
        >
          <span className="w-2.5 h-2.5 rounded-full mb-1" style={{ backgroundColor: 'var(--muted)' }} />
          <span className="text-[10px] font-bold" style={{ color: 'var(--muted)' }}>DOT</span>
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
          className="h-16 rounded-2xl border flex items-center justify-center font-black text-2xl active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
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
          className="h-16 rounded-2xl border flex items-center justify-center font-black text-2xl active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
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
          className="h-16 rounded-2xl border flex items-center justify-center font-black text-2xl active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
        >
          3
        </button>

        {/* 4 (FOUR) - Blue accent card matching Image */}
        <button
          disabled={disabled}
          onClick={() => handleRunClick(4)}
          style={{
            backgroundColor: 'var(--blue)',
            color: '#FFFFFF'
          }}
          className="h-16 rounded-2xl flex flex-col items-center justify-center font-black text-2xl active:scale-95 transition-all shadow-md shadow-[var(--blue)]/30 hover:brightness-110"
        >
          <span>4</span>
          <span className="text-[9px] font-black uppercase tracking-wider -mt-1 opacity-90">FOUR</span>
        </button>

        {/* 6 (SIX) - Purple accent card matching Image */}
        <button
          disabled={disabled}
          onClick={() => handleRunClick(6)}
          style={{
            backgroundColor: 'var(--purple)',
            color: '#FFFFFF'
          }}
          className="h-16 rounded-2xl flex flex-col items-center justify-center font-black text-2xl active:scale-95 transition-all shadow-md shadow-[var(--purple)]/30 hover:brightness-110"
        >
          <span>6</span>
          <span className="text-[9px] font-black uppercase tracking-wider -mt-1 opacity-90">SIX</span>
        </button>
      </div>

      {/* Row 2: WD, NB, BYE, LB, OUT - Matching Image */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {/* WD WIDE */}
        <button
          disabled={disabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.WIDE)}
          style={{
            backgroundColor: extraMode === EXTRA_TYPES.WIDE ? 'var(--orange)' : 'var(--card-alt)',
            color: extraMode === EXTRA_TYPES.WIDE ? '#FFFFFF' : 'var(--orange)',
            borderColor: 'var(--orange)'
          }}
          className="h-12 rounded-2xl border text-xs font-black flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm"
        >
          <span>WD</span>
          <span className="text-[8px] font-bold opacity-80 -mt-0.5">WIDE</span>
        </button>

        {/* NB NO BALL */}
        <button
          disabled={disabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.NO_BALL)}
          style={{
            backgroundColor: extraMode === EXTRA_TYPES.NO_BALL ? 'var(--orange)' : 'var(--card-alt)',
            color: extraMode === EXTRA_TYPES.NO_BALL ? '#FFFFFF' : 'var(--orange)',
            borderColor: 'var(--orange)'
          }}
          className="h-12 rounded-2xl border text-xs font-black flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm"
        >
          <span>NB</span>
          <span className="text-[8px] font-bold opacity-80 -mt-0.5">NO BALL</span>
        </button>

        {/* BYE */}
        <button
          disabled={disabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.BYE)}
          style={{
            backgroundColor: extraMode === EXTRA_TYPES.BYE ? 'var(--primary)' : 'var(--card-alt)',
            color: extraMode === EXTRA_TYPES.BYE ? '#FFFFFF' : 'var(--text)',
            borderColor: 'var(--border)'
          }}
          className="h-12 rounded-2xl border text-xs font-bold flex items-center justify-center active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
        >
          BYE
        </button>

        {/* LB LEG BYE */}
        <button
          disabled={disabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.LEG_BYE)}
          style={{
            backgroundColor: extraMode === EXTRA_TYPES.LEG_BYE ? 'var(--primary)' : 'var(--card-alt)',
            color: extraMode === EXTRA_TYPES.LEG_BYE ? '#FFFFFF' : 'var(--text)',
            borderColor: 'var(--border)'
          }}
          className="h-12 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
        >
          <span>LB</span>
          <span className="text-[8px] font-bold opacity-80 -mt-0.5">LEG BYE</span>
        </button>

        {/* OUT (Wicket) - Red Card matching Image */}
        <button
          disabled={disabled}
          onClick={onOpenWicket}
          style={{
            backgroundColor: 'var(--red)',
            color: '#FFFFFF'
          }}
          className="h-12 rounded-2xl flex items-center justify-center gap-1 font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-[var(--red)]/30 hover:brightness-110"
        >
          <span>⚡</span>
          <span>OUT</span>
        </button>
      </div>

      {/* Row 3: Swap Batter & Undo (Matching Image layout) */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <button
          onClick={onSwapBatter}
          disabled={disabled}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--text)'
          }}
          className="h-11 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm hover:border-[var(--primary)]"
        >
          <ArrowLeftRight className="w-4 h-4" style={{ color: 'var(--blue)' }} />
          <span>Swap Batter</span>
        </button>

        <button
          onClick={onUndo}
          disabled={disabled}
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--orange)',
            color: 'var(--text)'
          }}
          className="h-11 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm hover:border-[var(--orange)]"
        >
          <RotateCcw className="w-4 h-4" style={{ color: 'var(--orange)' }} />
          <span>Undo Last Ball</span>
        </button>
      </div>

      {/* Row 4: Advanced Match Controls: Time Declare & Squad / Edit Players */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onOpenTimeDeclare}
          disabled={disabled}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--orange) 10%, var(--card-alt))',
            borderColor: 'var(--border)',
            color: 'var(--orange)'
          }}
          className="h-10 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all hover:border-[var(--orange)]"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Time Declare / Retire</span>
        </button>

        <button
          onClick={onOpenSquad}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--primary) 10%, var(--card-alt))',
            borderColor: 'var(--border)',
            color: 'var(--primary)'
          }}
          className="h-10 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all hover:border-[var(--primary)]"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Squad & Edit Players</span>
        </button>
      </div>
    </div>
  );
}
