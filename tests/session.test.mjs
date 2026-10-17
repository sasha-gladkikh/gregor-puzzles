import test from 'node:test';
import assert from 'node:assert/strict';
import {SIZE, newState, place, guess} from '../game/engine.mjs';
import {restoreSession, restoreTrayOrder, modeLocked, changeTimingMode, recordInteraction, startRound, elapsedSeconds, finishRound} from '../game/session.mjs';

const ids = Array.from({length: SIZE}, (_, id) => id);
const savedOrder = [8, 1, 11, 3, 7, 0, 10, 6, 9, 2, 5, 4];
const persisted = value => JSON.parse(JSON.stringify(value));

test('reload preserves the full tray permutation and each remaining piece letter', () => {
  const state = newState();
  for (const id of [1, 7, 6]) place(state, id, id);
  const result = restoreSession(persisted({state, timed: false, order: savedOrder}));
  assert.deepEqual(result.order, savedOrder);
  const label = (order, id) => String.fromCharCode(65 + order.indexOf(id));
  for (const id of ids.filter(id => !state.placed.includes(id))) assert.equal(label(result.order, id), label(savedOrder, id));
  assert.deepEqual(restoreSession(persisted(result)).order, savedOrder);
  result.order.reverse();
  assert.deepEqual(savedOrder, [8, 1, 11, 3, 7, 0, 10, 6, 9, 2, 5, 4]);
});

test('legacy sessions get one complete order that survives the next save and reload', () => {
  const state = newState();
  place(state, 4, 4);
  const migrated = restoreSession({state, timed: false});
  assert.deepEqual([...migrated.order].sort((a, b) => a - b), ids);
  const reloaded = restoreSession(persisted(migrated));
  assert.deepEqual(reloaded.order, migrated.order);
  assert.deepEqual(reloaded.state.placed, [4]);
});

test('corrupt or incomplete tray orders cannot drop, duplicate, or invent pieces', () => {
  for (const invalid of [undefined, null, {}, [], ids.slice(1), [...ids, 0], ids.map(() => 0), [...ids.slice(0, -1), -1], [...ids.slice(0, -1), SIZE], ids.map(String), [...ids.slice(0, -1), NaN]]) {
    const order = restoreTrayOrder(invalid, () => .5);
    assert.deepEqual([...order].sort((a, b) => a - b), ids);
    assert.equal(order.length, SIZE);
  }
});

test('selection, reference viewing, hints, and wrong attempts leave mode open and time at zero through reload', () => {
  const state = restoreSession(null, 10000).state;
  recordInteraction(state, 'image');
  state.peeks++;
  recordInteraction(state, 'guess');
  state.hints++;
  assert.equal(place(state, 0, 1), false);
  assert.equal(guess(state, 'WRONG', 'CLCN1'), false);
  assert.equal(modeLocked(state), false);
  assert.equal(elapsedSeconds(state, 100000), 0);
  const resumed = restoreSession(persisted({state, timed: true, order: savedOrder}), 200000);
  assert.equal(resumed.state.startedAt, null);
  assert.equal(elapsedSeconds(resumed.state, 300000), 0);
  assert.equal(modeLocked(resumed.state), false);
  assert.equal(changeTimingMode(resumed.state, true, false), false);
  assert.equal(changeTimingMode(resumed.state, false, true), true);
  assert.equal(resumed.state.startedAt, null);
});

test('the first accepted placement starts timing and locks the mode, preserving elapsed time on reload', () => {
  const state = restoreSession(null, 10000).state;
  recordInteraction(state, 'image');
  assert.equal(place(state, 2, 2), true);
  startRound(state, true, 'image', 50000);
  assert.equal(modeLocked(state), true);
  assert.equal(changeTimingMode(state, true, false), true);
  assert.equal(state.startedAt, 50000);
  assert.equal(elapsedSeconds(state, 60000), 10);
  const resumed = restoreSession(persisted({state, timed: true}), 70000);
  assert.equal(elapsedSeconds(resumed.state, 80000), 30);
});

test('a correct initial gene answer finishes and locks the chosen mode without counting browsing time', () => {
  const state = restoreSession(null, 10000).state;
  recordInteraction(state, 'guess');
  assert.equal(guess(state, 'CLCN1', 'CLCN1'), true);
  startRound(state, true, 'guess', 80000);
  finishRound(state, 80000);
  assert.equal(modeLocked(state), true);
  assert.equal(changeTimingMode(state, true, false), true);
  assert.equal(elapsedSeconds(state, 100000), 0);
  assert.equal(state.finishedAt, 80000);
});

test('legacy running and elapsed-only clocks retain their time even without a placed piece', () => {
  const raw = {...newState(), started: true, hints: 1, startedAt: 10000, seconds: 3};
  const running = restoreSession({state: raw, timed: true}, 20000);
  assert.equal(running.state.startedAt, 10000);
  assert.equal(elapsedSeconds(running.state, 30000), 20);
  assert.equal(modeLocked(running.state), false);
  assert.equal(changeTimingMode(running.state, true, true), true);
  assert.equal(running.state.startedAt, 10000);
  const elapsedOnly = restoreSession({state: {...raw, startedAt: null, seconds: 8}, timed: true}, 20000);
  assert.equal(elapsedOnly.state.startedAt, 12000);
  assert.equal(elapsedSeconds(restoreSession(persisted(elapsedOnly), 40000).state, 50000), 38);
});

test('explicitly changing mode can clear an unearned legacy clock but never an earned result', () => {
  const state = restoreSession({state: {...newState(), started: true, startedAt: 10000, seconds: 7}, timed: true}, 30000).state;
  assert.equal(changeTimingMode(state, true, false), false);
  assert.equal(state.startedAt, null);
  assert.equal(state.seconds, 0);
  assert.equal(changeTimingMode(state, false, true), true);
  place(state, 0, 0);
  startRound(state, true, 'image', 50000);
  for (let id = 1; id < SIZE; id++) place(state, id, id);
  finishRound(state, 75000);
  const before = persisted(state);
  assert.equal(changeTimingMode(state, true, false), true);
  assert.deepEqual(state, before);
  assert.equal(elapsedSeconds(restoreSession(persisted({state, timed: true}), 100000).state, 200000), 25);
});

test('practice remains untimed after progress and completion', () => {
  const state = restoreSession(null).state;
  place(state, 0, 0);
  startRound(state, false, 'image', 10000);
  assert.equal(changeTimingMode(state, false, true), false);
  for (let id = 1; id < SIZE; id++) place(state, id, id);
  finishRound(state, 90000);
  assert.equal(elapsedSeconds(state, 100000), 0);
  assert.equal(state.startedAt, null);
});
