import React, { useState, useRef } from 'react';
import { ArrowLeft, Trophy, Award, Share2, Check, Image as ImageIcon, Users, FileSpreadsheet, Calendar, Hash, BarChart2, Shield, Activity, User, Target, Info } from 'lucide-react';
import html2canvas from 'html2canvas';
import { computeInningsStats, getScoreAtLegalBalls } from '../engine/stats.js';
import { formatOvers, calculateCRR } from '../engine/rules.js';
import { getTopPlayers } from '../engine/potm.js';
import { getShareUrl } from '../engine/constants.js';
import MatchCharts from '../components/MatchCharts.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import BatterDetailsModal from '../components/BatterDetailsModal.jsx';
import SquadModal from '../components/SquadModal.jsx';
import PointingCriteriaModal from '../components/PointingCriteriaModal.jsx';
import MatchSummaryImageGenerator from '../components/MatchSummaryImageGenerator.jsx';
import { exportAndSaveImage } from '../engine/nativeExport.js';
import { SkeletonBox, SkeletonCard, SkeletonTable } from '../components/ui/LoadingPrimitives.jsx';

// Team crest shield component matching redesign prototype
function TeamCrest({ name, color }) {
  const initials = (name || 'SC')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SC';

  return (
    <svg width="50" height="58" viewBox="0 0 54 62" role="img" aria-label={`${name} crest`} style={{ flex: 'none' }}>
      <path d="M27 2 50 10v22c0 14-10 24-23 28C14 56 4 46 4 32V10Z" fill={color} stroke="rgba(255,255,255,.65)" strokeWidth="2" />
      <path d="M19 9l4 5 4-6 4 6 4-5-1 8H20Z" fill="#FFC83D" />
      <text x="27" y="41" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff">
        {initials}
      </text>
    </svg>
  );
}

