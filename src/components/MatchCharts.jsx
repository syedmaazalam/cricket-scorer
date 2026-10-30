import React, { useState, useId, useEffect } from 'react';
import { BarChart3, TrendingUp, Sparkles } from 'lucide-react';
import { computeInningsStats } from '../engine/stats.js';
import { formatOvers, calculateCRR } from '../engine/rules.js';

export default function MatchCharts({ matchState }) {
  const [activeChart, setActiveChart] = useState('runs'); // 'runs' (Bar Chart) | 'worm' (Line Chart)
  const [selectedInnings, setSelectedInnings] = useState(0);
  const [selectedOver, setSelectedOver] = useState(null); // overIndex tapped for tooltip
  const [overRange, setOverRange] = useState('all'); // '1-10' | '11-20' | 'all'
  const [selectedWormOver, setSelectedWormOver] = useState(null);

  const chartId = useId();

  const inn1 = matchState?.innings?.[0] || { score: 0, wickets: 0, legalBalls: 0, balls: [], battingTeam: 'Team Alpha' };
  const inn2 = matchState?.innings?.[1];

  const stats1 = computeInningsStats(inn1);
  const stats2 = inn2 ? computeInningsStats(inn2) : null;

  const currentStats = selectedInnings === 0 ? stats1 : (stats2 || stats1);
  const currentInn = selectedInnings === 0 ? inn1 : (inn2 || inn1);

  const totalMatchOvers = matchState?.overs || 20;

  // Build full over list up to match overs (or at least 10 or 20)
  const rawOvers = currentStats?.overSummaries || [];
  const maxRecordedOver = Math.max(rawOvers.length, currentInn?.legalBalls ? Math.ceil(currentInn.legalBalls / 6) : 0);
  const totalDisplayOvers = Math.max(10, Math.min(totalMatchOvers, Math.max(10, maxRecordedOver)));

  // Generate over-by-over data for all overs up to totalDisplayOvers
  const allOversData = Array.from({ length: totalDisplayOvers }, (_, i) => {
    const ovNum = i + 1;
    const existing = rawOvers.find(o => o.overIndex === ovNum);
    return existing ? { ...existing, hasData: true } : {
      overIndex: ovNum,
      runs: 0,
      wickets: 0,
      isMaiden: false,
      hasData: ovNum <= maxRecordedOver
    };
  });

  // Filter based on mobile selector (1-10, 11-20, all)
  const filteredOvers = allOversData.filter(ov => {
    if (overRange === '1-10') return ov.overIndex <= 10;
    if (overRange === '11-20') return ov.overIndex > 10 && ov.overIndex <= 20;
    return true;
  });

  // Calculate CRR
  const crrValue = Number(calculateCRR(currentInn.score || 0, currentInn.legalBalls || 0));

  // Find max runs in any recorded over to scale Y-axis dynamically
  const maxOverRuns = Math.max(14, ...allOversData.filter(o => o.hasData).map(o => o.runs || 0));
  // Round up to nice round number (multiple of 4 or 5)
  const yAxisMax = Math.ceil(maxOverRuns / 4) * 4;
  const yAxisSteps = [0, yAxisMax * 0.25, yAxisMax * 0.5, yAxisMax * 0.75, yAxisMax];

  // Best Over, Average, Total Stats for bottom cards
  // Best Bowling Over: Fewest runs conceded is best (e.g. 5 runs beats 10 runs). Wickets add major merit.
  const recordedOvers = allOversData.filter(o => o.hasData);
  let bestOverObj = null;
  if (recordedOvers.length > 0) {
    const getBowlingQuality = (ov) => {
      return (ov.runs || 0) - ((ov.wickets || 0) * 12);
    };
    bestOverObj = recordedOvers.reduce((best, curr) => (getBowlingQuality(curr) < getBowlingQuality(best) ? curr : best), recordedOvers[0]);
  }
  const bestOverRuns = bestOverObj ? bestOverObj.runs : 0;
  const bestOverNumber = bestOverObj ? bestOverObj.overIndex : null;
  const avgRunsPerOver = recordedOvers.length > 0
    ? (recordedOvers.reduce((acc, o) => acc + o.runs, 0) / recordedOvers.length).toFixed(1)
    : crrValue.toFixed(1);

  // Sync selected innings when match enters 2nd innings
  useEffect(() => {
    if (matchState?.currentInningsIndex != null) {
      setSelectedInnings(matchState.currentInningsIndex);
    }
  }, [matchState?.currentInningsIndex]);

  // Set default selected over for the tooltip if none selected yet
  useEffect(() => {
    if (selectedOver === null && recordedOvers.length > 0) {
      // Pick the last completed or highest over
      const highest = recordedOvers.reduce((prev, curr) => (curr.runs > prev.runs ? curr : prev), recordedOvers[0]);
      setSelectedOver(highest ? highest.overIndex : recordedOvers[recordedOvers.length - 1].overIndex);
    }
  }, [recordedOvers.length]);

  const activeTooltipOver = allOversData.find(o => o.overIndex === selectedOver);

  // --- Worm / Line Chart Data Builder ---
  const buildLineChartData = (innings) => {
    if (!innings || !innings.balls) return [];
    const overMap = [];
    let currentScore = 0;
    let wicketsCount = 0;
    let legalBalls = 0;

    // Point at 0
    overMap.push({ over: 0, score: 0, wickets: 0, isWicket: false });

    // Track ball by ball
    innings.balls.forEach((b) => {
      currentScore = b.scoreAtBall || (currentScore + (b.runs || 0) + (b.extraRuns || 0));
      if (b.isLegal) {
        legalBalls++;
      }
      if (b.isWicket) {
        wicketsCount++;
      }

      // Record at end of each over
      if (b.isLegal && legalBalls % 6 === 0) {
        const ov = legalBalls / 6;
        overMap.push({
          over: ov,
          score: currentScore,
          wickets: wicketsCount,
          isWicket: b.isWicket
        });
      }
    });

    // If current over is incomplete, add current point
    if (legalBalls % 6 !== 0 && legalBalls > 0) {
      const ov = Number((legalBalls / 6).toFixed(1));
      overMap.push({
        over: ov,
        score: currentScore,
        wickets: wicketsCount,
        isWicket: false
      });
    }

    return overMap;
  };

  const lineData1 = buildLineChartData(inn1);
  const lineData2 = inn2 ? buildLineChartData(inn2) : [];

  const maxMatchScore = Math.max(120, (matchState?.target || 0) + 20, inn1.score || 0, inn2?.score || 0);
  const wormYSteps = [0, 50, 100, 150, 200].filter(s => s <= maxMatchScore);
  if (wormYSteps[wormYSteps.length - 1] < maxMatchScore) {
    wormYSteps.push(Math.ceil(maxMatchScore / 50) * 50);
  }
  const wormMaxY = wormYSteps[wormYSteps.length - 1] || 200;

  // Worm SVG Dimensions
  const wormSvgWidth = 600;
  const wormSvgHeight = 260;
  const wormPad = { top: 35, right: 35, bottom: 40, left: 45 };
  const wormPlotW = wormSvgWidth - wormPad.left - wormPad.right;
  const wormPlotH = wormSvgHeight - wormPad.top - wormPad.bottom;

  const getWormX = (over) => wormPad.left + (over / totalMatchOvers) * wormPlotW;
  const getWormY = (score) => wormPad.top + wormPlotH - (score / wormMaxY) * wormPlotH;

  // Generate smooth cubic Bézier SVG path
  const createSmoothLinePath = (points) => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${getWormX(points[0].over)} ${getWormY(points[0].score)}`;

    let path = `M ${getWormX(points[0].over)} ${getWormY(points[0].score)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const x1 = getWormX(p1.over);
      const y1 = getWormY(p1.score);
      const x2 = getWormX(p2.over);
      const y2 = getWormY(p2.score);

      // Control points
      const cp1x = x1 + (x2 - getWormX(p0.over)) / 6;
      const cp1y = y1 + (y2 - getWormY(p0.score)) / 6;
      const cp2x = x2 - (getWormX(p3.over) - x1) / 6;
      const cp2y = y2 - (getWormY(p3.score) - y1) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
    return path;
  };

  const linePath1 = createSmoothLinePath(lineData1);
  const linePath2 = createSmoothLinePath(lineData2);

  // Area fill paths
  const createAreaPath = (linePath, points) => {
    if (!linePath || points.length === 0) return '';
    const firstX = getWormX(points[0].over);
    const lastX = getWormX(points[points.length - 1].over);
    const bottomY = wormPad.top + wormPlotH;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const areaPath1 = createAreaPath(linePath1, lineData1);
  const areaPath2 = createAreaPath(linePath2, lineData2);

  // Default selected worm over
  const activeWormPoint = (selectedWormOver !== null
    ? (lineData1.find(p => Math.round(p.over) === selectedWormOver) || lineData1[lineData1.length - 1])
    : (lineData1[Math.min(8, lineData1.length - 1)] || lineData1[lineData1.length - 1])) || { over: 8, score: inn1.score, wickets: inn1.wickets };

  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)'
      }}
      className="app-card p-3 sm:p-5 flex flex-col gap-3 shadow-md rounded-[20px] transition-all"
    >
      {/* 1. Header with Title & Run Rate / Worm Toggle */}
      <div
        style={{ borderColor: 'var(--border)' }}
        className="flex items-center justify-between border-b pb-3"
      >
        <div className="flex items-center gap-2">
          <div
            style={{ backgroundColor: 'var(--card-alt)' }}
            className="p-1.5 rounded-xl flex items-center justify-center border"
          >
            {activeChart === 'runs' ? (
              <BarChart3 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            ) : (
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--orange)' }} />
            )}
          </div>
          <span className="font-black text-xs sm:text-sm tracking-wider uppercase" style={{ color: 'var(--text)' }}>
            OVER COMPARISON
          </span>
        </div>

        {/* Toggle buttons per spec */}
        <div
          style={{
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)'
          }}
          className="flex items-center gap-1.5 p-1 rounded-2xl border"
        >
          <button
            type="button"
            onClick={() => setActiveChart('runs')}
            style={{
              backgroundColor: activeChart === 'runs' ? 'var(--primary)' : 'transparent',
              color: activeChart === 'runs' ? '#FFFFFF' : 'var(--muted)',
              lineHeight: '1.4'
            }}
            className="min-h-[30px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm flex items-center justify-center"
          >
            Run Rate
          </button>
          <button
            type="button"
            onClick={() => setActiveChart('worm')}
            style={{
              backgroundColor: activeChart === 'worm' ? 'var(--primary)' : 'transparent',
              color: activeChart === 'worm' ? '#FFFFFF' : 'var(--muted)',
              lineHeight: '1.4'
            }}
            className="min-h-[30px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm flex items-center justify-center"
          >
            Worm
          </button>
        </div>
      </div>

      {/* Innings Selector if 2nd Innings has begun */}
      {inn2 && inn2.balls && inn2.balls.length > 0 && activeChart === 'runs' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedInnings(0)}
            style={{
              backgroundColor: selectedInnings === 0 ? 'var(--primary)' : 'var(--card-alt)',
              color: selectedInnings === 0 ? '#FFFFFF' : 'var(--muted)',
              borderColor: 'var(--border)'
            }}
            className="px-3 py-1 rounded-xl text-xs font-bold border transition-all"
          >
            {inn1.battingTeam} ({inn1.score}/{inn1.wickets})
          </button>
          <button
            type="button"
            onClick={() => setSelectedInnings(1)}
            style={{
              backgroundColor: selectedInnings === 1 ? 'var(--primary)' : 'var(--card-alt)',
              color: selectedInnings === 1 ? '#FFFFFF' : 'var(--muted)',
              borderColor: 'var(--border)'
            }}
            className="px-3 py-1 rounded-xl text-xs font-bold border transition-all"
          >
            {inn2.battingTeam} ({inn2.score}/{inn2.wickets})
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. BAR CHART MODE (MATCHING REFERENCE IMAGE 2) */}
      {/* ============================================================ */}
      {activeChart === 'runs' && (
        <div className="flex flex-col gap-3">
          {/* Mobile Overs Range Combo Box (Overs 1-10, Overs 11-20, All Overs) */}
          <div className="flex sm:hidden items-center justify-between text-xs">
            <span style={{ color: 'var(--muted)' }} className="font-semibold text-[11px]">View Range:</span>
            <div
              style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
              className="flex items-center gap-1 p-0.5 rounded-xl border text-[11px]"
            >
              <button
                type="button"
                onClick={() => setOverRange('1-10')}
                style={{
                  backgroundColor: overRange === '1-10' ? 'var(--primary)' : 'transparent',
                  color: overRange === '1-10' ? '#FFFFFF' : 'var(--muted)'
                }}
                className="px-2 py-0.5 rounded-lg font-bold transition-all"
              >
                1-10
              </button>
              <button
                type="button"
                onClick={() => setOverRange('11-20')}
                style={{
                  backgroundColor: overRange === '11-20' ? 'var(--primary)' : 'transparent',
                  color: overRange === '11-20' ? '#FFFFFF' : 'var(--muted)'
                }}
                className="px-2 py-0.5 rounded-lg font-bold transition-all"
              >
                11-20
              </button>
              <button
                type="button"
                onClick={() => setOverRange('all')}
                style={{
                  backgroundColor: overRange === 'all' ? 'var(--primary)' : 'transparent',
                  color: overRange === 'all' ? '#FFFFFF' : 'var(--muted)'
                }}
                className="px-2 py-0.5 rounded-lg font-bold transition-all"
              >
                All
              </button>
            </div>
          </div>

          {/* Interactive Tooltip shown at top parallel to X-axis (Matching Image 2) */}
          <div className="min-h-[36px] py-1 flex items-center justify-center relative my-1">
            {activeTooltipOver && activeTooltipOver.hasData ? (
              <div
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  lineHeight: '1.4'
                }}
                className="px-4 py-1.5 min-h-[30px] rounded-full text-xs font-black shadow-md border flex items-center gap-2 animate-fadeIn"
              >
                <span>Over {activeTooltipOver.overIndex}</span>
                <span style={{ color: 'var(--muted)' }}>•</span>
                <span style={{ color: 'var(--blue)' }}>{activeTooltipOver.runs} runs</span>
                {activeTooltipOver.wickets > 0 && (
                  <>
                    <span style={{ color: 'var(--muted)' }}>•</span>
                    <span style={{ color: 'var(--red)' }}>
                      {activeTooltipOver.wickets} {activeTooltipOver.wickets === 1 ? 'wicket' : 'wickets'}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <span className="text-[11px] font-medium leading-normal" style={{ color: 'var(--muted)' }}>
                Tap any over bar to view ball details
              </span>
            )}
          </div>

          {/* Over-by-Over Bar Chart Grid */}
          <div className="relative w-full h-56 pt-2 pb-6 px-1 flex">
            {/* Y-Axis scale numbers & dashed horizontal grid lines */}
            <div className="w-8 shrink-0 flex flex-col justify-between items-end pr-1.5 text-[10px] font-mono select-none" style={{ color: 'var(--muted)' }}>
              {yAxisSteps.slice().reverse().map((stepVal, idx) => (
                <span key={idx}>{Math.round(stepVal)}</span>
              ))}
            </div>

            {/* Plot Area */}
            <div className="relative flex-1 h-full flex items-end">
              {/* Horizontal dashed grid lines across the plot */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {yAxisSteps.slice().reverse().map((_, idx) => (
                  <div
                    key={idx}
                    style={{ borderColor: 'var(--border)' }}
                    className="w-full border-b border-dashed"
                  />
                ))}
              </div>

              {/* Dotted CRR Line with CRR badge on the right (matching Image 2) */}
              {crrValue > 0 && crrValue <= yAxisMax && (
                <div
                  style={{
                    bottom: `${Math.min(95, Math.max(5, (crrValue / yAxisMax) * 100))}%`
                  }}
                  className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                >
                  <div
                    style={{ borderColor: 'var(--primary)' }}
                    className="flex-1 border-b-2 border-dotted opacity-75"
                  />
                  <div
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: '#FFFFFF'
                    }}
                    className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shadow-sm ml-1 shrink-0"
                  >
                    CRR {crrValue.toFixed(1)}
                  </div>
                </div>
              )}

              {/* Over Bars (responsive: 10 overs on mobile or all overs on desktop) */}
              <div className="relative z-10 w-full h-full flex items-end justify-between gap-1 sm:gap-2">
                {filteredOvers.map((ov) => {
                  const runs = ov.runs || 0;
                  const heightPercent = ov.hasData
                    ? Math.min(100, Math.max(8, Math.round((runs / yAxisMax) * 100)))
                    : 0;

                  const hasWicket = ov.wickets > 0;
                  const isSelected = selectedOver === ov.overIndex;

                  // Color semantics matching user prompt:
                  // Normal over: --purple in light / --green in dark
                  // 10+ runs: --blue
                  // Wicket over: --red
                  let barBg = 'var(--purple)';
                  if (hasWicket) {
                    barBg = 'var(--red)';
                  } else if (runs >= 10) {
                    barBg = 'var(--blue)';
                  }

                  return (
                    <div
                      key={ov.overIndex}
                      onClick={() => ov.hasData && setSelectedOver(ov.overIndex)}
                      className={`flex-1 flex flex-col items-center justify-end h-full cursor-pointer transition-all ${
                        ov.hasData ? 'hover:opacity-90 active:scale-95' : 'opacity-20'
                      }`}
                      style={{
                        minWidth: '18px'
                      }}
                    >
                      {/* Runs number & Wicket circle indicator above bar */}
                      {ov.hasData && (
                        <div className="flex flex-col items-center gap-0.5 mb-1 select-none">
                          {hasWicket && (
                            <div
                              style={{ backgroundColor: 'var(--red)', color: '#FFFFFF' }}
                              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shadow-sm"
                              title={`${ov.wickets} wicket in this over`}
                            >
                              W
                            </div>
                          )}
                          <span
                            className="text-[10px] font-black transition-colors"
                            style={{
                              color: isSelected ? 'var(--primary)' : 'var(--text)'
                            }}
                          >
                            {runs}
                          </span>
                        </div>
                      )}

                      {/* Bar Pillar */}
                      <div
                        style={{
                          height: `${heightPercent}%`,
                          backgroundColor: barBg,
                          borderColor: isSelected ? 'var(--text)' : 'transparent'
                        }}
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          isSelected ? 'border-2 shadow-lg scale-x-105' : ''
                        }`}
                      />

                      {/* X-axis Over Number */}
                      <span
                        className="text-[10px] font-mono mt-1 font-bold select-none"
                        style={{
                          color: isSelected ? 'var(--primary)' : 'var(--muted)'
                        }}
                      >
                        {ov.overIndex}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Centered "Over" Label */}
          <div className="text-center text-[10px] font-bold uppercase tracking-widest -mt-2" style={{ color: 'var(--muted)' }}>
            Over
          </div>

          {/* Bar Chart Legend */}
          <div
            style={{ borderColor: 'var(--border)' }}
            className="flex items-center justify-center gap-4 text-xs font-semibold pt-2 border-t"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--purple)' }} />
              <span style={{ color: 'var(--muted)' }} className="text-[11px]">Normal Over</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--blue)' }} />
              <span style={{ color: 'var(--muted)' }} className="text-[11px]">10+ Runs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--red)' }} />
              <span style={{ color: 'var(--muted)' }} className="text-[11px]">Wicket Over</span>
            </div>
          </div>

          {/* 3 Summary Stat Cards (Matching Image 2: Best Over, Avg, Total) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
            {/* Best Over */}
            <div
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)'
              }}
              className="p-3 rounded-2xl border text-center flex flex-col justify-center"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Best Over
              </span>
              <div className="text-lg sm:text-xl font-black flex items-center justify-center gap-1 mt-0.5" style={{ color: 'var(--text)' }}>
                <span>{bestOverRuns}</span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 inline" />
              </div>
              {bestOverNumber && (
                <span className="text-[10px] font-bold" style={{ color: 'var(--orange)' }}>
                  Over {bestOverNumber}
                </span>
              )}
            </div>

            {/* Average */}
            <div
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)'
              }}
              className="p-3 rounded-2xl border text-center flex flex-col justify-center"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Avg
              </span>
              <div className="text-lg sm:text-xl font-black mt-0.5" style={{ color: 'var(--text)' }}>
                {avgRunsPerOver}
              </div>
            </div>

            {/* Total */}
            <div
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)'
              }}
              className="p-3 rounded-2xl border text-center flex flex-col justify-center"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Total
              </span>
              <div className="text-lg sm:text-xl font-black mt-0.5" style={{ color: 'var(--orange)' }}>
                {currentInn.score}/{currentInn.wickets}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. WORM / LINE CHART MODE (MATCHING REFERENCE IMAGE 1) */}
      {/* ============================================================ */}
      {activeChart === 'worm' && (
        <div className="flex flex-col gap-2">
          {/* Interactive Tooltip shown parallel to X-Axis */}
          <div className="min-h-[36px] py-1 flex items-center justify-center my-1">
            {activeWormPoint ? (
              <div
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  lineHeight: '1.4'
                }}
                className="px-4 py-1.5 min-h-[30px] rounded-full text-xs font-black shadow-md border flex items-center gap-2"
              >
                <span>Over {activeWormPoint.over}</span>
                <span style={{ color: 'var(--muted)' }}>•</span>
                <span style={{ color: 'var(--red)' }}>
                  {activeWormPoint.score}/{activeWormPoint.wickets}
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-medium leading-normal" style={{ color: 'var(--muted)' }}>
                Tap any over node to view cumulative score
              </span>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${wormSvgWidth} ${wormSvgHeight}`}
              className="w-full h-56 select-none overflow-visible"
            >
              <defs>
                {/* Gradient for Team Alpha (Coral / Red) */}
                <linearGradient id={`${chartId}-grad1`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--red)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--red)" stopOpacity="0.0" />
                </linearGradient>

                {/* Gradient for Team Bravo (Blue / Slate) */}
                <linearGradient id={`${chartId}-grad2`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--blue)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--blue)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines and Y-axis labels */}
              {wormYSteps.map((stepVal, idx) => {
                const y = getWormY(stepVal);
                return (
                  <g key={`worm-grid-${idx}`}>
                    <line
                      x1={wormPad.left}
                      y1={y}
                      x2={wormSvgWidth - wormPad.right}
                      y2={y}
                      stroke="var(--border)"
                      strokeDasharray="3,3"
                      strokeWidth="1"
                    />
                    <text
                      x={wormPad.left - 6}
                      y={y + 3.5}
                      textAnchor="end"
                      fill="var(--muted)"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {stepVal}
                    </text>
                  </g>
                );
              })}

              {/* Target Line if chasing - placed above line on the left */}
              {matchState?.target && (
                <g>
                  <line
                    x1={wormPad.left}
                    y1={getWormY(matchState.target)}
                    x2={wormSvgWidth - wormPad.right}
                    y2={getWormY(matchState.target)}
                    stroke="var(--orange)"
                    strokeOpacity="0.4"
                    opacity="0.4"
                    strokeDasharray="4,4"
                    strokeWidth="1.5"
                  />
                  <text
                    x={wormPad.left + 6}
                    y={getWormY(matchState.target) - 6}
                    textAnchor="start"
                    fill="var(--orange)"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    Target {matchState.target}
                  </text>
                </g>
              )}

              {/* X-Axis labels (Overs 1 to totalMatchOvers) */}
              <text x={wormPad.left} y={wormSvgHeight - 12} fill="var(--muted)" fontSize="9" fontWeight="bold">
                Overs
              </text>
              {Array.from({ length: totalMatchOvers }, (_, i) => i + 1).map((ov) => {
                const x = getWormX(ov);
                return (
                  <text
                    key={`ov-label-${ov}`}
                    x={x}
                    y={wormSvgHeight - 12}
                    textAnchor="middle"
                    fill={selectedWormOver === ov ? 'var(--primary)' : 'var(--muted)'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight={selectedWormOver === ov ? 'bold' : 'normal'}
                  >
                    {ov}
                  </text>
                );
              })}

              {/* Team Alpha Area Fill */}
              {areaPath1 && (
                <path d={areaPath1} fill={`url(#${chartId}-grad1)`} />
              )}

              {/* Team Bravo Area Fill */}
              {areaPath2 && (
                <path d={areaPath2} fill={`url(#${chartId}-grad2)`} />
              )}

              {/* Team Alpha Smooth Bézier Line */}
              {linePath1 && (
                <path
                  d={linePath1}
                  fill="none"
                  stroke="var(--red)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Team Bravo Smooth Bézier Line */}
              {linePath2 && (
                <path
                  d={linePath2}
                  fill="none"
                  stroke="var(--blue)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Team Alpha Node Markers & Wicket Badges */}
              {lineData1.map((p, idx) => {
                if (p.over === 0) return null;
                const cx = getWormX(p.over);
                const cy = getWormY(p.score);
                const isWicketOver = (stats1.overSummaries.find(o => o.overIndex === Math.round(p.over))?.wickets || 0) > 0;

                return (
                  <g
                    key={`inn1-pt-${idx}`}
                    className="cursor-pointer"
                    onClick={() => setSelectedWormOver(Math.round(p.over))}
                  >
                    {isWicketOver ? (
                      <g>
                        <circle cx={cx} cy={cy} r="7" fill="var(--red)" stroke="#FFFFFF" strokeWidth="1.5" />
                        <text cx={cx} cy={cy} x={cx} y={cy + 3} textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="black">
                          W
                        </text>
                      </g>
                    ) : (
                      <circle cx={cx} cy={cy} r="3" fill="#FFFFFF" stroke="var(--red)" strokeWidth="2" />
                    )}
                  </g>
                );
              })}

              {/* Team Bravo Node Markers */}
              {lineData2.map((p, idx) => {
                if (p.over === 0) return null;
                const cx = getWormX(p.over);
                const cy = getWormY(p.score);
                const isWicketOver = (stats2?.overSummaries.find(o => o.overIndex === Math.round(p.over))?.wickets || 0) > 0;

                return (
                  <g
                    key={`inn2-pt-${idx}`}
                    className="cursor-pointer"
                    onClick={() => setSelectedWormOver(Math.round(p.over))}
                  >
                    {isWicketOver ? (
                      <g>
                        <circle cx={cx} cy={cy} r="7" fill="var(--red)" stroke="#FFFFFF" strokeWidth="1.5" />
                        <text cx={cx} cy={cy} x={cx} y={cy + 3} textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="black">
                          W
                        </text>
                      </g>
                    ) : (
                      <circle cx={cx} cy={cy} r="3" fill="#FFFFFF" stroke="var(--blue)" strokeWidth="2" />
                    )}
                  </g>
                );
              })}

              {/* End of Innings Labels with 12px offset */}
              {lineData1.length > 1 && (() => {
                const pt1 = lineData1[lineData1.length - 1];
                return (
                  <text
                    x={getWormX(pt1.over) + 12}
                    y={getWormY(pt1.score) - 4}
                    fill="var(--text)"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    End
                  </text>
                );
              })()}

              {lineData2.length > 1 && (() => {
                const pt2 = lineData2[lineData2.length - 1];
                return (
                  <text
                    x={getWormX(pt2.over) + 12}
                    y={getWormY(pt2.score) + 11}
                    fill="var(--blue)"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    {inn2?.battingTeam || 'Team Bravo'}
                  </text>
                );
              })()}
            </svg>
          </div>

          {/* Line Chart Footer Legend (Matching Image 1) */}
          <div
            style={{ borderColor: 'var(--border)' }}
            className="flex items-center justify-between text-xs pt-2 border-t"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--red)' }} />
                <span style={{ color: 'var(--text)' }}>{inn1.battingTeam || 'Team Alpha'}</span>
              </div>
              {inn2 && (
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--blue)' }} />
                  <span style={{ color: 'var(--text)' }}>{inn2.battingTeam || 'Team Bravo'}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-right">
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--muted)' }}>CRR</span>
                <span className="font-black text-xs" style={{ color: 'var(--text)' }}>{crrValue.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-[10px] block" style={{ color: 'var(--muted)' }}>Projected</span>
                <span className="font-black text-xs" style={{ color: 'var(--text)' }}>
                  {Math.round(crrValue * totalMatchOvers)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
