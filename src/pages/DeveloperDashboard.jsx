import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Trash2,
  Download,
  Upload,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  FileCode,
  Users,
  Check,
  X,
  Radio,
  FileText
} from 'lucide-react';
import {
  getAllMatchesFromCloud,
  deleteMatchFromCloud,
  deleteAllMatchesFromCloud,
  updateMatchSettings,
  saveUploadedMatchToCloud,
  subscribeToMatchEvents
} from '../firebase/matches.js';
import {
  getAllLocalMatches,
  deleteMatchLocally,
  deleteAllMatchesLocally,
  saveMatchSnapshot,
  saveEventLocally,
  getEventsForMatch
} from '../store/localDb.js';
import { replayEvents } from '../engine/reducer.js';

export default function DeveloperDashboard({ onBack, onOpenMatch }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('dev_auth') === 'true';
  });

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard state
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMatchEvents, setSelectedMatchEvents] = useState(null);
  const [inspectingMatch, setInspectingMatch] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [restrictionModalMatch, setRestrictionModalMatch] = useState(null);
  const [maxViewersInput, setMaxViewersInput] = useState('');
  const [isRestrictedToggle, setIsRestrictedToggle] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const DEV_USER = 'syedmaazalam';
  const DEV_PASS = 'Silicon123@';

  // Authentication check
  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim() === DEV_USER && password === DEV_PASS) {
      setIsAuthenticated(true);
      sessionStorage.setItem('dev_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid developer username or password.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('dev_auth');
  };

  // Load all matches from Cloud and Local
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const cloudList = await getAllMatchesFromCloud();
      const localList = await getAllLocalMatches();

      // Merge unique matches by matchId
      const map = new Map();
      cloudList.forEach(m => map.set(m.matchId, { ...m, source: 'cloud' }));
      localList.forEach(m => {
        if (!map.has(m.matchId)) {
          map.set(m.matchId, { ...m, source: 'local' });
        }
      });

      const merged = Array.from(map.values());
      merged.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      setMatches(merged);
    } catch (err) {
      console.error('Failed to fetch matches for developer portal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  // Inspect events / messages of a match
  const handleInspectMatch = async (m) => {
    setInspectingMatch(m);
    setSelectedMatchEvents(null);
    try {
      const localEvents = await getEventsForMatch(m.matchId);
      if (localEvents && localEvents.length > 0) {
        setSelectedMatchEvents(localEvents);
      } else {
        // Fetch from cloud
        subscribeToMatchEvents(m.matchId, (cloudEvents) => {
          setSelectedMatchEvents(cloudEvents || []);
        });
      }
    } catch (e) {
      setSelectedMatchEvents([]);
    }
  };

  // Delete single match
  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm(`Are you sure you want to permanently delete match ${matchId}?`)) return;
    try {
      await deleteMatchFromCloud(matchId).catch(() => {});
      await deleteMatchLocally(matchId).catch(() => {});
      setMatches(prev => prev.filter(m => m.matchId !== matchId));
      if (inspectingMatch?.matchId === matchId) {
        setInspectingMatch(null);
        setSelectedMatchEvents(null);
      }
      showToast('Match deleted successfully.');
    } catch (err) {
      alert('Failed to delete match: ' + err.message);
    }
  };

  // Delete all matches
  const handleDeleteAllMatches = async () => {
    if (deleteConfirmationInput !== 'DELETE') return;
    try {
      setIsLoading(true);
      await deleteAllMatchesFromCloud().catch(() => {});
      await deleteAllMatchesLocally().catch(() => {});
      setMatches([]);
      setInspectingMatch(null);
      setSelectedMatchEvents(null);
      setConfirmDeleteAll(false);
      setDeleteConfirmationInput('');
      showToast('All matches permanently deleted from database.');
    } catch (err) {
      alert('Failed to delete all matches: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Download complete match JSON
  const handleDownloadJSON = async (m) => {
    try {
      let events = await getEventsForMatch(m.matchId);
      if (!events || events.length === 0) {
        events = m.events || [];
      }

      const exportObject = {
        app: 'Cricket Scorer',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        matchId: m.matchId,
        code: m.code,
        matchState: m,
        events: events
      };

      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `Match_${m.code || 'CODE'}_${m.matchId}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export match JSON: ' + err.message);
    }
  };

  // Upload match JSON
  const handleUploadJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const targetMatchId = data.matchId || `upload_${Date.now()}`;
      const targetState = data.matchState || data;
      const targetEvents = data.events || targetState.events || [];

      // Reconstruct deterministic state
      const replayed = targetEvents.length > 0 ? replayEvents(targetEvents) : targetState;
      replayed.matchId = targetMatchId;
      if (data.code) replayed.code = data.code;

      // Save locally
      await saveMatchSnapshot(targetMatchId, replayed);
      for (const ev of targetEvents) {
        await saveEventLocally(ev, true);
      }

      // Save in cloud
      await saveUploadedMatchToCloud(targetMatchId, replayed, targetEvents);

      showToast(`Match #${replayed.code || targetMatchId} uploaded & synchronized successfully!`);
      fetchAllData();
    } catch (err) {
      alert('Invalid Match JSON format: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  // Viewer restriction updater
  const handleSaveRestrictions = async () => {
    if (!restrictionModalMatch) return;
    try {
      const maxVal = maxViewersInput === '' ? null : Number(maxViewersInput);
      const updates = {
        maxViewers: Number.isNaN(maxVal) ? null : maxVal,
        isViewerRestricted: Boolean(isRestrictedToggle)
      };

      await updateMatchSettings(restrictionModalMatch.matchId, updates);
      await saveMatchSnapshot(restrictionModalMatch.matchId, {
        ...restrictionModalMatch,
        ...updates
      });

      setMatches(prev => prev.map(m => m.matchId === restrictionModalMatch.matchId ? { ...m, ...updates } : m));
      setRestrictionModalMatch(null);
      showToast('Viewer access limits updated.');
    } catch (err) {
      alert('Failed to update restrictions: ' + err.message);
    }
  };

  const showToast = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // 1. LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div
        style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
        className="min-h-screen flex flex-col items-center justify-center p-4 select-none"
      >
        <div
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          className="w-full max-w-sm rounded-3xl border p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-center gap-2.5 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight" style={{ color: 'var(--text)' }}>
                Developer Console
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                Authorized Administrative Access
              </p>
            </div>
          </div>

          {loginError && (
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-3 text-xs">
            <div>
              <label className="font-bold uppercase tracking-wider block mb-1 text-[10px]" style={{ color: 'var(--muted)' }}>
                Developer Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="syedmaazalam"
                required
                className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label className="font-bold uppercase tracking-wider block mb-1 text-[10px]" style={{ color: 'var(--muted)' }}>
                Developer Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            <button
              type="submit"
              style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
              className="w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all mt-1"
            >
              Sign In to Console
            </button>
          </form>

          <button
            onClick={onBack}
            className="text-xs text-center font-semibold mt-1 hover:underline"
            style={{ color: 'var(--muted)' }}
          >
            ← Return to Scorer
          </button>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED DEVELOPER CONSOLE
  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col p-3 sm:p-5 max-w-6xl mx-auto w-full box-border select-none"
    >
      {/* Toast */}
      {statusMessage && (
        <div className="fixed top-4 right-4 z-50 p-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4">
          <Check className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        className="p-3 sm:p-4 rounded-3xl border flex items-center justify-between gap-2 shadow-sm mb-4"
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border active:scale-95 transition-all"
            style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--text)' }}
            title="Back to App"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-base sm:text-lg font-black tracking-tight" style={{ color: 'var(--text)' }}>
                Developer Console
              </h1>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
              Logged in as <strong style={{ color: 'var(--primary)' }}>syedmaazalam</strong> • System Controller
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllData}
            className="p-2 rounded-xl border active:scale-95 transition-all flex items-center gap-1 text-xs font-bold"
            style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--text)' }}
            title="Refresh database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-all"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Actions Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Total Matches Card */}
        <div
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          className="p-3.5 rounded-2xl border flex items-center justify-between"
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Total Matches</div>
            <div className="text-2xl font-black mt-0.5" style={{ color: 'var(--text)' }}>{matches.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        {/* Upload Match JSON */}
        <label
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          className="p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer hover:border-[var(--primary)] transition-all"
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Update / Import</div>
            <div className="text-sm font-black mt-0.5" style={{ color: 'var(--primary)' }}>Upload Match JSON</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
            <Upload className="w-5 h-5" />
          </div>
          <input type="file" accept=".json" onChange={handleUploadJSON} className="hidden" />
        </label>

        {/* Purge All Matches */}
        <button
          onClick={() => setConfirmDeleteAll(true)}
          className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex items-center justify-between hover:bg-rose-500/20 active:scale-98 transition-all text-left"
        >
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Danger Zone</div>
            <div className="text-sm font-black text-rose-300">Delete All Matches</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* Main Content: Match List + Event Stream Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
        {/* Left Column: Match List (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1 text-xs font-bold" style={{ color: 'var(--muted)' }}>
            <span>ACTIVE MATCHES & RECORDS ({matches.length})</span>
            <span>Click match to inspect event stream</span>
          </div>

          {matches.length === 0 ? (
            <div
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
              className="p-8 rounded-3xl border text-center text-xs"
            >
              No matches found in database.
            </div>
          ) : (
            matches.map((m) => {
              const inn1 = m.innings?.[0] || { score: 0, wickets: 0 };
              const inn2 = m.innings?.[1] || { score: 0, wickets: 0 };
              const isSelected = inspectingMatch?.matchId === m.matchId;

              return (
                <div
                  key={m.matchId}
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border)'
                  }}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2 shadow-sm ${
                    isSelected ? 'ring-2 ring-[var(--primary)]/30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        #{m.code || 'MATCH'}
                      </span>
                      <span className="text-xs font-black truncate" style={{ color: 'var(--text)' }}>
                        {m.teams?.[0]?.name || 'Team 1'} vs {m.teams?.[1]?.name || 'Team 2'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        m.status === 'completed'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {m.status || 'in_progress'}
                    </span>
                  </div>

                  {/* Scores summary */}
                  <div className="text-xs font-semibold flex items-center justify-between" style={{ color: 'var(--muted)' }}>
                    <span>
                      Scores: <strong style={{ color: 'var(--text)' }}>{inn1.score}/{inn1.wickets}</strong>
                      {m.currentInningsIndex === 1 && (
                        <span> vs <strong style={{ color: 'var(--text)' }}>{inn2.score}/{inn2.wickets}</strong></span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono">
                      {m.overs} ov • {m.playersPerTeam || 11} players
                    </span>
                  </div>

                  {/* Restrictions & Viewer info */}
                  <div className="text-[11px] flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    <span>
                      Viewers:{' '}
                      <strong style={{ color: m.isViewerRestricted ? 'var(--red)' : 'var(--green)' }}>
                        {m.isViewerRestricted ? 'Restricted' : m.maxViewers != null ? `Max ${m.maxViewers}` : 'Unlimited'}
                      </strong>
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-1.5 pt-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleInspectMatch(m)}
                        style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        className="px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <FileCode className="w-3.5 h-3.5 text-blue-400" />
                        <span>Inspect Events</span>
                      </button>

                      <button
                        onClick={() => handleDownloadJSON(m)}
                        style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        className="px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                        title="Download Match JSON"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-400" />
                        <span>JSON</span>
                      </button>

                      <button
                        onClick={() => {
                          setRestrictionModalMatch(m);
                          setMaxViewersInput(m.maxViewers != null ? String(m.maxViewers) : '');
                          setIsRestrictedToggle(Boolean(m.isViewerRestricted));
                        }}
                        style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        className="px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                        title="Restrict Viewers"
                      >
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>Restrict</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteMatch(m.matchId)}
                      className="p-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all"
                      title="Delete Match at Any Instance"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Event Stream / Messages Inspector (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          <div className="px-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            EVENT STREAM & MESSAGE RECORD
          </div>

          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="p-4 rounded-3xl border flex flex-col gap-3 min-h-[350px] max-h-[600px] overflow-y-auto font-mono text-xs"
          >
            {!inspectingMatch ? (
              <div className="m-auto text-center p-4" style={{ color: 'var(--muted)' }}>
                Select any match from the left list to inspect its complete real-time chronological event stream and message payloads.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <strong style={{ color: 'var(--text)' }}>#{inspectingMatch.code}</strong>
                    <span className="block text-[10px]" style={{ color: 'var(--muted)' }}>{inspectingMatch.matchId}</span>
                  </div>
                  <button
                    onClick={() => onOpenMatch?.(inspectingMatch)}
                    style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
                    className="px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center gap-1"
                  >
                    <span>Open in App</span>
                  </button>
                </div>

                {!selectedMatchEvents ? (
                  <div className="text-center py-8" style={{ color: 'var(--muted)' }}>Loading events...</div>
                ) : selectedMatchEvents.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--muted)' }}>No recorded events found.</div>
                ) : (
                  selectedMatchEvents.map((ev, i) => (
                    <div
                      key={ev.id || i}
                      style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
                      className="p-2 rounded-xl border flex flex-col gap-1 text-[11px]"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span style={{ color: 'var(--primary)' }}>#{ev.seq || i + 1} {ev.type}</span>
                        <span style={{ color: 'var(--muted)' }} className="text-[10px]">
                          {ev.ts ? new Date(ev.ts).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <pre className="text-[10px] overflow-x-auto p-1 rounded bg-black/20" style={{ color: 'var(--text)' }}>
                        {JSON.stringify(ev.payload || {}, null, 1)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Confirm Delete All Matches */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="w-full max-w-md rounded-3xl border p-5 shadow-2xl flex flex-col gap-3.5"
          >
            <div className="flex items-center gap-2 text-rose-500 font-black">
              <AlertTriangle className="w-5 h-5" />
              <span>DELETE ALL MATCHES CONFIRMATION</span>
            </div>
            <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--muted)' }}>
              This will permanently delete ALL matches and ball-by-ball event history from both Firebase Firestore and local device databases. This action cannot be reversed.
            </p>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-rose-400">
                Type DELETE to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-xl border px-3 py-2 text-sm font-mono focus:outline-none focus:border-rose-500"
                style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setConfirmDeleteAll(false);
                  setDeleteConfirmationInput('');
                }}
                style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--text)' }}
                className="flex-1 py-2.5 rounded-xl border font-bold text-xs"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirmationInput !== 'DELETE'}
                onClick={handleDeleteAllMatches}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-black text-xs disabled:opacity-40 shadow-lg shadow-rose-900/50 hover:bg-rose-700"
              >
                Confirm Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Restrict Viewers Modal */}
      {restrictionModalMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="w-full max-w-sm rounded-3xl border p-5 shadow-2xl flex flex-col gap-3.5"
          >
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-black text-sm uppercase tracking-wider">Restrict Viewers</h3>
              <button onClick={() => setRestrictionModalMatch(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider block mb-1 text-[10px]" style={{ color: 'var(--muted)' }}>
                  Max Concurrent Viewers Limit
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxViewersInput}
                  onChange={(e) => setMaxViewersInput(e.target.value)}
                  placeholder="Leave blank for unlimited, or enter 5, 10, 0"
                  className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                  style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                <span className="text-[10px] mt-1 block" style={{ color: 'var(--muted)' }}>
                  Enter 0 to disallow all viewers, or set a cap.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="lockPrivate"
                  checked={isRestrictedToggle}
                  onChange={(e) => setIsRestrictedToggle(e.target.checked)}
                  className="w-4 h-4 rounded text-[var(--primary)]"
                />
                <label htmlFor="lockPrivate" className="font-bold cursor-pointer" style={{ color: 'var(--text)' }}>
                  Completely lock match (Private mode)
                </label>
              </div>

              <button
                onClick={handleSaveRestrictions}
                style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
                className="w-full py-2.5 rounded-xl font-bold mt-2 shadow-md active:scale-95 transition-all"
              >
                Save Viewer Restrictions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
