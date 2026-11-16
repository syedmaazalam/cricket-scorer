import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { WICKET_TYPES } from '../engine/constants.js';
import { isWicketValidOnFreeHit } from '../engine/rules.js';

export default function WicketModal({
  isOpen,
  onClose,
  striker,
  nonStriker,
  bowler,
  bowlingTeamPlayers = [],
  availableBatters = [],
  isFreeHit,
  onConfirmWicket
}) {
  const [wicketType, setWicketType] = useState(() => (isFreeHit ? WICKET_TYPES.RUN_OUT : WICKET_TYPES.CAUGHT));
  const [playerOut, setPlayerOut] = useState(striker);
  const [fielder, setFielder] = useState('');
  const [isDirectHit, setIsDirectHit] = useState(false);
  const [nextBatter, setNextBatter] = useState('');

  const modalRef = useRef(null);

  // Bug 25: Free hit clears "Caught" as default and auto-selects "Run Out"
  useEffect(() => {
    if (isOpen) {
      if (isFreeHit) {
        setWicketType(WICKET_TYPES.RUN_OUT);
      } else {
        setWicketType(WICKET_TYPES.CAUGHT);
      }
      setPlayerOut(striker);
      setFielder('');
      setIsDirectHit(false);
      setNextBatter('');
    }
  }, [isOpen, isFreeHit, striker]);

  // Bug 40: Esc closes modal and trap focus inside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Validation
  const isCaughtWithoutFielder = wicketType === WICKET_TYPES.CAUGHT && !fielder;
  // Bug 25: Disable Confirm Wicket until a valid dismissal (Run Out / Retired Out) is chosen on Free Hit
  const isInvalidFreeHitDismissal = isFreeHit && !isWicketValidOnFreeHit(wicketType);
  const isSubmitDisabled = isCaughtWithoutFielder || isInvalidFreeHitDismissal;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitDisabled) {
      return;
    }
    const directHit = wicketType === WICKET_TYPES.RUN_OUT ? Boolean(isDirectHit) : false;
    onConfirmWicket({
      runs: 0,
      extraType: null,
      extraRuns: 0,
      isWicket: true,
      wicket: {
        type: wicketType,
        playerOut: playerOut || striker,
        fielder: fielder || null,
        isDirectHit: directHit,
        bowler
      },
      wicketType,
      dismissedPlayer: playerOut || striker,
      fielder: fielder || null,
      isDirectHit: directHit,
      nextBatter: nextBatter || null
    });
    onClose();
  };

  const dismissalTypes = [
    { id: WICKET_TYPES.BOWLED, label: 'Bowled' },
    { id: WICKET_TYPES.CAUGHT, label: 'Caught' },
    { id: WICKET_TYPES.LBW, label: 'LBW' },
    { id: WICKET_TYPES.RUN_OUT, label: 'Run Out' },
    { id: WICKET_TYPES.STUMPED, label: 'Stumped' },
    { id: WICKET_TYPES.HIT_WICKET, label: 'Hit Wicket' },
    { id: WICKET_TYPES.RETIRED_OUT, label: 'Retired Out' },
    { id: WICKET_TYPES.RETIRED_HURT, label: 'Retired Hurt' }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3"
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-wicket-title"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-md border rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 focus-visible:outline-none"
      >
        <div style={{ borderColor: 'var(--border)' }} className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <h3 id="record-wicket-title" className="font-black text-lg" style={{ color: 'var(--text)' }}>
              Record Wicket
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'var(--muted)' }}
            className="p-1 rounded-full hover:opacity-80 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isFreeHit && (
          <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-500 font-semibold animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Free hit active: Only Run Out / Retired Out is a valid dismissal.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Who is out? */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--muted)' }}>
              Player Dismissed
            </label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Player Dismissed">
              <button
                type="button"
                role="radio"
                aria-checked={playerOut === striker}
                onClick={() => setPlayerOut(striker)}
                style={{
                  backgroundColor: playerOut === striker ? 'rgba(225, 29, 72, 0.15)' : 'var(--card-alt)',
                  borderColor: playerOut === striker ? '#e11d48' : 'var(--border)',
                  color: playerOut === striker ? '#e11d48' : 'var(--text)'
                }}
                className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none ${
                  playerOut === striker ? 'ring-2 ring-rose-500 font-bold' : ''
                }`}
              >
                {striker} <span className="text-[10px] block opacity-70">(Striker)</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={playerOut === nonStriker}
                onClick={() => setPlayerOut(nonStriker)}
                style={{
                  backgroundColor: playerOut === nonStriker ? 'rgba(225, 29, 72, 0.15)' : 'var(--card-alt)',
                  borderColor: playerOut === nonStriker ? '#e11d48' : 'var(--border)',
                  color: playerOut === nonStriker ? '#e11d48' : 'var(--text)'
                }}
                className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none ${
                  playerOut === nonStriker ? 'ring-2 ring-rose-500 font-bold' : ''
                }`}
              >
                {nonStriker} <span className="text-[10px] block opacity-70">(Non-Striker)</span>
              </button>
            </div>
          </div>

          {/* Dismissal Type - Bug 27: The clicked dismissal pill highlights and others un-highlight */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--muted)' }}>
              Dismissal Type
            </label>
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Dismissal Type">
              {dismissalTypes.map(({ id, label }) => {
                const isSelected = wicketType === id;
                const isBlockedByFreeHit = isFreeHit && !isWicketValidOnFreeHit(id);
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isBlockedByFreeHit}
                    onClick={() => setWicketType(id)}
                    style={{
                      backgroundColor: isSelected ? 'var(--primary)' : 'var(--card-alt)',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                      color: isSelected ? '#FFFFFF' : 'var(--text)'
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:outline-none ${
                      isSelected ? 'shadow-md shadow-rose-900/50 ring-2 ring-rose-500 font-bold scale-[1.02]' : 'hover:opacity-85'
                    } ${isBlockedByFreeHit ? 'opacity-30 cursor-not-allowed line-through' : ''}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {isInvalidFreeHitDismissal && (
              <span className="text-[11px] text-amber-500 font-semibold mt-1.5 block">
                Please select Run Out or Retired Out (only valid dismissals on Free Hit).
              </span>
            )}
          </div>

          {/* Fielder Selector (if caught / run out / stumped) */}
          {[WICKET_TYPES.CAUGHT, WICKET_TYPES.RUN_OUT, WICKET_TYPES.STUMPED].includes(wicketType) && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--muted)' }}>
                Fielder
              </label>
              <select
                value={fielder}
                onChange={(e) => setFielder(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: (wicketType === WICKET_TYPES.CAUGHT && !fielder) ? 'var(--red)' : 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <option value="">Select fielder / wicketkeeper</option>
                {bowlingTeamPlayers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {wicketType === WICKET_TYPES.CAUGHT && !fielder && (
                <span className="text-[11px] text-red-500 font-semibold mt-1 block">
                  Please select the fielder who took the catch.
                </span>
              )}
            </div>
          )}

          {/* Direct Hit Toggle (Run Out only) */}
          {wicketType === WICKET_TYPES.RUN_OUT && (
            <label
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              className="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-xs font-semibold hover:opacity-90 transition-colors focus-within:ring-2 focus-within:ring-rose-500"
            >
              <input
                type="checkbox"
                checked={isDirectHit}
                onChange={(e) => setIsDirectHit(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span>Direct Hit Run-out (awards +12 pts instead of +6 pts)</span>
            </label>
          )}

          {/* Next Batter Selector */}
          {availableBatters.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--muted)' }}>
                Incoming Batter (Optional - can choose later)
              </label>
              <select
                value={nextBatter}
                onChange={(e) => setNextBatter(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <option value="">Choose next batter</option>
                {availableBatters.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: 'var(--card-alt)',
                color: 'var(--text)',
                borderColor: 'var(--border)'
              }}
              className="flex-1 py-3 rounded-2xl border font-semibold text-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 text-white font-bold text-sm shadow-lg shadow-rose-900/40 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none ${
                isSubmitDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Confirm Wicket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
