import React, { useState } from 'react';
import { UserCheck, Plus, AlertCircle, Shield } from 'lucide-react';

export default function BowlerModal({
  isOpen,
  bowlers = [],
  bowlersSquad = [],
  previousBowler,
  onSelectBowler
}) {
  const [customBowlerName, setCustomBowlerName] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  if (!isOpen) return null;

  // Deduplicate candidate bowlers from bowlers or bowlersSquad
  const rawList = (bowlers && bowlers.length > 0) ? bowlers : (bowlersSquad || []);
  const allCandidateBowlers = Array.from(new Set(rawList.filter(Boolean)));

  const handleSelect = (name) => {
    if (!name) return;
    onSelectBowler(name.trim());
    setCustomBowlerName('');
    setShowAddCustom(false);
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (customBowlerName.trim()) {
      handleSelect(customBowlerName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-3">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-md rounded-3xl p-5 border shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div style={{ borderColor: 'var(--border)' }} className="border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary)' }} />
            <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>
              Over Complete — Select Next Bowler
            </h3>
          </div>
          {previousBowler && (
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Previous bowler was <strong style={{ color: 'var(--orange)' }}>{previousBowler}</strong> (cannot bowl consecutive overs).
            </p>
          )}
        </div>

        {/* Bowler List */}
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {allCandidateBowlers.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--muted)'
              }}
              className="p-4 rounded-2xl border text-center text-xs"
            >
              No players found in bowling squad. Enter a bowler name below:
            </div>
          ) : (
            allCandidateBowlers.map((bowler) => {
              const isPrev = bowler === previousBowler;
              return (
                <button
                  key={bowler}
                  type="button"
                  disabled={isPrev}
                  onClick={() => handleSelect(bowler)}
                  style={{
                    backgroundColor: isPrev ? 'var(--card-alt)' : 'var(--card-alt)',
                    borderColor: 'var(--border)',
                    color: isPrev ? 'var(--muted)' : 'var(--text)'
                  }}
                  className={`w-full py-3 px-4 rounded-2xl flex items-center justify-between text-left font-bold text-sm transition-all border ${
                    isPrev
                      ? 'opacity-40 cursor-not-allowed line-through'
                      : 'hover:border-[var(--primary)] hover:opacity-90 active:scale-98 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" style={{ color: isPrev ? 'var(--muted)' : 'var(--blue)' }} />
                    <span>{bowler}</span>
                  </div>
                  {isPrev ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--orange)' }}>
                      Last Over
                    </span>
                  ) : (
                    <UserCheck className="w-4 h-4" style={{ color: 'var(--green)' }} />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Add New / Custom Bowler Field */}
        <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          {!showAddCustom ? (
            <button
              type="button"
              onClick={() => setShowAddCustom(true)}
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--primary)'
              }}
              className="w-full py-2.5 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add / Type Different Bowler</span>
            </button>
          ) : (
            <form onSubmit={handleAddCustom} className="flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder="Enter bowler name..."
                value={customBowlerName}
                onChange={(e) => setCustomBowlerName(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="flex-1 py-2 px-3 rounded-2xl border text-xs font-medium focus:outline-none focus:border-[var(--primary)]"
              />
              <button
                type="submit"
                disabled={!customBowlerName.trim()}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: '#FFFFFF'
                }}
                className="px-4 py-2 rounded-2xl font-bold text-xs shadow-md active:scale-95 disabled:opacity-40 transition-all"
              >
                Select
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
