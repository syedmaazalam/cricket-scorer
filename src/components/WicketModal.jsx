import React, { useState } from 'react';
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
  const [wicketType, setWicketType] = useState(WICKET_TYPES.CAUGHT);
  const [playerOut, setPlayerOut] = useState(striker);
  const [fielder, setFielder] = useState('');
  const [nextBatter, setNextBatter] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirmWicket({
      runs: 0,
      extraType: null,
      extraRuns: 0,
      isWicket: true,
      wicket: {
        type: wicketType,
        playerOut: playerOut || striker,
        fielder: fielder || null,
        bowler
      },
      wicketType,
      dismissedPlayer: playerOut || striker,
      fielder: fielder || null,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <h3 className="font-black text-lg text-white">Record Wicket</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isFreeHit && (
          <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Free hit active: Only Run Out / Retired Out is a valid dismissal.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Who is out? */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Player Dismissed
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlayerOut(striker)}
                className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                  playerOut === striker
                    ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {striker} <span className="text-[10px] text-slate-400 block">(Striker)</span>
              </button>

              <button
                type="button"
                onClick={() => setPlayerOut(nonStriker)}
                className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                  playerOut === nonStriker
                    ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {nonStriker} <span className="text-[10px] text-slate-400 block">(Non-Striker)</span>
              </button>
            </div>
          </div>

          {/* Dismissal Type */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Dismissal Type
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {dismissalTypes.map(({ id, label }) => {
                const isBlockedByFreeHit = isFreeHit && !isWicketValidOnFreeHit(id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={isBlockedByFreeHit}
                    onClick={() => setWicketType(id)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      wicketType === id
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/50'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    } ${isBlockedByFreeHit ? 'opacity-30 cursor-not-allowed line-through' : ''}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fielder Selector (if caught / run out / stumped) */}
          {[WICKET_TYPES.CAUGHT, WICKET_TYPES.RUN_OUT, WICKET_TYPES.STUMPED].includes(wicketType) && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Fielder
              </label>
              <select
                value={fielder}
                onChange={(e) => setFielder(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">Select fielder / wicketkeeper</option>
                {bowlingTeamPlayers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* Next Batter Selector */}
          {availableBatters.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Incoming Batter (Optional - can choose later)
              </label>
              <select
                value={nextBatter}
                onChange={(e) => setNextBatter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
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
              className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 text-white font-bold text-sm shadow-lg shadow-rose-900/40 hover:brightness-110"
            >
              Confirm Wicket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
