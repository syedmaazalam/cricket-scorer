import React, { useState } from 'react';
import { Trophy, ArrowRight, UserCheck, Shield, X } from 'lucide-react';

export default function InningsBreakModal({
  isOpen,
  firstInnings,
  innings1,
  battingTeam,
  bowlingTeam,
  target,
  battingTeamSquad = [],
  bowlingTeamSquad = [],
  onClose,
  onStartSecondInnings,
  onStartInnings2
}) {
  const inn1 = firstInnings || innings1;
  const batSquad = (battingTeamSquad && battingTeamSquad.length > 0)
    ? battingTeamSquad
    : ['Batter 1', 'Batter 2'];
  const bowlSquad = (bowlingTeamSquad && bowlingTeamSquad.length > 0)
    ? bowlingTeamSquad
    : ['Bowler 1', 'Bowler 2'];

  const [striker, setStriker] = useState(batSquad[0] || 'Batter 1');
  const [nonStriker, setNonStriker] = useState(batSquad[1] || batSquad[0] || 'Batter 2');
  const [bowler, setBowler] = useState(bowlSquad[0] || 'Bowler 1');

  const [customStriker, setCustomStriker] = useState('');
  const [customNonStriker, setCustomNonStriker] = useState('');
  const [customBowler, setCustomBowler] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalStriker = (customStriker.trim() || striker).trim();
    const finalNonStriker = (customNonStriker.trim() || nonStriker).trim();
    const finalBowler = (customBowler.trim() || bowler).trim();

    if (!finalStriker || !finalNonStriker || finalStriker === finalNonStriker) {
      alert('Please choose or enter two distinct opening batters.');
      return;
    }
    if (!finalBowler) {
      alert('Please choose or enter an opening bowler.');
      return;
    }

    const callback = onStartInnings2 || onStartSecondInnings;
    if (typeof callback === 'function') {
      callback({
        striker: finalStriker,
        nonStriker: finalNonStriker,
        bowler: finalBowler
      });
    }
  };

  const targetRuns = target || (inn1 ? (inn1.score || 0) + 1 : 1);
  const targetBattingTeam = battingTeam || inn1?.bowlingTeam || 'Chasing Team';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-md rounded-3xl p-5 sm:p-6 border shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 relative"
      >
        {onClose && (
          <button
            onClick={onClose}
            style={{ color: 'var(--muted)' }}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 active:scale-95 transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center flex flex-col items-center">
          <div
            style={{
              backgroundColor: 'color-mix(in srgb, var(--orange) 15%, transparent)',
              borderColor: 'color-mix(in srgb, var(--orange) 30%, transparent)',
              color: 'var(--orange)'
            }}
            className="w-12 h-12 rounded-2xl border flex items-center justify-center mb-2 text-2xl shadow-sm"
          >
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black m-0" style={{ color: 'var(--text)' }}>
            Innings Break
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            {inn1?.battingTeam || '1st Innings'} scored{' '}
            <strong style={{ color: 'var(--text)' }}>
              {inn1?.score || 0}/{inn1?.wickets || 0}
            </strong>
          </p>

          <div
            style={{
              backgroundColor: 'color-mix(in srgb, var(--orange) 12%, var(--card-alt))',
              borderColor: 'var(--orange)'
            }}
            className="mt-3 border rounded-2xl px-6 py-2.5 text-center shadow-sm w-full"
          >
            <span className="text-[10px] uppercase tracking-wider font-extrabold block" style={{ color: 'var(--orange)' }}>
              Target
            </span>
            <span className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--orange)' }}>
              {targetRuns} runs
            </span>
            <span className="text-xs block mt-0.5" style={{ color: 'var(--muted)' }}>
              ({targetBattingTeam} needs {targetRuns} to win)
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Striker */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: 'var(--muted)' }}>
              Opening Striker ({targetBattingTeam})
            </label>
            <div className="flex gap-2">
              <select
                value={striker}
                onChange={(e) => { setStriker(e.target.value); setCustomStriker(''); }}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold border focus:outline-none focus:border-[var(--primary)]"
              >
                {batSquad.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or custom..."
                value={customStriker}
                onChange={(e) => setCustomStriker(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-28 rounded-xl px-2.5 py-2 text-xs border focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Non-Striker */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: 'var(--muted)' }}>
              Opening Non-Striker ({targetBattingTeam})
            </label>
            <div className="flex gap-2">
              <select
                value={nonStriker}
                onChange={(e) => { setNonStriker(e.target.value); setCustomNonStriker(''); }}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold border focus:outline-none focus:border-[var(--primary)]"
              >
                {batSquad.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or custom..."
                value={customNonStriker}
                onChange={(e) => setCustomNonStriker(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-28 rounded-xl px-2.5 py-2 text-xs border focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Bowler */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: 'var(--muted)' }}>
              Opening Bowler ({inn1?.battingTeam || bowlingTeam || 'Bowling Team'})
            </label>
            <div className="flex gap-2">
              <select
                value={bowler}
                onChange={(e) => { setBowler(e.target.value); setCustomBowler(''); }}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold border focus:outline-none focus:border-[var(--primary)]"
              >
                {bowlSquad.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Or custom..."
                value={customBowler}
                onChange={(e) => setCustomBowler(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-28 rounded-xl px-2.5 py-2 text-xs border focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Start 2nd Innings CTA Button */}
          <button
            type="submit"
            style={{
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF'
            }}
            className="w-full mt-2 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <span>Start 2nd Innings</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
