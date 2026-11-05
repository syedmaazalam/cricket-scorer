import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  TopProgressBar,
  ButtonSpinner,
  SkeletonBox,
  SkeletonCard,
  SkeletonTable,
  PulseDot,
  PullToRefreshIndicator,
  SegmentedCapsuleSpinner,
  TabSkeleton
} from '../components/ui/LoadingPrimitives.jsx';

describe('LoadingPrimitives Component Unit Tests', () => {
  it('TopProgressBar renders when active and hides when inactive', () => {
    const inactiveHtml = renderToString(<TopProgressBar active={false} />);
    expect(inactiveHtml).toBe('');

    const activeHtml = renderToString(<TopProgressBar active={true} color="#3B82F6" />);
    expect(activeHtml).toContain('progressbar');
    expect(activeHtml).toContain('top-progress-indeterminate');
    expect(activeHtml).toContain('background-color:#3B82F6');
  });

  it('ButtonSpinner renders spinning accessible loader', () => {
    const html = renderToString(<ButtonSpinner className="w-5 h-5" color="#FFFFFF" />);
    expect(html).toContain('animate-spin');
    expect(html).toContain('aria-hidden="true"');
  });

  it('SkeletonBox renders with shimmer class and custom rounded corners', () => {
    const html = renderToString(<SkeletonBox className="h-6 w-32" rounded="rounded-2xl" />);
    expect(html).toContain('skeleton-shimmer');
    expect(html).toContain('rounded-2xl');
  });

  it('SkeletonCard renders structured shimmer placeholders', () => {
    const html = renderToString(<SkeletonCard lines={4} />);
    expect(html).toContain('skeleton-shimmer');
    expect(html).toContain('border');
  });

  it('SkeletonTable renders multiple rows and columns', () => {
    const html = renderToString(<SkeletonTable rows={3} cols={5} />);
    expect(html).toContain('skeleton-shimmer');
  });

  it('PulseDot renders pulsing animated ping and dot', () => {
    const html = renderToString(<PulseDot color="#10B981" size={10} />);
    expect(html).toContain('animate-ping');
    expect(html).toContain('background-color:#10B981');
  });

  it('PullToRefreshIndicator shows pulling state and refreshing state', () => {
    const pullingHtml = renderToString(<PullToRefreshIndicator pullDistance={40} threshold={60} />);
    expect(pullingHtml).toContain('Pull to refresh');

    const releaseHtml = renderToString(<PullToRefreshIndicator pullDistance={70} threshold={60} />);
    expect(releaseHtml).toContain('Release to refresh');

    const refreshingHtml = renderToString(<PullToRefreshIndicator pullDistance={0} threshold={60} isRefreshing={true} />);
    expect(refreshingHtml).toContain('Refreshing matches...');
    expect(refreshingHtml).toContain('animate-spin');
  });

  it('SegmentedCapsuleSpinner renders 10-petal radial SVG capsules with electric blue highlight', () => {
    const html = renderToString(<SegmentedCapsuleSpinner size={64} />);
    expect(html).toContain('viewBox="0 0 100 100"');
    expect(html).toContain('animate-spin');
    expect(html).toContain('#1E6BFF'); // Electric blue highlight on petal 1
    // Confirm 10 rect capsules are present
    const rectCount = (html.match(/<rect/g) || []).length;
    expect(rectCount).toBe(10);
  });

  it('TabSkeleton renders appropriate shimmer placeholders for score, scorecard, teams and settings', () => {
    const scoreSkeleton = renderToString(<TabSkeleton tab="score" />);
    expect(scoreSkeleton).toContain('skeleton-shimmer');

    const scorecardSkeleton = renderToString(<TabSkeleton tab="scorecard" />);
    expect(scorecardSkeleton).toContain('skeleton-shimmer');

    const teamsSkeleton = renderToString(<TabSkeleton tab="teams" />);
    expect(teamsSkeleton).toContain('skeleton-shimmer');

    const settingsSkeleton = renderToString(<TabSkeleton tab="settings" />);
    expect(settingsSkeleton).toContain('skeleton-shimmer');
  });
});
