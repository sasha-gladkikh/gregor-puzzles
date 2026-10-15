import {SIZE, newState, validSave, complete} from './engine.mjs';

export const roundComplete = complete;
export function choosePiece(selected, id) {
  return {selected: selected === id ? null : id, hinted: null};
}
export function elapsedSeconds(state, now = Date.now()) {
  if (state.startedAt === null) return state.seconds;
  return Math.max(state.seconds, ((state.finishedAt ?? now) - state.startedAt) / 1000, 0);
}
export function startRound(state, timed, route, now = Date.now()) {
  state.started = true;
  if (!state.usedRoutes.includes(route)) state.usedRoutes.push(route);
  if (timed && state.startedAt === null) state.startedAt = now - state.seconds * 1000;
}
export function finishRound(state, now = Date.now()) {
  if (!roundComplete(state) || state.finishedAt !== null) return;
  state.seconds = elapsedSeconds(state, now);
  state.finishedAt = now;
}
export function restoreSession(save, now = Date.now()) {
  if (!validSave(save?.state)) return {state: newState(), timed: false};
  const raw = save.state;
  const state = {...newState(), ...raw, placed: [...raw.placed]};
  delete state.answers;
  delete state.learningVersion;
  state.sessionVersion = 3;
  state.timingUnavailable = raw.timingUnavailable === true;
  state.geneHintSeen = raw.geneHintSeen === true;
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
  // Old saves contain elapsed seconds, but no running timestamp. Resume that time.
  if (timed && !state.timingUnavailable && state.started && state.startedAt === null) state.startedAt = now - state.seconds * 1000;
  if (!timed) state.startedAt = null;
  if (roundComplete(state) && state.finishedAt === null) finishRound(state, now);
  return {state, timed};
}
