import {
  getMatchSnapshot,
  getEventsForMatch,
  getAllLocalMatches,
  getAllLocalEvents,
  saveMatchSnapshot,
  saveEventLocally
} from '../store/localDb.js';

export const BACKUP_SCHEMA_VERSION = 1;
export const CURRENT_APP_VERSION = '1.3.3';

/**
 * Requirement 1: Export single match to JSON archive.
 */
export async function exportSingleMatch(matchId) {
  if (!matchId) throw new Error('Match ID is required to export single match');
  const snapshot = await getMatchSnapshot(matchId);
  const events = await getEventsForMatch(matchId);

  const archive = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: Date.now(),
    appVersion: CURRENT_APP_VERSION,
    type: 'single_match',
    matchId,
    matches: snapshot ? [snapshot] : [],
    events: events || []
  };

  return archive;
}

/**
 * Requirement 2: Backup All My Matches to single archive.
 */
export async function exportAllMatches() {
  const matches = await getAllLocalMatches();
  const events = await getAllLocalEvents();

  let teams = [];
  let tournaments = [];
  try {
    teams = JSON.parse(localStorage.getItem('cricket_saved_teams') || '[]');
  } catch {}
  try {
    tournaments = JSON.parse(localStorage.getItem('cricket_tournaments') || '[]');
  } catch {}

  const archive = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: Date.now(),
    appVersion: CURRENT_APP_VERSION,
    type: 'full_archive',
    matches: matches || [],
    events: events || [],
    teams: teams || [],
    tournaments: tournaments || []
  };

  return archive;
}

/**
 * Requirement 4: Platform-aware file download and share handler.
 * Web: Blob download + Web Share fallback.
 * Android: Capacitor Filesystem (write to Documents/Downloads) + Capacitor Share.
 */
export async function downloadOrShareBackup(filename, dataObj, options = {}) {
  const { preferShare = false } = options;
  const jsonContent = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj, null, 2);

  // 1. Capacitor Android Native Platform Handling
  const isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
  if (isNative) {
    try {
      const fsPlugin = window.Capacitor?.Plugins?.Filesystem;
      const sharePlugin = window.Capacitor?.Plugins?.Share;

      if (fsPlugin?.writeFile) {
        // Write to Documents / Cache
        const writeResult = await fsPlugin.writeFile({
          path: filename,
          data: jsonContent,
          directory: 'DOCUMENTS',
          encoding: 'utf8',
          recursive: true
        });

        const fileUri = writeResult?.uri;

        if (preferShare && sharePlugin?.share && fileUri) {
          await sharePlugin.share({
            title: filename,
            text: 'SmartCricket Match Backup',
            url: fileUri,
            dialogTitle: 'Share SmartCricket Backup'
          });
          return { success: true, method: 'capacitor_share', uri: fileUri };
        }

        return { success: true, method: 'capacitor_filesystem', uri: fileUri, path: filename };
      }
    } catch (err) {
      console.warn('[Backup] Capacitor filesystem/share failed, falling back to Web Blob:', err);
    }
  }

  // 2. Web Share API (Mobile Browsers supporting navigator.share with files)
  if (preferShare && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], filename, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
          text: 'SmartCricket Match Backup Archive'
        });
        return { success: true, method: 'web_share' };
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[Backup] Web share cancelled or failed, falling back to download link:', err);
      } else {
        return { success: true, method: 'cancelled_by_user' };
      }
    }
  }

  // 3. Web Standard Blob Download
  if (typeof document !== 'undefined') {
    try {
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return { success: true, method: 'web_blob_download' };
    } catch (err) {
      console.error('[Backup] Blob download failed:', err);
      throw new Error('Failed to download backup file. Please verify browser storage permissions.');
    }
  }

  return { success: true, method: 'noop' };
}

/**
 * Requirement 3: Validates schema, version, and inspects incoming archive for preview summary.
 */
