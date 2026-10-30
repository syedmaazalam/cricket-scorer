import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Download,
  Upload,
  RefreshCw,
  ArrowLeft,
  Users,
  Check,
  Copy,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronUp,
  FileCode,
  FileJson,
  AlertCircle,
  Radio,
  Clock,
  LogOut,
  Calendar,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  getAllMatchesFromCloud,
  getAllManagersFromCloud,
  saveUploadedMatchToCloud,
  deleteMatchFromCloud,
  deriveMatchDisplayScore,
  generateMatchCode
} from '../firebase/matches.js';
import {
  getAllLocalMatches,
  getAllLocalManagers,
  saveMatchSnapshot,
  saveEventLocally,
  getEventsForMatch
} from '../store/localDb.js';
import { replayEvents } from '../engine/reducer.js';
import ThemeToggle from '../components/ThemeToggle.jsx';

// Check developer authorization
function checkIsDeveloper(user, idTokenResult) {
  if (!user) return false;
  if (idTokenResult?.claims?.developer === true) return true;
  if (user.email && (user.email === 'syedmaazalam@gmail.com' || user.email.endsWith('@smartcricket.app'))) {
    return true;
  }
  const allowlistedUids = (import.meta.env.VITE_DEVELOPER_UIDS || '').split(',').map(u => u.trim());
  if (allowlistedUids.includes(user.uid)) return true;
  return false;
}

// String sanitizer helper
function sanitizeString(str, maxLength = 80) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, maxLength);
}

