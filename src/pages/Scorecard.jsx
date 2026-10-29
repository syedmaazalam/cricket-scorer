import React, { useState, useRef } from 'react';
import { ArrowLeft, Trophy, Award, Share2, Check, Image as ImageIcon, Users } from 'lucide-react';
import html2canvas from 'html2canvas';
import { computeInningsStats, getScoreAtLegalBalls } from '../engine/stats.js';
import { formatOvers } from '../engine/rules.js';
import { getTopPlayers } from '../engine/potm.js';
import MatchCharts from '../components/MatchCharts.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import BatterDetailsModal from '../components/BatterDetailsModal.jsx';
import SquadModal from '../components/SquadModal.jsx';

export default function Scorecard({ matchState, onBack }) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Innings 1, 1 = Innings 2
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedBatterDetails, setSelectedBatterDetails] = useState(null);
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const scorecardRef = useRef(null);

  const isLoading = !matchState || (!matchState.code && (!matchState.teams || matchState.teams.length === 0));

  if (isLoading) {
    return (
      <div
        style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
        className="min-h-screen flex flex-col p-4 max-w-lg mx-auto select-none transition-colors"
      >
        <div style={{ borderColor: 'var(--border)' }} className="flex items-center justify-between pb-3 border-b">
          <button
            onClick={onBack}
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="p-2 rounded-2xl border transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 style={{ color: 'var(--text)' }} className="text-base font-black m-0">Full Scorecard</h2>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}
          />
          <span style={{ color: 'var(--muted)' }} className="text-xs font-semibold">Loading live scorecard...</span>
        </div>
      </div>
    );
  }

  const inn1 = matchState?.innings?.[0] || { score: 0, wickets: 0, legalBalls: 0, balls: [], battingTeam: 'Team 1', bowlingTeam: 'Team 2' };
  const inn2 = matchState?.innings?.[1] || { score: 0, wickets: 0, legalBalls: 0, balls: [], battingTeam: 'Team 2', bowlingTeam: 'Team 1' };

  const stats1 = computeInningsStats(inn1);
  const stats2 = computeInningsStats(inn2);

  const currentInn = activeTab === 0 ? inn1 : inn2;
  const currentStats = activeTab === 0 ? stats1 : stats2;

  // Aggregate stats across both innings for Top 3 Players of the Match
  const aggregatedPlayerStats = {};
  const aggregatedFieldingStats = {};

  const accumulateStats = (stats, teamName) => {
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

    stats.fow.forEach(f => {
      if (f.dismissal) {
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

  // Generate direct watch URL
  const shareUrl = `${window.location.origin}/?watch=${matchState?.code || ''}`;

  const handleShare = () => {
    const title = `Scorecard: ${matchState?.teams?.[0]?.name} vs ${matchState?.teams?.[1]?.name}`;
    const text = `Full Cricket Scorecard (Code: ${matchState?.code}):\n${currentInn.battingTeam} ${currentInn.score}/${currentInn.wickets}\n`;

    if (navigator.share) {
      navigator.share({ title, text, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Export Scorecard as PNG image
  const handleExportPNG = async () => {
    if (!scorecardRef.current || isExporting) return;
    try {
      setIsExporting(true);
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const canvas = await html2canvas(scorecardRef.current, {
        backgroundColor: isDark ? '#1B232C' : '#E0E1EE',
        scale: 2,
        useCORS: true,
        logging: false
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const cleanTeams = `${matchState?.teams?.[0]?.name || 'TeamA'}-vs-${matchState?.teams?.[1]?.name || 'TeamB'}`;
      link.download = `scorecard-${cleanTeams}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('Could not export image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const inn1ScoreAtPoint = (inn2?.legalBalls > 0)
    ? getScoreAtLegalBalls(inn1, inn2.legalBalls)
    : null;

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col p-2 sm:p-4 max-w-6xl mx-auto select-none transition-colors"
    >
      {/* 1. Header */}
      <div
        style={{ borderColor: 'var(--border)' }}
        className="flex items-center justify-between pb-3 border-b"
      >
        <button
          onClick={onBack}
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
          className="p-2 rounded-2xl border transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 style={{ color: 'var(--text)' }} className="text-base font-black m-0">Full Scorecard</h2>
          {matchState?.code ? (
            <span style={{ color: 'var(--orange)' }} className="text-[10px] font-mono font-bold">
              CODE: {matchState.code}
            </span>
          ) : (
            <span style={{ color: 'var(--muted)' }} className="text-[10px]">
              {matchState?.teams?.[0]?.name} vs {matchState?.teams?.[1]?.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          {/* Squads Button */}
          <button
            onClick={() => setIsSquadModalOpen(true)}
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="p-2 rounded-xl text-xs font-bold flex items-center gap-1 border shadow-sm active:scale-95 transition-all"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Squads</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            title="Share Scorecard Link"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="p-2 rounded-2xl border transition-all active:scale-95 shadow-sm"
          >
            {copied ? <Check className="w-5 h-5" style={{ color: 'var(--green)' }} /> : <Share2 className="w-5 h-5" style={{ color: 'var(--muted)' }} />}
          </button>
        </div>
      </div>

      {/* 2. Export Button Bar */}
      <div className="flex items-center justify-between pt-3 pb-1">
        <div style={{ color: 'var(--muted)' }} className="text-xs">
          Match statistics, over charts & individual batsman breakdowns (tap any batter)
        </div>

        <button
          onClick={handleExportPNG}
          disabled={isExporting}
          style={{
            backgroundColor: 'var(--primary)',
            color: '#FFFFFF'
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all"
        >
          {isExporting ? (
            <span>Generating PNG...</span>
          ) : (
            <>
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Export PNG</span>
            </>
          )}
        </button>
      </div>

      {/* Printable / Exportable Region */}
      <div ref={scorecardRef} className="flex flex-col gap-4 mt-2">
        {/* Match Result Banner */}
        {matchState?.resultSummary && (
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-3 text-center flex flex-col items-center gap-0.5"
          >
            <div style={{ color: 'var(--orange)' }} className="text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Trophy className="w-4 h-4" />
              <span>Match Result</span>
            </div>
            <div style={{ color: 'var(--text)' }} className="text-base font-black">
              {matchState.resultSummary}
            </div>
          </div>
        )}

        {/* Previous Team Score at this point when looking at 2nd innings */}
        {inn2?.balls?.length > 0 && (
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
            className="app-card py-2 px-3 text-xs flex items-center justify-between font-semibold"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span style={{ color: 'var(--muted)' }}>
                1st Inn: {inn1.battingTeam} {inn1.score}/{inn1.wickets}
              </span>
              <span style={{ color: 'var(--primary)' }}>
                2nd Inn: {inn2.battingTeam} {inn2.score}/{inn2.wickets}
              </span>
            </div>
            {inn1ScoreAtPoint && (
              <div className="text-right text-[11px] shrink-0 font-medium" style={{ color: 'var(--muted)' }}>
                1st Inn at {formatOvers(inn2.legalBalls)} ov:{' '}
                <strong style={{ color: 'var(--orange)' }}>
                  {inn1ScoreAtPoint.score}/{inn1ScoreAtPoint.wickets}
                </strong>
              </div>
            )}
          </div>
        )}

        {/* Innings Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab(0)}
            style={{
              backgroundColor: activeTab === 0 ? 'var(--primary)' : 'var(--card)',
              color: activeTab === 0 ? '#FFFFFF' : 'var(--text)',
              borderColor: 'var(--border)'
            }}
            className="py-2.5 px-3 rounded-2xl font-bold text-xs transition-all border shadow-sm"
          >
            {inn1.battingTeam || 'Innings 1'} ({inn1.score}/{inn1.wickets})
          </button>
          <button
            onClick={() => setActiveTab(1)}
            style={{
              backgroundColor: activeTab === 1 ? 'var(--primary)' : 'var(--card)',
              color: activeTab === 1 ? '#FFFFFF' : 'var(--text)',
              borderColor: 'var(--border)'
            }}
            className="py-2.5 px-3 rounded-2xl font-bold text-xs transition-all border shadow-sm"
          >
            {inn2.battingTeam || 'Innings 2'} ({inn2.score}/{inn2.wickets})
          </button>
        </div>

        {/* Responsive Grid: 2 columns on Desktop (lg:), 1 column on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* LEFT COLUMN: Batting Table, Extras, Total, Fall of Wickets */}
          <div className="flex flex-col gap-4">
            {/* Batting Section */}
            <div
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
              className="app-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 style={{ color: 'var(--text)' }} className="text-xs font-bold uppercase tracking-wider m-0">
                  Batting — {currentInn.battingTeam}
                </h3>
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  Tap batter for career/match breakdown
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                      className="border-b pb-1 text-[10px] uppercase font-bold"
                    >
                      <th className="py-1">BATTER</th>
                      <th className="py-1 text-right">R</th>
                      <th className="py-1 text-right">B</th>
                      <th className="py-1 text-right">4S</th>
                      <th className="py-1 text-right">6S</th>
                      <th className="py-1 text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody style={{ borderColor: 'var(--border)' }} className="divide-y">
                    {Object.values(currentStats.batting).length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ color: 'var(--muted)' }} className="py-4 text-center">
                          No batting entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      Object.values(currentStats.batting).map((b) => (
                        <tr
                          key={b.name}
                          onClick={() => setSelectedBatterDetails(b.name)}
                          className="py-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                          title="Click to view complete batter breakdown & bowler match-ups"
                        >
                          <td className="py-1.5 font-semibold" style={{ color: 'var(--text)' }}>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold">{b.name}</span>
                              <span className="text-[9px]" style={{ color: 'var(--primary)' }}>📊</span>
                            </div>
                            <div style={{ color: 'var(--muted)' }} className="text-[10px] font-normal">
                              {b.isOut ? (b.dismissal || 'out') : 'not out'}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text)' }} className="py-1.5 text-right font-black">{b.runs}</td>
                          <td style={{ color: 'var(--muted)' }} className="py-1.5 text-right">{b.balls}</td>
                          <td style={{ color: 'var(--muted)' }} className="py-1.5 text-right">{b.fours}</td>
                          <td style={{ color: 'var(--muted)' }} className="py-1.5 text-right">{b.sixes}</td>
                          <td style={{ color: 'var(--muted)' }} className="py-1.5 text-right font-mono">{b.strikeRate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Extras row */}
              <div
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                className="flex items-center justify-between text-xs pt-3 border-t mt-2 font-medium"
              >
                <span>Extras</span>
                <span style={{ color: 'var(--text)' }} className="font-bold">
                  {currentStats.extras.total} (wd {currentStats.extras.wides}, nb {currentStats.extras.noBalls}, b {currentStats.extras.byes}, lb {currentStats.extras.legByes})
                </span>
              </div>

              {/* Total row */}
              <div
                style={{ borderColor: 'var(--border)' }}
                className="flex items-center justify-between text-sm font-black pt-2 border-t mt-1"
              >
                <span style={{ color: 'var(--text)' }}>Total</span>
                <span style={{ color: 'var(--orange)' }}>
                  {currentInn.score}/{currentInn.wickets} ({formatOvers(currentInn.legalBalls)} ov)
                </span>
              </div>
            </div>

            {/* Fall of Wickets */}
            {currentStats.fow.length > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
                className="app-card p-4"
              >
                <h3 style={{ color: 'var(--text)' }} className="text-xs font-bold uppercase tracking-wider mb-2">
                  Fall of Wickets
                </h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  {currentStats.fow.map((f) => (
                    <div
                      key={f.wicketNumber}
                      style={{
                        backgroundColor: 'var(--card-alt)',
                        borderColor: 'var(--border)'
                      }}
                      className="px-2.5 py-1 rounded-xl border flex items-center gap-1.5"
                    >
                      <span style={{ color: 'var(--red)' }} className="font-bold">{f.score}-{f.wicketNumber}</span>
                      <span style={{ color: 'var(--text)' }}>({f.playerOut}, {f.overs} ov)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Over & Worm Charts, Bowling Table, Top 3 POTM */}
          <div className="flex flex-col gap-4">
            {/* Charts: Over-by-Over & Worm Comparison */}
            <MatchCharts matchState={matchState} />

            {/* Bowling Section */}
            <div
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
              className="app-card p-4"
            >
              <h3 style={{ color: 'var(--text)' }} className="text-xs font-bold uppercase tracking-wider mb-2">
                Bowling — {currentInn.bowlingTeam}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                      className="border-b pb-1 text-[10px] uppercase font-bold"
                    >
                      <th className="py-1">BOWLER</th>
                      <th className="py-1 text-right">O</th>
                      <th className="py-1 text-right">M</th>
                      <th className="py-1 text-right">R</th>
                      <th className="py-1 text-right">W</th>
                      <th className="py-1 text-right">ECON</th>
                    </tr>
                  </thead>
                  <tbody style={{ borderColor: 'var(--border)' }} className="divide-y">
                    {Object.values(currentStats.bowling).length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ color: 'var(--muted)' }} className="py-4 text-center">
                          No bowling entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      Object.values(currentStats.bowling).map((bw) => (
                        <tr key={bw.name} className="py-1.5">
                          <td style={{ color: 'var(--blue)' }} className="py-1.5 font-semibold">{bw.name}</td>
                          <td style={{ color: 'var(--text)' }} className="py-1.5 text-right font-mono">{bw.overs}</td>
                          <td style={{ color: 'var(--muted)' }} className="py-1.5 text-right">{bw.maidens}</td>
                          <td style={{ color: 'var(--text)' }} className="py-1.5 text-right">{bw.runsConceded}</td>
                          <td style={{ color: 'var(--red)' }} className="py-1.5 text-right font-black">{bw.wickets}</td>
                          <td style={{ color: 'var(--muted)' }} className="py-1.5 text-right">{bw.economy}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top 3 Players of the Match */}
            {topPlayers.length > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
                className="app-card p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5" style={{ color: 'var(--orange)' }} />
                  <h3 style={{ color: 'var(--text)' }} className="text-sm font-black">
                    Top 3 Players of the Match
                  </h3>
                </div>

                <div className="flex flex-col gap-2.5">
                  {topPlayers.map((p, idx) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div
                        key={p.playerId}
                        style={{
                          backgroundColor: 'var(--card-alt)',
                          borderColor: 'var(--border)'
                        }}
                        className="p-3 rounded-2xl border flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{medals[idx]}</span>
                            <div>
                              <div style={{ color: 'var(--text)' }} className="font-black text-sm">{p.name}</div>
                              <div style={{ color: 'var(--muted)' }} className="text-[10px]">{p.team}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div style={{ color: 'var(--orange)' }} className="text-base font-black">{p.totalPoints} pts</div>
                            <div style={{ color: 'var(--muted)' }} className="text-[10px]">Total Points</div>
                          </div>
                        </div>

                        <div
                          style={{ borderColor: 'var(--border)' }}
                          className="flex flex-wrap gap-1 text-[10px] pt-1.5 border-t"
                        >
                          {p.breakdown.runs > 0 && (
                            <span style={{ backgroundColor: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }} className="px-1.5 py-0.5 rounded border">
                              Runs: +{p.breakdown.runs}
                            </span>
                          )}
                          {p.breakdown.boundaries > 0 && (
                            <span style={{ backgroundColor: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }} className="px-1.5 py-0.5 rounded border">
                              Boundaries: +{p.breakdown.boundaries}
                            </span>
                          )}
                          {p.breakdown.strikeRateBonus > 0 && (
                            <span style={{ backgroundColor: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }} className="px-1.5 py-0.5 rounded border">
                              SR Bonus: +{p.breakdown.strikeRateBonus}
                            </span>
                          )}
                          {p.breakdown.wickets > 0 && (
                            <span style={{ backgroundColor: 'color-mix(in srgb, var(--red) 15%, transparent)', color: 'var(--red)', borderColor: 'color-mix(in srgb, var(--red) 30%, transparent)' }} className="px-1.5 py-0.5 rounded border font-bold">
                              Wickets: +{p.breakdown.wickets}
                            </span>
                          )}
                          {p.breakdown.maidens > 0 && (
                            <span style={{ backgroundColor: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }} className="px-1.5 py-0.5 rounded border">
                              Maidens: +{p.breakdown.maidens}
                            </span>
                          )}
                          {p.breakdown.economyBonus > 0 && (
                            <span style={{ backgroundColor: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }} className="px-1.5 py-0.5 rounded border">
                              Economy: +{p.breakdown.economyBonus}
                            </span>
                          )}
                          {p.breakdown.fielding > 0 && (
                            <span style={{ backgroundColor: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }} className="px-1.5 py-0.5 rounded border">
                              Fielding: +{p.breakdown.fielding}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Credit */}
        <footer
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          className="mt-4 pt-4 pb-2 text-center text-xs border-t"
        >
          Cricket Scorer • Developed with 🏏 by <span style={{ color: 'var(--text)' }} className="font-bold">Syed Maaz Alam</span>
        </footer>
      </div>

      {/* Modals */}
      {/* 1. Batter Career & Detailed Breakdown Modal */}
      {selectedBatterDetails && (
        <BatterDetailsModal
          batterName={selectedBatterDetails}
          innings={currentInn}
          onClose={() => setSelectedBatterDetails(null)}
        />
      )}

      {/* 2. Squad Modal */}
      <SquadModal
        isOpen={isSquadModalOpen}
        onClose={() => setIsSquadModalOpen(false)}
        matchState={matchState}
        isManager={false}
        onSelectBatterDetails={(playerName) => {
          setIsSquadModalOpen(false);
          setSelectedBatterDetails(playerName);
        }}
      />
    </div>
  );
}
