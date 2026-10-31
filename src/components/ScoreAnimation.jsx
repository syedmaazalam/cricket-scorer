import React, { useEffect, useState } from 'react';
import { Zap, Award, Flame, Sparkles, ShieldAlert, CircleDot, Activity, AlertCircle, Info } from 'lucide-react';

export default function ScoreAnimation({ animationData }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!animationData) return;
    setVisible(true);
    // User requirement: Keep six, four, wickets, and wide pop-up messages lasting for 2 seconds (2000ms)
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [animationData]);

  if (!visible || !animationData) return null;

  const { type, text, subtext } = animationData;

  let bgGradient = 'rgba(30, 41, 59, 0.95)';
  let borderGlow = 'var(--primary)';
  let IconComponent = Zap;

  if (type === 'six') {
    bgGradient = 'rgba(22, 163, 74, 0.95)';
    borderGlow = 'var(--primary)';
    IconComponent = Flame;
  } else if (type === 'four') {
    bgGradient = 'rgba(22, 163, 74, 0.9)';
    borderGlow = 'var(--primary)';
    IconComponent = Award;
  } else if (type === 'wicket') {
    bgGradient = 'rgba(239, 68, 68, 0.95)';
    borderGlow = 'var(--red)';
    IconComponent = ShieldAlert;
  } else if (type === 'wide') {
    bgGradient = 'rgba(217, 119, 6, 0.95)';
    borderGlow = '#F59E0B';
    IconComponent = AlertCircle;
  } else if (type === 'no_ball') {
    bgGradient = 'rgba(220, 38, 38, 0.95)';
    borderGlow = '#EF4444';
    IconComponent = AlertCircle;
  } else if (type === 'extra' || type === 'bye' || type === 'leg_bye') {
    bgGradient = 'rgba(36, 50, 71, 0.95)';
    borderGlow = 'var(--border)';
    IconComponent = Activity;
  } else if (type === 'dot') {
    bgGradient = 'rgba(15, 23, 42, 0.95)';
    borderGlow = 'var(--border)';
    IconComponent = CircleDot;
  } else if (type === 'run') {
    bgGradient = 'rgba(22, 163, 74, 0.95)';
    borderGlow = 'var(--primary)';
    IconComponent = Zap;
  } else {
    bgGradient = 'rgba(30, 41, 59, 0.95)';
    borderGlow = 'var(--primary)';
    IconComponent = Sparkles;
  }

  return (
    <div className="fixed top-16 left-0 right-0 pointer-events-none z-50 flex items-center justify-center p-2">
      <div
        style={{
          backgroundColor: bgGradient,
          borderColor: borderGlow,
          boxShadow: `0 4px 20px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.35)`
        }}
        className="px-4 py-2 rounded-xl border backdrop-blur-xl text-white flex items-center gap-2.5 transform animate-bounce-short select-none shadow-xl"
      >
        <span className="flex items-center justify-center">
          <IconComponent className="w-5 h-5 text-white" />
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight leading-tight text-white">
            {text}
          </span>
          {subtext && (
            <span className="text-[10px] font-medium tracking-wider uppercase opacity-90 leading-tight text-white">
              {subtext}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
