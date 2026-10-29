import React, { useState } from 'react';
import { X, Users, Edit2, Check, User, Shield, Search } from 'lucide-react';

export default function SquadModal({
  isOpen,
  onClose,
  matchState,
  isManager = false,
  onEditPlayer,
  onSelectBatterDetails
}) {
  const [activeTeamIdx, setActiveTeamIdx] = useState(0);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !matchState) return null;

  const teams = matchState.teams || [];
  const activeTeam = teams[activeTeamIdx] || { name: 'Team', players: [] };
  const players = activeTeam.players || [];

  const filteredPlayers = searchQuery.trim()
    ? players.filter(p => p.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : players;

  const startEdit = (player) => {
    setEditingPlayer(player);
    setEditedName(player);
  };

  const saveEdit = () => {
    if (editingPlayer && editedName.trim() && editedName.trim() !== editingPlayer) {
      onEditPlayer?.(editingPlayer, editedName.trim());
    }
    setEditingPlayer(null);
    setEditedName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-lg max-h-[85vh] rounded-[24px] border shadow-2xl flex flex-col overflow-hidden transition-all"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-alt)' }}
          className="p-4 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm"
            >
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black m-0" style={{ color: 'var(--text)' }}>
                Team Squads & Player Roster
              </h3>
              <p className="text-[10px] m-0" style={{ color: 'var(--muted)' }}>
                {isManager ? 'View & edit playing XI and squad player names' : 'View full team squads'}
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

        {/* Team Selection Tabs */}
        <div className="grid grid-cols-2 p-2 gap-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
          {teams.map((t, idx) => (
            <button
              key={idx}
              onClick={() => { setActiveTeamIdx(idx); setEditingPlayer(null); }}
              style={{
                backgroundColor: activeTeamIdx === idx ? 'var(--primary)' : 'var(--card-alt)',
                color: activeTeamIdx === idx ? '#FFFFFF' : 'var(--muted)',
                borderColor: 'var(--border)'
              }}
              className="py-2 px-3 rounded-xl text-xs font-bold transition-all border truncate"
            >
              {t.name || `Team ${idx + 1}`} ({t.players?.length || 0})
            </button>
          ))}
        </div>

        {/* Quick Search */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Search player in squad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>
        </div>

        {/* Player List */}
        <div className="p-3 overflow-y-auto space-y-2 flex-1">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-6 text-xs" style={{ color: 'var(--muted)' }}>
              No players found in this squad.
            </div>
          ) : (
            filteredPlayers.map((player, idx) => {
              const isCurrentStriker = matchState.striker === player;
              const isCurrentNonStriker = matchState.nonStriker === player;
              const isCurrentBowler = matchState.currentBowler === player;
              const isRetired = matchState.retiredHurtBatters?.includes(player);

              return (
                <div
                  key={player}
                  style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
                  className="p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all hover:border-[var(--primary)]"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span
                      style={{ color: 'var(--muted)' }}
                      className="text-xs font-mono font-bold w-5 shrink-0"
                    >
                      {idx + 1}.
                    </span>

                    {editingPlayer === player ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          autoFocus
                          style={{
                            backgroundColor: 'var(--card)',
                            borderColor: 'var(--primary)',
                            color: 'var(--text)'
                          }}
                          className="px-2 py-1 rounded-lg border text-xs font-bold flex-1 focus:outline-none"
                        />
                        <button
                          onClick={saveEdit}
                          style={{ backgroundColor: 'var(--green)', color: '#FFFFFF' }}
                          className="p-1 rounded-lg hover:opacity-90 active:scale-95 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingPlayer(null)}
                          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                          className="p-1 rounded-lg border hover:opacity-90 active:scale-95 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => onSelectBatterDetails?.(player)}
                        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer group"
                      >
                        <span className="font-bold text-xs truncate group-hover:text-[var(--primary)] transition-colors" style={{ color: 'var(--text)' }}>
                          {player}
                        </span>

                        {isCurrentStriker && (
                          <span style={{ backgroundColor: 'color-mix(in srgb, var(--green) 20%, transparent)', color: 'var(--green)' }} className="px-1.5 py-0.5 rounded text-[9px] font-bold">
                            Striker
                          </span>
                        )}
                        {isCurrentNonStriker && (
                          <span style={{ backgroundColor: 'color-mix(in srgb, var(--blue) 20%, transparent)', color: 'var(--blue)' }} className="px-1.5 py-0.5 rounded text-[9px] font-bold">
                            Non-Striker
                          </span>
                        )}
                        {isCurrentBowler && (
                          <span style={{ backgroundColor: 'color-mix(in srgb, var(--purple) 20%, transparent)', color: 'var(--purple)' }} className="px-1.5 py-0.5 rounded text-[9px] font-bold">
                            Bowling
                          </span>
                        )}
                        {isRetired && (
                          <span style={{ backgroundColor: 'color-mix(in srgb, var(--orange) 20%, transparent)', color: 'var(--orange)' }} className="px-1.5 py-0.5 rounded text-[9px] font-bold">
                            Time Declared
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onSelectBatterDetails?.(player)}
                      title="View complete innings & statistics"
                      style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        color: 'var(--primary)'
                      }}
                      className="px-2 py-1 rounded-lg border text-[10px] font-bold hover:opacity-90 active:scale-95 transition-all"
                    >
                      Stats
                    </button>

                    {isManager && editingPlayer !== player && (
                      <button
                        onClick={() => startEdit(player)}
                        title="Edit player name"
                        style={{
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)',
                          color: 'var(--muted)'
                        }}
                        className="p-1 rounded-lg border hover:text-[var(--text)] active:scale-95 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-alt)' }}
          className="p-3 border-t text-center text-xs"
        >
          <span style={{ color: 'var(--muted)' }}>
            Tap on any player to inspect their complete innings breakdown & timeline
          </span>
        </div>
      </div>
    </div>
  );
}
