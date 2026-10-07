import {newState, validSave, complete, place, SIZE} from './engine.mjs';

export const CHECKPOINTS = ['mechanism', 'inheritance'];
export const hasLearned = state => CHECKPOINTS.every(id => state.answers.includes(id));
export const roundComplete = state => complete(state) && hasLearned(state);
export function pendingCheckpoint(state) {
  return CHECKPOINTS.find((id, i) => state.placed.length >= [6, 8][i] && !state.answers.includes(id)) ?? null;
}
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
export function answerCheckpoint(state, id, answer, question) {
  if (pendingCheckpoint(state) !== id || answer !== question.correct) return false;
  state.answers.push(id);
  return true;
}
export function advanceTextCard(state, card, answer) {
  if (pendingCheckpoint(state) || answer !== card.correct || state.placed.length >= card.at) return false;
  for (let i = 0; i < SIZE && state.placed.length < card.at; i++) place(state, i, i);
  return true;
}
export function restoreSession(save, now = Date.now()) {
  if (!validSave(save?.state)) return {state: newState(), timed: false, route: 'image'};
  const raw = save.state;
  const state = {...newState(), ...raw};
  state.answers = Array.isArray(raw.answers) ? [...new Set(raw.answers.filter(id => CHECKPOINTS.includes(id)))] : [];
  state.usedRoutes = Array.isArray(raw.usedRoutes) ? [...new Set(raw.usedRoutes.filter(id => ['image', 'text', 'guess'].includes(id)))] : [];
  state.started = raw.started === true || raw.placed.length > 0 || raw.seconds > 0 || raw.hints > 0 || raw.peeks > 0;
  state.startedAt = Number.isFinite(raw.startedAt) && raw.startedAt >= 0 ? raw.startedAt : null;
  state.finishedAt = Number.isFinite(raw.finishedAt) && raw.finishedAt >= (state.startedAt ?? 0) ? raw.finishedAt : null;
  if (!roundComplete(state)) state.finishedAt = null;
  const timed = save.timed === true;
  // Old saves contain elapsed seconds, but no running timestamp. Resume that time.
  if (timed && state.started && state.startedAt === null) state.startedAt = now - state.seconds * 1000;
  if (!timed) state.startedAt = null;
  if (roundComplete(state) && state.finishedAt === null) finishRound(state, now);
  return {state, timed, route: save.route === 'text' ? 'text' : 'image'};
}
