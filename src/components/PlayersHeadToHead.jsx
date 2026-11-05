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
  ChevronDown
} from 'lucide-react';
import { computeInningsStats } from '../engine/stats.js';
import { formatOvers, calculateCRR } from '../engine/rules.js';
import MatchCharts from './MatchCharts.jsx';

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
    const h2h = {};
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
    <div className="w-full flex flex-col gap-3.5 sm:gap-4 select-none px-0">
      <div className="w-full flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 items-start">
        {/* Left Column on Desktop: Head-to-Head Comparison Card & Over Comparison Chart */}
        <div className="flex flex-col gap-3.5 sm:gap-4 w-full min-w-0 lg:col-span-5">
          {/* 1. Head-to-Head Comparison Card Matching Blueprint (media_1793793018216_dd96f4b8.jpg) */}
          <section
            className="card glass-card w-full rounded-2xl p-5 border shadow-sm"
            style={{
              background: 'var(--card)',
              borderColor: 'var(--bd)'
            }}
          >
            {/* Header Row with Cyan Crossed Bats Icon */}
            <div className="flex flex-col gap-1 mb-4">
              <div className="flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="m14 2 8 8-4 4-8-8 4-4Z" />
                  <path d="m2 14 8 8 4-4-8-8-4 4Z" />
                  <circle cx="18" cy="18" r="2" />
                </svg>
                <h3 className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--t1)' }}>Head to head comparison</h3>
              </div>
              <span className="text-xs font-medium pl-8" style={{ color: 'var(--t2)' }}>Match overview</span>
            </div>

            {/* Side-by-Side Team Score Cards */}
            <div className="grid grid-cols-2 gap-3 my-4">
              <div
                className="p-4 rounded-2xl text-center"
                style={{
                  background: 'var(--well)',
                  border: '1.5px solid var(--bd)',
                  boxShadow: 'var(--card-shadow)'
                }}
              >
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--t2)' }}>{team1.name}</div>
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight my-1.5 font-mono" style={{ color: 'var(--t1)' }}>
                  {inn1.score}<span className="font-normal text-2xl" style={{ color: 'var(--t2)' }}>/{inn1.wickets}</span>
                </div>
                <div className="text-xs font-mono" style={{ color: 'var(--t2)' }}>{formatOvers(inn1.legalBalls)} ov</div>
              </div>

              <div
                className="p-4 rounded-2xl text-center"
                style={{
                  background: 'var(--well)',
                  border: '1.5px solid var(--bd)',
                  boxShadow: 'var(--card-shadow)'
                }}
              >
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--t2)' }}>{team2.name}</div>
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight my-1.5 font-mono" style={{ color: 'var(--t1)' }}>
                  {inn2.score}<span className="font-normal text-2xl" style={{ color: 'var(--t2)' }}>/{inn2.wickets}</span>
                </div>
                <div className="text-xs font-mono" style={{ color: 'var(--t2)' }}>{formatOvers(inn2.legalBalls)} ov</div>
              </div>
            </div>

            {/* Match Statistics Table */}
            <div className="mt-5">
              <div className="flex items-center justify-between pb-2 mb-1">
                <h4 className="text-sm font-extrabold" style={{ color: 'var(--t1)' }}>Match statistics</h4>
                <div className="flex items-center gap-5 text-xs font-extrabold tracking-wider uppercase" style={{ color: 'var(--t2)' }}>
                  <span className="w-14 text-right truncate">{(team1.name || 'ALPHA').slice(0, 6)}</span>
                  <span className="w-14 text-right truncate">{(team2.name || 'BRAVO').slice(0, 6)}</span>
                </div>
              </div>

              <div className="divide-y divide-[var(--bd)]">
                {/* Run rate (CRR) */}
                <div className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium" style={{ color: 'var(--t2)' }}>Run rate (CRR)</span>
                  <div className="flex items-center gap-5 font-bold font-mono" style={{ color: 'var(--t1)' }}>
                    <span className="w-14 text-right">{t1CRR}</span>
                    <span className="w-14 text-right">{t2CRR}</span>
                  </div>
                </div>

                {/* Boundaries (4s / 6s) */}
                <div className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium" style={{ color: 'var(--t2)' }}>Boundaries (4s / 6s)</span>
                  <div className="flex items-center gap-5 font-bold font-mono" style={{ color: 'var(--t1)' }}>
                    <span className="w-14 text-right">{t1Boundaries}</span>
                    <span className="w-14 text-right">{t2Boundaries}</span>
                  </div>
                </div>

                {/* Dot balls */}
                <div className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium" style={{ color: 'var(--t2)' }}>Dot balls</span>
                  <div className="flex items-center gap-5 font-bold font-mono" style={{ color: 'var(--t1)' }}>
                    <span className="w-14 text-right">{t1Dots}</span>
                    <span className="w-14 text-right">{t2Dots}</span>
                  </div>
                </div>

                {/* Extras conceded */}
                <div className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium" style={{ color: 'var(--t2)' }}>Extras conceded</span>
                  <div className="flex items-center gap-5 font-bold font-mono" style={{ color: 'var(--t1)' }}>
                    <span className="w-14 text-right">{stats1.extras?.total || 0}</span>
                    <span className="w-14 text-right">{stats2.extras?.total || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Over Comparison Chart (Under Head to Head comparison on Desktop) */}
          <div className="hidden lg:block w-full">
            <MatchCharts matchState={matchState} initialChart="runs" />
          </div>
        </div>

        {/* Right Column on Desktop: Squad Tabs & Player Blocks */}
        <div className="flex flex-col gap-3.5 w-full min-w-0 lg:col-span-7">
          {/* 2. Squad Selection Tabs */}
          <div className="seg w-full" role="group">
            <button
              type="button"
              onClick={() => setSelectedTeamIndex(0)}
              className={selectedTeamIndex === 0 ? 'on' : ''}
              aria-pressed={selectedTeamIndex === 0}
            >
              {team1.name} Squad ({team1.players?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setSelectedTeamIndex(1)}
              className={selectedTeamIndex === 1 ? 'on' : ''}
              aria-pressed={selectedTeamIndex === 1}
            >
              {team2.name} Squad ({team2.players?.length || 0})
            </button>
          </div>

          {/* 3. Squad Player Cards Matching Exact Blueprint (media_1793796113501_be88c163.jpg) */}
          <div className="flex flex-col gap-2.5 w-full">
            {(activeTeam.players || []).map((player, idx) => {
              const bat = activeBatStats[player] || { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false };
              const bowl = activeBowlStats[player] || { overs: '0.0', maidens: 0, runsConceded: 0, wickets: 0, economy: 0 };
              const playerH2H = activeH2H[player] || {};
              const isExpanded = expandedPlayer === player;
              const isEditingThis = editingPlayer === player;

              const statusText = bat.balls > 0
                ? (bat.isOut ? 'Out' : 'Not Out')
                : 'Yet to Bat';

              return (
                <div
                  key={player + idx}
                  className="card glass-card w-full rounded-[20px] transition-all duration-200 overflow-hidden"
                  style={{
                    background: 'var(--card)',
                    border: '1.5px solid var(--bd)',
                    boxShadow: 'var(--card-shadow)'
                  }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-2.5 sm:px-5 sm:py-3 cursor-pointer select-none"
                    onClick={() => setExpandedPlayer(isExpanded ? null : player)}
                  >
                    {/* Left: Player Name & Blue Pill Score Badge */}
                    {isEditingThis ? (
                      <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          style={{
                            backgroundColor: 'var(--well)',
                            borderColor: 'var(--pri)',
                            color: 'var(--t1)'
                          }}
                          className="px-3 py-1.5 text-xs rounded-xl border font-bold focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1.5 rounded-lg bg-[var(--ok)] text-white hover:opacity-90"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingPlayer(null)}
                          className="p-1.5 rounded-lg border border-[var(--bd)] text-[var(--t2)] hover:text-[var(--t1)]"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <span className="font-extrabold text-sm sm:text-base tracking-tight truncate" style={{ color: 'var(--t1)' }}>
                          {player}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold font-mono shrink-0"
                          style={{
                            backgroundColor: 'var(--well)',
                            border: '1.5px solid var(--pri)',
                            color: 'var(--t1)'
                          }}
                        >
                          <span>{bat.runs}</span>
                          <span className="text-[11px] font-sans font-normal" style={{ color: 'var(--t2)' }}>({bat.balls}b)</span>
                        </span>
                      </div>
                    )}

                    {/* Right: Batting Status & Outlined Pencil Icon */}
                    <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                      <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--t2)' }}>
                        {statusText}
                      </span>
                      {onEditPlayer && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(player);
                          }}
                          className="p-1 text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
                          title="Edit player name"
                        >
                          <Edit2 className="w-4 h-4 stroke-[2]" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Performance Tiles (shown smoothly if clicked) */}
                  {isExpanded && (
                    <div
                      className="px-4 pb-3 pt-2 flex flex-col gap-2 border-t"
                      style={{
                        borderColor: 'var(--bd)',
                        backgroundColor: 'var(--well)'
                      }}
                    >
                      <div className="grid grid-cols-3 gap-2">
                        <div className="tile" style={{ padding: '6px 8px', borderRadius: '10px' }}>
                          <b style={{ fontSize: '15px' }}>{bat.fours || 0}</b>
                          <span style={{ fontSize: '10px' }}>4s</span>
                        </div>
                        <div className="tile" style={{ padding: '6px 8px', borderRadius: '10px' }}>
                          <b style={{ fontSize: '15px' }}>{bat.sixes || 0}</b>
                          <span style={{ fontSize: '10px' }}>6s</span>
                        </div>
                        <div className="tile" style={{ padding: '6px 8px', borderRadius: '10px' }}>
                          <b style={{ fontSize: '15px' }}>{Math.round(bat.strikeRate || 0)}</b>
                          <span style={{ fontSize: '10px' }}>SR</span>
                        </div>
                      </div>

                      {bowl.overs !== '0.0' && (
                        <div
                          className="row bt"
                          style={{
                            background: 'var(--card)',
                            borderRadius: '10px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            border: '1px solid var(--bd)'
                          }}
                        >
                          <span style={{ color: 'var(--t2)' }}>Bowling:</span>
                          <b className="text-[var(--ok)] font-mono">{bowl.wickets}/{bowl.runsConceded} ({bowl.overs} ov)</b>
                        </div>
                      )}

                      {/* Head-to-Head bowler matchups */}
                      {Object.keys(playerH2H).length > 0 && (
                        <div className="flex flex-col gap-1 mt-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t2)' }}>vs Opponent Bowlers:</span>
                          {Object.entries(playerH2H).map(([bowler, hStat]) => (
                            <div
                              key={bowler}
                              className="row bt text-xs"
                              style={{
                                background: 'var(--card)',
                                padding: '5px 8px',
                                borderRadius: '8px',
                                border: '1px solid var(--bd)'
                              }}
                            >
                              <span className="font-semibold" style={{ color: 'var(--t1)' }}>{bowler}</span>
                              <span className="font-mono text-[11px]" style={{ color: 'var(--t2)' }}>
                                <b style={{ color: 'var(--t1)' }}>{hStat.runs} runs</b> off {hStat.balls}b {hStat.isDismissed && <span className="text-red-400 font-bold ml-1">• OUT</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Over Comparison Chart at the End on Mobile (Hidden on Desktop since it is under Head to Head) */}
      <div className="w-full mt-4 pt-4 border-t border-[var(--bd)] flex flex-col items-center lg:hidden">
        <div className="w-full max-w-md mx-auto px-0.5 sm:px-0">
          <MatchCharts matchState={matchState} initialChart="runs" />
        </div>
      </div>
    </div>
  );
}
