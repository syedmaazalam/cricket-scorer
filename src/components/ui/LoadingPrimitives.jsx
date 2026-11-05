import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

/**
 * Slim top-of-screen indeterminate progress bar
 * Perfect for zero-lag page and view transitions
 */
export function TopProgressBar({ active = false, color = 'var(--pri)' }) {
  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page content"
      className="fixed top-0 left-0 right-0 h-[3px] z-[9999] overflow-hidden bg-black/10 pointer-events-none"
    >
      <div
        className="h-full w-full top-progress-indeterminate rounded-r-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

/**
 * Lightweight inline spinner for button loading states
 */
export function ButtonSpinner({ className = 'w-4 h-4', color = 'currentColor' }) {
  return (
    <Loader2
      className={`animate-spin shrink-0 ${className}`}
      style={{ color }}
      aria-hidden="true"
    />
  );
}

/**
 * Generic Shimmer Skeleton Box
 */
export function SkeletonBox({ className = '', style = {}, rounded = 'rounded-xl' }) {
  return (
    <div
      className={`skeleton-shimmer ${rounded} ${className}`}
      style={{
        minHeight: '14px',
        ...style
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Pre-assembled Card Skeleton with title and rows
 */
export function SkeletonCard({ className = '', lines = 3 }) {
  return (
    <div
      className={`p-4 rounded-2xl border border-[var(--bd)] bg-[var(--card)] flex flex-col gap-3 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <SkeletonBox className="w-1/3 h-5 rounded-lg" />
        <SkeletonBox className="w-16 h-6 rounded-full" />
      </div>
      <div className="flex flex-col gap-2 pt-1">
        {Array.from({ length: lines }, (_, i) => (
          <SkeletonBox
            key={i}
            className="w-full h-4 rounded-md"
            style={{ width: i === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Pre-assembled Table Skeleton for Batting & Bowling cards
 */
export function SkeletonTable({ rows = 4, cols = 6, className = '' }) {
  return (
    <div
      className={`p-4 rounded-2xl border border-[var(--bd)] bg-[var(--card)] flex flex-col gap-3 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 mb-1">
        <SkeletonBox className="w-5 h-5 rounded-md" />
        <SkeletonBox className="w-48 h-5 rounded-lg" />
      </div>
      {/* Header bar */}
      <SkeletonBox className="w-full h-8 rounded-lg" />
      {/* Row items */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-2 py-1">
            <SkeletonBox className="w-8 h-4 rounded" />
            <SkeletonBox className="flex-1 h-4 rounded" />
            {Array.from({ length: cols - 2 }, (_, c) => (
              <SkeletonBox key={c} className="w-12 h-4 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Pulsing Activity Dot for Realtime Sync
 */
export function PulseDot({ color = 'var(--ok)', size = 8, className = '' }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size - 2, height: size - 2, backgroundColor: color }}
      />
    </span>
  );
}

/**
 * Pull to Refresh Header Indicator
 */
export function PullToRefreshIndicator({ pullDistance = 0, threshold = 60, isRefreshing = false }) {
  if (pullDistance <= 0 && !isRefreshing) return null;

  const progress = Math.min(1, pullDistance / threshold);
  const rotation = progress * 360;

  return (
    <div
      className="w-full flex items-center justify-center overflow-hidden transition-all duration-150"
      style={{ height: isRefreshing ? 48 : Math.min(pullDistance, 60) }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--well)] border border-[var(--bd)] text-xs font-bold text-[var(--t2)] shadow-sm">
        <RefreshCw
          className={`w-3.5 h-3.5 text-[var(--pri)] ${isRefreshing ? 'animate-spin' : ''}`}
          style={{ transform: isRefreshing ? 'none' : `rotate(${rotation}deg)` }}
        />
        <span>{isRefreshing ? 'Refreshing matches...' : pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}</span>
      </div>
    </div>
  );
}

/**
 * 10-Petal Radial Blue Capsule Spinner matching user reference image
 */
export function SegmentedCapsuleSpinner({ size = 64, className = '' }) {
  // 10 radial pill capsules at 36-degree intervals
  const petals = [
    { angle: 0, opacity: 0.65, color: '#93C5FD' },
    { angle: 36, opacity: 1.0, color: '#1E6BFF' },   // Brightest electric blue highlight
    { angle: 72, opacity: 0.85, color: '#3B82F6' },
    { angle: 108, opacity: 0.70, color: '#60A5FA' },
    { angle: 144, opacity: 0.55, color: '#93C5FD' },
    { angle: 180, opacity: 0.45, color: '#BFDBFE' },
    { angle: 216, opacity: 0.35, color: '#DBEAFE' },
    { angle: 252, opacity: 0.25, color: '#EFF6FF' },
    { angle: 288, opacity: 0.35, color: '#DBEAFE' },
    { angle: 324, opacity: 0.50, color: '#BFDBFE' },
  ];

  return (
    <div
      role="status"
      aria-label="Searching matches..."
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="animate-spin"
        style={{ animationDuration: '0.85s' }}
      >
        {petals.map((p, i) => (
          <rect
            key={i}
            x="43.5"
            y="7"
            width="13"
            height="27"
            rx="6.5"
            ry="6.5"
            fill={p.color}
            opacity={p.opacity}
            transform={`rotate(${p.angle} 50 50)`}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * Shimmering Tab Shift Skeleton Placeholder
 */
export function TabSkeleton({ tab = 'score' }) {
  if (tab === 'scorecard') {
    return (
      <div className="w-full flex flex-col gap-4 animate-in fade-in duration-150 py-1">
        <SkeletonTable rows={4} cols={6} />
        <SkeletonTable rows={3} cols={6} />
      </div>
    );
  }

  if (tab === 'teams') {
    return (
      <div className="w-full flex flex-col gap-3.5 animate-in fade-in duration-150 py-1">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  if (tab === 'settings') {
    return (
      <div className="w-full flex flex-col gap-3 animate-in fade-in duration-150 py-1">
        <SkeletonBox className="w-full h-14 rounded-2xl" />
        <SkeletonBox className="w-full h-14 rounded-2xl" />
        <SkeletonBox className="w-full h-14 rounded-2xl" />
      </div>
    );
  }

  // Default 'score' tab overview skeleton
  return (
    <div className="w-full flex flex-col gap-3.5 animate-in fade-in duration-150 py-1">
      <div className="p-4 rounded-2xl border border-[var(--bd)] bg-[var(--card)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SkeletonBox className="w-1/3 h-5 rounded-lg" />
          <SkeletonBox className="w-16 h-6 rounded-full" />
        </div>
        <div className="flex items-baseline justify-between py-2">
          <SkeletonBox className="w-28 h-10 rounded-xl" />
          <SkeletonBox className="w-20 h-7 rounded-xl" />
        </div>
        <SkeletonBox className="w-full h-2.5 rounded-full" />
        <div className="flex justify-between pt-1">
          <SkeletonBox className="w-20 h-4 rounded" />
          <SkeletonBox className="w-24 h-4 rounded" />
        </div>
      </div>
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
    </div>
  );
}
