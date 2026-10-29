import { useState, useEffect, useCallback, useRef } from 'react';
import { EVENT_TYPES } from '../engine/constants.js';
import { createInitialMatchState, applyEvent, replayEvents } from '../engine/reducer.js';
import {
  saveEventLocally,
  getEventsForMatch,
  getMatchSnapshot,
  saveMatchSnapshot
} from './localDb.js';
import {
  createEventId,
  syncPendingEvents,
  subscribeSyncStatus,
  getDeviceId
} from './sync.js';
import { subscribeToMatchDoc, subscribeToMatchEvents } from '../firebase/matches.js';

export function useMatch(matchId, isViewerMode = false) {
  const [matchState, setMatchState] = useState(() => createInitialMatchState());
  const [syncStatus, setSyncStatus] = useState({
    status: navigator.onLine ? 'synced' : 'offline',
    pendingCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [scorerOfflineInfo, setScorerOfflineInfo] = useState(null);

  const stateRef = useRef(matchState);
  stateRef.current = matchState;

  // 1. Initial Load & Local Replay when matchId changes
  useEffect(() => {
    let isMounted = true;

    async function loadMatch() {
      if (!matchId) {
        setIsLoading(false);
        return;
      }
      try {
        const localEvents = await getEventsForMatch(matchId);
        if (localEvents && localEvents.length > 0) {
          const replayed = replayEvents(localEvents);
          if (isMounted) {
            stateRef.current = replayed;
            setMatchState(replayed);
          }
        } else {
          const snapshot = await getMatchSnapshot(matchId);
          if (snapshot && isMounted) {
            stateRef.current = snapshot;
            setMatchState(snapshot);
          }
        }
      } catch (err) {
        console.error('Failed to load match locally:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadMatch();

    // Subscribe to sync badge changes
    const unsubSync = subscribeSyncStatus((status) => {
      if (isMounted) setSyncStatus(status);
    });

    return () => {
      isMounted = false;
      unsubSync();
    };
  }, [matchId]);

  // 2. Real-time Firebase Sync / Viewer subscription
  useEffect(() => {
    if (!matchId) return;

    const unsubEvents = subscribeToMatchEvents(matchId, async (cloudEvents) => {
      if (!cloudEvents || cloudEvents.length === 0) return;

      if (isViewerMode) {
        const replayed = replayEvents(cloudEvents);
        stateRef.current = replayed;
        setMatchState(replayed);
      } else {
        // Scorer mode: sync any events missing locally
        for (const ev of cloudEvents) {
          await saveEventLocally(ev, true);
        }
      }
    });

    const unsubDoc = subscribeToMatchDoc(matchId, (docData) => {
      if (docData && isViewerMode) {
        const lastUpdated = docData.updatedAt || 0;
        const now = Date.now();
        if (docData.status === 'in_progress' && (now - lastUpdated > 60000)) {
          const d = new Date(lastUpdated);
          const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          setScorerOfflineInfo(`Scorer offline - last update ${timeStr}`);
        } else {
          setScorerOfflineInfo(null);
        }
      }
    });

    return () => {
      unsubEvents();
      unsubDoc();
    };
  }, [matchId, isViewerMode]);

  // First-class match initialization
  const startMatch = useCallback(async (newMatchId, code, payload) => {
    const initEvent = {
      id: `${newMatchId}_1_${getDeviceId()}`,
      seq: 1,
      matchId: newMatchId,
      type: EVENT_TYPES.MATCH_INIT,
      payload: {
        ...payload,
        matchId: newMatchId,
        code
      },
      ts: Date.now(),
      deviceId: getDeviceId()
    };

    // 1. Immediately apply to state so UI is instantly ready
    const freshState = applyEvent(createInitialMatchState(), initEvent);
    stateRef.current = freshState;
    setMatchState(freshState);

    // 2. Save event locally
    await saveEventLocally(initEvent, false);

    // 3. Save snapshot locally
    await saveMatchSnapshot(newMatchId, freshState);

    // 4. Background cloud sync
    syncPendingEvents(newMatchId, freshState);

    return freshState;
  }, []);

  // 3. Dispatch an action (Local first -> State update -> Cloud sync)
  const dispatch = useCallback(async (type, payload = {}, targetMatchId) => {
    const activeMid = targetMatchId || matchId || stateRef.current.matchId;
    if (!activeMid) {
      console.warn('Dispatch aborted: no active match ID');
      return;
    }

    const currentEvents = stateRef.current.events || [];
    const seq = currentEvents.length + 1;
    const eventId = createEventId(activeMid, seq);

    const event = {
      id: eventId,
      seq,
      matchId: activeMid,
      type,
      payload,
      ts: Date.now(),
      deviceId: getDeviceId()
    };

    // 1. Write to local IndexedDB BEFORE anything else
    await saveEventLocally(event, false);

    // 2. Apply to state deterministically with NO lag
    const nextState = applyEvent(stateRef.current, event);
    stateRef.current = nextState;
    setMatchState(nextState);

    // 3. Save snapshot locally
    await saveMatchSnapshot(activeMid, nextState);

    // 4. Background cloud sync
    syncPendingEvents(activeMid, nextState);
  }, [matchId]);

  // Scoring Helper Functions
  const recordBall = useCallback((ballPayload) => {
    return dispatch(EVENT_TYPES.BALL, ballPayload);
  }, [dispatch]);

  const swapBatter = useCallback(() => {
    return dispatch(EVENT_TYPES.SWAP_BATTER);
  }, [dispatch]);

  const changeBowler = useCallback((bowlerName) => {
    return dispatch(EVENT_TYPES.CHANGE_BOWLER, { bowler: bowlerName });
  }, [dispatch]);

  const addNewBatter = useCallback((batterName, slot) => {
    return dispatch(EVENT_TYPES.NEW_BATTER, { batter: batterName, slot });
  }, [dispatch]);

  const retireBatter = useCallback((batterName, reason, nextBatter) => {
    return dispatch(EVENT_TYPES.RETIRE_BATTER, { batter: batterName, reason, nextBatter });
  }, [dispatch]);

  const endInnings = useCallback((inningsPayload) => {
    return dispatch(EVENT_TYPES.END_INNINGS, inningsPayload);
  }, [dispatch]);

  const undo = useCallback(async () => {
    const currentEvents = stateRef.current.events || [];
    const activeMid = matchId || stateRef.current.matchId;
    if (currentEvents.length <= 1 || !activeMid) return;

    // Filter out last event and replay
    const newEvents = currentEvents.slice(0, -1);
    const replayed = replayEvents(newEvents);
    stateRef.current = replayed;
    setMatchState(replayed);

    await saveMatchSnapshot(activeMid, replayed);
    syncPendingEvents(activeMid, replayed);
  }, [matchId]);

  return {
    matchState,
    syncStatus,
    isLoading,
    scorerOfflineInfo,
    startMatch,
    dispatch,
    recordBall,
    swapBatter,
    changeBowler,
    addNewBatter,
    retireBatter,
    endInnings,
    undo
  };
}
