import React, { useEffect, useState } from 'react';

export default function ScoreAnimation({ animationData }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!animationData) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1300);
    return () => clearTimeout(timer);
  }, [animationData]);

  if (!visible || !animationData) return null;

  const { type, text, subtext } = animationData;

  let bgGradient = 'rgba(123, 97, 240, 0.95)'; // purple
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
    icon = '🎯 ☝️';
  } else if (type === 'extra') {
    bgGradient = 'rgba(255, 177, 85, 0.95)';
    borderGlow = 'var(--orange)';
    icon = '🚩';
  } else {
    bgGradient = 'rgba(43, 45, 110, 0.95)';
    borderGlow = 'var(--primary)';
    icon = '⚡';
  }

  return (
    <div className="fixed top-16 left-0 right-0 pointer-events-none z-50 flex items-center justify-center p-2">
      <div
        style={{
          backgroundColor: bgGradient,
          borderColor: borderGlow,
          boxShadow: `0 4px 20px ${borderGlow}, 0 2px 8px rgba(0, 0, 0, 0.35)`
        }}
        className="px-4 py-2 rounded-2xl border backdrop-blur-xl text-white flex items-center gap-2.5 transform animate-bounce-short select-none shadow-xl"
      >
        <span className="text-lg">{icon}</span>
        <div className="flex flex-col">
          <span className="text-sm font-black tracking-tight leading-tight">
            {text}
          </span>
          {subtext && (
            <span className="text-[9px] font-black tracking-widest uppercase opacity-90 leading-tight">
              {subtext}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
