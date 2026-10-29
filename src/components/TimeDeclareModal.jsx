import React, { useState } from 'react';
import { X, Clock, AlertTriangle, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';

export default function TimeDeclareModal({
  isOpen,
  onClose,
  matchState,
  onConfirmRetire
}) {
  const [selectedBatterSlot, setSelectedBatterSlot] = useState('striker'); // 'striker' | 'nonStriker'
  const [retireType, setRetireType] = useState('time_declare'); // 'time_declare' | 'out'
  const [incomingBatter, setIncomingBatter] = useState('');

  if (!isOpen || !matchState) return null;

  const currentStriker = matchState.striker;
  const currentNonStriker = matchState.nonStriker;
  const retiringBatter = selectedBatterSlot === 'striker' ? currentStriker : currentNonStriker;

  const curInnIndex = matchState.currentInningsIndex || 0;
  const curInn = matchState.innings?.[curInnIndex];
  const battingTeamObj = matchState.teams?.find(t => t.name === curInn?.battingTeam) || matchState.teams?.[curInnIndex];
  const allSquadPlayers = battingTeamObj?.players || [];

  // Find who has already batted / been dismissed
  const balls = curInn?.balls || [];
  const dismissedPlayers = balls.filter(b => b.isWicket && b.dismissedPlayer).map(b => b.dismissedPlayer);
  const activeBatters = [currentStriker, currentNonStriker].filter(Boolean);

  // Eligible bench players: Unbatted players + Any previously Retired Hurt / Time Declared players!
  const retiredHurtList = matchState.retiredHurtBatters || [];
  const eligibleBench = allSquadPlayers.filter(p => {
    if (activeBatters.includes(p)) return false;
    if (p === retiringBatter) return false;
    if (dismissedPlayers.includes(p)) return false;
    return true;
  });

  const handleConfirm = () => {
    if (!retiringBatter) return;
    if (!incomingBatter) {
      alert('Please select the incoming batsman to take the crease.');
      return;
    }
    onConfirmRetire(retiringBatter, retireType, incomingBatter);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-md rounded-[24px] border shadow-2xl overflow-hidden transition-all"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-alt)' }}
          className="p-4 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: 'var(--orange)', color: '#FFFFFF' }}
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm"
            >
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black m-0" style={{ color: 'var(--text)' }}>
                Time Declare / Retire Batsman
              </h3>
              <p className="text-[10px] m-0" style={{ color: 'var(--muted)' }}>
                Temporarily or permanently retire batsman from crease
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="p-1.5 rounded-xl border hover:opacity-80 transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 1. Select which batter is retiring */}
          <div>
            <label className="block text-[11px] font-bold uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
              1. Choose Batter Retiring
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedBatterSlot('striker')}
                style={{
                  backgroundColor: selectedBatterSlot === 'striker' ? 'var(--primary)' : 'var(--card-alt)',
                  color: selectedBatterSlot === 'striker' ? '#FFFFFF' : 'var(--text)',
                  borderColor: 'var(--border)'
                }}
                className="p-3 rounded-2xl border text-left font-bold text-xs transition-all flex flex-col gap-0.5"
              >
                <span className="text-[10px] uppercase font-normal opacity-80">Striker</span>
                <span className="truncate">{currentStriker || 'None'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedBatterSlot('nonStriker')}
                style={{
                  backgroundColor: selectedBatterSlot === 'nonStriker' ? 'var(--primary)' : 'var(--card-alt)',
                  color: selectedBatterSlot === 'nonStriker' ? '#FFFFFF' : 'var(--text)',
                  borderColor: 'var(--border)'
                }}
                className="p-3 rounded-2xl border text-left font-bold text-xs transition-all flex flex-col gap-0.5"
              >
                <span className="text-[10px] uppercase font-normal opacity-80">Non-Striker</span>
                <span className="truncate">{currentNonStriker || 'None'}</span>
              </button>
            </div>
          </div>

          {/* 2. Choose Retirement Type */}
          <div>
            <label className="block text-[11px] font-bold uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
              2. Retirement Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRetireType('time_declare')}
                style={{
                  backgroundColor: retireType === 'time_declare' ? 'color-mix(in srgb, var(--green) 20%, var(--card-alt))' : 'var(--card-alt)',
                  borderColor: retireType === 'time_declare' ? 'var(--green)' : 'var(--border)',
                  color: 'var(--text)'
                }}
                className="p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all"
              >
                <div className="flex items-center gap-1.5 text-xs font-black" style={{ color: 'var(--green)' }}>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Time Declare</span>
                </div>
                <p className="text-[10px] m-0 leading-tight" style={{ color: 'var(--muted)' }}>
                  Retired not out. Can join the ground at anytime when team needs him.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRetireType('out')}
                style={{
                  backgroundColor: retireType === 'out' ? 'color-mix(in srgb, var(--red) 20%, var(--card-alt))' : 'var(--card-alt)',
                  borderColor: retireType === 'out' ? 'var(--red)' : 'var(--border)',
                  color: 'var(--text)'
                }}
                className="p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all"
              >
                <div className="flex items-center gap-1.5 text-xs font-black" style={{ color: 'var(--red)' }}>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Retired Out</span>
                </div>
                <p className="text-[10px] m-0 leading-tight" style={{ color: 'var(--muted)' }}>
                  Counts as a wicket. Cannot return to bat again.
                </p>
              </button>
            </div>
          </div>

          {/* 3. Choose Incoming Batter */}
          <div>
            <label className="block text-[11px] font-bold uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
              3. Select Incoming Batter
            </label>
            {eligibleBench.length === 0 ? (
              <div
                style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                className="p-3 rounded-2xl border text-center text-xs"
              >
                No bench batters available. All out!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1">
                {eligibleBench.map(p => {
                  const isPreviouslyRetiredHurt = retiredHurtList.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setIncomingBatter(p)}
                      style={{
                        backgroundColor: incomingBatter === p ? 'var(--primary)' : 'var(--card-alt)',
                        color: incomingBatter === p ? '#FFFFFF' : 'var(--text)',
                        borderColor: isPreviouslyRetiredHurt ? 'var(--green)' : 'var(--border)'
                      }}
                      className="p-2 rounded-xl border text-left text-xs font-bold transition-all truncate flex items-center justify-between"
                    >
                      <span className="truncate">{p}</span>
                      {isPreviouslyRetiredHurt && (
                        <span style={{ backgroundColor: 'var(--green)', color: '#FFFFFF' }} className="px-1.5 py-0.5 rounded text-[8px] uppercase">
                          Resume
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-alt)' }}
          className="p-3 border-t flex items-center justify-end gap-2"
        >
          <button
            onClick={onClose}
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="px-4 py-2 rounded-xl border text-xs font-bold"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={!incomingBatter}
            style={{
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF',
              opacity: incomingBatter ? 1 : 0.5
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <span>Confirm Time Declare</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
