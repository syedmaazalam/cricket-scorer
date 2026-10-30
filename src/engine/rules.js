import { EXTRA_TYPES, WICKET_TYPES } from './constants.js';

/**
 * Checks if a ball is a legal delivery that counts toward the 6 balls in an over.
 */
export function isLegalDelivery(extraType) {
  return extraType !== EXTRA_TYPES.WIDE && extraType !== EXTRA_TYPES.NO_BALL;
}

/**
 * Checks if a wicket is credited to the bowler's bowling statistics.
 */
export function isBowlerWicket(wicketType) {
  return [
    WICKET_TYPES.BOWLED,
    WICKET_TYPES.CAUGHT,
    WICKET_TYPES.LBW,
    WICKET_TYPES.STUMPED,
    WICKET_TYPES.HIT_WICKET
  ].includes(wicketType);
}

/**
 * Checks if runs are credited to the batter's personal score.
 * (Normal balls and no-balls credit bat runs to the batter; wides, byes, leg-byes do not).
 */
export function doesBatterEarnRuns(extraType) {
  return extraType === EXTRA_TYPES.NONE || extraType === EXTRA_TYPES.NO_BALL;
}

/**
 * Validates whether a wicket is legal during a Free Hit delivery.
 */
export function isWicketValidOnFreeHit(wicketType) {
  return [
    WICKET_TYPES.RUN_OUT,
    WICKET_TYPES.OBSTRUCTING_FIELD,
    WICKET_TYPES.HIT_BALL_TWICE,
    WICKET_TYPES.RETIRED_OUT,
    WICKET_TYPES.RETIRED_HURT
  ].includes(wicketType);
}

/**
 * Validates whether a wicket is legal during a No-Ball delivery (MCC Law 21.18).
 * Only run out, obstructing field, hit ball twice, and retired are permitted.
 */
export function isWicketValidOnNoBall(wicketType) {
  return [
    WICKET_TYPES.RUN_OUT,
    WICKET_TYPES.OBSTRUCTING_FIELD,
    WICKET_TYPES.HIT_BALL_TWICE,
    WICKET_TYPES.RETIRED_OUT,
    WICKET_TYPES.RETIRED_HURT
  ].includes(wicketType);
}

/**
 * Validates whether a wicket is legal during a Wide delivery (MCC Law 22.17).
 * Bowled, Caught, and LBW are strictly not permitted.
 */
export function isWicketValidOnWide(wicketType) {
  return [
    WICKET_TYPES.STUMPED,
    WICKET_TYPES.RUN_OUT,
    WICKET_TYPES.HIT_WICKET,
    WICKET_TYPES.OBSTRUCTING_FIELD,
    WICKET_TYPES.RETIRED_OUT,
    WICKET_TYPES.RETIRED_HURT
  ].includes(wicketType);
}

/**
 * Calculates the maximum wickets before all-out based on number of players per team.
 * All out occurs when only 1 batter remains (players - 1).
 */
export function getMaxWickets(playersPerTeam = 11) {
  return Math.max(1, (Number(playersPerTeam) || 11) - 1);
}

/**
 * Formats legal balls into standard cricket overs (e.g. 15 balls -> 2.3).
 */
export function formatOvers(legalBalls = 0) {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
}

/**
 * Converts formatted overs (e.g. 2.3) or total legal balls back and forth.
 */
export function oversToBalls(oversStringOrNumber) {
  if (typeof oversStringOrNumber === 'number') {
    const whole = Math.floor(oversStringOrNumber);
    const frac = Math.round((oversStringOrNumber - whole) * 10);
    return whole * 6 + frac;
  }
  const parts = String(oversStringOrNumber).split('.');
  const overs = parseInt(parts[0], 10) || 0;
  const balls = parseInt(parts[1], 10) || 0;
  return overs * 6 + balls;
}

/**
 * Calculates Current Run Rate (CRR).
 */
export function calculateCRR(totalRuns = 0, legalBalls = 0) {
  if (!legalBalls || legalBalls <= 0) return 0;
  const oversDecimal = legalBalls / 6;
  return Number((totalRuns / oversDecimal).toFixed(2));
}

/**
 * Calculates Required Run Rate (RRR).
 */
export function calculateRRR(target = 0, currentRuns = 0, legalBalls = 0, maxOvers = 20) {
  if (!target || target <= 0) return 0;
  const runsNeeded = target - currentRuns;
  if (runsNeeded <= 0) return 0;
  const totalBallsAllowed = maxOvers * 6;
  const ballsRemaining = totalBallsAllowed - legalBalls;
  if (ballsRemaining <= 0) return 99.99;
  const oversRemainingDecimal = ballsRemaining / 6;
  return Number((runsNeeded / oversRemainingDecimal).toFixed(2));
}