export default function DeveloperDashboard({ onBack, onOpenMatch }) {
  const auth = getAuth();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [isDeveloperUser, setIsDeveloperUser] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Sign In form
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Tabs: 'managers' | 'matches' | 'import'
  const [activeTab, setActiveTab] = useState('matches');

  // Data state
  const [matches, setMatches] = useState([]);
  const [managers, setManagers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Filter / Search states
  const [matchSearch, setMatchSearch] = useState('');
  const [matchFilter, setMatchFilter] = useState('all'); // 'all' | 'live' | 'completed'
  const [managerFilter, setManagerFilter] = useState('all');

  const [managerSearch, setManagerSearch] = useState('');
  const [managerSort, setManagerSort] = useState('matches'); // 'matches' | 'lastActive' | 'name'
  const [expandedManagerId, setExpandedManagerId] = useState(null);

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [duplicateConflict, setDuplicateConflict] = useState(null);
  const fileInputRef = useRef(null);

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const isDev = checkIsDeveloper(user, tokenResult);
          setIsDeveloperUser(isDev);
          if (!isDev) {
            setAuthError('Access denied: Account does not have developer privileges.');
          }
        } catch (e) {
          setIsDeveloperUser(false);
        }
      } else {
        setIsDeveloperUser(false);
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleDeveloperLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput.trim());
      const tokenResult = await cred.user.getIdTokenResult();
      const isDev = checkIsDeveloper(cred.user, tokenResult);
      if (!isDev) {
        setIsDeveloperUser(false);
        setAuthError('Access denied: This account is not authorized as a Developer.');
      } else {
        setIsDeveloperUser(true);
      }
    } catch (err) {
      setAuthError(err.message || 'Developer authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDeveloperLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setIsDeveloperUser(false);
    } catch (e) {}
  };

  // Load matches and managers
  const loadConsoleData = async () => {
    setIsLoadingData(true);
    try {
      const [cloudMatches, localMatches, cloudManagers, localManagers] = await Promise.all([
        getAllMatchesFromCloud(),
        getAllLocalMatches(),
        getAllManagersFromCloud(),
        getAllLocalManagers()
      ]);

      // Merge matches
      const matchMap = new Map();
      cloudMatches.forEach(m => matchMap.set(m.matchId, { ...m, source: 'cloud' }));
      localMatches.forEach(m => {
        if (!matchMap.has(m.matchId)) {
          matchMap.set(m.matchId, { ...m, source: 'local' });
        }
      });
      const mergedMatches = Array.from(matchMap.values());
      mergedMatches.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      setMatches(mergedMatches);

      // Merge managers
      const managerMap = new Map();
      cloudManagers.forEach(mgr => managerMap.set(mgr.uid, mgr));
      localManagers.forEach(mgr => {
        if (!managerMap.has(mgr.uid)) {
          managerMap.set(mgr.uid, mgr);
        }
      });
      setManagers(Array.from(managerMap.values()));
    } catch (err) {
      console.warn('Error loading developer console data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isDeveloperUser) {
      loadConsoleData();
    }
  }, [isDeveloperUser]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyCode = (e, code) => {
    e.stopPropagation();
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Export match to JSON
  const handleExportMatch = async (e, m) => {
    e.stopPropagation();
    try {
      const localEvents = await getEventsForMatch(m.matchId);
      const exportObject = {
        app: 'SmartCricket',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        matchId: m.matchId,
        code: m.code,
        matchState: {
          overs: m.overs || 20,
          playersPerTeam: m.playersPerTeam || 11,
          teams: m.teams || [],
          toss: m.toss || null,
          status: m.status || 'in_progress',
          innings: m.innings || [],
          target: m.target || null,
          winner: m.winner || null,
          resultSummary: m.resultSummary || null
        },
        events: localEvents
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `SmartCricket_${m.code || m.matchId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`Exported ${m.code || m.matchId} successfully.`);
    } catch (err) {
      showToast('Export failed: ' + err.message);
    }
  };

  // Import JSON processing
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) processImportFile(file);
  };

  const processImportFile = (file) => {
    setImportError(null);
    setImportPreview(null);
    setDuplicateConflict(null);

    if (!file.name.endsWith('.json')) {
      setImportError('Invalid file type. Please upload a .json file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImportError('File exceeds maximum allowed size of 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);

        // Validation rule: basic schema
        if (!parsed || typeof parsed !== 'object') {
          setImportError('Invalid JSON structure.');
          return;
        }

        const teams = parsed.matchState?.teams || parsed.teams;
        if (!teams || !Array.isArray(teams) || teams.length < 2) {
          setImportError('Invalid match file: missing required teams data (at least 2 teams required).');
          return;
        }

        const events = parsed.events || [];
        if (!Array.isArray(events)) {
          setImportError('Invalid match file: events stream must be an array.');
          return;
        }

        // Replay events to validate event stream integrity
        let computedState = null;
        try {
          if (events.length > 0) {
            computedState = replayEvents(events);
          }
        } catch (replayErr) {
          setImportError('Match replay validation failed: file contains invalid or corrupted event stream.');
          return;
        }

        const matchId = sanitizeString(parsed.matchId || `match_${Date.now()}`);
        const code = sanitizeString(parsed.code || generateMatchCode(), 6).toUpperCase();
        const scoreInfo = deriveMatchDisplayScore(parsed.matchState || parsed, events);

        // Preview object
        const preview = {
          fileRaw: parsed,
          matchId,
          code,
          teams: [
            sanitizeString(teams[0]?.name || 'Team 1'),
            sanitizeString(teams[1]?.name || 'Team 2')
          ],
          overs: parsed.matchState?.overs || parsed.overs || 20,
          ballCount: events.filter(e => e.type === 'BALL').length,
          scoreInfo,
          computedState,
          events
        };

        setImportPreview(preview);

        // Check if duplicate exists
        const exists = matches.some(m => m.matchId === matchId || m.code === code);
        if (exists) {
          setDuplicateConflict({
            existingMatchId: matchId,
            existingCode: code
          });
        }
      } catch (jsonErr) {
        setImportError('Invalid JSON syntax. Please verify file integrity.');
      }
    };
    reader.onerror = () => setImportError('Failed to read file.');
    reader.readAsText(file);
  };

  const commitImport = async (strategy = 'direct') => {
    if (!importPreview) return;
    setIsProcessingImport(true);

    try {
      let finalMatchId = importPreview.matchId;
      let finalCode = importPreview.code;

      if (strategy === 'copy') {
        finalMatchId = `match_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        finalCode = generateMatchCode();
      }

      // Assign current developer / manager identity (ignoring file's manager field)
      const currentMgrId = currentUser?.uid || 'developer';
      const currentMgrName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Developer';
      const currentMgrEmail = currentUser?.email || '';

      const matchData = {
        matchId: finalMatchId,
        code: finalCode,
        overs: importPreview.overs,
        teams: [
          { name: importPreview.teams[0] },
          { name: importPreview.teams[1] }
        ],
        status: importPreview.computedState?.status || importPreview.fileRaw.matchState?.status || 'completed',
        innings: importPreview.computedState?.innings || importPreview.fileRaw.matchState?.innings || [],
        target: importPreview.computedState?.target || importPreview.fileRaw.matchState?.target || null,
        resultSummary: importPreview.computedState?.resultSummary || importPreview.fileRaw.matchState?.resultSummary || null,
        managerId: currentMgrId,
        managerName: currentMgrName,
        managerEmail: currentMgrEmail,
        updatedAt: Date.now()
      };

      // Re-map events with sanitized matchId
      const finalEvents = importPreview.events.map((ev, idx) => ({
        ...ev,
        matchId: finalMatchId,
        seq: ev.seq || (idx + 1)
      }));

      // 1. Save locally (offline first)
      await saveMatchSnapshot(finalMatchId, matchData);
      for (const ev of finalEvents) {
        await saveEventLocally(ev, true);
      }

      // 2. Sync to Cloud
      try {
        await saveUploadedMatchToCloud(finalMatchId, matchData, finalEvents);
      } catch (cloudErr) {
        console.warn('Cloud sync error during import, saved locally:', cloudErr);
      }

      showToast(`Match ${finalCode} imported successfully.`);
      setImportPreview(null);
      setDuplicateConflict(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadConsoleData();
    } catch (err) {
      setImportError('Import failed: ' + err.message);
    } finally {
      setIsProcessingImport(false);
    }
  };

  // Filtered lists
  const filteredMatches = matches.filter(m => {
    if (matchFilter === 'live' && !(m.status === 'live' || m.status === 'in_progress')) return false;
    if (matchFilter === 'completed' && !(m.status === 'completed' || m.winner)) return false;
    if (managerFilter !== 'all' && m.managerId !== managerFilter) return false;

    if (matchSearch.trim()) {
      const q = matchSearch.toLowerCase();
      const t1 = (m.teams?.[0]?.name || '').toLowerCase();
      const t2 = (m.teams?.[1]?.name || '').toLowerCase();
      const c = (m.code || '').toLowerCase();
      const mgr = (m.managerName || '').toLowerCase();
      if (!t1.includes(q) && !t2.includes(q) && !c.includes(q) && !mgr.includes(q)) return false;
    }
    return true;
  });

  const filteredManagers = managers.filter(mgr => {
    if (managerSearch.trim()) {
      const q = managerSearch.toLowerCase();
      const n = (mgr.name || '').toLowerCase();
      const e = (mgr.email || '').toLowerCase();
      if (!n.includes(q) && !e.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (managerSort === 'name') return (a.name || '').localeCompare(b.name || '');
    if (managerSort === 'lastActive') return (b.lastActive || 0) - (a.lastActive || 0);
    // Sort by match count
    const aCount = matches.filter(m => m.managerId === a.uid).length;
    const bCount = matches.filter(m => m.managerId === b.uid).length;
    return bCount - aCount;
  });

  // Calculate stat totals
  const totalMatchesCount = matches.length;
  const liveMatchesCount = matches.filter(m => m.status === 'live' || m.status === 'in_progress').length;
  const completedMatchesCount = matches.filter(m => m.status === 'completed' || m.winner).length;
  const totalManagersCount = managers.length;

  // 1. Unauthenticated Developer Screen
  if (authChecking) {
    return (
      <div style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }} className="min-h-screen flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <RefreshCw className="w-4 h-4 animate-spin text-[#22C55E]" />
          <span>Verifying developer session...</span>
        </div>
      </div>
    );
  }

  if (!isDeveloperUser) {
    return (
      <div
        style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
        className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto"
      >
        <div
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
          className="app-card w-full p-6 flex flex-col gap-4 shadow-xl border"
        >
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-base font-bold m-0" style={{ color: 'var(--text)' }}>
                  Developer Console
                </h2>
                <p className="text-[11px] m-0" style={{ color: 'var(--muted)' }}>
                  Authorized administrative control panel
                </p>
              </div>
            </div>

            <button
              onClick={onBack}
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              className="p-1.5 rounded-lg border hover:text-[var(--text)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {authError && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleDeveloperLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium uppercase mb-1" style={{ color: 'var(--muted)' }}>
                Developer Email
              </label>
              <input
                type="email"
                placeholder="developer@smartcricket.app"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full px-3 py-2.5 rounded-lg border text-xs focus:outline-none focus:border-[#22C55E]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase mb-1" style={{ color: 'var(--muted)' }}>
                Developer Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full px-3 py-2.5 rounded-lg border text-xs focus:outline-none focus:border-[#22C55E]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              style={{
                backgroundColor: '#22C55E',
                color: '#FFFFFF'
              }}
              className="w-full py-2.5 rounded-lg font-semibold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-1.5 mt-2"
            >
              {authLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate Developer</span>
                </>
              )}
            </button>
          </form>

          <p className="text-[10px] text-center" style={{ color: 'var(--muted)' }}>
            Restricted portal. Protected by Firebase Authentication and Firestore security rules.
          </p>
        </div>
      </div>
    );
  }

  // 2. Authenticated Developer Portal
  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col transition-colors pb-12"
    >
      {/* Sticky Header */}
      <header
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)'
        }}
        className="sticky top-0 z-30 px-4 py-3 border-b shadow-sm flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            className="p-2 rounded-lg border hover:text-[var(--text)] transition-colors"
            title="Back to App"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold m-0 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <span>Developer Console</span>
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            </h1>
            <p className="text-[10px] m-0" style={{ color: 'var(--muted)' }}>
              Authenticated as {currentUser?.email || 'Developer'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadConsoleData}
            title="Refresh Data"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            className="p-2 rounded-lg border hover:text-[#22C55E] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
          </button>
          <ThemeToggle />
          <button
            onClick={handleDeveloperLogout}
            title="Log Out"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            className="p-2 rounded-lg border hover:text-[var(--red)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full p-4 flex flex-col gap-5">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white" title="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Top Summary Stat Cards (4 Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Total Managers */}
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="app-card p-3.5 border flex flex-col gap-1 shadow-sm"
          >
            <span className="text-[11px] font-medium uppercase" style={{ color: 'var(--muted)' }}>
              Total Managers
            </span>
            <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              {totalManagersCount}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Registered Organizers</span>
          </div>

          {/* Card 2: Total Matches */}
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="app-card p-3.5 border flex flex-col gap-1 shadow-sm"
          >
            <span className="text-[11px] font-medium uppercase" style={{ color: 'var(--muted)' }}>
              Total Matches
            </span>
            <div className="text-2xl font-bold text-[#22C55E]">
              {totalMatchesCount}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Cloud & Local Merged</span>
          </div>

          {/* Card 3: Live Now */}
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="app-card p-3.5 border flex flex-col gap-1 shadow-sm"
          >
            <span className="text-[11px] font-medium uppercase" style={{ color: 'var(--muted)' }}>
              Live Now
            </span>
            <div className="text-2xl font-bold text-[#22C55E] flex items-center gap-1.5">
              <span>{liveMatchesCount}</span>
              {liveMatchesCount > 0 && <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-ping" />}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Active Scoring Sessions</span>
          </div>

          {/* Card 4: Completed */}
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="app-card p-3.5 border flex flex-col gap-1 shadow-sm"
          >
            <span className="text-[11px] font-medium uppercase" style={{ color: 'var(--muted)' }}>
              Completed
            </span>
            <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              {completedMatchesCount}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Archived Match Records</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
          className="p-1 rounded-xl border flex items-center gap-1"
        >
          <button
            onClick={() => setActiveTab('managers')}
            style={{
              backgroundColor: activeTab === 'managers' ? 'var(--card)' : 'transparent',
              color: activeTab === 'managers' ? '#22C55E' : 'var(--muted)'
            }}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Managers ({managers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('matches')}
            style={{
              backgroundColor: activeTab === 'matches' ? 'var(--card)' : 'transparent',
              color: activeTab === 'matches' ? '#22C55E' : 'var(--muted)'
            }}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Matches ({matches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            style={{
              backgroundColor: activeTab === 'import' ? 'var(--card)' : 'transparent',
              color: activeTab === 'import' ? '#22C55E' : 'var(--muted)'
            }}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB A: MANAGERS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'managers' && (
          <div className="flex flex-col gap-4">
            {/* Search & Sort Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="relative w-full sm:max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search manager name or email..."
                  value={managerSearch}
                  onChange={(e) => setManagerSearch(e.target.value)}
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-medium text-[var(--muted)] shrink-0">Sort by:</span>
                <select
                  value={managerSort}
                  onChange={(e) => setManagerSort(e.target.value)}
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="px-2.5 py-2 rounded-lg border text-xs focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="matches">Most Matches</option>
                  <option value="lastActive">Recently Active</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Skeleton Loading State */}
            {isLoadingData && managers.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} className="app-card p-4 rounded-xl border animate-pulse flex flex-col gap-2">
                    <div className="h-4 bg-slate-700/30 rounded w-1/3" />
                    <div className="h-3 bg-slate-700/20 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {/* Managers List */}
            {filteredManagers.length === 0 && !isLoadingData ? (
              <div style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }} className="app-card p-8 text-center text-xs">
                No managers found matching criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredManagers.map((mgr) => {
                  const mgrMatches = matches.filter(m => m.managerId === mgr.uid);
                  const isExpanded = expandedManagerId === mgr.uid;
                  const initials = (mgr.name || 'Manager')
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={mgr.uid}
                      style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)'
                      }}
                      className="app-card p-4 rounded-xl border flex flex-col gap-3 shadow-sm hover:border-[#22C55E] transition-all"
                    >
                      {/* Top Row: Avatar Initials, Name, Email */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-xs sm:text-sm" style={{ color: 'var(--text)' }}>
                              {mgr.name || 'Manager'}
                            </div>
                            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                              {mgr.email || mgr.uid}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-[#22C55E] border border-emerald-500/20 text-[10px] font-semibold">
                            {mgrMatches.length} {mgrMatches.length === 1 ? 'match' : 'matches'}
                          </span>
                        </div>
                      </div>

                      {/* Detail metadata: Join date & Last active */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                        <div>
                          <span>Joined: </span>
                          <span style={{ color: 'var(--text)' }}>
                            {mgr.createdAt ? new Date(mgr.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span>Last Active: </span>
                          <span style={{ color: 'var(--text)' }}>
                            {mgr.lastActive ? new Date(mgr.lastActive).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => setExpandedManagerId(isExpanded ? null : mgr.uid)}
                        style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                        className="py-1.5 px-2 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 hover:text-[#22C55E] transition-colors"
                      >
                        <span>{isExpanded ? 'Hide Matches' : `View ${mgrMatches.length} Matches`}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {/* Expanded Manager Matches */}
                      {isExpanded && (
                        <div className="pt-2 border-t flex flex-col gap-2 max-h-48 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                          {mgrMatches.length === 0 ? (
                            <span className="text-[11px] text-[var(--muted)] text-center py-2">
                              No matches recorded under this manager yet.
                            </span>
                          ) : (
                            mgrMatches.map(m => {
                              const score = deriveMatchDisplayScore(m);
                              return (
                                <div
                                  key={m.matchId}
                                  onClick={() => onOpenMatch?.(m.code || m.matchId)}
                                  style={{ backgroundColor: 'var(--card-alt)' }}
                                  className="p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer hover:border-[#22C55E] transition-all"
                                >
                                  <div>
                                    <div className="font-semibold text-xs" style={{ color: 'var(--text)' }}>
                                      {m.teams?.[0]?.name || 'T1'} vs {m.teams?.[1]?.name || 'T2'} ({m.code})
                                    </div>
                                    <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
                                      {score.inn1Text}
                                    </div>
                                  </div>
                                  <ExternalLink className="w-3.5 h-3.5 text-[#22C55E]" />
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB B: MATCHES TAB */}
        {/* ========================================================================= */}
        {activeTab === 'matches' && (
          <div className="flex flex-col gap-4">
            {/* Filters & Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder="Search team, player, manager, code..."
                  value={matchSearch}
                  onChange={(e) => setMatchSearch(e.target.value)}
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Status Filter */}
                <select
                  value={matchFilter}
                  onChange={(e) => setMatchFilter(e.target.value)}
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="px-2.5 py-2 rounded-lg border text-xs focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="all">All Statuses</option>
                  <option value="live">Live Now</option>
                  <option value="completed">Completed</option>
                </select>

                {/* Manager Filter */}
                <select
                  value={managerFilter}
                  onChange={(e) => setManagerFilter(e.target.value)}
                  style={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="px-2.5 py-2 rounded-lg border text-xs focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="all">All Managers</option>
                  {managers.map(mgr => (
                    <option key={mgr.uid} value={mgr.uid}>
                      {mgr.name || mgr.email || mgr.uid}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Matches List (2-column grid on desktop screens) */}
            {filteredMatches.length === 0 && !isLoadingData ? (
              <div style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }} className="app-card p-8 text-center text-xs">
                No matches found matching criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredMatches.map((m) => {
                  const t1 = m.teams?.[0]?.name || 'Team 1';
                  const t2 = m.teams?.[1]?.name || 'Team 2';
                  const code = m.code || '';
                  const isLive = m.status === 'live' || m.status === 'in_progress';
                  const scoreDerived = deriveMatchDisplayScore(m);
                  // Requirement: Matches without managerId show "Unknown manager", not a real name
                  const managerDisplayName = m.managerName || (m.managerId ? `Manager (${m.managerId.slice(0, 6)})` : 'Unknown manager');
                  const matchDate = m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '';

                  return (
                    <div
                      key={m.matchId || m.code}
                      style={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)'
                      }}
                      className="app-card p-4 rounded-xl border flex flex-col gap-3 shadow-sm hover:border-[#22C55E] transition-all"
                    >
                      {/* Top Header: Teams, Code Pill, Status Chip */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                            {t1} vs {t2}
                          </div>
                          <div className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
                            Manager: <strong style={{ color: 'var(--text)' }}>{managerDisplayName}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {code && (
                            <button
                              onClick={(e) => copyCode(e, code)}
                              style={{
                                backgroundColor: 'var(--card-alt)',
                                borderColor: 'var(--border)',
                                color: 'var(--muted)'
                              }}
                              className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                              title="Copy Match Code"
                            >
                              <span>{code}</span>
                              {copiedCode === code ? (
                                <span className="text-[9px] text-[#22C55E]">Copied</span>
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          )}

                          <span
                            style={{
                              backgroundColor: isLive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                              color: isLive ? '#22C55E' : 'var(--muted)',
                              borderColor: isLive ? 'rgba(34, 197, 94, 0.3)' : 'var(--border)'
                            }}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1"
                          >
                            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />}
                            <span>{isLive ? 'LIVE' : 'COMPLETED'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Correct Computed Scores */}
                      <div
                        style={{ backgroundColor: 'var(--card-alt)' }}
                        className="p-2.5 rounded-lg flex flex-col gap-1 text-xs"
                      >
                        <div className="font-semibold" style={{ color: 'var(--text)' }}>
                          {scoreDerived.inn1Text}
                          {scoreDerived.inn2Text && (
                            <span className="block mt-0.5">{scoreDerived.inn2Text}</span>
                          )}
                        </div>
                        {scoreDerived.resultText && (
                          <div className="text-[11px] font-medium text-[#22C55E] mt-0.5">
                            {scoreDerived.resultText}
                          </div>
                        )}
                        <div className="text-[10px] mt-0.5 flex items-center justify-between" style={{ color: 'var(--muted)' }}>
                          <span>{m.overs || 20} Overs Match</span>
                          <span>{matchDate}</span>
                        </div>
                      </div>

                      {/* Action Buttons: Open in App & Export JSON */}
                      <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                        <button
                          onClick={() => onOpenMatch?.(code || m.matchId)}
                          style={{
                            backgroundColor: '#22C55E',
                            color: '#FFFFFF'
                          }}
                          className="flex-1 py-2 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in App</span>
                        </button>

                        <button
                          onClick={(e) => handleExportMatch(e, m)}
                          style={{
                            backgroundColor: 'var(--card-alt)',
                            borderColor: 'var(--border)',
                            color: 'var(--text)'
                          }}
                          className="py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 hover:border-[#22C55E] active:scale-98 transition-all shadow-sm"
                          title="Export Full Match JSON"
                        >
                          <Download className="w-3.5 h-3.5 text-[#22C55E]" />
                          <span>Export JSON</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB C: IMPORT TAB */}
        {/* ========================================================================= */}
        {activeTab === 'import' && (
          <div className="flex flex-col gap-4 max-w-xl mx-auto w-full">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) processImportFile(file);
              }}
              style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)'
              }}
              className="app-card p-8 border-2 border-dashed rounded-xl flex flex-col items-center text-center gap-3 hover:border-[#22C55E] transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--text)' }}>
                  Drag and drop SmartCricket .json file here
                </h3>
                <p className="text-xs m-0 mt-1" style={{ color: 'var(--muted)' }}>
                  Accepts .json match exports up to 5 MB
                </p>
              </div>
              <button
                type="button"
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="px-3.5 py-2 rounded-lg border text-xs font-semibold hover:border-[#22C55E] transition-all"
              >
                Choose File
              </button>
            </div>

            {/* Error Message */}
            {importError && (
              <div className="p-3.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Pre-Import Preview Card */}
            {importPreview && (
              <div
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)'
                }}
                className="app-card p-4 rounded-xl border flex flex-col gap-3 shadow-md"
              >
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-xs" style={{ color: 'var(--text)' }}>
                      Match Import Preview
                    </span>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-[#22C55E] border border-emerald-500/30 font-bold">
                    {importPreview.code}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Teams:</span>
                    <strong style={{ color: 'var(--text)' }}>
                      {importPreview.teams[0]} vs {importPreview.teams[1]}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Format:</span>
                    <span style={{ color: 'var(--text)' }}>{importPreview.overs} Overs</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Computed Score:</span>
                    <strong style={{ color: '#22C55E' }}>
                      {importPreview.scoreInfo.inn1Text} {importPreview.scoreInfo.inn2Text ? `• ${importPreview.scoreInfo.inn2Text}` : ''}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--muted)' }}>Total Balls:</span>
                    <span style={{ color: 'var(--text)' }}>{importPreview.ballCount} balls</span>
                  </div>
                </div>

                {/* Duplicate Conflict Handling */}
                {duplicateConflict ? (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex flex-col gap-2 mt-2">
                    <div className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>Duplicate Match Detected ({duplicateConflict.existingCode})</span>
                    </div>
                    <p className="text-[11px] text-amber-200/80 m-0">
                      A match with this ID or Code already exists in your database. How would you like to handle this?
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={() => commitImport('overwrite')}
                        disabled={isProcessingImport}
                        className="py-1.5 px-2 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-semibold hover:bg-red-500/30"
                      >
                        Overwrite
                      </button>
                      <button
                        onClick={() => commitImport('copy')}
                        disabled={isProcessingImport}
                        className="py-1.5 px-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold hover:bg-emerald-500/30"
                      >
                        Import as Copy
                      </button>
                      <button
                        onClick={() => {
                          setImportPreview(null);
                          setDuplicateConflict(null);
                        }}
                        className="py-1.5 px-2 rounded-lg border border-[var(--border)] text-[var(--muted)] text-[11px] font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => commitImport('direct')}
                      disabled={isProcessingImport}
                      style={{ backgroundColor: '#22C55E', color: '#FFFFFF' }}
                      className="flex-1 py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                    >
                      {isProcessingImport ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Confirm & Save Match</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setImportPreview(null)}
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                      className="py-2.5 px-3 rounded-lg border text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
