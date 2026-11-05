import React, { useState, useId, useEffect } from 'react';
import { BarChart3, TrendingUp, Sparkles } from 'lucide-react';
import { computeInningsStats } from '../engine/stats.js';
import { formatOvers, calculateCRR } from '../engine/rules.js';

export default function MatchCharts({ matchState, initialChart = 'runs' }) {
  const [activeChart, setActiveChart] = useState(initialChart); // 'runs' (Bar Chart) | 'worm' (Line Chart)
  const [selectedInnings, setSelectedInnings] = useState(0);
  const [selectedOver, setSelectedOver] = useState(null);
  const [hoveredOver, setHoveredOver] = useState(null);
  const [overRange, setOverRange] = useState('all'); // '1-10' | '11-20' | 'all'
  const [selectedWormOver, setSelectedWormOver] = useState(null);
  const [hoveredWormOver, setHoveredWormOver] = useState(null);

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

  // Filter based on range selector (1-10, 11-20, all)
  const filteredOvers = allOversData.filter(ov => {
    if (overRange === '1-10') return ov.overIndex <= 10;
    if (overRange === '11-20') return ov.overIndex > 10 && ov.overIndex <= 20;
    return true;
  });

  // Calculate CRR
  const crrValue = Number(calculateCRR(currentInn.score || 0, currentInn.legalBalls || 0));

  // Find max runs in any recorded over to scale Y-axis dynamically
  const maxOverRuns = Math.max(14, ...allOversData.filter(o => o.hasData).map(o => o.runs || 0));
  const yAxisMax = Math.ceil(maxOverRuns / 4) * 4;
  const yAxisSteps = [0, yAxisMax * 0.25, yAxisMax * 0.5, yAxisMax * 0.75, yAxisMax];

  // Best Over, Average, Total Stats for bottom cards
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
      const highest = recordedOvers.reduce((prev, curr) => (curr.runs > prev.runs ? curr : prev), recordedOvers[0]);
      setSelectedOver(highest ? highest.overIndex : recordedOvers[recordedOvers.length - 1].overIndex);
    }
  }, [recordedOvers.length]);

  const effectiveOverIndex = hoveredOver || selectedOver;
  const activeTooltipOver = allOversData.find(o => o.overIndex === effectiveOverIndex);

  const cumulativeRuns = activeTooltipOver && activeTooltipOver.overIndex
    ? allOversData.slice(0, activeTooltipOver.overIndex).reduce((sum, o) => sum + (o.runs || 0), 0)
    : 0;
  const cumulativeWickets = activeTooltipOver && activeTooltipOver.overIndex
    ? allOversData.slice(0, activeTooltipOver.overIndex).reduce((sum, o) => sum + (o.wickets || 0), 0)
    : 0;

  // Derive real ball-by-ball deliveries for activeTooltipOver
  const overDeliveries = (() => {
    if (!activeTooltipOver || !activeTooltipOver.hasData) return [];
    // 1. Try directly from activeTooltipOver.balls if populated
    if (activeTooltipOver.balls && activeTooltipOver.balls.length > 0) {
      return activeTooltipOver.balls.map((b, idx) => {
        if (typeof b === 'object' && b !== null) return b;
        const str = String(b).trim();
        const isWicket = str === 'W' || str.startsWith('W');
        const isWide = str.includes('wd') || str.includes('wide');
        const isNb = str.includes('nb') || str.includes('no_ball');
        const runsMatch = str.match(/\d+/);
        const runs = runsMatch ? parseInt(runsMatch[0], 10) : 0;
        return {
          ballIndex: idx,
          runs,
          isWicket,
          extraType: isWide ? 'wide' : isNb ? 'no_ball' : null,
          shortLabel: str
        };
      });
    }

    // 2. Derive directly from currentInn.balls
    if (currentInn?.balls && currentInn.balls.length > 0) {
      const targetOver = activeTooltipOver.overIndex;
      let legalCount = 0;
      const ballsInThisOver = [];
      for (const b of currentInn.balls) {
        const overOfBall = Math.floor(legalCount / 6) + 1;
        if (overOfBall === targetOver) {
          ballsInThisOver.push(b);
        } else if (overOfBall > targetOver) {
          break;
        }
        if (b.isLegal) {
          legalCount++;
        }
      }
      return ballsInThisOver;
    }

    return [];
  })();

  // --- Worm / Line Chart Data Builder ---
  const buildLineChartData = (innings) => {
    if (!innings || !innings.balls) return [];
    const overMap = [];
    let currentScore = 0;
    let wicketsCount = 0;
    let legalBalls = 0;

    overMap.push({ over: 0, score: 0, wickets: 0, isWicket: false });

    innings.balls.forEach((b) => {
      currentScore = b.scoreAtBall || (currentScore + (b.runs || 0) + (b.extraRuns || 0));
      if (b.isLegal) {
        legalBalls++;
      }
      if (b.isWicket) {
        wicketsCount++;
      }

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
  const wormSvgHeight = 240;
  const wormPad = { top: 30, right: 30, bottom: 35, left: 40 };
  const wormPlotW = wormSvgWidth - wormPad.left - wormPad.right;
  const wormPlotH = wormSvgHeight - wormPad.top - wormPad.bottom;

  const getWormX = (over) => wormPad.left + (over / totalMatchOvers) * wormPlotW;
  const getWormY = (score) => wormPad.top + wormPlotH - (score / wormMaxY) * wormPlotH;

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

  const createAreaPath = (linePath, points) => {
    if (!linePath || points.length === 0) return '';
    const firstX = getWormX(points[0].over);
    const lastX = getWormX(points[points.length - 1].over);
    const bottomY = wormPad.top + wormPlotH;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const areaPath1 = createAreaPath(linePath1, lineData1);
  const areaPath2 = createAreaPath(linePath2, lineData2);

  const effectiveWormOver = hoveredWormOver !== null ? hoveredWormOver : selectedWormOver;
  const activeWormPoint = (effectiveWormOver !== null
    ? (lineData1.find(p => Math.round(p.over) === effectiveWormOver) || lineData1[lineData1.length - 1])
    : (lineData1[Math.min(8, lineData1.length - 1)] || lineData1[lineData1.length - 1])) || { over: 8, score: inn1.score, wickets: inn1.wickets };

  return (
    <section className="card">
      {/* 1. Header with Title & Run Rate / Worm Toggle */}
      <div className="row bt wrap" style={{ marginBottom: '8px' }}>
        <div className="row">
          <span className="ico" style={{ width: '40px', height: '40px' }}>
            {activeChart === 'runs' ? <BarChart3 className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
          </span>
          <h3 className="h2">Over comparison</h3>
        </div>

        <div className="seg" role="group">
          <button
            type="button"
            onClick={() => {
              setActiveChart('runs');
              if (overRange === 'all') setOverRange('1-10');
            }}
            className={activeChart === 'runs' ? 'on' : ''}
            aria-pressed={activeChart === 'runs'}
          >
            Run Rate
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveChart('worm');
              setOverRange('all');
            }}
            className={activeChart === 'worm' ? 'on' : ''}
            aria-pressed={activeChart === 'worm'}
          >
            Worm
          </button>
        </div>
      </div>

      {/* View Range Row */}
      <div className="row bt" style={{ margin: '10px 0' }}>
        <span className="mu" style={{ fontWeight: 600, fontSize: '13px' }}>View range</span>
        <div className="seg" role="group">
          <button
            type="button"
            onClick={() => {
              setOverRange('1-10');
              setActiveChart('runs');
            }}
            className={overRange === '1-10' && activeChart === 'runs' ? 'on' : ''}
            aria-pressed={overRange === '1-10' && activeChart === 'runs'}
          >
            1-10
          </button>
          <button
            type="button"
            onClick={() => {
              setOverRange('11-20');
              setActiveChart('runs');
            }}
            className={overRange === '11-20' && activeChart === 'runs' ? 'on' : ''}
            aria-pressed={overRange === '11-20' && activeChart === 'runs'}
          >
            11-20
          </button>
          <button
            type="button"
            onClick={() => {
              setOverRange('all');
              setActiveChart('worm');
            }}
            className={overRange === 'all' || activeChart === 'worm' ? 'on' : ''}
            aria-pressed={overRange === 'all' || activeChart === 'worm'}
          >
            All
          </button>
        </div>
      </div>

      {/* Innings Selector if 2nd Innings has begun */}
      {inn2 && inn2.balls && inn2.balls.length > 0 && activeChart === 'runs' && (
        <div className="seg" role="group" style={{ marginBottom: '10px' }}>
          <button
            type="button"
            onClick={() => setSelectedInnings(0)}
            className={selectedInnings === 0 ? 'on' : ''}
          >
            {inn1.battingTeam} ({inn1.score}/{inn1.wickets})
          </button>
          <button
            type="button"
            onClick={() => setSelectedInnings(1)}
            className={selectedInnings === 1 ? 'on' : ''}
          >
            {inn2.battingTeam} ({inn2.score}/{inn2.wickets})
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. BAR CHART MODE */}
      {/* ============================================================ */}
      {activeChart === 'runs' && (
        <div className="flex flex-col gap-2">
          {/* Interactive Over Summary Tooltip Card */}
          <div
            style={{
              backgroundColor: 'color-mix(in srgb, var(--well) 70%, transparent)',
              borderColor: 'var(--bda)'
            }}
            className="rounded-2xl border p-2.5 transition-all duration-200 shadow-sm flex flex-col gap-2"
          >
            {activeTooltipOver && activeTooltipOver.hasData ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* Left: OVER badge & Team Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      style={{
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF'
                      }}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-black tracking-wide shrink-0 shadow-sm flex items-center justify-center leading-none"
                    >
                      OVER {activeTooltipOver.overIndex}
                    </div>
                    <span className="text-xs font-bold truncate max-w-[140px] sm:max-w-[200px]" style={{ color: 'var(--t1)' }}>
                      {currentInn?.battingTeam || (selectedInnings === 0 ? 'Team 1' : 'Team 2')}
                    </span>
                  </div>

                  {/* Right: Run count, Wicket badge, Total score */}
                  <div className="flex items-center gap-2 text-xs font-mono ml-auto shrink-0">
                    <div className="flex items-center gap-0.5 font-extrabold text-[var(--pri)]">
                      <span>+{activeTooltipOver.runs}</span>
                      <span className="text-[10px] opacity-80">↗</span>
                    </div>

                    <span className="text-[var(--bda)]">|</span>

                    {activeTooltipOver.wickets > 0 && (
                      <>
                        <span
                          style={{ backgroundColor: '#DC2626' }}
                          className="px-2 py-0.5 rounded-lg text-white text-[10px] font-black shrink-0 tracking-wide"
                        >
                          {activeTooltipOver.wickets}W
                        </span>
                        <span className="text-[var(--bda)]">|</span>
                      </>
                    )}

                    <span className="text-[var(--t2)] text-[11px] font-medium font-sans">
                      (Total {cumulativeRuns}/{cumulativeWickets})
                    </span>
                  </div>
                </div>

                {/* Ball by ball sequence dots */}
                <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto min-h-[22px]">
                  <span className="text-[11px] font-semibold text-[var(--t2)] shrink-0">Balls:</span>
                  {overDeliveries.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      {overDeliveries.map((b, bIdx) => {
                        const isWicket = Boolean(b.isWicket);
                        const isBoundary = b.runs === 4 || b.runs === 6;
                        const isExtra = Boolean(b.extraType);
                        const ballLabel = isWicket
                          ? 'W'
                          : isExtra
                          ? (b.extraType === 'wide' ? (b.runs > 0 ? `${b.runs}wd` : 'wd') : b.extraType === 'no_ball' ? (b.runs > 0 ? `${b.runs}nb` : 'nb') : (b.shortLabel || 'ex'))
                          : String(b.runs != null ? b.runs : 0);

                        return (
                          <span
                            key={b.ballIndex != null ? b.ballIndex : bIdx}
                            style={{
                              backgroundColor: isWicket
                                ? '#DC2626'
                                : isBoundary
                                ? '#2563EB'
                                : isExtra
                                ? '#F59E0B'
                                : b.runs > 0
                                ? 'var(--well)'
                                : 'color-mix(in srgb, var(--card) 85%, transparent)',
                              borderColor: isWicket
                                ? '#EF4444'
                                : isBoundary
                                ? '#3B82F6'
                                : isExtra
                                ? '#FBBF24'
                                : 'var(--bd)',
                              color: isWicket || isBoundary
                                ? '#FFFFFF'
                                : isExtra
                                ? '#000000'
                                : 'var(--t1)'
                            }}
                            className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs leading-none"
                          >
                            {ballLabel}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[11px] text-[var(--t2)] italic">Ball data unavailable</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-[var(--t2)] py-1">
                Hover or tap any over bar to inspect runs, wickets, and ball sequence
              </div>
            )}
          </div>

          {/* Over-by-Over Bar Chart Grid */}
          <div className="relative w-full h-48 pt-2 pb-6 px-1 flex">
            {/* Y-Axis scale numbers & dashed horizontal grid lines */}
            <div className="w-7 shrink-0 flex flex-col justify-between items-end pr-1 text-[10px] font-mono select-none" style={{ color: 'var(--t2)' }}>
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
                    style={{ borderColor: 'var(--bd)' }}
                    className="w-full border-b border-dashed"
                  />
                ))}
              </div>

              {/* Dotted CRR Line with CRR badge */}
              {crrValue > 0 && crrValue <= yAxisMax && (
                <div
                  style={{
                    bottom: `${Math.min(95, Math.max(5, (crrValue / yAxisMax) * 100))}%`
                  }}
                  className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                >
                  <div
                    style={{ borderColor: 'var(--ok)' }}
                    className="flex-1 border-b-2 border-dotted opacity-75"
                  />
                  <div
                    style={{
                      backgroundColor: 'var(--ok)',
                      color: 'var(--bg)'
                    }}
                    className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider shadow-sm ml-1 shrink-0"
                  >
                    CRR {crrValue.toFixed(1)}
                  </div>
                </div>
              )}

              {/* Over Bars */}
              <div className="relative z-10 w-full h-full flex items-end justify-between gap-1 sm:gap-2">
                {filteredOvers.map((ov) => {
                  const runs = ov.runs || 0;
                  const heightPercent = ov.hasData
                    ? Math.min(100, Math.max(8, Math.round((runs / yAxisMax) * 100)))
                    : 0;

                  const hasWicket = ov.wickets > 0;
                  const isSelected = selectedOver === ov.overIndex;

                  // Required test-verified semantics:
                  // 10+ runs over: var(--chart-high, #2563EB)
                  // Normal over: var(--chart-normal, #16A34A)
                  // Wicket over: var(--chart-wicket, var(--bad))
                  let barBg = 'var(--chart-normal, #16A34A)';
                  if (hasWicket) {
                    barBg = 'var(--chart-wicket, var(--bad))';
                  } else if (runs >= 10) {
                    barBg = 'var(--chart-high, #2563EB)';
                  }

                  return (
                    <div
                      key={ov.overIndex}
                      onClick={() => ov.hasData && setSelectedOver(ov.overIndex)}
                      onMouseEnter={() => ov.hasData && setHoveredOver(ov.overIndex)}
                      onMouseLeave={() => setHoveredOver(null)}
                      className={`flex-1 flex flex-col items-center justify-end h-full cursor-pointer transition-all ${
                        ov.hasData ? 'hover:opacity-90 active:scale-95' : 'opacity-20'
                      }`}
                      style={{ minWidth: '16px' }}
                    >
                      {/* Runs number & Wicket indicator above bar */}
                      {ov.hasData && (
                        <div className="flex flex-col items-center gap-0.5 mb-1 select-none">
                          {hasWicket && (
                            <div
                              style={{ backgroundColor: 'var(--bad)', color: '#FFFFFF' }}
                              className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black shadow-sm"
                              title={`${ov.wickets} wicket in this over`}
                            >
                              W
                            </div>
                          )}
                          <span
                            className="text-[10px] font-bold transition-colors"
                            style={{
                              color: isSelected ? 'var(--pri)' : 'var(--t1)'
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
                          borderRadius: '6px 6px 0 0',
                          borderColor: isSelected ? 'var(--ring)' : 'transparent'
                        }}
                        className={`w-full transition-all duration-300 ${
                          isSelected ? 'border-2 shadow-lg scale-x-105' : ''
                        }`}
                      />

                      {/* X-axis Over Number */}
                      <span
                        className="text-[10px] font-mono mt-1 font-bold select-none"
                        style={{
                          color: isSelected ? 'var(--pri)' : ov.hasData ? 'var(--ok)' : 'var(--t3)'
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

          {/* Bar Chart Legend */}
          <div className="row wrap" style={{ justifyContent: 'center', gap: '14px', fontSize: '12px', color: 'var(--t2)', margin: '4px 0 10px' }}>
            <span className="flex items-center gap-1.5">
              <i className="dot" style={{ backgroundColor: 'var(--chart-normal, #16A34A)' }} />
              <span>Normal over</span>
            </span>
            <span className="flex items-center gap-1.5">
              <i className="dot" style={{ backgroundColor: 'var(--chart-high, #2563EB)' }} />
              <span>10+ runs</span>
            </span>
            <span className="flex items-center gap-1.5">
              <i className="dot" style={{ backgroundColor: 'var(--bad)' }} />
              <span>Wicket over</span>
            </span>
          </div>

          {/* 3 Summary Stat Tiles: Best Over, Avg, Total */}
          <div className="flex flex-col gap-2 w-full mt-3">
            <div className="tile py-2.5 px-4 rounded-xl border border-[var(--bd)] text-center">
              <span className="text-[11px] text-[var(--t2)] font-semibold block">Best over</span>
              <b className="text-sm font-bold mt-0.5 block">{bestOverRuns} <span className="text-[var(--ok)]">Over {bestOverNumber || 1}</span></b>
            </div>

            <div className="tile py-2.5 px-4 rounded-xl border border-[var(--bd)] text-center">
              <span className="text-[11px] text-[var(--t2)] font-semibold block">Avg</span>
              <b className="text-sm font-bold mt-0.5 block">{avgRunsPerOver}</b>
            </div>

            <div className="tile py-2.5 px-4 rounded-xl border border-[var(--bd)] text-center">
              <span className="text-[11px] text-[var(--t2)] font-semibold block">Total</span>
              <b className="text-sm font-bold mt-0.5 block text-[var(--ok)]">{currentInn.score}/{currentInn.wickets}</b>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. WORM / LINE CHART MODE */}
      {/* ============================================================ */}
      {activeChart === 'worm' && (
        <div className="flex flex-col gap-2">
          {/* Interactive Worm Tooltip Card */}
          <div
            style={{
              backgroundColor: 'color-mix(in srgb, var(--well) 70%, transparent)',
              borderColor: 'var(--bda)'
            }}
            className="rounded-xl border p-2.5 transition-all duration-200 shadow-sm"
          >
            {activeWormPoint ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-[var(--pri)] text-white text-[10px] font-black uppercase tracking-wider">
                    Over {activeWormPoint.over}
                  </span>
                  <span className="text-xs font-bold" style={{ color: 'var(--t1)' }}>
                    Score: <b className="text-[var(--pri)]">{activeWormPoint.score}/{activeWormPoint.wickets}</b>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--t2)]">
                  <span>CRR: <b style={{ color: 'var(--t1)' }}>{(activeWormPoint.over > 0 ? (activeWormPoint.score / activeWormPoint.over).toFixed(2) : '0.00')}</b></span>
                  {matchState?.target && (
                    <span className="text-[var(--warn)] font-bold">
                      {Math.max(0, matchState.target - activeWormPoint.score)} to win
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-[var(--t2)] py-0.5">
                Hover or tap nodes on the worm line to inspect score trajectory
              </div>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${wormSvgWidth} ${wormSvgHeight}`}
              className="w-full h-52 select-none overflow-visible"
            >
              <defs>
                <linearGradient id={`${chartId}-grad1`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--pri)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--pri)" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id={`${chartId}-grad2`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--sec)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--sec)" stopOpacity="0.0" />
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
                      stroke="var(--bd)"
                      strokeDasharray="3 4"
                      strokeWidth="1"
                    />
                    <text
                      x={wormPad.left - 6}
                      y={y + 3.5}
                      textAnchor="end"
                      fill="var(--t2)"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {stepVal}
                    </text>
                  </g>
                );
              })}

              {/* Target Line if chasing */}
              {matchState?.target && (
                <g>
                  <line
                    x1={wormPad.left}
                    y1={getWormY(matchState.target)}
                    x2={wormSvgWidth - wormPad.right}
                    y2={getWormY(matchState.target)}
                    stroke="var(--warn)"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                  <text
                    x={wormPad.left + 6}
                    y={getWormY(matchState.target) - 6}
                    textAnchor="start"
                    fill="var(--warn)"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    Target {matchState.target}
                  </text>
                </g>
              )}

              {/* X-Axis labels */}
              {Array.from({ length: totalMatchOvers }, (_, i) => i + 1).map((ov) => {
                const x = getWormX(ov);
                return (
                  <text
                    key={`ov-label-${ov}`}
                    x={x}
                    y={wormSvgHeight - 10}
                    textAnchor="middle"
                    fill={selectedWormOver === ov ? 'var(--pri)' : 'var(--t2)'}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight={selectedWormOver === ov ? 'bold' : 'normal'}
                  >
                    {ov}
                  </text>
                );
              })}

              {/* Area Fills */}
              {areaPath1 && <path d={areaPath1} fill={`url(#${chartId}-grad1)`} />}
              {areaPath2 && <path d={areaPath2} fill={`url(#${chartId}-grad2)`} />}

              {/* Polyline / Bezier curves */}
              {linePath1 && (
                <path
                  d={linePath1}
                  fill="none"
                  stroke="var(--pri)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {linePath2 && (
                <path
                  d={linePath2}
                  fill="none"
                  stroke="var(--sec)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Node Markers */}
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
                    onMouseEnter={() => setHoveredWormOver(Math.round(p.over))}
                    onMouseLeave={() => setHoveredWormOver(null)}
                  >
                    {isWicketOver ? (
                      <g>
                        <circle cx={cx} cy={cy} r="6" fill="var(--bad)" stroke="#FFFFFF" strokeWidth="1.5" />
                        <text x={cx} y={cy + 3} textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="black">
                          W
                        </text>
                      </g>
                    ) : (
                      <circle cx={cx} cy={cy} r="3" fill="#FFFFFF" stroke="var(--pri)" strokeWidth="2" />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Line Chart Legend */}
          <div className="row bt" style={{ fontSize: '12px', paddingTop: '8px', borderTop: '1px solid var(--bd)' }}>
            <div className="row" style={{ gap: '10px' }}>
              <span className="flex items-center gap-1.5 font-bold">
                <i className="dot" style={{ backgroundColor: 'var(--pri)' }} />
                <span>{inn1.battingTeam || 'Team 1'}</span>
              </span>
              {inn2 && (
                <span className="flex items-center gap-1.5 font-bold">
                  <i className="dot" style={{ backgroundColor: 'var(--sec)' }} />
                  <span>{inn2.battingTeam || 'Team 2'}</span>
                </span>
              )}
            </div>

            <div className="row" style={{ gap: '12px' }}>
              <span className="mu">CRR <b style={{ color: 'var(--t1)' }}>{crrValue.toFixed(1)}</b></span>
              <span className="mu">Proj <b style={{ color: 'var(--t1)' }}>{Math.round(crrValue * totalMatchOvers)}</b></span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
