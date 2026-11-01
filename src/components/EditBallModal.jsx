import React, { useState, useEffect } from 'react';
import { X, Edit3, Check, AlertCircle } from 'lucide-react';
import { EXTRA_TYPES, WICKET_TYPES } from '../engine/constants.js';

export default function EditBallModal({
  isOpen,
  onClose,
  initialBall = null,
  allBalls = [],
  onSaveBall,
  strikerSquad = [],
  bowlingSquad = []
}) {
  const [selectedBallId, setSelectedBallId] = useState(null);
  const [runs, setRuns] = useState(0);
  const [extraType, setExtraType] = useState(null);
  const [extraRuns, setExtraRuns] = useState(0);
  const [isWicket, setIsWicket] = useState(false);
  const [wicketType, setWicketType] = useState(WICKET_TYPES.BOWLED);
  const [dismissedPlayer, setDismissedPlayer] = useState('');
  const [fielder, setFielder] = useState('');
  const [isOverthrow, setIsOverthrow] = useState(false);
  const [overthrowRuns, setOverthrowRuns] = useState(0);

  // When initialBall changes or modal opens, initialize state
  useEffect(() => {
    const target = initialBall || (allBalls.length > 0 ? allBalls[allBalls.length - 1] : null);
    if (!target) return;

    setSelectedBallId(target.ballId || target.seq);
    setRuns(Number(target.runs) || 0);
    setExtraType(target.extraType || null);
    setExtraRuns(Number(target.extraRuns) || 0);
    setIsWicket(Boolean(target.isWicket || target.wicket));
    setWicketType(target.wicket?.type || target.wicketType || WICKET_TYPES.BOWLED);
    setDismissedPlayer(target.wicket?.playerOut || target.dismissedPlayer || target.striker || '');
    setFielder(target.wicket?.fielder || target.fielder || '');
    setIsOverthrow(Boolean(target.isOverthrow));
    setOverthrowRuns(Number(target.overthrowRuns) || 0);
  }, [initialBall, isOpen, allBalls]);

  if (!isOpen) return null;

  const currentBall = allBalls.find((b) => (b.ballId || b.seq) === selectedBallId) || initialBall;

  const handleSelectBallChange = (e) => {
    const val = e.target.value;
    const found = allBalls.find((b) => String(b.ballId || b.seq) === String(val));
    if (found) {
      setSelectedBallId(found.ballId || found.seq);
      setRuns(Number(found.runs) || 0);
      setExtraType(found.extraType || null);
      setExtraRuns(Number(found.extraRuns) || 0);
      setIsWicket(Boolean(found.isWicket || found.wicket));
      setWicketType(found.wicket?.type || found.wicketType || WICKET_TYPES.BOWLED);
      setDismissedPlayer(found.wicket?.playerOut || found.dismissedPlayer || found.striker || '');
      setFielder(found.wicket?.fielder || found.fielder || '');
      setIsOverthrow(Boolean(found.isOverthrow));
      setOverthrowRuns(Number(found.overthrowRuns) || 0);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentBall) return;

    const payload = {
      runs: extraType === EXTRA_TYPES.WIDE ? 0 : runs,
      extraType,
      extraRuns: (extraType === EXTRA_TYPES.BYE || extraType === EXTRA_TYPES.LEG_BYE) ? (extraRuns || runs) : extraRuns,
      isWicket,
      wicket: isWicket ? {
        type: wicketType,
        playerOut: dismissedPlayer || currentBall.striker,
        bowler: currentBall.bowler,
        fielder: fielder.trim() || null
      } : null,
      wicketType: isWicket ? wicketType : null,
      dismissedPlayer: isWicket ? (dismissedPlayer || currentBall.striker) : null,
      fielder: isWicket ? (fielder.trim() || null) : null,
      isOverthrow,
      overthrowRuns: isOverthrow ? overthrowRuns : 0
    };

    onSaveBall(currentBall.ballId || currentBall.seq, payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-md rounded-3xl border p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Edit Ball Score</h3>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                Correct score, extras, or dismissal for this delivery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          {/* Ball Selector (if multiple balls available) */}
          {allBalls.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="font-bold tracking-wide" style={{ color: 'var(--muted)' }}>
                Select Ball to Edit:
              </label>
              <select
                value={selectedBallId || ''}
                onChange={handleSelectBallChange}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full py-2 px-3 rounded-xl border text-xs font-semibold focus:outline-none focus:border-[var(--primary)]"
              >
                {allBalls.map((b, idx) => {
                  const id = b.ballId || b.seq;
                  const label = `Ball #${idx + 1}: ${b.shortLabel || `${b.runs} runs`} (${b.striker || 'Batter'} vs ${b.bowler || 'Bowler'})`;
                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Current Ball Info Card */}
          {currentBall && (
            <div
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)'
              }}
              className="p-3 rounded-2xl border flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                  Bowler: {currentBall.bowler || 'Current Bowler'}
                </span>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  Striker: <strong style={{ color: 'var(--text)' }}>{currentBall.striker || 'Striker'}</strong>
                  {currentBall.nonStriker && ` • Non-Striker: ${currentBall.nonStriker}`}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--muted)' }}>Current:</span>
                <div className="font-black text-sm text-blue-400">
                  {currentBall.shortLabel || `${currentBall.runs || 0} runs`}
                </div>
              </div>
            </div>
          )}

          {/* 1. Runs Scored */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold tracking-wide" style={{ color: 'var(--muted)' }}>
                Runs off Bat:
              </label>
              <span className="font-bold text-emerald-400">{runs} runs</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRuns(r)}
                  style={{
                    backgroundColor: runs === r ? (r === 6 ? 'var(--purple)' : r === 4 ? 'var(--blue)' : '#2563EB') : 'var(--card-alt)',
                    color: runs === r ? '#FFFFFF' : 'var(--text)',
                    borderColor: runs === r ? '#2563EB' : 'var(--border)'
                  }}
                  className="py-2 rounded-xl border text-xs font-bold text-center active:scale-95 transition-all shadow-sm"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Extra Type */}
          <div className="flex flex-col gap-1.5">
            <label className="font-bold tracking-wide" style={{ color: 'var(--muted)' }}>
              Extras / Delivery Type:
            </label>
            <div className="grid grid-cols-5 gap-1">
              {[
                { type: null, label: 'Legal' },
                { type: EXTRA_TYPES.WIDE, label: 'Wide' },
                { type: EXTRA_TYPES.NO_BALL, label: 'No Ball' },
                { type: EXTRA_TYPES.BYE, label: 'Bye' },
                { type: EXTRA_TYPES.LEG_BYE, label: 'Leg Bye' }
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setExtraType(opt.type)}
                  style={{
                    backgroundColor: extraType === opt.type ? 'var(--primary)' : 'var(--card-alt)',
                    color: extraType === opt.type ? '#FFFFFF' : 'var(--text)',
                    borderColor: extraType === opt.type ? 'var(--primary)' : 'var(--border)'
                  }}
                  className="py-2 rounded-xl border text-[11px] font-bold text-center active:scale-95 transition-all shadow-sm"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Extra Runs input if an extra is selected */}
          {extraType && (
            <div className="flex items-center justify-between py-1 px-3 rounded-xl border" style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}>
              <span className="font-semibold" style={{ color: 'var(--muted)' }}>
                {extraType === EXTRA_TYPES.WIDE ? 'Additional Runs on Wide:' : 'Extra Runs:'}
              </span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((er) => (
                  <button
                    key={er}
                    type="button"
                    onClick={() => setExtraRuns(er)}
                    style={{
                      backgroundColor: extraRuns === er ? 'var(--orange)' : 'var(--card)',
                      color: extraRuns === er ? '#FFFFFF' : 'var(--text)',
                      borderColor: 'var(--border)'
                    }}
                    className="w-7 h-7 rounded-lg border text-xs font-bold"
                  >
                    {er}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Wicket Toggle */}
          <div
            style={{
              backgroundColor: isWicket ? 'rgba(239, 68, 68, 0.1)' : 'var(--card-alt)',
              borderColor: isWicket ? 'var(--red)' : 'var(--border)'
            }}
            className="p-3 rounded-2xl border flex flex-col gap-2.5 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isWicket ? 'var(--red)' : 'var(--muted)' }} />
                <span className="font-bold" style={{ color: isWicket ? 'var(--red)' : 'var(--text)' }}>
                  Wicket on this Delivery
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsWicket(!isWicket)}
                style={{
                  backgroundColor: isWicket ? 'var(--red)' : 'var(--card)',
                  color: isWicket ? '#FFFFFF' : 'var(--muted)',
                  borderColor: isWicket ? 'var(--red)' : 'var(--border)'
                }}
                className="py-1 px-3 rounded-xl border font-bold text-xs active:scale-95 transition-all"
              >
                {isWicket ? 'WICKET (YES)' : 'NO WICKET'}
              </button>
            </div>

            {isWicket && (
              <div className="flex flex-col gap-2 pt-1 border-t border-red-500/20">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Dismissal Type:</label>
                    <select
                      value={wicketType}
                      onChange={(e) => setWicketType(e.target.value)}
                      style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)'
                      }}
                      className="w-full py-1.5 px-2 rounded-xl border text-xs font-semibold focus:outline-none"
                    >
                      <option value={WICKET_TYPES.BOWLED}>Bowled</option>
                      <option value={WICKET_TYPES.CAUGHT}>Caught</option>
                      <option value={WICKET_TYPES.LBW}>LBW</option>
                      <option value={WICKET_TYPES.RUN_OUT}>Run Out</option>
                      <option value={WICKET_TYPES.STUMPED}>Stumped</option>
                      <option value={WICKET_TYPES.HIT_WICKET}>Hit Wicket</option>
                      <option value={WICKET_TYPES.RETIRED_OUT}>Retired Out</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Batter Dismissed:</label>
                    <select
                      value={dismissedPlayer}
                      onChange={(e) => setDismissedPlayer(e.target.value)}
                      style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)'
                      }}
                      className="w-full py-1.5 px-2 rounded-xl border text-xs font-semibold focus:outline-none"
                    >
                      {currentBall?.striker && <option value={currentBall.striker}>{currentBall.striker} (Striker)</option>}
                      {currentBall?.nonStriker && <option value={currentBall.nonStriker}>{currentBall.nonStriker} (Non-Striker)</option>}
                    </select>
                  </div>
                </div>

                {wicketType === WICKET_TYPES.CAUGHT || wicketType === WICKET_TYPES.RUN_OUT || wicketType === WICKET_TYPES.STUMPED ? (
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Fielder (Optional):</label>
                    <input
                      type="text"
                      placeholder="Fielder name..."
                      value={fielder}
                      onChange={(e) => setFielder(e.target.value)}
                      style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)'
                      }}
                      className="w-full py-1.5 px-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* 4. Overthrow Checkbox */}
          <div className="flex items-center justify-between py-1.5 px-3 rounded-xl border" style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOverthrow}
                onChange={(e) => setIsOverthrow(e.target.checked)}
                className="rounded accent-[#22C55E]"
              />
              <span className="font-semibold" style={{ color: 'var(--text)' }}>Overthrow delivery</span>
            </label>
            {isOverthrow && (
              <div className="flex items-center gap-1 text-[11px]">
                <span style={{ color: 'var(--muted)' }}>OT Runs:</span>
                {[1, 2, 4].map((ot) => (
                  <button
                    key={ot}
                    type="button"
                    onClick={() => setOverthrowRuns(ot)}
                    style={{
                      backgroundColor: overthrowRuns === ot ? 'var(--primary)' : 'var(--card)',
                      color: overthrowRuns === ot ? '#FFFFFF' : 'var(--text)',
                      borderColor: 'var(--border)'
                    }}
                    className="w-6 h-6 rounded border font-bold"
                  >
                    {ot}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--muted)'
              }}
              className="flex-1 py-2.5 rounded-xl border font-bold hover:text-[var(--text)] transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF'
              }}
              className="flex-2 py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-98 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Ball Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
