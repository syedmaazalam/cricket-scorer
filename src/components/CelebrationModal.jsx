import React, { useEffect, useRef, useState } from 'react';
import { Trophy, FileText, FileSpreadsheet, X, Sparkles } from 'lucide-react';
import { formatOvers, getMaxWickets } from '../engine/rules.js';

export default function CelebrationModal({
  matchState,
  onOpenScorecard,
  onOpenSummary,
  onClose
}) {
  const canvasRef = useRef(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const isCompleted = matchState?.status === 'completed' || Boolean(matchState?.winner);

  // Confetti particles physics canvas
  useEffect(() => {
    if (!isCompleted || isDismissed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = ['#22C55E', '#16A34A', '#86EFAC', '#4ADE80', '#F8FAFC', '#94A3B8'];

    const particles = Array.from({ length: 110 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.4 - height * 0.2,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 3.5 + 2.5,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 6,
      shape: Math.random() > 0.4 ? 'rect' : 'circle'
    }));

    let startTime = Date.now();

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRotation;

        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (Date.now() - startTime < 12000) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isCompleted, isDismissed]);

  if (!isCompleted || isDismissed) return null;

  const inn1 = matchState.innings?.[0] || { score: 0, wickets: 0, legalBalls: 0, battingTeam: 'Team 1' };
  const inn2 = matchState.innings?.[1] || { score: 0, wickets: 0, legalBalls: 0, battingTeam: 'Team 2' };
  const maxWickets = getMaxWickets(matchState.playersPerTeam);
  const totalBalls = (matchState.overs || 20) * 6;
  const winner = matchState.winner || 'Winner';
  const isTie = winner === 'Tie' || matchState.resultSummary?.toLowerCase().includes('tie');

  // Victory calculation details
  let detailMessage = matchState.resultSummary || '';
  let subDetails = '';

  if (isTie) {
    detailMessage = 'Match Tied';
    subDetails = `${inn1.battingTeam}: ${inn1.score}/${inn1.wickets} vs ${inn2.battingTeam}: ${inn2.score}/${inn2.wickets}`;
  } else if (winner === inn2.battingTeam) {
    const wicketsRemaining = Math.max(0, maxWickets - inn2.wickets);
    const ballsRemaining = Math.max(0, totalBalls - inn2.legalBalls);
    detailMessage = `${winner} won the match`;
    subDetails = `${winner} reached the target of ${matchState.target} in ${formatOvers(inn2.legalBalls)} overs with ${ballsRemaining} ball${ballsRemaining === 1 ? '' : 's'} to spare (won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'})`;
  } else {
    const runDiff = inn1.score - inn2.score;
    detailMessage = `${winner} won the match`;
    subDetails = `${winner} successfully defended ${inn1.score} runs (won by ${runDiff} run${runDiff === 1 ? '' : 's'})`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10" />

      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="relative z-20 w-full max-w-md rounded-xl border p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center gap-3.5 animate-in zoom-in-95 duration-200"
      >
        <button
          onClick={() => {
            setIsDismissed(true);
            onClose?.();
          }}
          style={{ backgroundColor: 'var(--card-alt)', color: 'var(--muted)' }}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:brightness-110 transition-all"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Trophy icon */}
        <div
          style={{
            backgroundColor: 'var(--green-15)',
            borderColor: 'var(--green-30)',
            color: 'var(--primary)'
          }}
          className="w-16 h-16 rounded-xl border flex items-center justify-center shadow-lg text-primary animate-bounce"
        >
          <Trophy className="w-8 h-8 text-green-500" />
        </div>

        {/* Header Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>MATCH COMPLETED</span>
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        {/* Celebration Title */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            {detailMessage}
          </h2>
          <p className="text-xs sm:text-sm font-medium max-w-sm" style={{ color: 'var(--muted)' }}>
            {subDetails}
          </p>
        </div>

        {/* Both Innings Score Pill */}
        <div
          style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
          className="w-full rounded-xl border p-2.5 flex items-center justify-around text-xs font-semibold"
        >
          <div className="flex flex-col">
            <span style={{ color: 'var(--muted)' }} className="text-[10px] uppercase font-medium">{inn1.battingTeam}</span>
            <span style={{ color: 'var(--text)' }} className="text-sm font-bold font-mono">
              {inn1.score}/{inn1.wickets} <span className="text-[10px] font-normal" style={{ color: 'var(--muted)' }}>({formatOvers(inn1.legalBalls)})</span>
            </span>
          </div>
          <span style={{ color: 'var(--border)' }} className="text-sm font-bold">vs</span>
          <div className="flex flex-col">
            <span style={{ color: 'var(--muted)' }} className="text-[10px] uppercase font-medium">{inn2.battingTeam}</span>
            <span style={{ color: 'var(--text)' }} className="text-sm font-bold font-mono">
              {inn2.score}/{inn2.wickets} <span className="text-[10px] font-normal" style={{ color: 'var(--muted)' }}>({formatOvers(inn2.legalBalls)})</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-2 pt-1">
          {onOpenScorecard && (
            <button
              onClick={() => {
                setIsDismissed(true);
                onOpenScorecard(matchState);
              }}
              style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Full Scorecard</span>
            </button>
          )}

          {onOpenSummary && (
            <button
              onClick={() => {
                setIsDismissed(true);
                onOpenSummary(matchState);
              }}
              style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--text)' }}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-xs border flex items-center justify-center gap-1.5 hover:border-[var(--primary)] active:scale-95 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              <span>Match Summary</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
