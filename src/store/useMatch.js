import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';
import { EVENT_TYPES } from '../engine/constants.js';
import { createInitialMatchState, applyEvent, replayEvents } from '../engine/reducer.js';
import { db, auth, ensureAnonymousAuth } from '../firebase/config.js';
import {
  saveEventLocally,
  saveEventAndSnapshotAtomically,
  getEventsForMatch,
  getMatchSnapshot,
  saveMatchSnapshot,
  saveActionLogLocally,
  deleteEventsLocally,
  getFastPaintSnapshot,
  verifyAndReconcileLocalSequence
} from './localDb.js';
import {
  createEventId,
  syncPendingEvents,
  triggerQueueDrain,
  subscribeSyncStatus,
  getDeviceId
} from './sync.js';
import {
  subscribeToMatchDoc,
  subscribeToMatchEvents,
  updateMatchHeartbeat,
  claimScorerLease,
  isScorerLeaseHeldByOther,
  saveActionLogToCloud,
  findMatchByCode,
  deleteEventsFromCloud,
  updateCompactedRootDocThrottled,
  fetchFullMatchEvents
} from '../firebase/matches.js';
import {
  postCrossTabEvent,
  subscribeCrossTabEvents,
  acquireScoringTabLock
} from './crossTabSync.js';

