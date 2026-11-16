import React from 'react';

/**
 * Team crest shield component matching redesign prototype.
 */
export default function TeamCrest({ name, color }) {
  const initials = (name || 'SC')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SC';

  return (
    <svg width="50" height="58" viewBox="0 0 54 62" role="img" aria-label={`${name} crest`} style={{ flex: 'none' }}>
      <path d="M27 2 50 10v22c0 14-10 24-23 28C14 56 4 46 4 32V10Z" fill={color} stroke="rgba(255,255,255,.65)" strokeWidth="2" />
      <path d="M19 9l4 5 4-6 4 6 4-5-1 8H20Z" fill="#FFC83D" />
      <text x="27" y="41" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff">
        {initials}
      </text>
    </svg>
  );
}
