import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { Download, Share2, X, Sparkles, Loader2 } from 'lucide-react';
import { computeInningsStats } from '../engine/stats.js';
import { formatOvers, calculateCRR } from '../engine/rules.js';
import { exportAndSaveImage } from '../engine/nativeExport.js';
import { ButtonSpinner } from './ui/LoadingPrimitives.jsx';

// Preserve non-breaking spaces across canvas text rendering
function toNbsp(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/ /g, '\u00A0');
}

// Helper for Team abbreviation logic per specification
export function getTeamAbbreviation(name = '') {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'TEAM';
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0]; // Single-word teams remain unshortened (e.g. Pakistan, Falcons)
  }
  return words.map((w) => w[0].toUpperCase()).join(''); // Multi-word teams use initials (e.g. Lahore Lions -> LL)
}

// Inline Team Crest Shield for the 1920x1080 canvas
function ShieldBadge({ name, color, isSecondary = false }) {
  const abbr = getTeamAbbreviation(name).slice(0, 2);
  return (
    <svg width="100" height="116" viewBox="0 0 54 62" style={{ flexShrink: 0 }}>
      <defs>
        <filter id={`sh_${abbr}_${isSecondary ? 's' : 'p'}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(11,31,59,0.18)" />
        </filter>
      </defs>
      <path
        d="M27 2 50 10v22c0 14-10 24-23 28C14 56 4 46 4 32V10Z"
        fill={color}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="2.5"
        filter={`url(#sh_${abbr}_${isSecondary ? 's' : 'p'})`}
      />
      <path d="M19 9l4 5 4-6 4 6 4-5-1 8H20Z" fill="#FFC83D" />
      <text
        x="27"
        y="41"
        textAnchor="middle"
        fontSize="17"
        fontWeight="800"
        fill="#FFFFFF"
        fontFamily="'Inter', system-ui, sans-serif"
      >
        {abbr}
      </text>
    </svg>
  );
}

// Inline Team Badge component for player tables per specification
function TeamPillBadge({ teamName, isNavy }) {
  if (!teamName) return null;
  return (
    <div
      style={{
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <span
        className="ms-pill-centered ms-pill-text"
        style={{
          display: 'inline-block',
          textAlign: 'center',
          height: '28px',
          lineHeight: '28px',
          padding: '0 12px',
          minWidth: 'fit-content',
          borderRadius: '999px',
          fontSize: '13px',
          fontWeight: 800,
          verticalAlign: 'middle',
          backgroundColor: isNavy ? '#071938' : '#DBEAFE',
          color: isNavy ? '#FFFFFF' : '#1D5CFF',
          whiteSpace: 'nowrap',
          overflow: 'visible',
          boxSizing: 'border-box',
          boxShadow: '0 1px 3px rgba(11,31,59,0.06)',
          margin: 0
        }}
      >
        {toNbsp(teamName)}
      </span>
    </div>
  );
}

// Batting Table Card (numbered rows, table-layout: fixed, strict cell alignment)
function BattingTableCard({ title, batters, isNavy }) {
  const displayRows = Array.from({ length: 4 }, (_, idx) => batters?.[idx] || null);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: '12px 18px',
        border: '1.5px solid #DBEAFE',
        boxShadow: '0 8px 24px rgba(11,31,59,0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M19.5 4.5L14 10M14 10L12 12M14 10L16 12M7 17L3 21M7 17L10 14" />
        </svg>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
          {toNbsp(title)}
        </h3>
      </div>

      <table
        style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          boxSizing: 'border-box',
          letterSpacing: 'normal',
          wordSpacing: 'normal'
        }}
      >
        <colgroup>
          <col style={{ width: '40px' }} />
          <col style={{ width: '250px' }} />
          <col style={{ width: '150px' }} />
          <col style={{ width: '85px' }} />
          <col style={{ width: '85px' }} />
          <col style={{ width: '70px' }} />
          <col style={{ width: '70px' }} />
          <col style={{ width: '95px' }} />
        </colgroup>
        <thead>
          <tr
            style={{
              backgroundColor: '#E8F1FF',
              height: '32px'
            }}
          >
            <th style={{ textAlign: 'center', padding: '0 8px', fontSize: '12px', fontWeight: 700, color: '#475569', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', verticalAlign: 'middle' }}><span>#</span></th>
            <th style={{ textAlign: 'left', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', verticalAlign: 'middle' }}><span>Player</span></th>
            <th style={{ textAlign: 'center', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', verticalAlign: 'middle' }}><span>Team</span></th>
            <th style={{ textAlign: 'center', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', verticalAlign: 'middle' }}><span>Runs</span></th>
            <th style={{ textAlign: 'center', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', verticalAlign: 'middle' }}><span>Balls</span></th>
            <th style={{ textAlign: 'center', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', verticalAlign: 'middle' }}><span>4s</span></th>
            <th style={{ textAlign: 'center', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', verticalAlign: 'middle' }}><span>6s</span></th>
            <th style={{ textAlign: 'center', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', verticalAlign: 'middle' }}><span>SR</span></th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((b, idx) => (
            <tr
              key={idx}
              style={{
                height: '36px',
                borderTop: '1px solid #E2E8F0',
                boxSizing: 'border-box'
              }}
            >
              <td style={{ textAlign: 'center', padding: '0 8px', fontSize: '13px', fontWeight: 800, color: '#64748B', verticalAlign: 'middle' }}>
                {idx + 1}
              </td>
              {b ? (
                <>
                  <td style={{ textAlign: 'left', padding: '0 12px', fontSize: '14px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                    {toNbsp(b.name)}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 12px', verticalAlign: 'middle' }}>
                    <TeamPillBadge teamName={b.team} isNavy={isNavy} />
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 12px', fontSize: '14px', fontWeight: 800, color: '#0F172A', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                    {b.runs}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 12px', fontSize: '14px', fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                    {b.balls}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 12px', fontSize: '14px', fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                    {b.fours}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 12px', fontSize: '14px', fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                    {b.sixes}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 12px', fontSize: '14px', fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                    {b.sr}
                  </td>
                </>
              ) : (
                <>
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Bowling Table Card (numbered rows, table-layout: fixed, strict cell alignment)
function BowlingTableCard({ title, bowlers, isNavy }) {
  const displayRows = Array.from({ length: 4 }, (_, idx) => bowlers?.[idx] || null);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: '12px 18px',
        border: '1.5px solid #DBEAFE',
        boxShadow: '0 8px 24px rgba(11,31,59,0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        </svg>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
          {toNbsp(title)}
        </h3>
      </div>

      <table
        style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          boxSizing: 'border-box',
          letterSpacing: 'normal',
          wordSpacing: 'normal'
        }}
      >
        <colgroup>
          <col style={{ width: '40px' }} />
          <col style={{ width: '250px' }} />
          <col style={{ width: '150px' }} />
          <col style={{ width: '100px' }} />
          <col style={{ width: '100px' }} />
          <col style={{ width: '105px' }} />
          <col style={{ width: '100px' }} />
        </colgroup>
        <thead>
          <tr
            style={{
              backgroundColor: '#E8F1FF',
              height: '32px'
            }}
          >
            <th style={{ textAlign: 'center', padding: '0 8px', fontSize: '12px', fontWeight: 700, color: '#475569', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px', verticalAlign: 'middle' }}><span>#</span></th>
            <th style={{ textAlign: 'left', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', verticalAlign: 'middle' }}><span>Player</span></th>
            <th style={{ textAlign: 'center', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', verticalAlign: 'middle' }}><span>Team</span></th>
            <th style={{ textAlign: 'center', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', verticalAlign: 'middle' }}><span>Overs</span></th>
            <th style={{ textAlign: 'center', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', verticalAlign: 'middle' }}><span>Runs</span></th>
            <th style={{ textAlign: 'center', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', verticalAlign: 'middle' }}><span>Wickets</span></th>
            <th style={{ textAlign: 'center', padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', verticalAlign: 'middle' }}><span>Econ</span></th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((bw, idx) => (
            <tr
              key={idx}
              style={{
                height: '36px',
                borderTop: '1px solid #E2E8F0',
                boxSizing: 'border-box'
              }}
            >
              <td style={{ textAlign: 'center', padding: '0 8px', fontSize: '13px', fontWeight: 800, color: '#64748B', verticalAlign: 'middle' }}>
                {idx + 1}
              </td>
              {bw ? (
                <>
                  <td style={{ textAlign: 'left', padding: '0 12px', fontSize: '14px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                    {toNbsp(bw.name)}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 12px', verticalAlign: 'middle' }}>
                    <TeamPillBadge teamName={bw.team} isNavy={isNavy} />
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 12px', fontSize: '14px', fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                    {bw.overs}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 12px', fontSize: '14px', fontWeight: 800, color: '#0F172A', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                    {bw.runs}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 12px', fontSize: '14px', fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                    {bw.wickets}
                  </td>
                  <td style={{ textAlign: 'center', padding: '0 12px', fontSize: '14px', fontWeight: 600, color: '#0F172A', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' }}>
                    {bw.econ}
                  </td>
                </>
              ) : (
                <>
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                  <td style={{ padding: '0 12px', verticalAlign: 'middle' }} />
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MatchSummaryImageGenerator({
  matchState,
  topPerformer,
  topPlayers: _topPlayers,
  isOpen,
  onClose
}) {
  const canvasRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [dataUrlString, setDataUrlString] = useState(null);
  const [capturedCanvas, setCapturedCanvas] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Extract Teams & Innings safely
  const teams = matchState?.teams || [];
  const team1Name = teams[0]?.name || matchState?.innings?.[0]?.battingTeam || 'Beta';
  const team2Name = teams[1]?.name || matchState?.innings?.[1]?.battingTeam || 'Gama';

  const inn1 = matchState?.innings?.[0] || { score: 0, wickets: 0, legalBalls: 0, balls: [], battingTeam: team1Name, bowlingTeam: team2Name };
  const inn2 = matchState?.innings?.[1] || { score: 0, wickets: 0, legalBalls: 0, balls: [], battingTeam: team2Name, bowlingTeam: team1Name };

  const inn1BattingTeam = inn1.battingTeam || team1Name;
  const inn1BowlingTeam = inn1.bowlingTeam || team2Name;
  const inn2BattingTeam = inn2.battingTeam || inn1BowlingTeam;
  const inn2BowlingTeam = inn2.bowlingTeam || inn1BattingTeam;

  const isInn1BattingTeam1 = inn1BattingTeam === team1Name;
  const isInn2BattingTeam1 = inn2BattingTeam === team1Name;

  // Dynamic player extraction for the required 2x2 layout (Strictly Top 4 Batters & Bowlers)
  const getBattersForInnings = (inn, teamName) => {
    if (!inn) return Array.from({ length: 4 }, () => null);
    const stats = computeInningsStats(inn);
    const batters = Object.values(stats.batting || {})
      .filter((b) => b.balls > 0 || b.runs > 0)
      .sort((a, b) => (b.runs - a.runs) || (a.balls - b.balls))
      .slice(0, 4)
      .map((b) => ({
        name: (b.name || '').replace(/\*/g, '').trim(),
        team: teamName,
        runs: b.runs ?? 0,
        balls: b.balls ?? 0,
        fours: b.fours ?? 0,
        sixes: b.sixes ?? 0,
        sr: b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'
      }));
    return Array.from({ length: 4 }, (_, i) => batters[i] || null);
  };

  const getBowlersForInnings = (inn, teamName) => {
    if (!inn) return Array.from({ length: 4 }, () => null);
    const stats = computeInningsStats(inn);
    const bowlers = Object.values(stats.bowling || {})
      .filter((bw) => bw.legalBalls > 0 || bw.runsConceded > 0 || bw.wickets > 0)
      .sort((a, b) => (b.wickets - a.wickets) || (a.runsConceded - b.runsConceded))
      .slice(0, 4)
      .map((bw) => ({
        name: (bw.name || '').replace(/\*/g, '').trim(),
        team: teamName,
        overs: formatOvers(bw.legalBalls || 0),
        runs: bw.runsConceded ?? 0,
        wickets: bw.wickets ?? 0,
        econ: bw.legalBalls > 0 ? (bw.runsConceded / (bw.legalBalls / 6)).toFixed(2) : '0.00'
      }));
    return Array.from({ length: 4 }, (_, i) => bowlers[i] || null);
  };

  // Identify team-specific batting and bowling innings
  const team1BattingInn = (inn1.battingTeam === team1Name) ? inn1 : ((inn2?.battingTeam === team1Name) ? inn2 : inn1);
  const team2BattingInn = (inn2?.battingTeam === team2Name) ? inn2 : ((inn1.battingTeam === team2Name) ? inn1 : inn2);

  const team1BowlingInn = (inn1.bowlingTeam === team1Name) ? inn1 : ((inn2?.bowlingTeam === team1Name) ? inn2 : (team2BattingInn || inn2));
  const team2BowlingInn = (inn2?.bowlingTeam === team2Name) ? inn2 : ((inn1.bowlingTeam === team2Name) ? inn1 : (team1BattingInn || inn1));

  const team1Batters = getBattersForInnings(team1BattingInn, team1Name);
  const team2Batters = getBattersForInnings(team2BattingInn, team2Name);
  const team1Bowlers = getBowlersForInnings(team1BowlingInn, team1Name);
  const team2Bowlers = getBowlersForInnings(team2BowlingInn, team2Name);

  // Backward-compatible bindings for regression test inspection
  const inn1Batters = team1Batters;
  const inn1Bowlers = team1Bowlers;
  const inn2Batters = team2Batters;
  const inn2Bowlers = team2Bowlers;

  // Match Statistics Calculation
  const t1CRR = calculateCRR(inn1.score, inn1.legalBalls);
  const t2CRR = calculateCRR(inn2.score, inn2.legalBalls);
  const t1Fours = (inn1.balls || []).filter((b) => b.runs === 4).length;
  const t2Fours = (inn2.balls || []).filter((b) => b.runs === 4).length;
  const t1Sixes = (inn1.balls || []).filter((b) => b.runs === 6).length;
  const t2Sixes = (inn2.balls || []).filter((b) => b.runs === 6).length;

  // Dynamic Result Text with explicit non-breaking spacing
  const resultText = matchState?.resultSummary || (
    inn2.legalBalls > 0 && inn2.score > inn1.score
      ? `${team2Name} Won by ${10 - inn2.wickets} Wickets`
      : matchState?.status === 'completed'
      ? `${inn1.score > inn2.score ? team1Name : team2Name} Won`
      : `Match In Progress • ${team1Name} ${inn1.score}/${inn1.wickets}`
  );

  // Header Subtitle
  const tournamentName = matchState?.tournament || matchState?.series;
  const headerSubtitle = tournamentName
    ? `${tournamentName}${matchState?.matchNumber ? ` • Match ${matchState.matchNumber}` : ''}`
    : `${team1Name} vs ${team2Name}`;

  // Date and Time (Explicit spacing)
  const rawDate = matchState?.date
    ? new Date(matchState.date)
    : (matchState?.createdAt ? new Date(matchState.createdAt) : new Date());
  
  const formattedDate = rawDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const matchTime = matchState?.time || '';
  const datePillText = matchTime ? `${formattedDate} • ${matchTime}` : formattedDate;

  // Render & Capture when modal opens
  useEffect(() => {
    if (!isOpen) {
      setGeneratedImageUrl(null);
      return;
    }

    const captureImage = async () => {
      setIsGenerating(true);
      try {
        if (typeof document !== 'undefined' && document.fonts) {
          await document.fonts.ready;
        }

        // Allow layout and web fonts to settle
        await new Promise((resolve) => setTimeout(resolve, 350));

        const element = canvasRef.current;
        if (!element) return;

        const captureHeight = Math.max(element.scrollHeight || 1080, 1080);

        // Respect export resolution setting (Default 4k = scale 2x)
        const exportRes = typeof localStorage !== 'undefined' ? (localStorage.getItem('setting_export_res') || '4k') : '4k';
        const exportScale = exportRes === '1080' ? 1 : 2;

        let dUrl = null;
        try {
          dUrl = await toPng(element, {
            pixelRatio: exportScale,
            backgroundColor: '#F0F7FF',
            cacheBust: true,
            skipFonts: true,
            width: 1920,
            height: captureHeight,
            canvasWidth: 1920 * exportScale,
            canvasHeight: captureHeight * exportScale,
            style: {
              left: '0',
              top: '0',
              position: 'relative'
            }
          });
        } catch (imgErr) {
          console.warn('html-to-image export failed, falling back to html2canvas:', imgErr);
          const canvas = await html2canvas(element, {
            width: 1920,
            height: captureHeight,
            scale: exportScale,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#F0F7FF',
            logging: false,
            windowWidth: 1920,
            windowHeight: captureHeight,
            scrollY: 0,
            scrollX: 0,
            onclone: (clonedDoc) => {
              const clonedCanvas = clonedDoc.querySelector('.ms-canvas');
              if (clonedCanvas) {
                clonedCanvas.style.height = `${captureHeight}px`;
                clonedCanvas.style.overflow = 'visible';
              }
              const allElements = clonedDoc.querySelectorAll('*');
              allElements.forEach((node) => {
                node.style.letterSpacing = 'normal';
                node.style.wordSpacing = 'normal';
              });
              clonedDoc.querySelectorAll('.ms-pill-text').forEach((node) => {
                node.style.position = 'relative';
                node.style.top = '-2px';
              });
            }
          });
          dUrl = canvas.toDataURL('image/png');
          setCapturedCanvas(canvas);
        }

        setDataUrlString(dUrl);
        setGeneratedImageUrl(dUrl);
      } catch (err) {
        console.error('Match summary generation error:', err);
      } finally {
        setIsGenerating(false);
      }
    };

    captureImage();
  }, [isOpen, matchState]);

  if (!isOpen) return null;

  const includeFooterCredit = typeof localStorage !== 'undefined' ? (localStorage.getItem('setting_footer_credit') !== 'false') : true;
  const fileName = `MatchSummary_${team1Name.replace(/\s+/g, '_')}_vs_${team2Name.replace(/\s+/g, '_')}.png`;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const target = dataUrlString || capturedCanvas || canvasRef.current;
      if (!target) return;
      await exportAndSaveImage(target, fileName, `Match Summary: ${team1Name} vs ${team2Name}`, { downloadOnly: true });
    } catch (err) {
      console.error('Download export failed:', err);
      alert('Could not save infographic image: ' + (err.message || ''));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const target = dataUrlString || capturedCanvas || canvasRef.current;
      if (!target) return;
      await exportAndSaveImage(target, fileName, `Match Summary: ${team1Name} vs ${team2Name}`, { shareOnly: true });
    } catch (err) {
      console.error('Share export failed:', err);
      alert('Could not share infographic image: ' + (err.message || ''));
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Dialog */}
      <div
        className="w-full max-w-4xl rounded-3xl p-5 sm:p-6 flex flex-col gap-4 bg-[var(--card)] border border-[var(--bd)] shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--pri)]/15 text-[var(--pri)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[var(--t1)]">
                Match Summary Image (4K UHD 3840 × 2160)
              </h2>
              <p className="text-xs text-[var(--t2)] font-medium">
                High-resolution standalone infographic blueprint
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--well)] text-[var(--t2)] hover:text-[var(--t1)] border border-[var(--bd)] transition-transform hover:scale-105"
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Body / Image Preview */}
        <div className="flex-1 flex items-center justify-center min-h-[300px] max-h-[60vh] bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-2 sm:p-4 overflow-hidden border border-[var(--bd)] relative">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 text-[var(--t2)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--pri)]" />
              <span className="text-xs font-bold">Rendering 4K UHD match summary...</span>
            </div>
          ) : generatedImageUrl ? (
            <img
              src={generatedImageUrl}
              alt="Generated Match Summary"
              className="max-h-[55vh] w-auto max-w-full rounded-xl object-contain shadow-lg"
            />
          ) : (
            <span className="text-xs text-[var(--t3)] font-bold">Failed to load preview</span>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-[var(--t2)] font-mono font-semibold hidden sm:inline">
            1920 × 1080 • PNG
          </span>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleDownload}
              disabled={isGenerating || !generatedImageUrl || isDownloading}
              className="btn p s flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-10 px-6 rounded-full font-bold text-xs"
              title="Download Infographic PNG directly without sharing"
            >
              {isDownloading ? <ButtonSpinner className="w-4 h-4 text-white" /> : <Download className="w-4 h-4" />}
              <span>{isDownloading ? 'Saving PNG...' : 'Download PNG'}</span>
            </button>

            <button
              onClick={handleShare}
              disabled={isGenerating || !generatedImageUrl || isSharing}
              className="btn s flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-10 px-6 rounded-full font-bold text-xs"
              title="Share Infographic"
            >
              {isSharing ? <ButtonSpinner className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{isSharing ? 'Sharing...' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          OFF-SCREEN FIXED 1920x1080 CANVAS
          Mounted at (0,0) with z-index: -99999 so html-to-image renders full canvas natively
          ========================================================================= */}
      <div
        ref={canvasRef}
        className="ms-canvas"
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '1920px',
          minHeight: '1080px',
          backgroundColor: '#F0F7FF',
          color: '#0F172A',
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          letterSpacing: 'normal',
          wordSpacing: 'normal',
          boxSizing: 'border-box',
          padding: '28px 44px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '12px',
          zIndex: -99999,
          pointerEvents: 'none',
          overflow: 'visible'
        }}
      >
        <style>{`
          .ms-canvas * {
            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
            letter-spacing: normal !important;
            word-spacing: normal !important;
          }
          .ms-pill-centered {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            box-sizing: border-box !important;
            vertical-align: middle !important;
          }
          .ms-pill-text {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
        `}</style>

        {/* Soft Background SVG Waves & Stadium Crowd Silhouettes */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
          viewBox="0 0 1920 1080"
          preserveAspectRatio="none"
          fill="none"
        >
          <path d="M0 0H900C780 120 540 90 400 180S120 320 0 280Z" fill="#E6F0FA" opacity="0.6" />
          <path d="M1920 0H1200C1320 140 1560 100 1700 220S1880 340 1920 320Z" fill="#E6F0FA" opacity="0.5" />
          <path d="M0 800C260 760 480 920 740 980S1400 900 1920 960V1080H0Z" fill="#E1ECF9" opacity="0.7" />
          <path d="M0 920C320 890 640 1020 960 1040S1600 980 1920 1020V1080H0Z" fill="#D6E4F7" opacity="0.5" />
          <g transform="translate(1700, 40)" opacity="0.22" fill="#2563EB">
            <rect x="0" y="0" width="8" height="8" rx="2" />
            <rect x="14" y="0" width="8" height="8" rx="2" />
            <rect x="28" y="0" width="8" height="8" rx="2" />
            <rect x="42" y="0" width="8" height="8" rx="2" />
            <rect x="0" y="14" width="8" height="8" rx="2" />
            <rect x="14" y="14" width="8" height="8" rx="2" />
            <rect x="28" y="14" width="8" height="8" rx="2" />
            <rect x="42" y="14" width="8" height="8" rx="2" />
            <rect x="0" y="28" width="8" height="8" rx="2" />
            <rect x="14" y="28" width="8" height="8" rx="2" />
            <rect x="28" y="28" width="8" height="8" rx="2" />
            <rect x="42" y="28" width="8" height="8" rx="2" />
          </g>
        </svg>

        {/* 1. TOP HEADER SECTION */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          {/* Left: Batter Silhouette + Divider + Heading + Subtitle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path
                d="M19.5 4.5L14 10M14 10L12 12M14 10L16 12M7 17L3 21M7 17L10 14M7 17L5 19M12 12L10 14M12 12L14 14M10 14L8 16M16 5.5L18.5 3M17 19L21 21M9 6C9 7.1 8.1 8 7 8C5.9 8 5 7.1 5 6C5 4.9 5.9 4 7 4C8.1 4 9 4.9 9 6Z"
                stroke="#1D5CFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div style={{ width: '2.5px', height: '50px', backgroundColor: '#CBD5E1' }} />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '40px',
                  fontWeight: 900,
                  color: '#0F172A',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.05
                }}
              >
                Match Summary
              </h1>
              <span
                style={{
                  marginTop: '4px',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#475569',
                  letterSpacing: 'normal',
                  wordSpacing: 'normal'
                }}
              >
                {toNbsp(headerSubtitle)}
              </span>
            </div>
          </div>

          {/* Right: Date Pill (Right-aligned, not cramped) */}
          <div
            className="ms-pill-centered"
            style={{
              display: 'inline-block',
              textAlign: 'center',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #DBEAFE',
              borderRadius: '999px',
              height: '40px',
              lineHeight: '40px',
              padding: '0 24px',
              verticalAlign: 'middle',
              boxShadow: '0 4px 14px rgba(11,31,59,0.04)',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
              overflow: 'visible',
              margin: 0
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span
              className="ms-pill-text"
              style={{
                display: 'inline-block',
                fontSize: '16px',
                fontWeight: 700,
                color: '#0F172A',
                height: '40px',
                lineHeight: '40px',
                verticalAlign: 'middle',
                letterSpacing: 'normal',
                wordSpacing: 'normal',
                margin: 0,
                padding: 0
              }}
            >
              {toNbsp(datePillText)}
            </span>
          </div>
        </div>

        {/* 2. MIDDLE SECTION: Main Match Result Card (Left) & Match Statistics Card (Right) */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: '22px', marginBottom: '16px' }}>
          {/* Main Match Result Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '20px 28px',
              border: '1.5px solid #DBEAFE',
              boxShadow: '0 12px 36px rgba(11,31,59,0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '240px',
              boxSizing: 'border-box'
            }}
          >
            {/* Team 1 Score, Centered VS Badge, Team 2 Score (Mirrored layout) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 1fr', alignItems: 'center', gap: '24px', width: '100%' }}>
              {/* Team 1 Block: Name, Score and Overs centered over each other */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <ShieldBadge name={team1Name} color="#0B2A63" />
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginTop: '6px', letterSpacing: '-0.01em' }}>
                  {toNbsp(team1Name)}
                </span>
                <span style={{ fontSize: '48px', fontWeight: 900, color: '#0F172A', lineHeight: 1.05, letterSpacing: '-0.03em', marginTop: '2px' }}>
                  {inn1.score}/{inn1.wickets}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#64748B', marginTop: '3px' }}>
                  ({formatOvers(inn1.legalBalls)} ov)
                </span>
              </div>

              {/* VS Circular Badge - Exactly in the Center */}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #BFDBFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 900,
                  color: '#2563EB',
                  boxShadow: '0 0 20px rgba(37,99,235,0.18)',
                  flexShrink: 0,
                  lineHeight: 1
                }}
              >
                VS
              </div>

              {/* Team 2 Block: Name, Score and Overs centered over each other (Mirrored) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <ShieldBadge name={team2Name} color="#2563EB" isSecondary />
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginTop: '6px', letterSpacing: '-0.01em' }}>
                  {toNbsp(team2Name)}
                </span>
                <span style={{ fontSize: '48px', fontWeight: 900, color: '#0F172A', lineHeight: 1.05, letterSpacing: '-0.03em', marginTop: '2px' }}>
                  {inn2.score}/{inn2.wickets}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#64748B', marginTop: '3px' }}>
                  ({formatOvers(inn2.legalBalls)} ov)
                </span>
              </div>
            </div>

            {/* Result Pill flanked by thin blue line with dot at each end */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '14px' }}>
              <div style={{ height: '1.5px', flex: 1, backgroundColor: '#93C5FD', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: '-3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
              </div>

              <div
                className="ms-pill-centered"
                style={{
                  background: 'linear-gradient(90deg, #071938 0%, #0B2A63 100%)',
                  borderRadius: '999px',
                  display: 'inline-block',
                  textAlign: 'center',
                  height: '42px',
                  lineHeight: '42px',
                  padding: '0 32px',
                  border: '1.5px solid rgba(255,255,255,0.22)',
                  boxShadow: '0 6px 20px rgba(11,31,59,0.2)',
                  boxSizing: 'border-box',
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  margin: 0
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }}>
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill="#FBBF24" fillOpacity="0.3" />
                </svg>
                <span
                  className="ms-pill-text"
                  style={{
                    display: 'inline-block',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    letterSpacing: 'normal',
                    wordSpacing: 'normal',
                    height: '42px',
                    lineHeight: '42px',
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                    margin: 0,
                    padding: 0
                  }}
                >
                  {toNbsp(resultText)}
                </span>
              </div>

              <div style={{ height: '1.5px', flex: 1, backgroundColor: '#93C5FD', position: 'relative' }}>
                <div style={{ position: 'absolute', right: 0, top: '-3px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
              </div>
            </div>
          </div>

          {/* Match Statistics Card (No dotted artifacts, clean 3-column rows) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '18px 22px',
              border: '1.5px solid #DBEAFE',
              boxShadow: '0 12px 36px rgba(11,31,59,0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '240px',
              boxSizing: 'border-box'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Match Statistics
              </h2>
            </div>

            {/* Static Team Header Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
              <div
                className="ms-pill-centered ms-pill-text"
                style={{
                  display: 'inline-block',
                  textAlign: 'center',
                  backgroundColor: '#071938',
                  color: '#FFFFFF',
                  borderRadius: '999px',
                  height: '32px',
                  lineHeight: '32px',
                  padding: '0 16px',
                  fontWeight: 800,
                  fontSize: '13px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  margin: 0
                }}
              >
                {toNbsp(team1Name)}
              </div>
              <div
                className="ms-pill-centered ms-pill-text"
                style={{
                  display: 'inline-block',
                  textAlign: 'center',
                  backgroundColor: '#DBEAFE',
                  color: '#1D5CFF',
                  borderRadius: '999px',
                  height: '32px',
                  lineHeight: '32px',
                  padding: '0 16px',
                  fontWeight: 800,
                  fontSize: '13px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  margin: 0
                }}
              >
                {toNbsp(team2Name)}
              </div>
            </div>

            {/* 3-Column Table: Left Value / Center Label / Right Value */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Score', v1: `${inn1.score}/${inn1.wickets}`, v2: `${inn2.score}/${inn2.wickets}` },
                { label: 'Overs', v1: formatOvers(inn1.legalBalls), v2: formatOvers(inn2.legalBalls) },
                { label: 'Run Rate', v1: t1CRR.toFixed(2), v2: t2CRR.toFixed(2) },
                { label: 'Fours', v1: String(t1Fours), v2: String(t2Fours) },
                { label: 'Sixes', v1: String(t1Sixes), v2: String(t2Sixes) }
              ].map((row, idx) => (
                <div
                  key={row.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 110px 1fr',
                    alignItems: 'center',
                    height: '34px',
                    borderTop: idx > 0 ? '1px solid #E2E8F0' : 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {row.v1}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textAlign: 'center', letterSpacing: 'normal', wordSpacing: 'normal' }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {row.v2}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performer Card on Export Canvas */}
        {topPerformer && topPerformer.totalPoints > 0 && (
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '8px 20px',
              border: '1.5px solid #FDE68A',
              boxShadow: '0 6px 20px rgba(245, 158, 11, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34M7 4h10v5a5 5 0 0 1-10 0V4Z" />
                </svg>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#D97706', textTransform: 'uppercase', letterSpacing: 'normal', wordSpacing: 'normal' }}>
                    Top Performer · Player of the Match
                  </span>
                  <span
                    className="ms-pill-centered ms-pill-text"
                    style={{
                      display: 'inline-block',
                      textAlign: 'center',
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      height: '22px',
                      lineHeight: '22px',
                      padding: '0 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      verticalAlign: 'middle',
                      boxSizing: 'border-box',
                      whiteSpace: 'nowrap',
                      overflow: 'visible',
                      margin: 0
                    }}
                  >
                    {topPerformer.totalPoints}&nbsp;Points
                  </span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', letterSpacing: 'normal', wordSpacing: 'normal', marginTop: '2px' }}>
                  {toNbsp(topPerformer.name)}
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748B', marginLeft: '8px' }}>
                    ({toNbsp(topPerformer.team)})
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {topPerformer.batting?.runs > 0 && (
                <div
                  className="ms-pill-centered ms-pill-text"
                  style={{
                    display: 'inline-block',
                    textAlign: 'center',
                    backgroundColor: '#F0FDF4',
                    border: '1.5px solid #BBF7D0',
                    height: '32px',
                    lineHeight: '32px',
                    padding: '0 14px',
                    borderRadius: '999px',
                    fontSize: '13px',
                    color: '#166534',
                    fontWeight: 700,
                    verticalAlign: 'middle',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                    margin: 0
                  }}
                >
                  <span style={{ display: 'inline-block', height: '32px', lineHeight: '32px', verticalAlign: 'middle', margin: 0, padding: 0 }}>Batting:&nbsp;<strong>{topPerformer.batting.runs}</strong>&nbsp;({topPerformer.batting.balls}b,&nbsp;{topPerformer.batting.fours}x4,&nbsp;{topPerformer.batting.sixes}x6)</span>
                </div>
              )}
              {topPerformer.bowling?.legalBalls > 0 && (
                <div
                  className="ms-pill-centered ms-pill-text"
                  style={{
                    display: 'inline-block',
                    textAlign: 'center',
                    backgroundColor: '#EFF6FF',
                    border: '1.5px solid #BFDBFE',
                    height: '32px',
                    lineHeight: '32px',
                    padding: '0 14px',
                    borderRadius: '999px',
                    fontSize: '13px',
                    color: '#1E40AF',
                    fontWeight: 700,
                    verticalAlign: 'middle',
                    boxSizing: 'border-box',
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                    margin: 0
                  }}
                >
                  <span style={{ display: 'inline-block', height: '32px', lineHeight: '32px', verticalAlign: 'middle', margin: 0, padding: 0 }}>Bowling:&nbsp;<strong>{topPerformer.bowling.wickets}</strong>/{topPerformer.bowling.runsConceded}&nbsp;({formatOvers(topPerformer.bowling.legalBalls)}&nbsp;ov)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. 2x2 PLAYER STATISTICS GRID */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '18px',
            flex: 1
          }}
        >
          {/* Top Left: Team 1 Top 4 Batters */}
          <BattingTableCard
            title={`Top 4 Batters – ${team1Name}`}
            batters={team1Batters}
            isNavy={true}
          />

          {/* Top Right: Team 2 Top 4 Batters */}
          <BattingTableCard
            title={`Top 4 Batters – ${team2Name}`}
            batters={team2Batters}
            isNavy={false}
          />

          {/* Bottom Left: Team 1 Top 4 Bowlers */}
          <BowlingTableCard
            title={`Top 4 Bowlers – ${team1Name}`}
            bowlers={team1Bowlers}
            isNavy={true}
          />

          {/* Bottom Right: Team 2 Top 4 Bowlers */}
          <BowlingTableCard
            title={`Top 4 Bowlers – ${team2Name}`}
            bowlers={team2Bowlers}
            isNavy={false}
          />
        </div>

        {/* Footer Credit & Watermark */}
        {includeFooterCredit && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(148, 163, 184, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#64748B',
              fontWeight: 600,
              letterSpacing: 'normal',
              wordSpacing: 'normal'
            }}
          >
            <span>SmartCricket&nbsp;live&nbsp;cricket&nbsp;scoring&nbsp;and&nbsp;match&nbsp;analytics</span>
            <span>Official&nbsp;Match&nbsp;Report</span>
          </div>
        )}
      </div>
    </div>
  );
}
