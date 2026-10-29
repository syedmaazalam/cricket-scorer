import React, { useEffect, useState } from 'react';

export default function ScoreAnimation({ animationData }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!animationData) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1100);
    return () => clearTimeout(timer);
  }, [animationData]);

  if (!visible || !animationData) return null;

  const { type, text, subtext } = animationData;

  let bgGradient = 'rgba(123, 97, 240, 0.9)'; // purple
  let borderGlow = 'var(--purple)';
  let icon = '🏏';

  if (type === 'six') {
    bgGradient = 'rgba(123, 97, 240, 0.95)';
    borderGlow = 'var(--purple)';
    icon = '🏏 💥';
  } else if (type === 'four') {
    bgGradient = 'rgba(91, 155, 255, 0.95)';
    borderGlow = 'var(--blue)';
    icon = '🏏 ⚡';
  } else if (type === 'wicket') {
    bgGradient = 'rgba(255, 107, 139, 0.95)';
    borderGlow = 'var(--red)';
    icon = '☝️ 🎯';
  } else if (type === 'extra') {
    bgGradient = 'rgba(255, 177, 85, 0.95)';
    borderGlow = 'var(--orange)';
    icon = '🚩';
  } else {
    bgGradient = 'rgba(43, 45, 110, 0.85)';
    borderGlow = 'var(--primary)';
    icon = '⚡';
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
      <div
        style={{
          backgroundColor: bgGradient,
          borderColor: borderGlow,
          boxShadow: `0 0 40px ${borderGlow}, 0 20px 25px -5px rgba(0, 0, 0, 0.5)`
        }}
        className="px-6 py-4 rounded-3xl border-2 backdrop-blur-xl text-white flex flex-col items-center justify-center gap-1 transform animate-bounce-short select-none"
      >
        <div className="text-3xl animate-spin-once">{icon}</div>
        <div className="text-4xl font-black tracking-tight drop-shadow-md">
          {text}
        </div>
        {subtext && (
          <div className="text-xs font-black tracking-widest uppercase drop-shadow">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
