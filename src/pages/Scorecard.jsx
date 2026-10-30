import React, { useState, useRef } from 'react';
import { ArrowLeft, Trophy, Award, Share2, Check, Image as ImageIcon, Users, FileSpreadsheet, Calendar, Hash } from 'lucide-react';
import html2canvas from 'html2canvas';
import { computeInningsStats, getScoreAtLegalBalls } from '../engine/stats.js';
import { formatOvers } from '../engine/rules.js';
import { getTopPlayers } from '../engine/potm.js';
import MatchCharts from '../components/MatchCharts.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import BatterDetailsModal from '../components/BatterDetailsModal.jsx';
import SquadModal from '../components/SquadModal.jsx';

export default function Scorecard({ matchState, onBack, onOpenSummary }) {
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

  // Top 3 Players of the Match computation
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

  // Match Date string
  const matchDate = matchState?.createdAt
    ? new Date(matchState.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Share URL
  const shareUrl = `${window.location.origin}/?watch=${matchState?.code || ''}`;
  const summaryUrl = `${window.location.origin}/?summary=${matchState?.code || ''}`;

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

  // Export Scorecard as PNG image
  const handleExportPNG = async () => {
    if (!scorecardRef.current || isExporting) return;
    try {
      setIsExporting(true);
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const element = scorecardRef.current;

      const canvas = await html2canvas(element, {
        backgroundColor: isDark ? '#1B232C' : '#E0E1EE',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        onclone: (clonedDoc) => {
          // Ensure all cloned elements have visible layout and resolved standard colors
          const el = clonedDoc.querySelector('[ref="scorecardRef"]') || clonedDoc.body;
          if (el) el.style.overflow = 'visible';
        }
      });

      const cleanTeams = `${teamAName.replace(/\s+/g, '_')}-vs-${teamBName.replace(/\s+/g, '_')}`;
      const fileName = `Scorecard_${cleanTeams}_${matchState?.code || 'live'}.png`;

      canvas.toBlob((blob) => {
        if (!blob) {
          // Fallback to dataURL
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = fileName;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }, 'image/png');
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('Could not export image directly. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper renderer for a Batting table
  const renderBattingTable = (innings, stats) => {
    const battingEntries = Object.values(stats.batting);
    return (
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
            {battingEntries.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ color: 'var(--muted)' }} className="py-3 text-center text-[11px]">
                  Yet to bat
                </td>
              </tr>
            ) : (
              battingEntries.map((b) => (
                <tr
                  key={b.name}
                  onClick={() => setSelectedBatterDetails({ name: b.name, innings })}
                  className="py-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                  title="Click to view detailed head-to-head match-up & timeline"
                >
                  <td className="py-1.5 font-semibold" style={{ color: 'var(--text)' }}>
                    <div className="flex items-center gap-1">
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

        {/* Extras row */}
        <div
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          className="flex items-center justify-between text-xs pt-2.5 border-t mt-2 font-medium"
        >
          <span>Extras</span>
          <span style={{ color: 'var(--text)' }} className="font-bold text-[11px]">
            {stats.extras.total} (wd {stats.extras.wides}, nb {stats.extras.noBalls}, b {stats.extras.byes}, lb {stats.extras.legByes})
          </span>
        </div>

        {/* Total row */}
        <div
          style={{ borderColor: 'var(--border)' }}
          className="flex items-center justify-between text-sm font-black pt-2 border-t mt-1"
        >
          <span style={{ color: 'var(--text)' }}>Total</span>
          <span style={{ color: 'var(--orange)' }}>
            {innings.score}/{innings.wickets} ({formatOvers(innings.legalBalls)} ov)
          </span>
        </div>
      </div>
    );
  };

  // Helper renderer for a Bowling table
  const renderBowlingTable = (innings, stats) => {
    const bowlingEntries = Object.values(stats.bowling);
    return (
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
            {bowlingEntries.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ color: 'var(--muted)' }} className="py-3 text-center text-[11px]">
                  Yet to bowl
                </td>
              </tr>
            ) : (
              bowlingEntries.map((bw) => (
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
    );
  };

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col p-2 sm:p-4 max-w-6xl mx-auto select-none transition-colors"
    >
      {/* Top Action Bar (Navigation & Export Controls) */}
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

        <div className="flex items-center gap-2">
          {/* Summary Route Button */}
          {onOpenSummary && (
            <button
              onClick={() => onOpenSummary(matchState)}
              style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--primary)' }}
              className="px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border shadow-sm active:scale-95 transition-all"
              title="Open Complete Match Summary"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Full Summary</span>
            </button>
          )}

          {/* Squads Button */}
          <button
            onClick={() => setIsSquadModalOpen(true)}
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="p-2 rounded-xl text-xs font-bold flex items-center gap-1 border shadow-sm active:scale-95 transition-all"
            title="Squads & Player List"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Squads</span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Share Button */}
          <button
            onClick={handleShare}
            title="Share Scorecard Link"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="p-2 rounded-2xl border transition-all active:scale-95 shadow-sm"
          >
            {copied ? <Check className="w-5 h-5" style={{ color: 'var(--green)' }} /> : <Share2 className="w-5 h-5" style={{ color: 'var(--muted)' }} />}
          </button>

          {/* Export PNG Button */}
          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            style={{
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF'
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl font-bold text-xs shadow-md active:scale-95 transition-all"
          >
            {isExporting ? (
              <span>Exporting...</span>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                <span>Export PNG</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* EXPORTABLE / DISPLAY SCORECARD CANVAS (MATCHING IMAGE 3) */}
      {/* ============================================================ */}
      <div ref={scorecardRef} className="flex flex-col gap-4 mt-3 p-2 sm:p-3 rounded-[24px]">
        {/* 1. Header Card (Matching Image 3 Top Bar) */}
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
          className="app-card p-3 sm:p-4 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            {/* Bat Icon in rounded square */}
            <div
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--orange)'
              }}
              className="w-10 h-10 rounded-2xl border flex items-center justify-center text-xl shadow-inner shrink-0"
            >
              🏏
            </div>

            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>
                {teamAName} <span style={{ color: 'var(--muted)' }} className="font-normal text-xs sm:text-sm">vs</span> {teamBName}
              </h1>

              {/* Subtitle chips: #CODE & Date */}
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  style={{
                    backgroundColor: 'var(--orange)',
                    color: '#FFFFFF'
                  }}
                  className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold shadow-sm"
                >
                  #{matchState?.code || 'MATCH'}
                </span>

                <span
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    color: 'var(--muted)',
                    borderColor: 'var(--border)'
                  }}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3" />
                  <span>{matchDate}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Live Status Pill */}
          <div
            style={{
              backgroundColor: 'var(--green-15)',
              color: 'var(--green)',
              borderColor: 'var(--green-30)'
            }}
            className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--green)' }} />
            <span>Live</span>
          </div>
        </div>

        {/* 2. Embedded Over Comparison Chart (Bar / Worm) */}
        <MatchCharts matchState={matchState} />

        {/* 3. Innings Pill Switcher (Matching Image 3) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab(0)}
            style={{
              backgroundColor: activeTab === 0 ? 'var(--primary)' : 'var(--card)',
              color: activeTab === 0 ? '#FFFFFF' : 'var(--text)',
              borderColor: 'var(--border)'
            }}
            className="py-2.5 px-3 rounded-2xl font-black text-xs sm:text-sm transition-all border shadow-sm text-center"
          >
            {teamAName} ({inn1.score}/{inn1.wickets})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab(1)}
            style={{
              backgroundColor: activeTab === 1 ? 'var(--primary)' : 'var(--card)',
              color: activeTab === 1 ? '#FFFFFF' : 'var(--text)',
              borderColor: 'var(--border)'
            }}
            className="py-2.5 px-3 rounded-2xl font-black text-xs sm:text-sm transition-all border shadow-sm text-center"
          >
            {teamBName} ({inn2.score}/{inn2.wickets})
          </button>
        </div>

        {/* 4. SIDE-BY-SIDE DUAL-TEAM BATTING AND BOWLING CARDS (MATCHING IMAGE 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* ======================================================== */}
          {/* LEFT CARD: TEAM ALPHA (BATTING) + TEAM BRAVO (BOWLING) */}
          {/* ======================================================== */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-4 flex flex-col gap-3 shadow-md rounded-[20px]"
          >
            {/* Card Header: Pencil/Bat Icon, Team Name, Score */}
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <span className="text-base">🏏</span>
                <span className="font-black text-sm" style={{ color: 'var(--text)' }}>
                  {teamAName}
                </span>
              </div>
              <div className="font-black text-sm" style={{ color: 'var(--orange)' }}>
                {inn1.score}/{inn1.wickets} <span className="text-xs font-mono font-medium" style={{ color: 'var(--muted)' }}>({formatOvers(inn1.legalBalls)} ov)</span>
              </div>
            </div>

            {/* Subheader: BATTING • TEAM ALPHA */}
            <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
              BATTING • {teamAName}
            </div>

            {/* Batting Table for Team Alpha */}
            {renderBattingTable(inn1, stats1)}

            {/* Divider */}
            <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />

            {/* Subheader: BOWLING • TEAM BRAVO */}
            <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--blue)' }}>
              BOWLING • {teamBName}
            </div>

            {/* Bowling Table for Team Bravo */}
            {renderBowlingTable(inn1, stats1)}
          </div>

          {/* ======================================================== */}
          {/* RIGHT CARD: TEAM BRAVO (BATTING) + TEAM ALPHA (BOWLING) */}
          {/* ======================================================== */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-4 flex flex-col gap-3 shadow-md rounded-[20px]"
          >
            {/* Card Header: Shield/Ball Icon, Team Name, Score */}
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <span className="text-base">🛡️</span>
                <span className="font-black text-sm" style={{ color: 'var(--text)' }}>
                  {teamBName}
                </span>
              </div>
              <div className="font-black text-sm" style={{ color: 'var(--orange)' }}>
                {inn2.score}/{inn2.wickets} <span className="text-xs font-mono font-medium" style={{ color: 'var(--muted)' }}>({formatOvers(inn2.legalBalls)} ov)</span>
              </div>
            </div>

            {/* Subheader: BATTING • TEAM BRAVO */}
            <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
              BATTING • {teamBName}
            </div>

            {/* Batting Table for Team Bravo */}
            {renderBattingTable(inn2, stats2)}

            {/* Divider */}
            <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />

            {/* Subheader: BOWLING • TEAM ALPHA */}
            <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--blue)' }}>
              BOWLING • {teamAName}
            </div>

            {/* Bowling Table for Team Alpha */}
            {renderBowlingTable(inn2, stats2)}
          </div>
        </div>

        {/* 5. TOP 3 PLAYERS OF THE MATCH (MATCHING IMAGE 3 PODIUM) */}
        {topPlayers.length > 0 && (
          <div
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
            className="app-card p-4 flex flex-col gap-3 shadow-md rounded-[20px]"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🏆</span>
              <h3 style={{ color: 'var(--text)' }} className="text-xs sm:text-sm font-black uppercase tracking-wider m-0">
                TOP 3 PLAYERS OF THE MATCH
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topPlayers.map((p, idx) => {
                const medalColors = [
                  { bg: '#FFD700', text: '#805B00', border: 'rgba(255, 215, 0, 0.4)' }, // Gold
                  { bg: '#C0C0C0', text: '#4A4A4A', border: 'rgba(192, 192, 192, 0.4)' }, // Silver
                  { bg: '#CD7F32', text: '#5A320A', border: 'rgba(205, 127, 50, 0.4)' }  // Bronze
                ];
                const medal = medalColors[idx] || medalColors[0];

                return (
                  <div
                    key={p.playerId}
                    style={{
                      backgroundColor: 'var(--card-alt)',
                      borderColor: 'var(--border)'
                    }}
                    className="p-3.5 rounded-2xl border flex flex-col justify-between gap-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        {/* Circular Medal Number */}
                        <div
                          style={{
                            backgroundColor: medal.bg,
                            color: medal.text,
                            boxShadow: `0 0 10px ${medal.border}`
                          }}
                          className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0"
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ color: 'var(--text)' }} className="font-black text-xs sm:text-sm line-clamp-1">
                            {p.name}
                          </div>
                          <div style={{ color: 'var(--muted)' }} className="text-[10px] line-clamp-1">
                            {p.team}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div style={{ color: 'var(--orange)' }} className="text-sm font-black">
                          {p.totalPoints} pts
                        </div>
                        <div style={{ color: 'var(--muted)' }} className="text-[9px] uppercase font-bold">
                          Total Points
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Badges (Runs, Boundaries, Wickets) */}
                    <div className="flex items-center gap-1.5 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                      <span
                        style={{
                          backgroundColor: 'var(--green)',
                          color: '#FFFFFF'
                        }}
                        className="px-2 py-0.5 rounded-md text-[9px] font-black"
                      >
                        Runs +{p.breakdown.runs || 0}
                      </span>
                      <span
                        style={{
                          backgroundColor: 'var(--blue)',
                          color: '#FFFFFF'
                        }}
                        className="px-2 py-0.5 rounded-md text-[9px] font-black"
                      >
                        Boundaries +{p.breakdown.boundaries || 0}
                      </span>
                      {p.breakdown.wickets > 0 && (
                        <span
                          style={{
                            backgroundColor: 'var(--red)',
                            color: '#FFFFFF'
                          }}
                          className="px-2 py-0.5 rounded-md text-[9px] font-black"
                        >
                          Wickets +{p.breakdown.wickets}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Footer Attribution (Image 3) */}
        <footer
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          className="pt-3 pb-1 text-center text-xs font-semibold"
        >
          CricketScorer • Developed with 🏏 by <span style={{ color: 'var(--text)' }} className="font-bold">Syed Maaz Alam</span>
        </footer>
      </div>

      {/* Modals */}
      {/* 1. Batter Career & Detailed Breakdown Modal */}
      {selectedBatterDetails && (
        <BatterDetailsModal
          batterName={selectedBatterDetails.name}
          innings={selectedBatterDetails.innings}
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
          setSelectedBatterDetails({ name: playerName, innings: inn1 });
        }}
      />
    </div>
  );
}
