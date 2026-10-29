import React, { useState } from 'react';
import { ArrowLeft, Trophy, Award, Medal, Share2, Check } from 'lucide-react';
import { computeInningsStats } from '../engine/stats.js';
import { getTopPlayers } from '../engine/potm.js';

export default function Scorecard({ matchState, onBack }) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Innings 1, 1 = Innings 2
  const [copied, setCopied] = useState(false);

  const inn1 = matchState.innings?.[0] || { score: 0, wickets: 0, legalBalls: 0, balls: [], battingTeam: '', bowlingTeam: '' };
  const inn2 = matchState.innings?.[1] || { score: 0, wickets: 0, legalBalls: 0, balls: [], battingTeam: '', bowlingTeam: '' };

  const stats1 = computeInningsStats(inn1);
  const stats2 = computeInningsStats(inn2);

  const currentInn = activeTab === 0 ? inn1 : inn2;
  const currentStats = activeTab === 0 ? stats1 : stats2;

  // Aggregate stats across both innings for Top 3 Players of the Match
  const aggregatedPlayerStats = {};
  const aggregatedFieldingStats = {};

  // Helper to accumulate
  const accumulateStats = (stats, teamName) => {
    // Batting
    Object.entries(stats.batting).forEach(([name, bStat]) => {
      if (!aggregatedPlayerStats[name]) {
        aggregatedPlayerStats[name] = {
          name,
          team: teamName,
          batting: { runs: 0, balls: 0, fours: 0, sixes: 0 },
          bowling: { legalBalls: 0, runsConceded: 0, wickets: 0, maidens: 0 }
        };
      }
      aggregatedPlayerStats[name].batting.runs += bStat.runs || 0;
      aggregatedPlayerStats[name].batting.balls += bStat.balls || 0;
      aggregatedPlayerStats[name].batting.fours += bStat.fours || 0;
      aggregatedPlayerStats[name].batting.sixes += bStat.sixes || 0;
    });

    // Bowling
    Object.entries(stats.bowling).forEach(([name, bwStat]) => {
      if (!aggregatedPlayerStats[name]) {
        aggregatedPlayerStats[name] = {
          name,
          team: teamName,
          batting: { runs: 0, balls: 0, fours: 0, sixes: 0 },
          bowling: { legalBalls: 0, runsConceded: 0, wickets: 0, maidens: 0 }
        };
      }
      aggregatedPlayerStats[name].bowling.legalBalls += bwStat.legalBalls || 0;
      aggregatedPlayerStats[name].bowling.runsConceded += bwStat.runsConceded || 0;
      aggregatedPlayerStats[name].bowling.wickets += bwStat.wickets || 0;
      aggregatedPlayerStats[name].bowling.maidens += bwStat.maidens || 0;
    });

    // Fielding (catches / run outs)
    stats.fow.forEach(f => {
      if (f.dismissal) {
        // Simple extraction of fielder name if any
        const match = f.dismissal.match(/c\s+([A-Za-z0-9_ ]+)\s+b/);
        if (match && match[1]) {
          const fielder = match[1].trim();
          if (!aggregatedFieldingStats[fielder]) aggregatedFieldingStats[fielder] = { catches: 0, runOuts: 0, stumpings: 0 };
          aggregatedFieldingStats[fielder].catches += 1;
        }
      }
    });
  };

  accumulateStats(stats1, inn1.battingTeam);
  accumulateStats(stats2, inn2.battingTeam);

  const topPlayers = getTopPlayers(aggregatedPlayerStats, aggregatedFieldingStats, 3);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Match Scorecard: ${matchState.teams?.[0]?.name} vs ${matchState.teams?.[1]?.name}`,
        text: `Match Code: ${matchState.code}. Current: ${currentInn.battingTeam} ${currentInn.score}/${currentInn.wickets}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <button
          onClick={onBack}
          className="p-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-base font-black text-white m-0">Full Scorecard</h2>
          <span className="text-[10px] font-mono text-amber-300">CODE: {matchState.code}</span>
        </div>
        <button
          onClick={handleShare}
          className="p-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Result Banner */}
      {matchState.resultSummary && (
        <div className="mt-3 bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border border-amber-500/40 rounded-2xl p-3 text-center">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Trophy className="w-4 h-4" />
            <span>Match Result</span>
          </div>
          <div className="text-base font-black text-white mt-0.5">{matchState.resultSummary}</div>
        </div>
      )}

      {/* Innings Tabs */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={() => setActiveTab(0)}
          className={`py-2.5 px-3 rounded-2xl font-bold text-xs transition-all border ${
            activeTab === 0
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
          }`}
        >
          {inn1.battingTeam || 'Innings 1'} ({inn1.score}/{inn1.wickets})
        </button>
        <button
          onClick={() => setActiveTab(1)}
          className={`py-2.5 px-3 rounded-2xl font-bold text-xs transition-all border ${
            activeTab === 1
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
          }`}
        >
          {inn2.battingTeam || 'Innings 2'} ({inn2.score}/{inn2.wickets})
        </button>
      </div>

      {/* Innings Content */}
      <div className="flex flex-col gap-4 mt-3">
        {/* Batting Section */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Batting</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800 pb-1 text-[10px] uppercase">
                  <th className="py-1">Batter</th>
                  <th className="py-1 text-right">R</th>
                  <th className="py-1 text-right">B</th>
                  <th className="py-1 text-right">4s</th>
                  <th className="py-1 text-right">6s</th>
                  <th className="py-1 text-right">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {Object.values(currentStats.batting).map((b) => (
                  <tr key={b.name} className="py-1.5">
                    <td className="py-1.5 font-semibold text-white">
                      <div>{b.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {b.isOut ? (b.dismissal || 'out') : 'not out'}
                      </div>
                    </td>
                    <td className="py-1.5 text-right font-black text-white">{b.runs}</td>
                    <td className="py-1.5 text-right text-slate-400">{b.balls}</td>
                    <td className="py-1.5 text-right text-slate-400">{b.fours}</td>
                    <td className="py-1.5 text-right text-slate-400">{b.sixes}</td>
                    <td className="py-1.5 text-right text-slate-400">{b.strikeRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Extras row */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800 mt-2">
            <span>Extras</span>
            <span className="font-bold text-white">
              {currentStats.extras.total} (wd {currentStats.extras.wides}, nb {currentStats.extras.noBalls}, b {currentStats.extras.byes}, lb {currentStats.extras.legByes})
            </span>
          </div>

          {/* Total row */}
          <div className="flex items-center justify-between text-sm font-black text-white pt-2 border-t border-slate-700/60 mt-1">
            <span>Total</span>
            <span className="text-amber-400">
              {currentInn.score}/{currentInn.wickets} ({Math.floor(currentInn.legalBalls / 6)}.{currentInn.legalBalls % 6} ov)
            </span>
          </div>
        </div>

        {/* Bowling Section */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bowling</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800 pb-1 text-[10px] uppercase">
                  <th className="py-1">Bowler</th>
                  <th className="py-1 text-right">O</th>
                  <th className="py-1 text-right">M</th>
                  <th className="py-1 text-right">R</th>
                  <th className="py-1 text-right">W</th>
                  <th className="py-1 text-right">ECON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {Object.values(currentStats.bowling).map((bw) => (
                  <tr key={bw.name} className="py-1.5">
                    <td className="py-1.5 font-semibold text-white">{bw.name}</td>
                    <td className="py-1.5 text-right font-mono text-slate-300">{bw.overs}</td>
                    <td className="py-1.5 text-right text-slate-400">{bw.maidens}</td>
                    <td className="py-1.5 text-right text-slate-300">{bw.runsConceded}</td>
                    <td className="py-1.5 text-right font-black text-rose-400">{bw.wickets}</td>
                    <td className="py-1.5 text-right text-slate-400">{bw.economy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fall of Wickets */}
        {currentStats.fow.length > 0 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fall of Wickets</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {currentStats.fow.map((f) => (
                <div key={f.wicketNumber} className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                  <span className="font-bold text-rose-400">{f.score}-{f.wicketNumber}</span>{' '}
                  <span className="text-slate-300">({f.playerOut}, {f.overs} ov)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 3 Players of the Match */}
        {topPlayers.length > 0 && (
          <div className="bg-gradient-to-b from-slate-900 to-slate-920 border border-slate-800 rounded-3xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-black text-white">Top 3 Players of the Match</h3>
            </div>

            <div className="flex flex-col gap-2.5">
              {topPlayers.map((p, idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                const badgeBgs = ['border-amber-500/50 bg-amber-500/10', 'border-slate-500/50 bg-slate-500/10', 'border-amber-700/50 bg-amber-700/10'];
                return (
                  <div
                    key={p.playerId}
                    className={`p-3 rounded-2xl border ${badgeBgs[idx] || 'border-slate-800'} flex flex-col gap-1.5`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{medals[idx]}</span>
                        <div>
                          <div className="font-black text-sm text-white">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.team}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-amber-400">{p.totalPoints} pts</div>
                        <div className="text-[10px] text-slate-400">Total Points</div>
                      </div>
                    </div>

                    {/* Breakdown Chips */}
                    <div className="flex flex-wrap gap-1 text-[10px] text-slate-300 pt-1 border-t border-slate-800/80">
                      {p.breakdown.runs > 0 && <span className="bg-slate-800 px-1.5 py-0.5 rounded">Runs: +{p.breakdown.runs}</span>}
                      {p.breakdown.boundaries > 0 && <span className="bg-slate-800 px-1.5 py-0.5 rounded">Boundaries: +{p.breakdown.boundaries}</span>}
                      {p.breakdown.strikeRateBonus > 0 && <span className="bg-slate-800 px-1.5 py-0.5 rounded">SR Bonus: +{p.breakdown.strikeRateBonus}</span>}
                      {p.breakdown.wickets > 0 && <span className="bg-rose-950/60 text-rose-300 border border-rose-800/40 px-1.5 py-0.5 rounded">Wickets: +{p.breakdown.wickets}</span>}
                      {p.breakdown.maidens > 0 && <span className="bg-slate-800 px-1.5 py-0.5 rounded">Maidens: +{p.breakdown.maidens}</span>}
                      {p.breakdown.economyBonus > 0 && <span className="bg-slate-800 px-1.5 py-0.5 rounded">Economy: +{p.breakdown.economyBonus}</span>}
                      {p.breakdown.fielding > 0 && <span className="bg-slate-800 px-1.5 py-0.5 rounded">Fielding: +{p.breakdown.fielding}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <footer className="mt-8 pt-4 pb-4 text-center text-xs text-slate-500 border-t border-slate-900">
        Cricket Scorer • Developed with 🏏 by <span className="text-slate-300 font-bold">Syed Maaz Alam</span>
      </footer>
    </div>
  );
}
