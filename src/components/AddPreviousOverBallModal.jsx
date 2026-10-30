import React, { useState } from 'react';
import { X, Plus, RotateCcw } from 'lucide-react';
import { EXTRA_TYPES, WICKET_TYPES } from '../engine/constants.js';

export default function AddPreviousOverBallModal({
  isOpen,
  onClose,
  previousBowler,
  striker,
  nonStriker,
  onAddBall,
  onReopenOver
}) {
  const [runs, setRuns] = useState(0);
  const [extraType, setExtraType] = useState(null);
  const [isWicket, setIsWicket] = useState(false);
  const [wicketType, setWicketType] = useState(WICKET_TYPES.BOWLED);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddBall({
      runs: extraType === EXTRA_TYPES.WIDE ? 0 : runs,
      extraType,
      extraRuns: extraType === EXTRA_TYPES.BYE || extraType === EXTRA_TYPES.LEG_BYE ? runs : 0,
      isWicket,
      wicketType: isWicket ? wicketType : null,
      dismissedPlayer: striker,
      striker,
      bowler: previousBowler
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-sm rounded-3xl border p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5"
      >
        <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--orange)' }} />
            <h3 className="font-black text-sm uppercase tracking-wider">Add Ball to Previous Over</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between py-1 px-2.5 rounded-xl border" style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}>
            <span style={{ color: 'var(--muted)' }}>Bowler:</span>
            <strong style={{ color: 'var(--blue)' }}>{previousBowler || 'Previous Bowler'}</strong>
          </div>

          {/* Runs */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--muted)' }}>
              Runs Scored
            </label>
            <div className="grid grid-cols-6 gap-1">
              {[0, 1, 2, 3, 4, 6].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRuns(r)}
                  style={{
                    backgroundColor: runs === r ? 'var(--primary)' : 'var(--card-alt)',
                    color: runs === r ? '#FFFFFF' : 'var(--text)',
                    borderColor: 'var(--border)'
                  }}
                  className="h-9 rounded-xl border font-black text-sm flex items-center justify-center active:scale-95 transition-all"
                >
                  {r === 0 ? 'DOT' : r}
                </button>
              ))}
            </div>
          </div>

          {/* Extra Type */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--muted)' }}>
              Extra Type (Optional)
            </label>
            <div className="grid grid-cols-5 gap-1 text-[11px] font-bold">
              {[
                { label: 'None', val: null },
                { label: 'WD', val: EXTRA_TYPES.WIDE },
                { label: 'NB', val: EXTRA_TYPES.NO_BALL },
                { label: 'BYE', val: EXTRA_TYPES.BYE },
                { label: 'LB', val: EXTRA_TYPES.LEG_BYE }
              ].map(({ label, val }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setExtraType(val)}
                  style={{
                    backgroundColor: extraType === val ? 'var(--orange)' : 'var(--card-alt)',
                    color: extraType === val ? '#FFFFFF' : 'var(--text)',
                    borderColor: 'var(--border)'
                  }}
                  className="h-8 rounded-xl border flex items-center justify-center active:scale-95 transition-all"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Wicket checkbox */}
          <div className="flex items-center gap-2 pt-0.5">
            <input
              type="checkbox"
              id="isWicketPrev"
              checked={isWicket}
              onChange={(e) => setIsWicket(e.target.checked)}
              className="w-4 h-4 rounded text-rose-500 focus:ring-0"
            />
            <label htmlFor="isWicketPrev" className="font-bold cursor-pointer" style={{ color: isWicket ? 'var(--red)' : 'var(--text)' }}>
              A wicket fell on this delivery
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="submit"
              style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
              className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Delivery to Previous Over</span>
            </button>

            {onReopenOver && (
              <button
                type="button"
                onClick={() => {
                  onReopenOver();
                  onClose();
                }}
                style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--orange)' }}
                className="w-full py-2 rounded-xl font-bold border flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen Previous Over Instead</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
