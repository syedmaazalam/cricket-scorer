import React, { useState } from 'react';
import { UserPlus, Plus } from 'lucide-react';

export default function NewBatterModal({
  isOpen,
  vacantSlot = 'striker',
  availableBatters = [],
  onSelectBatter
}) {
  const [customBatterName, setCustomBatterName] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (name) => {
    if (!name) return;
    onSelectBatter(name.trim(), vacantSlot);
    setCustomBatterName('');
    setShowAddCustom(false);
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (customBatterName.trim()) {
      handleSelect(customBatterName.trim());
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
        <div style={{ borderColor: 'var(--border)' }} className="border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary)' }} />
            <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>
              Select Incoming Batter
            </h3>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Choose who comes in to bat at <strong style={{ color: 'var(--orange)' }}>{vacantSlot === 'nonStriker' ? "Non-Striker's end" : "Striker's end"}</strong>.
          </p>
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {availableBatters.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--muted)'
              }}
              className="p-4 rounded-2xl border text-center text-xs"
            >
              No unbatted players remaining on bench. Enter a batter name below:
            </div>
          ) : (
            availableBatters.map((batter) => (
              <button
                key={batter}
                type="button"
                onClick={() => handleSelect(batter)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full py-3 px-4 rounded-2xl flex items-center justify-between text-left font-bold text-sm border hover:border-[var(--primary)] hover:opacity-90 active:scale-98 transition-all shadow-sm"
              >
                <span>{batter}</span>
                <UserPlus className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              </button>
            ))
          )}
        </div>

        {/* Add New / Custom Batter Field */}
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
              <span>Add / Type Different Batter</span>
            </button>
          ) : (
            <form onSubmit={handleAddCustom} className="flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder="Enter batter name..."
                value={customBatterName}
                onChange={(e) => setCustomBatterName(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="flex-1 py-2 px-3 rounded-2xl border text-xs font-medium focus:outline-none focus:border-[var(--primary)]"
              />
              <button
                type="submit"
                disabled={!customBatterName.trim()}
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
