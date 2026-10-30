import React, { useState, useEffect } from 'react';
import { History, X, Clock, RefreshCw, Download, FileText } from 'lucide-react';
import { getActionLogsLocally } from '../store/localDb.js';
import { getActionLogsFromCloud } from '../firebase/matches.js';

export default function ActionLogsModal({ isOpen, onClose, matchId }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !matchId) return;

    async function load() {
      setIsLoading(true);
      try {
        const local = getActionLogsLocally(matchId);
        if (local && local.length > 0) {
          setLogs(local);
        } else {
          const cloud = await getActionLogsFromCloud(matchId);
          setLogs(cloud || []);
        }
      } catch (e) {
        console.warn('Could not load action logs:', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [isOpen, matchId]);

  if (!isOpen) return null;

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `action_logs_${matchId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-xl rounded-3xl p-5 sm:p-6 border shadow-2xl flex flex-col gap-3 animate-in fade-in zoom-in-95 relative max-h-[90vh]"
      >
        <button
          onClick={onClose}
          style={{ color: 'var(--muted)' }}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between border-b pb-3 pr-8" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div
              style={{
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF'
              }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-sm"
            >
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black m-0" style={{ color: 'var(--text)' }}>
                Action Audit Logs
              </h3>
              <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
                Chronological timestamped record of user actions and undos
              </p>
            </div>
          </div>

          {logs.length > 0 && (
            <button
              onClick={handleExportJson}
              style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--text)' }}
              className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
              title="Download Logs as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON</span>
            </button>
          )}
        </div>

        {/* Logs Table / List */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] flex flex-col gap-2 pr-1">
          {isLoading ? (
            <div className="text-center py-8 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
              Loading action audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
              No action logs recorded yet for this match.
            </div>
          ) : (
            logs.map((log, idx) => {
              const isUndo = log.action === 'UNDO_PRESSED';
              const isDot = log.title?.includes('Dot Ball');
              return (
                <div
                  key={log.id || idx}
                  style={{
                    backgroundColor: isUndo
                      ? 'color-mix(in srgb, var(--orange) 12%, var(--card-alt))'
                      : isDot
                      ? 'color-mix(in srgb, var(--blue) 10%, var(--card-alt))'
                      : 'var(--card-alt)',
                    borderColor: isUndo ? 'var(--orange)' : 'var(--border)'
                  }}
                  className="p-3 rounded-2xl border flex items-start justify-between gap-3 text-xs transition-all"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          color: isUndo ? 'var(--orange)' : 'var(--text)'
                        }}
                        className="font-black text-sm"
                      >
                        {log.title || log.action}
                      </span>
                      <span
                        style={{
                          backgroundColor: isUndo ? 'var(--orange-15)' : 'var(--border)',
                          color: isUndo ? 'var(--orange)' : 'var(--muted)'
                        }}
                        className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase"
                      >
                        {log.action}
                      </span>
                    </div>
                    {log.details && (
                      <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
                        {log.details}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>
                    <Clock className="w-3 h-3" />
                    <span>{log.isoTime || new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={onClose}
          style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
          className="w-full py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all mt-1"
        >
          Close
        </button>
      </div>
    </div>
  );
}
