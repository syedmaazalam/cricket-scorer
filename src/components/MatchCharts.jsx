import React, { useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { computeInningsStats } from '../engine/stats.js';

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

  // Max runs in an over for scaling bar chart
  const maxRunsInOver = Math.max(12, ...oversList.map(o => o.runs || 0));

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
          over: (legalBallCount / 6).toFixed(1),
          score: currentScore,
          isWicket: b.isWicket
        });
      }
    });
    return points;
  };

  const worm1 = buildWormData(inn1);
  const worm2 = buildWormData(inn2);

  const maxTotalScore = Math.max(50, inn1?.score || 0, inn2?.score || 0);
  const maxBalls = (matchState.overs || 20) * 6;

  // Chart dimensions for SVG
  const chartWidth = 340;
  const chartHeight = 150;
  const padding = { top: 15, right: 15, bottom: 25, left: 35 };

  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Helper to scale worm points to SVG coordinates
  const scaleX = (ball) => padding.left + (ball / maxBalls) * plotWidth;
  const scaleY = (score) => padding.top + plotHeight - (score / maxTotalScore) * plotHeight;

  const makePath = (points) => {
    if (!points || points.length === 0) return '';
    return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(p.ball)} ${scaleY(p.score)}`).join(' ');
  };

  return (
    <div className="bg-slate-900/90 dark:bg-slate-900/90 light:bg-white rounded-3xl p-4 border border-slate-800 dark:border-slate-800 light:border-slate-200 flex flex-col gap-3 shadow-lg">
      {/* Chart Header & Mode Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 dark:border-slate-800 light:border-slate-200 pb-2.5">
        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-300 dark:text-slate-300 light:text-slate-800 uppercase tracking-wider">
          {activeChart === 'runs' ? <BarChart3 className="w-4 h-4 text-emerald-400" /> : <TrendingUp className="w-4 h-4 text-amber-400" />}
          <span>{activeChart === 'runs' ? 'Over Comparison' : 'Worm Comparison'}</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 dark:bg-slate-950 light:bg-slate-100 p-1 rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200">
          <button
            onClick={() => setActiveChart('runs')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeChart === 'runs'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Run Rate
          </button>
          <button
            onClick={() => setActiveChart('worm')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeChart === 'worm'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Worm
          </button>
        </div>
      </div>

      {/* Runs per Over Bar Chart */}
      {activeChart === 'runs' && (
        <div className="flex flex-col gap-2">
          {/* Innings selector for bar chart */}
          {inn2?.balls?.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedInnings(0)}
                className={`py-1 px-3 rounded-xl text-xs font-semibold border ${
                  selectedInnings === 0
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-800/40 text-slate-400 border-slate-800'
                }`}
              >
                {inn1?.battingTeam || '1st Innings'}
              </button>
              <button
                onClick={() => setSelectedInnings(1)}
                className={`py-1 px-3 rounded-xl text-xs font-semibold border ${
                  selectedInnings === 1
                    ? 'bg-amber-600/30 text-amber-300 border-amber-500/50'
                    : 'bg-slate-800/40 text-slate-400 border-slate-800'
                }`}
              >
                {inn2?.battingTeam || '2nd Innings'}
              </button>
            </div>
          )}

          {oversList.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No complete overs recorded yet. Score balls to see the bar chart!
            </div>
          ) : (
            <div className="flex items-end gap-1.5 h-36 pt-4 pb-2 px-1 overflow-x-auto border-b border-slate-800">
              {oversList.map((ov) => {
                const heightPercent = Math.max(10, Math.round((ov.runs / maxRunsInOver) * 100));
                const hasWicket = ov.wickets > 0;
                return (
                  <div key={ov.overIndex} className="flex-1 min-w-[28px] max-w-[40px] flex flex-col items-center gap-1 group">
                    <span className="text-[10px] font-bold text-slate-300">{ov.runs}</span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all flex flex-col items-center justify-start pt-1 ${
                        hasWicket
                          ? 'bg-gradient-to-t from-rose-600 to-red-500 shadow-md shadow-rose-900/40'
                          : ov.runs >= 10
                          ? 'bg-gradient-to-t from-cyan-600 to-blue-500'
                          : 'bg-gradient-to-t from-emerald-600 to-teal-500'
                      }`}
                    >
                      {hasWicket && (
                        <span className="w-2 h-2 rounded-full bg-white shadow animate-ping" />
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">O{ov.overIndex}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Normal Over</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> 10+ Runs</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Wicket Over</span>
          </div>
        </div>
      )}

      {/* Worm Comparison Chart */}
      {activeChart === 'worm' && (
        <div className="flex flex-col gap-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-40 overflow-visible">
            {/* Grid Lines */}
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
                    stroke="#334155"
                    strokeDasharray="2,2"
                    strokeWidth="0.8"
                  />
                  <text x={padding.left - 4} y={y + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                    {scoreVal}
                  </text>
                </g>
              );
            })}

            {/* X axis labels (Overs) */}
            {[0, Math.floor(matchState.overs / 2), matchState.overs].map((ov) => {
              const x = scaleX(ov * 6);
              return (
                <text key={ov} x={x} y={chartHeight - 8} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">
                  {ov}ov
                </text>
              );
            })}

            {/* Innings 1 Worm Path */}
            {worm1.length > 1 && (
              <path
                d={makePath(worm1)}
                fill="none"
                stroke="#10b981"
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
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="1"
              />
            ))}

            {/* Innings 2 Worm Path */}
            {worm2.length > 1 && (
              <path
                d={makePath(worm2)}
                fill="none"
                stroke="#f59e0b"
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
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="1"
              />
            ))}
          </svg>

          {/* Legend */}
          <div className="flex items-center justify-between text-xs px-2 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-emerald-500" />
              <span className="font-bold text-emerald-400">{inn1?.battingTeam || 'Team 1'}: {inn1?.score || 0}/{inn1?.wickets || 0}</span>
            </div>

            {inn2 && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full bg-amber-500" />
                <span className="font-bold text-amber-400">{inn2?.battingTeam || 'Team 2'}: {inn2?.score || 0}/{inn2?.wickets || 0}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 border border-white" />
              <span>Wicket</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
