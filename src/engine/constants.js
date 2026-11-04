export const EVENT_TYPES = {
  MATCH_INIT: 'MATCH_INIT',
  BALL: 'BALL',
  SWAP_BATTER: 'SWAP_BATTER',
  CHANGE_BOWLER: 'CHANGE_BOWLER',
  NEW_BATTER: 'NEW_BATTER',
  RETIRE_BATTER: 'RETIRE_BATTER',
  END_INNINGS: 'END_INNINGS',
  REVISE_TARGET: 'REVISE_TARGET',
  CORRECTION: 'CORRECTION',
  EDIT_PLAYER: 'EDIT_PLAYER',
  ADD_BALL_TO_PREVIOUS_OVER: 'ADD_BALL_TO_PREVIOUS_OVER',
  REOPEN_PREVIOUS_OVER: 'REOPEN_PREVIOUS_OVER'
};

export const EXTRA_TYPES = {
  NONE: null,
  WIDE: 'wide',
  NO_BALL: 'no_ball',
  BYE: 'bye',
  LEG_BYE: 'leg_bye',
  PENALTY: 'penalty'
};

export const WICKET_TYPES = {
  BOWLED: 'bowled',
  CAUGHT: 'caught',
  LBW: 'lbw',
  RUN_OUT: 'run_out',
  STUMPED: 'stumped',
  HIT_WICKET: 'hit_wicket',
  RETIRED_OUT: 'retired_out',
  RETIRED_HURT: 'retired_hurt',
  OBSTRUCTING_FIELD: 'obstructing_field',
  HIT_BALL_TWICE: 'hit_ball_twice',
  TIMED_OUT: 'timed_out'
};

export const MATCH_STATUS = {
  SETUP: 'setup',
  IN_PROGRESS: 'in_progress',
  INNINGS_BREAK: 'innings_break',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned'
};

export const WEB_APP_URL = 'https://smartcricket-c79b5.web.app';

export function getShareUrl(paramKey = 'watch', code = '') {
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : WEB_APP_URL;
  const isLocalOrNative = !origin || origin.includes('localhost') || origin.includes('capacitor://') || origin.startsWith('file://');
  const base = isLocalOrNative ? WEB_APP_URL : origin;
  return `${base}/?${paramKey}=${encodeURIComponent(code || '')}`;
}
