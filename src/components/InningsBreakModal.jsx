import React, { useState } from 'react';
import { Trophy, ArrowRight } from 'lucide-react';

export default function InningsBreakModal({
  isOpen,
  firstInnings,
  battingTeam,
  bowlingTeam,
  target,
  battingTeamSquad = [],
  bowlingTeamSquad = [],
  onStartSecondInnings
}) {
  const [striker, setStriker] = useState(battingTeamSquad[0] || '');
  const [nonStriker, setNonStriker] = useState(battingTeamSquad[1] || '');
  const [bowler, setBowler] = useState(bowlingTeamSquad[0] || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!striker || !nonStriker || striker === nonStriker) {
      alert('Please select two distinct opening batters.');
      return;
    }
    if (!bowler) {
      alert('Please select an opening bowler.');
      return;
    }
    onStartSecondInnings({ striker, nonStriker, bowler });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95">
        <div className="text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white">Innings Break</h2>
          <p className="text-sm text-slate-400 mt-1">
            {firstInnings?.battingTeam} scored <strong className="text-white">{firstInnings?.score}/{firstInnings?.wickets}</strong>
          </p>
          <div className="mt-3 bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border border-amber-400/40 rounded-2xl px-5 py-2.5">
            <span className="text-xs uppercase tracking-wider text-amber-300 font-bold block">Target</span>
            <span className="text-3xl font-black text-amber-400">{target} runs</span>
            <span className="text-xs text-slate-300 block mt-0.5">({battingTeam} needs {target} to win)</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Opening Striker ({battingTeam})
            </label>
            <select
              value={striker}
              onChange={(e) => setStriker(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {battingTeamSquad.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Opening Non-Striker ({battingTeam})
            </label>
            <select
              value={nonStriker}
              onChange={(e) => setNonStriker(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {battingTeamSquad.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Opening Bowler ({bowlingTeam})
            </label>
            <select
              value={bowler}
              onChange={(e) => setBowler(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {bowlingTeamSquad.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-900/30 hover:brightness-110 flex items-center justify-center gap-2"
          >
            <span>Start 2nd Innings</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
