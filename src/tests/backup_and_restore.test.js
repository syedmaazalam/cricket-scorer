import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockStore = {};
globalThis.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => { mockStore[k] = String(v); globalThis.localStorage[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; delete globalThis.localStorage[k]; },
  clear: () => {
    Object.keys(mockStore).forEach(k => {
      delete mockStore[k];
      delete globalThis.localStorage[k];
    });
  },
  get length() { return Object.keys(mockStore).length; },
  key: (i) => Object.keys(mockStore)[i] || null
};

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    Capacitor: { Plugins: { Network: { addListener: vi.fn() } } }
  };
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    visibilityState: 'visible'
  };
}

import { EVENT_TYPES } from '../engine/constants.js';
import { createInitialMatchState, applyEvent, replayEvents } from '../engine/reducer.js';
import {
  saveMatchSnapshot,
  saveEventLocally,
  getMatchSnapshot,
  getEventsForMatch,
  deleteAllMatchesLocally
} from '../store/localDb.js';
import {
  exportSingleMatch,
  exportAllMatches,
  validateAndInspectBackup,
  executeRestore,
  BACKUP_SCHEMA_VERSION,
  CURRENT_APP_VERSION
} from '../services/backupService.js';

describe('Phase 3: Scorer-Friendly Backup & Restore', () => {
  const matchId = 'm_phase3_backup_test';

  beforeEach(async () => {
    localStorage.clear();
    await deleteAllMatchesLocally();
    vi.clearAllMocks();
  });

  describe('3.1 Single Match Export & Format', () => {
    it('exports a single match into a standardized JSON archive with schemaVersion, match snapshot, and events', async () => {
      const snapshot = {
        matchId,
        code: 'BKTEST',
        status: 'in_progress',
        overs: 5,
        score: 12,
        wickets: 1
      };
      await saveMatchSnapshot(matchId, snapshot);

      const ev1 = { id: `${matchId}_1`, seq: 1, matchId, type: EVENT_TYPES.MATCH_INIT, payload: { overs: 5 } };
      const ev2 = { id: `${matchId}_2`, seq: 2, matchId, type: EVENT_TYPES.BALL, payload: { runs: 6 } };
      await saveEventLocally(ev1, false);
      await saveEventLocally(ev2, false);

      const archive = await exportSingleMatch(matchId);

      expect(archive.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
      expect(archive.appVersion).toBe(CURRENT_APP_VERSION);
      expect(archive.type).toBe('single_match');
      expect(archive.matchId).toBe(matchId);
      expect(archive.matches.length).toBe(1);
      expect(archive.matches[0].code).toBe('BKTEST');
      expect(archive.events.length).toBe(2);
      expect(archive.events[1].payload.runs).toBe(6);
    });
  });

  describe('3.2 Full Database Archive ("Backup All My Matches")', () => {
    it('creates an all-inclusive archive containing all matches, events, saved teams, and tournament history', async () => {
      // Create match 1
      await saveMatchSnapshot('m_all_1', { matchId: 'm_all_1', code: 'ALL001' });
      await saveEventLocally({ id: 'm_all_1_1', seq: 1, matchId: 'm_all_1', type: EVENT_TYPES.MATCH_INIT }, false);

      // Create match 2
      await saveMatchSnapshot('m_all_2', { matchId: 'm_all_2', code: 'ALL002' });
      await saveEventLocally({ id: 'm_all_2_1', seq: 1, matchId: 'm_all_2', type: EVENT_TYPES.MATCH_INIT }, false);

      // Save custom teams and tournament
      localStorage.setItem('cricket_saved_teams', JSON.stringify([{ name: 'Lahore Qalandars', players: ['Shaheen', 'Fakhar'] }]));
      localStorage.setItem('cricket_tournaments', JSON.stringify([{ id: 't_psl', name: 'PSL 2026' }]));

      const fullArchive = await exportAllMatches();

      expect(fullArchive.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
      expect(fullArchive.type).toBe('full_archive');
      expect(fullArchive.matches.length).toBe(2);
      expect(fullArchive.events.length).toBe(2);
      expect(fullArchive.teams.length).toBe(1);
      expect(fullArchive.teams[0].name).toBe('Lahore Qalandars');
      expect(fullArchive.tournaments.length).toBe(1);
      expect(fullArchive.tournaments[0].name).toBe('PSL 2026');
    });
  });

  describe('3.3 Archive Validation & Conflict Pre-Inspection', () => {
    it('rejects invalid or corrupted archive structures', async () => {
      await expect(validateAndInspectBackup('corrupted string not json')).rejects.toThrow('Invalid JSON file format');
      await expect(validateAndInspectBackup({ invalid: true })).rejects.toThrow('missing backup schemaVersion');
      await expect(validateAndInspectBackup({ schemaVersion: 999 })).rejects.toThrow('newer than this app version');
    });

    it('generates an accurate pre-inspection summary differentiating new matches, conflicts, and duplicates', async () => {
      // Local DB has match M1 with 2 deliveries (max seq = 2)
      await saveMatchSnapshot('m_test_conflict', { matchId: 'm_test_conflict', code: 'CNFL01' });
      await saveEventLocally({ id: 'm_test_conflict_1', seq: 1, matchId: 'm_test_conflict', type: EVENT_TYPES.MATCH_INIT }, false);
      await saveEventLocally({ id: 'm_test_conflict_2', seq: 2, matchId: 'm_test_conflict', type: EVENT_TYPES.BALL, payload: { runs: 1 } }, false);

      // Local DB has match M2 with 4 deliveries (max seq = 4)
      await saveMatchSnapshot('m_test_local_newer', { matchId: 'm_test_local_newer', code: 'LOCAL4' });
      for (let s = 1; s <= 4; s++) {
        await saveEventLocally({ id: `m_test_local_newer_${s}`, seq: s, matchId: 'm_test_local_newer', type: EVENT_TYPES.BALL }, false);
      }

      // Incoming archive:
      // - M1 has 5 deliveries (incoming is newer conflict!)
      // - M2 has 2 deliveries (local is newer conflict!)
      // - M3 is brand new
      const incomingArchive = {
        schemaVersion: 1,
        appVersion: '1.3.3',
        type: 'full_archive',
        matches: [
          { matchId: 'm_test_conflict', code: 'CNFL01' },
          { matchId: 'm_test_local_newer', code: 'LOCAL4' },
          { matchId: 'm_test_brand_new', code: 'NEW001' }
        ],
        events: [
          { id: 'm_test_conflict_1', seq: 1, matchId: 'm_test_conflict' },
          { id: 'm_test_conflict_2', seq: 2, matchId: 'm_test_conflict' },
          { id: 'm_test_conflict_3', seq: 3, matchId: 'm_test_conflict' },
          { id: 'm_test_conflict_4', seq: 4, matchId: 'm_test_conflict' },
          { id: 'm_test_conflict_5', seq: 5, matchId: 'm_test_conflict' },

          { id: 'm_test_local_newer_1', seq: 1, matchId: 'm_test_local_newer' },
          { id: 'm_test_local_newer_2', seq: 2, matchId: 'm_test_local_newer' },

          { id: 'm_test_brand_new_1', seq: 1, matchId: 'm_test_brand_new' }
        ],
        teams: [{ name: 'Strikers', players: ['P1', 'P2'] }]
      };

      const report = await validateAndInspectBackup(incomingArchive);

      expect(report.valid).toBe(true);
      expect(report.newMatchesCount).toBe(1); // m_test_brand_new
      expect(report.newTeamsCount).toBe(1);
      expect(report.conflictsCount).toBe(2); // m_test_conflict and m_test_local_newer

      const decisions = report.matchDecisions;
      const dConflict = decisions.find(d => d.matchId === 'm_test_conflict');
      expect(dConflict.action).toBe('update_with_incoming'); // 5 > 2

      const dLocalNewer = decisions.find(d => d.matchId === 'm_test_local_newer');
      expect(dLocalNewer.action).toBe('keep_local'); // local 4 > incoming 2
    });
  });

  describe('3.4 Restore Execution & Post-Restore Replay Equivalence', () => {
    it('executes restore and preserves higher max-seq version during conflict', async () => {
      // Local has match M1 with 1 delivery
      await saveMatchSnapshot('m_conflict_exec', { matchId: 'm_conflict_exec', score: 1 });
      await saveEventLocally({ id: 'm_conflict_exec_1', seq: 1, matchId: 'm_conflict_exec', type: EVENT_TYPES.MATCH_INIT }, false);

      const archive = {
        schemaVersion: 1,
        appVersion: '1.3.3',
        matches: [{ matchId: 'm_conflict_exec', score: 10 }],
        events: [
          { id: 'm_conflict_exec_1', seq: 1, matchId: 'm_conflict_exec', type: EVENT_TYPES.MATCH_INIT },
          { id: 'm_conflict_exec_2', seq: 2, matchId: 'm_conflict_exec', type: EVENT_TYPES.BALL, payload: { runs: 4 } },
          { id: 'm_conflict_exec_3', seq: 3, matchId: 'm_conflict_exec', type: EVENT_TYPES.BALL, payload: { runs: 6 } }
        ]
      };

      const inspection = await validateAndInspectBackup(archive);
      const restoreResult = await executeRestore(inspection);

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.resolvedConflictsCount).toBe(1);

      // Verify local DB now has the 3 deliveries from incoming
      const restoredEvents = await getEventsForMatch('m_conflict_exec');
      expect(restoredEvents.length).toBe(3);
      expect(restoredEvents[2].payload.runs).toBe(6);
    });

    it('round-trip test: exports match, clears app data, restores, and verifies identical state replay', async () => {
      // 1. Setup and play a real match
      const initEvent = {
        v: 1,
        id: `${matchId}_1`,
        seq: 1,
        matchId,
        type: EVENT_TYPES.MATCH_INIT,
        payload: {
          matchId,
          teams: [{ name: 'Royals', players: ['R1', 'R2', 'R3'] }, { name: 'Kings', players: ['K1', 'K2', 'K3'] }],
          overs: 1,
          playersPerTeam: 3,
          striker: 'R1',
          nonStriker: 'R2',
          bowler: 'K1'
        }
      };

      let liveState = applyEvent(createInitialMatchState(), initEvent);
      await saveMatchSnapshot(matchId, liveState);
      await saveEventLocally(initEvent, false);

      for (let i = 1; i <= 3; i++) {
        const ball = {
          v: 1,
          id: `${matchId}_${i + 1}`,
          seq: i + 1,
          type: EVENT_TYPES.BALL,
          matchId,
          payload: { runs: i, isWicket: false }
        };
        liveState = applyEvent(liveState, ball);
        await saveEventLocally(ball, false);
      }
      await saveMatchSnapshot(matchId, liveState);

      const originalScore = liveState.innings[0].score;
      expect(originalScore).toBe(6); // 1 + 2 + 3

      // 2. Export single match
      const exportedArchive = await exportSingleMatch(matchId);
      expect(exportedArchive.events.length).toBe(4);

      // 3. Clear app data completely (simulate fresh device install)
      await deleteAllMatchesLocally();
      expect(await getMatchSnapshot(matchId)).toBeNull();
      expect((await getEventsForMatch(matchId)).length).toBe(0);

      // 4. Restore from exported archive
      const inspection = await validateAndInspectBackup(exportedArchive);
      await executeRestore(inspection);

      // 5. Confirm restored match opens and replays identically
      const restoredEvents = await getEventsForMatch(matchId);
      expect(restoredEvents.length).toBe(4);

      const replayedState = replayEvents(restoredEvents);
      expect(replayedState.innings[0].score).toBe(originalScore);
      expect(replayedState.innings[0].legalBalls).toBe(3);
      expect(replayedState.striker).toBe(liveState.striker);
      expect(replayedState.nonStriker).toBe(liveState.nonStriker);
    });
  });
});
