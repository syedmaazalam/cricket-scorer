import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function SyncBadge({ syncStatus }) {
  const { status, pendingCount, errorMessage } = syncStatus || { status: 'synced', pendingCount: 0 };

  if (status === 'syncing') {
    return (
      <div
        style={{
          background: 'color-mix(in srgb, var(--pri) 14%, transparent)',
          borderColor: 'color-mix(in srgb, var(--pri) 35%, transparent)',
          color: 'var(--pri)'
        }}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-bold border shadow-sm select-none"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Syncing{pendingCount > 0 ? ` (${pendingCount})` : ''}</span>
      </div>
    );
  }

  if (status === 'offline' || pendingCount > 0) {
    return (
      <div
        title={errorMessage || 'Offline or waiting to sync'}
        style={{
          background: 'color-mix(in srgb, var(--bad) 14%, transparent)',
          borderColor: 'color-mix(in srgb, var(--bad) 35%, transparent)',
          color: 'var(--bad)'
        }}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-bold border shadow-sm select-none"
      >
        <WifiOff className="w-3.5 h-3.5" />
        <span>Offline ({pendingCount})</span>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'color-mix(in srgb, var(--ok) 14%, transparent)',
        borderColor: 'color-mix(in srgb, var(--ok) 35%, transparent)',
        color: 'var(--ok)'
      }}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-bold border shadow-sm select-none"
    >
      <i className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--ok)' }} />
      <i className="w-2 h-2 rounded-full -ml-3.5" style={{ backgroundColor: 'var(--ok)' }} />
      <span>Live</span>
    </div>
  );
}
