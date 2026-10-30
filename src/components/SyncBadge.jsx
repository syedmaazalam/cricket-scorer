import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function SyncBadge({ syncStatus }) {
  const { status, pendingCount, errorMessage } = syncStatus || { status: 'synced', pendingCount: 0 };

  if (status === 'syncing') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Syncing{pendingCount > 0 ? ` (${pendingCount})` : '...'}</span>
      </div>
    );
  }

  if (status === 'offline' || pendingCount > 0) {
    return (
      <div
        title={errorMessage || 'Offline or waiting to sync'}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-pointer"
      >
        <WifiOff className="w-3.5 h-3.5" />
        <span>Offline ({pendingCount} pending)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-3.5" />
      <span>Live</span>
    </div>
  );
}