export async function validateAndInspectBackup(rawInput) {
  let data;
  if (typeof rawInput === 'string') {
    try {
      data = JSON.parse(rawInput);
    } catch {
      throw new Error('Invalid JSON file format. Could not parse backup archive.');
    }
  } else {
    data = rawInput;
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup data structure.');
  }

  // Validate schema version
  if (!data.schemaVersion || typeof data.schemaVersion !== 'number') {
    throw new Error('Unrecognized or missing backup schemaVersion.');
  }

  if (data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new Error(`Backup schema version (${data.schemaVersion}) is newer than this app version supports.`);
  }

  // Normalize single-match vs full archive
  let incomingMatches = [];
  if (Array.isArray(data.matches)) {
    incomingMatches = data.matches;
  } else if (data.match && typeof data.match === 'object') {
    incomingMatches = [data.match];
  } else if (data.matchId) {
    incomingMatches = [{ matchId: data.matchId }];
  }

  const incomingEvents = Array.isArray(data.events) ? data.events : [];
  const incomingTeams = Array.isArray(data.teams) ? data.teams : [];
  const incomingTournaments = Array.isArray(data.tournaments) ? data.tournaments : [];

  if (incomingMatches.length === 0 && incomingEvents.length === 0 && incomingTeams.length === 0) {
    throw new Error('Archive contains no matches, events, or teams to restore.');
  }

  // Fetch local matches to detect conflicts and duplicates
  const existingMatches = await getAllLocalMatches();
  const existingMap = new Map();
  for (const m of existingMatches) {
    const id = m.matchId || m.id;
    if (id) existingMap.set(id, m);
  }

  // Group incoming events by matchId
  const incomingEventsByMatch = new Map();
  for (const ev of incomingEvents) {
    if (ev?.matchId) {
      if (!incomingEventsByMatch.has(ev.matchId)) incomingEventsByMatch.set(ev.matchId, []);
      incomingEventsByMatch.get(ev.matchId).push(ev);
    }
  }

  let newMatchesCount = 0;
  let conflictsCount = 0;
  let duplicatesCount = 0;
  const matchDecisions = [];

  for (const incMatch of incomingMatches) {
    const mid = incMatch.matchId || incMatch.id;
    if (!mid) continue;

    const existing = existingMap.get(mid);
    if (!existing) {
      newMatchesCount++;
      matchDecisions.push({
        matchId: mid,
        code: incMatch.code || '',
        action: 'create_new',
        reason: 'Not present locally'
      });
      continue;
    }

    // Compare local max seq with incoming max seq
    const localEvents = await getEventsForMatch(mid);
    const incEvents = incomingEventsByMatch.get(mid) || [];

    const localMaxSeq = localEvents.reduce((max, e) => Math.max(max, e.seq || 0), 0);
    const incMaxSeq = incEvents.reduce((max, e) => Math.max(max, e.seq || 0), 0);

    if (incMaxSeq > localMaxSeq) {
      conflictsCount++;
      matchDecisions.push({
        matchId: mid,
        code: incMatch.code || existing.code || '',
        action: 'update_with_incoming',
        localMaxSeq,
        incMaxSeq,
        reason: `Incoming has more deliveries (${incMaxSeq} > ${localMaxSeq})`
      });
    } else if (incMaxSeq === localMaxSeq) {
      duplicatesCount++;
      matchDecisions.push({
        matchId: mid,
        code: incMatch.code || existing.code || '',
        action: 'skip_duplicate',
        localMaxSeq,
        incMaxSeq,
        reason: 'Identical progress'
      });
    } else {
      conflictsCount++;
      matchDecisions.push({
        matchId: mid,
        code: incMatch.code || existing.code || '',
        action: 'keep_local',
        localMaxSeq,
        incMaxSeq,
        reason: `Local has more deliveries (${localMaxSeq} > ${incMaxSeq})`
      });
    }
  }

  const summaryText = `${newMatchesCount} matches, ${incomingTeams.length} teams will be added, ${conflictsCount} conflicts`;

  return {
    valid: true,
    schemaVersion: data.schemaVersion,
    appVersion: data.appVersion || 'Unknown',
    exportedAt: data.exportedAt || Date.now(),
    type: data.type || (incomingMatches.length === 1 ? 'single_match' : 'full_archive'),
    newMatchesCount,
    newTeamsCount: incomingTeams.length,
    conflictsCount,
    duplicatesCount,
    summaryText,
    matchDecisions,
    incomingMatches,
    incomingEvents,
    incomingTeams,
    incomingTournaments
  };
}

