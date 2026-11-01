import React, { useState } from 'react';
import { X, CornerUpRight, Check, AlertCircle } from 'lucide-react';
import { EXTRA_TYPES } from '../engine/constants.js';

export default function OverthrowModal({
  isOpen,
  onClose,
  onScoreBall,
  striker,
  nonStriker,
  currentBowler
}) {
  const [deliveryType, setDeliveryType] = useState('OFF_BAT'); // 'OFF_BAT' | 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE'
  const [runsRan, setRunsRan] = useState(1);
  const [overthrowRuns, setOverthrowRuns] = useState(4);

  if (!isOpen) return null;

  // Calculate total runs and attribution
  const physicalRuns = runsRan + overthrowRuns;
  const isSwap = physicalRuns % 2 === 1;

  let totalScore = physicalRuns;
  let batterRuns = 0;
  let extraType = null;
  let extraRuns = 0;

  if (deliveryType === 'OFF_BAT') {
    batterRuns = physicalRuns;
    extraType = null;
    extraRuns = 0;
    totalScore = physicalRuns;
  } else if (deliveryType === 'WIDE') {
    batterRuns = 0;
    extraType = EXTRA_TYPES.WIDE;
    extraRuns = physicalRuns; // Additional runs on wide
    totalScore = 1 + physicalRuns;
  } else if (deliveryType === 'NO_BALL') {
    batterRuns = physicalRuns;
    extraType = EXTRA_TYPES.NO_BALL;
    extraRuns = 1; // 1 penalty for no-ball
    totalScore = 1 + physicalRuns;
  } else if (deliveryType === 'BYE') {
    batterRuns = 0;
    extraType = EXTRA_TYPES.BYE;
    extraRuns = physicalRuns;
    totalScore = physicalRuns;
  } else if (deliveryType === 'LEG_BYE') {
    batterRuns = 0;
    extraType = EXTRA_TYPES.LEG_BYE;
    extraRuns = physicalRuns;
    totalScore = physicalRuns;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onScoreBall({
      runs: batterRuns,
      extraType,
      extraRuns,
      isOverthrow: true,
      overthrowRuns,
      runsRan,
      isWicket: false
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-md rounded-3xl border p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400">
              <CornerUpRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Record Overthrow Delivery</h3>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                Fielding error conceded additional runs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          {/* 1. Delivery Type Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold tracking-wide" style={{ color: 'var(--muted)' }}>
              1. Delivery Type
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'OFF_BAT', label: 'Off Bat' },
                { id: 'WIDE', label: 'Wide' },
                { id: 'NO_BALL', label: 'No Ball' },
                { id: 'BYE', label: 'Bye' },
                { id: 'LEG_BYE', label: 'Leg Bye' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDeliveryType(opt.id)}
                  style={{
                    backgroundColor: deliveryType === opt.id ? 'var(--primary)' : 'var(--card-alt)',
                    color: deliveryType === opt.id ? '#FFFFFF' : 'var(--text)',
                    borderColor: deliveryType === opt.id ? 'var(--primary)' : 'var(--border)'
                  }}
                  className="py-2 px-1 rounded-xl border text-[11px] font-bold text-center active:scale-95 transition-all shadow-sm"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Runs Ran Before Throw */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold tracking-wide" style={{ color: 'var(--muted)' }}>
                2. Runs Completed Before Throw
              </label>
              <span className="font-bold text-blue-400">{runsRan} ran</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRunsRan(r)}
                  style={{
                    backgroundColor: runsRan === r ? '#2563EB' : 'var(--card-alt)',
                    color: runsRan === r ? '#FFFFFF' : 'var(--text)',
                    borderColor: runsRan === r ? '#2563EB' : 'var(--border)'
                  }}
                  className="py-2.5 rounded-xl border text-xs font-bold text-center active:scale-95 transition-all shadow-sm"
                >
                  {r === 0 ? '0 (None)' : `${r} run${r > 1 ? 's' : ''}`}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Overthrow Runs Conceded */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold tracking-wide" style={{ color: 'var(--muted)' }}>
                3. Overthrow Runs Conceded
              </label>
              <span className="font-bold text-amber-400">{overthrowRuns} overthrow</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((ot) => (
                <button
                  key={ot}
                  type="button"
                  onClick={() => setOverthrowRuns(ot)}
                  style={{
                    backgroundColor: overthrowRuns === ot ? 'var(--orange)' : 'var(--card-alt)',
                    color: overthrowRuns === ot ? '#FFFFFF' : 'var(--text)',
                    borderColor: overthrowRuns === ot ? 'var(--orange)' : 'var(--border)'
                  }}
                  className="py-2.5 rounded-xl border text-xs font-bold text-center active:scale-95 transition-all shadow-sm"
                >
                  {ot === 4 ? '+4 (Bdry)' : `+${ot}`}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Breakdown Card */}
          <div
            style={{
              backgroundColor: 'var(--card-alt)',
              borderColor: 'var(--border)'
            }}
            className="p-3.5 rounded-2xl border flex flex-col gap-2"
          >
            <div className="flex items-center justify-between text-xs pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="font-semibold" style={{ color: 'var(--muted)' }}>Total Runs Conceded:</span>
              <span className="font-black text-sm text-[#22C55E]">
                {totalScore} Runs ({runsRan} Ran + {overthrowRuns} Overthrow{deliveryType === 'WIDE' || deliveryType === 'NO_BALL' ? ' + 1 Extra' : ''})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span style={{ color: 'var(--muted)' }}>Credited to Batter: </span>
                <strong style={{ color: batterRuns > 0 ? '#22C55E' : 'var(--muted)' }}>
                  {batterRuns} runs
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--muted)' }}>Extras: </span>
                <strong style={{ color: extraRuns > 0 || deliveryType === 'WIDE' ? 'var(--orange)' : 'var(--muted)' }}>
                  {totalScore - batterRuns} runs
                </strong>
              </div>
              <div className="col-span-2 flex items-center gap-1.5 pt-1 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span style={{ color: 'var(--text)' }}>
                  {isSwap
                    ? `Batters swap ends (Odd total ran: ${physicalRuns})`
                    : `Batters stay at same ends (Even total ran: ${physicalRuns})`}
                </span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--muted)'
              }}
              className="flex-1 py-2.5 rounded-xl border font-bold hover:text-[var(--text)] transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF'
              }}
              className="flex-2 py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-98 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Record {totalScore} Runs Overthrow</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
