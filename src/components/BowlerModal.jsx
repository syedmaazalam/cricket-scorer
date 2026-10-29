import React from 'react';
import { UserCheck, AlertCircle } from 'lucide-react';

export default function BowlerModal({
  isOpen,
  bowlers = [],
  previousBowler,
  onSelectBowler
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-3">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
            <h3 className="font-black text-lg text-white">Over Complete — Select Next Bowler</h3>
          </div>
          {previousBowler && (
            <p className="text-xs text-slate-400 mt-1">
              Previous bowler was <strong className="text-amber-300">{previousBowler}</strong> (cannot bowl consecutive overs).
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {bowlers.map((bowler) => {
            const isPrev = bowler === previousBowler;
            return (
              <button
                key={bowler}
                disabled={isPrev}
                onClick={() => onSelectBowler(bowler)}
                className={`w-full py-3 px-4 rounded-2xl flex items-center justify-between text-left font-bold text-sm transition-all ${
                  isPrev
                    ? 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed line-through'
                    : 'bg-slate-800 hover:bg-indigo-600/20 text-white border border-slate-700/80 hover:border-indigo-500'
                }`}
              >
                <span>{bowler}</span>
                {isPrev ? (
                  <span className="text-[10px] text-amber-500 font-semibold uppercase">Last Over</span>
                ) : (
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
