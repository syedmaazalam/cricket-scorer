import React, { useState } from 'react';
import { ArrowLeft, Share2, Check, Copy, Trophy, Award, Users, Activity, BarChart2, Calendar } from 'lucide-react';
import { computeInningsStats, computeBatterDetails, computeBowlerDetails } from '../engine/stats.js';
import { formatOvers, calculateCRR } from '../engine/rules.js';
import { getTopPlayers } from '../engine/potm.js';
import ThemeToggle from '../components/ThemeToggle.jsx';

export default function MatchSummary({ matchState, onBack }) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Innings 1, 1 = Innings 2
  const [copied, setCopied] = useState(false);
  const [selectedBatter, setSelectedBatter] = useState(null);
  const [selectedBowler, setSelectedBowler] = useState(null);

  const teamAName = matchState?.teams?.[0]?.name || 'Team Alpha';
  const teamBName = matchState?.teams?.[1]?.name || 'Team Bravo';

  const inn1 = matchState?.innings?.[0] || { score: 0, wickets: 0, legalBalls: 0, balls: [], battingTeam: teamAName, bowlingTeam: teamBName };
  const inn2 = matchState?.innings?.[1] || { score: 0, wickets: 0, legalBalls: 0, balls: [], battingTeam: teamBName, bowlingTeam: teamAName };

  const currentInn = activeTab === 0 ? inn1 : inn2;
  const currentStats = computeInningsStats(currentInn);

  const matchCode = matchState?.code || '';
  const summaryUrl = `${window.location.origin}/?summary=${matchCode}`;

  const handleShareSummary = () => {
    const title = `Match Summary: ${teamAName} vs ${teamBName}`;
    const text = `Comprehensive Match Summary & Career Records (Code: ${matchCode}):\n${inn1.battingTeam}: ${inn1.score}/${inn1.wickets}\n${inn2.battingTeam}: ${inn2.score}/${inn2.wickets}\n`;

    if (navigator.share) {
      navigator.share({ title, text, url: summaryUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(summaryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Batters list for current innings
  const battersList = Object.keys(currentStats.batting);
  // Bowlers list for current innings
  const bowlersList = Object.keys(currentStats.bowling);

  // Compute detailed records for all batters in this innings
  const batterRecords = battersList.map(name => computeBatterDetails(currentInn, name)).filter(Boolean);

  // Compute detailed records for all bowlers in this innings
  const bowlerRecords = bowlersList.map(name => computeBowlerDetails(currentInn, name)).filter(Boolean);

  // Match date
  const matchDate = matchState?.createdAt
    ? new Date(matchState.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col p-3 sm:p-5 max-w-5xl mx-auto select-none transition-colors"
    >
      {/* 1. Header Bar */}
      <div
        style={{ borderColor: 'var(--border)' }}
        className="flex items-center justify-between pb-3 border-b"
      >
        <button
          onClick={onBack}
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
          className="p-2 rounded-2xl border transition-all active:scale-95 shadow-sm"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 style={{ color: 'var(--text)' }} className="text-base sm:text-lg font-black m-0">
            Comprehensive Match Summary
          </h1>
          <span style={{ color: 'var(--orange)' }} className="text-[11px] font-mono font-bold">
            #{matchCode || 'MATCH'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <button
            onClick={handleShareSummary}
            style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
            title="Share Summary URL"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied URL!' : 'Share Summary'}</span>
          </button>
        </div>
      </div>

      {/* 2. Match Overview Card */}
      <div
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        className="app-card p-4 mt-3 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm rounded-[20px]"
      >
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--orange)' }}
            className="w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl shadow-inner shrink-0"
          >
            🏏
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black" style={{ color: 'var(--text)' }}>
              {teamAName} vs {teamBName}
            </h2>
            <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {matchDate}</span>
              <span>•</span>
              <span>{matchState?.overs || 20} Overs Match</span>
            </div>
          </div>
        </div>

        {/* Scores Display */}
        <div className="flex items-center gap-4 text-right">
          <div className="p-2.5 rounded-2xl border" style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted)' }}>{inn1.battingTeam}</div>
            <div className="text-sm font-black" style={{ color: 'var(--text)' }}>
              {inn1.score}/{inn1.wickets} <span className="text-[11px] font-mono text-muted">({formatOvers(inn1.legalBalls)})</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl border" style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--muted)' }}>{inn2.battingTeam}</div>
            <div className="text-sm font-black" style={{ color: 'var(--text)' }}>
              {inn2.score}/{inn2.wickets} <span className="text-[11px] font-mono text-muted">({formatOvers(inn2.legalBalls)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Result Banner */}
      {matchState?.resultSummary && (
        <div
          style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
          className="p-3 rounded-2xl border text-center mt-3 flex items-center justify-center gap-2"
        >
          <Trophy className="w-4 h-4" style={{ color: 'var(--orange)' }} />
          <span className="font-black text-sm" style={{ color: 'var(--text)' }}>
            {matchState.resultSummary}
          </span>
        </div>
      )}

      {/* 3. Innings Tabs */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          onClick={() => { setActiveTab(0); setSelectedBatter(null); setSelectedBowler(null); }}
          style={{
            backgroundColor: activeTab === 0 ? 'var(--primary)' : 'var(--card)',
            color: activeTab === 0 ? '#FFFFFF' : 'var(--text)',
            borderColor: 'var(--border)'
          }}
          className="py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all border shadow-sm text-center"
        >
          {inn1.battingTeam} Innings ({inn1.score}/{inn1.wickets})
        </button>
        <button
          onClick={() => { setActiveTab(1); setSelectedBatter(null); setSelectedBowler(null); }}
          style={{
            backgroundColor: activeTab === 1 ? 'var(--primary)' : 'var(--card)',
            color: activeTab === 1 ? '#FFFFFF' : 'var(--text)',
            borderColor: 'var(--border)'
          }}
          className="py-2.5 px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all border shadow-sm text-center"
        >
          {inn2.battingTeam} Innings ({inn2.score}/{inn2.wickets})
        </button>
      </div>

      {/* 4. Complete Individual Batter Breakdowns */}
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
            <Activity className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <span>Complete Batter Records & Bowler Match-Ups</span>
          </h2>
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
            {batterRecords.length} Batters
          </span>
        </div>

        {batterRecords.length === 0 ? (
          <div style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }} className="app-card p-6 text-center text-xs">
            No batting data recorded for this innings yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {batterRecords.map((bRec) => {
              const summary = bRec.summary;
              const isExpanded = selectedBatter === bRec.name;

              return (
                <div
                  key={bRec.name}
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                  className="app-card p-4 flex flex-col gap-3 rounded-[20px] shadow-sm transition-all"
                >
                  {/* Batter Top Summary Bar */}
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm sm:text-base" style={{ color: 'var(--text)' }}>
                          {bRec.name}
                        </span>
                        <span
                          style={{
                            backgroundColor: summary.isOut ? 'color-mix(in srgb, var(--red) 15%, transparent)' : 'color-mix(in srgb, var(--green) 15%, transparent)',
                            color: summary.isOut ? 'var(--red)' : 'var(--green)',
                            borderColor: summary.isOut ? 'color-mix(in srgb, var(--red) 30%, transparent)' : 'color-mix(in srgb, var(--green) 30%, transparent)'
                          }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        >
                          {summary.isOut ? (summary.dismissal || 'Out') : 'Not Out'}
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--muted)' }}>
                        {summary.runs} runs off {summary.balls} balls • SR {summary.strikeRate} • {summary.fours} 4s • {summary.sixes} 6s
                      </div>
                    </div>

                    {/* Quick Stats Pills */}
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                      <span className="px-2 py-1 rounded-lg border" style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}>
                        Dots: {summary.dotCount} ({summary.dotBallPercentage}%)
                      </span>
                      <span className="px-2 py-1 rounded-lg border" style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}>
                        Boundary: {summary.boundaryRuns} runs ({summary.boundaryPercentage}%)
                      </span>
                      <button
                        onClick={() => setSelectedBatter(isExpanded ? null : bRec.name)}
                        style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--primary)' }}
                        className="px-2 py-1 rounded-lg border font-bold text-[10px] hover:opacity-80 transition-all"
                      >
                        {isExpanded ? 'Hide Match-Ups' : 'View Head-to-Head'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Head-to-Head Match-Up against Each Bowler */}
                  {isExpanded && (
                    <div className="pt-2 border-t flex flex-col gap-2.5 animate-fadeIn" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--blue)' }}>
                        Head-to-Head Against Bowlers Faced
                      </span>

                      {bRec.headToHead.length === 0 ? (
                        <div className="text-xs text-muted">No bowler match-ups recorded.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b pb-1 text-[10px] uppercase font-bold" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                                <th className="py-1">Bowler</th>
                                <th className="py-1 text-right">Runs</th>
                                <th className="py-1 text-right">Balls</th>
                                <th className="py-1 text-right">Dots</th>
                                <th className="py-1 text-right">4s</th>
                                <th className="py-1 text-right">6s</th>
                                <th className="py-1 text-right">SR</th>
                                <th className="py-1 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                              {bRec.headToHead.map((h2h) => (
                                <tr key={h2h.bowlerName} className="py-1.5">
                                  <td className="py-1.5 font-bold" style={{ color: 'var(--text)' }}>{h2h.bowlerName}</td>
                                  <td className="py-1.5 text-right font-black" style={{ color: 'var(--text)' }}>{h2h.runs}</td>
                                  <td className="py-1.5 text-right" style={{ color: 'var(--muted)' }}>{h2h.balls}</td>
                                  <td className="py-1.5 text-right" style={{ color: 'var(--muted)' }}>{h2h.dots}</td>
                                  <td className="py-1.5 text-right" style={{ color: 'var(--muted)' }}>{h2h.fours}</td>
                                  <td className="py-1.5 text-right" style={{ color: 'var(--muted)' }}>{h2h.sixes}</td>
                                  <td className="py-1.5 text-right font-mono" style={{ color: 'var(--primary)' }}>{h2h.strikeRate}</td>
                                  <td className="py-1.5 text-right font-semibold" style={{ color: h2h.isDismissed ? 'var(--red)' : 'var(--green)' }}>
                                    {h2h.isDismissed ? 'Dismissed' : 'Not Out'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Delivery Timeline Strip */}
                      {bRec.timeline.length > 0 && (
                        <div className="pt-2 border-t flex flex-col gap-1.5" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                            Ball-by-Ball Timeline
                          </span>
                          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                            {bRec.timeline.map((del, dIdx) => {
                              const isW = del.isWicket;
                              const is6 = del.isSix;
                              const is4 = del.isFour;
                              const hasRuns = del.runs > 0;
                              const bg = isW ? 'var(--red)' : is6 ? 'var(--purple)' : is4 ? 'var(--blue)' : hasRuns ? 'var(--primary)' : 'var(--card-alt)';
                              const fg = (isW || is6 || is4 || hasRuns) ? '#FFFFFF' : 'var(--muted)';
                              const bc = (isW || is6 || is4 || hasRuns) ? bg : 'var(--border)';

                              return (
                                <div
                                  key={dIdx}
                                  style={{
                                    backgroundColor: bg,
                                    color: fg,
                                    borderColor: bc
                                  }}
                                  className="w-6 h-6 rounded-lg border flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm"
                                  title={`Ball ${del.ballInOver} vs ${del.bowler}: ${del.shortLabel} runs`}
                                >
                                  {del.shortLabel}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 5. Complete Individual Bowler Breakdowns */}
        <div className="flex items-center justify-between mt-4">
          <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
            <BarChart2 className="w-4 h-4" style={{ color: 'var(--blue)' }} />
            <span>Complete Bowler Records & Batter Match-Ups</span>
          </h2>
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
            {bowlerRecords.length} Bowlers
          </span>
        </div>

        {bowlerRecords.length === 0 ? (
          <div style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }} className="app-card p-6 text-center text-xs">
            No bowling data recorded for this innings yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {bowlerRecords.map((bwRec) => {
              const summary = bwRec.summary;
              const isExpanded = selectedBowler === bwRec.name;

              return (
                <div
                  key={bwRec.name}
                  style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                  className="app-card p-4 flex flex-col gap-3 rounded-[20px] shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm sm:text-base" style={{ color: 'var(--blue)' }}>
                          {bwRec.name}
                        </span>
                        <span
                          style={{
                            backgroundColor: summary.wickets > 0 ? 'color-mix(in srgb, var(--red) 15%, transparent)' : 'var(--card-alt)',
                            color: summary.wickets > 0 ? 'var(--red)' : 'var(--text)',
                            borderColor: 'var(--border)'
                          }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        >
                          {summary.wickets} {summary.wickets === 1 ? 'Wicket' : 'Wickets'}
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--muted)' }}>
                        {summary.overs} ov • {summary.maidens} maidens • {summary.runsConceded} runs • Econ {summary.economy}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                      <span className="px-2 py-1 rounded-lg border" style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}>
                        Dots: {summary.dotCount} ({summary.dotBallPercentage}%)
                      </span>
                      <span className="px-2 py-1 rounded-lg border" style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}>
                        Boundaries: {summary.boundaryFours + summary.boundarySixes}
                      </span>
                      <button
                        onClick={() => setSelectedBowler(isExpanded ? null : bwRec.name)}
                        style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--blue)' }}
                        className="px-2 py-1 rounded-lg border font-bold text-[10px] hover:opacity-80 transition-all"
                      >
                        {isExpanded ? 'Hide Match-Ups' : 'View Head-to-Head'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Head-to-Head Against Each Batter */}
                  {isExpanded && (
                    <div className="pt-2 border-t flex flex-col gap-2.5 animate-fadeIn" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                        Bowled Against Batters
                      </span>

                      {bwRec.headToHead.length === 0 ? (
                        <div className="text-xs text-muted">No batter match-ups recorded.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b pb-1 text-[10px] uppercase font-bold" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                                <th className="py-1">Batter</th>
                                <th className="py-1 text-right">Runs</th>
                                <th className="py-1 text-right">Balls</th>
                                <th className="py-1 text-right">Dots</th>
                                <th className="py-1 text-right">4s</th>
                                <th className="py-1 text-right">6s</th>
                                <th className="py-1 text-right">Wickets</th>
                                <th className="py-1 text-right">Economy</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                              {bwRec.headToHead.map((h2h) => (
                                <tr key={h2h.batterName} className="py-1.5">
                                  <td className="py-1.5 font-bold" style={{ color: 'var(--text)' }}>{h2h.batterName}</td>
                                  <td className="py-1.5 text-right font-black" style={{ color: 'var(--text)' }}>{h2h.runsConceded}</td>
                                  <td className="py-1.5 text-right" style={{ color: 'var(--muted)' }}>{h2h.balls}</td>
                                  <td className="py-1.5 text-right" style={{ color: 'var(--muted)' }}>{h2h.dots}</td>
                                  <td className="py-1.5 text-right" style={{ color: 'var(--muted)' }}>{h2h.fours}</td>
                                  <td className="py-1.5 text-right" style={{ color: 'var(--muted)' }}>{h2h.sixes}</td>
                                  <td className="py-1.5 text-right font-black" style={{ color: 'var(--red)' }}>{h2h.wickets}</td>
                                  <td className="py-1.5 text-right font-mono" style={{ color: 'var(--blue)' }}>{h2h.economy}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Attribution */}
      <footer
        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        className="mt-6 pt-4 pb-2 text-center text-xs border-t font-semibold"
      >
        CricketScorer • Developed with 🏏 by <span style={{ color: 'var(--text)' }} className="font-bold">Syed Maaz Alam</span>
      </footer>
    </div>
  );
}
