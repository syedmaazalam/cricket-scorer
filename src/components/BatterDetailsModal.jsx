import React from 'react';
import { X, TrendingUp, Target, User, Zap } from 'lucide-react';
import { computeBatterDetails } from '../engine/stats.js';

export default function BatterDetailsModal({
  batterName,
  innings,
  onClose
}) {
  if (!batterName) return null;

  const details = computeBatterDetails(innings, batterName);
  if (!details) return null;

  const { summary, headToHead, timeline } = details;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-lg max-h-[90vh] rounded-xl border shadow-2xl flex flex-col overflow-hidden transition-all"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-alt)' }}
          className="p-4 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm"
            >
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold m-0" style={{ color: 'var(--text)' }}>
                  {batterName}
                </h3>
                <span
                  style={{
                    backgroundColor: summary.isOut
                      ? 'color-mix(in srgb, var(--red) 15%, transparent)'
                      : 'color-mix(in srgb, var(--green) 15%, transparent)',
                    color: summary.isOut ? 'var(--red)' : 'var(--green)',
                    borderColor: summary.isOut
                      ? 'color-mix(in srgb, var(--red) 30%, transparent)'
                      : 'color-mix(in srgb, var(--green) 30%, transparent)'
                  }}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold border uppercase"
                >
                  {summary.isOut ? (summary.dismissal || 'Out') : 'Not Out'}
                </span>
              </div>
              <p className="text-[11px] m-0" style={{ color: 'var(--muted)' }}>
                Batter Innings Breakdown & Bowler Match-ups
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="p-2 rounded-lg border hover:opacity-80 transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Key Stat Cards Grid */}
          <div className="grid grid-cols-4 gap-2">
            <div
              style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
              className="p-2.5 rounded-lg border text-center"
            >
              <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                {summary.runs}
              </div>
              <div className="text-[10px] font-medium uppercase" style={{ color: 'var(--muted)' }}>
                Runs ({summary.balls}b)
              </div>
            </div>

            <div
              style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
              className="p-2.5 rounded-lg border text-center"
            >
              <div className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                {Math.round(summary.strikeRate || 0)}
              </div>
              <div className="text-[10px] font-medium uppercase" style={{ color: 'var(--muted)' }}>
                Strike Rate
              </div>
            </div>

            <div
              style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
              className="p-2.5 rounded-lg border text-center"
            >
              <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                {summary.fours} / {summary.sixes}
              </div>
              <div className="text-[10px] font-medium uppercase" style={{ color: 'var(--muted)' }}>
                4s / 6s
              </div>
            </div>

            <div
              style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
              className="p-2.5 rounded-lg border text-center"
            >
              <div className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                {summary.boundaryPercentage}%
              </div>
              <div className="text-[10px] font-medium uppercase" style={{ color: 'var(--muted)' }}>
                Boundary %
              </div>
            </div>
          </div>

          {/* Scoring Distribution Strip */}
          <div
            style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
            className="p-3 rounded-lg border text-xs"
          >
            <div className="flex items-center justify-between pb-2 font-medium uppercase tracking-wider text-[10px]" style={{ color: 'var(--muted)' }}>
              <span>Scoring Distribution</span>
              <span>Dots: {summary.dotCount} ({summary.dotBallPercentage}%)</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text)' }}>
              <span>Singles: <strong>{summary.singles}</strong></span>
              <span>Twos: <strong>{summary.twos}</strong></span>
              <span>Threes: <strong>{summary.threes}</strong></span>
              <span>Boundaries: <strong>{summary.fours + summary.sixes}</strong></span>
            </div>
          </div>

          {/* Head-to-Head Bowler Match-ups */}
          <div>
            <div className="flex items-center gap-1.5 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
              <Target className="w-3.5 h-3.5" />
              <span>Performance vs Particular Bowlers</span>
            </div>

            {headToHead.length === 0 ? (
              <div
                style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                className="p-3 rounded-lg border text-center text-xs"
              >
                No balls faced against any bowler yet.
              </div>
            ) : (
              <div className="space-y-2">
                {headToHead.map((h2h) => (
                  <div
                    key={h2h.bowlerName}
                    style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
                    className="p-3 rounded-lg border flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: 'var(--text)' }}>
                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                        <span>vs {h2h.bowlerName}</span>
                      </div>
                      {h2h.isDismissed ? (
                        <span
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--red) 15%, transparent)',
                            color: 'var(--red)',
                            borderColor: 'color-mix(in srgb, var(--red) 30%, transparent)'
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                        >
                          Dismissed ({h2h.dismissalType})
                        </span>
                      ) : (
                        <span
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--green) 15%, transparent)',
                            color: 'var(--green)',
                            borderColor: 'color-mix(in srgb, var(--green) 30%, transparent)'
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                        >
                          Not Dismissed
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-center text-xs pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{h2h.runs}</div>
                        <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Runs ({h2h.balls}b)</div>
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--primary)' }}>{Math.round(h2h.strikeRate || 0)}</div>
                        <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Strike Rate</div>
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>{h2h.fours} / {h2h.sixes}</div>
                        <div className="text-[10px]" style={{ color: 'var(--muted)' }}>4s / 6s</div>
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--muted)' }}>{h2h.dots}</div>
                        <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Dots Faced</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chronological Ball-by-Ball Timeline */}
          <div>
            <div className="flex items-center gap-1.5 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Innings Delivery Timeline</span>
            </div>

            {timeline.length === 0 ? (
              <div
                style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                className="p-3 rounded-lg border text-center text-xs"
              >
                No deliveries faced yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                {timeline.map((item, idx) => {
                  let badgeBg = 'var(--card-alt)';
                  let textColor = 'var(--muted)';
                  let borderColor = 'var(--border)';
                  if (item.isWicket) {
                    badgeBg = 'var(--red)';
                    textColor = '#FFFFFF';
                    borderColor = 'var(--red)';
                  } else if (item.isSix || item.isFour) {
                    badgeBg = 'var(--primary)';
                    textColor = '#FFFFFF';
                    borderColor = 'var(--primary)';
                  } else if (item.runs > 0) {
                    badgeBg = 'color-mix(in srgb, var(--primary) 20%, var(--card-alt))';
                    textColor = 'var(--text)';
                    borderColor = 'var(--primary)';
                  }

                  return (
                    <div
                      key={idx}
                      title={`Ball ${idx + 1} (Ov ${item.ballInOver}) vs ${item.bowler}: ${item.runs} run(s) • Total: ${item.cumulativeRuns}`}
                      style={{
                        backgroundColor: badgeBg,
                        color: textColor,
                        borderColor: borderColor
                      }}
                      className="w-8 h-8 rounded-lg border flex flex-col items-center justify-center text-xs font-semibold shrink-0 transition-transform hover:scale-105 cursor-pointer shadow-sm"
                    >
                      <span>{item.shortLabel}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] pt-1.5 px-1" style={{ color: 'var(--muted)' }}>
              <span>Tap ball badge for bowler & over details</span>
              <span>Total Balls: {timeline.length}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-alt)' }}
          className="p-3 border-t text-center"
        >
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF'
            }}
            className="w-full py-2.5 rounded-lg font-semibold text-xs shadow-sm active:scale-95 transition-all"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