export function useMatch(matchId, isViewerMode = false) {
  const [matchState, setMatchState] = useState(() => {
    if (matchId) {
      const fastPaint = getFastPaintSnapshot(matchId);
      if (fastPaint) {
        return { ...createInitialMatchState(), ...fastPaint, _fastPaint: true };
      }
    }
    return createInitialMatchState();
  });
  const [syncStatus, setSyncStatus] = useState({
    status: navigator.onLine ? 'synced' : 'offline',
    pendingCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [scorerOfflineInfo, setScorerOfflineInfo] = useState(null);
  const [leaseConflict, setLeaseConflict] = useState(null);
  const [tabLockConflict, setTabLockConflict] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  const stateRef = useRef(matchState);
  stateRef.current = matchState;

  // Reconciles missing events and deterministically reconstructs match state
  const reconcileAndReplay = useCallback(async (targetId) => {
    setIsReconciling(true);
    try {
      const localEvents = await getEventsForMatch(targetId);
      let cloudEvs = [];
      try {
        const cloudSnap = await getDocs(query(collection(db, 'matches', targetId, 'events'), orderBy('seq', 'asc')));
        cloudEvs = cloudSnap.docs.map(d => d.data());
      } catch (e) {
        console.warn('[Reconcile] Could not fetch cloud events, replaying from local only:', e);
      }

      const map = new Map();
      for (const ev of localEvents) {
        if (ev?.seq) map.set(ev.seq, ev);
      }
      for (const ev of cloudEvs) {
        if (ev?.seq) {
          map.set(ev.seq, { ...(map.get(ev.seq) || {}), ...ev, synced: 1 });
        }
      }
      const merged = Array.from(map.values()).sort((a, b) => (a.seq || 0) - (b.seq || 0));
      const replayed = replayEvents(merged);
      stateRef.current = replayed;
      setMatchState(replayed);
      await saveMatchSnapshot(targetId, replayed);
      return replayed;
    } catch (err) {
      console.warn('[Reconcile] Error reconciling events chain:', err);
    } finally {
      setIsReconciling(false);
    }
  }, []);

  // Take over active scoring lease from another device
  const takeOverScoring = useCallback(async () => {
    const activeMid = matchId || stateRef.current.matchId;
    if (!activeMid) return;
    const result = await claimScorerLease(activeMid, true);
    if (result.granted) {
      setLeaseConflict(null);
      updateMatchHeartbeat(activeMid);
    }
  }, [matchId]);

  // 1. Initial Load & Local Replay when matchId changes
  useEffect(() => {
    let isMounted = true;

    async function loadMatch() {
      if (!matchId) {
        setIsLoading(false);
        return;
      }
      try {
        let activeId = matchId;
        // If matchId is a 6-character code, find actual matchId from snapshot
        if (matchId.length === 6) {
          const snap = await getMatchSnapshot(matchId);
          if (snap?.matchId) {
            activeId = snap.matchId;
          }
        }

        const localEvents = await getEventsForMatch(activeId);
        if (localEvents && localEvents.length > 0) {
          const replayed = replayEvents(localEvents);
          if (isMounted) {
            stateRef.current = replayed;
            setMatchState(replayed);
          }
        } else {
          const snapshot = await getMatchSnapshot(activeId);
          if (snapshot && isMounted) {
            stateRef.current = snapshot;
            setMatchState(snapshot);
          }
        }

        // Phase 4 Requirement 3: After IndexedDB opens, verify the last seq against the events store and replace cache if it differs
        const reconciliation = await verifyAndReconcileLocalSequence(activeId);
        if (reconciliation?.replaced && reconciliation.state && isMounted) {
          stateRef.current = reconciliation.state;
          setMatchState(reconciliation.state);
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

  // Phase 6 Requirement 2: Web Locks API to enforce single active scoring tab per match
  useEffect(() => {
    if (!matchId || isViewerMode) {
      setTabLockConflict(false);
      return;
    }

    let activeLockController = null;
    let isCancelled = false;

    acquireScoringTabLock(matchId, (isLocked) => {
      if (isCancelled) return;
      setTabLockConflict(!isLocked);
    }).then(controller => {
      activeLockController = controller;
    });

    return () => {
      isCancelled = true;
      if (activeLockController && typeof activeLockController.release === 'function') {
        activeLockController.release();
      }
    };
  }, [matchId, isViewerMode]);

  // Phase 6 Requirement 1: BroadcastChannel('smartcricket_events') listener to refresh from IndexedDB
  useEffect(() => {
    if (!matchId) return;

    const unsub = subscribeCrossTabEvents(async (data) => {
      if (data && data.matchId === matchId) {
        if (data.type === 'BALL_SCORED' || data.type === 'UNDO' || data.type === 'STATE_UPDATED') {
          try {
            const localEvents = await getEventsForMatch(matchId);
            if (localEvents && localEvents.length > 0) {
              const replayed = replayEvents(localEvents);
              stateRef.current = replayed;
              setMatchState(replayed);
            } else {
              const snap = await getMatchSnapshot(matchId);
              if (snap) {
                stateRef.current = snap;
                setMatchState(snap);
              }
            }
          } catch (e) {
            console.warn('Cross-tab refresh from IndexedDB error:', e);
          }
        }
      }
    });

    return () => {
      unsub();
    };
  }, [matchId]);

  // 2. Real-time Firebase Sync / Viewer subscription
  useEffect(() => {
    if (!matchId) return;

    let unsubEvents = () => {};
    let unsubDoc = () => {};
    let heartbeatTimer = null;
    let offlineCheckInterval = null;
    let isCancelled = false;

    async function initSubscription() {
      let activeTargetId = matchId;
      if (matchId.length === 6) {
        // Resolve 6-char code to true matchId
        const localSnap = await getMatchSnapshot(matchId);
        if (localSnap?.matchId) {
          activeTargetId = localSnap.matchId;
        } else {
          try {
            const cloudMatch = await findMatchByCode(matchId);
            if (cloudMatch?.matchId) {
              activeTargetId = cloudMatch.matchId;
            }
          } catch {}
        }
      }

      if (isCancelled) return;

      if (isViewerMode) {
        // Phase 5 Requirement 1: Spectators' Live view subscribes ONLY to compacted root doc
        unsubDoc = subscribeToMatchDoc(activeTargetId, (docData, fromCache) => {
          if (!docData) return;
          lastDocData = docData;
          evaluateOffline();

          // Phase 5 Requirement 5: The Live view updates incrementally, not from ball 1 on each update
          setMatchState(prev => {
            const nextInnings = docData.innings || prev.innings || [];
            const currentIdx = docData.currentInningsIndex !== undefined ? docData.currentInningsIndex : (prev.currentInningsIndex || 0);
            const merged = {
              ...prev,
              ...docData,
              matchId: activeTargetId,
              innings: nextInnings,
              currentInningsIndex: currentIdx,
              striker: docData.striker !== undefined ? docData.striker : prev.striker,
              nonStriker: docData.nonStriker !== undefined ? docData.nonStriker : prev.nonStriker,
              currentBowler: docData.currentBowler !== undefined ? docData.currentBowler : prev.currentBowler,
              recentBalls: docData.recentBalls || prev.recentBalls || []
            };
            stateRef.current = merged;
            return merged;
          });
          if (isMounted) setIsLoading(false);
        });

        offlineCheckInterval = setInterval(evaluateOffline, 5000);
      } else {
        // Scorer mode: Subscribes to events for multi-device chain integrity
        unsubEvents = subscribeToMatchEvents(activeTargetId, async (cloudEvents) => {
          if (!cloudEvents || cloudEvents.length === 0) return;

          // Phase 2 Requirement 5: Check chain continuity (prevEventId)
          let hasChainMismatch = false;
          const sortedCloud = [...cloudEvents].sort((a, b) => (a.seq || 0) - (b.seq || 0));
          for (let i = 1; i < sortedCloud.length; i++) {
            const cur = sortedCloud[i];
            const prev = sortedCloud[i - 1];
            if (cur.prevEventId && prev.id && cur.prevEventId !== prev.id) {
              hasChainMismatch = true;
              break;
            }
          }

          if (hasChainMismatch) {
            console.warn('[Conflict Protection] Chain tip mismatch detected. Reconciling...');
            await reconcileAndReplay(activeTargetId);
            return;
          }

          // Scorer mode: sync any events missing locally
          for (const ev of sortedCloud) {
            await saveEventLocally(ev, true);
          }
          const currentCount = (stateRef.current?.events || []).length;
          if (currentCount < sortedCloud.length) {
            const replayed = replayEvents(sortedCloud);
            stateRef.current = replayed;
            setMatchState(replayed);
            saveMatchSnapshot(activeTargetId, replayed).catch(() => {});
          }
        });

        // Scorer mode: check foreign leases on root doc
        unsubDoc = subscribeToMatchDoc(activeTargetId, (docData) => {
          if (docData) {
            const myDeviceId = getDeviceId();
            if (isScorerLeaseHeldByOther(docData, myDeviceId)) {
              setLeaseConflict({
                currentScorerId: docData.scorerId,
                leaseExpiresAt: docData.leaseExpiresAt
              });
            } else {
              setLeaseConflict(null);
            }
          }
        });

        // Phase 2 Requirement 4: Scorer Lease Heartbeat every 30 seconds
        ensureAnonymousAuth().catch(() => {});
        updateMatchHeartbeat(activeTargetId);
        heartbeatTimer = setInterval(() => {
          updateMatchHeartbeat(activeTargetId);
        }, 30000);
      }
    }

    initSubscription();

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && !isViewerMode) {
        updateMatchHeartbeat(matchId);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      isCancelled = true;
      if (typeof unsubEvents === 'function') unsubEvents();
      if (typeof unsubDoc === 'function') unsubDoc();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (offlineCheckInterval) clearInterval(offlineCheckInterval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [matchId, isViewerMode, reconcileAndReplay]);

  // First-class match initialization
  const startMatch = useCallback(async (newMatchId, code, payload) => {
    const authUser = auth.currentUser;
    const deviceId = getDeviceId();
    const eventId = createEventId(newMatchId, 1);

    const initEvent = {
      v: 1,
      id: eventId,
      seq: 1,
      prevEventId: null,
      scorerUid: authUser?.uid || null,
      scorerId: deviceId,
      ballId: null,
      matchId: newMatchId,
      type: EVENT_TYPES.MATCH_INIT,
      payload: {
        ...payload,
        matchId: newMatchId,
        code
      },
      ts: Date.now(),
      deviceId
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
    if (tabLockConflict) {
      console.warn('[Dispatch Blocked] Another tab is currently scoring this match. This tab is in read-only mode.');
      return;
    }
    if (leaseConflict) {
      console.warn('[Dispatch Blocked] Another device currently holds the scoring lease.');
      return;
    }
    if (isReconciling) {
      console.warn('[Dispatch Paused] Currently reconciling events chain.');
      return;
    }

    const activeMid = targetMatchId || matchId || stateRef.current.matchId;
    if (!activeMid) {
      console.warn('Dispatch aborted: no active match ID');
      return;
    }

    const currentEvents = stateRef.current.events || [];
    const seq = currentEvents.length + 1;
    const prevEvent = currentEvents.length > 0 ? currentEvents[currentEvents.length - 1] : null;
    const prevEventId = prevEvent ? prevEvent.id : null;
    const eventId = createEventId(activeMid, seq);
    const authUser = auth.currentUser;
    const deviceId = getDeviceId();
    const ballId = payload?.ballId || (type === EVENT_TYPES.BALL ? `ball_${activeMid}_${seq}` : null);

    const event = {
      v: 1,
      id: eventId,
      seq,
      prevEventId,
      scorerUid: authUser?.uid || null,
      scorerId: deviceId,
      ballId,
      matchId: activeMid,
      type,
      payload,
      ts: Date.now(),
      deviceId
    };

    // 1. Apply to state deterministically with NO lag
    const nextState = applyEvent(stateRef.current, event);

    // 2. Phase 1 Requirement 2: Save event, match snapshot, and offline_queue entry in ONE atomic IndexedDB transaction
    await saveEventAndSnapshotAtomically(event, nextState, true);

    stateRef.current = nextState;
    setMatchState(nextState);

    // 3. Trigger single-flight queue drainer
    triggerQueueDrain(activeMid);

    // Phase 6 Requirement 1: Broadcast ball scored event to other open tabs
    postCrossTabEvent({
      type: 'BALL_SCORED',
      matchId: activeMid,
      seq,
      eventId
    });

    // 4. Phase 5 Requirement 2: Throttled root-doc writes (at most once every 2-3s, plus always on wicket, over end, and innings end)
    const isWicket = event.type === 'WICKET' || Boolean(payload?.isWicket);
    const isOverEnd = Boolean(
      nextState.needsBowlerChange || (
        nextState.innings?.[nextState.currentInningsIndex]?.ballsInCurrentOver === 0 &&
        (nextState.innings?.[nextState.currentInningsIndex]?.completedOvers || 0) > 0
      )
    );
    const isInningsEnd = Boolean(event.type === 'END_INNINGS' || nextState.isCompleted || nextState.isInningsBreak);
    const isCritical = Boolean(isWicket || isOverEnd || isInningsEnd);

    updateCompactedRootDocThrottled(activeMid, nextState, isCritical);
  }, [matchId, leaseConflict, tabLockConflict, isReconciling]);

  // Scoring Helper Functions
  const recordBall = useCallback((ballPayload) => {
    const activeMid = matchId || stateRef.current.matchId;
    if (activeMid) {
      const isDot = ballPayload.runs === 0 && !ballPayload.extraType;
      const title = isDot ? 'Dot Ball (2 pts)' : `+${ballPayload.runs} Runs${ballPayload.extraType ? ` (${ballPayload.extraType})` : ''}`;
      const logEntry = {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        matchId: activeMid,
        timestamp: Date.now(),
        action: 'BALL_SCORED',
        title,
        details: `Batter: ${stateRef.current.striker}, Bowler: ${stateRef.current.currentBowler}`
      };
      saveActionLogLocally(activeMid, logEntry);
      saveActionLogToCloud(activeMid, logEntry);
    }
    return dispatch(EVENT_TYPES.BALL, { ...ballPayload, timestamp: Date.now() });
  }, [dispatch, matchId]);

  const swapBatter = useCallback(() => {
    return dispatch(EVENT_TYPES.SWAP_BATTER);
  }, [dispatch]);

  const changeBowler = useCallback((bowlerName, modeOrOptions = 'split_over', allowConsecutive = false) => {
    let mode = 'split_over';
    let allow = allowConsecutive;
    if (typeof modeOrOptions === 'object' && modeOrOptions !== null) {
      mode = modeOrOptions.mode || 'split_over';
      allow = Boolean(modeOrOptions.allowConsecutive || allowConsecutive);
    } else if (typeof modeOrOptions === 'string') {
      mode = modeOrOptions;
    }
    return dispatch(EVENT_TYPES.CHANGE_BOWLER, { bowler: bowlerName, mode, allowConsecutive: allow });
  }, [dispatch]);

  const addNewBatter = useCallback((batterName, slot) => {
    return dispatch(EVENT_TYPES.NEW_BATTER, { batter: batterName, slot });
  }, [dispatch]);

  const retireBatter = useCallback((batterName, reason, nextBatter) => {
    return dispatch(EVENT_TYPES.RETIRE_BATTER, { batter: batterName, reason, nextBatter });
  }, [dispatch]);

  const editPlayer = useCallback((oldName, newName, role) => {
    return dispatch(EVENT_TYPES.EDIT_PLAYER, { oldName, newName, role });
  }, [dispatch]);

  const endInnings = useCallback((inningsPayload) => {
    const activeMid = matchId || stateRef.current.matchId;
    if (activeMid) {
      const logEntry = {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        matchId: activeMid,
        timestamp: Date.now(),
        action: 'INNINGS_ENDED',
        title: '1st Innings Ended / 2nd Innings Started',
        details: `Striker: ${inningsPayload?.striker || 'N/A'}, Non-Striker: ${inningsPayload?.nonStriker || 'N/A'}, Bowler: ${inningsPayload?.bowler || 'N/A'}`
      };
      saveActionLogLocally(activeMid, logEntry);
      saveActionLogToCloud(activeMid, logEntry);
    }
    return dispatch(EVENT_TYPES.END_INNINGS, inningsPayload);
  }, [dispatch, matchId]);

  const addBallToPreviousOver = useCallback((payload) => {
    return dispatch(EVENT_TYPES.ADD_BALL_TO_PREVIOUS_OVER, payload);
  }, [dispatch]);

  const reopenPreviousOver = useCallback(() => {
    return dispatch(EVENT_TYPES.REOPEN_PREVIOUS_OVER, {});
  }, [dispatch]);

  const undo = useCallback(async () => {
    const currentEvents = stateRef.current.events || [];
    const activeMid = matchId || stateRef.current.matchId;
    if (currentEvents.length <= 1 || !activeMid) return;

    const lastEvent = currentEvents[currentEvents.length - 1];
    const prevEvent = currentEvents.length >= 2 ? currentEvents[currentEvents.length - 2] : null;

    let undoDesc = 'Undid previous action';
    if (lastEvent) {
      if (lastEvent.type === EVENT_TYPES.BALL) {
        undoDesc = `Undid ball: reverted ${lastEvent.payload?.runs || 0} runs${lastEvent.payload?.extraType ? ` (${lastEvent.payload.extraType})` : ''}${lastEvent.payload?.isWicket ? ' (Wicket)' : ''}`;
      } else {
        undoDesc = `Undid ${lastEvent.type}`;
      }
    }

    // If the last event is NEW_BATTER and was preceded by a wicket BALL,
    // undoing should roll back BOTH the new batter assignment and the wicket delivery
    // so the dismissed batter is restored to the crease and user isn't dragged into NewBatterModal
    let dropCount = 1;
    const curInn = stateRef.current.innings?.[stateRef.current.currentInningsIndex];
    const isAtOverBoundary = Boolean(curInn && curInn.legalBalls > 0 && curInn.legalBalls % 6 === 0);

    if (
      currentEvents.length >= 3 &&
      lastEvent?.type === EVENT_TYPES.NEW_BATTER &&
      prevEvent?.type === EVENT_TYPES.BALL &&
      Boolean(prevEvent?.payload?.isWicket || prevEvent?.payload?.wicket)
    ) {
      dropCount = 2;
      undoDesc = 'Undid wicket & new batter selection: restored dismissed batter to crease';
    } else if (
      isAtOverBoundary &&
      currentEvents.length >= 3 &&
      lastEvent?.type === EVENT_TYPES.CHANGE_BOWLER &&
      prevEvent?.type === EVENT_TYPES.NEW_BATTER
    ) {
      dropCount = 3;
      undoDesc = 'Reopened previous over & undid final wicket delivery';
    } else if (
      isAtOverBoundary &&
      currentEvents.length >= 2 &&
      lastEvent?.type === EVENT_TYPES.CHANGE_BOWLER &&
      prevEvent?.type === EVENT_TYPES.BALL
    ) {
      dropCount = 2;
      undoDesc = 'Reopened previous over & undid last delivery';
    }

    const logEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      matchId: activeMid,
      timestamp: Date.now(),
      action: 'UNDO_PRESSED',
      title: 'Undo Action Performed',
      details: undoDesc
    };
    saveActionLogLocally(activeMid, logEntry);
    saveActionLogToCloud(activeMid, logEntry);

    // Filter out events and replay
    const droppedEvents = currentEvents.slice(-dropCount);
    const newEvents = currentEvents.slice(0, -dropCount);

    // Permanently purge dropped events so they can never be resurrected on match reopen
    const droppedIds = droppedEvents.map(e => e.id).filter(Boolean);
    if (droppedIds.length > 0) {
      await deleteEventsLocally(activeMid, droppedIds);
      deleteEventsFromCloud(activeMid, droppedIds).catch(() => {});
    }

    const replayed = replayEvents(newEvents);
    stateRef.current = replayed;
    setMatchState(replayed);

    await saveMatchSnapshot(activeMid, replayed);
    syncPendingEvents(activeMid, replayed);

    // Phase 6 Requirement 1: Broadcast undo event across tabs
    postCrossTabEvent({
      type: 'UNDO',
      matchId: activeMid,
      seq: newEvents.length
    });
  }, [matchId]);

  const editBall = useCallback(async (ballIdentifier, updatedPayload) => {
    const currentEvents = stateRef.current.events || [];
    const activeMid = matchId || stateRef.current.matchId;
    if (!currentEvents.length || !activeMid) return;

    // Find the event index
    let eventIdx = -1;
    if (typeof ballIdentifier === 'number') {
      eventIdx = currentEvents.findIndex(
        (e) => e.seq === ballIdentifier && (e.type === EVENT_TYPES.BALL || e.type === EVENT_TYPES.ADD_BALL_TO_PREVIOUS_OVER)
      );
    }
    if (eventIdx === -1) {
      eventIdx = currentEvents.findIndex(
        (e) => e.id === ballIdentifier || e.payload?.ballId === ballIdentifier
      );
    }
    if (eventIdx === -1 && typeof ballIdentifier === 'string' && ballIdentifier.startsWith('ball_')) {
      const ballNum = parseInt(ballIdentifier.replace('ball_', ''), 10);
      let ballCounter = 0;
      for (let i = 0; i < currentEvents.length; i++) {
        if (currentEvents[i].type === EVENT_TYPES.BALL || currentEvents[i].type === EVENT_TYPES.ADD_BALL_TO_PREVIOUS_OVER) {
          ballCounter++;
          if (ballCounter === ballNum) {
            eventIdx = i;
            break;
          }
        }
      }
    }

    if (eventIdx === -1) {
      console.warn('editBall: could not locate target ball event for', ballIdentifier);
      return;
    }

    const oldEvent = currentEvents[eventIdx];
    const newPayload = {
      ...oldEvent.payload,
      ...updatedPayload
    };

    const updatedEvent = {
      ...oldEvent,
      payload: newPayload,
      editedAt: Date.now()
    };

    let newEvents = [...currentEvents];
    newEvents[eventIdx] = updatedEvent;

    // If ball was previously a wicket and changed to NOT a wicket:
    // remove the subsequent NEW_BATTER event if it was triggered by this dismissal
    if (
      Boolean(oldEvent.payload?.isWicket || oldEvent.payload?.wicket) &&
      !newPayload.isWicket &&
      eventIdx + 1 < newEvents.length &&
      newEvents[eventIdx + 1].type === EVENT_TYPES.NEW_BATTER
    ) {
      newEvents.splice(eventIdx + 1, 1);
    }

    // Replay deterministically
    const replayed = replayEvents(newEvents);
    stateRef.current = replayed;
    setMatchState(replayed);

    // Persist
    await saveEventLocally(updatedEvent, false);
    await saveMatchSnapshot(activeMid, replayed);
    syncPendingEvents(activeMid, replayed);

    // Bug 28: Save and broadcast edited ball state directly to Live Spectator view (compacted root doc and Firestore event doc)
    try {
      updateCompactedRootDocThrottled(activeMid, replayed, true);
      if (db && updatedEvent.id) {
        const eventDocRef = doc(db, 'matches', activeMid, 'events', updatedEvent.id);
        setDoc(eventDocRef, { ...updatedEvent, synced: 1 }, { merge: true }).catch((err) => {
          console.warn('Could not update cloud event doc directly:', err);
        });
      }
    } catch (e) {
      console.warn('Error broadcasting edited ball to live spectator view:', e);
    }

    // Action Log
    const logEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      matchId: activeMid,
      timestamp: Date.now(),
      action: 'BALL_EDITED',
      title: 'Ball Score Edited',
      details: `Ball #${oldEvent.seq || eventIdx + 1} score updated`
    };
    saveActionLogLocally(activeMid, logEntry);
    saveActionLogToCloud(activeMid, logEntry);

    // Phase 6 Requirement 1: Broadcast edited ball event across tabs
    postCrossTabEvent({
      type: 'STATE_UPDATED',
      matchId: activeMid
    });
  }, [matchId]);

  // Phase 5 Requirement 3: Query the full events subcollection only when a spectator opens the scorecard or timeline
  const loadFullMatchEvents = useCallback(async () => {
    const activeMid = matchId || stateRef.current.matchId;
    if (!activeMid) return null;
    try {
      const cloudEvents = await fetchFullMatchEvents(activeMid);
      if (cloudEvents && cloudEvents.length > 0) {
        const full = replayEvents(cloudEvents);
        stateRef.current = full;
        setMatchState(full);
        return full;
      }
    } catch (e) {
      console.warn('Error fetching full events on demand:', e);
    }
    return stateRef.current;
  }, [matchId]);

  return {
    matchState,
    syncStatus,
    isLoading,
    scorerOfflineInfo,
    leaseConflict,
    tabLockConflict,
    isReconciling,
    loadFullMatchEvents,
    takeOverScoring,
    startMatch,
    dispatch,
    recordBall,
    editBall,
    swapBatter,
    changeBowler,
    addNewBatter,
    retireBatter,
    editPlayer,
    endInnings,
    addBallToPreviousOver,
    reopenPreviousOver,
    undo
  };
}
