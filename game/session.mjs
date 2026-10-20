import {SIZE, newState, validSave, complete, shuffled, migrateGeneHints} from './engine.mjs';

export const roundComplete = complete;
// Collection achievements outlive an individual replay; the active board does not.
export const earnedCompletion = state => state.earnedCompletion === true || roundComplete(state);
export function restartSession(previous) {
  const session = restoreSession(null);
  session.state.earnedCompletion = earnedCompletion(previous);
  return session;
}
const TIMING_VERSION = 2;
// Keep the complete tray permutation, including placed pieces, so its letters
// and remaining positions stay the same when the player returns.
export function restoreTrayOrder(savedOrder, random = Math.random) {
  const valid = Array.isArray(savedOrder) && savedOrder.length === SIZE && new Set(savedOrder).size === SIZE && savedOrder.every(id => Number.isInteger(id) && id >= 0 && id < SIZE);
  return valid ? [...savedOrder] : shuffled(Array.from({length: SIZE}, (_, id) => id), random);
}
export const modeLocked = state => state.placed.length > 0 || roundComplete(state);
export function changeTimingMode(state, currentTimed, nextTimed) {
  if (modeLocked(state) || currentTimed === nextTimed) return currentTimed;
  // Only an explicit mode change before progress can discard an unearned
  // legacy clock. Completed results and clocks after placement remain locked.
  state.seconds = 0;
  state.startedAt = null;
  state.finishedAt = null;
  state.timingUnavailable = false;
  state.timingVersion = TIMING_VERSION;
  return nextTimed;
}
export function choosePiece(selected, id) {
  return {selected: selected === id ? null : id, hinted: null};
}
export function elapsedSeconds(state, now = Date.now()) {
  if (state.startedAt === null) return state.seconds;
  return Math.max(state.seconds, ((state.finishedAt ?? now) - state.startedAt) / 1000, 0);
}
export function recordInteraction(state, route) {
  state.started = true;
  state.timingVersion = TIMING_VERSION;
  if (!state.usedRoutes.includes(route)) state.usedRoutes.push(route);
}
// Call only for an accepted placement or correct answer. Browsing, selection,
// hints, and unsuccessful attempts use recordInteraction without a clock.
export function startRound(state, timed, route, now = Date.now()) {
  recordInteraction(state, route);
  if (timed && state.startedAt === null) state.startedAt = now - state.seconds * 1000;
}
export function finishRound(state, now = Date.now()) {
  if (!roundComplete(state)) return;
  state.earnedCompletion = true;
  if (state.finishedAt !== null) return;
  state.seconds = elapsedSeconds(state, now);
  state.finishedAt = now;
}
export function restoreSession(save, now = Date.now()) {
  const order = restoreTrayOrder(save?.order);
  if (!validSave(save?.state)) return {state: {...newState(), timingVersion: TIMING_VERSION}, timed: false, order};
  const raw = save.state;
  const state = {...newState(), ...raw, placed: [...raw.placed]};
  delete state.answers;
  delete state.learningVersion;
  state.sessionVersion = 3;
  state.earnedCompletion = raw.earnedCompletion === true || roundComplete(state);
  state.timingVersion = TIMING_VERSION;
  state.timingUnavailable = raw.timingUnavailable === true;
  Object.assign(state, migrateGeneHints(raw));
  delete state.geneHintSeen;
  state.namedAt = raw.solvedByGuess && Number.isInteger(raw.namedAt) && raw.namedAt >= 0 && raw.namedAt < SIZE ? raw.namedAt : null;
  state.usedRoutes = Array.isArray(raw.usedRoutes) ? [...new Set(raw.usedRoutes.map(id => id === 'text' ? 'legacy' : id).filter(id => ['image', 'legacy', 'guess'].includes(id)))] : [];
  state.started = raw.started === true || raw.placed.length > 0 || raw.seconds > 0 || raw.hints > 0 || raw.peeks > 0;
  state.startedAt = Number.isFinite(raw.startedAt) && raw.startedAt >= 0 ? raw.startedAt : null;
  state.finishedAt = Number.isFinite(raw.finishedAt) && raw.finishedAt >= (state.startedAt ?? 0) ? raw.finishedAt : null;
  if (!roundComplete(state)) state.finishedAt = null;
  // Older rounds could have a finished picture but still be waiting on a quiz.
  // Their puzzle finish time was never recorded, so do not invent a timed result.
  if (raw.sessionVersion !== 3 && roundComplete(state) && state.finishedAt === null && save.timed === true) {
    state.timingUnavailable = true;
    state.startedAt = null;
  }
  const timed = save.timed === true;
  // Legacy clocks may have started with a hint or selection. Preserve those
  // timestamps and elapsed-only saves, without starting new browsing sessions.
  const hasClockProgress = modeLocked(state) || (raw.timingVersion !== TIMING_VERSION && state.started);
  if (timed && !state.timingUnavailable && hasClockProgress && state.startedAt === null) state.startedAt = now - state.seconds * 1000;
  if (!timed) state.startedAt = null;
  if (roundComplete(state) && state.finishedAt === null) finishRound(state, now);
  return {state, timed, order};
}
