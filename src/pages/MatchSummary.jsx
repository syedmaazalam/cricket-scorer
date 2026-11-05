import React, { useState } from 'react';
import { ArrowLeft, Share2, Check, Trophy, Activity, BarChart2, Calendar, Sparkles, Info, Image as ImageIcon } from 'lucide-react';
import { computeInningsStats, computeBatterDetails, computeBowlerDetails } from '../engine/stats.js';
import { formatOvers, calculateCRR } from '../engine/rules.js';
import { getTopPlayers } from '../engine/potm.js';
import { getShareUrl } from '../engine/constants.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import PointingCriteriaModal from '../components/PointingCriteriaModal.jsx';
import MatchCharts from '../components/MatchCharts.jsx';
import MatchSummaryImageGenerator from '../components/MatchSummaryImageGenerator.jsx';

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

export default function MatchSummary({ matchState, onBack }) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Innings 1, 1 = Innings 2
  const [copied, setCopied] = useState(false);
  const [selectedBatter, setSelectedBatter] = useState(null);
  const [selectedBowler, setSelectedBowler] = useState(null);
  const [isPointingCriteriaOpen, setIsPointingCriteriaOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const teamAName = matchState?.teams?.[0]?.name || 'Team Alpha';
  const teamBName = matchState?.teams?.[1]?.name || 'Team Bravo';

  const inn1 = matchState?.innings?.[0] || { score: 0, wickets: 0, legalBalls: 0, balls: [], battingTeam: teamAName, bowlingTeam: teamBName };
  const inn2 = matchState?.innings?.[1] || { score: 0, wickets: 0, legalBalls: 0, balls: [], battingTeam: teamBName, bowlingTeam: teamAName };

  const currentInn = activeTab === 0 ? inn1 : inn2;
  const currentStats = computeInningsStats(currentInn);

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
  };

  accumulateStats(computeInningsStats(inn1), inn1.battingTeam, inn1.bowlingTeam);
  accumulateStats(computeInningsStats(inn2), inn2.battingTeam, inn2.bowlingTeam);

  const topPlayers = getTopPlayers(aggregatedPlayerStats, aggregatedFieldingStats, 3);
  const topPerformer = topPlayers?.[0];

  const matchCode = matchState?.code || '';
  const summaryUrl = getShareUrl('summary', matchCode);

  const handleShareSummary = () => {
    const title = `Match Summary: ${teamAName} vs ${teamBName}`;
    const text = `Comprehensive Match Summary (Code: ${matchCode}):\n${inn1.battingTeam}: ${inn1.score}/${inn1.wickets}\n${inn2.battingTeam}: ${inn2.score}/${inn2.wickets}\n`;

    if (navigator.share) {
      navigator.share({ title, text, url: summaryUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(summaryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const battersList = Object.keys(currentStats.batting);
  const bowlersList = Object.keys(currentStats.bowling);

  const batterRecords = battersList.map(name => computeBatterDetails(currentInn, name)).filter(Boolean);
  const bowlerRecords = bowlersList.map(name => computeBowlerDetails(currentInn, name)).filter(Boolean);

  const timeFormat = typeof localStorage !== 'undefined' ? (localStorage.getItem('setting_time_format') || '12h') : '12h';
  const matchTimeStr = matchState?.createdAt
    ? new Date(matchState.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: timeFormat !== '24h' })
    : '';
  const matchDate = matchState?.createdAt
    ? `${new Date(matchState.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${matchTimeStr ? ` · ${matchTimeStr}` : ''}`
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const MEDALS = ['#FFD21F', '#C9CED6', '#CD7F32'];

  return (
    <div
      style={{ color: 'var(--t1)' }}
      className="min-h-screen flex flex-col w-full max-w-lg lg:max-w-6xl mx-auto box-border min-w-0 px-1 sm:px-3 lg:pl-28 lg:pr-8 pb-24 select-none safe-top"
    >
      {/* 1. Header Row */}
      <div className="flex items-center gap-2 w-full my-2.5">
        <div className="hidden lg:flex items-center gap-1.5 mr-2 font-serif font-black text-lg text-[var(--pri)] tracking-tight">
          <span>SmartCricket</span>
        </div>

        <button
          onClick={onBack}
          className="ib"
          title="Back to scoring"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800 }}>Comprehensive Match Summary</h2>
          <span className="mono ok" style={{ fontSize: '12px', fontWeight: 700 }}>
            #{matchCode || 'MATCH'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="btn p s shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-xl m-0"
            title="Export Match Summary Image"
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold">Export</span>
          </button>

          <button
            onClick={handleShareSummary}
            className="ib p"
            title="Share Summary"
            aria-label="Share"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 w-full">
        {/* 2. Match Overview Card with Crests */}
        <section className="card">
          <div className="row bt" style={{ gap: '6px' }}>
            <TeamCrest name={teamAName} color="#0B2F6B" />

            <div style={{ textAlign: 'center', flex: 1 }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>
                {teamAName} <small className="mu" style={{ fontSize: '13px' }}>vs</small> {teamBName}
              </h2>
              <p className="mu" style={{ fontSize: '12px', marginTop: '3px' }}>
                {matchDate} · {matchState?.overs || 20} overs match
              </p>
              <div className="row" style={{ justifyContent: 'center', marginTop: '6px', gap: '6px' }}>
                <span className="pill mono ac">#{matchCode || 'MATCH'}</span>
                <span className="pill live"><i></i>LIVE</span>
              </div>
            </div>

            <TeamCrest name={teamBName} color="#2F7DF0" />
          </div>

          <div className="row" style={{ marginTop: '14px', gap: '8px' }}>
            <div className="tile">
              <span className="lbl truncate">{inn1.battingTeam}</span>
              <b style={{ fontSize: '18px' }}>
                {inn1.score}/{inn1.wickets} <span className="mu mono" style={{ fontSize: '12px' }}>({formatOvers(inn1.legalBalls)})</span>
              </b>
            </div>
            <div className="tile">
              <span className="lbl truncate">{inn2.battingTeam}</span>
              <b style={{ fontSize: '18px' }}>
                {inn2.score}/{inn2.wickets} <span className="mu mono" style={{ fontSize: '12px' }}>({formatOvers(inn2.legalBalls)})</span>
              </b>
            </div>
          </div>
        </section>

        {/* Result Banner if match completed or summary available */}
        {matchState?.resultSummary && (
          <div
            style={{ backgroundColor: 'var(--well)', borderColor: 'var(--bd)' }}
            className="p-3 rounded-2xl border text-center flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4 text-[var(--ok)]" />
            <span className="font-extrabold text-xs" style={{ color: 'var(--t1)' }}>
              {matchState.resultSummary}
            </span>
          </div>
        )}

        {/* Responsive Desktop 2-Column Split / Mobile Single Column */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-6 items-start w-full">
          {/* Left Column: Innings Tabs, Detailed Batting & Bowling Records */}
          <div className="flex flex-col gap-3.5 w-full min-w-0 lg:col-span-7">
            {/* 4. Innings Tabs */}
            <div className="seg" role="group">
              <button
                type="button"
                onClick={() => { setActiveTab(0); setSelectedBatter(null); setSelectedBowler(null); }}
                className={activeTab === 0 ? 'on' : ''}
                aria-pressed={activeTab === 0}
              >
                {inn1.battingTeam} Innings ({inn1.score}/{inn1.wickets})
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab(1); setSelectedBatter(null); setSelectedBowler(null); }}
                className={activeTab === 1 ? 'on' : ''}
                aria-pressed={activeTab === 1}
              >
                {inn2.battingTeam} Innings ({inn2.score}/{inn2.wickets})
              </button>
            </div>

            {/* 5. Complete Batter Records */}
            <div className="row bt" style={{ margin: '4px 0 8px' }}>
              <h3 className="h2">Complete batter records &amp; bowler match-ups</h3>
              <span className="mu" style={{ fontSize: '12px' }}>{batterRecords.length} Batters</span>
            </div>

            {batterRecords.length === 0 ? (
              <p className="mu pr text-center">No batting records yet</p>
            ) : (
              batterRecords.map((bRec) => {
                const summary = bRec.summary;
                const isExpanded = selectedBatter === bRec.name;

                return (
                  <div key={bRec.name} className="pr">
                    <div className="row bt">
                      <div className="row" style={{ gap: '8px' }}>
                        <b style={{ fontSize: '15px' }}>{bRec.name}</b>
                        <span className="chip">{summary.isOut ? (summary.dismissal || 'Out') : 'Not Out'}</span>
                      </div>
                    </div>
                    <p className="mu" style={{ margin: '6px 0 10px', fontSize: '12px' }}>
                      {summary.runs} runs off {summary.balls} balls · SR {Math.round(summary.strikeRate || 0)} · {summary.fours} 4s · {summary.sixes} 6s
                    </p>

                    <div className="row wrap" style={{ gap: '6px' }}>
                      <div className="tile" style={{ padding: '6px 10px' }}>
                        <span>Dots</span>
                        <b style={{ fontSize: '12px' }}>{summary.dotCount} ({summary.dotBallPercentage}%)</b>
                      </div>
                      <div className="tile" style={{ padding: '6px 10px' }}>
                        <span>Boundary</span>
                        <b style={{ fontSize: '12px' }}>{summary.boundaryRuns} runs ({summary.boundaryPercentage}%)</b>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedBatter(isExpanded ? null : bRec.name)}
                        className="btn s"
                        style={{ color: 'var(--ok)', height: '32px', margin: 0 }}
                      >
                        {isExpanded ? 'Hide' : 'View head-to-head'}
                      </button>
                    </div>

                    {isExpanded && bRec.headToHead.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: 'var(--bd)' }}>
                        <span className="lbl" style={{ fontSize: '10px' }}>Bowlers Faced:</span>
                        {bRec.headToHead.map((h2h) => (
                          <div
                            key={h2h.bowlerName}
                            className="row bt text-xs"
                            style={{ background: 'var(--well)', padding: '6px 10px', borderRadius: '8px' }}
                          >
                            <span className="font-semibold">{h2h.bowlerName}</span>
                            <span className="mono">
                              <b>{h2h.runs} runs</b> off {h2h.balls}b {h2h.isDismissed && <span className="bad font-bold">• OUT</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* 6. Complete Bowler Records */}
            <div className="row bt" style={{ margin: '14px 0 8px' }}>
              <h3 className="h2">Complete bowler records &amp; batter match-ups</h3>
              <span className="mu" style={{ fontSize: '12px' }}>{bowlerRecords.length} Bowlers</span>
            </div>

            {bowlerRecords.length === 0 ? (
              <p className="mu pr text-center">No bowling records yet</p>
            ) : (
              bowlerRecords.map((bwRec) => {
                const summary = bwRec.summary;
                const isExpanded = selectedBowler === bwRec.name;

                return (
                  <div key={bwRec.name} className="pr">
                    <div className="row bt">
                      <b style={{ fontSize: '15px' }}>{bwRec.name}</b>
                      <span className="chip">{summary.wickets} {summary.wickets === 1 ? 'Wicket' : 'Wickets'}</span>
                    </div>
                    <p className="mu" style={{ margin: '6px 0 10px', fontSize: '12px' }}>
                      {summary.overs} ov · {summary.maidens} maidens · {summary.runsConceded} runs · Econ {summary.economy}
                    </p>

                    <div className="row wrap" style={{ gap: '6px' }}>
                      <div className="tile" style={{ padding: '6px 10px' }}>
                        <span>Dots</span>
                        <b style={{ fontSize: '12px' }}>{summary.dotCount} ({summary.dotBallPercentage}%)</b>
                      </div>
                      <div className="tile" style={{ padding: '6px 10px' }}>
                        <span>Boundaries</span>
                        <b style={{ fontSize: '12px' }}>{summary.boundaryFours + summary.boundarySixes}</b>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedBowler(isExpanded ? null : bwRec.name)}
                        className="btn s"
                        style={{ color: 'var(--ok)', height: '32px', margin: 0 }}
                      >
                        {isExpanded ? 'Hide' : 'View head-to-head'}
                      </button>
                    </div>

                    {isExpanded && bwRec.headToHead.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: 'var(--bd)' }}>
                        <span className="lbl" style={{ fontSize: '10px' }}>Bowled Against:</span>
                        {bwRec.headToHead.map((h2h) => (
                          <div
                            key={h2h.batterName}
                            className="row bt text-xs"
                            style={{ background: 'var(--well)', padding: '6px 10px', borderRadius: '8px' }}
                          >
                            <span className="font-semibold">{h2h.batterName}</span>
                            <span className="mono">
                              <b>{h2h.runsConceded} runs</b> off {h2h.balls}b {h2h.wickets > 0 && <span className="bad font-bold">• {h2h.wickets}w</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Top 3 Players & Embedded Over Comparison Chart */}
          <div className="flex flex-col gap-3.5 w-full min-w-0 lg:col-span-5">
            {/* 3. Top 3 Players of the Match */}
            {topPlayers.length > 0 && (
              <section className="card">
                <div className="row bt">
                  <div className="row">
                    <span className="ok"><Trophy className="w-5 h-5 text-[var(--ok)]" /></span>
                    <h3 className="h2">Top 3 players of the match</h3>
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

                <div className="flex flex-col gap-2 mt-3">
                  {topPlayers.map((p, idx) => (
                    <div key={p.playerId} className="pr">
                      <div className="row bt">
                        <div className="row" style={{ gap: '8px' }}>
                          <span className="med" style={{ backgroundColor: MEDALS[idx] || '#FFD21F' }}>
                            {idx + 1}
                          </span>
                          <div>
                            <div className="row" style={{ gap: '6px' }}>
                              <b className="text-sm">{p.name}</b>
                              <span className="chip ok" style={{ padding: '1px 7px', fontSize: '11px' }}>
                                {p.totalPoints || p.points} pts
                              </span>
                            </div>
                            <div className="mu" style={{ fontSize: '11px' }}>{p.team}</div>
                          </div>
                        </div>
                      </div>

                      <div className="ex" style={{ marginTop: '6px' }}>
                        <span className="chip">
                          {p.breakdown?.runs > 0 ? `${p.breakdown.runs} runs` : `${p.breakdown?.wickets || 0} wkts`}
                        </span>
                        <span className="chip">
                          {p.breakdown?.boundaries > 0 ? `+${p.breakdown.boundaries} bound.` : `${p.breakdown?.dots || 0} dots`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Embedded Over Comparison Chart */}
            <MatchCharts matchState={matchState} />
          </div>
        </div>

        {/* Footer Attribution */}
        <p className="foot">
          © 2026 SmartCricket · Match Summary &amp; Analytics
        </p>
      </div>

      {/* Pointing Criteria Modal */}
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
