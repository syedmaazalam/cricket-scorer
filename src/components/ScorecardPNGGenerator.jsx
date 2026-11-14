import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { Download, Share2, X, Trophy, Star, Loader2 } from 'lucide-react';
import { exportAndSaveImage } from '../engine/nativeExport.js';
import { ButtonSpinner } from './ui/LoadingPrimitives.jsx';

// ─────────────────────────────────────────────────────────────
// Pure Data Engine — computed entirely from raw ball deliveries
// Strips asterisks, calculates accurate cricket statistics
// ─────────────────────────────────────────────────────────────

export function strip(name) {
  return (name || '').replace(/\*/g, '').trim();
}

export function formatOversLocal(legalBalls) {
  if (!legalBalls) return '0.0';
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

export function calcCRRLocal(score, legalBalls) {
  if (!legalBalls) return '0.00';
  return (score / (legalBalls / 6)).toFixed(2);
}

/**
 * Compute all innings data from raw balls array.
 * Returns: { batters, bowlers, extras, topScorer, bestBowler, didNotBat }
 */
export function computeInningsData(innings, teamPlayers = []) {
  const balls = (innings && innings.balls) ? innings.balls : [];

  const battingOrder = [];
  const battingMap = {};
  const bowlingOrder = [];
  const bowlingMap = {};
  const seenInInnings = new Set();

  function getBatter(rawName) {
    const name = strip(rawName);
    if (!name) return null;
    seenInInnings.add(name);
    if (!battingMap[name]) {
      battingMap[name] = {
        name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        isOut: false,
        dismissal: 'not out'
      };
      battingOrder.push(name);
    }
    return battingMap[name];
  }

  function getBowler(rawName) {
    const name = strip(rawName);
    if (!name) return null;
    if (!bowlingMap[name]) {
      bowlingMap[name] = {
        name,
        legalBalls: 0,
        runs: 0,
        wickets: 0
      };
      bowlingOrder.push(name);
    }
    return bowlingMap[name];
  }

  for (const ball of balls) {
    const striker = getBatter(ball.striker);
    getBatter(ball.nonStriker);

    const bowler = getBowler(ball.bowler);
    const extraType = ball.extraType || null;
    const runs = Number(ball.runs) || 0;
    const extraRuns = Number(ball.extraRuns) || 0;

    // Striker batting stats
    if (striker) {
      if (extraType !== 'wide') {
        striker.balls += 1;
      }
      if (extraType === null || extraType === 'no_ball') {
        striker.runs += runs;
        if (runs === 4) striker.fours += 1;
        if (runs === 6) striker.sixes += 1;
      }
    }

    // Bowler stats
    if (bowler) {
      const isLegal = extraType !== 'wide' && extraType !== 'no_ball';
      if (isLegal) {
        bowler.legalBalls += 1;
      }
      if (extraType === 'wide' || extraType === 'no_ball') {
        bowler.runs += (1 + extraRuns) + (extraType === 'no_ball' ? runs : 0);
      } else if (extraType === 'bye' || extraType === 'legbye') {
        // Not charged to bowler
      } else {
        bowler.runs += runs;
      }
    }

    // Dismissal & Wickets
    if (ball.isWicket && ball.wicket) {
      const w = ball.wicket;
      const outName = strip(w.playerOut);
      const outBatter = battingMap[outName] || getBatter(outName);
      if (outBatter) {
        outBatter.isOut = true;
        const bowlerName = strip(w.bowler || ball.bowler);
        const fielderName = strip(w.fielder);
        const type = (w.type || '').toLowerCase();

        if (type === 'caught') {
          if (fielderName && fielderName !== bowlerName) {
            outBatter.dismissal = `c ${fielderName} b ${bowlerName}`;
          } else {
            outBatter.dismissal = `c & b ${bowlerName}`;
          }
        } else if (type === 'bowled') {
          outBatter.dismissal = `b ${bowlerName}`;
        } else if (type === 'lbw') {
          outBatter.dismissal = `lbw b ${bowlerName}`;
        } else if (type === 'stumped') {
          outBatter.dismissal = `st ${fielderName || 'wk'} b ${bowlerName}`;
        } else if (type === 'run_out') {
          outBatter.dismissal = `run out (${fielderName || 'direct hit'})`;
        } else if (type === 'hit_wicket') {
          outBatter.dismissal = `hit wicket b ${bowlerName}`;
        } else if (type === 'retired_hurt') {
          outBatter.dismissal = 'retired hurt';
        } else {
          outBatter.dismissal = type || 'out';
        }

        if (bowler && type !== 'run_out') {
          bowler.wickets += 1;
        }
      }
    }
  }

  const batters = battingOrder.map(n => battingMap[n]).filter(Boolean);
  const bowlers = bowlingOrder.map(n => bowlingMap[n]).filter(Boolean);

  // Extras
  let extWide = 0, extNB = 0, extBye = 0, extLB = 0;
  for (const ball of balls) {
    const extraType = ball.extraType || null;
    const extraRuns = Number(ball.extraRuns) || 0;
    if (extraType === 'wide') extWide += (1 + extraRuns);
    else if (extraType === 'no_ball') extNB += (1 + extraRuns);
    else if (extraType === 'bye') extBye += extraRuns;
    else if (extraType === 'legbye') extLB += extraRuns;
  }
  const extTotal = extWide + extNB + extBye + extLB;

  // Top scorer: max runs
  let topScorer = null;
  for (const b of batters) {
    if (!topScorer || b.runs > topScorer.runs) topScorer = b;
  }
  if (topScorer && topScorer.runs === 0 && batters.length > 0) {
    topScorer = batters[0];
  }

  // Best bowler: most wickets, tie broken by fewer runs conceded
  let bestBowler = null;
  for (const bw of bowlers) {
    if (!bestBowler) {
      bestBowler = bw;
      continue;
    }
    if (bw.wickets > bestBowler.wickets) {
      bestBowler = bw;
      continue;
    }
    if (bw.wickets === bestBowler.wickets && bw.runs < bestBowler.runs) {
      bestBowler = bw;
    }
  }

  // Did not bat: batting team players from squad never seen in this innings
  const strippedTeamPlayers = teamPlayers.map(strip).filter(Boolean);
  const didNotBat = strippedTeamPlayers.filter(p => !seenInInnings.has(p));

  return {
    batters,
    bowlers,
    extras: {
      wides: extWide,
      noBalls: extNB,
      byes: extBye,
      legByes: extLB,
      total: extTotal
    },
    topScorer,
    bestBowler,
    didNotBat
  };
}

/**
 * Compute result banner text from innings data.
 */
export function computeResult(inn1, inn2, playersPerTeam = 11, status = 'completed') {
  if (!inn1) return 'MATCH IN PROGRESS';
  const inn1Score = inn1.score || 0;
  const inn2Score = inn2?.score || 0;
  const inn2Wickets = inn2?.wickets || 0;
  const inn2Balls = inn2?.legalBalls || 0;

  if (status !== 'completed' && inn2Balls === 0) {
    return `MATCH IN PROGRESS • ${strip(inn1.battingTeam).toUpperCase()} ${inn1Score}/${inn1.wickets || 0}`;
  }

  const target = inn1.target || (inn1Score + 1);

  if (status !== 'completed' && inn2Score < target) {
    return `MATCH IN PROGRESS • ${strip(inn2.battingTeam).toUpperCase()} ${inn2Score}/${inn2Wickets}`;
  }

  if (inn2Score >= target) {
    const wicketsMargin = (playersPerTeam - 1) - inn2Wickets;
    return `${strip(inn2.battingTeam).toUpperCase()} WON BY ${wicketsMargin} WICKETS`;
  } else if (inn2Score === inn1Score) {
    return 'MATCH TIED';
  } else {
    const runsMargin = (target - 1) - inn2Score;
    return `${strip(inn1.battingTeam).toUpperCase()} WON BY ${runsMargin} RUNS`;
  }
}

// ─────────────────────────────────────────────────────────────
// Canvas Dimensions (16:8 UHD Landscape)
// ─────────────────────────────────────────────────────────────
const CANVAS_W = 3200;
const CANVAS_H = 1600;

// ─────────────────────────────────────────────────────────────
// Sub-Components Matching Reference Broadcast Aesthetic
// ─────────────────────────────────────────────────────────────

function InningsPanel({ innNum, innings, inningsData, maxOvers, targetScore, isSecond }) {
  const { batters, bowlers, extras, topScorer, bestBowler, didNotBat } = inningsData;
  const teamName = strip(innings.battingTeam) || `Team ${innNum}`;
  const bowlingTeam = strip(innings.bowlingTeam) || '';
  const score = innings.score || 0;
  const wickets = innings.wickets || 0;
  const legalBalls = innings.legalBalls || 0;
  const overs = formatOversLocal(legalBalls);
  const crr = calcCRRLocal(score, legalBalls);

  // Group bowlers into two side-by-side columns
  const midIdx = Math.ceil(bowlers.length / 2);
  const bowlCol1 = bowlers.slice(0, midIdx);
  const bowlCol2 = bowlers.slice(midIdx);

  // Extras format matching broadcast reference: (wd 19, nb 0, b 0, lb 0)
  const extrasDetail = `(wd ${extras.wides}, nb ${extras.noBalls}, b ${extras.byes}, lb ${extras.legByes})`;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0B2D59',
        border: '2px solid rgba(53, 169, 245, 0.45)',
        borderRadius: '20px',
        overflow: 'hidden',
        minWidth: 0,
        boxShadow: '0 8px 24px rgba(6, 27, 58, 0.5)',
      }}
    >
      {/* ── Innings Header Banner ── */}
      <div
        style={{
          background: 'linear-gradient(90deg, #0B2D59 0%, #103B75 100%)',
          borderBottom: '3px solid #35A9F5',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: '#35A9F5',
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            {`INNINGS ${innNum}`}
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 1.15,
              marginTop: '2px',
            }}
          >
            {teamName}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '46px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
            {score}/{wickets}
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#B9E5FF', marginLeft: '12px' }}>
              ({overs} ov)
            </span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#35A9F5', marginTop: '4px' }}>
            CRR: {crr}  •  Max: {maxOvers} ov
            {isSecond && targetScore != null && (
              <span style={{ color: '#B9E5FF', marginLeft: '10px' }}>
                • Target: {targetScore}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Extras Sub-Bar ── */}
      <div
        style={{
          backgroundColor: '#072042',
          borderBottom: '1px solid rgba(53, 169, 245, 0.25)',
          padding: '8px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '15px',
          color: '#B9E5FF',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        <span>
          <strong style={{ color: '#FFFFFF' }}>Extras: </strong>
          {extras.total} {extrasDetail}
        </span>
        <span>
          <strong style={{ color: '#FFFFFF' }}>Total Overs: </strong>
          {overs} / {maxOvers}
        </span>
      </div>

      {/* ── Batting Table Container (WHITE Background per Reference) ── */}
      <div
        style={{
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          minHeight: 0,
          justifyContent: 'space-between',
        }}
      >
        {/* Table Content */}
        <div style={{ width: '100%' }}>
          {/* Table Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#0B2D59',
              borderBottom: '2px solid #35A9F5',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '1px',
              height: '38px',
            }}
          >
            <div style={{ flex: '0 0 36%', padding: '0 20px' }}>BATSMAN</div>
            <div style={{ flex: '0 0 8%', textAlign: 'center' }}>R</div>
            <div style={{ flex: '0 0 8%', textAlign: 'center' }}>B</div>
            <div style={{ flex: '0 0 7%', textAlign: 'center' }}>4s</div>
            <div style={{ flex: '0 0 7%', textAlign: 'center' }}>6s</div>
            <div style={{ flex: 1, padding: '0 20px' }}>DISMISSAL</div>
          </div>

          {/* Table Rows */}
          {batters.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '30px 20px',
                color: '#10243D',
                fontSize: '18px',
                fontWeight: 600,
              }}
            >
              Yet to bat
            </div>
          ) : (
            batters.map((b, idx) => {
              const isTop = topScorer && b.name === topScorer.name;
              const isAltRow = idx % 2 === 1;
              const rowBg = isTop ? '#E1F2FE' : isAltRow ? '#F1F7FC' : '#FFFFFF';
              const isNotOut = !b.isOut;

              return (
                <div
                  key={b.name + idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: rowBg,
                    borderBottom: '1px solid #D8E7F3',
                    minHeight: '44px',
                    fontSize: '18px',
                    color: '#10243D',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Batsman Name + Star Badge for Top Scorer */}
                  <div
                    style={{
                      flex: '0 0 36%',
                      padding: '4px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minWidth: 0,
                    }}
                  >
                    {isTop && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#35A9F5',
                          color: '#FFFFFF',
                          flexShrink: 0,
                        }}
                      >
                        <Star className="w-3.5 h-3.5 fill-white text-white" />
                      </span>
                    )}
                    <span
                      style={{
                        fontWeight: isTop ? 900 : 700,
                        color: isTop ? '#061B3A' : '#10243D',
                        fontSize: b.name.length > 22 ? '16px' : '18px',
                        lineHeight: 1.25,
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    >
                      {b.name}
                    </span>
                  </div>

                  {/* R */}
                  <div
                    style={{
                      flex: '0 0 8%',
                      textAlign: 'center',
                      fontWeight: 900,
                      fontSize: isTop ? '22px' : '19px',
                      color: isTop ? '#061B3A' : '#10243D',
                    }}
                  >
                    {b.runs}
                  </div>

                  {/* B */}
                  <div
                    style={{
                      flex: '0 0 8%',
                      textAlign: 'center',
                      fontWeight: 600,
                      color: '#3A526E',
                      fontSize: '17px',
                    }}
                  >
                    {b.balls}
                  </div>

                  {/* 4s */}
                  <div
                    style={{
                      flex: '0 0 7%',
                      textAlign: 'center',
                      fontWeight: 600,
                      color: '#3A526E',
                      fontSize: '17px',
                    }}
                  >
                    {b.fours}
                  </div>

                  {/* 6s */}
                  <div
                    style={{
                      flex: '0 0 7%',
                      textAlign: 'center',
                      fontWeight: 600,
                      color: '#3A526E',
                      fontSize: '17px',
                    }}
                  >
                    {b.sixes}
                  </div>

                  {/* Dismissal */}
                  <div
                    style={{
                      flex: 1,
                      padding: '4px 20px',
                      fontSize: b.dismissal.length > 32 ? '14px' : '15px',
                      fontWeight: isNotOut ? 700 : 500,
                      color: isNotOut ? '#22C55E' : '#475E7B',
                      lineHeight: 1.25,
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {b.dismissal}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Did Not Bat Summary (at bottom of white table area) */}
        {didNotBat.length > 0 && (
          <div
            style={{
              padding: '8px 20px',
              backgroundColor: '#F8FBFE',
              borderTop: '1px solid #D8E7F3',
              fontSize: '14px',
              color: '#526E8C',
              flexShrink: 0,
            }}
          >
            <strong style={{ color: '#10243D' }}>Did not bat: </strong>
            {didNotBat.join(', ')}
          </div>
        )}
      </div>

      {/* ── Bowling Section (Navy with 2 Columns) ── */}
      <div
        style={{
          backgroundColor: '#092347',
          borderTop: '2px solid #35A9F5',
          flexShrink: 0,
        }}
      >
        {/* Bowling Header Bar */}
        <div
          style={{
            padding: '8px 20px',
            backgroundColor: '#071C3A',
            color: '#35A9F5',
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '1.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(53, 169, 245, 0.3)',
          }}
        >
          <span>BOWLING ({bowlingTeam.toUpperCase()})</span>
          <span style={{ fontSize: '13px', color: '#B9E5FF', fontWeight: 600 }}>
            FORMAT: OVERS - RUNS - WICKETS
          </span>
        </div>

        {/* 2-Group Side-By-Side Bowling Figures */}
        <div style={{ display: 'flex', padding: '8px 16px', gap: '14px' }}>
          {/* Column 1 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {bowlCol1.length === 0 ? (
              <div style={{ color: '#B9E5FF', fontSize: '15px', padding: '6px 10px', fontStyle: 'italic' }}>
                Yet to bowl
              </div>
            ) : (
              bowlCol1.map((bw) => {
                const isBest = bestBowler && bw.name === bestBowler.name;
                return <BowlerPill key={bw.name} bw={bw} isBest={isBest} />;
              })
            )}
          </div>

          {/* Column 2 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {bowlCol2.map((bw) => {
              const isBest = bestBowler && bw.name === bestBowler.name;
              return <BowlerPill key={bw.name} bw={bw} isBest={isBest} />;
            })}
          </div>
        </div>
      </div>

      {/* ── Performance Highlights Bar ── */}
      <div
        style={{
          padding: '14px 24px',
          backgroundColor: '#061B3A',
          borderTop: '2px solid #35A9F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          gap: '16px',
          flexShrink: 0,
        }}
      >
        {/* Top Scorer Highlight */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(53, 169, 245, 0.2)',
              border: '1.5px solid #35A9F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#35A9F5',
              flexShrink: 0,
            }}
          >
            <Trophy className="w-5 h-5 text-[#35A9F5]" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#35A9F5',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              TOP SCORER
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#FFFFFF',
                wordBreak: 'break-word',
              }}
            >
              {topScorer ? `${topScorer.name} (${topScorer.runs})` : 'None'}
            </div>
          </div>
        </div>

        <div style={{ width: '1px', height: '36px', backgroundColor: 'rgba(53, 169, 245, 0.3)', flexShrink: 0 }} />

        {/* Best Bowler Highlight */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(53, 169, 245, 0.2)',
              border: '1.5px solid #35A9F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#35A9F5',
              flexShrink: 0,
            }}
          >
            <Star className="w-5 h-5 text-[#35A9F5] fill-[#35A9F5]" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#35A9F5',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              BEST BOWLER
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#FFFFFF',
                wordBreak: 'break-word',
              }}
            >
              {bestBowler ? `${bestBowler.name} (${bestBowler.wickets}/${bestBowler.runs})` : 'None'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BowlerPill({ bw, isBest }) {
  const nameFontSize = bw.name.length > 24 ? '15px' : '17px';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 14px',
        backgroundColor: isBest ? '#113E78' : 'rgba(255, 255, 255, 0.05)',
        border: isBest ? '1px solid #35A9F5' : '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        fontSize: '16px',
        minHeight: '38px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
        {isBest && <Star className="w-3.5 h-3.5 text-[#35A9F5] fill-[#35A9F5] shrink-0" />}
        <span
          style={{
            fontWeight: isBest ? 800 : 600,
            color: '#FFFFFF',
            fontSize: nameFontSize,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {bw.name}
        </span>
      </div>
      <div
        style={{
          fontWeight: 800,
          color: isBest ? '#35A9F5' : '#B9E5FF',
          fontFamily: 'monospace',
          fontSize: '17px',
          flexShrink: 0,
          marginLeft: '8px',
        }}
      >
        {formatOversLocal(bw.legalBalls)}-{bw.runs}-{bw.wickets}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ScorecardCanvas — 3200 × 1600 px Broadcast Layout
// ─────────────────────────────────────────────────────────────

export function ScorecardCanvas({ matchState, canvasRef }) {
  const state = matchState?.matchState ? {
    ...matchState.matchState,
    matchId: matchState.matchId,
    code: matchState.code || matchState.matchId
  } : (matchState || {});

  const teams = state.teams || [];
  const innings = state.innings || [];
  const inn1 = innings[0] || {
    score: 0,
    wickets: 0,
    legalBalls: 0,
    balls: [],
    battingTeam: teams[0]?.name || 'Team 1',
    bowlingTeam: teams[1]?.name || 'Team 2'
  };
  const inn2 = innings[1] || {
    score: 0,
    wickets: 0,
    legalBalls: 0,
    balls: [],
    battingTeam: teams[1]?.name || 'Team 2',
    bowlingTeam: teams[0]?.name || 'Team 1'
  };

  const maxOvers = state.overs || 20;
  const matchCode = (state.code || state.matchId || state.id || 'MATCH').toUpperCase();
  const tossWinner = strip(state.toss?.winner || '');
  const tossDecision = state.toss?.decision || 'bat';
  const playersPerTeam = state.playersPerTeam || 11;
  const status = state.status || 'completed';

  const team1Players = (teams[0]?.players || []).map(strip);
  const team2Players = (teams[1]?.players || []).map(strip);
  const inn1Team = strip(inn1.battingTeam);
  const inn2Team = strip(inn2.battingTeam);
  const inn1Squad = teams.find(t => strip(t.name) === inn1Team)?.players?.map(strip) || team1Players;
  const inn2Squad = teams.find(t => strip(t.name) === inn2Team)?.players?.map(strip) || team2Players;

  const inn1Data = computeInningsData(inn1, inn1Squad);
  const inn2Data = computeInningsData(inn2, inn2Squad);

  const resultText = computeResult(inn1, inn2, playersPerTeam, status);
  const targetScore = inn1.target || ((inn1.score || 0) + 1);

  return (
    <div
      ref={canvasRef}
      style={{
        width: CANVAS_W,
        height: CANVAS_H,
        minWidth: CANVAS_W,
        minHeight: CANVAS_H,
        maxWidth: CANVAS_W,
        maxHeight: CANVAS_H,
        backgroundColor: '#061B3A',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        padding: '36px 40px',
        border: '4px solid #35A9F5',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Top Header Section ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0B2D59',
          borderRadius: '20px',
          border: '2px solid rgba(53, 169, 245, 0.4)',
          padding: '20px 32px',
          marginBottom: '24px',
          boxShadow: '0 8px 24px rgba(6, 27, 58, 0.5)',
          flexShrink: 0,
        }}
      >
        {/* Brand & Match Details */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            borderBottom: '1px solid rgba(53, 169, 245, 0.3)',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                backgroundColor: '#35A9F5',
                color: '#061B3A',
                padding: '6px 18px',
                borderRadius: '10px',
                fontSize: '22px',
                fontWeight: 900,
                letterSpacing: '1px',
              }}
            >
              SMARTCRICKET
            </div>
            <span style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF' }}>
              MATCH #{matchCode}
            </span>
          </div>

          <div style={{ fontSize: '20px', fontWeight: 700, color: '#B9E5FF' }}>
            {maxOvers} OVERS MATCH
            {tossWinner && (
              <span> • Toss: {tossWinner} (chose to {tossDecision})</span>
            )}
          </div>
        </div>

        {/* Prominent Match Result Banner */}
        <div
          style={{
            backgroundColor: '#071F3F',
            border: '2px solid #35A9F5',
            borderRadius: '14px',
            padding: '14px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(53, 169, 245, 0.25)',
          }}
        >
          <span
            style={{
              fontSize: '36px',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '1.5px',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {resultText}
          </span>
        </div>
      </div>

      {/* ── Main 2-Column Scorecard ── */}
      <div style={{ flex: 1, display: 'flex', gap: '32px', minHeight: 0 }}>
        <InningsPanel
          innNum={1}
          innings={inn1}
          inningsData={inn1Data}
          maxOvers={maxOvers}
          targetScore={null}
          isSecond={false}
        />
        <InningsPanel
          innNum={2}
          innings={inn2}
          inningsData={inn2Data}
          maxOvers={maxOvers}
          targetScore={targetScore}
          isSecond={true}
        />
      </div>

      {/* ── Footer Branding Watermark ── */}
      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '15px',
          fontWeight: 700,
          color: '#7AA3D1',
          letterSpacing: '1px',
          flexShrink: 0,
        }}
      >
        <span>SMARTCRICKET OFFICIAL SCORECARD • BROADCAST EDITION</span>
        <span>16:8 ULTRA-HD 3200 × 1600 PX • POWERED BY SMARTCRICKET LIVE ENGINE</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component — Modal Dialog with Native Download & Share
// ─────────────────────────────────────────────────────────────

export default function ScorecardPNGGenerator({ matchState, isOpen, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const canvasRef = useRef(null);

  const state = matchState?.matchState ? {
    ...matchState.matchState,
    matchId: matchState.matchId,
    code: matchState.code || matchState.matchId
  } : (matchState || {});

  const teams = state.teams || [];
  const inn1 = state.innings?.[0];
  const inn2 = state.innings?.[1];
  const team1Name = strip(teams[0]?.name || inn1?.battingTeam || 'Team 1');
  const team2Name = strip(teams[1]?.name || inn2?.battingTeam || 'Team 2');
  const matchCode = (state.code || state.matchId || state.id || 'MATCH').toUpperCase();
  const fileName = `Scorecard_${team1Name.replace(/\s+/g, '_')}_vs_${team2Name.replace(/\s+/g, '_')}_${matchCode}.png`;

  // Render & capture when modal opens
  useEffect(() => {
    if (!isOpen) {
      setGeneratedImageUrl(null);
      return;
    }

    const capture = async () => {
      setIsGenerating(true);
      try {
        if (typeof document !== 'undefined' && document.fonts) {
          await document.fonts.ready;
        }
        await new Promise((r) => setTimeout(r, 600));

        const element = canvasRef.current;
        if (!element) return;

        const dataUrl = await toPng(element, {
          pixelRatio: 1,
          width: CANVAS_W,
          height: CANVAS_H,
          cacheBust: true,
          skipFonts: false,
          style: {
            position: 'relative',
            left: '0px',
            top: '0px',
            margin: '0px',
            transform: 'none',
          },
        });

        if (dataUrl) {
          setGeneratedImageUrl(dataUrl);
        }
      } catch (err) {
        console.error('Scorecard PNG capture error:', err);
      } finally {
        setIsGenerating(false);
      }
    };

    capture();
  }, [isOpen, matchState]);

  const handleDownload = async () => {
    if (!generatedImageUrl) return;
    setIsDownloading(true);
    try {
      await exportAndSaveImage(generatedImageUrl, fileName, `Cricket Scorecard: ${team1Name} vs ${team2Name}`, { downloadOnly: true });
    } catch (err) {
      console.error('Download failed:', err);
      alert('Could not save scorecard: ' + (err.message || ''));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!generatedImageUrl) return;
    setIsSharing(true);
    try {
      await exportAndSaveImage(generatedImageUrl, fileName, `Cricket Scorecard: ${team1Name} vs ${team2Name}`, { shareOnly: true });
    } catch (err) {
      console.error('Share failed:', err);
      alert('Could not share scorecard: ' + (err.message || ''));
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      {/* Hidden canvas — mounted at (0,0) with z-index: -99999 so html-to-image renders full canvas natively */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: CANVAS_W,
          height: CANVAS_H,
          zIndex: -99999,
          pointerEvents: 'none',
          opacity: 1,
          overflow: 'hidden',
        }}
      >
        <ScorecardCanvas matchState={matchState} canvasRef={canvasRef} />
      </div>

      {/* Preview Modal Dialog */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={onClose}
        >
          <div
            className="w-full max-w-5xl rounded-3xl p-5 sm:p-6 flex flex-col gap-4 bg-[var(--card)] border border-[var(--bd)] shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--bd)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#0B2D59] text-[#35A9F5] border border-[#35A9F5]/40 shadow-sm">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--t1)]">
                    Premium Cricket Scorecard PNG (16:8)
                  </h2>
                  <p className="text-xs text-[var(--t2)] font-medium">
                    3200 × 1600 UHD Broadcast Scorecard • {team1Name} vs {team2Name}
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

            {/* Preview Area */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] max-h-[60vh] overflow-y-auto rounded-2xl bg-[#061B3A] p-3 sm:p-4 border border-[#35A9F5]/30 relative">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-3 text-center p-8">
                  <ButtonSpinner className="w-10 h-10 text-[#35A9F5]" />
                  <p className="text-sm font-bold text-white tracking-wide">
                    Generating 3200 × 1600 broadcast scorecard…
                  </p>
                  <p className="text-xs text-[#B9E5FF]">
                    Formatting batting tables, bowling figures, and performance highlights
                  </p>
                </div>
              ) : generatedImageUrl ? (
                <div className="w-full flex items-center justify-center overflow-hidden">
                  <img
                    src={generatedImageUrl}
                    alt="SmartCricket Scorecard Preview"
                    className="w-full h-auto max-h-[58vh] object-contain rounded-xl border border-[#35A9F5]/50 shadow-2xl"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-[#B9E5FF]">
                  <p className="text-sm font-bold">Preview unavailable. Click Download to export.</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--bd)]">
              <div className="text-xs text-[var(--t2)] hidden sm:block">
                Resolution: <span className="font-mono font-bold text-[var(--t1)]">3200 × 1600 px (16:8)</span> • Format: <span className="font-mono font-bold text-[var(--t1)]">PNG</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={handleShare}
                  disabled={isGenerating || isSharing || !generatedImageUrl}
                  className="btn s inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full font-bold text-xs flex-1 sm:flex-none border border-[var(--bd)] hover:bg-[var(--well)] transition-all disabled:opacity-50"
                >
                  {isSharing ? <Loader2 className="w-4 h-4 animate-spin text-[#35A9F5]" /> : <Share2 className="w-4 h-4 text-[#35A9F5]" />}
                  <span>{isSharing ? 'Sharing…' : 'Share Scorecard'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  disabled={isGenerating || isDownloading || !generatedImageUrl}
                  className="btn p inline-flex items-center justify-center gap-2 h-10 px-6 rounded-full font-bold text-xs flex-1 sm:flex-none bg-[#35A9F5] text-[#061B3A] hover:bg-[#2092dd] transition-all shadow-md disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{isDownloading ? 'Saving…' : 'Download PNG'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