/**
 * Requirement 3: Applies restore after user confirmation, merging by matchId and higher max seq.
 */
export async function executeRestore(inspectionResult, onProgress = () => {}) {
  if (!inspectionResult || !inspectionResult.valid) {
    throw new Error('Cannot execute restore on invalid inspection report.');
  }

  const {
    matchDecisions,
    incomingMatches,
    incomingEvents,
    incomingTeams,
    incomingTournaments
  } = inspectionResult;

  const totalSteps = matchDecisions.length + (incomingTeams.length > 0 ? 1 : 0) + 1;
  let currentStep = 0;

  const reportProgress = (stepName) => {
    currentStep++;
    const percent = Math.min(100, Math.round((currentStep / totalSteps) * 100));
    onProgress({ percent, currentStep, totalSteps, stepName });
  };

  // Index incoming events by matchId
  const eventsByMatch = new Map();
  for (const ev of incomingEvents) {
    if (ev?.matchId) {
      if (!eventsByMatch.has(ev.matchId)) eventsByMatch.set(ev.matchId, []);
      eventsByMatch.get(ev.matchId).push(ev);
    }
  }

  let restoredMatchesCount = 0;
  let skippedDuplicatesCount = 0;
  let resolvedConflictsCount = 0;

  for (const decision of matchDecisions) {
    const mid = decision.matchId;
    const matchData = incomingMatches.find(m => (m.matchId || m.id) === mid) || { matchId: mid };
    const matchEvs = eventsByMatch.get(mid) || [];

    if (decision.action === 'skip_duplicate') {
      skippedDuplicatesCount++;
      reportProgress(`Skipping duplicate match ${decision.code || mid}`);
      continue;
    }

    if (decision.action === 'keep_local') {
      resolvedConflictsCount++;
      reportProgress(`Preserved newer local match ${decision.code || mid}`);
      continue;
    }

    if (decision.action === 'create_new' || decision.action === 'update_with_incoming') {
      // Save all incoming events locally
      for (const ev of matchEvs) {
        await saveEventLocally(ev, false);
      }

      // Save match snapshot locally
      await saveMatchSnapshot(mid, matchData);

      if (decision.action === 'create_new') {
        restoredMatchesCount++;
      } else {
        resolvedConflictsCount++;
      }

      reportProgress(`Restored match ${decision.code || mid}`);
    }
  }

  // Restore Teams if present
  if (incomingTeams.length > 0) {
    try {
      const existingTeams = JSON.parse(localStorage.getItem('cricket_saved_teams') || '[]');
      const teamMap = new Map();
      existingTeams.forEach(t => teamMap.set(t.name, t));
      incomingTeams.forEach(t => teamMap.set(t.name, t));
      localStorage.setItem('cricket_saved_teams', JSON.stringify(Array.from(teamMap.values())));
    } catch {}
    reportProgress('Restored saved team rosters');
  }

  // Restore Tournaments if present
  if (incomingTournaments.length > 0) {
    try {
      const existingTourns = JSON.parse(localStorage.getItem('cricket_tournaments') || '[]');
      const tournMap = new Map();
      existingTourns.forEach(t => tournMap.set(t.id || t.name, t));
      incomingTournaments.forEach(t => tournMap.set(t.id || t.name, t));
      localStorage.setItem('cricket_tournaments', JSON.stringify(Array.from(tournMap.values())));
    } catch {}
    reportProgress('Restored tournament history');
  }

  reportProgress('Restore completed');

  return {
    success: true,
    restoredMatchesCount,
    skippedDuplicatesCount,
    resolvedConflictsCount,
    restoredTeamsCount: incomingTeams.length,
    restoredTournamentsCount: incomingTournaments.length
  };
}