export default function Scorecard({ matchState, onBack, onOpenSummary }) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Innings 1, 1 = Innings 2
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedBatterDetails, setSelectedBatterDetails] = useState(null);
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [isPointingCriteriaOpen, setIsPointingCriteriaOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const scorecardRef = useRef(null);

  const isLoading = !matchState || (!matchState.code && (!matchState.teams || matchState.teams.length === 0));

  if (isLoading) {
    return (
      <div
        style={{ color: 'var(--t1)' }}
        className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 select-none"
      >
        <header className="top flex items-center justify-between pb-3">
          <button onClick={onBack} className="ib" aria-label="Back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
              style={{ borderColor: 'var(--pri)', borderTopColor: 'transparent' }}
            />
            <span className="mu text-xs font-bold">Loading live scorecard...</span>
          </div>
          <ThemeToggle />
        </header>

        {/* Shimmer Skeleton Scorecard Layout */}
        <div className="flex flex-col gap-4 mt-2">
          {/* Match Overview Header Skeleton */}
          <div className="card p-5 rounded-2xl border border-[var(--bd)] bg-[var(--card)] flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SkeletonBox className="w-12 h-14 rounded-xl" />
                <div className="flex flex-col gap-2">
                  <SkeletonBox className="w-24 h-5 rounded-lg" />
                  <SkeletonBox className="w-32 h-7 rounded-lg" />
                </div>
              </div>
              <SkeletonBox className="w-12 h-12 rounded-full" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-2">
                  <SkeletonBox className="w-24 h-5 rounded-lg" />
                  <SkeletonBox className="w-32 h-7 rounded-lg" />
                </div>
                <SkeletonBox className="w-12 h-14 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--bd)]">
              <SkeletonBox className="h-12 rounded-xl" />
              <SkeletonBox className="h-12 rounded-xl" />
              <SkeletonBox className="h-12 rounded-xl" />
            </div>
          </div>

          {/* Batting Table Skeleton */}
          <SkeletonTable rows={4} cols={6} />

          {/* Bowling Table Skeleton */}
          <SkeletonTable rows={3} cols={5} />
        </div>
      </div>
    );
  }

  const teamAName = matchState?.teams?.[0]?.name || 'Team Alpha';
  const teamBName = matchState?.teams?.[1]?.name || 'Team Bravo';

  const inn1 = matchState?.innings?.[0] || {
    score: 0,
    wickets: 0,
    legalBalls: 0,
    balls: [],
    battingTeam: teamAName,
    bowlingTeam: teamBName
  };

  const inn2 = matchState?.innings?.[1] || {
    score: 0,
    wickets: 0,
    legalBalls: 0,
    balls: [],
    battingTeam: teamBName,
    bowlingTeam: teamAName
  };

  const stats1 = computeInningsStats(inn1);
  const stats2 = computeInningsStats(inn2);

  const currentInn = activeTab === 0 ? inn1 : inn2;
  const currentStats = activeTab === 0 ? stats1 : stats2;
  const opponentInn = activeTab === 0 ? inn2 : inn1;

  // Top 3 Players of the Match computation
  const aggregatedPlayerStats = {};
  const aggregatedFieldingStats = {};

  const getPlayerTeam = (playerName) => {
    if (matchState?.teams && Array.isArray(matchState.teams)) {
      for (const t of matchState.teams) {
        if (t.players && t.players.includes(playerName)) {
          return t.name;
        }
      }
    }
    return null;
  };

  const accumulateStats = (stats, battingTeamName, bowlingTeamName) => {
    Object.entries(stats.batting).forEach(([name, bStat]) => {
      const actualTeam = getPlayerTeam(name) || battingTeamName;
      if (!aggregatedPlayerStats[name]) {
        aggregatedPlayerStats[name] = {
          name,
          team: actualTeam,
          batting: { runs: 0, balls: 0, fours: 0, sixes: 0 },
          bowling: { legalBalls: 0, runsConceded: 0, wickets: 0, maidens: 0, dots: 0 }
        };
      }
      aggregatedPlayerStats[name].batting.runs += bStat.runs || 0;
      aggregatedPlayerStats[name].batting.balls += bStat.balls || 0;
      aggregatedPlayerStats[name].batting.fours += bStat.fours || 0;
      aggregatedPlayerStats[name].batting.sixes += bStat.sixes || 0;
    });

    Object.entries(stats.bowling).forEach(([name, bwStat]) => {
      const actualTeam = getPlayerTeam(name) || bowlingTeamName;
      if (!aggregatedPlayerStats[name]) {
        aggregatedPlayerStats[name] = {
          name,
          team: actualTeam,
          batting: { runs: 0, balls: 0, fours: 0, sixes: 0 },
          bowling: { legalBalls: 0, runsConceded: 0, wickets: 0, maidens: 0, dots: 0 }
        };
      }
      aggregatedPlayerStats[name].bowling.legalBalls += bwStat.legalBalls || 0;
      aggregatedPlayerStats[name].bowling.runsConceded += bwStat.runsConceded || 0;
      aggregatedPlayerStats[name].bowling.wickets += bwStat.wickets || 0;
      aggregatedPlayerStats[name].bowling.maidens += bwStat.maidens || 0;
      aggregatedPlayerStats[name].bowling.dots += bwStat.dots || 0;
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

  accumulateStats(stats1, inn1.battingTeam, inn1.bowlingTeam);
  accumulateStats(stats2, inn2.battingTeam, inn2.bowlingTeam);

  const topPlayers = getTopPlayers(aggregatedPlayerStats, aggregatedFieldingStats, 3);
  const topPerformer = topPlayers?.[0];

  const timeFormat = typeof localStorage !== 'undefined' ? (localStorage.getItem('setting_time_format') || '12h') : '12h';
  const matchTimeStr = matchState?.createdAt
    ? new Date(matchState.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: timeFormat !== '24h' })
    : '';
  const matchDate = matchState?.createdAt
    ? `${new Date(matchState.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${matchTimeStr ? ` · ${matchTimeStr}` : ''}`
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const shareUrl = getShareUrl('watch', matchState?.code || '');

  const handleShare = () => {
    const title = `Scorecard: ${teamAName} vs ${teamBName}`;
    const text = `Full Cricket Scorecard (Code: ${matchState?.code}):\n${inn1.battingTeam}: ${inn1.score}/${inn1.wickets}\n${inn2.battingTeam}: ${inn2.score}/${inn2.wickets}\n`;

    if (navigator.share) {
      navigator.share({ title, text, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportPNG = async () => {
    if (!scorecardRef.current || isExporting) return;
    try {
      setIsExporting(true);

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const element = scorecardRef.current;

      const canvas = await html2canvas(element, {
        backgroundColor: isDark ? '#021024' : '#F0F7FF',
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          const el = clonedDoc.querySelector('[ref="scorecardRef"]') || clonedDoc.body;
          if (el) {
            el.style.overflow = 'visible';
            el.style.maxHeight = 'none';
          }
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((node) => {
            node.style.backdropFilter = 'none';
            node.style.webkitBackdropFilter = 'none';

            if (node.style.backgroundClip === 'text' || node.style.webkitBackgroundClip === 'text') {
              node.style.backgroundClip = 'unset';
              node.style.webkitBackgroundClip = 'unset';
              node.style.color = isDark ? '#C1E8FF' : '#0B1F3B';
            }

            if (node.children.length === 0 && node.textContent && node.textContent.trim().length > 0) {
              node.style.lineHeight = '1.3';
              node.style.transform = 'translateY(-1.5px)';
              if (node.parentElement) {
                node.parentElement.style.overflow = 'visible';
              }
            }
          });
        }
      });

      const cleanTeams = `${teamAName.replace(/\s+/g, '_')}-vs-${teamBName.replace(/\s+/g, '_')}`;
      const fileName = `Scorecard_${cleanTeams}_${matchState?.code || 'live'}.png`;

      await exportAndSaveImage(canvas, fileName, `Scorecard: ${teamAName} vs ${teamBName}`);
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('Could not export image directly. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const crrNum = calculateCRR(currentInn.score || 0, currentInn.legalBalls || 0);

  // Helper renderer for a Batting table
  const renderBattingTable = (innings, stats) => {
    const battingEntries = Object.values(stats.batting);
    return (
      <div className="card glass-card rounded-2xl overflow-hidden mb-6 p-0 border border-[var(--bd)] shadow-sm bg-[var(--card)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-[var(--well)] text-xs font-bold text-[var(--t2)] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">BATTER</th>
                <th className="text-right px-2 py-3 w-12 font-semibold">R</th>
                <th className="text-right px-2 py-3 w-12 font-semibold">B</th>
                <th className="text-right px-2 py-3 w-12 font-semibold">4S</th>
                <th className="text-right px-2 py-3 w-12 font-semibold">6S</th>
                <th className="text-right pr-4 pl-2 py-3 w-16 font-semibold">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--bd)]">
              {battingEntries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-xs text-[var(--t3)] font-medium">
                    Yet to bat
                  </td>
                </tr>
              ) : (
                battingEntries.map((b) => (
                  <tr
                    key={b.name}
                    onClick={() => setSelectedBatterDetails({ name: b.name, innings })}
                    className="hover:bg-[var(--well)]/50 transition-colors cursor-pointer"
                    title="Click for player timeline"
                  >
                    <td className="text-left px-4 py-3">
                      <div className="font-bold text-sm text-[var(--t1)] truncate">
                        {b.name}
                      </div>
                      <div className="text-[11px] text-[var(--t3)] truncate font-normal mt-0.5">
                        {b.isOut ? (b.dismissal || 'out') : (
                          <span className="text-[var(--ok)] font-medium">not out</span>
                        )}
                      </div>
                    </td>
                    <td className="text-right px-2 py-3 w-12 font-bold font-mono text-sm text-[var(--t1)]">
                      {b.runs}
                    </td>
                    <td className="text-right px-2 py-3 w-12 font-mono text-sm text-[var(--t2)]">
                      {b.balls}
                    </td>
                    <td className="text-right px-2 py-3 w-12 font-mono text-sm text-[var(--t2)]">
                      {b.fours}
                    </td>
                    <td className="text-right px-2 py-3 w-12 font-mono text-sm text-[var(--t2)]">
                      {b.sixes}
                    </td>
                    <td className="text-right pr-4 pl-2 py-3 w-16 font-mono text-sm text-[var(--t2)]">
                      {Math.round(b.strikeRate || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Extras row */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--well)]/40 border-t border-[var(--bd)] text-xs">
          <span className="text-[var(--t2)] font-medium">Extras</span>
          <span className="font-bold text-[var(--t1)]">
            {stats.extras.total}{' '}
            <span className="font-normal text-[var(--t3)] text-[11px]">
              (wd {stats.extras.wides}, nb {stats.extras.noBalls}, b {stats.extras.byes}, lb {stats.extras.legByes})
            </span>
          </span>
        </div>

        {/* Total row */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--well)] border-t border-[var(--bd)]">
          <span className="font-black text-sm text-[var(--t1)] uppercase tracking-wide">Total</span>
          <span className="font-mono font-black text-lg sm:text-xl text-[var(--ok)]">
            {innings.score}/{innings.wickets}{' '}
            <span className="font-sans font-medium text-xs text-[var(--t2)]">
              ({formatOvers(innings.legalBalls)} ov)
            </span>
          </span>
        </div>
      </div>
    );
  };

  // Helper renderer for a Bowling table
  const renderBowlingTable = (innings, stats) => {
    const bowlingEntries = Object.values(stats.bowling);
    return (
      <div className="card glass-card rounded-2xl overflow-hidden mb-6 p-0 border border-[var(--bd)] shadow-sm bg-[var(--card)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-[var(--well)] text-xs font-semibold text-[var(--t2)] uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">BOWLER</th>
                <th className="text-right px-2 py-3 w-12 font-semibold">O</th>
                <th className="text-right px-2 py-3 w-12 font-semibold">M</th>
                <th className="text-right px-2 py-3 w-12 font-semibold">R</th>
                <th className="text-right px-2 py-3 w-12 font-semibold">W</th>
                <th className="text-right pr-4 pl-2 py-3 w-16 font-semibold">ECON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--bd)]">
              {bowlingEntries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-xs text-[var(--t3)] font-medium">
                    Yet to bowl
                  </td>
                </tr>
              ) : (
                bowlingEntries.map((bw) => (
                  <tr
                    key={bw.name}
                    className="hover:bg-[var(--well)]/50 transition-colors"
                  >
                    <td className="text-left px-4 py-3">
                      <div className="font-bold text-sm text-[var(--t1)] truncate">
                        {bw.name}
                      </div>
                    </td>
                    <td className="text-right px-2 py-3 w-12 font-mono text-sm text-[var(--t2)]">
                      {bw.overs}
                    </td>
                    <td className="text-right px-2 py-3 w-12 font-mono text-sm text-[var(--t2)]">
                      {bw.maidens}
                    </td>
                    <td className="text-right px-2 py-3 w-12 font-mono text-sm font-bold text-[var(--t1)]">
                      {bw.runsConceded}
                    </td>
                    <td className="text-right px-2 py-3 w-12 font-mono text-sm font-black text-[var(--bad)]">
                      {bw.wickets}
                    </td>
                    <td className="text-right pr-4 pl-2 py-3 w-16 font-mono text-sm text-[var(--t2)]">
                      {bw.economy}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const MEDALS = ['#FFD21F', '#C9CED6', '#CD7F32'];

  const renderTopPlayersSection = () => {
    if (!topPlayers || topPlayers.length === 0) return null;
    return (
      <section className="card glass-card rounded-2xl shadow-sm border border-[var(--bd)] p-4 bg-[var(--card)] backdrop-blur-md w-full">
        <div className="row bt">
          <div className="row">
            <span className="ok"><Trophy className="w-5 h-5 text-[var(--ok)]" /></span>
            <h3 className="h2 font-extrabold text-[var(--t1)] text-base">Top 3 players of the match</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsPointingCriteriaOpen(true)}
            className="btn s"
            style={{ color: 'var(--ok)', height: '32px' }}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Criteria</span>
          </button>
        </div>

        <div className="flex flex-col gap-2.5 mt-3">
          {topPlayers.map((p, idx) => (
            <div
              key={p.playerId}
              className="rounded-2xl p-3 flex flex-col gap-1.5 transition-all"
              style={{
                background: 'var(--well)',
                border: '1px solid var(--bd)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-1.5 h-7 rounded-full shrink-0"
                    style={{ backgroundColor: MEDALS[idx] || '#FFD21F' }}
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <b className="text-sm font-bold text-[var(--t1)] truncate">{p.name}</b>
                      <span className="chip ok" style={{ padding: '1px 7px', fontSize: '11px' }}>
                        {p.totalPoints} pts
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--t2)] truncate mt-0.5">{p.team}</div>
                  </div>
                </div>
              </div>

              {/* Performance Breakdown Chips */}
              <div className="flex flex-wrap gap-1.5 mt-1 pl-4">
                <span className="chip text-[11px]">Runs +{p.breakdown.runs || 0}</span>
                <span className="chip text-[11px]">Boundaries +{p.breakdown.boundaries || 0}</span>
                {p.breakdown.wickets > 0 && (
                  <span className="chip text-[11px]">Wickets +{p.breakdown.wickets}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div
      style={{ color: 'var(--t1)' }}
      className="w-full max-w-5xl mx-auto px-0 sm:px-2 md:px-4 pt-2 pb-24 select-none"
    >
      {/* Action Row: unified single-line controls matching media_1793796232507_883085a1.jpg */}
      <div className="flex items-center justify-between w-full p-1.5 rounded-full bg-[rgba(10,21,56,0.65)] border border-[rgba(77,163,255,0.22)] backdrop-blur-md mb-5 shadow-sm">
        {onOpenSummary ? (
          <button
            onClick={() => onOpenSummary(matchState)}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold text-slate-200 hover:text-white transition-colors mx-auto"
            title="Open Complete Match Summary"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">Full Summary</span>
          </button>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          <button
            onClick={() => setIsSquadModalOpen(true)}
            className="ib shrink-0"
            title="Squads & Player List"
            aria-label="Squads"
          >
            <Users className="w-4 h-4" />
          </button>

          <button
            onClick={handleShare}
            title="Share Scorecard Link"
            className="ib shrink-0"
            aria-label="Share"
          >
            {copied ? <Check className="w-4 h-4 text-[var(--ok)]" /> : <Share2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="btn p s shrink-0 inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full m-0 font-bold text-xs"
            title="Export Scorecard"
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">Export Scorecard</span>
          </button>
        </div>
      </div>

      {/* Exportable Scorecard Container */}
      <div ref={scorecardRef} className="flex flex-col gap-4 w-full">
        {/* Responsive Desktop 2-Column Split / Mobile Single Column */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-6 items-start w-full">
          {/* Column 1 (On mobile: order-2, on desktop: order-1): Innings Tabs, Batting & Bowling Cards */}
          <div className="flex flex-col w-full min-w-0 order-2 lg:order-1">
            {/* Top Performer Feature Card */}
            {topPerformer && topPerformer.totalPoints > 0 && (
              <div
                className="card glass-card rounded-2xl p-4 mb-4 border shadow-xs transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
                  borderColor: 'rgba(245, 158, 11, 0.35)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ backgroundColor: '#F59E0B', color: '#FFFFFF' }}
                    >
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Top Performer · MVP
                        </span>
                        <span className="chip ok" style={{ padding: '1px 7px', fontSize: '10px' }}>
                          {topPerformer.totalPoints} pts
                        </span>
                      </div>
                      <span className="text-base font-extrabold text-[var(--t1)] truncate">
                        {topPerformer.name}
                        <span className="text-xs font-normal text-[var(--t2)] ml-1.5">
                          ({topPerformer.team})
                        </span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPointingCriteriaOpen(true)}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
                  >
                    Criteria →
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-amber-300/30 text-xs text-[var(--t2)]">
                  {topPerformer.batting?.runs > 0 && (
                    <span className="chip text-[11px]">
                      Batting: <strong className="text-[var(--t1)]">{topPerformer.batting.runs}</strong> runs ({topPerformer.batting.balls}b, {topPerformer.batting.fours}x4, {topPerformer.batting.sixes}x6)
                    </span>
                  )}
                  {topPerformer.bowling?.legalBalls > 0 && (
                    <span className="chip text-[11px]">
                      Bowling: <strong className="text-[var(--t1)]">{topPerformer.bowling.wickets}</strong>/{topPerformer.bowling.runsConceded} ({formatOvers(topPerformer.bowling.legalBalls)} ov)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Team / Innings Tabs */}
            <div className="seg mb-4 w-full" role="group">
              <button
                type="button"
                onClick={() => setActiveTab(0)}
                className={`flex-1 ${activeTab === 0 ? 'on' : ''}`}
                aria-pressed={activeTab === 0}
              >
                {teamAName} ({inn1.score}/{inn1.wickets})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(1)}
                className={`flex-1 ${activeTab === 1 ? 'on' : ''}`}
                aria-pressed={activeTab === 1}
              >
                {teamBName} ({inn2.score}/{inn2.wickets})
              </button>
            </div>

            {/* Innings Header Pill */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-1.5">
                <span className="ac"><Activity className="w-4 h-4 text-[var(--pri)]" /></span>
                <h3 className="text-sm font-extrabold text-[var(--t1)]">{currentInn.battingTeam}</h3>
              </div>
              <span className="font-mono font-black text-base sm:text-lg text-[var(--ok)]">
                {currentInn.score}/{currentInn.wickets}{' '}
                <span className="text-xs text-[var(--t2)] font-sans font-medium">({formatOvers(currentInn.legalBalls)} ov)</span>
              </span>
            </div>

            {/* Batting Section Card */}
            <div className="mb-2 px-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--t2)]">
                Batting · {currentInn.battingTeam}
              </h4>
            </div>
            {renderBattingTable(currentInn, currentStats)}

            {/* Bowling Section Card */}
            <div className="mb-2 px-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-[var(--t2)]">
                Bowling · {opponentInn.battingTeam}
              </h4>
            </div>
            {renderBowlingTable(currentInn, currentStats)}

            {/* Top 3 Players of the Match (Desktop Only: directly under Batting & Bowling cards) */}
            <div className="hidden lg:block mt-6 w-full">
              {renderTopPlayersSection()}
            </div>
          </div>

          {/* Column 2 (On mobile: order-1, on desktop: order-2): Match Overview Card, Over Charts & Top 3 Players */}
          <div className="flex flex-col gap-5 w-full min-w-0 order-1 lg:order-2">
            {/* Match Overview Card with Team Crest Shields */}
            <section className="card glass-card rounded-2xl p-4 sm:p-5 border border-[var(--bd)] shadow-sm bg-[var(--card)]">
              <div className="flex items-center justify-between gap-2">
                <TeamCrest name={teamAName} color="#0B2F6B" />

                <div className="text-center flex-1 min-w-0 px-2">
                  <h2 className="text-base sm:text-lg font-black text-[var(--t1)] truncate font-serif">
                    {teamAName} <span className="text-xs font-semibold text-[var(--t3)]">vs</span> {teamBName}
                  </h2>
                  <p className="text-xs text-[var(--t2)] mt-0.5">
                    {matchDate} · Match 1
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="pill mono ac">#{matchState?.code || 'MATCH'}</span>
                    <span className="pill live"><i></i>LIVE</span>
                  </div>
                </div>

                <TeamCrest name={teamBName} color="#2F7DF0" />
              </div>

              {/* Three-Column Score | Overs | RR Divider Strip */}
              <div className="grid grid-cols-3 divide-x divide-[var(--bd)] mt-4 pt-3.5 border-t border-[var(--bd)] text-center">
                <div className="px-1">
                  <div className="text-2xl sm:text-4xl font-serif font-black text-[var(--t1)] tracking-tight">
                    {currentInn.score}/{currentInn.wickets}
                  </div>
                  <div className="text-[11px] font-bold text-[var(--t2)] uppercase tracking-wider mt-0.5">Score</div>
                </div>
                <div className="px-1">
                  <div className="text-2xl sm:text-3xl font-serif font-black text-[var(--t1)] tracking-tight">
                    {formatOvers(currentInn.legalBalls)} <span className="text-xs sm:text-sm font-normal text-[var(--t3)]">ov</span>
                  </div>
                  <div className="text-[11px] font-bold text-[var(--t2)] uppercase tracking-wider mt-0.5">Overs</div>
                </div>
                <div className="px-1">
                  <div className="text-2xl sm:text-3xl font-serif font-black text-[var(--t1)] tracking-tight">
                    {crrNum.toFixed(1)}
                  </div>
                  <div className="text-[11px] font-bold text-[var(--t2)] uppercase tracking-wider mt-0.5">Run Rate</div>
                </div>
              </div>
            </section>

            {/* Embedded Over Comparison Chart */}
            <MatchCharts matchState={matchState} />

            {/* Top 3 Players of the Match (Mobile Only: placed in Column 2) */}
            <div className="block lg:hidden w-full">
              {renderTopPlayersSection()}
            </div>
          </div>
        </div>

        {/* Footer Attribution */}
        <p className="foot">
          © 2026 SmartCricket · Official Match Scorecard
        </p>
      </div>

      {/* Modals */}
      {selectedBatterDetails && (
        <BatterDetailsModal
          batterName={selectedBatterDetails.name}
          innings={selectedBatterDetails.innings}
          onClose={() => setSelectedBatterDetails(null)}
        />
      )}

      <SquadModal
        isOpen={isSquadModalOpen}
        onClose={() => setIsSquadModalOpen(false)}
        matchState={matchState}
        isManager={false}
        onSelectBatterDetails={(playerName) => {
          setIsSquadModalOpen(false);
          setSelectedBatterDetails({ name: playerName, innings: inn1 });
        }}
      />

      <PointingCriteriaModal
        isOpen={isPointingCriteriaOpen}
        onClose={() => setIsPointingCriteriaOpen(false)}
      />

      <MatchSummaryImageGenerator
        matchState={matchState}
        topPerformer={topPerformer}
        topPlayers={topPlayers}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
