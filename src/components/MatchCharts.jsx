import React, { useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { computeInningsStats } from '../engine/stats.js';
import { calculateRRR } from '../engine/rules.js';

export default function MatchCharts({ matchState }) {
  const [activeChart, setActiveChart] = useState('runs'); // 'runs' | 'worm'
  const [selectedInnings, setSelectedInnings] = useState(0);

  const inn1 = matchState.innings?.[0];
  const inn2 = matchState.innings?.[1];

  const stats1 = inn1 ? computeInningsStats(inn1) : null;
  const stats2 = inn2 ? computeInningsStats(inn2) : null;

  const currentStats = selectedInnings === 0 ? stats1 : stats2;
  const currentInn = selectedInnings === 0 ? inn1 : inn2;
  const oversList = currentStats?.overSummaries || [];

  const maxRunsInOver = Math.max(14, ...oversList.map(o => o.runs || 0));

  // Build Worm Chart data points
  const buildWormData = (inn) => {
    if (!inn || !inn.balls || inn.balls.length === 0) return [{ ball: 0, score: 0 }];
    const points = [{ ball: 0, score: 0 }];
    let currentScore = 0;
    let legalBallCount = 0;

    inn.balls.forEach((b) => {
      currentScore = b.scoreAtBall || (currentScore + (b.runs || 0) + (b.extraRuns || 0));
      if (b.isLegal) {
        legalBallCount++;
        points.push({
          ball: legalBallCount,
          score: currentScore,
          isWicket: b.isWicket
        });
      }
    });
    return points;
  };

  const worm1 = buildWormData(inn1);
  const worm2 = buildWormData(inn2);

  const maxTotalScore = Math.max(60, inn1?.score || 0, inn2?.score || 0);
  const totalOvers = matchState.overs || 20;
  const maxBalls = totalOvers * 6;

  // SVG dimensions
  const chartWidth = 340;
  const chartHeight = 150;
  const padding = { top: 20, right: 15, bottom: 25, left: 35 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const scaleX = (ball) => padding.left + (ball / maxBalls) * plotWidth;
  const scaleY = (score) => padding.top + plotHeight - (score / maxTotalScore) * plotHeight;

  const makePath = (points) => {
    if (!points || points.length === 0) return '';
    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(p.ball)} ${scaleY(p.score)}`).join(' ');
  };

  // Chase target calculations for reference banner (Image 1)
  const isChasing = matchState.target && inn2;
  const runsRemaining = matchState.target ? Math.max(0, matchState.target - (inn2?.score || 0)) : 0;
  const ballsRemaining = Math.max(0, maxBalls - (inn2?.legalBalls || 0));
  const oversRemainingDecimal = (ballsRemaining / 6).toFixed(1);
  const rpo = calculateRRR(matchState.target, inn2?.score || 0, inn2?.legalBalls || 0, totalOvers);

  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)'
      }}
      className="app-card p-4 flex flex-col gap-3"
    >
      {/* Chart Header & Mode Toggle */}
      <div
        style={{ borderColor: 'var(--border)' }}
        className="flex items-center justify-between border-b pb-2.5"
      >
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text)' }}>
          {activeChart === 'runs' ? (
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          ) : (
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--orange)' }} />
          )}
          <span>{activeChart === 'runs' ? 'Cricket Runs Per Over Chart' : 'Scoring Comparison (Worm)'}</span>
        </div>

        {/* Toggle per spec: active: --primary bg, white text; inactive: transparent, --muted */}
        <div
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-alt)' }}
          className="flex items-center gap-1 p-1 rounded-xl border"
        >
          <button
            onClick={() => setActiveChart('runs')}
            style={{
              backgroundColor: activeChart === 'runs' ? 'var(--primary)' : 'transparent',
              color: activeChart === 'runs' ? '#FFFFFF' : 'var(--muted)'
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
          >
            Run Rate
          </button>
          <button
            onClick={() => setActiveChart('worm')}
            style={{
              backgroundColor: activeChart === 'worm' ? 'var(--primary)' : 'transparent',
              color: activeChart === 'worm' ? '#FFFFFF' : 'var(--muted)'
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
          >
            Worm
          </button>
        </div>
      </div>

      {/* 1. Runs per Over Bar Chart (matching Reference Image 2) */}
      {activeChart === 'runs' && (
        <div className="flex flex-col gap-2">
          {inn2?.balls?.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedInnings(0)}
                style={{
                  backgroundColor: selectedInnings === 0 ? 'var(--primary)' : 'var(--card-alt)',
                  color: selectedInnings === 0 ? '#FFFFFF' : 'var(--muted)',
                  borderColor: 'var(--border)'
                }}
                className="py-1 px-3 rounded-xl text-xs font-bold border transition-all"
              >
                {inn1?.battingTeam || '1st Innings'}
              </button>
              <button
                onClick={() => setSelectedInnings(1)}
                style={{
                  backgroundColor: selectedInnings === 1 ? 'var(--primary)' : 'var(--card-alt)',
                  color: selectedInnings === 1 ? '#FFFFFF' : 'var(--muted)',
                  borderColor: 'var(--border)'
                }}
                className="py-1 px-3 rounded-xl text-xs font-bold border transition-all"
              >
                {inn2?.battingTeam || '2nd Innings'}
              </button>
            </div>
          )}

          {oversList.length === 0 ? (
            <div className="text-center py-8 text-xs" style={{ color: 'var(--muted)' }}>
              No complete overs recorded yet. Score balls to see the over-by-over chart!
            </div>
          ) : (
            <div
              style={{ borderColor: 'var(--border)' }}
              className="flex items-end gap-2 h-40 pt-6 pb-2 px-1 overflow-x-auto border-b"
            >
              {oversList.map((ov) => {
                const heightPercent = Math.max(12, Math.round((ov.runs / maxRunsInOver) * 100));
                const hasWicket = ov.wickets > 0;

                // Color mapping per spec: normal over --purple, 10+ runs --blue, wicket over --red
                let barColor = 'var(--purple)';
                if (hasWicket) {
                  barColor = 'var(--red)';
                } else if (ov.runs >= 10) {
                  barColor = 'var(--blue)';
                }

                return (
                  <div key={ov.overIndex} className="flex-1 min-w-[28px] max-w-[40px] flex flex-col items-center gap-1 group">
                    {/* Wicket dots above the bar (matching reference image 2) */}
                    {hasWicket && (
                      <div className="flex flex-col items-center gap-0.5 -mb-0.5">
                        {Array.from({ length: Math.min(3, ov.wickets) }).map((_, wIdx) => (
                          <span
                            key={wIdx}
                            style={{ backgroundColor: 'var(--red)' }}
                            className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          />
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] font-bold" style={{ color: 'var(--text)' }}>{ov.runs}</span>
                    <div
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: barColor
                      }}
                      className="w-full rounded-t-lg transition-all"
                    />
                    <span className="text-[9px] font-mono" style={{ color: 'var(--muted)' }}>
                      {ov.overIndex}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bar Chart Legend */}
          <div className="flex items-center justify-between text-[10px] px-1" style={{ color: 'var(--muted)' }}>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--purple)' }} /> Normal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--blue)' }} /> 10+ Runs
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--red)' }} /> Wicket Over
            </span>
          </div>
        </div>
      )}

      {/* 2. Worm Comparison Chart (matching Reference Image 1) */}
      {activeChart === 'worm' && (
        <div className="flex flex-col gap-2">
          {/* Header comparison pills: A vs B */}
          <div className="flex items-center justify-between px-1 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: 'var(--blue)', color: '#FFFFFF' }}
                className="px-2.5 py-0.5 rounded-md font-mono text-[11px]"
              >
                A: {inn1?.battingTeam || 'Team 1'} ({inn1?.score || 0}/{inn1?.wickets || 0})
              </span>
              {inn2 && (
                <span
                  style={{ backgroundColor: 'var(--orange)', color: '#FFFFFF' }}
                  className="px-2.5 py-0.5 rounded-md font-mono text-[11px]"
                >
                  B: {inn2?.battingTeam || 'Team 2'} ({inn2?.score || 0}/{inn2?.wickets || 0})
                </span>
              )}
            </div>
          </div>

          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-40 overflow-visible">
            {/* Horizontal Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = padding.top + plotHeight * ratio;
              const scoreVal = Math.round(maxTotalScore * (1 - ratio));
              return (
                <g key={idx}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray="2,2"
                    strokeWidth="0.8"
                  />
                  <text x={padding.left - 4} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize="8" fontFamily="monospace">
                    {scoreVal}
                  </text>
                </g>
              );
            })}

            {/* X axis labels (Overs 0, 10, 20... maxOvers) */}
            {[0, Math.floor(totalOvers / 2), totalOvers].map((ov) => {
              const x = scaleX(ov * 6);
              return (
                <text key={ov} x={x} y={chartHeight - 6} textAnchor="middle" fill="var(--muted)" fontSize="8" fontFamily="monospace">
                  {ov}
                </text>
              );
            })}

            {/* Innings 1 Path (Blue per reference image) */}
            {worm1.length > 1 && (
              <path
                d={makePath(worm1)}
                fill="none"
                stroke="var(--blue)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Innings 1 Wicket Markers */}
            {worm1.filter(p => p.isWicket).map((p, idx) => (
              <circle
                key={`inn1-w-${idx}`}
                cx={scaleX(p.ball)}
                cy={scaleY(p.score)}
                r="3.5"
                fill="var(--blue)"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            ))}

            {/* Innings 2 Path (Orange / Red per reference image) */}
            {worm2.length > 1 && (
              <path
                d={makePath(worm2)}
                fill="none"
                stroke="var(--orange)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Innings 2 Wicket Markers */}
            {worm2.filter(p => p.isWicket).map((p, idx) => (
              <circle
                key={`inn2-w-${idx}`}
                cx={scaleX(p.ball)}
                cy={scaleY(p.score)}
                r="3.5"
                fill="var(--red)"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            ))}
          </svg>

          {/* Reference Image 1 Banner: "(B) TEAM NEED X MORE TO WIN FROM Y OVERS AT Z RPO" */}
          {isChasing ? (
            <div
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              className="py-2 px-3 rounded-xl border text-center font-bold text-xs uppercase tracking-wider"
            >
              <span>({inn2?.battingTeam || 'B'}) TEAM NEED </span>
              <strong style={{ color: 'var(--red)' }}>{runsRemaining} MORE</strong>
              <span> TO WIN FROM </span>
              <strong style={{ color: 'var(--orange)' }}>{oversRemainingDecimal} OVERS</strong>
              <span> AT </span>
              <strong style={{ color: 'var(--primary)' }}>{rpo} RPO</strong>
            </div>
          ) : (
            <div
              style={{ borderColor: 'var(--border)' }}
              className="flex items-center justify-between text-xs px-2 pt-1 border-t"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full" style={{ backgroundColor: 'var(--blue)' }} />
                <span className="font-bold" style={{ color: 'var(--blue)' }}>{inn1?.battingTeam || '1st Inn'}: {inn1?.score || 0}/{inn1?.wickets || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--muted)' }}>
                <span className="w-2.5 h-2.5 rounded-full border border-white" style={{ backgroundColor: 'var(--red)' }} />
                <span>Wicket Marker</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
