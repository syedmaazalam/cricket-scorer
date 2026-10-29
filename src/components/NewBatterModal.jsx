import React from 'react';
import { UserPlus } from 'lucide-react';

export default function NewBatterModal({
  isOpen,
  vacantSlot,
  availableBatters = [],
  onSelectBatter
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-3">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
            <h3 className="font-black text-lg text-white">Select Incoming Batter</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Wicket fell. Choose who comes in to bat at {vacantSlot === 'nonStriker' ? "Non-Striker's end" : "Striker's end"}.
          </p>
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {availableBatters.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No more batters remaining on bench.</p>
          ) : (
            availableBatters.map((batter) => (
              <button
                key={batter}
                onClick={() => onSelectBatter(batter, vacantSlot)}
                className="w-full py-3 px-4 rounded-2xl flex items-center justify-between text-left font-bold text-sm bg-slate-800 hover:bg-cyan-600/20 text-white border border-slate-700/80 hover:border-cyan-500 transition-all active:scale-98"
              >
                <span>{batter}</span>
                <UserPlus className="w-4 h-4 text-cyan-400" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
