import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, Trophy, Award, Flame, ShieldAlert, Zap } from 'lucide-react';

export function isAbdullah(name) {
  if (!name || typeof name !== 'string') return false;
  return name.trim().toLowerCase().includes('abdullah');
}

let _abdullahEnabledMemory = true;

export function isAbdullahMessagesEnabled() {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('smartcricket_abdullah_messages') !== 'false';
    }
  } catch (e) {}
  return _abdullahEnabledMemory;
}

export function setAbdullahMessagesEnabled(enabled) {
  _abdullahEnabledMemory = Boolean(enabled);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('smartcricket_abdullah_messages', enabled ? 'true' : 'false');
    }
  } catch (e) {}
}

/**
 * Special unskippable 4-second motivational brother message modal for Abdullah from his brother Maaz.
 */
export default function AbdullahMotivationModal({ eventData, onClose }) {
  const [secondsRemaining, setSecondsRemaining] = useState(4);

  useEffect(() => {
    if (!eventData) return;
    setSecondsRemaining(4);

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [eventData]);

  if (!eventData || !isAbdullahMessagesEnabled()) return null;

  const { type, score } = eventData;

  // Exact customized messages specified by brother Maaz
  let message = '';
  let subHeader = 'Message from Brother Maaz';
  let IconComponent = Heart;
  let accentColor = '#22C55E';
  let badgeText = 'ABDULLAH SPECIAL';

  switch (type) {
    case 'wicket_taken':
      message = 'You can take another wicket';
      IconComponent = Trophy;
      accentColor = '#22C55E';
      badgeText = 'WICKET FOR ABDULLAH';
      break;
    case 'comes_to_bat':
      message = 'Shabash Abdullah You Can Do It!';
      IconComponent = Flame;
      accentColor = '#22C55E';
      badgeText = 'ABDULLAH AT CREASE';
      break;
    case 'six':
      message = 'Shabash Abdullah You Can Hit Another Six Proud of You! Maaz..';
      IconComponent = Zap;
      accentColor = '#22C55E';
      badgeText = 'MAXIMUM SIX!';
      break;
    case 'four':
      message = 'You Can Do It!';
      IconComponent = Award;
      accentColor = '#22C55E';
      badgeText = 'CRACKING FOUR!';
      break;
    case 'out':
      message = score !== undefined && score !== null
        ? `Good! Your Brother Maaz is always Proud of You! Love You Abdullah (${score} runs)`
        : 'Good! Your Brother Maaz is always Proud of You! Love You Abdullah';
      IconComponent = Heart;
      accentColor = '#F59E0B';
      badgeText = 'PROUD OF YOU ALWAYS';
      break;
    default:
      message = 'Shabash Abdullah You Can Do It!';
  }

  const canDismiss = secondsRemaining === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn select-none">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: accentColor,
          color: 'var(--text)'
        }}
        className="w-full max-w-sm rounded-2xl border-2 shadow-2xl p-6 flex flex-col items-center text-center gap-4 animate-scaleUp"
      >
        {/* Top Badge */}
        <div
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            color: accentColor,
            borderColor: 'rgba(34, 197, 94, 0.3)'
          }}
          className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>{badgeText}</span>
        </div>

        {/* Icon */}
        <div
          style={{
            backgroundColor: `${accentColor}20`,
            borderColor: accentColor
          }}
          className="w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg"
        >
          <IconComponent className="w-8 h-8 animate-pulse" style={{ color: accentColor }} />
        </div>

        {/* Subhead & Main Message */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            {subHeader}
          </p>
          <h3 className="text-lg sm:text-xl font-black leading-snug tracking-tight" style={{ color: 'var(--text)' }}>
            "{message}"
          </h3>
        </div>

        {/* Unskippable Lock Countdown / Dismiss Button */}
        <div className="w-full pt-2">
          {canDismiss ? (
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF'
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md"
            >
              Continue Playing
            </button>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)',
                color: 'var(--muted)'
              }}
              className="w-full py-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 cursor-not-allowed select-none"
            >
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />
              <span>Unskippable ({secondsRemaining}s remaining)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
