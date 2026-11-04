import React, { useState } from 'react';
import { RotateCcw, ArrowLeftRight, Zap, Clock, CornerUpRight } from 'lucide-react';
import { EXTRA_TYPES } from '../engine/constants.js';

const triggerHaptic = (ms = 12) => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('setting_haptics') === 'false') {
      return;
    }
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  } catch (_) {
    // Graceful no-op on unsupported browsers / permissions
  }
};

export default function RunPad({
  onScoreBall,
  onOpenWicket,
  onOpenOverthrow,
  onSwapBatter,
  onUndo,
  isFreeHit,
  disabled,
  cooldownSeconds = 0,
  onSkipCooldown
}) {
  const [extraMode, setExtraMode] = useState(null);
  const isLeftHanded = typeof localStorage !== 'undefined' && localStorage.getItem('setting_left_handed') === 'true';

  const isScoringDisabled = Boolean(disabled || cooldownSeconds > 0);

  const handleRunClick = (runs) => {
    if (isScoringDisabled) return;
    triggerHaptic(12);

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
        extraRuns: runs,
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
    triggerHaptic(10);
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
            backgroundColor: 'var(--well)',
            borderColor: 'var(--ok)'
          }}
          className="px-3.5 py-2 rounded-2xl border flex items-center justify-between shadow-sm animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--ok)] animate-pulse shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold" style={{ color: 'var(--t1)' }}>
                Next ball in <span className="font-mono text-[var(--ok)] font-extrabold text-sm">{cooldownSeconds}s</span>
              </span>
              <span className="text-[10px]" style={{ color: 'var(--t2)' }}>
                10-second waiting time active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-16 h-1.5 rounded-full bg-[var(--bd)] overflow-hidden">
              <div
                style={{
                  width: `${(cooldownSeconds / 10) * 100}%`,
                  backgroundColor: 'var(--ok)',
                  transition: 'width 1s linear'
                }}
                className="h-full rounded-full"
              />
            </div>

            {onSkipCooldown && (
              <button
                type="button"
                onClick={onSkipCooldown}
                className="btn s"
                style={{ height: '26px', padding: '0 8px', fontSize: '10px' }}
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
            backgroundColor: 'color-mix(in srgb, var(--pri) 14%, transparent)',
            borderColor: 'var(--bda)',
            color: 'var(--pri)'
          }}
          className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between animate-pulse"
        >
          <span>Active: {extraMode.toUpperCase()} — Tap runs (0 to 6)</span>
          <button
            onClick={() => setExtraMode(null)}
            className="text-[10px] uppercase font-extrabold underline ml-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Free Hit Banner */}
      {isFreeHit && (
        <div
          style={{
            backgroundColor: 'color-mix(in srgb, var(--ok) 14%, transparent)',
            borderColor: 'var(--ok)',
            color: 'var(--ok)'
          }}
          className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <Zap className="w-4 h-4 text-[var(--ok)] animate-bounce" />
          <span>FREE HIT BALL</span>
        </div>
      )}

      {/* Main 4-Column Keypad */}
      <div
        className={`pad ${isScoringDisabled ? 'opacity-50' : 'opacity-100'}`}
        style={isLeftHanded ? { direction: 'rtl' } : undefined}
      >
        {/* 0 (DOT) */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleRunClick(0)}
          aria-label="0 runs dot"
          title="0 runs (Keyboard: 0)"
        >
          <span style={{ fontSize: '18px' }}>0</span>
        </button>

        {/* 1 */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleRunClick(1)}
          aria-label="1 run"
          title="1 run (Keyboard: 1)"
        >
          1
        </button>

        {/* 2 */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleRunClick(2)}
          aria-label="2 runs"
          title="2 runs (Keyboard: 2)"
        >
          2
        </button>

        {/* 3 */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleRunClick(3)}
          aria-label="3 runs"
          title="3 runs (Keyboard: 3)"
        >
          3
        </button>

        {/* 4 (FOUR) */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleRunClick(4)}
          className="f"
          aria-label="4 runs boundary"
          title="4 runs boundary (Keyboard: 4)"
        >
          4
        </button>

        {/* 6 (SIX) */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleRunClick(6)}
          className="f"
          aria-label="6 runs maximum"
          title="6 runs maximum (Keyboard: 6)"
        >
          6
        </button>

        {/* WD */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.WIDE)}
          className={`e ${extraMode === EXTRA_TYPES.WIDE ? '!bg-[var(--pri)] !text-[var(--onpri)]' : ''}`}
          aria-label="Wide"
          title="Wide delivery"
        >
          WD
        </button>

        {/* NB */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.NO_BALL)}
          className={`e ${extraMode === EXTRA_TYPES.NO_BALL ? '!bg-[var(--pri)] !text-[var(--onpri)]' : ''}`}
          aria-label="No ball"
          title="No ball delivery"
        >
          NB
        </button>

        {/* BYE */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.BYE)}
          className={`e ${extraMode === EXTRA_TYPES.BYE ? '!bg-[var(--pri)] !text-[var(--onpri)]' : ''}`}
          aria-label="Bye"
          title="Bye runs"
        >
          BYE
        </button>

        {/* LB */}
        <button
          disabled={isScoringDisabled}
          onClick={() => handleQuickExtra(EXTRA_TYPES.LEG_BYE)}
          className={`e ${extraMode === EXTRA_TYPES.LEG_BYE ? '!bg-[var(--pri)] !text-[var(--onpri)]' : ''}`}
          aria-label="Leg bye"
          title="Leg bye runs"
        >
          LB
        </button>

        {/* OUT (WICKET) */}
        <button
          disabled={isScoringDisabled}
          onClick={() => {
            triggerHaptic(20);
            onOpenWicket();
          }}
          className="w"
          aria-label="Wicket Out"
          title="Wicket Out (Keyboard: W)"
        >
          <Zap className="w-4 h-4 fill-current inline mr-1" />
          OUT
        </button>

        {/* Undo Ball */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(15);
            onUndo();
          }}
          disabled={disabled}
          className="e"
          aria-label="Undo last ball"
          title="Undo last ball (Keyboard: U)"
        >
          <RotateCcw className="w-4 h-4 inline mr-1" />
          Undo
        </button>
      </div>

      {/* Auxiliary Controls: Overthrow & Swap Batter */}
      <div className="grid grid-cols-2 gap-2 mt-0.5">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            onOpenOverthrow();
          }}
          disabled={isScoringDisabled}
          className="btn s"
          style={{ width: '100%', height: '40px', borderRadius: '12px', fontSize: '12px' }}
          title="Record Overthrow (Runs ran + Overthrow runs)"
        >
          <CornerUpRight className="w-3.5 h-3.5 text-[var(--pri)]" />
          <span>+OT Overthrow</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            onSwapBatter();
          }}
          disabled={disabled}
          className="btn s"
          style={{ width: '100%', height: '40px', borderRadius: '12px', fontSize: '12px' }}
          title="Swap Striker and Non-Striker (Keyboard: Space or S)"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--pri)]" />
          <span>Swap Batter</span>
        </button>
      </div>
    </div>
  );
}
