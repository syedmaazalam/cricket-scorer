import React, { useState } from 'react';
import {
  Users,
  Swords,
  Shield,
  Activity,
  Edit2,
  Check,
  X,
  Target,
  Flame,
  UserCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { computeInningsStats } from '../engine/stats.js';
import { formatOvers, calculateCRR } from '../engine/rules.js';

export default function PlayersHeadToHead({ matchState, onEditPlayer }) {
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('batter');

  const teams = matchState?.teams || [];
  const team1 = teams[0] || { name: 'Team Alpha', players: [] };
  const team2 = teams[1] || { name: 'Team Bravo', players: [] };

  const inn1 = matchState?.innings?.[0] || { score: 0, wickets: 0, legalBalls: 0, balls: [] };
  const inn2 = matchState?.innings?.[1] || { score: 0, wickets: 0, legalBalls: 0, balls: [] };

  const stats1 = computeInningsStats(inn1);
  const stats2 = computeInningsStats(inn2);

  const team1BattingStats = stats1.batting || {};
  const team1BowlingStats = stats2.bowling || {};

  const team2BattingStats = stats2.batting || {};
  const team2BowlingStats = stats1.bowling || {};

  // Compute Head-to-Head breakdown for every batter against every bowler
  const computeHeadToHead = (balls = []) => {
    const h2h = {}; // { [batterName]: { [bowlerName]: { balls: 0, runs: 0, dots: 0, fours: 0, sixes: 0, isDismissed: false } } }
    balls.forEach((b) => {
      const batter = b.striker;
      const bowler = b.bowler;
      if (!batter || !bowler) return;

      if (!h2h[batter]) h2h[batter] = {};
      if (!h2h[batter][bowler]) {
        h2h[batter][bowler] = { balls: 0, runs: 0, dots: 0, fours: 0, sixes: 0, isDismissed: false };
      }

      const isLegal = b.isLegal !== false && b.extraType !== 'wide';
      if (isLegal) {
        h2h[batter][bowler].balls += 1;
        if (b.runs === 0 && !b.extraType) h2h[batter][bowler].dots += 1;
      }
      h2h[batter][bowler].runs += (b.runs || 0);
      if (b.runs === 4) h2h[batter][bowler].fours += 1;
      if (b.runs === 6) h2h[batter][bowler].sixes += 1;

      if (b.isWicket && b.wicket && b.wicket.playerOut === batter) {
        h2h[batter][bowler].isDismissed = true;
      }
    });
    return h2h;
  };

  const h2hTeam1Batters = computeHeadToHead(inn1.balls || []);
  const h2hTeam2Batters = computeHeadToHead(inn2.balls || []);

  const activeTeam = selectedTeamIndex === 0 ? team1 : team2;
  const activeBatStats = selectedTeamIndex === 0 ? team1BattingStats : team2BattingStats;
  const activeBowlStats = selectedTeamIndex === 0 ? team1BowlingStats : team2BowlingStats;
  const activeH2H = selectedTeamIndex === 0 ? h2hTeam1Batters : h2hTeam2Batters;

  // Comparison metrics
  const t1CRR = calculateCRR(inn1.score, inn1.legalBalls);
  const t2CRR = calculateCRR(inn2.score, inn2.legalBalls);

  const t1Boundaries = (inn1.balls || []).filter(b => b.runs === 4 || b.runs === 6).length;
  const t2Boundaries = (inn2.balls || []).filter(b => b.runs === 4 || b.runs === 6).length;

  const t1Dots = (inn1.balls || []).filter(b => b.runs === 0 && !b.extraType).length;
  const t2Dots = (inn2.balls || []).filter(b => b.runs === 0 && !b.extraType).length;

  const handleStartEdit = (playerName) => {
    setEditingPlayer(playerName);
    setNewName(playerName);
    setNewRole('batter');
  };

  const handleSaveEdit = () => {
    if (editingPlayer && newName.trim() && onEditPlayer) {
      onEditPlayer(editingPlayer, newName.trim(), newRole);
    }
    setEditingPlayer(null);
  };

  return (
    <div className="w-full flex flex-col gap-4 pb-20 select-none">
      {/* 1. Head-to-Head Comparison Card */}
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}
        className="rounded-3xl p-4 sm:p-5 border shadow-sm flex flex-col gap-3"
      >
        <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text)' }}>
              Head to Head Comparison
            </h3>
          </div>
          <span className="text-[11px] font-bold" style={{ color: 'var(--muted)' }}>
            Match Overview
          </span>
        </div>

        {/* Team 1 vs Team 2 Score Header */}
        <div className="grid grid-cols-2 gap-3">
          <div
            style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
            className="p-3 rounded-2xl border text-center"
          >
            <span className="text-xs font-black truncate block" style={{ color: 'var(--primary)' }}>
              {team1.name}
            </span>
            <div className="text-xl sm:text-2xl font-black mt-1" style={{ color: 'var(--text)' }}>
              {inn1.score}<span style={{ color: 'var(--red)' }}>/{inn1.wickets}</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: 'var(--orange)' }}>
              {formatOvers(inn1.legalBalls)} ov
            </span>
          </div>

          <div
            style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
            className="p-3 rounded-2xl border text-center"
          >
            <span className="text-xs font-black truncate block" style={{ color: 'var(--blue)' }}>
              {team2.name}
            </span>
            <div className="text-xl sm:text-2xl font-black mt-1" style={{ color: 'var(--text)' }}>
              {inn2.score}<span style={{ color: 'var(--red)' }}>/{inn2.wickets}</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: 'var(--orange)' }}>
              {formatOvers(inn2.legalBalls)} ov
            </span>
          </div>
        </div>

        {/* Comparison Metric Bars */}
        <div className="flex flex-col gap-2 pt-1 text-xs">
          {/* CRR */}
          <div className="flex items-center justify-between">
            <span className="font-bold" style={{ color: 'var(--text)' }}>{t1CRR}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Run Rate (CRR)</span>
            <span className="font-bold" style={{ color: 'var(--text)' }}>{t2CRR}</span>
          </div>

          {/* Boundaries */}
          <div className="flex items-center justify-between">
            <span className="font-bold" style={{ color: 'var(--text)' }}>{t1Boundaries}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Boundaries (4s/6s)</span>
            <span className="font-bold" style={{ color: 'var(--text)' }}>{t2Boundaries}</span>
          </div>

          {/* Dot Balls */}
          <div className="flex items-center justify-between">
            <span className="font-bold" style={{ color: 'var(--text)' }}>{t1Dots}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Dot Balls</span>
            <span className="font-bold" style={{ color: 'var(--text)' }}>{t2Dots}</span>
          </div>

          {/* Extras */}
          <div className="flex items-center justify-between">
            <span className="font-bold" style={{ color: 'var(--text)' }}>{stats1.extras?.total || 0}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Extras Conceded</span>
            <span className="font-bold" style={{ color: 'var(--text)' }}>{stats2.extras?.total || 0}</span>
          </div>
        </div>
      </div>

      {/* 2. Squad Selection Tabs */}
      <div className="flex rounded-2xl p-1 border shadow-sm" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <button
          onClick={() => setSelectedTeamIndex(0)}
          style={{
            backgroundColor: selectedTeamIndex === 0 ? 'var(--primary)' : 'transparent',
            color: selectedTeamIndex === 0 ? '#FFFFFF' : 'var(--muted)'
          }}
          className="flex-1 py-2 rounded-xl text-xs font-black transition-all text-center truncate"
        >
          {team1.name} Squad ({team1.players?.length || 0})
        </button>
        <button
          onClick={() => setSelectedTeamIndex(1)}
          style={{
            backgroundColor: selectedTeamIndex === 1 ? 'var(--primary)' : 'transparent',
            color: selectedTeamIndex === 1 ? '#FFFFFF' : 'var(--muted)'
          }}
          className="flex-1 py-2 rounded-xl text-xs font-black transition-all text-center truncate"
        >
          {team2.name} Squad ({team2.players?.length || 0})
        </button>
      </div>

      {/* 3. Squad Players & Head-to-Head Cards */}
      <div className="flex flex-col gap-2.5">
        {(activeTeam.players || []).map((player, idx) => {
          const bat = activeBatStats[player] || { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false };
          const bowl = activeBowlStats[player] || { overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, economy: 0 };
          const playerH2H = activeH2H[player] || {};
          const isExpanded = expandedPlayer === player;
          const isEditingThis = editingPlayer === player;

          return (
            <div
              key={player + idx}
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
              className="rounded-2xl border p-3.5 shadow-sm flex flex-col gap-2 transition-all"
            >
              {/* Player Header Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-sm"
                  >
                    {idx + 1}
                  </div>

                  {isEditingThis ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        style={{
                          backgroundColor: 'var(--card-alt)',
                          borderColor: 'var(--border)',
                          color: 'var(--text)'
                        }}
                        className="px-2 py-1 text-xs rounded-lg border font-bold focus:outline-none"
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 rounded-lg bg-green-500 text-white"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingPlayer(null)}
                        className="p-1 rounded-lg bg-gray-500 text-white"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black" style={{ color: 'var(--text)' }}>
                          {player}
                        </span>
                        {onEditPlayer && (
                          <button
                            onClick={() => handleStartEdit(player)}
                            style={{ color: 'var(--muted)' }}
                            className="hover:opacity-80 p-0.5"
                            title="Edit player name"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>
                        {bat.balls > 0 ? (bat.isOut ? 'Dismissed' : 'Not Out') : 'Yet to Bat'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Match Performance Pills */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-xs font-black block" style={{ color: 'var(--text)' }}>
                      {bat.runs} <span className="text-[10px] font-normal" style={{ color: 'var(--muted)' }}>({bat.balls})</span>
                    </span>
                    {bowl.overs !== '0.0' && (
                      <span className="text-[10px] font-bold block" style={{ color: 'var(--blue)' }}>
                        {bowl.wickets}/{bowl.runsConceded} ({bowl.overs} ov)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedPlayer(isExpanded ? null : player)}
                    style={{ backgroundColor: 'var(--card-alt)', color: 'var(--text)' }}
                    className="p-1.5 rounded-xl border border-transparent hover:border-[var(--border)] transition-all"
                    title="View Head to Head details"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Head-to-Head & Career Breakdown */}
              {isExpanded && (
                <div
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    borderColor: 'var(--border)'
                  }}
                  className="rounded-xl p-3 border mt-1 flex flex-col gap-2.5 text-xs animate-in fade-in"
                >
                  {/* Batting Summary */}
                  <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                    <span className="font-bold text-[11px]" style={{ color: 'var(--muted)' }}>BATTING</span>
                    <span className="font-bold" style={{ color: 'var(--text)' }}>
                      {bat.runs} runs · {bat.balls} balls · {bat.fours} 4s · {bat.sixes} 6s · SR {Math.round(bat.strikeRate || 0)}
                    </span>
                  </div>

                  {/* Bowling Summary */}
                  {bowl.overs !== '0.0' && (
                    <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-bold text-[11px]" style={{ color: 'var(--muted)' }}>BOWLING</span>
                      <span className="font-bold" style={{ color: 'var(--text)' }}>
                        {bowl.overs} ov · {bowl.maidens} M · {bowl.runsConceded} R · {bowl.wickets} W · Econ {bowl.economy}
                      </span>
                    </div>
                  )}

                  {/* Head-to-Head Record Against Each Bowler */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block mb-1.5" style={{ color: 'var(--primary)' }}>
                      Head to Head vs Bowlers Faced
                    </span>
                    {Object.keys(playerH2H).length === 0 ? (
                      <span className="text-[11px] italic" style={{ color: 'var(--muted)' }}>
                        No deliveries faced in this innings yet.
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {Object.entries(playerH2H).map(([bowlerName, record]) => {
                          const sr = record.balls > 0 ? Math.round((record.runs / record.balls) * 100) : 0;
                          return (
                            <div
                              key={bowlerName}
                              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                              className="p-2 rounded-lg border flex items-center justify-between text-[11px]"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-black" style={{ color: 'var(--text)' }}>
                                  vs {bowlerName}
                                </span>
                                {record.isDismissed && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                                    OUT
                                  </span>
                                )}
                              </div>
                              <div className="font-mono font-bold" style={{ color: 'var(--muted)' }}>
                                <span style={{ color: 'var(--text)' }}>{record.runs}</span>r (
                                <span>{record.balls}</span>b) · SR <span style={{ color: 'var(--orange)' }}>{sr}</span> · {record.dots} dots
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
